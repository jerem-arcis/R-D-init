import React from 'react';
import { FileText } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import { CENTRES_PROFIT, getValueFromDE } from '@/lib/ficheSchema';

export default function ControleGestionSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  return (
    <SectionShell
      id="controle-gestion"
      title="Contrôle de Gestion"
      subtitle="Renseigné par l'ADV"
      icon={FileText}
      accentColor="violet"
      isLocked={isLocked}
      isEditable={isEditable}
      isValidated={fiche.visa_controle_gestion}
      validatedAt={fiche.visa_controle_gestion_date}
      isRefused={fiche.refus_controle_gestion}
      refusedAt={fiche.refus_controle_gestion_date}
      refusMotif={fiche.refus_controle_gestion_motif}
      onVisa={onVisa}
      onRefus={onRefus}
      visaLabel="Visa Contrôle de Gestion"
    >
      <FieldGrid cols={2}>
        <TextField
          label="Code article"
          required
          value={fiche.code_article}
          onChange={set('code_article')}
          disabled={disabled}
          placeholder="ex: 648900000"
        />
        <TextField
          label="Code chapeau"
          value={fiche.code_chapeau}
          onChange={set('code_chapeau')}
          disabled={disabled}
        />
        <TextField
          label="Libellé article"
          required
          value={fiche.libelle_article || getValueFromDE(de, 'libelle_article')}
          onChange={set('libelle_article')}
          disabled={disabled}
          fromDE
          colSpan={2}
          placeholder="Désignation produit"
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
      </FieldGrid>
    </SectionShell>
  );
}
