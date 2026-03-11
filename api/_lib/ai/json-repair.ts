import type { ZodTypeAny } from 'zod';

export type SafeJsonParseResult<T> =
  | { success: true; data: T; repaired: boolean }
  | { success: false; error: string; repaired: boolean };

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function stripTrailingCommas(raw: string): string {
  return raw.replace(/,\s*([}\]])/g, '$1');
}

function closeOpenBraces(raw: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  for (const ch of raw) {
    if (ch === '{') openBraces += 1;
    if (ch === '}') openBraces -= 1;
    if (ch === '[') openBrackets += 1;
    if (ch === ']') openBrackets -= 1;
  }

  let out = raw;
  while (openBrackets > 0) {
    out += ']';
    openBrackets -= 1;
  }
  while (openBraces > 0) {
    out += '}';
    openBraces -= 1;
  }
  return out;
}

function closeUnterminatedStrings(raw: string): string {
  let inString = false;
  let escaped = false;
  let lastQuoteIdx = -1;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        lastQuoteIdx = i;
      } else {
        inString = false;
      }
    }
  }

  if (inString && lastQuoteIdx >= 0) {
    // If a JSON string ends with a lone backslash, complete escape before closing quote.
    if (escaped) {
      return raw + '\\"';
    }
    return raw + '"';
  }
  return raw;
}

function repairJson(raw: string): string {
  let candidate = extractJsonCandidate(raw);
  candidate = closeUnterminatedStrings(candidate);
  candidate = stripTrailingCommas(candidate);
  candidate = closeOpenBraces(candidate);
  return candidate.trim();
}

function parseAndValidate<T>(raw: string, schema: ZodTypeAny): SafeJsonParseResult<T> {
  try {
    const parsed = JSON.parse(raw);
    const checked = schema.safeParse(parsed);
    if (!checked.success) {
      return {
        success: false,
        error: checked.error.issues.map(issue => issue.message).join('; '),
        repaired: false,
      };
    }
    return { success: true, data: checked.data as T, repaired: false };
  } catch (error) {
    return { success: false, error: `Invalid JSON: ${(error as Error).message}`, repaired: false };
  }
}

export function safeJsonParseWithRepair<T>(raw: string, schema: ZodTypeAny): SafeJsonParseResult<T> {
  const direct = parseAndValidate<T>(raw, schema);
  if (direct.success) return direct;

  const repairedText = repairJson(raw);
  try {
    const parsed = JSON.parse(repairedText);
    const checked = schema.safeParse(parsed);
    if (!checked.success) {
      return {
        success: false,
        error: checked.error.issues.map(issue => issue.message).join('; '),
        repaired: true,
      };
    }
    return { success: true, data: checked.data as T, repaired: true };
  } catch (error) {
    return { success: false, error: `Repair failed: ${(error as Error).message}`, repaired: true };
  }
}
