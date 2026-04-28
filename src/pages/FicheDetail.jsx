import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import StepProgress from '@/components/fiche/StepProgress';
import TabNavigation from '@/components/fiche/TabNavigation';
import ControleGestionTab from '@/components/fiche/ControleGestionTab';
import SupplyChainTab from '@/components/fiche/SupplyChainTab';
import GestionBesoinTab from '@/components/fiche/GestionBesoinTab';
import IndustrielTab from '@/components/fiche/IndustrielTab';
import CommerceTab from '@/components/fiche/CommerceTab';
import FLTab from '@/components/fiche/FLTab';
import ImprimableTab from '@/components/fiche/ImprimableTab';

export default function FicheDetail() {
  const [searchParams] = useSearchParams();
  const ficheId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('controle_gestion');
  const [localFiche, setLocalFiche] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['fiche', ficheId],
    queryFn: () => base44.entities.FicheLancement.filter({ id: ficheId }),
    enabled: !!ficheId,
    select: (data) => data[0] || null,
  });

  useEffect(() => {
    if (fiche) {
      setLocalFiche(fiche);
    }
  }, [fiche]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.update(ficheId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });

  const handleUpdate = async (updates) => {
    setLocalFiche(prev => ({ ...prev, ...updates }));
    setIsSaving(true);
    await updateMutation.mutateAsync(updates);
    setIsSaving(false);
  };

  const handleVisaControleGestion = async () => {
    await handleUpdate({
      visa_controle_gestion: true,
      visa_controle_gestion_date: new Date().toISOString(),
      refus_controle_gestion: false,
      refus_controle_gestion_motif: null
    });
  };

  const handleRefusControleGestion = async (motif) => {
    await handleUpdate({
      refus_controle_gestion: true,
      refus_controle_gestion_motif: motif,
      refus_controle_gestion_date: new Date().toISOString(),
      visa_controle_gestion: false
    });
  };

  const handleVisaSupplyChain = async () => {
    await handleUpdate({
      visa_supply_chain: true,
      visa_supply_chain_date: new Date().toISOString(),
      refus_supply_chain: false,
      refus_supply_chain_motif: null
    });
  };

  const handleRefusSupplyChain = async (motif) => {
    await handleUpdate({
      refus_supply_chain: true,
      refus_supply_chain_motif: motif,
      refus_supply_chain_date: new Date().toISOString(),
      visa_supply_chain: false
    });
  };

  const handleVisaGestionBesoin = async () => {
    await handleUpdate({
      visa_gestion_besoin: true,
      visa_gestion_besoin_date: new Date().toISOString(),
      refus_gestion_besoin: false,
      refus_gestion_besoin_motif: null
    });
  };

  const handleRefusGestionBesoin = async (motif) => {
    await handleUpdate({
      refus_gestion_besoin: true,
      refus_gestion_besoin_motif: motif,
      refus_gestion_besoin_date: new Date().toISOString(),
      visa_gestion_besoin: false
    });
  };

  const handleVisaIndustriel = async () => {
    await handleUpdate({
      visa_industriel: true,
      visa_industriel_date: new Date().toISOString(),
      refus_industriel: false,
      refus_industriel_motif: null
    });
  };

  const handleRefusIndustriel = async (motif) => {
    await handleUpdate({
      refus_industriel: true,
      refus_industriel_motif: motif,
      refus_industriel_date: new Date().toISOString(),
      visa_industriel: false
    });
  };

  const handleVisaCommerce = async () => {
    await handleUpdate({
      visa_commerce: true,
      visa_commerce_date: new Date().toISOString(),
      refus_commerce: false,
      refus_commerce_motif: null
    });
  };

  const handleRefusCommerce = async (motif) => {
    await handleUpdate({
      refus_commerce: true,
      refus_commerce_motif: motif,
      refus_commerce_date: new Date().toISOString(),
      visa_commerce: false
    });
  };

  if (isLoading || !localFiche) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStep = localFiche.etape_courante || 1;

  const isTabEditable = (tabStep) => {
    return tabStep === currentStep;
  };

  const isTabAccessible = (tabStep) => {
    // L'onglet Industriel (étape 4) n'est accessible qu'après l'étape 3
    if (tabStep === 4) {
      return currentStep >= 4;
    }
    return tabStep <= currentStep;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'controle_gestion':
        return (
          <ControleGestionTab
            fiche={localFiche}
            onUpdate={handleUpdate}
            onVisa={handleVisaControleGestion}
            onRefus={handleRefusControleGestion}
            isReadOnly={localFiche.visa_controle_gestion}
          />
        );
      case 'supply_chain':
        return (
          <SupplyChainTab
            fiche={localFiche}
            onUpdate={handleUpdate}
            onVisa={handleVisaSupplyChain}
            onRefus={handleRefusSupplyChain}
            isReadOnly={localFiche.visa_supply_chain}
          />
        );
      case 'gestion_besoin':
        return (
          <GestionBesoinTab
            fiche={localFiche}
            onUpdate={handleUpdate}
            onVisa={handleVisaGestionBesoin}
            onRefus={handleRefusGestionBesoin}
            isReadOnly={localFiche.visa_gestion_besoin}
          />
        );
      case 'industriel':
        return (
          <IndustrielTab
            fiche={localFiche}
            onUpdate={handleUpdate}
            onVisa={handleVisaIndustriel}
            onRefus={handleRefusIndustriel}
            isReadOnly={localFiche.visa_industriel}
          />
        );
      case 'commerce':
        return (
          <CommerceTab
            fiche={localFiche}
            onUpdate={handleUpdate}
            onVisa={handleVisaCommerce}
            onRefus={handleRefusCommerce}
            isReadOnly={localFiche.visa_commerce}
          />
        );
      case 'fl':
        return <FLTab fiche={localFiche} />;
      case 'imprimable':
        return <ImprimableTab fiche={localFiche} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
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
                <p className="text-sm text-muted-foreground mt-0.5">ID: {ficheId?.slice(0, 8)}...</p>
              </div>
            </div>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Save className="w-4 h-4 animate-pulse" />
                Enregistrement...
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Step Progress */}
      <StepProgress currentStep={currentStep} fiche={localFiche} />

      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentStep={currentStep}
      />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-card rounded-xl border border-border shadow-md p-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}