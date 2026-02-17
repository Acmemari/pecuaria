import React, { useEffect, useMemo, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import type { InitiativeWithProgress } from '../lib/initiatives';

interface InitiativesGanttProps {
  initiatives: InitiativeWithProgress[];
}

interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  duration: number;
  parent?: string;
  open?: boolean;
  progress?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const parseISODate = (value?: string | null): Date | null => {
  if (!value) return null;
  const normalized = value.slice(0, 10);
  const date = new Date(normalized + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
};

const toGanttDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inclusiveDurationDays = (start: Date, end: Date): number => {
  const diff = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  return Math.max(1, diff);
};

const InitiativesGantt: React.FC<InitiativesGanttProps> = ({ initiatives }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  const tasks = useMemo<GanttTask[]>(() => {
    const result: GanttTask[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const initiative of initiatives) {
      const milestoneDates = (initiative.milestones || [])
        .map((m) => parseISODate(m.due_date))
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime());

      const start =
        parseISODate(initiative.start_date) ||
        milestoneDates[0] ||
        today;

      const rawEnd =
        parseISODate(initiative.end_date) ||
        milestoneDates[milestoneDates.length - 1] ||
        start;

      const end = rawEnd < start ? start : rawEnd;
      const parentId = `initiative-${initiative.id}`;

      result.push({
        id: parentId,
        text: initiative.name || 'Iniciativa sem nome',
        start_date: toGanttDate(start),
        duration: inclusiveDurationDays(start, end),
        open: true,
        progress: Math.min(1, Math.max(0, (initiative.progress || 0) / 100)),
      });

      for (const milestone of initiative.milestones || []) {
        const due = parseISODate(milestone.due_date);
        if (!due) continue;
        result.push({
          id: `milestone-${milestone.id}`,
          text: milestone.title || 'Marco',
          start_date: toGanttDate(due),
          duration: 1,
          parent: parentId,
          progress: milestone.completed ? 1 : 0,
        });
      }
    }

    return result;
  }, [initiatives]);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    gantt.config.readonly = true;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config.xml_date = '%Y-%m-%d';
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.autosize = false;
    gantt.config.columns = [
      { name: 'text', label: 'Atividade', tree: true, width: '*' },
      { name: 'start_date', label: 'Início', align: 'center', width: 88 },
      { name: 'end_date', label: 'Fim', align: 'center', width: 88 },
    ];

    gantt.init(containerRef.current);
    initializedRef.current = true;

    return () => {
      gantt.clearAll();
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    gantt.clearAll();
    gantt.parse({ data: tasks, links: [] });
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="bg-ai-surface/50 border border-ai-border rounded-xl p-8 text-center text-sm text-ai-subtext">
        Não há atividades com datas programadas para exibir no Gantt.
      </div>
    );
  }

  return (
    <div className="bg-white border border-ai-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-ai-border text-xs text-ai-subtext">
        Cronograma de iniciativas e marcos programados
      </div>
      <div ref={containerRef} className="w-full h-[520px]" />
    </div>
  );
};

export default InitiativesGantt;


