import React, { useState, useEffect, useRef } from 'react';
import { getFicheById, updateFiche, patchHeritage } from '@/api/fiche';
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
import { isSectionLocked, isSectionEditable, getMissingVisaFields } from '@/lib/ficheSchema';
import { FL_SECTIONS } from '@/lib/deepLinkRoutes';
import { useFichePerimetre } from '@/lib/useFichePerimetre';
import AccesRefuse from '@/components/AccesRefuse';

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
  const section = searchParams.get('section');

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

  // Édition débouncée (canaux, sites de stockage, tableau Emballages) :
  // accumulateur d'updates non encore enregistrées + état « sauvegarde en vol ».
  // Tant que l'un des deux est actif, on NE resynchronise PAS depuis le serveur
  // (un refetch en retard ferait « sauter » des coches ou des cellules saisies).
  const pendingRef = useRef(null);
  const savingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (fiche && pendingRef.current === null && !savingRef.current) {
      setLocalFiche(fiche);
    }
  }, [fiche]);

  // Nettoyage : annule un enregistrement programmé si le composant est démonté.
  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  // Lien profond ?section= : scrolle sur la bonne section une fois la fiche chargée.
  useEffect(() => {
    if (!localFiche || !FL_SECTIONS.includes(section)) return;
    const el = document.getElementById(`section-${section}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-primary', 'rounded-lg');
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary', 'rounded-lg');
    }, 2000);
    return () => clearTimeout(t);
  }, [localFiche, section]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateFiche(ficheId, data, { sapOptions: sap }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
    // Échec d'écriture : on relit la fiche pour que l'affichage revienne à l'état
    // réel de la base (l'affichage optimiste mentirait sinon, ex. un canal décoché
    // à l'écran mais toujours présent en base).
    onError: () => queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] }),
  });

  const handleUpdate = async (updates) => {
    setLocalFiche((prev) => ({ ...prev, ...updates }));
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(updates);
    } catch (err) {
      console.error('[FL enregistrement]', err);
      toast({ variant: 'destructive', title: 'Enregistrement échoué', description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistre les updates accumulées. Les saisies rapprochées (coches de canaux,
  // cellules du tableau Emballages quittées en rafale) se regroupent en UN seul
  // updateFiche au lieu d'un aller-retour réseau par valeur.
  const flushPending = async () => {
    timerRef.current = null;
    const updates = pendingRef.current;
    pendingRef.current = null;
    if (!updates) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(updates);
    } catch (err) {
      console.error('[FL enregistrement différé]', err);
      toast({ variant: 'destructive', title: 'Enregistrement échoué', description: err?.message });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Maj locale INSTANTANÉE (affichage immédiat), écriture différée ~500 ms après la
  // dernière saisie. Utilisé par les multi-selects et le tableau Emballages.
  const handleUpdateDebounced = (updates) => {
    setLocalFiche((prev) => ({ ...prev, ...updates }));
    pendingRef.current = { ...(pendingRef.current || {}), ...updates };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushPending, 500);
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

  // Périmètre société : accès au dossier + droit de modifier/viser chaque bloc.
  const { accesAutorise, droits, peutViser, peutModifierUnBloc, deblocageAdmin } = useFichePerimetre(localFiche);

  if (isLoading || !localFiche) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!accesAutorise) return <AccesRefuse />;

  const sectionHandlers = (sectionKey, visaField, refusField, owner) => ({
    isLocked: isSectionLocked(sectionKey, localFiche),
    // Hors de son métier, la section reste visible mais en lecture seule (sans visa).
    // Fiche en erreur d'envoi SAP : l'admin corrige tous les champs, même visés.
    isEditable: droits[owner] &&
      (deblocageAdmin ? localFiche.statut_sap !== 'Création SAP effectuée' : isSectionEditable(sectionKey, localFiche)),
    onUpdate: handleUpdate,
    onUpdateDebounced: handleUpdateDebounced,
    // Les valeurs reprises de la DE/DS partent avec le visa (le flux SAP relit Dataverse).
    onVisa: () => handleUpdate({ ...patchHeritage(localFiche, owner), ...visaPatch(visaField, refusField) }),
    onRefus: (motif) => handleUpdate(refusPatch(visaField, refusField, motif)),
    // Champs vides qui bloquent le visa de la section (tableau Emballages exempté).
    visaBlockers: getMissingVisaFields(localFiche, owner),
  });

  const isLocked = localFiche.statut_sap === 'Création SAP effectuée';

  // Visa requis pour l'export / l'envoi SAP : les 3 sections doivent être visées.
  const allVisaDone =
    localFiche.visa_supply_chain &&
    localFiche.visa_industriel &&
    localFiche.visa_commerce;

  // Champs manquants par section (pour la barre de visas de l'en-tête). Clés
  // alignées sur VisaToolbar (supply_chain / industriel / commerce → sc / ind / com).
  const visaBlockers = {
    supply_chain: getMissingVisaFields(localFiche, 'sc'),
    industriel: getMissingVisaFields(localFiche, 'ind'),
    commerce: getMissingVisaFields(localFiche, 'com'),
  };

  // Barre de visas (cases à cocher) commune aux 2 vues — 4 sections, écriture
  // simultanée, pas de cheminement.
  const visaHandlers = {
    supply_chain: () => handleUpdate({ ...patchHeritage(localFiche, 'sc'), ...visaPatch('visa_supply_chain', 'refus_supply_chain') }),
    industriel: () => handleUpdate({ ...patchHeritage(localFiche, 'ind'), ...visaPatch('visa_industriel', 'refus_industriel') }),
    commerce: () => handleUpdate({ ...patchHeritage(localFiche, 'com'), ...visaPatch('visa_commerce', 'refus_commerce') }),
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
                  {localFiche.libelle_article && ` - ${localFiche.libelle_article}`}
                </h1>
                {localFiche.code_etude_rd && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    DE: {localFiche.code_etude_rd}
                  </p>
                )}
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
                disabled={isExporting || !allVisaDone}
                title={!allVisaDone ? 'Export possible une fois les 3 visas signés' : undefined}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
              blockers={visaBlockers}
              peutViser={peutViser}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <IdentificationBanner fiche={localFiche} de={null} onUpdate={handleUpdate} disabled={isLocked || !peutModifierUnBloc} />
        <div id="section-supply_chain" className="scroll-mt-28">
          <SupplyChainSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('supply_chain', 'visa_supply_chain', 'refus_supply_chain', 'sc')}
          />
        </div>
        <div id="section-industriel" className="scroll-mt-28">
          <IndustrielSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('industriel', 'visa_industriel', 'refus_industriel', 'ind')}
          />
        </div>
        <div id="section-commerce" className="scroll-mt-28">
          <CommerceSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('commerce', 'visa_commerce', 'refus_commerce', 'com')}
          />
        </div>
        <div id="section-synthese" className="scroll-mt-28">
          <FLSynthesisSection fiche={localFiche} />
        </div>
      </main>
    </div>
  );
}
