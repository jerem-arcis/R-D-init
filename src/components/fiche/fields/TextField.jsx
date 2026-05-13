import React from 'react';
import { Input } from '@/components/ui/input';
import FieldShell from './FieldShell';

export default function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  maxLength,
  step,
  ...shellProps
}) {
  const id = label?.replace(/\s+/g, '_').toLowerCase();
  return (
    <FieldShell label={label} htmlFor={id} {...shellProps}>
      <Input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => {
          const v = type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
          onChange?.(v);
        }}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        step={step}
        className={`h-9 ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
      />
    </FieldShell>
  );
}
