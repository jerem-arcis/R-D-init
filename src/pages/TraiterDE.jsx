import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, FileText, Layers, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStatutMeta } from '@/lib/deStatus';

// Sous-composants
const FormSection = ({ title, icon: Icon, children }) => (
  <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
    <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const ReadField = ({ label, value, mono, span = 1 }) => (
  <div className={`space-y-1.5 ${span === 2 ? 'md:col-span-2' : ''}`}>
    <Label className="text-xs font-semibold text-slate-600">{label}</Label>
    <div className={`px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-800 min-h-[38px] ${mono ? 'font-mono' : ''}`}>
      {value || <span className="text-slate-400 italic text-xs">—</span>}
    </div>
  </div>
);

const TYPE_BADGE = {
  de: { label: 'DE', cls: 'bg-primary/15 text-primary border-primary/30' },
  de_dl: { label: 'DE / DL', cls: 'bg-violet-100 text-violet-700 border-violet-300' },
  autre: { label: 'Autre', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
};

const TYPES_DEMANDE_AUTRE_LABELS = {
  '1': 'Transfert industriel restant dans nos savoir-faire',
  '2': 'Produit semi-fini fabriqué pour une autre usine',
  '3': 'Massification',
  '4': 'Produits extérieurs négoce',
  '5': 'Produits fabriqués par une filiale du groupe',
  '6': 'Changement produit mineur (< 2 %)',
  '7': 'Modification palettisation mineure (< 2 %)',
};

export default function TraiterDE() {
  const [searchParams] = useSearchParams();
  const deId = searchParams.get('id');

  const { data: de, isLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const typeDe = de?.type_de || 'de';
  const isAutre = typeDe === 'autre';

  if (isLoading || !de) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const designation = isAutre ? de.autre_designation : de.designation_article;
  const typeBadge = TYPE_BADGE[typeDe] || TYPE_BADGE.de;
  const codeChapeauVisible =
    de.code_chapeau &&
    ['en_attente_dl', 'en_attente_validation_dl', 'validee'].includes(de.statut);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DemandesEtude')}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                  {designation || "Demande d'Étude"}
                </h1>
                <Badge className={`${typeBadge.cls} text-[10px] font-bold uppercase tracking-wider`}>
                  {typeBadge.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Statut : {getStatutMeta(de.statut).label}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {codeChapeauVisible && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Code chapeau reçu : <strong>{de.code_chapeau}</strong> — statut : {getStatutMeta(de.statut).label}
            </AlertDescription>
          </Alert>
        )}
        {de.statut === 'refusee' && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Demande refusée — Motif : {de.motif_refus}
            </AlertDescription>
          </Alert>
        )}

        {/* ===== Type DE ===== */}
        {!isAutre && (
          <>
            <FormSection title="Informations générales" icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadField label="Code projet" value={de.code_projet} mono />
                <ReadField label="Date de la demande" value={de.date_demande} />
                <ReadField label="Demandeur" value={de.demandeur} />
                <ReadField label="Axe stratégique" value={de.axe_strategique} span={2} />
                <ReadField label="Réseau" value={de.reseau} />
                <ReadField label="Type de la demande" value={de.type_demande_de} span={2} />
              </div>
            </FormSection>

            <FormSection title="Produit" icon={Layers}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadField label="Désignation" value={de.designation_article} span={2} />
                <ReadField label="Famille de produit" value={de.famille_produit} />
                <ReadField label="Secteur d'activité" value={de.marque} />
                <ReadField label="Client" value={de.client} />
                <ReadField label="Poids net" value={de.poids_net} />
                <ReadField label="ZUG" value={de.zug} mono />
              </div>
            </FormSection>

            <FormSection title="Champs SAP" icon={Settings2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadField label="Groupe article" value={de.groupe_article} mono />
                <ReadField label="Division" value={de.division} mono />
                <ReadField label="Classe de valorisation" value={de.classe_valorisation} mono />
                <ReadField label="Centre de profit" value={de.centre_profit} mono />
                <ReadField label="Groupe d'autorisation" value={de.groupe_autorisation} mono />
                <ReadField label="Groupe de frais généraux" value={de.groupe_frais_generaux} mono />
              </div>
            </FormSection>
          </>
        )}

        {/* ===== Type Autre ===== */}
        {isAutre && (
          <>
            <FormSection title="Identification" icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadField label="Demandeur" value={de.autre_demandeur} />
                <ReadField label="Date" value={de.autre_date} />
                <ReadField label="Service" value={de.autre_service} />
                <ReadField
                  label="Type de demande"
                  value={
                    de.autre_type_demande
                      ? `${de.autre_type_demande} — ${TYPES_DEMANDE_AUTRE_LABELS[de.autre_type_demande] || ''}`
                      : ''
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Article d'origine" icon={Layers}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadField label="Code d'article d'origine" value={de.autre_code_origine} mono />
                <ReadField label="Usine de fabrication (origine)" value={de.autre_usine_fab} />
                <ReadField label="Besoin d'une VL" value={de.autre_besoin_vl ? 'Oui' : 'Non'} />
                <ReadField label="Besoin d'un nouveau code" value={de.autre_besoin_nouveau_code ? 'Oui' : 'Non'} />
              </div>
            </FormSection>

            <FormSection title="Nouvel article" icon={Settings2}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadField label="Désignation article" value={de.autre_designation} span={2} />
                <ReadField label="Usine de fabrication finale" value={de.autre_usine_fabrication_libre} />
                <ReadField label="Activité" value={de.autre_activite} />
                <ReadField label="Poids net pour 1 UV (kg)" value={de.autre_poids_net_uv} />
                <ReadField label="Type de marque" value={de.autre_type_marque} />
                {de.autre_usine_fab === 'Agen' && (
                  <ReadField label="Produit (Agen)" value={de.autre_produit_agen} />
                )}
              </div>
            </FormSection>

            <FormSection title="Champs calculés (SAP)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadField label="Code division" value={de.code_division_calc} mono />
                <ReadField label="Classe de valorisation" value={de.classe_valorisation_calc} mono />
                <ReadField label="Centre de profit" value={de.centre_profit_calc} mono />
                <ReadField label="Secteur d'activité" value={de.secteur_activite_calc} mono />
                <ReadField label="Hiérarchie de produits" value={de.autre_hierarchie} span={2} />
              </div>
            </FormSection>
          </>
        )}

        {/* ===== Lien vers la DL ===== */}
        {(de.statut === 'en_attente_dl' || de.statut === 'en_attente_validation_dl') && (
          <div className="flex justify-end">
            <Link to={createPageUrl(`DL?id=${de.id}`)}>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-md">
                Ouvrir la Déclinaison Logistique
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
