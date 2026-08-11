import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { CommandItem } from '@/components/ui/command';

// Normalise une option : accepte une chaîne ("code") ou un objet
// { value, label, keywords }. `value` = ce qui est stocké (le code),
// `label` = ce qui est affiché, `keywords` = texte sur lequel porte la recherche.
function normalizeOption(opt) {
  if (opt == null) return { value: '', label: '', keywords: '' };
  if (typeof opt === 'string') return { value: opt, label: opt, keywords: opt };
  const value = opt.value ?? '';
  const designation = opt.designation ?? '';
  const label = opt.label ?? (designation ? `${value} - ${designation}` : value);
  const keywords = opt.keywords ?? `${value} ${designation}`.trim();
  return { value, label, keywords };
}

// Liste déroulante avec recherche intégrée (Popover + Command).
// Remplace un <Select> quand la liste peut être longue (valeurs alimentées
// depuis l'Admin). API volontairement proche : value / onChange / options.
// Les options peuvent porter une désignation (affichage « code — désignation »
// et recherche sur le code ET la désignation).
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Tapez pour filtrer…',
  emptyText = 'Aucun résultat.',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const items = options.map(normalizeOption);
  const selected = items.find((it) => it.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{selected?.label || value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((opt) => (
                <CommandItem
                  key={opt.value}
                  // cmdk filtre sur `value` : on y met les keywords (code + désignation)
                  // pour permettre la recherche par l'un ou l'autre.
                  value={opt.keywords}
                  onSelect={() => {
                    onChange(opt.value === value ? '' : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
