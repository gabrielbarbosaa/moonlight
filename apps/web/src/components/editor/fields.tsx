'use client';

import { useEffect, useState } from 'react';

export function TextField({
  label,
  value,
  onChange,
  maxLength,
  multiline,
  placeholder,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={value ?? ''}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value ?? ''}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && (
        <span className="hint" style={{ display: 'block' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OptionRow<T extends string>({
  label,
  value,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  renderOption?: (option: { value: T; label: string }) => React.ReactNode;
}) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span style={{ fontSize: '0.9rem', fontWeight: 550 }}>{label}</span>
      <div className="option-row">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {renderOption ? renderOption(option) : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <label className="field">
      {label}
      <span className="row" style={{ flexWrap: 'nowrap', marginTop: 6 }}>
        <input
          type="color"
          aria-label={`${label} (seletor)`}
          value={HEX_PATTERN.test(value) ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: 48, flex: 'none', marginTop: 0 }}
        />
        <input
          aria-label={`${label} (código)`}
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value.startsWith('#')
              ? event.target.value
              : `#${event.target.value}`;
            setText(next);
            if (HEX_PATTERN.test(next)) onChange(next.toLowerCase());
          }}
          style={{ marginTop: 0, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
        />
      </span>
    </label>
  );
}
