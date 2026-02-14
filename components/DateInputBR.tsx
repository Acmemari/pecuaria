import React from 'react';
import DatePicker from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

function formatDisplay(date: Date | null): string {
  if (!date) return '';
  const dd = `${date.getDate()}`.padStart(2, '0');
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const yyyy = `${date.getFullYear()}`.padStart(4, '0');
  return `${dd}/${mm}/${yyyy}`;
}

function parseIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function maskDisplayDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayToDate(display: string): Date | null {
  if (!display) return null;
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }
  return date;
}

interface DateInputBRProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * Seletor de data em formato dd/mm/aaaa (pt-BR).
 * Internamente usa YYYY-MM-DD para compatibilidade com API.
 */
export function DateInputBR({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  min,
  max,
  required,
  className = '',
  id,
}: DateInputBRProps) {
  const selectedDate = React.useMemo(() => parseIsoDate(value), [value]);
  const minDate = React.useMemo(() => parseIsoDate(min), [min]);
  const maxDate = React.useMemo(() => parseIsoDate(max), [max]);
  const [inputValue, setInputValue] = React.useState<string>(formatDisplay(selectedDate));

  React.useEffect(() => {
    setInputValue(formatDisplay(selectedDate));
  }, [selectedDate]);

  const applyTypedValue = React.useCallback(
    (typed: string) => {
      const parsed = parseDisplayToDate(typed);
      if (!parsed) return false;
      if (minDate && parsed < minDate) return false;
      if (maxDate && parsed > maxDate) return false;
      onChange(toIsoDate(parsed));
      return true;
    },
    [onChange, minDate, maxDate]
  );

  return (
    <DatePicker
      id={id}
      selected={selectedDate}
      onChange={(date) => {
        onChange(toIsoDate(date));
        setInputValue(formatDisplay(date));
      }}
      value={inputValue}
      onChangeRaw={(e) => {
        const target = e.target as HTMLInputElement;
        const masked = maskDisplayDate(target.value);
        setInputValue(masked);
        if (masked.length === 10) {
          applyTypedValue(masked);
        }
      }}
      onBlur={() => {
        if (!inputValue.trim()) {
          onChange('');
          return;
        }
        const ok = applyTypedValue(inputValue);
        if (!ok) {
          setInputValue(formatDisplay(selectedDate));
        } else {
          setInputValue((prev) => formatDisplay(parseDisplayToDate(prev)));
        }
      }}
      locale={ptBR}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      minDate={minDate || undefined}
      maxDate={maxDate || undefined}
      isClearable={!required}
      required={required}
      className={className}
      title="Formato: dd/mm/aaaa"
      autoComplete="off"
      showPopperArrow={false}
      popperPlacement="bottom-start"
    />
  );
}
