import React from 'react';
import BufferedInput from './BufferedInput';
import FieldShell from './FieldShell';

// Nombre : '' → null, sinon Number. Appliqué au commit (blur/Entrée) uniquement.
const numberParse = (raw) => (raw === '' ? null : Number(raw));

export default function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  maxLength,
  step,
  ...shellProps
}) {
  const id = label?.replace(/\s+/g, '_').toLowerCase();
  return (
    <FieldShell label={label} htmlFor={id} {...shellProps}>
      <BufferedInput
        id={id}
        type={type}
        value={value}
        onCommit={onChange}
        parse={type === 'number' ? numberParse : undefined}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        step={step}
        className={`h-9 ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
      />
    </FieldShell>
  );
}
