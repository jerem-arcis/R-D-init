import React from 'react';
import { Factory } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import EmballagesTable from './fields/EmballagesTable';
import {
  MASQUES_ETIQUETTE_COLIS,
  ECLATEMENTS_GROUPE_MARCHANDISE,
  TYPES_USINE,
  TYPES_PALETTE,
  UNITES_DUREE_VIE,
} from '@/lib/ficheSchema';

export default function IndustrielSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

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
    >
      <FieldGrid title="Étiquette colis" cols={3}>
        <TextField
          label="Libellé produit sur étiquette colis"
          value={fiche.libelle_etiquette_colis}
          onChange={set('libelle_etiquette_colis')}
          disabled={disabled}
        />
        <SelectField
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
        <TextField
          label="Format date étiquette colis"
          value={fiche.format_date_etiquette_colis}
          onChange={set('format_date_etiquette_colis')}
          disabled={disabled}
          placeholder="JJ/MM/AAAA"
        />
        <TextField
          label="Format DLUO étiquette colis"
          value={fiche.format_dluo_etiquette_colis}
          onChange={set('format_dluo_etiquette_colis')}
          disabled={disabled}
          placeholder="ex: MM AAAA"
        />
        <TextField
          label="Type de magasin"
          value={fiche.type_magasin}
          onChange={set('type_magasin')}
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
        <SelectField
          label="Type de support / palette"
          value={fiche.type_palette}
          onChange={set('type_palette')}
          disabled={disabled}
          options={TYPES_PALETTE}
        />
        <TextField
          label="Temps de réception (usine, j)"
          type="number"
          value={fiche.temps_reception_usine}
          onChange={set('temps_reception_usine')}
          disabled={disabled}
        />
      </FieldGrid>

      <FieldGrid title="Durée de vie" cols={2}>
        <TextField
          label="Durée de vie"
          type="number"
          value={fiche.duree_vie}
          onChange={set('duree_vie')}
          disabled={disabled}
          crossRef="vu en Commerce"
        />
        <SelectField
          label="Unité durée de vie"
          value={fiche.unite_duree_vie}
          onChange={set('unite_duree_vie')}
          disabled={disabled}
          options={UNITES_DUREE_VIE}
        />
      </FieldGrid>

      <EmballagesTable
        fiche={fiche}
        onUpdate={onUpdate}
        isEditable={() => isEditable}
      />
    </SectionShell>
  );
}
