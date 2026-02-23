import { CattleCalculatorInputs } from '../types';

function parseLooseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;

  if (typeof value !== 'string') return NaN;

  let s = value.trim();
  if (!s) return NaN;

  // Keep digits, separators and sign; drop currency/units/spaces.
  s = s.replace(/[^\d.,+-]/g, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Decide which separator is decimal by position (the rightmost wins).
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // 123,45 -> 123.45
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const FIELDS: (keyof CattleCalculatorInputs)[] = [
  'pesoCompra',
  'valorCompra',
  'pesoAbate',
  'rendimentoCarcaca',
  'valorVenda',
  'gmd',
  'custoMensal',
  'lotacao'
];

export function normalizeCattleCalculatorInputs(
  inputs: Partial<Record<keyof CattleCalculatorInputs, unknown>> | null | undefined
): CattleCalculatorInputs {
  const raw = (inputs ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};

  for (const field of FIELDS) {
    out[field] = parseLooseNumber(raw[field]);
  }

  return out as unknown as CattleCalculatorInputs;
}

