/**
 * Shared date formatting helpers for PDF and DOCX report generators.
 * Centralizes logic to avoid duplication across multiple files.
 */

/** Format a date string as dd/mm/yyyy (pt-BR) */
export const formatDateBR = (d: string | null): string => {
  if (!d) return '\u2014';
  try {
    const dt = new Date(`${d}T00:00:00`);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
};

/** Format a date as "jan/2026" (short month + year) */
export const formatMonthYearBR = (d: string | null): string => {
  if (!d) return '\u2014';
  try {
    const dt = new Date(`${d}T00:00:00`);
    if (isNaN(dt.getTime())) return d;
    const m = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${m}/${dt.getFullYear()}`;
  } catch { return d; }
};

/** Format a date as "março de 2026" (long month + year) */
export const formatLongDateBR = (d: string | null): string => {
  if (!d) return '';
  try {
    const dt = new Date(`${d}T00:00:00`);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  } catch { return ''; }
};

/** Calculate a human-readable duration label between two date strings */
export const getDurationLabel = (s: string | null, e: string | null): string => {
  if (!s || !e) return '\u2014';
  const start = new Date(`${s}T00:00:00`);
  const end = new Date(`${e}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '\u2014';
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days < 60) return `${days} dias`;
  const months = Math.round((days / 30) * 10) / 10;
  return `${months} meses`;
};
