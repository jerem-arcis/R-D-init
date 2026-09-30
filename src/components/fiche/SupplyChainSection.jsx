import React from 'react';
import { Truck } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import SelectField from './fields/SelectField';
import SearchableSelectField from './fields/SearchableSelectField';
import MultiSelectField from './fields/MultiSelectField';
import {
  GROUPES_ARTICLE,
  GROUPES_RISTOURNE,
  GROUPES_IMPUTATION,
  SITES_STOCKAGE,
  tagHerite,
} from '@/lib/ficheSchema';

export default function SupplyChainSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable, visaBlockers }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  return (
    <SectionShell
      id="supply-chain"
      title="ADV"
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
      visaLabel="Visa ADV"
      visaBlockers={visaBlockers}
    >
      <FieldGrid title="Groupements" cols={2}>
        {/* Groupe statistique article : masqué, toujours « 1 » (demande ADV). */}
        <SearchableSelectField
          label="Groupe d'article"
          value={fiche.groupe_article}
          onChange={set('groupe_article')}
          disabled={disabled}
          options={GROUPES_ARTICLE}
        />
        <SearchableSelectField
          label="Groupe de ristournes"
          value={fiche.groupe_ristourne}
          onChange={set('groupe_ristourne')}
          disabled={disabled}
          options={GROUPES_RISTOURNE}
        />
        {/* Prérempli selon le type de produit de la demande (PFIN → 01, NEGO → 05). */}
        <SelectField
          label="Groupe imputation article"
          value={fiche.groupe_imputation}
          onChange={set('groupe_imputation')}
          disabled={disabled}
          options={GROUPES_IMPUTATION}
          fromDE={tagHerite(fiche, 'groupe_imputation')}
        />
      </FieldGrid>

      <FieldGrid title="Stockage" cols={2}>
        <MultiSelectField
          label="Sites de stockage"
          required
          value={fiche.sites_stockage}
          onChange={set('sites_stockage')}
          disabled={disabled}
          options={SITES_STOCKAGE}
        />
      </FieldGrid>
    </SectionShell>
  );
}
