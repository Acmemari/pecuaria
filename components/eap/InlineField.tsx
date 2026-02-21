import React from 'react';
import DateInputBR from '../DateInputBR';

const INLINE_BASE =
  'text-ai-text text-sm transition-colors placeholder:text-ai-subtext/50 min-w-0';
const INLINE_FOCUS =
  'focus:outline-none focus:ring-0 focus:bg-ai-surface/80 focus:rounded focus:px-1 focus:-mx-1';

interface InlineTextProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const InlineText: React.FC<InlineTextProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = '',
  className = '',
  disabled = false,
  id,
}) => (
  <input
    id={id}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    placeholder={placeholder}
    autoComplete="off"
    className={`${INLINE_BASE} ${INLINE_FOCUS} border-none bg-transparent py-0.5 px-0 w-full max-w-md ${className}`}
  />
);

interface InlineTextareaProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const InlineTextarea: React.FC<InlineTextareaProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = '',
  rows = 3,
  className = '',
  disabled = false,
  id,
}) => (
  <textarea
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    placeholder={placeholder}
    rows={rows}
    className={`${INLINE_BASE} ${INLINE_FOCUS} border-none bg-transparent py-1 px-0 w-full resize-none block ${className}`}
  />
);

interface InlineDateProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const InlineDate: React.FC<InlineDateProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = 'dd/mm/aaaa',
  min,
  max,
  className = '',
  disabled = false,
  id,
}) => (
  <span className={`inline-block min-w-[7rem] ${className}`} onBlur={onBlur}>
    <DateInputBR
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      disabled={disabled}
      className="[&_input]:!border-none [&_input]:!bg-transparent [&_input]:!py-0.5 [&_input]:!px-2 [&_input]:!pr-8 [&_input]:!rounded [&_input]:focus:!bg-ai-surface/80 [&_input]:!shadow-none"
    />
  </span>
);

interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  options: InlineSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const InlineSelect: React.FC<InlineSelectProps> = ({
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Selecione',
  className = '',
  disabled = false,
  id,
}) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    className={`${INLINE_BASE} ${INLINE_FOCUS} border-none bg-transparent py-0.5 px-1 pr-6 rounded cursor-pointer appearance-none bg-no-repeat bg-[length:12px] bg-[right_2px_center] ${className}`}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    }}
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

interface InlineNumberProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const InlineNumber: React.FC<InlineNumberProps> = ({
  value,
  onChange,
  onBlur,
  min,
  max,
  placeholder = '',
  className = '',
  disabled = false,
  id,
}) => (
  <input
    id={id}
    type="number"
    inputMode="numeric"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    placeholder={placeholder}
    min={min}
    max={max}
    className={`${INLINE_BASE} ${INLINE_FOCUS} border-none bg-transparent py-0.5 px-1 w-16 text-right ${className}`}
  />
);
