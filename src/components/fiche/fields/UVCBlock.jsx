import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Bloc multi-mesures pour les emballages (UVC, Élément, Couche, Colis, Palette)
// Champs : unité (int), volume (dec), poids brut (dec), poids net (int), long/larg/haut (mm)
export default function UVCBlock({
  label,
  prefix, // ex: "uvc", "element", "couche", "colis", "palette"
  value = {},
  onChange,
  disabled,
  required,
  crossRef,
}) {
  const set = (subField, v) => {
    onChange?.({ ...value, [subField]: v });
  };

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const cell = (subField, type, sub, suffix) => (
    <div className="space-y-1">
      <Label className="text-[10px] text-slate-500 font-medium">{sub}{suffix && ` (${suffix})`}</Label>
      <Input
        type="number"
        step={type === 'int' ? '1' : '0.001'}
        value={value[subField] ?? ''}
        onChange={(e) => set(subField, type === 'int' ? (e.target.value === '' ? null : parseInt(e.target.value, 10)) : num(e.target.value))}
        disabled={disabled}
        className={`h-8 text-xs ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
      />
    </div>
  );

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-100 px-3 py-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </h4>
        {crossRef && (
          <span className="text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
            {crossRef}
          </span>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 bg-white">
        {cell('unite', 'int', 'Unité')}
        {cell('volume', 'dec', 'Volume', 'm³')}
        {cell('poids_brut', 'dec', 'Poids brut', 'kg')}
        {cell('poids_net', 'int', 'Poids net', 'kg')}
        {cell('long', 'int', 'Long', 'mm')}
        {cell('larg', 'int', 'Larg', 'mm')}
        {cell('haut', 'int', 'Haut', 'mm')}
      </div>
    </div>
  );
}
