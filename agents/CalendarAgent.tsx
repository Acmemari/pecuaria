import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';

/**
 * Calendário - visualização mensal, semanal e diária de eventos.
 */
const CalendarAgent: React.FC = () => {
  const [events, setEvents] = useState<EventInput[]>([
    { id: '1', title: 'Evento 1', start: '2025-02-10', end: '2025-02-12' },
    { id: '2', title: 'Evento 2', start: '2025-02-15T10:00:00', end: '2025-02-15T12:00:00' },
  ]);

  const [promptState, setPromptState] = useState<{
    open: boolean;
    selectInfo: DateSelectArg | null;
    value: string;
  }>({ open: false, selectInfo: null, value: '' });

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    event: { id: string; title: string } | null;
  }>({ open: false, event: null });

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    selectInfo.view.calendar.unselect();
    setPromptState({ open: true, selectInfo, value: '' });
  };

  const handlePromptConfirm = () => {
    const { selectInfo, value } = promptState;
    setPromptState({ open: false, selectInfo: null, value: '' });
    if (!selectInfo || !value?.trim()) return;
    setEvents((prev) => [
      ...prev,
      {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: value.trim(),
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
      },
    ]);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setConfirmState({ open: true, event: { id: clickInfo.event.id!, title: clickInfo.event.title } });
  };

  const handleConfirmDelete = () => {
    if (confirmState.event) {
      setEvents((prev) => prev.filter((e) => e.id !== confirmState.event!.id));
    }
    setConfirmState({ open: false, event: null });
  };

  return (
    <div className="h-full p-4 md:p-6">
      {/* Modal: Inclua uma atividade */}
      {promptState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPromptState({ open: false, selectInfo: null, value: '' })}>
          <div className="bg-ai-bg border border-ai-border rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ai-text mb-3">Inclua uma atividade</h3>
            <input
              type="text"
              value={promptState.value}
              onChange={(e) => setPromptState((p) => ({ ...p, value: e.target.value }))}
              placeholder="Inclua uma atividade"
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePromptConfirm()}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPromptState({ open: false, selectInfo: null, value: '' })} className="px-4 py-2 rounded-md border border-ai-border text-ai-text hover:bg-ai-surface2">
                Cancelar
              </button>
              <button type="button" onClick={handlePromptConfirm} className="px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {confirmState.open && confirmState.event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmState({ open: false, event: null })}>
          <div className="bg-ai-bg border border-ai-border rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ai-text mb-2">Excluir atividade</h3>
            <p className="text-ai-subtext text-sm mb-4">
              Excluir &quot;{confirmState.event.title}&quot;?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmState({ open: false, event: null })} className="px-4 py-2 rounded-md border border-ai-border text-ai-text hover:bg-ai-surface2">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100%-2rem)] min-h-[500px] rounded-xl border border-ai-border bg-white dark:bg-ai-surface overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events={events}
        />
      </div>
    </div>
  );
};

export default CalendarAgent;
