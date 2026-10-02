import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { listProjets, updateProjetStatut } from '@/api/projet';
import { usePerimetre } from '@/lib/PerimetreContext';
import { peutVoirDossier } from '@/lib/perimetre';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  getType,
  getDesignation,
  getDemandeur,
  getCodeProjet,
  isDEValidated,
  isEnAttenteCC,
  isValideeCount,
  listDemandeurs,
  filterDemandes,
  sortDemandes,
  localIdFor,
} from '@/lib/demandesFilter';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FluxStatutBadge from '@/components/FluxStatutBadge';
import { fluxStatut } from '@/lib/erreursSap';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  FileText,
  Clock,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  X,
  Calendar,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FastForward,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { STATUTS, getStatutMeta, codeChapeauAlert, etapeSuivante } from '@/lib/deStatus';
import { CodeChapeauAlertIcon } from '@/components/CodeChapeauAlertIcon';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const TONE_BADGE = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

// Onglets de la liste DE. Depuis la suppression de la vue DL dédiée, le statut
// « En attente de validation CDG » est exposé ici comme un onglet à part entière.
// Clés = statuts ; les libellés viennent de STATUTS. Les helpers "type-aware"
// (getType, getDesignation, …) et les prédicats de statut sont dans
// '@/lib/demandesFilter' (module pur testé).
const DE_TABS = ['de_brouillon', 'de_attente_cc', 'dl_attente_validation_cdg', 'dl_validee', 'dl_refusee'];

// Vues sauvegardées : combinaisons prêtes à l'emploi appliquées en un clic.
const SAVED_VIEWS = [
  { id: 'toutes', label: 'Toutes mes demandes' },
  { id: 'attente_cc', label: 'À traiter - attente code chapeau' },
  { id: 'attente_cdg', label: 'À valider (CDG)' },
  { id: 'alerte', label: 'En alerte' },
];

