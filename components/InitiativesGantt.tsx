import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { gantt } from 'dhtmlx-gantt';
import { Download, Maximize, Minimize } from 'lucide-react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import './gantt-custom.css';
import type { InitiativeWithProgress } from '../lib/initiatives';
import type { DeliveryRow } from '../lib/deliveries';

interface InitiativesGanttProps {
  initiatives: InitiativeWithProgress[];
  deliveries: DeliveryRow[];
  onTaskDateChange?: (change: GanttDateChange) => void;
}

interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  duration: number;
  end_date?: string;
  parent?: string;
  open?: boolean;
  progress?: number;
  type?: string;
  readonly?: boolean;
  taskType?: 'delivery' | 'initiative' | 'milestone';
}

export interface GanttDateChange {
  type: 'delivery' | 'initiative' | 'milestone';
  id: string;
  start_date: string;
  end_date: string;
}

const DAY_MS = 86_400_000;
const UNLINKED_DELIVERY_ID = '__unlinked__';
const DATE_BR_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const PT_BR_GANTT_DATE_LOCALE = {
  month_full: ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  month_short: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  day_full: ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'],
  day_short: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
};

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';
type DepthLevel = 1 | 2 | 3;

const DEPTH_BY_TYPE: Record<string, DepthLevel> = {
  delivery: 1,
  initiative: 2,
  milestone: 3,
};

const ZOOM_OPTIONS: ReadonlyArray<{ key: ZoomLevel; label: string }> = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'quarter', label: 'Trimestre' },
] as const;

const LEVEL_OPTIONS: ReadonlyArray<{ key: DepthLevel; label: string }> = [
  { key: 1, label: 'Nível 1' },
  { key: 2, label: 'Nível 1 e 2' },
  { key: 3, label: 'Nível 1 a 3' },
] as const;

const ZOOM_CONFIGS: Record<ZoomLevel, { scales: Array<Record<string, unknown>>; minColumnWidth: number }> = {
  day: {
    scales: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'day', step: 1, format: '%d' },
    ],
    minColumnWidth: 32,
  },
  week: {
    scales: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: 'Sem %W' },
    ],
    minColumnWidth: 55,
  },
  month: {
    scales: [
      { unit: 'year', step: 1, format: '%Y' },
      { unit: 'month', step: 1, format: '%M' },
    ],
    minColumnWidth: 80,
  },
  quarter: {
    scales: [
      { unit: 'year', step: 1, format: '%Y' },
      {
        unit: 'quarter',
        step: 1,
        format: (date: Date) => `T${Math.floor(date.getMonth() / 3) + 1}`,
      },
    ],
    minColumnWidth: 120,
  },
};

const SEG_WRAPPER = 'inline-flex items-center rounded-2xl bg-slate-100 p-1';
const SEG_BTN = 'px-3 py-1.5 text-[11px] font-semibold rounded-xl transition-all duration-150';
const SEG_ACTIVE = `${SEG_BTN} bg-white text-indigo-600 shadow-sm`;
const SEG_INACTIVE = `${SEG_BTN} text-slate-500 hover:text-slate-700`;
const ICON_BTN = 'inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const parseISODate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value.slice(0, 10) + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
};

const toGanttDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inclusiveDurationDays = (start: Date, end: Date): number =>
  Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getTaskEndDateInclusive = (task: { start_date: Date; duration: number }): Date =>
  addDays(task.start_date, Math.max(1, Number(task.duration) || 1) - 1);

const formatDateBR = (d: Date): string => DATE_BR_FORMATTER.format(d);

const applyZoomConfig = (level: ZoomLevel) => {
  const config = ZOOM_CONFIGS[level];
  gantt.config.scales = config.scales as typeof gantt.config.scales;
  gantt.config.min_column_width = config.minColumnWidth;
};

/* ── Shared sub-components (stable refs, no re-render cost) ────────── */

const ZoomButtons: React.FC<{ active: ZoomLevel; onChange: (z: ZoomLevel) => void }> = React.memo(({ active, onChange }) => (
  <div className={SEG_WRAPPER}>
    {ZOOM_OPTIONS.map((z) => (
      <button
        key={z.key}
        type="button"
        onClick={() => onChange(z.key)}
        className={active === z.key ? SEG_ACTIVE : SEG_INACTIVE}
      >
        {z.label}
      </button>
    ))}
  </div>
));
ZoomButtons.displayName = 'ZoomButtons';

