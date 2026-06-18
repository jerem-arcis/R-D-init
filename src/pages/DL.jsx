import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, Loader2, FileText, Truck,
  Package, Factory, ShoppingCart, ChevronRight,
} from 'lucide-react';
import { getStatutMeta } from '@/lib/deStatus';

// Données de démonstration préremplies lors de l'« import » du fichier DL.
const DL_IMPORT_PRESET = {
  vl: 'VL-2026-0042',
  article_prix: '12,40 €',
  sites_stockage: 'Bonloc / Plateforme Sud',
  dluc_dluo_critique: 21,
  cle_calcul_lot_usine: 'LOT-USINE-A',
  cle_calcul_lot_stockiste: 'LOT-STK-B',
  profil_couverture: 'PC-30',
  delai_securite: 3,
  type_approvisionnement: 'Fabrication interne',
  type_usine: 'Traiteur',
  type_palette: 'Europe 80x120',
  duree_vie: 24,
  unite_duree_vie: 'mois',
  statut_lancement: 'Permanent',
  libelle_long_40: 'Déclinaison logistique standard',
  marque: 'Boncolac',
  secteur_activite: 'GMS',
  canaux_distribution: 'GMS, RHF',
};

const Field = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value !== '' && value != null ? value : '—'}</p>
  </div>
);

const SubSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

