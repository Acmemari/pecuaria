import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import type { AIProvider } from './_lib/ai/types';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { getAgentManifest } from './_lib/agents/registry';
import { runHelloAgent } from './_lib/agents/hello/handler';
import { runFeedbackAgent } from './_lib/agents/feedback/handler';
import { getProvider } from './_lib/ai/providers';
import { getFallbackRoutes, routeAgent } from './_lib/ai/router';
import { checkAndIncrementRateLimit } from './_lib/ai/rate-limit';
import { commitUsage, releaseReservation, reserveTokens } from './_lib/ai/usage';
import { logAgentRun } from './_lib/ai/logging';
import type { AIProviderName, PlanId } from './_lib/ai/types';

type AgentHandler = (args: {
  input: unknown;
  provider: AIProvider;
  model: string;
}) => Promise<{
  data: unknown;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
}>;

const agentHandlers: Record<string, AgentHandler> = {
  hello: (args) => runHelloAgent({ ...args, input: args.input as Parameters<typeof runHelloAgent>[0]['input'] }),
  feedback: (args) => runFeedbackAgent({ ...args, input: args.input as Parameters<typeof runFeedbackAgent>[0]['input'] }),
};

const runRequestSchema = z.object({
  agentId: z.string().min(1),
  version: z.string().optional(),
  input: z.unknown(),
});

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === 'pro' || plan === 'enterprise') return plan;
  return 'basic';
}

type UserContext = {
  userId: string;
  orgId: string;
  plan: PlanId;
};

async function authenticateAndLoadContext(req: VercelRequest): Promise<UserContext> {
  const token = getBearerToken(req);
  if (!token) throw new Error('AUTH_MISSING_TOKEN');

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    console.error('[agents-run] Auth failure:', authError?.message || 'No user');
    throw new Error(`AUTH_INVALID_TOKEN:${authError?.message || 'Token is invalid or expired'}`);
  }

  const userId = userData.user.id;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id, plan')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.organization_id) {
    throw new Error('AUTH_PROFILE_NOT_FOUND');
  }

  return {
    userId,
    orgId: profile.organization_id,
    plan: normalizePlan(profile.plan),
  };
}

