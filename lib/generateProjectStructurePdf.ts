import { jsPDF } from 'jspdf';
import type { ProjectRow } from './projects';
import type { DeliveryRow } from './deliveries';
import type { InitiativeWithTeam } from './initiatives';

export interface ProjectStructurePdfData {
  project: ProjectRow;
  deliveries: DeliveryRow[];
  initiativesByDeliveryId: Record<string, InitiativeWithTeam[]>;
  userName?: string;
}

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

const getDurationLabel = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) return 'Prazo em definição';
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 'Prazo em definição';
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  if (diffDays < 30) return `${diffDays} dias previstos`;
  const months = Math.round((diffDays / 30) * 10) / 10;
  return `${months.toLocaleString('pt-BR')} meses previstos`;
};

export function generateProjectStructurePdf(data: ProjectStructurePdfData): void {
  const { project, deliveries, initiativesByDeliveryId, userName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 12;
  const cw = pw - m * 2;
  let y = m;

  const safeNum = (n: number, fallback: number) => (typeof n === 'number' && !Number.isNaN(n) ? n : fallback);

  const text = (
    t: string,
    x: number,
    yy: number,
    size: number,
    weight: 'bold' | 'normal' = 'normal',
    color: [number, number, number] = [0, 0, 0],
    align: 'left' | 'center' | 'right' = 'left',
    maxW?: number
  ) => {
    const safeSize = Math.max(1, Math.min(72, safeNum(size, 10)));
    const safeT = typeof t === 'string' ? t : String(t ?? '');
    doc.setFontSize(safeSize);
    doc.setFont('helvetica', weight);
    doc.setTextColor(color[0], color[1], color[2]);
    if (maxW != null && maxW > 0) {
      const lines = doc.splitTextToSize(safeT, Math.max(1, maxW));
      const safeLines = Array.isArray(lines) ? lines.filter((l) => typeof l === 'string') : [safeT];
      if (safeLines.length > 0) doc.text(safeLines, x, yy, { align });
      return safeLines.length * safeSize * 0.4;
    }
    doc.text(safeT, x, yy, { align });
    return safeSize * 0.4;
  };

  const ensureSpace = (need: number) => {
    if (y + need > ph - 18) {
      doc.addPage();
      y = m;
    }
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pw, 22, 'F');
  text('PecuariA', m, 9, 16, 'bold', [255, 255, 255]);
  text('Estrutura do Projeto — Relatório de planejamento', m, 17, 9, 'normal', [203, 213, 225]);
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  text(dateStr, pw - m, 9, 8, 'normal', [148, 163, 184], 'right');
  if (userName) {
    text(`Gerado por: ${userName}`, pw - m, 15, 7, 'normal', [148, 163, 184], 'right');
  }
  y = 28;

  // Project name
  ensureSpace(14);
  text('Projeto selecionado', m, y, 7, 'bold', [100, 116, 139]);
  y += 5;
  const projectNameStr = typeof project.name === 'string' ? project.name : String(project.name ?? 'Projeto sem nome');
  const projectNameLines = doc.splitTextToSize(projectNameStr, Math.max(1, cw));
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const safeProjectNameLines = Array.isArray(projectNameLines) ? projectNameLines.filter((l) => typeof l === 'string') : [projectNameStr];
  if (safeProjectNameLines.length > 0) doc.text(safeProjectNameLines, m, y);
  y += safeProjectNameLines.length * 7 + 6;

  // Summary cards (one row)
  ensureSpace(20);
  const cardH = 14;
  const cardGap = 4;
  const cardW = (cw - cardGap * 3) / 4;
  const cards = [
    { label: 'Período', value: `${formatDateBR(project.start_date)} — ${formatDateBR(project.end_date)}` },
    { label: 'Prazo previsto', value: getDurationLabel(project.start_date, project.end_date) },
    { label: 'Entregas', value: String(deliveries.length) },
    { label: 'Stakeholders', value: String(project.stakeholder_matrix?.length ?? 0) },
  ];
  const safeCardW = Math.max(10, cardW);
  cards.forEach((card, i) => {
    const x = m + i * (safeCardW + cardGap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, safeCardW, cardH, 2, 2, 'FD');
    text(card.label, x + 3, y + 5, 6, 'bold', [100, 116, 139]);
    const valStr = typeof card.value === 'string' ? card.value : String(card.value ?? '');
    const valLines = doc.splitTextToSize(valStr, Math.max(1, safeCardW - 6));
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const safeValLines = Array.isArray(valLines) ? valLines.filter((l) => typeof l === 'string') : [valStr];
    if (safeValLines.length > 0) doc.text(safeValLines, x + 3, y + 10);
  });
  y += cardH + 8;

  // Transformations and conquests
  ensureSpace(25);
  text('Transformações e conquistas esperadas', m, y, 9, 'bold', [30, 41, 59]);
  y += 6;
  const trans = (typeof project.transformations_achievements === 'string' ? project.transformations_achievements : 'Não informado.').trim() || 'Não informado.';
  const transLines = doc.splitTextToSize(trans, Math.max(1, cw));
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const safeTransLines = Array.isArray(transLines) ? transLines.filter((l) => typeof l === 'string') : [trans];
  if (safeTransLines.length > 0) doc.text(safeTransLines, m, y);
  y += safeTransLines.length * 4 + 6;

  // Success evidence
  ensureSpace(20);
  text('Evidências de sucesso', m, y, 9, 'bold', [30, 41, 59]);
  y += 6;
  const evidence = project.success_evidence || [];
  if (evidence.length === 0) {
    text('Nenhuma evidência cadastrada.', m, y, 8, 'normal', [100, 116, 139]);
    y += 6;
  } else {
    evidence.forEach((item, idx) => {
      ensureSpace(6);
      const itemStr = typeof item === 'string' ? item : String(item ?? '');
      text(`${idx + 1}. ${itemStr}`, m, y, 8, 'normal', [51, 65, 85], 'left', Math.max(1, cw - 6));
      y += 5;
    });
    y += 4;
  }

  // Cronogram
  ensureSpace(30);
  text('Cronograma do projeto', m, y, 9, 'bold', [30, 41, 59]);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  text(`Início previsto: ${formatDateBR(project.start_date)}`, m, y);
  y += 5;
  text(`Conclusão prevista: ${formatDateBR(project.end_date)}`, m, y);
  y += 5;
  text(`Duração estimada: ${getDurationLabel(project.start_date, project.end_date)}`, m, y);
  y += 8;

  // Stakeholder matrix
  ensureSpace(25);
  text('Matriz de stakeholders', m, y, 9, 'bold', [30, 41, 59]);
  y += 6;
  const stakeholders = project.stakeholder_matrix || [];
  if (stakeholders.length === 0) {
    text('Nenhum stakeholder cadastrado.', m, y, 8, 'normal', [100, 116, 139]);
    y += 8;
  } else {
    stakeholders.forEach((row) => {
      ensureSpace(10);
      const rowY = typeof y === 'number' && !Number.isNaN(y) ? y : m;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(m, rowY - 3, cw, 8, 1, 1, 'F');
      text(typeof row.name === 'string' ? row.name : '—', m + 3, rowY + 2, 8, 'bold', [30, 41, 59]);
      text(typeof row.activity === 'string' ? row.activity : '—', m + 3, rowY + 6, 7, 'normal', [100, 116, 139]);
      y = rowY + 10;
    });
    y += 4;
  }

  // Deliveries with activities and milestones
  text('Entregas planejadas', m, y, 10, 'bold', [30, 41, 59]);
  y += 8;

  if (deliveries.length === 0) {
    text('Este projeto ainda não possui entregas vinculadas.', m, y, 8, 'normal', [100, 116, 139]);
    y += 10;
  } else {
    deliveries.forEach((delivery) => {
      ensureSpace(20);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(m, y, cw, 10, 2, 2, 'FD');
      text(typeof delivery.name === 'string' ? delivery.name : String(delivery.name ?? '—'), m + 4, y + 6, 10, 'bold', [30, 41, 59]);
      text(`Prazo: ${formatDateBR(delivery.due_date ?? null)}`, pw - m - 4, y + 6, 8, 'normal', [100, 116, 139], 'right');
      y += 12;

      const scope =
        (typeof delivery.transformations_achievements === 'string' && delivery.transformations_achievements.trim()) ||
        (typeof delivery.description === 'string' && delivery.description.trim()) ||
        'Escopo da entrega não informado.';
      const scopeLines = doc.splitTextToSize(scope, Math.max(1, cw - 8));
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const safeScopeLines = Array.isArray(scopeLines) ? scopeLines.filter((l) => typeof l === 'string') : [scope];
      if (safeScopeLines.length > 0) doc.text(safeScopeLines, m + 4, y);
      y += safeScopeLines.length * 3.5 + 4;

      const deliveryInitiatives = initiativesByDeliveryId[delivery.id] || [];
      if (deliveryInitiatives.length === 0) {
        text('Nenhuma atividade vinculada a esta entrega.', m + 6, y, 7, 'normal', [100, 116, 139]);
        y += 8;
      } else {
        text('Atividades da entrega', m + 4, y, 8, 'bold', [51, 65, 85]);
        y += 6;
        deliveryInitiatives.forEach((init) => {
          ensureSpace(18);
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(m + 4, y, pw - m - 4, y);
          y += 3;
          text(typeof init.name === 'string' ? init.name : String(init.name ?? '—'), m + 6, y + 4, 9, 'bold', [30, 41, 59]);
          text(`${formatDateBR(init.start_date)} — ${formatDateBR(init.end_date)}`, pw - m - 6, y + 4, 7, 'normal', [100, 116, 139], 'right');
          y += 6;
          const descStr = typeof init.description === 'string' ? init.description.trim() : '';
          if (descStr) {
            const descLines = doc.splitTextToSize(descStr, Math.max(1, cw - 12));
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            const safeDescLines = Array.isArray(descLines) ? descLines.filter((l) => typeof l === 'string') : [descStr];
            if (safeDescLines.length > 0) doc.text(safeDescLines, m + 6, y);
            y += safeDescLines.length * 3 + 2;
          }
          const milestones = Array.isArray(init.milestones) ? init.milestones : [];
          if (milestones.length > 0) {
            text('Marcos:', m + 6, y + 3, 7, 'bold', [100, 116, 139]);
            y += 5;
            milestones.forEach((mil) => {
              ensureSpace(5);
              const done = mil.completed ? '[x]' : '[ ]';
              const title = typeof mil.title === 'string' ? mil.title : String(mil.title ?? '');
              const pct = typeof mil.percent === 'number' && !Number.isNaN(mil.percent) ? mil.percent : 0;
              const line = `${done} ${title} (${pct}%)${mil.due_date ? ` — prazo: ${formatDateBR(mil.due_date)}` : ''}`;
              const maxLineW = Math.max(1, cw - 14);
              const ml = doc.splitTextToSize(line, maxLineW);
              doc.setFontSize(7);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(51, 65, 85);
              const safeMl = Array.isArray(ml) ? ml.filter((l) => typeof l === 'string') : [line];
              if (safeMl.length > 0) doc.text(safeMl, m + 8, y);
              y += safeMl.length * 3.2;
            });
            y += 2;
          } else {
            text('Sem marcos definidos.', m + 8, y + 3, 7, 'normal', [148, 163, 184]);
            y += 7;
          }
          y += 4;
        });
        y += 4;
      }
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = ph - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(m, fy - 3, pw - m, fy - 3);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Gerado por PecuariA — Estrutura do Projeto', m, fy);
    doc.text(`Página ${p} de ${pageCount}`, pw - m, fy, { align: 'right' });
  }

  const safeProjectName = project.name.replace(/[^a-z0-9\u00C0-\u024F]/gi, '-').slice(0, 40) || 'projeto';
  const fileName = `estrutura-projeto-${safeProjectName}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
