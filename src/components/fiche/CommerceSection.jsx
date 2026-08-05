import React from 'react';
import { ShoppingCart } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import MultiSelectField from './fields/MultiSelectField';
import LibelleParPaysTable from './fields/LibelleParPaysTable';
import EmballagesTable from './fields/EmballagesTable';
import {
  ORIGINES_FABRICATION,
  CANAUX_DISTRIBUTION,
  SECTEURS_ACTIVITE,
  MARQUES,
  NOMENCLATURES_DOUANIERES,
} from '@/lib/ficheSchema';

export default function CommerceSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  return (
    <SectionShell
      id="commerce"
      title="Commerce"
      subtitle="Renseigné par l'ADV puis validé par le Commerce"
      icon={ShoppingCart}
      accentColor="rose"
      isLocked={isLocked}
      isEditable={isEditable}
      isValidated={fiche.visa_commerce}
      validatedAt={fiche.visa_commerce_date}
      isRefused={fiche.refus_commerce}
      refusedAt={fiche.refus_commerce_date}
      refusMotif={fiche.refus_commerce_motif}
      onVisa={onVisa}
      onRefus={onRefus}
      visaLabel="Visa Commerce"
    >
      <FieldGrid title="Libellés" cols={2}>
        <TextField
          label="Libellé long 40 caractères"
          value={fiche.libelle_long_40}
          onChange={set('libelle_long_40')}
          disabled={disabled}
          maxLength={40}
          placeholder="Libellé français"
        />
        <TextField
          label="Libellé article caisse"
          value={fiche.libelle_caisse}
          onChange={set('libelle_caisse')}
          disabled={disabled}
        />
      </FieldGrid>

      <LibelleParPaysTable
        value={fiche.libelle_par_pays}
        onChange={set('libelle_par_pays')}
        disabled={disabled}
      />

      <FieldGrid title="Origine & distribution" cols={2}>
        <SelectField
          label="Origine de fabrication"
          value={fiche.origine_fabrication}
          onChange={set('origine_fabrication')}
          disabled={disabled}
          options={ORIGINES_FABRICATION}
        />
        <MultiSelectField
          label="Canaux de distribution"
          value={fiche.canaux_distribution}
          onChange={set('canaux_distribution')}
          disabled={disabled}
          options={CANAUX_DISTRIBUTION}
        />
        <SelectField
          label="Secteur d'activité"
          value={fiche.secteur_activite}
          onChange={set('secteur_activite')}
          disabled={disabled}
          options={SECTEURS_ACTIVITE}
        />
        <SelectField
          label="Marque"
          value={fiche.marque}
          onChange={set('marque')}
          disabled={disabled}
          options={MARQUES}
          fromSAP
        />
        <TextField
          label="Hiérarchie produit"
          value={fiche.hierarchie_produit}
          onChange={set('hierarchie_produit')}
          disabled={disabled}
        />
        <SelectField
          label="Nomenclature douanière"
          value={fiche.nomenclature_douaniere}
          onChange={set('nomenclature_douaniere')}
          disabled={disabled}
          options={NOMENCLATURES_DOUANIERES}
          fromSAP
        />
      </FieldGrid>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          Saisie des GTIN — 1 code par emballage. Les dimensions sont renseignées côté{' '}
          <span className="font-semibold">Industriel</span> (lecture seule ici).
        </p>
        <EmballagesTable
          label="Saisie des GTIN (par emballage)"
          fiche={fiche}
          onUpdate={onUpdate}
          isEditable={() => false}
          showGtin
          gtinEditable={isEditable}
        />
      </div>
    </SectionShell>
  );
}
