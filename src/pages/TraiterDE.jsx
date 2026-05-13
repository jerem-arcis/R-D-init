import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, FileText, Layers, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Liste des usines (alignée avec CreerDE.autre_usine_fab)
const USINES = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen', 'Produit négoce'];

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [selectedEAN, setSelectedEAN] = useState('');
  const [pickedUsine, setPickedUsine] = useState('');

  const { data: de, isLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  // Résolutions selon le type
  const typeDe = de?.type_de || 'de';
  const isAutre = typeDe === 'autre';
  const designation = isAutre ? de?.autre_designation : de?.designation_article;
  const usineSource = isAutre ? de?.autre_usine_fab : pickedUsine;

  const { data: codesEAN = [], isLoading: isLoadingCodes } = useQuery({
    queryKey: ['codes_ean', usineSource],
    queryFn: async () => {
      const codes = await base44.entities.CodeEAN.filter({
        usine: usineSource,
        disponible: true,
      });
      if (codes.length === 0 && usineSource) {
        const baseCode =
          usineSource === 'Aire' ? '3250390001' :
          usineSource === 'Agen' ? '3250390002' :
          usineSource === 'Bonloc' ? '3250390003' :
          usineSource === 'Rivesaltes' ? '3250390004' :
          '3250390009';
        const nouveauxCodes = [];
        for (let i = 1; i <= 5; i++) {
          const code = `${baseCode}00${i}`;
          const nouveauCode = await base44.entities.CodeEAN.create({
            code,
            usine: usineSource,
            disponible: true,
          });
          nouveauxCodes.push(nouveauCode);
        }
        return nouveauxCodes;
      }
      return codes;
    },
    enabled: !!usineSource,
  });

  useEffect(() => {
    if (codesEAN.length > 0) setSelectedEAN(codesEAN[0].code);
    else setSelectedEAN('');
  }, [codesEAN]);

  const updateDEMutation = useMutation({
    mutationFn: ({ deId, data }) => base44.entities.DemandeEtude.update(deId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      navigate(createPageUrl('DemandesEtude'));
    },
  });

  const updateCodeEANMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CodeEAN.update(id, data),
  });

  const createFLMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.create(data),
  });

  const handleValider = async () => {
    if (!usineSource) {
      alert("Veuillez sélectionner une usine de fabrication");
      return;
    }
    if (!selectedEAN) {
      alert('Veuillez sélectionner un code EAN');
      return;
    }

    const codeChapeau = `${selectedEAN} ${designation || ''}`.trim();
    const codeEANObj = codesEAN.find((c) => c.code === selectedEAN);

    await updateCodeEANMutation.mutateAsync({
      id: codeEANObj.id,
      data: {
        disponible: false,
        date_utilisation: new Date().toISOString(),
        demande_etude_id: deId,
      },
    });

    const ficheFL = await createFLMutation.mutateAsync({
      code_article: codeChapeau,
      libelle_article: designation,
      demande_etude_id: deId,
      etat_global: 'en_attente',
      etape_courante: 1,
    });

    await updateDEMutation.mutateAsync({
      deId,
      data: {
        statut: 'validee',
        code_ean: selectedEAN,
        code_chapeau: codeChapeau,
        usine_validee: usineSource,
        date_validation: new Date().toISOString(),
        fiche_lancement_id: ficheFL.id,
      },
    });
  };

  const handleRefuser = async () => {
    if (!motifRefus.trim()) {
      alert('Veuillez saisir un motif de refus');
      return;
    }
    await updateDEMutation.mutateAsync({
      deId,
      data: {
        statut: 'refusee',
        motif_refus: motifRefus,
        date_refus: new Date().toISOString(),
      },
    });
  };

  if (isLoading || !de) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isReadOnly = de.statut === 'validee' || de.statut === 'refusee';
  const typeBadge = TYPE_BADGE[typeDe] || TYPE_BADGE.de;

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
              <p className="text-sm text-muted-foreground mt-0.5">ID: {deId?.slice(0, 8)}…</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {de.statut === 'validee' && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Demande validée — Code chapeau : <strong>{de.code_chapeau}</strong>
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

        {/* ===== Type DE / DE_DL ===== */}
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
                <ReadField label="Marque" value={de.marque} />
                <ReadField label="Catégorie (Vif)" value={de.categorie} />
                <ReadField label="Date de lancement souhaitée" value={de.date_lancement} />
              </div>
            </FormSection>

            <FormSection title="Logistique & échantillons" icon={Settings2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadField label="Type de logistique" value={de.type_logistique} />
                <ReadField label="Date échantillon" value={de.date_echantillon} />
                <ReadField label="Date mise à dispo client" value={de.date_mise_dispo} />
              </div>
            </FormSection>

            <FormSection title="Caractéristiques physiques">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReadField label="Poids OP" value={de.poids_op} />
                <ReadField label="Poids brut" value={de.poids_brut} />
                <ReadField label="Poids net" value={de.poids_net} />
                <ReadField label="Volume" value={de.volume} />
                <ReadField label="Unité" value={de.unite} />
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

        {/* ===== Panneau de validation ADV ===== */}
        {!isReadOnly && (
          <FormSection title="Décision ADV" icon={CheckCircle2}>
            <div className="space-y-5">
              {!isAutre && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Usine de fabrication <span className="text-red-500">*</span>
                  </Label>
                  <Select value={pickedUsine} onValueChange={setPickedUsine}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sélectionner l'usine qui produira l'article" />
                    </SelectTrigger>
                    <SelectContent>
                      {USINES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {usineSource && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Code EAN pour {usineSource}
                  </Label>
                  {isLoadingCodes ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Chargement des codes EAN…</span>
                    </div>
                  ) : codesEAN.length === 0 ? (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertDescription className="text-amber-700">
                        Aucun code EAN disponible. 5 codes de test ont été créés automatiquement.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs text-slate-600 mb-0.5">Code suggéré</p>
                        <p className="font-bold text-base text-emerald-700 font-mono">{selectedEAN}</p>
                      </div>
                      <Select value={selectedEAN} onValueChange={setSelectedEAN}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {codesEAN.map((c) => (
                            <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              )}

              {selectedEAN && designation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-slate-700 mb-0.5">Code chapeau qui sera généré</p>
                  <p className="font-bold text-base text-primary font-mono">
                    {selectedEAN} {designation}
                  </p>
                </div>
              )}

              {!showRefus ? (
                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowRefus(true)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    onClick={handleValider}
                    disabled={!selectedEAN || !usineSource || updateDEMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Valider et créer FL
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-slate-700">
                    Motif de refus <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={motifRefus}
                    onChange={(e) => setMotifRefus(e.target.value)}
                    placeholder="Expliquer pourquoi cette demande est refusée…"
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRefus(false);
                        setMotifRefus('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleRefuser}
                      disabled={updateDEMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmer le refus
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        )}
      </main>
    </div>
  );
}