const LevelButtons: React.FC<{ active: DepthLevel; onChange: (d: DepthLevel) => void }> = React.memo(({ active, onChange }) => (
  <div className={SEG_WRAPPER}>
    {LEVEL_OPTIONS.map((l) => (
      <button
        key={l.key}
        type="button"
        onClick={() => onChange(l.key)}
        className={active === l.key ? SEG_ACTIVE : SEG_INACTIVE}
      >
        {l.label}
      </button>
    ))}
  </div>
));
LevelButtons.displayName = 'LevelButtons';

/* ── Main component ────────────────────────────────────────────────── */

const InitiativesGantt: React.FC<InitiativesGanttProps> = ({ initiatives, deliveries, onTaskDateChange }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRafRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const maxDepthRef = useRef<DepthLevel>(3);
  const onTaskDateChangeRef = useRef(onTaskDateChange);
  onTaskDateChangeRef.current = onTaskDateChange;

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [maxDepthLevel, setMaxDepthLevel] = useState<DepthLevel>(3);
  const [isExporting, setIsExporting] = useState(false);

  const tasks = useMemo<GanttTask[]>(() => {
    const result: GanttTask[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initiativeTiming = new Map<string, { start: Date; end: Date }>();
    const initiativesByDelivery = new Map<string, InitiativeWithProgress[]>();

    for (const initiative of initiatives) {
      const deliveryId = initiative.delivery_id || UNLINKED_DELIVERY_ID;
      let list = initiativesByDelivery.get(deliveryId);
      if (!list) {
        list = [];
        initiativesByDelivery.set(deliveryId, list);
      }
      list.push(initiative);
    }

    const sortedDeliveryGroups: Array<{ id: string; name: string; initiatives: InitiativeWithProgress[] }> = [];
    for (const delivery of deliveries) {
      const list = initiativesByDelivery.get(delivery.id);
      if (!list || list.length === 0) continue;
      sortedDeliveryGroups.push({ id: delivery.id, name: delivery.name || 'Entrega sem nome', initiatives: list });
    }

    const unlinkedInitiatives = initiativesByDelivery.get(UNLINKED_DELIVERY_ID);
    if (unlinkedInitiatives && unlinkedInitiatives.length > 0) {
      sortedDeliveryGroups.push({
        id: UNLINKED_DELIVERY_ID,
        name: 'Sem entrega vinculada',
        initiatives: unlinkedInitiatives,
      });
    }

    for (const group of sortedDeliveryGroups) {
      let deliveryStart: Date | null = null;
      let deliveryEnd: Date | null = null;

      for (const initiative of group.initiatives) {
        let earliestMilestone: Date | null = null;
        let latestMilestone: Date | null = null;
        const milestones = initiative.milestones;
        if (milestones) {
          for (let i = 0; i < milestones.length; i++) {
            const due = parseISODate(milestones[i].due_date);
            if (!due) continue;
            if (!earliestMilestone || due < earliestMilestone) earliestMilestone = due;
            if (!latestMilestone || due > latestMilestone) latestMilestone = due;
          }
        }

        const start = parseISODate(initiative.start_date) || earliestMilestone || today;
        const rawEnd = parseISODate(initiative.end_date) || latestMilestone || start;
        const end = rawEnd < start ? start : rawEnd;

        initiativeTiming.set(initiative.id, { start, end });

        if (!deliveryStart || start < deliveryStart) deliveryStart = start;
        if (!deliveryEnd || end > deliveryEnd) deliveryEnd = end;
      }

      const resolvedStart = deliveryStart || today;
      const resolvedEnd = deliveryEnd || resolvedStart;

      result.push({
        id: `delivery-${group.id}`,
        text: group.name,
        start_date: toGanttDate(resolvedStart),
        end_date: toGanttDate(resolvedEnd),
        duration: inclusiveDurationDays(resolvedStart, resolvedEnd),
        open: true,
        type: 'project',
        readonly: group.id === UNLINKED_DELIVERY_ID,
        taskType: 'delivery',
      });
    }

    for (const initiative of initiatives) {
      const timing = initiativeTiming.get(initiative.id);
      if (!timing) continue;

      const parentDeliveryId = initiative.delivery_id || UNLINKED_DELIVERY_ID;
      const parentId = `initiative-${initiative.id}`;

      result.push({
        id: parentId,
        text: initiative.name || 'Iniciativa sem nome',
        parent: `delivery-${parentDeliveryId}`,
        start_date: toGanttDate(timing.start),
        end_date: toGanttDate(timing.end),
        duration: inclusiveDurationDays(timing.start, timing.end),
        open: true,
        progress: Math.min(1, Math.max(0, (initiative.progress || 0) / 100)),
        taskType: 'initiative',
      });

      const milestones = initiative.milestones;
      if (milestones) {
        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          const due = parseISODate(milestone.due_date);
          if (!due) continue;
          result.push({
            id: `milestone-${milestone.id}`,
            text: milestone.title || 'Marco',
            start_date: toGanttDate(due),
            end_date: toGanttDate(due),
            duration: 1,
            parent: parentId,
            progress: milestone.completed ? 1 : 0,
            taskType: 'milestone',
          });
        }
      }
    }

    return result;
  }, [initiatives, deliveries]);

  const initGantt = useCallback(() => {
    if (!containerRef.current || initializedRef.current) return;

    gantt.locale.date = PT_BR_GANTT_DATE_LOCALE;

    gantt.plugins({ marker: true, tooltip: true });

    gantt.config.readonly = false;
    gantt.config.drag_move = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;
    gantt.config.xml_date = '%Y-%m-%d';
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.autosize = false;
    gantt.config.open_tree_initially = true;
    gantt.config.show_progress = true;
    gantt.config.row_height = 36;
    gantt.config.scale_height = 64;
    gantt.config.grid_width = 320;
    gantt.config.columns = [
      { name: 'text', label: 'CRONOGRAMA DE ATIVIDADES', tree: true, width: '*', min_width: 180 },
    ];

    applyZoomConfig('day');

    gantt.templates.task_class = (_s: Date, _e: Date, task: Record<string, unknown>) => {
      const tt = task.taskType as string | undefined;
      if (tt === 'delivery') return 'gantt-delivery-row';
      if (tt === 'milestone') return 'gantt-milestone-row';
      return '';
    };

    gantt.templates.grid_row_class = (_s: Date, _e: Date, task: Record<string, unknown>) => {
      const tt = task.taskType as string | undefined;
      if (tt === 'delivery') return 'gantt-delivery-row';
      if (tt === 'milestone') return 'gantt-milestone-row';
      return '';
    };

    gantt.templates.tooltip_text = (start: Date, end: Date, task: Record<string, unknown>) => {
      const tt = task.taskType as string | undefined;
      const name = String(task.text || '');
      const dur = Math.max(1, Number(task.duration) || 1);

      let html = `<strong>${name}</strong><br/>${formatDateBR(start)} — ${formatDateBR(end)}<br/>${dur} dia${dur > 1 ? 's' : ''}`;

      if (tt === 'initiative') {
        html += `<br/>Progresso: ${Math.round((Number(task.progress) || 0) * 100)}%`;
      } else if (tt === 'milestone') {
        html += `<br/>${Number(task.progress) >= 1 ? 'Concluído' : 'Pendente'}`;
      }
      return html;
    };

    const evBeforeDrag = gantt.attachEvent('onBeforeTaskDrag', (id: string) => {
      const task = gantt.getTask(id);
      if (task?.readonly) return false;
      const taskId = String(task?.id || '');
      return !(taskId.startsWith('delivery-') && taskId.endsWith(UNLINKED_DELIVERY_ID));
    });

    const evAfterDrag = gantt.attachEvent('onAfterTaskDrag', (id: string) => {
      const cb = onTaskDateChangeRef.current;
      if (!cb) return true;
      const task = gantt.getTask(id);
      const taskId = String(task?.id || '');
      if (!taskId) return true;

      const cleanId = taskId.replace(/^(delivery-|initiative-|milestone-)/, '');
      if (!cleanId || cleanId === UNLINKED_DELIVERY_ID) return true;

      cb({
        type: taskId.startsWith('delivery-')
          ? 'delivery'
          : taskId.startsWith('milestone-')
            ? 'milestone'
            : 'initiative',
        id: cleanId,
        start_date: toGanttDate(task.start_date),
        end_date: toGanttDate(getTaskEndDateInclusive(task)),
      });
      return true;
    });

    const evDisplay = gantt.attachEvent('onBeforeTaskDisplay', (_id: string, task: Record<string, unknown>) => {
      const depth = DEPTH_BY_TYPE[task.taskType as string] ?? 1;
      return depth <= maxDepthRef.current;
    });

    gantt.init(containerRef.current);
    initializedRef.current = true;

    const todayMarker = gantt.addMarker({
      start_date: new Date(),
      css: 'gantt-today-marker',
      text: 'Hoje',
    });

    return () => {
      gantt.detachEvent(evBeforeDrag);
      gantt.detachEvent(evAfterDrag);
      gantt.detachEvent(evDisplay);
      try {
        if (todayMarker) gantt.deleteMarker(todayMarker);
      } catch { /* marker may already be removed */ }
      gantt.clearAll();
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = initGantt();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [initGantt]);

  useEffect(() => {
    if (!initializedRef.current) return;
    applyZoomConfig(zoomLevel);
    gantt.render();
  }, [zoomLevel]);

  useEffect(() => {
    maxDepthRef.current = maxDepthLevel;
    if (initializedRef.current) gantt.render();
  }, [maxDepthLevel]);

  useEffect(() => {
    if (!initializedRef.current) return;
    gantt.batchUpdate(() => {
      gantt.clearAll();
      gantt.parse({ data: tasks, links: [] });
    });
  }, [tasks]);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
      if (!initializedRef.current) return;
      if (fullscreenRafRef.current !== null) cancelAnimationFrame(fullscreenRafRef.current);
      fullscreenRafRef.current = requestAnimationFrame(() => gantt.render());
    };

    document.addEventListener('fullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      if (fullscreenRafRef.current !== null) cancelAnimationFrame(fullscreenRafRef.current);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const target = wrapperRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement === target) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch { /* fullscreen may be blocked by browser policy */ }
  }, []);

  const handleDownload = useCallback(async () => {
    const target = wrapperRef.current;
    if (!target || isExporting) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(target, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `cronograma-atividades-${toGanttDate(new Date())}.png`;
      link.href = dataUrl;
      link.click();
    } catch { /* export can fail in restricted contexts */ }
    setIsExporting(false);
  }, [isExporting]);

  if (tasks.length === 0) {
    return (
      <div className="bg-ai-surface/50 border border-ai-border rounded-xl p-8 text-center text-sm text-ai-subtext">
        Não há atividades com datas programadas para exibir no Gantt.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`bg-white border border-slate-200 overflow-hidden shadow-sm ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
    >
      {isFullscreen ? (
        <>
          {/* Row 1: title + exit fullscreen */}
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-700 tracking-tight">Atividades em Foco</span>
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Sair da Tela cheia"
              aria-label="Sair da Tela cheia"
              className={ICON_BTN}
            >
              <Minimize size={16} />
            </button>
          </div>

          {/* Row 2: zoom + levels + download */}
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <ZoomButtons active={zoomLevel} onChange={setZoomLevel} />
            <div className="flex items-center gap-2">
              <LevelButtons active={maxDepthLevel} onChange={setMaxDepthLevel} />
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                title="Download do gráfico"
                aria-label="Download do gráfico"
                className={`${ICON_BTN} ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700 tracking-tight">Cronograma de Atividades</span>
          </div>

          <div className="flex items-center gap-2">
            <ZoomButtons active={zoomLevel} onChange={setZoomLevel} />
            <LevelButtons active={maxDepthLevel} onChange={setMaxDepthLevel} />
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              title="Download do gráfico"
              aria-label="Download do gráfico"
              className={`${ICON_BTN} ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Tela cheia"
              aria-label="Tela cheia"
              className={ICON_BTN}
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full"
        style={{ height: isFullscreen ? 'calc(100vh - 104px)' : '520px' }}
      />
    </div>
  );
};

export default InitiativesGantt;
