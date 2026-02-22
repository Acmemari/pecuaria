import { supabaseAdmin } from '../supabaseAdmin.js';
import type { PlanId } from './types.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterMs?: number;
  orgCount?: number;
  userCount?: number;
}

interface PlanLimitRates {
  max_requests_per_minute_org: number;
  max_requests_per_minute_user: number;
}

const WINDOW_MS = 60_000;

function floorToMinute(date = new Date()): string {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

function remainingWindowMs(now = Date.now()): number {
  const ms = WINDOW_MS - (now % WINDOW_MS);
  return ms <= 0 ? WINDOW_MS : ms;
}

async function getPlanRates(plan: PlanId): Promise<PlanLimitRates> {
  const { data, error } = await supabaseAdmin
    .from('plan_limits')
    .select('max_requests_per_minute_org, max_requests_per_minute_user')
    .eq('plan_id', plan)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load plan rates for "${plan}": ${error?.message ?? 'not found'}`);
  }

  return {
    max_requests_per_minute_org: Number(data.max_requests_per_minute_org),
    max_requests_per_minute_user: Number(data.max_requests_per_minute_user),
  };
}

async function getCountForKey(key: string, windowStart: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('request_count')
    .eq('key', key)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (error) throw new Error(`Failed to read rate limit counter: ${error.message}`);
  return Number(data?.request_count ?? 0);
}

async function incrementCounter(key: string, windowStart: string): Promise<number> {
  const current = await getCountForKey(key, windowStart);

  if (current === 0) {
    const { error: insertError } = await supabaseAdmin
      .from('rate_limits')
      .insert({
        key,
        window_start: windowStart,
        request_count: 1,
      });

    if (!insertError) return 1;
    // If conflict due to race, continue to update path below.
  }

  const next = current + 1;
  const { error: updateError } = await supabaseAdmin
    .from('rate_limits')
    .update({ request_count: next })
    .eq('key', key)
    .eq('window_start', windowStart);

  if (updateError) throw new Error(`Failed to increment rate limit counter: ${updateError.message}`);
  return next;
}

export async function checkAndIncrementRateLimit(args: {
  orgId: string;
  userId: string;
  plan: PlanId;
}): Promise<RateLimitCheckResult> {
  const windowStart = floorToMinute();
  const rates = await getPlanRates(args.plan);
  const orgKey = `org:${args.orgId}`;
  const userKey = `user:${args.userId}`;

  const [orgCountBefore, userCountBefore] = await Promise.all([
    getCountForKey(orgKey, windowStart),
    getCountForKey(userKey, windowStart),
  ]);

  if (
    orgCountBefore >= rates.max_requests_per_minute_org ||
    userCountBefore >= rates.max_requests_per_minute_user
  ) {
    return {
      allowed: false,
      retryAfterMs: remainingWindowMs(),
      orgCount: orgCountBefore,
      userCount: userCountBefore,
    };
  }

  const [orgCount, userCount] = await Promise.all([
    incrementCounter(orgKey, windowStart),
    incrementCounter(userKey, windowStart),
  ]);

  if (
    orgCount > rates.max_requests_per_minute_org ||
    userCount > rates.max_requests_per_minute_user
  ) {
    return {
      allowed: false,
      retryAfterMs: remainingWindowMs(),
      orgCount,
      userCount,
    };
  }

  return {
    allowed: true,
    orgCount,
    userCount,
  };
}

