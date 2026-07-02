import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Switch entre les 2 vues de la FL : « Vue par service » (sections + visa par
// service) et « Vue complète » (fiche unique consolidée). Contrôle segmenté posé
// dans les 2 en-têtes ; l'onglet actif est mis en avant, l'autre est un lien vers
// l'autre vue (l'id de la fiche est conservé).
const TABS = [
  { key: 'service', label: 'Vue par service', page: 'FicheDetail' },
  { key: 'complete', label: 'Vue complète', page: 'FicheDetailV2' },
];

export default function ViewSwitch({ active, ficheId }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const cls = `px-3 h-7 flex items-center text-xs font-semibold rounded-md transition-colors ${
          isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`;
        return isActive ? (
          <span key={t.key} className={cls} aria-current="page">{t.label}</span>
        ) : (
          <Link key={t.key} to={createPageUrl(`${t.page}?id=${ficheId}`)} className={cls}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
