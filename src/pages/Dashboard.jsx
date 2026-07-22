import React, { useMemo } from 'react';
import { listProjets } from '@/api/projet';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Loader2, Radar, FileEdit, Hourglass, ClipboardCheck,
  CheckCircle2, XCircle, Inbox,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { STATUTS, getStatutMeta } from '@/lib/deStatus';
import { CodeChapeauAlertIcon } from '@/components/CodeChapeauAlertIcon';

const FADE_UP_KEYFRAMES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const TONE_BADGE = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

// Cartes du pipeline : un statut Dataverse (cr04e_statut_en_cours) par carte.
const PIPELINE = [
  { key: 'de_brouillon', label: 'Brouillons', Icon: FileEdit, from: 'from-amber-100', to: 'to-amber-200', text: 'text-amber-700' },
  { key: 'de_attente_cc', label: 'Attente code chapeau', Icon: Hourglass, from: 'from-blue-100', to: 'to-blue-200', text: 'text-blue-700' },
  { key: 'dl_attente_validation_cdg', label: 'Attente validation CDG', Icon: ClipboardCheck, from: 'from-indigo-100', to: 'to-indigo-200', text: 'text-indigo-700' },
  { key: 'dl_validee', label: 'Validées', Icon: CheckCircle2, from: 'from-emerald-100', to: 'to-emerald-200', text: 'text-emerald-700' },
  { key: 'dl_refusee', label: 'Refusées', Icon: XCircle, from: 'from-red-100', to: 'to-red-200', text: 'text-red-700' },
];

export default function Dashboard() {
  // Branché sur Dataverse (cr04e_projet) — même source que les listes DE / DL.
  const { data: projets = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
  });

  const { counts, totalActif, recents } = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(STATUTS).map((k) => [k, 0]));
    for (const p of projets) {
      const s = p.statut || 'de_brouillon';
      if (counts[s] != null) counts[s] += 1;
    }
    // « Actif » = tout sauf refusé (pipeline en cours + validés).
    const totalActif = projets.filter((p) => p.statut !== 'dl_refusee').length;
    const recents = [...projets]
      .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
      .slice(0, 8);
    return { counts, totalActif, recents };
  }, [projets]);

  const enCours = (counts.de_brouillon || 0) + (counts.de_attente_cc || 0) + (counts.dl_attente_validation_cdg || 0);

  return (
    <div className="min-h-screen bg-background">
      <style>{FADE_UP_KEYFRAMES}</style>

      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, hsl(270, 62%, 37%), hsl(38, 80%, 55%))' }}
            >
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground uppercase tracking-tight leading-tight">
                Tableau de bord <span className="text-primary">Pipeline</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Suivi des demandes d'étude et de lancement (Dataverse)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-5 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Hero */}
            <section
              className="relative overflow-hidden rounded-2xl shadow-xl"
              style={{ animation: 'fadeUp 500ms ease-out both', background: 'linear-gradient(120deg, hsl(270, 65%, 22%) 0%, hsl(270, 62%, 37%) 55%, hsl(38, 80%, 55%) 110%)' }}
            >
              <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: 'hsl(38, 90%, 65%)' }} />
              <div aria-hidden className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-25 blur-3xl" style={{ background: 'hsl(280, 80%, 50%)' }} />
              <div className="relative px-8 py-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/70 mb-0.5">
                    Pipeline en cours
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black text-white leading-none drop-shadow">{enCours}</span>
                    <span className="text-lg font-semibold text-white/85">
                      demande{enCours > 1 ? 's' : ''} en cours
                    </span>
                  </div>
                  <p className="text-sm text-white/75 mt-1">
                    {projets.length} projet{projets.length > 1 ? 's' : ''} au total · {totalActif} actif{totalActif > 1 ? 's' : ''} (hors refus)
                  </p>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/15">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(270, 65%, 55%)' }}>
                      <Hourglass className="w-4 h-4 text-white" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-2xl font-extrabold text-white">{counts.dl_attente_validation_cdg || 0}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">Attente validation CDG</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/15">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(150, 65%, 42%)' }}>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-2xl font-extrabold text-white">{counts.dl_validee || 0}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">Validées</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cartes pipeline par statut */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4" style={{ animation: 'fadeUp 600ms ease-out 120ms both' }}>
              {PIPELINE.map(({ key, label, Icon, from, to, text }) => (
                <div key={key} className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${text}`} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground">{counts[key] || 0}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold leading-tight">{label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Projets récents */}
            <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden" style={{ animation: 'fadeUp 700ms ease-out 200ms both' }}>
              <div className="bg-secondary px-5 py-3 border-b border-border flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Projets récents</h2>
                <Link to={createPageUrl('DemandesEtude')} className="ml-auto text-xs font-semibold text-primary hover:underline">
                  Voir toutes les DE
                </Link>
              </div>
              {recents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3 ring-1 ring-border">
                    <Inbox className="w-8 h-8 text-primary/60" />
                  </div>
                  <p className="text-base font-semibold text-foreground">Aucun projet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crée une demande d'étude pour alimenter le tableau de bord.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary border-b-2 border-primary">
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code projet</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Demandeur</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code chapeau</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recents.map((p) => {
                      const meta = getStatutMeta(p.statut);
                      return (
                        <TableRow key={p.id} className="hover:bg-secondary/50 transition-colors border-b border-border">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.code_projet || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {p.designation_article || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="text-foreground/80 text-sm">
                            {p.demandeur || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.code_chapeau || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={TONE_BADGE[meta.tone] || TONE_BADGE.amber}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>{p.created_date ? format(new Date(p.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}</span>
                              <CodeChapeauAlertIcon de={p} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
