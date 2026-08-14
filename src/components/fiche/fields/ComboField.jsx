import React, { useState } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import FieldShell from './FieldShell';

// Champ « liste déroulante + saisie libre » : propose des valeurs prédéfinies
// (ex. masques d'étiquette du fichier FM) tout en autorisant un code personnalisé
// absent de la liste.
//
// Rendu par l'APPLICATION (Popover + Command), comme SelectField et
// SearchableSelectField. L'implémentation précédente s'appuyait sur un <datalist>
// natif : le menu était dessiné par le navigateur, avec son propre style, et se
// confondait avec l'autocomplétion de formulaire — visuellement étranger au reste
// de la fiche.
export default function ComboField({
  label,
  value,
  onChange,
  disabled,
  options = [],
  placeholder = 'Sélectionner ou saisir un code…',
  ...shellProps
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const items = options.map((opt) => (typeof opt === 'string' ? opt : opt.value));
  const saisie = query.trim();
  // Saisie libre : proposée en tête tant qu'elle ne correspond pas à une option.
  const customVisible = saisie !== '' && !items.includes(saisie);

  const commit = (v) => {
    onChange?.(v);
    setQuery('');
    setOpen(false);
  };

  return (
    <FieldShell label={label} {...shellProps}>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed',
              !value && 'text-muted-foreground',
              disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed',
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Filtrer ou saisir un code…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandGroup>
                {customVisible && (
                  <CommandItem value={saisie} onSelect={() => commit(saisie)}>
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    <span className="truncate">
                      Utiliser «&nbsp;{saisie}&nbsp;»
                    </span>
                  </CommandItem>
                )}
                {items.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => commit(opt)}>
                    <Check
                      className={cn('mr-2 h-4 w-4', value === opt ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}
