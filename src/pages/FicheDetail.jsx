import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import StepProgress from '@/components/fiche/StepProgress';
import ControleGestionSection from '@/components/fiche/ControleGestionSection';
import SupplyChainSection from '@/components/fiche/SupplyChainSection';
import GestionBesoinSection from '@/components/fiche/GestionBesoinSection';
import IndustrielSection from '@/components/fiche/IndustrielSection';
import CommerceSection from '@/components/fiche/CommerceSection';
import FLSynthesisSection from '@/components/fiche/FLSynthesisSection';
import { isSectionLocked, isSectionEditable } from '@/lib/ficheSchema';

// Pose un visa et nettoie le refus correspondant
const visaPatch = (visaField, refusField) => ({
  [visaField]: true,
  [`${visaField}_date`]: new Date().toISOString(),
  [refusField]: false,
  [`${refusField}_motif`]: null,
});

// Pose un refus et nettoie le visa correspondant
const refusPatch = (visaField, refusField, motif) => ({
  [refusField]: true,
  [`${refusField}_motif`]: motif,
  [`${refusField}_date`]: new Date().toISOString(),
  [visaField]: false,
});

export default function FicheDetail() {
  const [searchParams] = useSearchParams();
  const ficheId = searchParams.get('id');

  const [localFiche, setLocalFiche] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['fiche', ficheId],
    queryFn: () => base44.entities.FicheLancement.filter({ id: ficheId }),
    enabled: !!ficheId,
    select: (data) => data[0] || null,
  });

  const { data: de } = useQuery({
    queryKey: ['de-for-fiche', fiche?.demande_etude_id],
    queryFn: () => base44.entities.DemandeEtude.get(fiche.demande_etude_id),
    enabled: !!fiche?.demande_etude_id,
  });

  useEffect(() => {
    if (fiche) setLocalFiche(fiche);
  }, [fiche]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.update(ficheId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });

  const handleUpdate = async (updates) => {
    setLocalFiche((prev) => ({ ...prev, ...updates }));
    setIsSaving(true);
    await updateMutation.mutateAsync(updates);
    setIsSaving(false);
  };

  if (isLoading || !localFiche) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectionHandlers = (sectionKey, visaField, refusField) => ({
    isLocked: isSectionLocked(sectionKey, localFiche),
    isEditable: isSectionEditable(sectionKey, localFiche),
    onUpdate: handleUpdate,
    onVisa: () => handleUpdate(visaPatch(visaField, refusField)),
    onRefus: (motif) => handleUpdate(refusPatch(visaField, refusField, motif)),
  });

  // Étape courante = première section non visée
  const currentStep = !localFiche.visa_controle_gestion
    ? 1
    : !localFiche.visa_supply_chain
    ? 2
    : !localFiche.visa_gestion_besoin
    ? 3
    : !localFiche.visa_industriel
    ? 4
    : !localFiche.visa_commerce
    ? 5
    : localFiche.statut_sap === 'Création SAP effectuée'
    ? 7
    : 6;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Accueil')}>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                  {localFiche.code_article || 'Nouvelle fiche'}
                  {localFiche.libelle_article && ` — ${localFiche.libelle_article}`}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {ficheId?.slice(0, 8)}...
                  {de && <span className="ml-3">DE: {de.code_projet || de.id?.slice(0, 8)}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Save className="w-4 h-4 animate-pulse" />
                  Enregistrement...
                </div>
              )}
              <Link to={createPageUrl(`FicheDetailV2?id=${ficheId}`)}>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Vue V2 (fiche unique) →
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <StepProgress currentStep={currentStep} fiche={localFiche} />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <ControleGestionSection
          fiche={localFiche}
          de={de}
          {...sectionHandlers('controle_gestion', 'visa_controle_gestion', 'refus_controle_gestion')}
        />
        <SupplyChainSection
          fiche={localFiche}
          de={de}
          {...sectionHandlers('supply_chain', 'visa_supply_chain', 'refus_supply_chain')}
        />
        <GestionBesoinSection
          fiche={localFiche}
          de={de}
          {...sectionHandlers('gestion_besoin', 'visa_gestion_besoin', 'refus_gestion_besoin')}
        />
        <IndustrielSection
          fiche={localFiche}
          de={de}
          {...sectionHandlers('industriel', 'visa_industriel', 'refus_industriel')}
        />
        <CommerceSection
          fiche={localFiche}
          de={de}
          {...sectionHandlers('commerce', 'visa_commerce', 'refus_commerce')}
        />
        <FLSynthesisSection fiche={localFiche} />
      </main>
    </div>
  );
}
