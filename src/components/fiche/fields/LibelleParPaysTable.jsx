import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { PAYS_LIBELLES } from '@/lib/ficheSchema';

// Normalise la valeur reçue (compat ancien format objet {FR:'...', EN:'...'})
const normalize = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== '')
      .map(([code, libelle]) => ({ code, libelle }));
  }
  return [];
};

// Tableau dynamique : ajouter/supprimer des lignes "pays → libellé"
export default function LibelleParPaysTable({
  label = 'Libellé par pays',
  value,
  onChange,
  disabled,
}) {
  const rows = useMemo(() => normalize(value), [value]);

  const emit = (next) => onChange?.(next);

  const setRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    emit(next);
  };

  const removeRow = (idx) => emit(rows.filter((_, i) => i !== idx));

  const addRow = () => emit([...rows, { code: '', libelle: '' }]);

  // Codes déjà sélectionnés (pour ne pas proposer un doublon)
  const usedCodes = (excludeIdx) =>
    new Set(rows.filter((_, i) => i !== excludeIdx).map((r) => r.code).filter(Boolean));

  // La dernière ligne est-elle complète (pays choisi) → on peut autoriser le +
  const lastRow = rows[rows.length - 1];
  const canAddMore =
    !disabled &&
    rows.length < PAYS_LIBELLES.length &&
    (rows.length === 0 || (lastRow?.code && lastRow.code.length > 0));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-48">Pays</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Libellé</th>
              <th className="px-2 py-2 w-20 text-right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-xs text-slate-400 italic text-center">
                  Aucun libellé — cliquez sur « Ajouter un pays » pour commencer.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const taken = usedCodes(idx);
              const isLast = idx === rows.length - 1;
              return (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">
                    <Select
                      value={row.code || undefined}
                      onValueChange={(v) => setRow(idx, { code: v })}
                      disabled={disabled}
                    >
                      <SelectTrigger className={`h-8 text-xs ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}>
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYS_LIBELLES.map((p) => (
                          <SelectItem
                            key={p.code}
                            value={p.code}
                            disabled={taken.has(p.code) && row.code !== p.code}
                          >
                            <span className="font-mono text-slate-400 mr-2">{p.code}</span>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={row.libelle ?? ''}
                      onChange={(e) => setRow(idx, { libelle: e.target.value })}
                      disabled={disabled || !row.code}
                      placeholder={row.code ? 'Libellé…' : 'Choisir un pays d\'abord'}
                      className={`h-8 text-xs ${disabled || !row.code ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(idx)}
                        disabled={disabled}
                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {isLast && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={addRow}
                          disabled={!canAddMore}
                          className="h-7 w-7 text-violet-600 hover:text-violet-800 hover:bg-violet-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                          title="Ajouter un pays"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !disabled && (
              <tr className="border-t border-slate-100">
                <td colSpan={3} className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Ajouter un pays
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
