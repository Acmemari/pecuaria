import { supabaseAdmin } from '../supabaseAdmin.js';
import type { PlanId, TokenReservation } from './types.js';

interface PlanLimitsRow {
  monthly_token_limit: number;
  monthly_cost_limit_usd: number;
}

interface TokenBudgetRow {
  id: string;
  tokens_used: number;
  tokens_reserved: number;
  cost_used_usd: number;
}

const reservations = new Map<string, TokenReservation>();

function getCurrentPeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toUsd(value: number): number {
  return Number(value.toFixed(6));
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  // Conservative placeholder rates per 1K tokens (USD). Adjust per real contracts.
  const ratesPer1k: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash': { input: 0.00035, output: 0.00105 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-haiku-latest': { input: 0.00025, output: 0.00125 },
  };
  const rate = ratesPer1k[model] ?? { input: 0.0005, output: 0.0015 };
  return toUsd((inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output);
}

async function loadPlanLimits(plan: PlanId): Promise<PlanLimitsRow> {
  const { data, error } = await supabaseAdmin
    .from('plan_limits')
    .select('monthly_token_limit, monthly_cost_limit_usd')
    .eq('plan_id', plan)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load plan limits for plan "${plan}": ${error?.message ?? 'not found'}`);
  }

  return {
    monthly_token_limit: Number(data.monthly_token_limit),
    monthly_cost_limit_usd: Number(data.monthly_cost_limit_usd),
  };
}

async function getOrCreateBudget(orgId: string, period: string): Promise<TokenBudgetRow> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('token_budgets')
    .select('id, tokens_used, tokens_reserved, cost_used_usd')
    .eq('org_id', orgId)
    .eq('period', period)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load token budget: ${selectError.message}`);
  }

  if (existing) {
    return {
      id: existing.id,
      tokens_used: Number(existing.tokens_used),
      tokens_reserved: Number(existing.tokens_reserved),
      cost_used_usd: Number(existing.cost_used_usd),
    };
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('token_budgets')
    .insert({
      org_id: orgId,
      period,
      tokens_used: 0,
      tokens_reserved: 0,
      cost_used_usd: 0,
    })
    .select('id, tokens_used, tokens_reserved, cost_used_usd')
    .single();

  if (insertError || !created) {
    throw new Error(`Failed to create token budget: ${insertError?.message ?? 'unknown error'}`);
  }

  return {
    id: created.id,
    tokens_used: Number(created.tokens_used),
    tokens_reserved: Number(created.tokens_reserved),
    cost_used_usd: Number(created.cost_used_usd),
  };
}

export async function reserveTokens(args: {
  orgId: string;
  userId: string;
  plan: PlanId;
  estimatedTokens: number;
}): Promise<TokenReservation> {
  const estimatedTokens = Math.max(0, Math.floor(args.estimatedTokens));
  const period = getCurrentPeriod();
  const [planLimits, budget] = await Promise.all([loadPlanLimits(args.plan), getOrCreateBudget(args.orgId, period)]);

  const projectedTokens = budget.tokens_used + budget.tokens_reserved + estimatedTokens;
  if (projectedTokens > planLimits.monthly_token_limit) {
    throw new Error('TOKEN_BUDGET_EXCEEDED');
  }

  const { error: updateError } = await supabaseAdmin
    .from('token_budgets')
    .update({
      tokens_reserved: budget.tokens_reserved + estimatedTokens,
    })
    .eq('id', budget.id);

  if (updateError) {
    throw new Error(`Failed to reserve tokens: ${updateError.message}`);
  }

  const reservationId = crypto.randomUUID();
  const reservation: TokenReservation = {
    id: reservationId,
    orgId: args.orgId,
    userId: args.userId,
    period,
    reservedTokens: estimatedTokens,
    createdAt: new Date().toISOString(),
  };
  reservations.set(reservationId, reservation);

  await supabaseAdmin.from('token_ledger').insert({
    org_id: args.orgId,
    user_id: args.userId,
    action: 'reserve',
    tokens: estimatedTokens,
    cost_usd: 0,
    metadata: { reservation_id: reservationId, period },
  });

  return reservation;
}

export async function commitUsage(args: {
  reservationId: string;
  actualInputTokens: number;
  actualOutputTokens: number;
  model: string;
  agentRunId?: string;
}): Promise<{ totalTokens: number; costUsd: number }> {
  const reservation = reservations.get(args.reservationId);
  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');

  const inputTokens = Math.max(0, Math.floor(args.actualInputTokens));
  const outputTokens = Math.max(0, Math.floor(args.actualOutputTokens));
  const totalTokens = inputTokens + outputTokens;
  const costUsd = estimateCostUsd(args.model, inputTokens, outputTokens);

  const budget = await getOrCreateBudget(reservation.orgId, reservation.period);
  const nextReserved = Math.max(0, budget.tokens_reserved - reservation.reservedTokens);

  const { error: updateError } = await supabaseAdmin
    .from('token_budgets')
    .update({
      tokens_reserved: nextReserved,
      tokens_used: budget.tokens_used + totalTokens,
      cost_used_usd: toUsd(Number(budget.cost_used_usd) + costUsd),
    })
    .eq('id', budget.id);

  if (updateError) {
    throw new Error(`Failed to commit token usage: ${updateError.message}`);
  }

  await supabaseAdmin.from('token_ledger').insert({
    org_id: reservation.orgId,
    user_id: reservation.userId,
    agent_run_id: args.agentRunId ?? null,
    action: 'commit',
    tokens: totalTokens,
    cost_usd: costUsd,
    metadata: {
      reservation_id: args.reservationId,
      model: args.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  });

  reservations.delete(args.reservationId);
  return { totalTokens, costUsd };
}

export async function releaseReservation(reservationId: string): Promise<void> {
  const reservation = reservations.get(reservationId);
  if (!reservation) return;

  const budget = await getOrCreateBudget(reservation.orgId, reservation.period);
  const nextReserved = Math.max(0, budget.tokens_reserved - reservation.reservedTokens);

  const { error: updateError } = await supabaseAdmin
    .from('token_budgets')
    .update({ tokens_reserved: nextReserved })
    .eq('id', budget.id);

  if (updateError) {
    throw new Error(`Failed to release reservation: ${updateError.message}`);
  }

  await supabaseAdmin.from('token_ledger').insert({
    org_id: reservation.orgId,
    user_id: reservation.userId,
    action: 'release',
    tokens: reservation.reservedTokens,
    cost_usd: 0,
    metadata: {
      reservation_id: reservationId,
      period: reservation.period,
    },
  });

  reservations.delete(reservationId);
}
