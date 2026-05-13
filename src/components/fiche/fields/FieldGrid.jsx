import React from 'react';

// Grille standard 4 colonnes responsive pour les champs d'une sous-section
export default function FieldGrid({ title, children, cols = 4 }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }[cols];
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols} gap-4`}>{children}</div>
    </div>
  );
}
