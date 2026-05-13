import React from 'react';
import { Truck } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import MultiSelectField from './fields/MultiSelectField';
import EANField from './fields/EANField';
import {
  GROUPES_STATISTIQUE_ARTICLE,
  GROUPES_ARTICLE,
  GROUPES_RISTOURNE,
  GROUPES_IMPUTATION,
  SITES_STOCKAGE,
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
      <FieldGrid title="Identification logistique" cols={4}>
        <TextField
          label="VL"
          value={fiche.vl}
          onChange={set('vl')}
          disabled={disabled}
          maxLength={2}
          placeholder="2 digits"
        />
        <TextField
          label="Article prix"
          value={fiche.article_prix}
          onChange={set('article_prix')}
          disabled={disabled}
          placeholder="Code article + 0..."
        />
        <TextField
          label="Ancien numéro article"
          value={fiche.ancien_numero_article}
          onChange={set('ancien_numero_article')}
          disabled={disabled}
        />
        <TextField
          label="DLC/DLUO critique"
          type="number"
          value={fiche.dluc_dluo_critique}
          onChange={set('dluc_dluo_critique')}
          disabled={disabled}
          placeholder="Durée min. restante (j)"
        />
      </FieldGrid>

      <FieldGrid title="Compteur GTIN" cols={3}>
        <EANField
          label="EAN carton"
          value={fiche.ean_carton}
          onChange={set('ean_carton')}
          disabled={disabled}
        />
        <EANField
          label="EAN couche"
          value={fiche.ean_couche}
          onChange={set('ean_couche')}
          disabled={disabled}
        />
        <EANField
          label="EAN palette"
          value={fiche.ean_palette}
          onChange={set('ean_palette')}
          disabled={disabled}
        />
      </FieldGrid>

      <FieldGrid title="Groupements SAP" cols={2}>
        <SelectField
          label="Groupe statistique article"
          value={fiche.groupe_statistique_article}
          onChange={set('groupe_statistique_article')}
          disabled={disabled}
          options={GROUPES_STATISTIQUE_ARTICLE}
          fromSAP
        />
        <SelectField
          label="Groupe article"
          value={fiche.groupe_article}
          onChange={set('groupe_article')}
          disabled={disabled}
          options={GROUPES_ARTICLE}
          fromSAP
        />
        <SelectField
          label="Groupe de ristourne"
          value={fiche.groupe_ristourne}
          onChange={set('groupe_ristourne')}
          disabled={disabled}
          options={GROUPES_RISTOURNE}
          fromSAP
        />
        <SelectField
          label="Groupe d'imputation"
          value={fiche.groupe_imputation}
          onChange={set('groupe_imputation')}
          disabled={disabled}
          options={GROUPES_IMPUTATION}
          fromSAP
        />
      </FieldGrid>

      <FieldGrid title="Stockage" cols={1}>
        <MultiSelectField
          label="Sites de stockage"
          required
          value={fiche.sites_stockage}
          onChange={set('sites_stockage')}
          disabled={disabled}
          options={SITES_STOCKAGE}
          fromSAP
        />
      </FieldGrid>
    </SectionShell>
  );
}
