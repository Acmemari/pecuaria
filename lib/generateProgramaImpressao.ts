import { jsPDF } from 'jspdf';
import type { ProjectRow } from './projects';
import type { DeliveryRow } from './deliveries';
import type { InitiativeWithProgress } from './initiatives';

export interface ProgramaImpressaoData {
  project: ProjectRow;
  deliveries: DeliveryRow[];
  /** Kept for interface compatibility; not rendered in this document. */
  initiativesByDeliveryId: Record<string, InitiativeWithProgress[]>;
  userName?: string;
}

const COLORS = {
  slate800:  [30,  41,  59]  as const,
  slate700:  [51,  65,  85]  as const,
  slate600:  [71,  85,  105] as const,
  slate500:  [100, 116, 139] as const,
  slate400:  [148, 163, 184] as const,
  slate300:  [203, 213, 225] as const,
  slate200:  [226, 232, 240] as const,
  slate100:  [241, 245, 249] as const,
  slate50:   [248, 250, 252] as const,
  white:     [255, 255, 255] as const,
};

const formatDateBR = (d: string | null): string => {
  if (!d) return '—';
  try {
    const date = new Date(`${d}T00:00:00`);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
};

const getDurationLabel = (s: string | null, e: string | null): string => {
  if (!s || !e) return 'Prazo em definição';
  const start = new Date(`${s}T00:00:00`);
  const end = new Date(`${e}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 'Prazo em definição';
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days < 30) return `${days} dias`;
  return `${Math.round((days / 30) * 10) / 10} meses`;
};

const buildProgramaImpressaoDoc = (data: ProgramaImpressaoData): jsPDF => {
  const { project, deliveries, userName } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = pw - M * 2;
  let y = M;

  const safe = (n: number, f = 0) => (typeof n === 'number' && !Number.isNaN(n) ? n : f);
  const norm = (v: unknown, fb = '—'): string => {
    const s = typeof v === 'string' ? v : String(v ?? '');
    return s.trim() || fb;
  };

  const setFont = (
    size: number,
    weight: 'bold' | 'normal' = 'normal',
    color: readonly [number, number, number] = COLORS.slate800,
  ) => {
    doc.setFontSize(Math.max(1, Math.min(72, safe(size, 8))));
    doc.setFont('helvetica', weight);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const drawText = (
    t: string,
    x: number,
    yy: number,
    size: number,
    weight: 'bold' | 'normal' = 'normal',
    color: readonly [number, number, number] = COLORS.slate800,
    align: 'left' | 'center' | 'right' = 'left',
    maxW?: number,
  ): string[] => {
    const safeT = typeof t === 'string' ? t : String(t ?? '');
    setFont(size, weight, color);
    if (maxW != null && maxW > 0) {
      const lines = doc.splitTextToSize(safeT, Math.max(1, maxW));
      const sl = Array.isArray(lines) ? lines.filter(l => typeof l === 'string') : [safeT];
      if (sl.length > 0) doc.text(sl, x, yy, { align });
      return sl;
    }
    doc.text(safeT, x, yy, { align });
    return [safeT];
  };

  const splitLines = (t: string, maxW: number): string[] => {
    const lines = doc.splitTextToSize(t, Math.max(1, maxW));
    return Array.isArray(lines) ? lines.filter(l => typeof l === 'string') : [t];
  };

  const ensureSpace = (need: number): boolean => {
    if (y + need > ph - 16) {
      doc.addPage();
      y = M;
      drawPageHeader();
      return true;
    }
    return false;
  };

  const drawHRule = (marginTop = 4, marginBottom = 4, color: readonly [number, number, number] = COLORS.slate200) => {
    y += marginTop;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.25);
    doc.line(M, y, pw - M, y);
    y += marginBottom;
  };

  // ── Running page header (pages > 1) — white background ──────────────────
  const drawPageHeader = () => {
    doc.setFillColor(...COLORS.white);
    doc.rect(0, 0, pw, 12, 'F');
    // Bottom separator
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.line(0, 12, pw, 12);
    setFont(7, 'bold', COLORS.slate600);
    doc.text('PecuariA', M, 8);
    const progName = norm(project.name, 'Programa de Trabalho');
    setFont(7, 'normal', COLORS.slate500);
    doc.text(`Programa de Trabalho — ${progName}`, pw / 2, 8, { align: 'center' });
    y = 18;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // COVER HEADER (page 1) — white background
  // ══════════════════════════════════════════════════════════════════════════
  const headerH = 46;

  doc.setFillColor(...COLORS.white);
  doc.rect(0, 0, pw, headerH, 'F');

  // Bottom border stripe (gray)
  doc.setDrawColor(...COLORS.slate200);
  doc.setLineWidth(0.5);
  doc.line(0, headerH, pw, headerH);
  // Thicker left accent rule
  doc.setFillColor(...COLORS.slate600);
  doc.rect(0, 0, 3, headerH, 'F');

  // Logo tag (top-left)
  setFont(8, 'bold', COLORS.slate700);
  doc.text('PecuariA', M + 2, 10);
  setFont(7, 'normal', COLORS.slate400);
  doc.text('Programa de Trabalho', M + 30, 10);

  // Date / generated-by (top-right)
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  setFont(7, 'normal', COLORS.slate500);
  doc.text(now, pw - M, 10, { align: 'right' });
  if (userName) {
    setFont(6.5, 'normal', COLORS.slate400);
    doc.text(`Gerado por ${userName}`, pw - M, 16, { align: 'right' });
  }

  // Program name (hero)
  const progNameLines = splitLines(norm(project.name, 'Programa de Trabalho'), CW - 10);
  setFont(18, 'bold', COLORS.slate800);
  doc.text(progNameLines, M + 2, 26);

  // Period + duration
  const period = `${formatDateBR(project.start_date)} — ${formatDateBR(project.end_date)}`;
  const duration = getDurationLabel(project.start_date, project.end_date);
  setFont(8.5, 'normal', COLORS.slate500);
  doc.text(`${period}   ·   ${duration}`, M + 2, 38);

  y = headerH + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // METRIC CARDS — 3 cards (Entregas · Stakeholders · Duração)
  // ══════════════════════════════════════════════════════════════════════════
  const stakeholderCount = project.stakeholder_matrix?.length ?? 0;

  const metricCards = [
    { label: 'Entregas', value: String(deliveries.length) },
    { label: 'Stakeholders', value: String(stakeholderCount) },
    { label: 'Duração', value: duration },
  ];

  const cardW = (CW - 6) / 3;
  const cardH = 16;
  ensureSpace(cardH + 4);

  metricCards.forEach((card, i) => {
    const cx = M + i * (cardW + 3);
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');
    // Left gray accent bar
    doc.setFillColor(...COLORS.slate600);
    doc.roundedRect(cx, y, 2.5, cardH, 1, 1, 'F');
    doc.rect(cx + 1.5, y, 1, cardH, 'F');
    drawText(card.label, cx + 6, y + 5.5, 6.5, 'bold', COLORS.slate500);
    const valLines = splitLines(card.value, cardW - 8);
    setFont(10, 'bold', COLORS.slate800);
    doc.text(valLines, cx + 6, y + 12);
  });
  y += cardH + 6;

  // ══════════════════════════════════════════════════════════════════════════
  // PROGRAM OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════
  const desc = norm(project.description, '');
  const trans = norm(project.transformations_achievements, '');

  if (desc || trans) {
    ensureSpace(10);
    drawText('Visão geral do programa', M, y, 9, 'bold', COLORS.slate700);
    y += 6;
    drawHRule(0, 4);

    if (desc) {
      const descLines = splitLines(desc, CW - 8);
      const descH = Math.max(10, descLines.length * 4 + 6);
      ensureSpace(descH + 2);
      doc.setFillColor(...COLORS.slate50);
      doc.setDrawColor(...COLORS.slate200);
      doc.roundedRect(M, y, CW, descH, 2, 2, 'FD');
      setFont(8, 'normal', COLORS.slate600);
      doc.text(descLines, M + 4, y + 5);
      y += descH + 4;
    }

    if (trans) {
      ensureSpace(8);
      drawText('Transformações e conquistas esperadas', M, y, 7.5, 'bold', COLORS.slate500);
      y += 5;
      const transLines = splitLines(trans, CW - 8);
      const transH = Math.max(10, transLines.length * 4 + 6);
      ensureSpace(transH + 2);
      doc.setFillColor(...COLORS.slate100);
      doc.setDrawColor(...COLORS.slate200);
      doc.roundedRect(M, y, CW, transH, 2, 2, 'FD');
      setFont(8, 'normal', COLORS.slate600);
      doc.text(transLines, M + 4, y + 5);
      y += transH + 4;
    }

    // Success evidence
    const evidence = project.success_evidence || [];
    if (evidence.length > 0) {
      ensureSpace(8);
      drawText('Evidências de sucesso', M, y, 7.5, 'bold', COLORS.slate500);
      y += 5;
      evidence.forEach((item, idx) => {
        const itemLines = splitLines(norm(item, '—'), CW - 12);
        const itemH = Math.max(5, itemLines.length * 4);
        ensureSpace(itemH + 2);
        // Gray number badge
        doc.setFillColor(...COLORS.slate600);
        doc.circle(M + 3.5, y - 1, 2.8, 'F');
        setFont(6.5, 'bold', COLORS.white);
        doc.text(String(idx + 1), M + 3.5, y + 0.2, { align: 'center' });
        setFont(8, 'normal', COLORS.slate600);
        doc.text(itemLines, M + 9, y);
        y += itemH + 2;
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENTREGAS PLANEJADAS
  // ══════════════════════════════════════════════════════════════════════════
  y += 4;
  ensureSpace(12);
  drawText('Entregas Planejadas', M, y, 11, 'bold', COLORS.slate800);
  y += 5;
  drawHRule(0, 6, COLORS.slate200);

  if (deliveries.length === 0) {
    drawText('Nenhuma entrega cadastrada para este programa.', M, y, 8, 'normal', COLORS.slate500);
    y += 8;
  } else {
    deliveries.forEach((delivery, dIdx) => {
      // Estimate card height
      const delivNameLines = splitLines(norm(delivery.name), CW - 38);
      const cardHeight = Math.max(22, delivNameLines.length * 6 + 14);
      ensureSpace(cardHeight + 4);

      // ── Entrega card ─────────────────────────────────────────────────────
      const cardY = y;
      doc.setFillColor(...COLORS.white);
      doc.setDrawColor(...COLORS.slate200);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, cardY, CW, cardHeight, 3, 3, 'FD');

      // Left gray accent border
      doc.setFillColor(...COLORS.slate600);
      doc.roundedRect(M, cardY, 4, cardHeight, 2, 2, 'F');
      doc.rect(M + 2, cardY, 2, cardHeight, 'F');

      // Number badge circle (gray)
      const badgeX = M + 14;
      const badgeY = cardY + cardHeight / 2;
      doc.setFillColor(...COLORS.slate600);
      doc.circle(badgeX, badgeY, 7, 'F');
      setFont(11, 'bold', COLORS.white);
      const numStr = String(dIdx + 1).padStart(2, '0');
      doc.text(numStr, badgeX, badgeY + 1.5, { align: 'center' });

      // Entrega name + dates
      const textStartX = M + 25;
      setFont(10, 'bold', COLORS.slate800);
      const nameLines = splitLines(norm(delivery.name), CW - 32);
      doc.text(nameLines, textStartX, cardY + 8);

      const delivStart = formatDateBR(delivery.start_date);
      const delivEnd = formatDateBR(delivery.end_date ?? delivery.due_date ?? null);
      const delivDuration = getDurationLabel(delivery.start_date, delivery.end_date ?? delivery.due_date ?? null);
      setFont(7, 'normal', COLORS.slate500);
      doc.text(`${delivStart} — ${delivEnd}   ·   ${delivDuration}`, textStartX, cardY + 8 + nameLines.length * 5.5);

      y = cardY + cardHeight + 3;

      // ── Entrega description ──────────────────────────────────────────────
      const delivDesc = norm(delivery.description || delivery.transformations_achievements || '', '');
      if (delivDesc) {
        const descLines = splitLines(delivDesc, CW - 8);
        const descH = Math.max(9, descLines.length * 3.8 + 5);
        ensureSpace(descH + 2);
        doc.setFillColor(...COLORS.slate50);
        doc.setDrawColor(...COLORS.slate200);
        doc.roundedRect(M, y, CW, descH, 2, 2, 'FD');
        setFont(7.5, 'normal', COLORS.slate600);
        doc.text(descLines, M + 4, y + 4.5);
        y += descH + 4;
      }

      // Gap + divider between deliveries
      y += 6;
      if (dIdx < deliveries.length - 1) {
        ensureSpace(4);
        doc.setDrawColor(...COLORS.slate200);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(M, y, pw - M, y);
        doc.setLineDashPattern([], 0);
        y += 8;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER on every page
  // ══════════════════════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = ph - 8;
    doc.setDrawColor(...COLORS.slate200);
    doc.setLineWidth(0.25);
    doc.line(M, fy - 3, pw - M, fy - 3);
    setFont(6.5, 'normal', COLORS.slate400);
    doc.text('PecuariA — Programa de Trabalho', M, fy);
    doc.text(`Página ${p} de ${pageCount}`, pw - M, fy, { align: 'right' });
  }

  return doc;
};

export function generateProgramaImpressao(data: ProgramaImpressaoData): void {
  const doc = buildProgramaImpressaoDoc(data);
  const safeName = data.project.name.replace(/[^a-z0-9\u00C0-\u024F]/gi, '-').slice(0, 40) || 'programa';
  const date = new Date().toISOString().split('T')[0];
  doc.save(`programa-trabalho-${safeName}-${date}.pdf`);
}

export function generateProgramaImpressaoBase64(data: ProgramaImpressaoData): string {
  const doc = buildProgramaImpressaoDoc(data);
  return doc.output('datauristring').split(',')[1] || '';
}
