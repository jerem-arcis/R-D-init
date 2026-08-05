import React from 'react';
import { Truck } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import SelectField from './fields/SelectField';
import {
  GROUPES_ARTICLE,
  GROUPES_RISTOURNE,
  GROUPES_IMPUTATION,
  GROUPES_STATISTIQUE,
} from '@/lib/ficheSchema';

export default function SupplyChainSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  return (
    <SectionShell
      id="supply-chain"
      title="Supply Chain"
      subtitle="Renseigné par l'ADV — service Supply Chain"
      icon={Truck}
      accentColor="sky"
      isLocked={isLocked}
      isEditable={isEditable}
      isValidated={fiche.visa_supply_chain}
      validatedAt={fiche.visa_supply_chain_date}
      isRefused={fiche.refus_supply_chain}
      refusedAt={fiche.refus_supply_chain_date}
      refusMotif={fiche.refus_supply_chain_motif}
      onVisa={onVisa}
      onRefus={onRefus}
      visaLabel="Visa Supply Chain"
    >
      <FieldGrid title="Groupements OC2" cols={2}>
        <SelectField
          label="OC2 — Groupe statistique article"
          value={fiche.groupe_statistique_article}
          onChange={set('groupe_statistique_article')}
          disabled={disabled}
          options={GROUPES_STATISTIQUE}
          fromSAP
        />
        <SelectField
          label="OC2 — Groupe d'article"
          value={fiche.groupe_article}
          onChange={set('groupe_article')}
          disabled={disabled}
          options={GROUPES_ARTICLE}
          fromSAP
        />
        <SelectField
          label="OC2 — Groupe de ristournes"
          value={fiche.groupe_ristourne}
          onChange={set('groupe_ristourne')}
          disabled={disabled}
          options={GROUPES_RISTOURNE}
          fromSAP
        />
        <SelectField
          label="OC2 — Groupe imputation article"
          value={fiche.groupe_imputation}
          onChange={set('groupe_imputation')}
          disabled={disabled}
          options={GROUPES_IMPUTATION}
          fromSAP
        />
      </FieldGrid>
    </SectionShell>
  );
}
