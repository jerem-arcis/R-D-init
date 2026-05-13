import React from 'react';
import { ShoppingCart } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import MultiSelectField from './fields/MultiSelectField';
import LibelleParPaysTable from './fields/LibelleParPaysTable';
import {
  STATUTS_LANCEMENT,
  FABRICATION_NEGOCE,
  ORIGINES_FABRICATION,
  CANAUX_DISTRIBUTION,
  SECTEURS_ACTIVITE,
  MARQUES,
  NOMENCLATURES_DOUANIERES,
  MENTIONS_PRODUIT,
  UNITES_DUREE_VIE,
} from '@/lib/ficheSchema';

export default function CommerceSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  // Construire les EANs liés depuis les blocs UVC + EANs Supply Chain
  const eanList = [
    { emballage: 'UVC', code: fiche.gtin_uvc },
    { emballage: 'Colis', code: Array.isArray(fiche.ean_carton) ? fiche.ean_carton.join(', ') : fiche.ean_carton },
    { emballage: 'Couche', code: Array.isArray(fiche.ean_couche) ? fiche.ean_couche.join(', ') : fiche.ean_couche },
    { emballage: 'Palette', code: Array.isArray(fiche.ean_palette) ? fiche.ean_palette.join(', ') : fiche.ean_palette },
  ];

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
      <FieldGrid title="Statut & libellés" cols={2}>
        <SelectField
          label="Statut de lancement"
          value={fiche.statut_lancement}
          onChange={set('statut_lancement')}
          disabled={disabled}
          options={STATUTS_LANCEMENT}
        />
        <TextField
          label="Libellé long 40 caractères"
          value={fiche.libelle_long_40}
          onChange={set('libelle_long_40')}
          disabled={disabled}
          maxLength={40}
          placeholder="Libellé français"
        />
        <TextField
          label="Libellé client"
          value={fiche.libelle_client}
          onChange={set('libelle_client')}
          disabled={disabled}
          colSpan={2}
        />
      </FieldGrid>

      <LibelleParPaysTable
        value={fiche.libelle_par_pays}
        onChange={set('libelle_par_pays')}
        disabled={disabled}
      />

      <FieldGrid title="Origine & distribution" cols={2}>
        <SelectField
          label="Fabrication ou négoce"
          value={fiche.fabrication_negoce}
          onChange={set('fabrication_negoce')}
          disabled={disabled}
          options={FABRICATION_NEGOCE}
        />
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
        <SelectField
          label="Mention produit"
          value={fiche.mention_produit}
          onChange={set('mention_produit')}
          disabled={disabled}
          options={MENTIONS_PRODUIT}
        />
      </FieldGrid>

      <FieldGrid title="Durée de vie & douanes" cols={2}>
        <TextField
          label="Durée de vie"
          type="number"
          value={fiche.duree_vie}
          onChange={set('duree_vie')}
          disabled={disabled}
          crossRef="vu en Industriel"
        />
        <SelectField
          label="Unité durée de vie"
          value={fiche.unite_duree_vie}
          onChange={set('unite_duree_vie')}
          disabled={disabled}
          options={UNITES_DUREE_VIE}
          crossRef="vu en Industriel"
        />
        <SelectField
          label="Nomenclature douanière"
          value={fiche.nomenclature_douaniere}
          onChange={set('nomenclature_douaniere')}
          disabled={disabled}
          options={NOMENCLATURES_DOUANIERES}
          fromSAP
        />
        <TextField
          label="BIV (ancien n° article déjà vu)"
          value={fiche.biv}
          onChange={set('biv')}
          disabled={disabled}
        />
      </FieldGrid>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
          GTIN = EAN (1 ligne par emballage)
        </h3>
        <p className="text-xs text-slate-500">
          Lié aux blocs d'emballages côté <span className="font-semibold">Industriel</span> et aux EAN côté <span className="font-semibold">Supply Chain</span>.
        </p>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-32">Emballage</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Code GTIN / EAN</th>
              </tr>
            </thead>
            <tbody>
              {eanList.map((row) => (
                <tr key={row.emballage} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-xs font-medium text-slate-700">{row.emballage}</td>
                  <td className="px-3 py-1.5 text-xs font-mono text-slate-900">{row.code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionShell>
  );
}
