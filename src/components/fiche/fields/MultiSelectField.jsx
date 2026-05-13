import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import FieldShell from './FieldShell';

export default function MultiSelectField({
  label,
  value = [],
  onChange,
  disabled,
  options = [],
  placeholder = 'Sélectionner...',
  ...shellProps
}) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange?.(selected.filter((v) => v !== opt));
    } else {
      onChange?.([...selected, opt]);
    }
  };

  return (
    <FieldShell label={label} {...shellProps}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={`h-9 w-full justify-between font-normal ${
              disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
            }`}
          >
            <span className="truncate text-left">
              {selected.length === 0 ? (
                <span className="text-slate-400">{placeholder}</span>
              ) : (
                selected.join(', ')
              )}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
          {options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = selected.includes(optValue);
            return (
              <button
                key={optValue}
                type="button"
                onClick={() => toggle(optValue)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-left"
              >
                <span className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </span>
                <span>{optLabel}</span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}
