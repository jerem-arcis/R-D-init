import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Barcode } from 'lucide-react';
import { buildGtinSet } from '@/lib/ean';
import BufferedInput from './BufferedInput';

// Lignes : chaque ligne = un type d'emballage avec sa clé de stockage dans la fiche.
// `gtinKey` = niveau correspondant dans buildGtinSet (calcul depuis le code article).
const ROWS = [
  { key: 'uvc_block', label: 'UVC - Unité de vente', required: true, gtinKey: 'uvc' },
  // U.élém : côté SAP l'unité « UE » ne porte QU'un compteur (nb d'éléments par
  // UVC). Aucun poids / volume / dimension n'y est stocké → ces colonnes sont
  // grisées (une saisie ne serait pas persistée). Cf. emballagesSap.js (ligne UE).
  { key: 'element_block', label: 'Unité d\'élément', gtinKey: 'element', dimsNA: true },
  { key: 'couche_block', label: 'Couche', gtinKey: 'couche' },
  { key: 'colis_block', label: 'Colis', gtinKey: 'colis' },
  { key: 'palette_block', label: 'Palette', gtinKey: 'palette' },
];

// Colonnes : sous-champ + type (int/dec) + libellé court + suffixe
const COLS = [
  { sub: 'unite', type: 'int', label: 'Unité', suffix: '' },
  { sub: 'volume', type: 'dec', label: 'Volume', suffix: 'm³' },
  { sub: 'poids_brut', type: 'dec', label: 'Poids brut', suffix: 'kg' },
  { sub: 'poids_net', type: 'dec', label: 'Poids net', suffix: 'kg' },
  { sub: 'long', type: 'int', label: 'Long', suffix: 'mm' },
  { sub: 'larg', type: 'int', label: 'Larg', suffix: 'mm' },
  { sub: 'haut', type: 'int', label: 'Haut', suffix: 'mm' },
];

const parseValue = (raw, type) => {
  if (raw === '' || raw == null) return null;
  return type === 'int' ? parseInt(raw, 10) : Number(raw);
};

// Tableau unique : 1 ligne par type d'emballage, 7 colonnes (dimensions/poids/volume),
// + colonne GTIN/EAN optionnelle (saisie Commerce, stockée dans `block.gtin`).
export default function EmballagesTable({
  label = 'Emballages (unité / volume / poids / dimensions)',
  fiche,
  onUpdate,
  isEditable,        // (fieldName) => bool — éditabilité des cellules dimensions
  showGtin = false,  // affiche la colonne GTIN / EAN
  gtinEditable = false, // éditabilité des cellules GTIN
}) {
  const setCell = (rowKey, sub, type, raw) => {
    const block = fiche[rowKey] || {};
    onUpdate?.({ [rowKey]: { ...block, [sub]: parseValue(raw, type) } });
  };

  const setGtin = (rowKey, raw) => {
    const block = fiche[rowKey] || {};
    onUpdate?.({ [rowKey]: { ...block, gtin: raw === '' ? null : raw } });
  };

  // GTIN calculés depuis le code article, règle du fichier FM (feuille EAN) —
  // même dérivation que les EAN de la DE, étendue à l'UVC et à l'unité d'élément.
  const gtins = buildGtinSet(fiche.code_article, { origine: fiche.origine_fabrication });
  const manquants = ROWS.filter((r) => gtins[r.gtinKey] && !(fiche[r.key] || {}).gtin);

  // Ne remplit QUE les cellules vides : une saisie manuelle n'est jamais écrasée.
  const genererManquants = () => {
    const patch = {};
    for (const r of manquants) {
      patch[r.key] = { ...(fiche[r.key] || {}), gtin: gtins[r.gtinKey] };
    }
    if (Object.keys(patch).length) onUpdate?.(patch);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-semibold text-slate-700">{label}</Label>
        {showGtin && gtinEditable && manquants.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={genererManquants}
            className="h-7 gap-1.5 text-xs"
          >
            <Barcode className="w-3.5 h-3.5" />
            Générer les {manquants.length} GTIN manquants
          </Button>
        )}
      </div>
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
              {showGtin && (
                <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-700 min-w-[150px]">
                  GTIN / EAN
                </th>
              )}
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
                  {COLS.map((c) => {
                    // U.élém : seul le compteur « unité » s'applique ; les colonnes
                    // dimensions/poids/volume ne sont pas gérées par SAP → grisées.
                    const dimNA = row.dimsNA && c.sub !== 'unite';
                    const cellEditable = editable && !dimNA;
                    return (
                      <td key={c.sub} className="px-1.5 py-1.5">
                        <BufferedInput
                          type="number"
                          step={c.type === 'int' ? '1' : '0.001'}
                          value={dimNA ? '' : (block[c.sub] ?? '')}
                          onCommit={(raw) => setCell(row.key, c.sub, c.type, raw)}
                          disabled={!cellEditable}
                          title={dimNA ? "Non géré par SAP pour l'unité d'élément" : undefined}
                          className={`h-8 text-xs text-right ${
                            dimNA
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : !cellEditable
                              ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
                              : ''
                          }`}
                        />
                      </td>
                    );
                  })}
                  {showGtin && (
                    <td className="px-1.5 py-1.5">
                      <BufferedInput
                        type="text"
                        inputMode="numeric"
                        maxLength={14}
                        // Le GTIN calculé sert de repère avant génération.
                        placeholder={gtins[row.gtinKey] || 'EAN'}
                        value={block.gtin ?? ''}
                        onCommit={(raw) => setGtin(row.key, raw)}
                        disabled={!gtinEditable}
                        className={`h-8 text-xs font-mono ${!gtinEditable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
