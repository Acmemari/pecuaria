import type { AgentManifest } from '../ai/types.js';
import { helloManifest } from './hello/manifest.js';
import { feedbackManifest } from './feedback/manifest.js';
import { damagesGenManifest } from './damages-gen/manifest.js';

const manifestMap = new Map<string, AgentManifest>([
  [`${helloManifest.id}@${helloManifest.version}`, helloManifest],
  [`${feedbackManifest.id}@${feedbackManifest.version}`, feedbackManifest],
  [`${damagesGenManifest.id}@${damagesGenManifest.version}`, damagesGenManifest],
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

