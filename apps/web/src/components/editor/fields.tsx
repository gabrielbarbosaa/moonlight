'use client';

import type { CSSProperties } from 'react';

const inputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 6,
  marginTop: 2,
  boxSizing: 'border-box',
  font: 'inherit',
};

const labelStyle: CSSProperties = { display: 'block', fontSize: 13, marginTop: 8 };

export function TextField({
  label,
  value,
  onChange,
  maxLength,
  multiline,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={value ?? ''}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle}
        />
      ) : (
        <input
          value={value ?? ''}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle}
        />
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
    <label style={labelStyle}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...inputStyle, height: 34, padding: 2 }}
      />
    </label>
  );
}
