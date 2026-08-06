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
  // La valeur courante peut venir d'un référentiel externe (ex. centre de profit
  // prérempli depuis Dataverse) et ne pas figurer dans `options`. Sans option
  // correspondante, Radix Select n'affiche rien : on l'ajoute pour qu'elle remonte.
  const hasValue = value != null && value !== '';
  const present =
    hasValue && options.some((opt) => (typeof opt === 'string' ? opt : opt.value) === value);
  const allOptions = hasValue && !present ? [...options, value] : options;

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
          {allOptions.map((opt) => {
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
