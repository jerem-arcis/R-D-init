import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import FieldShell from './FieldShell';

// Champ EAN avec support pour plusieurs valeurs + warning de calcul
export default function EANField({
  label,
  value = [],
  onChange,
  disabled,
  warning,
  ...shellProps
}) {
  const list = Array.isArray(value) ? value : value ? [value] : [];

  const updateAt = (idx, v) => {
    const next = [...list];
    next[idx] = v;
    onChange?.(next);
  };

  const add = () => onChange?.([...list, '']);
  const removeAt = (idx) => onChange?.(list.filter((_, i) => i !== idx));

  return (
    <FieldShell
      label={label}
      warning={warning || 'Plusieurs EAN possibles — vérifier la règle de calcul (14 chiffres).'}
      {...shellProps}
    >
      <div className="space-y-1.5">
        {(list.length === 0 ? [''] : list).map((ean, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              type="text"
              value={ean}
              onChange={(e) => updateAt(idx, e.target.value)}
              disabled={disabled}
              maxLength={14}
              placeholder="14 chiffres"
              className={`h-9 font-mono text-sm ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
            />
            {!disabled && list.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAt(idx)}
                className="h-9 w-9 text-red-500 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={add}
            className="h-7 text-xs text-violet-700 hover:bg-violet-50"
          >
            <Plus className="w-3 h-3 mr-1" />
            Ajouter un EAN
          </Button>
        )}
      </div>
    </FieldShell>
  );
}
