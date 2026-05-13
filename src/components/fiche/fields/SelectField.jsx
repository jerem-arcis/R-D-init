import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldShell from './FieldShell';

export default function SelectField({
  label,
  value,
  onChange,
  disabled,
  options = [],
  placeholder = 'Sélectionner...',
  ...shellProps
}) {
  return (
    <FieldShell label={label} {...shellProps}>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange?.(v)}
        disabled={disabled}
      >
        <SelectTrigger className={`h-9 ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <SelectItem key={optValue} value={optValue}>
                {optLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
