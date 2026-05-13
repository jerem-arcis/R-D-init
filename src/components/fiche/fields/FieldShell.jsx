import React from 'react';
import { Label } from '@/components/ui/label';
import { Database, Link2, AlertTriangle, Lock, Check } from 'lucide-react';

const OWNER_CHIP_STYLES = {
  cg: 'bg-violet-50 text-violet-700 border-violet-200',
  sc: 'bg-sky-50 text-sky-700 border-sky-200',
  gb: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ind: 'bg-amber-50 text-amber-700 border-amber-200',
  com: 'bg-rose-50 text-rose-700 border-rose-200',
};

// Wrapper standard d'un champ : label + badges (DE, croisé, SAP, warning) + contenu
export default function FieldShell({
  label,
  htmlFor,
  required,
  fromDE,
  crossRef,
  fromSAP,
  warning,
  highlight,
  owner,
  ownerLabel,
  fieldState, // 'editable' | 'validated' | 'future'
  children,
  className = '',
  colSpan = 1,
}) {
  const colClass = colSpan === 2 ? 'md:col-span-2' : colSpan === 3 ? 'md:col-span-3' : colSpan === 4 ? 'md:col-span-4' : '';
  const stateBg = fieldState === 'future'
    ? 'opacity-50'
    : fieldState === 'validated'
    ? ''
    : '';
  return (
    <div className={`space-y-1.5 ${colClass} ${className} ${stateBg}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Label htmlFor={htmlFor} className={`text-xs font-semibold ${highlight ? 'bg-amber-100 px-2 py-0.5 rounded text-amber-900' : 'text-slate-700'}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {owner && (
          <span
            className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${OWNER_CHIP_STYLES[owner] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
            title={ownerLabel}
          >
            {fieldState === 'validated' && <Check className="w-2.5 h-2.5" />}
            {fieldState === 'future' && <Lock className="w-2.5 h-2.5" />}
            {owner.toUpperCase()}
          </span>
        )}
        {fromDE && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
            <Database className="w-2.5 h-2.5" />
            depuis DE
          </span>
        )}
        {crossRef && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
            <Link2 className="w-2.5 h-2.5" />
            {crossRef}
          </span>
        )}
        {fromSAP && (
          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            SAP
          </span>
        )}
      </div>
      {children}
      {warning && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
