import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentManifest } from '../ai/types.js';
import { helloManifest } from './hello/manifest.js';
import { feedbackManifest } from './feedback/manifest.js';
import { damagesGenManifest } from './damages-gen/manifest.js';

const manifestMap = new Map<string, AgentManifest>([
  [`${helloManifest.id}@${helloManifest.version}`, helloManifest],
  [`${feedbackManifest.id}@${feedbackManifest.version}`, feedbackManifest],
  [`${damagesGenManifest.id}@${damagesGenManifest.version}`, damagesGenManifest],
]);

// A short-lived cache (TTL) for dynamic config to reduce DB load on concurrent executions.
// 15 seconds is usually long enough to batch concurrent requests while feeling instant for admins.
const CACHE_TTL_MS = 15_000;
const dynamicConfigCache = new Map<string, { prompt: string; expiresAt: number }>();

export async function getAgentManifest(
  agentId: string,
  version?: string,
  db?: SupabaseClient
): Promise<AgentManifest | null> {
  let manifest: AgentManifest | null = null;

  if (version) {
    manifest = manifestMap.get(`${agentId}@${version}`) ?? null;
  } else {
    // Latest static version: choose lexicographically highest semver-like string
    const candidates = Array.from(manifestMap.values()).filter((m) => m.id === agentId);
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
      manifest = candidates[candidates.length - 1] ?? null;
    }
  }

  // If we have a DB client, try to enrich with dynamic system_prompt
  if (manifest && db) {
    const cacheKey = `${manifest.id}@${manifest.version}`;
    const cached = dynamicConfigCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return { ...manifest, systemPrompt: cached.prompt };
    }

    try {
      const { data, error } = await db
        .from('agent_registry')
        .select('system_prompt')
        .eq('id', manifest.id)
        .eq('version', manifest.version)
        .single();

      if (!error && data?.system_prompt) {
        dynamicConfigCache.set(cacheKey, {
          prompt: data.system_prompt,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return {
          ...manifest,
          systemPrompt: data.system_prompt
        };
      }
    } catch (e) {
      console.error('Error fetching agent config from DB:', e);
    }
  }

  return manifest;
}

