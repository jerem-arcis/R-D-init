import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lignes : chaque ligne = un type d'emballage avec sa clé de stockage dans la fiche
const ROWS = [
  { key: 'uvc_block', label: 'UVC — Unité de vente', required: true },
  { key: 'element_block', label: 'Unité d\'élément' },
  { key: 'couche_block', label: 'Couche' },
  { key: 'colis_block', label: 'Colis' },
  { key: 'palette_block', label: 'Palette' },
];

// Colonnes : sous-champ + type (int/dec) + libellé court + suffixe
const COLS = [
  { sub: 'unite', type: 'int', label: 'Unité', suffix: '' },
  { sub: 'volume', type: 'dec', label: 'Volume', suffix: 'm³' },
  { sub: 'poids_brut', type: 'dec', label: 'Poids brut', suffix: 'kg' },
  { sub: 'poids_net', type: 'int', label: 'Poids net', suffix: 'kg' },
  { sub: 'long', type: 'int', label: 'Long', suffix: 'mm' },
  { sub: 'larg', type: 'int', label: 'Larg', suffix: 'mm' },
  { sub: 'haut', type: 'int', label: 'Haut', suffix: 'mm' },
];

const parseValue = (raw, type) => {
  if (raw === '' || raw == null) return null;
  return type === 'int' ? parseInt(raw, 10) : Number(raw);
};

// Tableau unique : 1 ligne par type d'emballage, 7 colonnes (dimensions/poids/volume)
export default function EmballagesTable({
  label = 'Emballages (unité / volume / poids / dimensions)',
  fiche,
  onUpdate,
  isEditable, // (fieldName) => bool
}) {
  const setCell = (rowKey, sub, type, raw) => {
    const block = fiche[rowKey] || {};
    onUpdate?.({ [rowKey]: { ...block, [sub]: parseValue(raw, type) } });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700 sticky left-0 bg-slate-100 z-10 min-w-[180px]">
                Type d'emballage
              </th>
              {COLS.map((c) => (
                <th key={c.sub} className="px-2 py-2 text-center text-[11px] font-semibold text-slate-700 min-w-[90px]">
                  {c.label}
                  {c.suffix && <span className="text-[10px] text-slate-500 font-normal ml-1">({c.suffix})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const editable = isEditable ? isEditable(row.key) : true;
              const block = fiche[row.key] || {};
              return (
                <tr key={row.key} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 sticky left-0 bg-white z-10">
                    {row.label}
                    {row.required && <span className="text-red-500 ml-0.5">*</span>}
                  </td>
                  {COLS.map((c) => (
                    <td key={c.sub} className="px-1.5 py-1.5">
                      <Input
                        type="number"
                        step={c.type === 'int' ? '1' : '0.001'}
                        value={block[c.sub] ?? ''}
                        onChange={(e) => setCell(row.key, c.sub, c.type, e.target.value)}
                        disabled={!editable}
                        className={`h-8 text-xs text-right ${!editable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