function mapErrorToStatus(errorCode: string): number {
  if (errorCode.startsWith('AUTH_')) return 401;
  if (errorCode === 'RATE_LIMIT_EXCEEDED') return 429;
  if (errorCode === 'TOKEN_BUDGET_EXCEEDED') return 402;
  if (errorCode.startsWith('INPUT_') || errorCode.startsWith('AGENT_')) return 400;
  if (errorCode.startsWith('FEEDBACK_AGENT_OUTPUT_INVALID')) return 400;
  return 500;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });

  const startedAt = Date.now();
  let ctx: UserContext | null = null;
  let reservationId: string | null = null;
  let runMeta: {
    agentId: string;
    agentVersion: string;
    provider: AIProviderName;
    model: string;
  } | null = null;

  try {
    const parsedBody = runRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: parsedBody.error.issues.map((i) => i.message).join('; '),
        code: 'INPUT_INVALID_REQUEST',
      });
    }

    ctx = await authenticateAndLoadContext(req);

    const manifest = getAgentManifest(parsedBody.data.agentId, parsedBody.data.version);
    if (!manifest) {
      return res.status(404).json({
        error: 'Agent manifest not found.',
        code: 'AGENT_NOT_FOUND',
      });
    }

    const inputValidation = manifest.inputSchema.safeParse(parsedBody.data.input);
    if (!inputValidation.success) {
      return res.status(400).json({
        error: inputValidation.error.issues.map((i) => i.message).join('; '),
        code: 'INPUT_SCHEMA_INVALID',
      });
    }

    const rateLimitResult = await checkAndIncrementRateLimit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      plan: ctx.plan,
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterMs: rateLimitResult.retryAfterMs ?? 60_000,
      });
    }

    const reservation = await reserveTokens({
      orgId: ctx.orgId,
      userId: ctx.userId,
      plan: ctx.plan,
      estimatedTokens: manifest.estimatedTokensPerCall,
    });
    reservationId = reservation.id;

    const routes = [routeAgent(manifest, ctx.plan), ...getFallbackRoutes(manifest)];
    let lastExecutionError: unknown = null;
    let outputData: unknown = null;
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let providerUsed: AIProviderName = routes[0]?.provider ?? manifest.modelPolicy.provider;
    let modelUsed = routes[0]?.model ?? manifest.modelPolicy.model;
    let latencyMs = 0;

    const handler = agentHandlers[manifest.id];
    if (!handler) {
      throw new Error(`AGENT_NOT_IMPLEMENTED:${manifest.id}`);
    }

    const failedProviders: string[] = [];

    for (const route of routes) {
      try {
        const provider = getProvider(route.provider);
        providerUsed = route.provider;
        modelUsed = route.model;

        const result = await handler({
          input: inputValidation.data,
          provider,
          model: route.model,
        });
        outputData = result.data;
        usage = result.usage;
        latencyMs = result.latencyMs;
        break;
      } catch (err) {
        const reason = (err as Error)?.message ?? 'unknown';
        console.error(
          `[agents-run] Provider ${route.provider}/${route.model} failed:`,
          reason,
        );
        failedProviders.push(`${route.provider}(${reason.slice(0, 120)})`);
        lastExecutionError = err;
      }
    }

    if (!outputData) {
      const detail = failedProviders.length > 0
        ? failedProviders.join(' | ')
        : (lastExecutionError as Error)?.message ?? 'unknown error';
      console.error('[agents-run] All providers exhausted:', detail);
      throw new Error(`AGENT_EXECUTION_FAILED:${detail}`);
    }

    const commit = await commitUsage({
      reservationId,
      actualInputTokens: usage.inputTokens,
      actualOutputTokens: usage.outputTokens,
      model: modelUsed,
    });

    runMeta = {
      agentId: manifest.id,
      agentVersion: manifest.version,
      provider: providerUsed,
      model: modelUsed,
    };

    await logAgentRun({
      org_id: ctx.orgId,
      user_id: ctx.userId,
      agent_id: manifest.id,
      agent_version: manifest.version,
      provider: providerUsed,
      model: modelUsed,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      estimated_cost_usd: commit.costUsd,
      latency_ms: latencyMs || Math.max(1, Date.now() - startedAt),
      status: 'success',
      error_code: null,
      metadata: {
        route_candidates: routes.map((r) => `${r.provider}:${r.model}`),
      },
    });

    reservationId = null;

    return res.status(200).json({
      success: true,
      data: outputData,
      usage: {
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
        estimated_cost_usd: commit.costUsd,
        latency_ms: latencyMs || Math.max(1, Date.now() - startedAt),
      },
      agent: {
        id: manifest.id,
        version: manifest.version,
        provider: providerUsed,
        model: modelUsed,
      },
    });
  } catch (error) {
    const rawMessage = (error as Error)?.message ?? 'UNKNOWN_ERROR';
    const errorCode = rawMessage.split(':')[0] || 'UNKNOWN_ERROR';
    const status = mapErrorToStatus(errorCode);

    let clientError = rawMessage;
    if (errorCode === 'AGENT_EXECUTION_FAILED') {
      const isConfigError = rawMessage.includes('not configured') || rawMessage.includes('AI_NO_PROVIDERS');
      clientError = isConfigError
        ? 'Serviço de IA não configurado no servidor. Contate o suporte.'
        : 'Problema temporário com o provedor de IA. Tente novamente em instantes.';
      console.error('[agents-run] AGENT_EXECUTION_FAILED:', rawMessage);
    }

    if (reservationId) {
      try {
        await releaseReservation(reservationId);
      } catch (releaseError) {
        console.error('[agents-run] failed to release reservation', {
          reservationId,
          message: (releaseError as Error).message,
        });
      }
    }

    if (ctx && runMeta) {
      await logAgentRun({
        org_id: ctx.orgId,
        user_id: ctx.userId,
        agent_id: runMeta.agentId,
        agent_version: runMeta.agentVersion,
        provider: runMeta.provider,
        model: runMeta.model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
        latency_ms: Math.max(1, Date.now() - startedAt),
        status: errorCode.includes('TIMEOUT') ? 'timeout' : 'error',
        error_code: errorCode,
        metadata: {},
      });
    }

    return res.status(status).json({
      success: false,
      error: clientError,
      code: errorCode,
    });
  }
}
