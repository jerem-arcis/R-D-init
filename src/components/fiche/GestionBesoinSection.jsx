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

      <FieldGrid title="Approvisionnement & sécurité" cols={3}>
        <SelectField
          label="Profil de couverture"
          value={fiche.profil_couverture}
          onChange={set('profil_couverture')}
          disabled={disabled}
          options={PROFILS_COUVERTURE}
        />
        <TextField
          label="Délai de sécurité (j)"
          type="number"
          value={fiche.delai_securite}
          onChange={set('delai_securite')}
          disabled={disabled}
        />
        <TextField
          label="Délai de sécurité — couverture réelle (j)"
          type="number"
          value={fiche.delai_securite_couv_reelle}
          onChange={set('delai_securite_couv_reelle')}
          disabled={disabled}
        />
        <SelectField
          label="Type d'approvisionnement"
          value={fiche.type_approvisionnement}
          onChange={set('type_approvisionnement')}
          disabled={disabled}
          options={TYPES_APPROVISIONNEMENT}
        />
        <TextField
          label="Délai prévisionnel de livraison (stockiste)"
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