function DLDetail({ deId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  const { data: de, isLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const { data: dl } = useQuery({
    queryKey: ['declinaison_logistique', deId],
    queryFn: () => base44.entities.DeclinaisonLogistique.filter({ demande_etude_id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const updateDE = useMutation({
    mutationFn: ({ data }) => base44.entities.DemandeEtude.update(deId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      queryClient.invalidateQueries({ queryKey: ['demande_etude', deId] });
    },
  });

  const upsertDL = useMutation({
    mutationFn: async (data) => {
      if (dl) return base44.entities.DeclinaisonLogistique.update(dl.id, data);
      return base44.entities.DeclinaisonLogistique.create({ demande_etude_id: deId, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['declinaison_logistique', deId] }),
  });

  const createFLMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiches'] }),
  });

  const handleImport = async (file) => {
    if (!file) return;
    await upsertDL.mutateAsync({
      ...DL_IMPORT_PRESET,
      imported_file: file.name,
      date_import: new Date().toISOString(),
      statut: 'en_attente_validation_dl',
    });
    await updateDE.mutateAsync({ data: { statut: 'en_attente_validation_dl' } });
  };

  const handleValider = async () => {
    const designationVal = de.designation_article || de.autre_designation;
    // La validation d'une DL génère la Fiche de Lancement (FL) liée.
    const fl = await createFLMutation.mutateAsync({
      code_article: de.code_chapeau,
      code_chapeau: de.code_chapeau,
      libelle_article: designationVal,
      demande_etude_id: deId,
      declinaison_logistique_id: dl?.id || null,
      etat_global: 'en_attente',
      etape_courante: 1,
    });
    await upsertDL.mutateAsync({
      statut: 'validee',
      date_validation: new Date().toISOString(),
      fiche_lancement_id: fl.id,
    });
    await updateDE.mutateAsync({
      data: {
        statut: 'validee',
        date_validation: new Date().toISOString(),
        fiche_lancement_id: fl.id,
      },
    });
    navigate(createPageUrl('DemandesEtude'));
  };

  const handleRefuser = async () => {
    if (!motifRefus.trim()) { alert('Veuillez saisir un motif de refus'); return; }
    await upsertDL.mutateAsync({ statut: 'refusee', motif_refus: motifRefus, date_refus: new Date().toISOString() });
    await updateDE.mutateAsync({ data: { statut: 'refusee', motif_refus: motifRefus, date_refus: new Date().toISOString() } });
    navigate(createPageUrl('DemandesEtude'));
  };

  const imported = useMemo(
    () => !!dl && (dl.statut === 'en_attente_validation_dl' || dl.statut === 'validee' || dl.statut === 'refusee'),
    [dl]
  );

  if (isLoading || !de) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const designation = de.designation_article || de.autre_designation;
  const isFinal = de.statut === 'validee' || de.statut === 'refusee';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {designation || 'Déclinaison Logistique'}
              </h1>
              <Badge className="bg-violet-100 text-violet-700 border-violet-300 text-[10px] font-bold uppercase tracking-wider">
                DL
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Code chapeau : <span className="font-mono">{de.code_chapeau || '—'}</span> · Statut : {getStatutMeta(de.statut).label}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {!imported ? (
          <div className="bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5 rounded-xl border-2 border-dashed border-violet-500/30 p-8 text-center">
            <Upload className="w-10 h-10 text-violet-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-foreground">Importer le fichier de Déclinaison Logistique</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Importez le fichier (Excel) : les informations type Synthèse FL seront préremplies.
            </p>
            <label
              htmlFor="dl-file"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer bg-violet-600 text-white hover:bg-violet-700 shadow-md"
            >
              <Upload className="w-4 h-4" />
              Importer le fichier
            </label>
            <input
              id="dl-file"
              type="file"
              accept="*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
              className="sr-only"
            />
          </div>
        ) : (
          <>
            {dl?.imported_file && (
              <Alert className="bg-violet-50 border-violet-200">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                <AlertDescription className="text-violet-700">
                  Fichier importé : <strong>{dl.imported_file}</strong>
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubSection title="Contrôle de Gestion" icon={FileText}>
                <Field label="Code chapeau" value={de.code_chapeau} />
                <Field label="Libellé" value={dl?.libelle_long_40} />
                <Field label="VL" value={dl?.vl} />
                <Field label="Article prix" value={dl?.article_prix} />
              </SubSection>
              <SubSection title="Supply Chain" icon={Truck}>
                <Field label="Sites de stockage" value={dl?.sites_stockage} />
                <Field label="DLC/DLUO critique" value={dl?.dluc_dluo_critique && `${dl.dluc_dluo_critique} j`} />
                <Field label="Délai de sécurité" value={dl?.delai_securite && `${dl.delai_securite} j`} />
                <Field label="Type d'approvisionnement" value={dl?.type_approvisionnement} />
              </SubSection>
              <SubSection title="Gestion du besoin" icon={Package}>
                <Field label="Clé calcul lot usine" value={dl?.cle_calcul_lot_usine} />
                <Field label="Clé calcul lot stockiste" value={dl?.cle_calcul_lot_stockiste} />
                <Field label="Profil de couverture" value={dl?.profil_couverture} />
              </SubSection>
              <SubSection title="Industriel" icon={Factory}>
                <Field label="Type d'usine" value={dl?.type_usine} />
                <Field label="Type de palette" value={dl?.type_palette} />
                <Field label="Durée de vie" value={dl?.duree_vie && `${dl.duree_vie} ${dl.unite_duree_vie || ''}`} />
              </SubSection>
              <SubSection title="Commerce" icon={ShoppingCart}>
                <Field label="Statut lancement" value={dl?.statut_lancement} />
                <Field label="Marque" value={dl?.marque} />
                <Field label="Secteur" value={dl?.secteur_activite} />
                <Field label="Canaux" value={dl?.canaux_distribution} />
              </SubSection>
            </div>

            {de.statut === 'refusee' && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">DL refusée — Motif : {de.motif_refus}</AlertDescription>
              </Alert>
            )}

            {!isFinal && !showRefus && (
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRefus(true)} className="border-red-300 text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" /> Refuser
                </Button>
                <Button onClick={handleValider} disabled={updateDE.isPending || createFLMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Valider la DL → FL
                </Button>
              </div>
            )}

            {!isFinal && showRefus && (
              <div className="space-y-3 bg-card rounded-xl border border-border p-5">
                <Label className="text-xs font-semibold text-slate-700">Motif de refus <span className="text-red-500">*</span></Label>
                <Textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} placeholder="Expliquer le refus…" className="min-h-[100px]" />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setShowRefus(false); setMotifRefus(''); }}>Annuler</Button>
                  <Button onClick={handleRefuser} disabled={updateDE.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                    <XCircle className="w-4 h-4 mr-2" /> Confirmer le refus
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------- Liste des DL en cours ----------
const DL_STATUT_BADGE = {
  en_attente_dl: { label: 'En attente de DL', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  en_attente_validation_dl: { label: 'En attente de validation DL', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

function DLList() {
  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });

  const dls = demandes.filter(
    (d) => d.statut === 'en_attente_dl' || d.statut === 'en_attente_validation_dl'
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
                Déclinaisons Logistiques <span className="text-violet-600">(DL)</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">DL en cours de traitement</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : dls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <Package className="w-10 h-10 text-violet-500/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune DL en cours</p>
              <p className="text-sm text-muted-foreground mt-1">Les DL apparaissent ici une fois le code chapeau reçu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b-2 border-violet-500">
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code chapeau</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Demandeur</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dls.map((de) => {
                  const badge = DL_STATUT_BADGE[de.statut] || DL_STATUT_BADGE.en_attente_dl;
                  return (
                    <TableRow key={de.id} className="hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {de.code_chapeau || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {de.designation_article || de.autre_designation || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-foreground/80 text-sm">
                        {de.demandeur || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(`DL?id=${de.id}`)}>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-500/10">
                            <ChevronRight className="w-5 h-5 text-violet-600" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}

// Route "DL" : liste si aucun id, détail sinon.
export default function DL() {
  const [searchParams] = useSearchParams();
  const deId = searchParams.get('id');
  if (!deId) return <DLList />;
  return <DLDetail deId={deId} />;
}
