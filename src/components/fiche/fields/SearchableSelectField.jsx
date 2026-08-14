import React from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import FieldShell from './FieldShell';

// Liste déroulante AVEC recherche intégrée, pour les listes longues (groupe
// d'article, groupe de ristournes, nomenclature douanière…). Même API que
// SelectField (label / value / onChange / options) + habillage FieldShell.
export default function SearchableSelectField({
  label,
  value,
  onChange,
  disabled,
  options = [],
  placeholder,
  ...shellProps
}) {
  return (
    <FieldShell label={label} {...shellProps}>
      <SearchableSelect
        value={value || ''}
        onChange={(v) => onChange?.(v)}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        className={disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
      />
    </FieldShell>
  );
}
