import { supabaseAdmin } from '../supabaseAdmin.js';
import type { AgentRunRecord } from './types.js';

export async function logAgentRun(record: AgentRunRecord): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      org_id: record.org_id,
      user_id: record.user_id,
      agent_id: record.agent_id,
      agent_version: record.agent_version,
      provider: record.provider,
      model: record.model,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      total_tokens: record.total_tokens,
      estimated_cost_usd: record.estimated_cost_usd,
      latency_ms: record.latency_ms,
      status: record.status,
      error_code: record.error_code ?? null,
      metadata: record.metadata ?? {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ai.logging] failed to insert agent run', { message: error.message });
    return null;
  }

  return data?.id ?? null;
}

