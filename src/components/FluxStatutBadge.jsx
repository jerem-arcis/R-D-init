import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { fluxStatut } from '@/lib/erreursSap';

// Badge du statut d'un flux d'envoi SAP (DE ou FL), pour les tableaux récap.
// `value` = valeur brute écrite par le flux Power Automate dans le projet
// (cr04e_fluxenvoiede / cr04e_fluxenvoiefl). On la résout via `fluxStatut`
// (tolérant à la casse / 0-1 / booléen, et idempotent sur « reussi » / « erreur »).
// Vide ou non reconnu -> « — » (jamais envoyé / statut inconnu).
const FLUX_META = {
  reussi: { label: 'Réussi', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  erreur: { label: 'Erreur', cls: 'bg-red-100 text-red-700 border-red-200', Icon: AlertCircle },
};

export default function FluxStatutBadge({ value }) {
  const meta = FLUX_META[fluxStatut(value)];
  if (!meta) return <span className="text-muted-foreground/40 text-sm">—</span>;
  const { label, cls, Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
