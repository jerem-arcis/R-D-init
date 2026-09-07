import React from 'react';
import { ShoppingCart } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import SearchableSelectField from './fields/SearchableSelectField';
import MultiSelectField from './fields/MultiSelectField';
import LibelleParPaysTable from './fields/LibelleParPaysTable';
import EmballagesTable from './fields/EmballagesTable';
import {
  SECTEURS_ACTIVITE,
  MARQUES,
  NOMENCLATURES_DOUANIERES,
  SITES_STOCKAGE,
} from '@/lib/ficheSchema';
import { useSapOptions } from '@/lib/sapLists';
import { DE_DIVISION_CODES } from '@/lib/deRules';
import { buildOptions, useAdminOptions } from '@/lib/adminLists';

export default function CommerceSection({ fiche, de, onUpdate, onUpdateDebounced, onVisa, onRefus, isLocked, isEditable, visaBlockers }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  // Écriture différée (canaux / sites de stockage) : affichage instantané des
  // coches, un seul enregistrement réseau après le dernier clic. Repli sur onUpdate
  // si le parent ne fournit pas de version débouncée.
  const setDebounced = (field) => (value) =>
    (onUpdateDebounced || onUpdate)?.({ [field]: value });
  const disabled = !isEditable;

  // Origine de fabrication : liste dynamique des divisions/usines (Dataverse),
  // restreinte aux sites de fabrication — identique à « Division (Usine) » de la DE.
  const sap = useSapOptions();
  const origineFabOptions = buildOptions(
    (sap.divisions || []).filter((o) => DE_DIVISION_CODES.includes(String(o.value))),
    fiche.origine_fabrication,
  );

  // Canaux de distribution : options « code - désignation » issues de la catégorie
  // custom « canaux_distrib » gérée dans l'Admin (option-set cr04e_optionsetcodeapps).
  const canauxOptions = buildOptions(useAdminOptions().canaux_distrib);

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
      visaBlockers={visaBlockers}
    >
      {/* Ordre aligné sur la capture FL « Commerce » : libellé long + origine +
          canaux + secteur/marque en tête, puis libellés normalisés & langues,
          puis hiérarchie / douane / sites de stockage, puis GTIN. */}
      <FieldGrid title="Classification & distribution" cols={2}>
        <TextField
          label="Libellé long 40 caractères"
          value={fiche.libelle_long_40}
          onChange={set('libelle_long_40')}
          disabled={disabled}
          maxLength={40}
          placeholder="Libellé français"
        />
        <SelectField
          label="Origine de fabrication"
          value={fiche.origine_fabrication}
          onChange={set('origine_fabrication')}
          disabled={disabled}
          options={origineFabOptions}
          fromSAP
        />
        <MultiSelectField
          label="Canaux de distribution"
          value={fiche.canaux_distribution}
          onChange={setDebounced('canaux_distribution')}
          disabled={disabled}
          options={canauxOptions}
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
      </FieldGrid>

      <FieldGrid title="Libellés normalisés" cols={2}>
        <TextField
          label="Désign. normalisée"
          maxLength={18}
          value={fiche.design_normalisee}
          onChange={set('design_normalisee')}
          disabled={disabled}
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

      <FieldGrid title="Hiérarchie, douane & stockage" cols={2}>
        <TextField
          label="Hiérarchie produit"
          value={fiche.hierarchie_produit}
          onChange={set('hierarchie_produit')}
          disabled={disabled}
        />
        <SearchableSelectField
          label="Nomenclature douanière"
          value={fiche.nomenclature_douaniere}
          onChange={set('nomenclature_douaniere')}
          disabled={disabled}
          options={NOMENCLATURES_DOUANIERES}
          fromSAP
        />
        <MultiSelectField
          label="Sites de stockage"
          required
          value={fiche.sites_stockage}
          onChange={setDebounced('sites_stockage')}
          disabled={disabled}
          options={SITES_STOCKAGE}
          fromSAP
        />
      </FieldGrid>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          Saisie des GTIN - 1 code par emballage. Les dimensions sont renseignées côté{' '}
          <span className="font-semibold">Industriel</span> (lecture seule ici).
        </p>
        <EmballagesTable
          label="Saisie des GTIN (par emballage)"
          fiche={fiche}
          onUpdate={onUpdateDebounced || onUpdate}
          isEditable={() => false}
          showGtin
          gtinEditable={isEditable}
        />
      </div>
    </SectionShell>
  );
}
