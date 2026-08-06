import React from 'react';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import { CENTRES_PROFIT, getValueFromDE } from '@/lib/ficheSchema';

// Bandeau d'identification de l'article — remplace l'ancienne section « Contrôle
// Gestion ». Ce ne sont pas des champs métier d'une des 4 sections : ils
// initialisent la fiche (code article, libellés, code chapeau, centre profit,
// dates) et n'ont pas de visa. Éditables tant que l'article n'est pas créé dans
// SAP. Partagé par les 2 vues pour un habillage identique.
export default function IdentificationBanner({ fiche, de, onUpdate, disabled }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="bg-slate-50 border-b border-slate-200 px-5 py-2.5">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Identification du produit
        </h2>
      </header>
      <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <TextField
          label="Code article"
          required
          value={fiche.code_article}
          onChange={set('code_article')}
          disabled={disabled}
          placeholder="ex: 648900000"
        />
        <TextField
          label="Code étude R&D"
          value={fiche.code_etude_rd || getValueFromDE(de, 'code_etude_rd')}
          onChange={set('code_etude_rd')}
          disabled={disabled}
          fromDE
        />
        <SelectField
          label="Centre de profit"
          value={fiche.centre_profit}
          onChange={set('centre_profit')}
          disabled={disabled}
          options={CENTRES_PROFIT}
          fromSAP
        />
        <TextField
          label="Libellé article"
          required
          colSpan={4}
          value={fiche.libelle_article || getValueFromDE(de, 'libelle_article')}
          onChange={set('libelle_article')}
          disabled={disabled}
          fromDE
          placeholder="Désignation produit"
        />
        <TextField
          label="Date de la demande"
          type="date"
          value={fiche.date_demande}
          onChange={set('date_demande')}
          disabled={disabled}
          fromDE
        />
        <TextField
          label="Date limite de création souhaitée"
          type="date"
          value={fiche.date_limite_creation_mm01}
          onChange={set('date_limite_creation_mm01')}
          disabled={disabled}
        />
        <TextField
          label="Date envoi de la fiche"
          type="date"
          value={fiche.date_envoi_ficher}
          onChange={set('date_envoi_ficher')}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