const TYPE_BADGE = {
  de: { label: 'DE', cls: 'bg-primary/15 text-primary border-primary/30' },
  de_dl: { label: 'DE / DL', cls: 'bg-violet-100 text-violet-700 border-violet-300' },
  autre: { label: 'Autre', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  ds: { label: 'DS', cls: 'bg-teal-100 text-teal-700 border-teal-300' },
};

// Filtre « type de demande » : aligné sur la partie création DE (CA / Retravail)
// + une entrée DS qui déverrouille le filtre par cas d'usage (1 à 7).
const TYPES_DEMANDE_OPTIONS = [
  'CA Additionnel',
  'Retravail Produit - CA existant',
  'DS',
];

// Les 7 cas d'usage DS (valeur stockée dans type_demande_de = cr04e_typedelademande).
const DS_CAS_OPTIONS = [
  { value: '1', label: '1 - Transfert industriel (savoir-faire)' },
  { value: '2', label: '2 - Semi-fini pour une autre usine' },
  { value: '3', label: '3 - Massification' },
  { value: '4', label: '4 - Produits extérieurs négoce' },
  { value: '5', label: '5 - Produits d\'une filiale du groupe' },
  { value: '6', label: '6 - Changement produit mineur (< 2%)' },
  { value: '7', label: '7 - Modification palettisation mineure (< 2%)' },
];

const USINES_OPTIONS = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen', 'Produit négoce'];

export default function DemandesEtude() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Tous les filtres sont initialisés depuis l'URL (liens profonds + partage /
  // rechargement) et re-synchronisés vers l'URL à chaque changement (voir effet).
  const [filter, setFilter] = useState(() => searchParams.get('statut') || 'toutes');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') || 'tous');
  // Recherche pré-remplie par le deep-link e-mail (?code_chapeau) — remplace
  // l'ex-liste DL vers laquelle pointait ce lien.
  const [search, setSearch] = useState(
    () => searchParams.get('code_chapeau') || searchParams.get('search') || '',
  );
  const [typeDemandeFilter, setTypeDemandeFilter] = useState(() => searchParams.get('td') || 'tous');
  const [dsCasFilter, setDsCasFilter] = useState(() => searchParams.get('dscas') || 'tous'); // sous-type DS (1 à 7)
  const [usineFilter, setUsineFilter] = useState(() => searchParams.get('usine') || 'toutes');
  const [demandeurFilter, setDemandeurFilter] = useState(() => searchParams.get('demandeur') || 'tous');
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') || '');
  const [alertOnly, setAlertOnly] = useState(() => searchParams.get('alerte') === '1');
  const [sortKey, setSortKey] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [activeView, setActiveView] = useState('toutes');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Ligne en attente de confirmation pour le passage manuel à l'étape suivante.
  const [confirmDe, setConfirmDe] = useState(null);

  // Liste branchée sur Dataverse (cr04e_projet).
  // Périmètre société : on ne liste que les demandes de mes sociétés.
  const { perimetre } = usePerimetre();
  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
    select: (rows) => rows.filter((d) => peutVoirDossier(perimetre, d.division)),
  });

  // Passage MANUEL (phase de test) à l'étape suivante : « Projet qualifié et en cours
  // d'étude » (dl_attente_validation_cdg) -> « Validée » (dl_validee), règle unique
  // etapeSuivante. JAMAIS « Article créé dans SAP » : ce statut n'est posé que par la
  // création SAP depuis la FL. Simple transition de cr04e_statut_en_cours ; la FL
  // apparaît dans l'Accueil dès « Validée ».
  const promoteMutation = useMutation({
    mutationFn: ({ id, statut }) => updateProjetStatut(id, statut),
    onSuccess: (_, { statut }) => {
      queryClient.invalidateQueries({ queryKey: ['projets-de'] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
      toast({ title: 'Statut mis à jour', description: `Demande passée à « ${getStatutMeta(statut).label} » (test).` });
    },
    onError: (err) =>
      toast({ title: 'Échec de la mise à jour', description: err?.message || 'Erreur inconnue.', variant: 'destructive' }),
    onSettled: () => setConfirmDe(null),
  });

  // DE locales (localStorage) : sert à retrouver l'id local pour l'édition d'un
  // brouillon dans le navigateur courant (la création/édition reste locale).
  const { data: localDEs = [] } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });
  // La FL n'est plus matérialisée : la ligne cr04e_projet EST la FL dès `dl_validee`.
  // Elle apparaît directement dans « Accueil » (liste FL sur Dataverse).

  // Jointure ligne Dataverse -> brouillon local par `projet_id` uniquement
  // (helper pur testé `localIdFor`). Voir le commentaire du helper : les anciens
  // replis code_chapeau/code_projet ouvraient la mauvaise fiche quand plusieurs
  // essais partageaient le même code.

  // Demandeurs présents dans le jeu de données → options du filtre dédié.
  const demandeurs = useMemo(() => listDemandeurs(demandes), [demandes]);

  // Filtrage (module pur testé) puis tri par la colonne active.
  const filteredDemandes = useMemo(() => {
    const filtered = filterDemandes(demandes, {
      filter,
      typeFilter,
      typeDemandeFilter,
      dsCasFilter,
      usineFilter,
      demandeurFilter,
      dateFrom,
      dateTo,
      alertOnly,
      search,
    });
    return sortDemandes(filtered, sortKey, sortDir);
  }, [demandes, filter, typeFilter, typeDemandeFilter, dsCasFilter, usineFilter,
    demandeurFilter, dateFrom, dateTo, alertOnly, search, sortKey, sortDir]);

  // Persistance des filtres dans l'URL (partage + rechargement conservent l'état).
  // On n'écrit que les valeurs non-neutres pour garder l'URL lisible. `replace`
  // pour ne pas polluer l'historique du navigateur.
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== 'toutes') p.set('statut', filter);
    if (typeFilter !== 'tous') p.set('type', typeFilter);
    if (typeDemandeFilter !== 'tous') p.set('td', typeDemandeFilter);
    if (dsCasFilter !== 'tous') p.set('dscas', dsCasFilter);
    if (usineFilter !== 'toutes') p.set('usine', usineFilter);
    if (demandeurFilter !== 'tous') p.set('demandeur', demandeurFilter);
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    if (alertOnly) p.set('alerte', '1');
    if (search.trim()) p.set('search', search.trim());
    setSearchParams(p, { replace: true });
  }, [filter, typeFilter, typeDemandeFilter, dsCasFilter, usineFilter,
    demandeurFilter, dateFrom, dateTo, alertOnly, search, setSearchParams]);

  // Tri : re-cliquer une colonne inverse le sens ; la date démarre en décroissant.
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_date' ? 'desc' : 'asc');
    }
  };

  // Vue sauvegardée : réinitialise les filtres secondaires puis applique le preset.
  const applyView = (view) => {
    setTypeDemandeFilter('tous');
    setDsCasFilter('tous');
    setUsineFilter('toutes');
    setDemandeurFilter('tous');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setAlertOnly(false);
    setTypeFilter('tous');
    if (view === 'attente_cc') setFilter('de_attente_cc');
    else if (view === 'attente_cdg') setFilter('dl_attente_validation_cdg');
    else if (view === 'alerte') { setFilter('toutes'); setAlertOnly(true); }
    else setFilter('toutes');
    setActiveView(view);
  };

  const filtersActive =
    !!search.trim() || typeDemandeFilter !== 'tous' || dsCasFilter !== 'tous' ||
    usineFilter !== 'toutes' || demandeurFilter !== 'tous' || !!dateFrom || !!dateTo || alertOnly;
  const clearFilters = () => {
    setSearch('');
    setTypeDemandeFilter('tous');
    setDsCasFilter('tous');
    setUsineFilter('toutes');
    setDemandeurFilter('tous');
    setDateFrom('');
    setDateTo('');
    setAlertOnly(false);
    setActiveView('toutes');
  };

  // En-tête de colonne triable (indicateur de sens).
  const SortHead = ({ sortId, children }) => {
    const active = sortKey === sortId;
    return (
      <TableHead
        onClick={() => toggleSort(sortId)}
        className="font-bold text-foreground uppercase text-xs tracking-wide cursor-pointer select-none"
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {active
            ? (sortDir === 'asc'
              ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
              : <ChevronDown className="w-3.5 h-3.5 text-primary" />)
            : <ArrowUpDown className="w-3 h-3 opacity-30" />}
        </span>
      </TableHead>
    );
  };

  const getStatutBadge = (statut) => {
    // Validation CDG acquise (dl_validee) → badge « Validée ». Les autres statuts,
    // dont « En attente de validation CDG », utilisent leur meta (badge indigo).
    if (isDEValidated(statut)) {
      return <Badge className={TONE_BADGE.emerald}>{STATUTS.dl_validee.label}</Badge>;
    }
    const meta = getStatutMeta(statut);
    return <Badge className={TONE_BADGE[meta.tone] || TONE_BADGE.amber}>{meta.label}</Badge>;
  };

  const alertCount = demandes.filter((d) => codeChapeauAlert(d).level !== 'none').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-1 bg-card rounded-xl shadow-sm ring-1 ring-border">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69383b6842c6c81a3e8e96d2/22582b55d_boncolac.jpeg"
                  alt="Boncolac"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Demandes d'Étude <span className="text-primary">(DE)</span></h1>
                <p className="text-sm text-muted-foreground mt-0.5">Gestion des demandes d'étude</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('CreerDE?type=de')}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une DE
                  <span className="ml-2 rounded-full bg-amber-400/90 text-amber-950 text-[9px] font-bold px-2 py-0.5 normal-case tracking-normal">
                    Phase de test
                  </span>
                </Button>
              </Link>
              <Link to={createPageUrl('CreerDE?type=ds')}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une DS (demande simplifiée)
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-card border border-border flex-wrap h-auto">
              {DE_TABS.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
                >
                  {STATUTS[key].label}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="toutes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                Toutes
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Type :</span>
            {[
              { id: 'tous', label: 'Tous' },
              { id: 'de', label: 'DE' },
              { id: 'ds', label: 'DS' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  typeFilter === t.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => isEnAttenteCC(d.statut)).length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Attente code chapeau</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'dl_attente_validation_cdg').length}
                </p>
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
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => isValideeCount(d.statut)).length}
                </p>
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
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'dl_refusee').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Refusées</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{alertCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Alertes code chapeau</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-card rounded-xl border border-border shadow-sm p-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Vues :</span>
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => applyView(v.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  activeView === v.id
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code projet, désignation, demandeur…"
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

          <div className="w-[220px]">
            <SearchableSelect
              value={typeDemandeFilter === 'tous' ? '' : typeDemandeFilter}
              onChange={(v) => {
                setTypeDemandeFilter(v || 'tous');
                if (v !== 'DS') setDsCasFilter('tous'); // reset du cas d'usage
              }}
              options={TYPES_DEMANDE_OPTIONS}
              placeholder="Tous les types"
              searchPlaceholder="Rechercher un type…"
              emptyText="Aucun type."
              className="h-9"
            />
          </div>

          {typeDemandeFilter === 'DS' && (
            <div className="w-[260px]">
              <SearchableSelect
                value={dsCasFilter === 'tous' ? '' : dsCasFilter}
                onChange={(v) => setDsCasFilter(v || 'tous')}
                options={DS_CAS_OPTIONS}
                placeholder="Tous les cas d'usage"
                searchPlaceholder="Rechercher un cas…"
                emptyText="Aucun cas."
                className="h-9"
              />
            </div>
          )}

          <div className="w-[180px]">
            <SearchableSelect
              value={usineFilter === 'toutes' ? '' : usineFilter}
              onChange={(v) => setUsineFilter(v || 'toutes')}
              options={USINES_OPTIONS}
              placeholder="Toutes les usines"
              searchPlaceholder="Rechercher une usine…"
              emptyText="Aucune usine."
              className="h-9"
            />
          </div>

          <div className="w-[190px]">
            <SearchableSelect
              value={demandeurFilter === 'tous' ? '' : demandeurFilter}
              onChange={(v) => setDemandeurFilter(v || 'tous')}
              options={demandeurs}
              placeholder="Tous les demandeurs"
              searchPlaceholder="Rechercher un demandeur…"
              emptyText="Aucun demandeur."
              className="h-9"
            />
          </div>

          {/* Plage de dates : un seul contrôle bordé (mêmes hauteur / rayon /
              bordure que les listes déroulantes voisines). L'icône violette signale
              la nature « période » ; chaque champ ouvre son calendrier au clic
              (showPicker), le glyphe natif du navigateur étant masqué (cf. .date-field). */}
          <div className="flex items-center h-9 rounded-md border border-input bg-card px-2.5 gap-1.5 shadow-sm transition-colors hover:border-primary/40 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* pas de showPicker : saisie clavier */ } }}
              className="date-field w-[104px] bg-transparent text-sm text-foreground outline-none"
              aria-label="Date de début"
            />
            <span className="text-muted-foreground/60 text-xs select-none" aria-hidden="true">→</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* pas de showPicker : saisie clavier */ } }}
              className="date-field w-[104px] bg-transparent text-sm text-foreground outline-none"
              aria-label="Date de fin"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              {filteredDemandes.length} résultat{filteredDemandes.length > 1 ? 's' : ''}
            </span>
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <FileText className="w-10 h-10 text-primary/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune demande trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">Il n'y a pas de demande correspondant à ce filtre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b-2 border-primary">
                  <SortHead sortId="type">Type</SortHead>
                  <SortHead sortId="code_projet">Code projet</SortHead>
                  <SortHead sortId="designation">Désignation</SortHead>
                  <SortHead sortId="demandeur">Demandeur</SortHead>
                  <SortHead sortId="statut">Statut</SortHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Flux envoi DE</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code chapeau</TableHead>
                  <SortHead sortId="created_date">Date création</SortHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDemandes.map((de) => {
                  const tBadge = TYPE_BADGE[getType(de)] || TYPE_BADGE.de;
                  return (
                  <TableRow
                    key={de.id}
                    className="hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border"
                  >
                    <TableCell>
                      <Badge className={`${tBadge.cls} text-[10px] font-bold uppercase tracking-wider`}>
                        {tBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {getCodeProjet(de) || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {getDesignation(de) || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">
                      {getDemandeur(de) || <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        {getStatutBadge(de.statut)}
                        {etapeSuivante(de.statut) && fluxStatut(de.flux_envoi_de) !== 'erreur' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDe(de)}
                            className="h-7 px-2 text-[11px] font-semibold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          >
                            <FastForward className="w-3 h-3 mr-1" />
                            Passer à « {getStatutMeta(etapeSuivante(de.statut)).label} »
                            <span className="ml-1.5 rounded-full bg-amber-400/90 text-amber-950 text-[9px] font-bold px-1.5 py-0.5">
                              test
                            </span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <FluxStatutBadge value={de.flux_envoi_de} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {fluxStatut(de.flux_envoi_de) === 'reussi' && de.code_chapeau
                        ? de.code_chapeau
                        : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>
                          {de.created_date
                            ? format(new Date(de.created_date), 'dd MMM yyyy', { locale: fr })
                            : '-'}
                        </span>
                        <CodeChapeauAlertIcon de={de} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const localId = localIdFor(localDEs, de);
                        // Cible d'ouverture de la ligne, selon le statut :
                        //  - Brouillon : édition de la DE locale (si présente dans ce
                        //    navigateur), SINON chargement Dataverse par projet_id — la
                        //    ligne cr04e_projet existe déjà (ex. envoi SAP échoué, ou
                        //    reprise sur un autre poste). Repartir de cette ligne évite
                        //    de recréer un doublon au renvoi (le projet_id est réutilisé).
                        //  - DS (brouillon / attente CC / validée) : chargement par
                        //    projet_id depuis Dataverse.
                        //  - « En attente de code chapeau » : formulaire DE prérempli
                        //    pour que l'ADV renseigne le code (local si dispo, sinon
                        //    projet_id).
                        //  - En attente validation CDG / validée / refusée : DE en
                        //    LECTURE SEULE, chargée par projet_id depuis Dataverse
                        //    (évite un détournement vers un brouillon local obsolète).
                        const target =
                          de.statut === 'de_brouillon'
                            ? localId ? `CreerDE?id=${localId}` : `CreerDE?projet_id=${de.id}`
                            : de.statut === 'ds_brouillon' || de.statut === 'ds_attente_cc' || de.statut === 'ds_validee'
                              ? `CreerDE?projet_id=${de.id}`
                              : de.statut === 'de_attente_cc'
                                ? localId ? `CreerDE?id=${localId}` : `CreerDE?projet_id=${de.id}`
                                : `CreerDE?projet_id=${de.id}`;
                        return (
                      <Link to={createPageUrl(target)}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                        >
                          <ChevronRight className="w-5 h-5 text-primary" />
                        </Button>
                      </Link>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

      </main>

      {/* Confirmation du passage manuel (test) « Projet qualifié » → « Validée ».
          La mutation garde la pop-up ouverte pendant l'appel (preventDefault sur
          l'action) puis la ferme via onSettled. */}
      <AlertDialog open={!!confirmDe} onOpenChange={(o) => { if (!o && !promoteMutation.isPending) setConfirmDe(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Passer à « Validée » ?</AlertDialogTitle>
            <AlertDialogDescription>
              La demande{' '}
              <span className="font-semibold text-foreground">
                {confirmDe ? (getDesignation(confirmDe) || getCodeProjet(confirmDe) || '') : ''}
              </span>{' '}
              va passer de « Projet qualifié et en cours d'étude » à « Validée ».
              <br />
              <span className="text-xs italic">
                Étape de test — la fiche de lancement s'ouvre ensuite dans l'Accueil.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const statut = confirmDe && etapeSuivante(confirmDe.statut);
                if (statut) promoteMutation.mutate({ id: confirmDe.id, statut });
              }}
              disabled={promoteMutation.isPending}
            >
              {promoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}