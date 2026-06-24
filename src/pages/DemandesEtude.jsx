import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { listProjets } from '@/api/projet';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { STATUTS, getStatutMeta, codeChapeauAlert } from '@/lib/deStatus';

const TONE_BADGE = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

// Côté DE, une fois le code chapeau reçu (phase DL ou validé) la DE est « Validée ».
const isDEValidated = (statut) =>
  ['en_attente_dl', 'en_attente_validation_dl', 'validee'].includes(statut);

// Onglets de la liste DE (les statuts DL ne sont pas exposés ici, ils ont leur onglet).
const DE_TABS = ['brouillon', 'en_attente_code_chapeau', 'validee', 'refusee'];

// Helpers : extraction "type-aware" des champs (DE/DE_DL vs Autre)
const getType = (de) => de.type_de || 'de';
const getDesignation = (de) =>
  getType(de) === 'autre' ? de.autre_designation : de.designation_article;
const getDemandeur = (de) =>
  getType(de) === 'autre' ? de.autre_demandeur : de.demandeur;
const getTypeDemande = (de) =>
  getType(de) === 'autre' ? (de.autre_type_demande ? `Autre — type ${de.autre_type_demande}` : null) : de.type_demande_de;
const getUsine = (de) =>
  de.usine_validee || (getType(de) === 'autre' ? de.autre_usine_fab : null);
const getCodeProjet = (de) =>
  getType(de) === 'autre' ? de.autre_code_origine : de.code_projet;

const TYPE_BADGE = {
  de: { label: 'DE', cls: 'bg-primary/15 text-primary border-primary/30' },
  de_dl: { label: 'DE / DL', cls: 'bg-violet-100 text-violet-700 border-violet-300' },
  autre: { label: 'Autre', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
};

const TYPES_DEMANDE_OPTIONS = [
  'CA Additionnel',
  'Retravail Produit - CA existant',
  "Changement d'usine",
  'DE/DL',
  'AO - CA Additionnel',
  'AO - Retravail Produit',
];

const USINES_OPTIONS = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen', 'Produit négoce'];

const normalize = (v) =>
  (v ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function DemandesEtude() {
  const [filter, setFilter] = useState('toutes');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [search, setSearch] = useState('');
  const [typeDemandeFilter, setTypeDemandeFilter] = useState('tous');
  const [usineFilter, setUsineFilter] = useState('toutes');

  // Liste branchée sur Dataverse (cr04e_projet).
  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
  });

  // DE locales (localStorage) : sert à retrouver l'id local pour l'édition d'un
  // brouillon dans le navigateur courant (la création/édition reste locale).
  const { data: localDEs = [] } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });
  const localIdByChapeau = new Map();
  const localIdByProjet = new Map();
  localDEs.forEach((d) => {
    if (d.code_chapeau) localIdByChapeau.set(d.code_chapeau, d.id);
    if (d.code_projet) localIdByProjet.set(d.code_projet, d.id);
  });
  const localIdFor = (de) =>
    (de.code_chapeau && localIdByChapeau.get(de.code_chapeau)) ||
    (de.code_projet && localIdByProjet.get(de.code_projet)) ||
    null;

  const searchTerm = normalize(search.trim());
  const filteredDemandes = demandes.filter(de => {
    if (typeFilter !== 'tous' && getType(de) !== typeFilter) return false;
    if (filter !== 'toutes') {
      if (filter === 'validee') {
        if (!isDEValidated(de.statut)) return false;
      } else if (de.statut !== filter) {
        return false;
      }
    }

    if (typeDemandeFilter !== 'tous') {
      const td = getTypeDemande(de);
      if (!td || !td.toLowerCase().includes(typeDemandeFilter.toLowerCase())) return false;
    }
    if (usineFilter !== 'toutes' && getUsine(de) !== usineFilter) return false;

    if (searchTerm) {
      const haystack = [
        getCodeProjet(de),
        getDesignation(de),
        getDemandeur(de),
        getTypeDemande(de),
        getUsine(de),
        de.code_article,
      ]
        .map(normalize)
        .join(' ');
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  const filtersActive =
    !!searchTerm || typeDemandeFilter !== 'tous' || usineFilter !== 'toutes';
  const clearFilters = () => {
    setSearch('');
    setTypeDemandeFilter('tous');
    setUsineFilter('toutes');
  };

  const getStatutBadge = (statut) => {
    // Une fois les étapes DE passées (le projet est en phase DL ou validé),
    // on l'affiche comme « Validée » côté DE — le suivi DL vit dans l'onglet DL.
    if (isDEValidated(statut)) {
      return <Badge className={TONE_BADGE.emerald}>{STATUTS.validee.label}</Badge>;
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
            <Link to={createPageUrl('CreerDE')}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Plus className="w-4 h-4 mr-2" />
                Créer une DE
              </Button>
            </Link>
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
              { id: 'de_dl', label: 'DE / DL' },
              { id: 'autre', label: 'Autre' },
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

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'en_attente_code_chapeau').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Attente code chapeau</p>
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
                  {demandes.filter(d => isDEValidated(d.statut)).length}
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
                  {demandes.filter(d => d.statut === 'refusee').length}
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

        <div className="mb-6 bg-card rounded-xl border border-border shadow-sm p-3 flex flex-wrap items-center gap-3">
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
              onChange={(v) => setTypeDemandeFilter(v || 'tous')}
              options={TYPES_DEMANDE_OPTIONS}
              placeholder="Tous les types"
              searchPlaceholder="Rechercher un type…"
              emptyText="Aucun type."
              className="h-9"
            />
          </div>

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
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Type</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code projet</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Demandeur</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Type de demande</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Usine</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Date création</TableHead>
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
                      {getCodeProjet(de) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {getDesignation(de) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">
                      {getDemandeur(de) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">
                      {getTypeDemande(de) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">
                      {getUsine(de) || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatutBadge(de.statut)}
                        {(() => {
                          const a = codeChapeauAlert(de);
                          if (a.level === 'none') return null;
                          return (
                            <Badge className={a.level === 'j6' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                              <Clock className="w-3 h-3 mr-1" />
                              {a.level === 'j6' ? `Relance J+${a.joursEcoules}` : `J+${a.joursEcoules}`}
                            </Badge>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {de.created_date
                        ? format(new Date(de.created_date), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const localId = localIdFor(de);
                        // Brouillon : on édite la DE locale (si présente dans ce
                        // navigateur). Sinon (DE envoyée) : lien profond DL par
                        // code chapeau, ou détail local s'il existe.
                        const target =
                          de.statut === 'brouillon'
                            ? localId ? `CreerDE?id=${localId}` : 'CreerDE'
                            : de.code_chapeau
                              ? `DL?code_chapeau=${encodeURIComponent(de.code_chapeau)}`
                              : localId
                                ? `DL?id=${localId}`
                                : 'DL';
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
    </div>
  );
}