import type { AgentManifest } from '../ai/types';
import { helloManifest } from './hello/manifest';

const manifestMap = new Map<string, AgentManifest>([
  [`${helloManifest.id}@${helloManifest.version}`, helloManifest],
]);

export function getAgentManifest(agentId: string, version?: string): AgentManifest | null {
  if (version) {
    return manifestMap.get(`${agentId}@${version}`) ?? null;
  }

  // Latest static version: choose lexicographically highest semver-like string
  const candidates = Array.from(manifestMap.values()).filter((m) => m.id === agentId);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
  return candidates[candidates.length - 1] ?? null;
}

