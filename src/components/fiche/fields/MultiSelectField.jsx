import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import FieldShell from './FieldShell';

const asArray = (v) => (Array.isArray(v) ? v : []);
// Égalité ensembliste (ordre indifférent) : les canaux / sites sont des ensembles.
const sameSet = (a, b) => {
  const A = asArray(a);
  const B = asArray(b);
  if (A.length !== B.length) return false;
  const s = new Set(A);
  return B.every((v) => s.has(v));
};

// Multi-select « tamponné » : les coches/décoches se font en LOCAL tant que le
// menu est ouvert ; on ne remonte au parent (onChange) QU'À LA FERMETURE du menu,
// et seulement si la sélection a changé.
//
// Anti-clignotement : les canaux / sites de stockage sont stockés dans des tables
// filles Dataverse à COHÉRENCE DIFFÉRÉE. Juste après l'écriture, l'affichage parent
// passe par optimiste (nouvelle valeur) PUIS un refetch qui peut renvoyer ~2 s
// l'ANCIENNE valeur avant de se stabiliser. Un simple « garde jusqu'à confirmation »
// ne suffit pas (l'écho optimiste confirmerait trop tôt). On fige donc l'affichage
// sur la sélection saisie pendant une courte fenêtre (le temps que la cohérence se
// fasse), puis on rend la main à la vérité parent.
const HOLD_MS = 3000;

export default function MultiSelectField({
  label,
  value = [],
  onChange,
  disabled,
  options = [],
  placeholder = 'Sélectionner...',
  ...shellProps
}) {
  const external = asArray(value);
  const externalRef = useRef(external);
  externalRef.current = external;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(external);
  const holdRef = useRef(false); // fenêtre post-écriture : on ignore la valeur parent
  const timerRef = useRef(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  // Resynchronise l'affichage avec la valeur parent — sauf pendant l'édition (menu
  // ouvert) ou pendant la fenêtre de garde post-écriture.
  useEffect(() => {
    if (open || holdRef.current) return;
    setDraft(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  const toggle = (opt) =>
    setDraft((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));

  // Fermeture du menu : on remonte au parent uniquement si la sélection a changé,
  // et on fige l'affichage le temps que Dataverse propage l'écriture.
  const handleOpenChange = (o) => {
    setOpen(o);
    if (!o && !sameSet(draft, external)) {
      holdRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        holdRef.current = false;
        // Vérité serveur après la fenêtre de cohérence (revient à l'état réel si
        // l'écriture a échoué, sinon la nouvelle valeur est déjà en place).
        setDraft(externalRef.current);
      }, HOLD_MS);
      onChange?.(draft);
    }
  };

  const selected = draft;

  return (
    <FieldShell label={label} {...shellProps}>
      <Popover open={open} onOpenChange={disabled ? undefined : handleOpenChange}>
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
