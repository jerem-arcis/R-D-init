import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { listProjets } from '@/api/projet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { normalizeText as normalize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Package, ChevronRight, Clock, Search, X, Hourglass,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStatutMeta } from '@/lib/deStatus';

// ---------- Métadonnées de statut DL (phase DL du chemin DE → DL → FL) ----------
const DL_STATUT_BADGE = {
  dl_attente_validation_cdg: { label: 'En attente de validation CDG', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  dl_validee: { label: 'Validée', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  dl_refusee: { label: 'Refusée', cls: 'bg-red-100 text-red-700 border-red-200' },
};
// Ordre d'affichage : en attente d'abord, finalisées ensuite.
const DL_ORDRE = { dl_attente_validation_cdg: 0, dl_validee: 1, dl_refusee: 2 };
// Onglets de la liste DL.
const DL_TABS = ['dl_attente_validation_cdg', 'dl_validee', 'dl_refusee'];
// Statuts portés par un projet en phase DL (ceux affichés dans cette liste).
const DL_PHASE_STATUTS = ['dl_attente_validation_cdg', 'dl_validee', 'dl_refusee'];

// Détail DL. Peut s'ouvrir de deux façons :
//  - ?id=<id local>    : DE présente dans le localStorage de ce navigateur.
//  - ?projet_id=<guid> : ouverture DIRECTE depuis Dataverse (cr04e_projet), sans
//                        aucune donnée locale (nav privée / autre poste).
// La page DL est désormais un simple ÉTAT D'ATTENTE : la décision de validation
// ou de refus est prise par CDG et écrite dans Dataverse par Power Automate
// (dl_validee / dl_refusee). Aucune action n'est disponible ici.
function DLDetail({ deId, projetId }) {
  const navigate = useNavigate();

  const { data: de, isLoading: deLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  // Projets Dataverse (cache partagé avec la liste) : source de vérité du statut.
  const { data: projets = [], isLoading: projetsLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
  });
  const projet = useMemo(() => {
    if (!projets.length) return null;
    const wantedId = projetId || de?.projet_id;
    if (wantedId) {
      const byId = projets.find((p) => p.id === wantedId);
      if (byId) return byId;
    }
    const cc = de?.code_chapeau;
    if (cc) return projets.find((p) => p.code_chapeau === cc) || null;
    return null;
  }, [projets, projetId, de]);

  const isLoading = (deId ? deLoading : false) || (projetId && !de ? projetsLoading : false);

  if (isLoading || (!de && !projet)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const designation =
    de?.designation_article || de?.autre_designation || projet?.designation_article || '';
  const codeChapeauVal = de?.code_chapeau || projet?.code_chapeau || '';
  // Statut = Dataverse (source de vérité, écrit par l'app puis Power Automate).
  const dlStatut = projet?.statut || de?.statut || 'dl_attente_validation_cdg';

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
              Code chapeau : <span className="font-mono">{codeChapeauVal || '—'}</span> · Statut DL : {getStatutMeta(dlStatut).label}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {dlStatut === 'dl_attente_validation_cdg' && (
          <Alert className="bg-indigo-50 border-indigo-200">
            <Hourglass className="w-4 h-4 text-indigo-600" />
            <AlertDescription className="text-indigo-700">
              En attente de validation CDG. La décision (validation ou refus) est prise par le
              Contrôle de Gestion et remontée automatiquement via Power Automate — aucune action
              n'est requise ici.
            </AlertDescription>
          </Alert>
        )}
        {dlStatut === 'dl_validee' && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              DL validée. La Fiche de Lancement a été démarrée automatiquement.
            </AlertDescription>
          </Alert>
        )}
        {dlStatut === 'dl_refusee' && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              DL refusée.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}

// ---------- Liste des DL ----------
function DLList({ initialCode = '' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('toutes');
  const [search, setSearch] = useState(initialCode);

  // Liste branchée sur Dataverse : les projets en phase DL.
  const { data: projets = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
  });
  // DE locales (localStorage) : id local pour le détail enrichi + contexte pour
  // l'auto-création de la FL.
  const { data: localDEs = [] } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });
  // Fiches de Lancement existantes : sert à l'idempotence de l'auto-création.
  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches'],
    queryFn: () => base44.entities.FicheLancement.list('-created_date'),
  });

  const rows = useMemo(() => {
    const localByProjetId = new Map();
    const localByChapeau = new Map();
    localDEs.forEach((d) => {
      if (d.projet_id) localByProjetId.set(d.projet_id, d);
      if (d.code_chapeau) localByChapeau.set(d.code_chapeau, d);
    });
    return projets
      // Tous les projets entrés en phase DL. Le STATUT vient de Dataverse
      // (cr04e_statut_en_cours) — source de vérité écrite à l'envoi vers SAP
      // puis par Power Automate (validation / refus CDG).
      .filter((p) => DL_PHASE_STATUTS.includes(p.statut))
      .map((p) => {
        const localDE =
          localByProjetId.get(p.id) ||
          (p.code_chapeau ? localByChapeau.get(p.code_chapeau) : null) ||
          null;
        return {
          key: `projet-${p.id}`,
          de: p,
          localDE,
          localId: localDE?.id || null,
          statut: p.statut,
        };
      })
      .sort((a, b) => (DL_ORDRE[a.statut] ?? 9) - (DL_ORDRE[b.statut] ?? 9));
  }, [projets, localDEs]);

  // Auto-création de la FL : dès qu'un projet passe `dl_validee` (écrit par Power
  // Automate), si sa DE locale existe et n'a pas encore de FL, on démarre la FL et
  // on relie la DE. Idempotent : garde sur fiche_lancement_id, sur les FL existantes
  // (par demande_etude_id) et sur un Set anti-double-exécution.
  const createFL = useMutation({ mutationFn: (data) => base44.entities.FicheLancement.create(data) });
  const updateDE = useMutation({ mutationFn: ({ id, data }) => base44.entities.DemandeEtude.update(id, data) });
  const processing = useRef(new Set());

  useEffect(() => {
    if (isLoading) return;
    const flByDe = new Set(fiches.map((f) => f.demande_etude_id).filter(Boolean));
    (async () => {
      let created = false;
      for (const row of rows) {
        if (row.statut !== 'dl_validee') continue;
        const de = row.localDE;
        if (!de || de.fiche_lancement_id) continue;
        if (flByDe.has(de.id) || processing.current.has(de.id)) continue;
        processing.current.add(de.id);
        try {
          const designation = de.designation_article || de.autre_designation || '';
          const fl = await createFL.mutateAsync({
            code_article: de.code_chapeau,
            code_chapeau: de.code_chapeau,
            libelle_article: designation,
            demande_etude_id: de.id,
            declinaison_logistique_id: null,
            etat_global: 'en_attente',
            etape_courante: 1,
          });
          await updateDE.mutateAsync({
            id: de.id,
            data: {
              statut: 'dl_validee',
              date_validation: new Date().toISOString(),
              fiche_lancement_id: fl.id,
            },
          });
          created = true;
        } catch {
          processing.current.delete(de.id); // on réessaiera au prochain chargement
        }
      }
      if (created) {
        queryClient.invalidateQueries({ queryKey: ['fiches'] });
        queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      }
    })();
    // createFL / updateDE / queryClient sont stables ; on ne dépend que des données.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, fiches, isLoading]);

  const count = (statut) => rows.filter((r) => r.statut === statut).length;

  // Lien profond (email) : si le code chapeau correspond à exactement un projet,
  // on ouvre directement son détail DL (par id local si dispo, sinon par projet_id).
  const codeNorm = normalize(initialCode.trim());
  useEffect(() => {
    if (!codeNorm || isLoading) return;
    const matches = rows.filter((r) => normalize(r.de.code_chapeau) === codeNorm);
    if (matches.length === 1) {
      const m = matches[0];
      const target = m.localId ? `DL?id=${m.localId}` : `DL?projet_id=${m.de.id}`;
      navigate(createPageUrl(target), { replace: true });
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
              <p className="text-sm text-muted-foreground mt-0.5">Suivi de la validation CDG des demandes de lancement</p>
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

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('dl_attente_validation_cdg')}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Attente validation CDG</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{count('dl_validee')}</p>
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
                <p className="text-3xl font-bold text-foreground">{count('dl_refusee')}</p>
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
                {filteredRows.map(({ key, de, statut, localId }) => {
                  const badge = DL_STATUT_BADGE[statut] || DL_STATUT_BADGE.dl_attente_validation_cdg;
                  const dateRef = de.created_date;
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
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateRef ? format(new Date(dateRef), 'dd MMM yyyy', { locale: fr }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(localId ? `DL?id=${localId}` : `DL?projet_id=${de.id}`)}>
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

// Route "DL" : détail si ?id (local) ou ?projet_id (Dataverse), sinon liste.
// ?code_chapeau (lien profond e-mail) pré-remplit la recherche et ouvre la
// demande correspondante (par id local si dispo, sinon par projet_id Dataverse).
export default function DL() {
  const [searchParams] = useSearchParams();
  const deId = searchParams.get('id');
  const projetId = searchParams.get('projet_id');
  const codeChapeau = searchParams.get('code_chapeau') || '';
  if (!deId && !projetId) return <DLList initialCode={codeChapeau} />;
  return <DLDetail deId={deId} projetId={projetId} />;
}
