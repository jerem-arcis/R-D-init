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
  DUREES_VIE,
} from '@/lib/ficheSchema';

export default function IndustrielSection({ fiche, de, onUpdate, onUpdateDebounced, onVisa, onRefus, isLocked, isEditable, visaBlockers }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;
  // Saisie du tableau Emballages : écriture différée (les cellules quittées en
  // rafale sont regroupées en un seul enregistrement au lieu d'un PATCH par cellule).
  const onUpdateTable = onUpdateDebounced || onUpdate;

  return (
    <SectionShell
      id="industriel"
      title="Industriel"
      subtitle="Renseigné par le Site (industriel + commerce + logistique)"
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
          fromSAP
        />
        <SelectField
          label="Type d'usine"
          value={fiche.type_usine}
          onChange={set('type_usine')}
          disabled={disabled}
          options={TYPES_USINE}
          fromSAP
        />
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
          onChange={set('type_palette')}
          disabled={disabled}
          options={TYPES_PALETTE}
        />
      </FieldGrid>

      <EmballagesTable
        fiche={fiche}
        onUpdate={onUpdateTable}
        isEditable={() => isEditable}
      />

      <FieldGrid title="Durée de vie & réception" cols={2}>
        <SelectField
          label="Durée de vie (jours)"
          value={fiche.duree_vie}
          onChange={set('duree_vie')}
          disabled={disabled}
          options={DUREES_VIE}
          crossRef="vu en Commerce"
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
