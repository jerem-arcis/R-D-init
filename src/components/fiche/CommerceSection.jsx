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
  MARQUES,
  NOMENCLATURES_DOUANIERES,
  hierarchieActivite,
  libelleDemande,
  tagHerite,
  optionsSecteur,
  avecLibelleFr,
} from '@/lib/ficheSchema';
import { useSapOptions } from '@/lib/sapLists';
import { DE_DIVISION_CODES } from '@/lib/deRules';
import { buildOptions, useAdminOptions } from '@/lib/adminLists';

export default function CommerceSection({ fiche, de, onUpdate, onUpdateDebounced, onVisa, onRefus, isLocked, isEditable, visaBlockers }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
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
  const adminOptions = useAdminOptions();
  const canauxOptions = buildOptions(adminOptions.canaux_distrib);

  // Secteur d'activité : même colonne ET même liste Admin que la DE/DS, qui y
  // stockent le code (« 15 »). Options indexées par code : le « 15 » de la demande
  // présélectionne le vrai choix « 15 - Marques Distrib. » de la liste.
  const secteurOptions = optionsSecteur(adminOptions.secteurs_activite, fiche.secteur_activite);

  // Hiérarchie produit : liste déroulante du référentiel SAP (familles_produit),
  // FILTRÉE sur le code activité (2 premiers chiffres) de la valeur héritée de la
  // DE — « 27 DE DE » -> uniquement les familles 27…. Champ vide (activité inconnue)
  // -> liste complète. La valeur courante est toujours conservée dans les options.
  const activiteHierarchie = hierarchieActivite(fiche.hierarchie_produit);
  const hierarchieOptions = buildOptions(
    (sap.familles_produit || []).filter(
      (o) => !activiteHierarchie || String(o.value).startsWith(activiteHierarchie),
    ),
    fiche.hierarchie_produit,
  );

  return (
    <SectionShell
      id="commerce"
      title="Commerce"
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
      {/* Ordre aligné sur la capture FL « Commerce » : origine +
          canaux + secteur/marque en tête, puis libellés normalisés & langues,
          puis hiérarchie / douane / sites de stockage, puis GTIN. */}
      <FieldGrid title="Classification & distribution" cols={2}>
        <SelectField
          label="Origine de fabrication"
          value={fiche.origine_fabrication}
          onChange={set('origine_fabrication')}
          disabled={disabled}
          options={origineFabOptions}
          fromSAP
          fromDE={tagHerite(fiche, 'origine_fabrication')}
        />
        <MultiSelectField
          label="Canaux de distribution"
          value={fiche.canaux_distribution}
          onChange={set('canaux_distribution')}
          disabled={disabled}
          options={canauxOptions}
        />
        <SelectField
          label="Secteur d'activité"
          value={fiche.secteur_activite}
          onChange={set('secteur_activite')}
          disabled={disabled}
          options={secteurOptions}
          fromDE={fiche.secteur_activite ? libelleDemande(fiche) : undefined}
        />
        <SelectField
          label="Marque"
          value={fiche.marque}
          onChange={set('marque')}
          disabled={disabled}
          options={MARQUES}
        />
      </FieldGrid>

      <FieldGrid title="Libellés normalisés" cols={2}>
        <TextField
          label="Désignation article SAP"
          maxLength={18}
          value={fiche.design_normalisee}
          onChange={set('design_normalisee')}
          disabled={disabled}
        />
        <TextField
          label="Libellé article caisse"
          value={fiche.libelle_caisse}
          onChange={(v) => onUpdate?.(avecLibelleFr(fiche, { libelle_caisse: v }))}
          disabled={disabled}
        />
      </FieldGrid>

      <LibelleParPaysTable
        value={fiche.libelle_par_pays}
        onChange={set('libelle_par_pays')}
        disabled={disabled}
      />

      <FieldGrid title="Hiérarchie & douane" cols={2}>
        <SearchableSelectField
          label="Hiérarchie produit"
          value={fiche.hierarchie_produit}
          onChange={set('hierarchie_produit')}
          disabled={disabled}
          options={hierarchieOptions}
          fromSAP
          fromDE={fiche.hierarchie_produit ? libelleDemande(fiche) : undefined}
        />
        <SearchableSelectField
          label="Nomenclature douanière"
          value={fiche.nomenclature_douaniere}
          onChange={set('nomenclature_douaniere')}
          disabled={disabled}
          options={NOMENCLATURES_DOUANIERES}
        />
      </FieldGrid>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          Saisie des GTIN - 1 code par emballage. Les dimensions sont renseignées côté{' '}
          <span className="font-semibold">Industriel</span> (lecture seule ici).
        </p>
        {['colis_block', 'couche_block', 'palette_block'].some((k) => fiche.herite?.[k]) && (
          <p className="text-[11px] text-violet-700">
            GTIN colis / couche / palette repris {libelleDemande(fiche)}.
          </p>
        )}
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
