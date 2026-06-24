import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { listProjets } from '@/api/projet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, Loader2, FileText,
  Package, ChevronRight, Clock, Search, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
    navigate(createPageUrl('DL'));
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
                {designation || 'Demande de Lancement'}
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
            <h2 className="text-base font-bold text-foreground">Importer le fichier de Demande de Lancement</h2>
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

// Onglets de la liste DL (par statut).
const DL_TABS = ['en_attente_dl', 'en_attente_validation_dl', 'validee', 'refusee'];

const normalize = (v) =>
  (v ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function DLList({ initialCode = '' }) {
  const navigate = useNavigate();
  const [motifDL, setMotifDL] = useState(null);
  const [filter, setFilter] = useState('toutes');
  const [search, setSearch] = useState(initialCode);

  // Liste branchée sur Dataverse : les projets en phase DL (statut en_attente_dl).
  const { data: projets = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
  });
  // DL locales (localStorage) : portent l'avancement DL (import, validation,
  // refus) et l'id local nécessaire au détail. Jointes au projet par code chapeau.
  const { data: declinaisons = [] } = useQuery({
    queryKey: ['declinaisons'],
    queryFn: () => base44.entities.DeclinaisonLogistique.list('-created_date'),
  });
  const { data: localDEs = [] } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });

  // L'état d'une DL est porté par son enregistrement DeclinaisonLogistique local.
  // On part des projets « en attente de DL » (Dataverse) et on y rattache la DL
  // locale + l'id local via le code chapeau, quand ils existent dans ce navigateur.
  const rows = useMemo(() => {
    const localDEById = new Map(localDEs.map((d) => [d.id, d]));
    const localIdByChapeau = new Map();
    const localIdByProjetId = new Map();
    const dlByChapeau = new Map();
    localDEs.forEach((d) => {
      if (d.code_chapeau) localIdByChapeau.set(d.code_chapeau, d.id);
      if (d.projet_id) localIdByProjetId.set(d.projet_id, d.id);
    });
    declinaisons.forEach((dl) => {
      const de = localDEById.get(dl.demande_etude_id);
      if (de?.code_chapeau) dlByChapeau.set(de.code_chapeau, dl);
    });

    const out = projets
      .filter((p) => p.statut === 'en_attente_dl')
      .map((p) => {
        const dl = p.code_chapeau ? dlByChapeau.get(p.code_chapeau) || null : null;
        const localId =
          localIdByProjetId.get(p.id) ||
          (p.code_chapeau ? localIdByChapeau.get(p.code_chapeau) || null : null);
        return {
          key: `projet-${p.id}`,
          de: p,
          dl,
          localId,
          statut: dl?.statut || 'en_attente_dl',
        };
      });
    return out.sort((a, b) => (DL_ORDRE[a.statut] ?? 9) - (DL_ORDRE[b.statut] ?? 9));
  }, [projets, declinaisons, localDEs]);

  const count = (statut) => rows.filter((r) => r.statut === statut).length;

  // Lien profond : si le code chapeau du mail correspond à exactement une demande
  // présente (localStorage), on ouvre directement son détail DL.
  const codeNorm = normalize(initialCode.trim());
  useEffect(() => {
    if (!codeNorm || isLoading) return;
    const matches = rows.filter((r) => normalize(r.de.code_chapeau) === codeNorm);
    // Ouverture directe du détail seulement si la DL locale existe (id local) ;
    // sinon on reste sur la liste filtrée/surlignée.
    if (matches.length === 1 && matches[0].localId) {
      navigate(createPageUrl(`DL?id=${matches[0].localId}`), { replace: true });
    }
  }, [codeNorm, isLoading, rows, navigate]);

  const searchTerm = normalize(search.trim());
  const filteredRows = rows.filter(({ de, statut }) => {
    if (filter !== 'toutes' && statut !== filter) return false;
    if (searchTerm) {
      const haystack = [
        de.code_chapeau,
        de.designation_article || de.autre_designation,
        de.demandeur || de.autre_demandeur,
      ]
        .map(normalize)
        .join(' ');
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-card rounded-xl shadow-sm ring-1 ring-border">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69383b6842c6c81a3e8e96d2/22582b55d_boncolac.jpeg"
                alt="Boncolac"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">
                Demandes de Lancement <span className="text-violet-600">(DL)</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gestion des demandes de lancement</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-card border border-border flex-wrap h-auto">
              {DL_TABS.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-violet-600 data-[state=active]:text-white uppercase text-xs font-semibold tracking-wide"
                >
                  {DL_STATUT_BADGE[key].label}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="toutes"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white uppercase text-xs font-semibold tracking-wide"
              >
                Toutes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-violet-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('en_attente_dl')}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">En attente de DL</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('en_attente_validation_dl')}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Attente validation DL</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('validee')}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Validées</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('refusee')}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Refusées</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-card rounded-xl border border-border shadow-sm p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code chapeau, désignation, demandeur…"
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <Package className="w-10 h-10 text-violet-500/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune demande de lancement</p>
              <p className="text-sm text-muted-foreground mt-1">Aucune DL ne correspond à ce filtre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b-2 border-violet-500">
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code chapeau</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Demandeur</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ key, de, dl, statut, localId }) => {
                  const badge = DL_STATUT_BADGE[statut] || DL_STATUT_BADGE.en_attente_dl;
                  const estRefusee = statut === 'refusee';
                  const dateRef = dl?.date_import || de.created_date;
                  const isMatch = codeNorm && normalize(de.code_chapeau) === codeNorm;
                  return (
                    <TableRow key={key} className={`hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border ${isMatch ? 'bg-violet-50 ring-2 ring-inset ring-violet-400' : ''}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {de.code_chapeau || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {de.designation_article || de.autre_designation || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-foreground/80 text-sm">
                        {de.demandeur || de.autre_demandeur || <span className="text-muted-foreground/50">—</span>}
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
                      <TableCell className="text-sm text-muted-foreground">
                        {dateRef ? format(new Date(dateRef), 'dd MMM yyyy', { locale: fr }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(localId ? `DL?id=${localId}` : `DL?code_chapeau=${encodeURIComponent(de.code_chapeau || '')}`)}>
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
              {motifDL?.de?.designation_article || motifDL?.de?.autre_designation || 'Demande de Lancement'}
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

// Route "DL" : détail si ?id, sinon liste. ?code_chapeau (lien profond e-mail)
// pré-remplit la recherche et surligne / ouvre la demande correspondante.
export default function DL() {
  const [searchParams] = useSearchParams();
  const deId = searchParams.get('id');
  const codeChapeau = searchParams.get('code_chapeau') || '';
  if (!deId) return <DLList initialCode={codeChapeau} />;
  return <DLDetail deId={deId} />;
}
