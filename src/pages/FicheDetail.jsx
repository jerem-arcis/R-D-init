import React, { useState, useEffect } from 'react';
import { getFicheById, updateFiche } from '@/api/fiche';
import { useSapOptions } from '@/lib/sapLists';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateFichePdf } from '@/lib/generateFichePdf';

import IdentificationBanner from '@/components/fiche/IdentificationBanner';
import VisaToolbar from '@/components/fiche/VisaToolbar';
import SupplyChainSection from '@/components/fiche/SupplyChainSection';
import IndustrielSection from '@/components/fiche/IndustrielSection';
import CommerceSection from '@/components/fiche/CommerceSection';
import FLSynthesisSection from '@/components/fiche/FLSynthesisSection';
import ViewSwitch from '@/components/fiche/ViewSwitch';
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
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['fiche', ficheId],
    queryFn: () => getFicheById(ficheId),
    enabled: !!ficheId,
  });

  // Référentiels SAP : résolution des lookups (centre profit, hiérarchie) à l'écriture.
  const sap = useSapOptions();

  useEffect(() => {
    if (fiche) setLocalFiche(fiche);
  }, [fiche]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateFiche(ficheId, data, { sapOptions: sap }),
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

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await generateFichePdf(localFiche, null);
    } catch (err) {
      console.error('[export PDF]', err);
      toast({ variant: 'destructive', title: 'Échec de la génération du PDF' });
    } finally {
      setIsExporting(false);
    }
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

  const isLocked = localFiche.statut_sap === 'Création SAP effectuée';

  // Barre de visas (cases à cocher) commune aux 2 vues — 4 sections, écriture
  // simultanée, pas de cheminement.
  const visaHandlers = {
    supply_chain: () => handleUpdate(visaPatch('visa_supply_chain', 'refus_supply_chain')),
    industriel: () => handleUpdate(visaPatch('visa_industriel', 'refus_industriel')),
    commerce: () => handleUpdate(visaPatch('visa_commerce', 'refus_commerce')),
  };
  const refusHandlers = {
    supply_chain: (m) => handleUpdate(refusPatch('visa_supply_chain', 'refus_supply_chain', m)),
    industriel: (m) => handleUpdate(refusPatch('visa_industriel', 'refus_industriel', m)),
    commerce: (m) => handleUpdate(refusPatch('visa_commerce', 'refus_commerce', m)),
  };

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
                  {localFiche.code_etude_rd && <span className="ml-3">DE: {localFiche.code_etude_rd}</span>}
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {isExporting ? 'Génération…' : 'Exporter PDF'}
              </Button>
              <ViewSwitch active="service" ficheId={ficheId} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <VisaToolbar
              fiche={localFiche}
              onVisaHandlers={visaHandlers}
              onRefusHandlers={refusHandlers}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <IdentificationBanner fiche={localFiche} de={null} onUpdate={handleUpdate} disabled={isLocked} />
        <SupplyChainSection
          fiche={localFiche}
          de={null}
          {...sectionHandlers('supply_chain', 'visa_supply_chain', 'refus_supply_chain')}
        />
        <IndustrielSection
          fiche={localFiche}
          de={null}
          {...sectionHandlers('industriel', 'visa_industriel', 'refus_industriel')}
        />
        <CommerceSection
          fiche={localFiche}
          de={null}
          {...sectionHandlers('commerce', 'visa_commerce', 'refus_commerce')}
        />
        <FLSynthesisSection fiche={localFiche} />
      </main>
    </div>
  );
}
