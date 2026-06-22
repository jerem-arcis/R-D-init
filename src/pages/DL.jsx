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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, Loader2, FileText,
  Package, ChevronRight,
} from 'lucide-react';
import { getStatutMeta } from '@/lib/deStatus';
import { parseDLFile } from '@/lib/parseDL';

function DLDetail({ deId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declinaison_logistique', deId] });
      queryClient.invalidateQueries({ queryKey: ['declinaisons'] });
    },
  });

  const createFLMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fiches'] }),
  });

  const handleImport = async (file) => {
    if (!file) return;
    setImportError('');
    setImporting(true);
    try {
      // Lecture réelle du fichier Excel : on extrait les lignes (colonne G) et
      // leurs valeurs DL (colonne I) de l'onglet « Fiche Demande ».
      const { champs, fichier } = await parseDLFile(file);
      await upsertDL.mutateAsync({
        champs_dl: champs,
        imported_file: fichier,
        date_import: new Date().toISOString(),
        statut: 'en_attente_dl',
      });
      await updateDE.mutateAsync({ data: { statut: 'en_attente_dl' } });
    } catch (err) {
      setImportError(err?.message || "Impossible de lire ce fichier. Vérifiez qu'il s'agit bien du fichier de Demande d'Étude (.xlsm/.xlsx).");
    } finally {
      setImporting(false);
    }
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
    // Le refus porte sur la DL uniquement : la DE reste « validée » (sa partie
    // est terminée). L'historique du refus vit sur l'enregistrement DL.
    await upsertDL.mutateAsync({ statut: 'refusee', motif_refus: motifRefus, date_refus: new Date().toISOString() });
    navigate(createPageUrl('DL'));
  };

  const handleEnvoyerValidation = async () => {
    // Passage de l'étape « En attente de DL » à « En attente de validation DL ».
    // DL et DE basculent ensemble vers la phase de validation.
    await upsertDL.mutateAsync({
      statut: 'en_attente_validation_dl',
      date_envoi_validation: new Date().toISOString(),
    });
    await updateDE.mutateAsync({ data: { statut: 'en_attente_validation_dl' } });
  };

  const imported = useMemo(
    () => !!dl?.imported_file,
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
  // L'état final de la DL est porté par l'enregistrement DL, pas par la DE.
  const dlStatut = dl?.statut || de.statut;
  const isFinal = dlStatut === 'validee' || dlStatut === 'refusee';

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
              Code chapeau : <span className="font-mono">{de.code_chapeau || '—'}</span> · Statut DL : {getStatutMeta(dlStatut).label}
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
              Importez le fichier Excel de la Demande d'Étude : les lignes de l'onglet « Fiche Demande » et leurs valeurs DL seront extraites.
            </p>
            <label
              htmlFor="dl-file"
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-bold uppercase tracking-wide shadow-md ${importing ? 'bg-violet-300 text-white cursor-wait' : 'bg-violet-600 text-white hover:bg-violet-700 cursor-pointer'}`}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Lecture du fichier…' : 'Importer le fichier'}
            </label>
            <input
              id="dl-file"
              type="file"
              accept=".xlsm,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
              disabled={importing}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
              className="sr-only"
            />
            {importError && (
              <Alert className="bg-red-50 border-red-200 mt-4 text-left">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">{importError}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <>
            {dl?.imported_file && (
              <Alert className="bg-violet-50 border-violet-200">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                <AlertDescription className="text-violet-700 flex items-center gap-3 flex-wrap">
                  <span>Fichier importé : <strong>{dl.imported_file}</strong></span>
                  {!isFinal && (
                    <>
                      <label
                        htmlFor="dl-file-change"
                        className={`ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold border ${importing ? 'border-violet-200 text-violet-300 cursor-wait' : 'border-violet-300 text-violet-700 hover:bg-violet-100 cursor-pointer'}`}
                      >
                        {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {importing ? 'Lecture…' : 'Changer le fichier'}
                      </label>
                      <input
                        id="dl-file-change"
                        type="file"
                        accept=".xlsm,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                        disabled={importing}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
                        className="sr-only"
                      />
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {importError && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">{importError}</AlertDescription>
              </Alert>
            )}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700 text-sm">
                  Champs extraits — onglet « Fiche Demande »
                </h3>
                <span className="ml-auto text-xs text-slate-400">{dl?.champs_dl?.length || 0} lignes</span>
              </div>
              {dl?.champs_dl?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary">
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Ligne</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide text-right w-32">Valeur DE</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide text-right w-32">Valeur DL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dl.champs_dl.map((c, idx) => (
                      <TableRow key={idx} className="border-b border-border">
                        <TableCell className="text-sm text-slate-700">{c.ligne}</TableCell>
                        <TableCell className="text-sm text-right text-slate-500 font-mono">{c.de !== '' ? c.de : '—'}</TableCell>
                        <TableCell className="text-sm text-right font-mono font-semibold text-slate-900">{c.dl !== '' ? c.dl : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">Aucune ligne extraite du fichier.</p>
              )}
            </div>

            {dlStatut === 'refusee' && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">DL refusée — Motif : {dl?.motif_refus}</AlertDescription>
              </Alert>
            )}

            {!isFinal && !showRefus && dlStatut === 'en_attente_dl' && (
              <div className="flex flex-wrap justify-end gap-3">
                <Button onClick={handleEnvoyerValidation} disabled={upsertDL.isPending || updateDE.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Envoyer en validation
                </Button>
              </div>
            )}

            {!isFinal && !showRefus && dlStatut === 'en_attente_validation_dl' && (
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

// ---------- Liste des DL ----------
const DL_STATUT_BADGE = {
  en_attente_dl: { label: 'En attente de DL', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  en_attente_validation_dl: { label: 'En attente de validation DL', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  validee: { label: 'Validée', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  refusee: { label: 'Refusée', cls: 'bg-red-100 text-red-700 border-red-200' },
};
// Ordre d'affichage : DL en cours en premier, finalisées ensuite.
const DL_ORDRE = { en_attente_dl: 0, en_attente_validation_dl: 1, validee: 2, refusee: 3 };

function DLList() {
  const [motifDL, setMotifDL] = useState(null);

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });
  const { data: declinaisons = [] } = useQuery({
    queryKey: ['declinaisons'],
    queryFn: () => base44.entities.DeclinaisonLogistique.list('-created_date'),
  });

  // L'état d'une DL est porté par son enregistrement DeclinaisonLogistique.
  // On liste : chaque DL (en cours / validée / refusée) + les DE passées en
  // phase DL dont le fichier n'est pas encore importé (« En attente de DL »).
  const rows = useMemo(() => {
    const deById = new Map(demandes.map((d) => [d.id, d]));
    const dlByDeId = new Map(declinaisons.map((dl) => [dl.demande_etude_id, dl]));
    const out = [];
    declinaisons.forEach((dl) => {
      const de = deById.get(dl.demande_etude_id);
      if (de) out.push({ key: `dl-${dl.id}`, de, dl, statut: dl.statut });
    });
    demandes.forEach((de) => {
      if (de.statut === 'en_attente_dl' && !dlByDeId.has(de.id)) {
        out.push({ key: `de-${de.id}`, de, dl: null, statut: 'en_attente_dl' });
      }
    });
    return out.sort((a, b) => (DL_ORDRE[a.statut] ?? 9) - (DL_ORDRE[b.statut] ?? 9));
  }, [demandes, declinaisons]);

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
              <p className="text-sm text-muted-foreground mt-0.5">DL en cours et finalisées</p>
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
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <Package className="w-10 h-10 text-violet-500/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune DL</p>
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
                {rows.map(({ key, de, dl, statut }) => {
                  const badge = DL_STATUT_BADGE[statut] || DL_STATUT_BADGE.en_attente_dl;
                  const estRefusee = statut === 'refusee';
                  return (
                    <TableRow key={key} className="hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border">
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
                        {estRefusee ? (
                          <button
                            type="button"
                            onClick={() => setMotifDL({ de, dl })}
                            className="inline-flex items-center gap-1 group/badge"
                            title="Voir le motif du refus"
                          >
                            <Badge className={`${badge.cls} group-hover/badge:brightness-95`}>{badge.label}</Badge>
                            <span className="text-[11px] text-red-500 underline underline-offset-2">voir le motif</span>
                          </button>
                        ) : (
                          <Badge className={badge.cls}>{badge.label}</Badge>
                        )}
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

      <Dialog open={!!motifDL} onOpenChange={(o) => !o && setMotifDL(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" /> DL refusée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {motifDL?.de?.designation_article || motifDL?.de?.autre_designation || 'Déclinaison Logistique'}
              {motifDL?.de?.code_chapeau && <> · <span className="font-mono">{motifDL.de.code_chapeau}</span></>}
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-red-600 mb-1">Motif du refus</p>
              <p className="text-sm text-red-800 whitespace-pre-wrap">
                {motifDL?.dl?.motif_refus || 'Aucun motif renseigné.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
