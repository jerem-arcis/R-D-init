import React from 'react';
import BufferedInput from './BufferedInput';
import FieldShell from './FieldShell';

// Champ « liste déroulante + saisie libre » (datalist natif) : propose des valeurs
// prédéfinies (ex. masques d'étiquette du fichier FM) tout en autorisant un code
// personnalisé absent de la liste. Saisie tamponnée (commit au blur/Entrée).
export default function ComboField({
  label,
  value,
  onChange,
  disabled,
  options = [],
  placeholder = 'Sélectionner ou saisir un code…',
  ...shellProps
}) {
  const id = label?.replace(/\s+/g, '_').toLowerCase();
  const listId = `${id}__options`;
  return (
    <FieldShell label={label} htmlFor={id} {...shellProps}>
      <BufferedInput
        id={id}
        list={listId}
        value={value}
        onCommit={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`h-9 ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
      />
      <datalist id={listId}>
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          return <option key={v} value={v} />;
        })}
      </datalist>
    </FieldShell>
  );
}
