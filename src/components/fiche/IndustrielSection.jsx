import React from 'react';
import { Factory } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import ComboField from './fields/ComboField';
import EmballagesTable from './fields/EmballagesTable';
import {
  MASQUES_ETIQUETTE_COLIS,
  FORMATS_DATE_ETIQUETTE,
  TEMPS_RECEPTION_USINE,
  ECLATEMENTS_GROUPE_MARCHANDISE,
  TYPES_USINE,
  TYPES_PALETTE,
  TYPES_MAGASIN_EM,
  UNITES_DUREE_VIE,
  tagHerite,
  libelleDemande,
  isFicheNegoce,
} from '@/lib/ficheSchema';
import { computeVolumeM3, paletteDimsFromType } from '@/lib/emballagesCalc';

export default function IndustrielSection({ fiche, de, onUpdate, onUpdateDebounced, onVisa, onRefus, isLocked, isEditable, visaBlockers }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  // Type de palette : renseigne aussi les dimensions au sol (long/larg) des blocs
  // couche & palette, déduites du libellé (« … 80 x 120 … »), comme dans l'onglet
  // Industriel du fichier FM. Le volume de ces blocs est recalculé au passage.
  const setTypePalette = (value) => {
    const dims = paletteDimsFromType(value);
    const patch = { type_palette: value };
    if (dims) {
      for (const key of ['couche_block', 'palette_block']) {
        const bloc = { ...(fiche[key] || {}), long: dims.long, larg: dims.larg };
        bloc.volume = computeVolumeM3(bloc);
        patch[key] = bloc;
      }
    }
    onUpdate?.(patch);
  };
  // Saisie du tableau Emballages : écriture différée (les cellules quittées en
  // rafale sont regroupées en un seul enregistrement au lieu d'un PATCH par cellule).
  const onUpdateTable = onUpdateDebounced || onUpdate;

  return (
    <SectionShell
      id="industriel"
      title="Industriel"
      icon={Factory}
      accentColor="amber"
      isLocked={isLocked}
      isEditable={isEditable}
      isValidated={fiche.visa_industriel}
      validatedAt={fiche.visa_industriel_date}
      isRefused={fiche.refus_industriel}
      refusedAt={fiche.refus_industriel_date}
      refusMotif={fiche.refus_industriel_motif}
      onVisa={onVisa}
      onRefus={onRefus}
      visaLabel="Visa Industriel"
      visaBlockers={visaBlockers}
    >
      {/* Ordre aligné sur la capture FL « Industriel » : étiquette colis →
          éclatement/usine/ancien/palette → tableau emballages → durée de vie &
          réception → formats d'étiquette & type de magasin. */}
      <FieldGrid title="Étiquette colis" cols={3}>
        <TextField
          label="Libellé produit sur étiquette colis"
          value={fiche.libelle_etiquette_colis}
          onChange={set('libelle_etiquette_colis')}
          disabled={disabled}
        />
        <ComboField
          label="Masque de l'étiquette colis"
          value={fiche.masque_etiquette_colis}
          onChange={set('masque_etiquette_colis')}
          disabled={disabled}
          options={MASQUES_ETIQUETTE_COLIS}
        />
        <TextField
          label="Désignation client sur colis"
          value={fiche.designation_client_colis}
          onChange={set('designation_client_colis')}
          disabled={disabled}
        />
      </FieldGrid>

      <FieldGrid title="Industriel & logistique" cols={3}>
        <SelectField
          label="Éclatement groupe de marchandise"
          value={fiche.eclatement_groupe_marchandise}
          onChange={set('eclatement_groupe_marchandise')}
          disabled={disabled}
          options={ECLATEMENTS_GROUPE_MARCHANDISE}
        />
        {/* Prérempli avec le profil de fabrication répétitive de la demande. Masqué
            pour les produits négoce : la FL n'a pas de type d'usine (règle atelier). */}
        {!isFicheNegoce(fiche) && (
          <SelectField
            label="Type d'usine"
            value={fiche.type_usine}
            onChange={set('type_usine')}
            disabled={disabled}
            options={TYPES_USINE}
            fromDE={tagHerite(fiche, 'type_usine')}
          />
        )}
        {/* MARA-BISMT / ProductOldID : n° de l'article remplacé, saisie libre. */}
        <TextField
          label="Ancien n° article"
          value={fiche.ancien_numero_article}
          onChange={set('ancien_numero_article')}
          disabled={disabled}
        />
        <SelectField
          label="Type de support / palette"
          value={fiche.type_palette}
          onChange={setTypePalette}
          disabled={disabled}
          options={TYPES_PALETTE}
        />
      </FieldGrid>

      {fiche.herite?.uvc_block && (
        <p className="text-[11px] text-violet-700">
          Poids net UVC repris {libelleDemande(fiche)}.
        </p>
      )}
      <EmballagesTable
        fiche={fiche}
        onUpdate={onUpdateTable}
        isEditable={() => isEditable}
      />

      <FieldGrid title="Durée de vie & réception" cols={3}>
        <TextField
          label="Durée de vie"
          type="number"
          value={fiche.duree_vie}
          onChange={set('duree_vie')}
          disabled={disabled}
        />
        <SelectField
          label="Unité durée de vie"
          value={fiche.unite_duree_vie}
          onChange={set('unite_duree_vie')}
          disabled={disabled}
          options={UNITES_DUREE_VIE}
        />
        <SelectField
          label="Temps de réception (usine, j)"
          value={fiche.temps_reception_usine}
          onChange={set('temps_reception_usine')}
          disabled={disabled}
          options={TEMPS_RECEPTION_USINE}
        />
      </FieldGrid>

      <FieldGrid title="Étiquette : formats & magasin" cols={3}>
        <SelectField
          label="Format date étiquette colis"
          value={fiche.format_date_etiquette_colis}
          onChange={set('format_date_etiquette_colis')}
          disabled={disabled}
          options={FORMATS_DATE_ETIQUETTE}
        />
        <SelectField
          label="Format DLUO étiquette colis"
          value={fiche.format_dluo_etiquette_colis}
          onChange={set('format_dluo_etiquette_colis')}
          disabled={disabled}
          options={FORMATS_DATE_ETIQUETTE}
        />
        <SelectField
          label="Type de magasin EM"
          value={fiche.type_magasin}
          onChange={set('type_magasin')}
          disabled={disabled}
          options={TYPES_MAGASIN_EM}
        />
      </FieldGrid>
    </SectionShell>
  );
}
