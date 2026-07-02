import React from 'react';
import { Package } from 'lucide-react';
import SectionShell from './fields/SectionShell';
import FieldGrid from './fields/FieldGrid';
import TextField from './fields/TextField';
import SelectField from './fields/SelectField';
import {
  CLES_CALCUL_LOT,
  PROFILS_COUVERTURE,
  TYPES_APPROVISIONNEMENT,
} from '@/lib/ficheSchema';

export default function GestionBesoinSection({ fiche, de, onUpdate, onVisa, onRefus, isLocked, isEditable }) {
  const set = (field) => (value) => onUpdate?.({ [field]: value });
  const disabled = !isEditable;

  return (
    <SectionShell
      id="gestion-besoin"
      title="Gestion du besoin"
      subtitle="Renseigné par l'ADV — service Gestion du besoin"
      icon={Package}
      accentColor="emerald"
      isLocked={isLocked}
      isEditable={isEditable}
      isValidated={fiche.visa_gestion_besoin}
      validatedAt={fiche.visa_gestion_besoin_date}
      isRefused={fiche.refus_gestion_besoin}
      refusedAt={fiche.refus_gestion_besoin_date}
      refusMotif={fiche.refus_gestion_besoin_motif}
      onVisa={onVisa}
      onRefus={onRefus}
      visaLabel="Visa Gestion du besoin"
    >
      <FieldGrid title="Clés de calcul taille de lot" cols={2}>
        <SelectField
          label="Clé de calcul — division usine"
          value={fiche.cle_calcul_lot_usine}
          onChange={set('cle_calcul_lot_usine')}
          disabled={disabled}
          options={CLES_CALCUL_LOT}
          fromSAP
        />
        <SelectField
          label="Clé de calcul — division stockage"
          value={fiche.cle_calcul_lot_stockiste}
          onChange={set('cle_calcul_lot_stockiste')}
          disabled={disabled}
          options={CLES_CALCUL_LOT}
          fromSAP
        />
      </FieldGrid>

      <FieldGrid title="Approvisionnement & sécurité — Usine" cols={3}>
        <SelectField
          label="Profil de couverture (usine)"
          value={fiche.profil_couverture_usine}
          onChange={set('profil_couverture_usine')}
          disabled={disabled}
          options={PROFILS_COUVERTURE}
        />
        <TextField
          label="Délai de sécurité — usine (j)"
          type="number"
          value={fiche.delai_securite_usine}
          onChange={set('delai_securite_usine')}
          disabled={disabled}
        />
        <TextField
          label="Délai sec/couv réelle — usine (j)"
          type="number"
          value={fiche.delai_securite_couv_reelle_usine}
          onChange={set('delai_securite_couv_reelle_usine')}
          disabled={disabled}
        />
        <SelectField
          label="Type d'approvisionnement (usine)"
          value={fiche.type_approvisionnement_usine}
          onChange={set('type_approvisionnement_usine')}
          disabled={disabled}
          options={TYPES_APPROVISIONNEMENT}
        />
      </FieldGrid>

      <FieldGrid title="Approvisionnement & sécurité — Stockiste" cols={3}>
        <SelectField
          label="Profil de couverture (stockiste)"
          value={fiche.profil_couverture_stockiste}
          onChange={set('profil_couverture_stockiste')}
          disabled={disabled}
          options={PROFILS_COUVERTURE}
        />
        <TextField
          label="Délai de sécurité — stockiste (j)"
          type="number"
          value={fiche.delai_securite_stockiste}
          onChange={set('delai_securite_stockiste')}
          disabled={disabled}
        />
        <TextField
          label="Délai sec/couv réelle — stockiste (j)"
          type="number"
          value={fiche.delai_securite_couv_reelle_stockiste}
          onChange={set('delai_securite_couv_reelle_stockiste')}
          disabled={disabled}
        />
        <SelectField
          label="Type d'approvisionnement (stockiste)"
          value={fiche.type_approvisionnement_stockiste}
          onChange={set('type_approvisionnement_stockiste')}
          disabled={disabled}
          options={TYPES_APPROVISIONNEMENT}
        />
        <TextField
          label="Approvisionnement spécial"
          value={fiche.appro_special}
          onChange={set('appro_special')}
          disabled={disabled}
        />
        <TextField
          label="Délai prévisionnel de livraison"
          value={fiche.delai_previsionnel_livraison}
          onChange={set('delai_previsionnel_livraison')}
          disabled={disabled}
          fromSAP
        />
        <TextField
          label="Temps de réception (stockiste)"
          value={fiche.temps_reception_stockiste}
          onChange={set('temps_reception_stockiste')}
          disabled={disabled}
          fromSAP
        />
      </FieldGrid>
    </SectionShell>
  );
}
