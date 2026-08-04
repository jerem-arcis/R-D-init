import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { format } from 'date-fns';
import { normalizeText } from '@/lib/utils';
import { RESULTAT, SAP_VUES, buildChecklist, resolveVue } from '@/lib/erreursSap';
import { useErreursSap } from '@/lib/useErreursSap';

const TONE_BADGE = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

function ResultatBadge({ resultat }) {
  const meta = RESULTAT[resultat] || RESULTAT.echec;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_BADGE[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}

const VUE_LABEL = Object.fromEntries(SAP_VUES.map((v) => [v.key, v.label]));

// Libellé de la vue impactée par une erreur : déduit du code erreur SAP (préfixe de
// table) en priorité, sinon code / libellé d'action brut.
const vueLabel = (err) => {
  const key = resolveVue(err);
  return VUE_LABEL[key] || err.codeErreurSap || err.vue || 'Vue';
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM HH:mm');
};

const fmtDateLong = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM/yyyy HH:mm');
};

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------
function KpiCard({ value, label, tone }) {
  const valueColor =
    tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm px-5 py-4">
      <div className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panneau détail : checklist des vues + cartes de messages d'erreur
// ---------------------------------------------------------------------------
const STEP_ICON = {
  erreur: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
  neutre: <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />,
  reussie: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
};

const STEP_HINT = {
  erreur: 'en erreur',
  neutre: 'non traitée',
  reussie: 'créée',
};

function CreationDetail({ creation }) {
  const steps = useMemo(() => buildChecklist(creation.errors), [creation]);
  const errorCards = creation.errors.filter((e) => e.messageErreur || e.codeErreurSap);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
          {creation.codeProjet && <span>{creation.codeProjet} · </span>}
          <span>Article {creation.reference}</span>
          {creation.designation && (
            <span className="text-muted-foreground normal-case font-normal"> · {creation.designation}</span>
          )}
          {creation.usine && <span className="text-muted-foreground"> · {creation.usine}</span>}
        </div>
        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
          {fmtDateLong(creation.createdOn)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,300px)_1fr]">
        {/* Checklist des vues SAP */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-3 space-y-1">
          {steps.map((s) => (
            <div
              key={s.key}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                s.status === 'erreur' ? 'bg-red-50' : ''
              }`}
            >
              {STEP_ICON[s.status]}
              <span className={s.status === 'erreur' ? 'text-red-700 font-medium' : 'text-foreground'}>
                {s.label}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground">{STEP_HINT[s.status]}</span>
            </div>
          ))}
        </div>

        {/* Cartes des messages d'erreur */}
        <div className="p-4 space-y-3">
          {errorCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune erreur détaillée.</p>
          ) : (
            errorCards.map((err) => (
              <div key={err.id} className="rounded-lg border border-red-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                  {vueLabel(err)}
                  {err.codeErreurSap && (
                    <span className="text-muted-foreground"> · champ {err.codeErreurSap}</span>
                  )}
                </div>
                {err.messageErreur && (
                  <p className="mt-1.5 text-sm text-foreground">{err.messageErreur}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue principale
// ---------------------------------------------------------------------------
export default function SuiviCreationsSap({ filter = 'suivi' }) {
  const { creations, kpis, isLoading, isError, error, isDemo } = useErreursSap();
  const [search, setSearch] = useState('');
  const [selectedRef, setSelectedRef] = useState(null);

  const scoped = useMemo(
    () => (filter === 'echec' ? creations.filter((c) => c.resultat === 'echec') : creations),
    [creations, filter],
  );

  const filtered = useMemo(() => {
    const q = normalizeText(search).trim();
    if (!q) return scoped;
    return scoped.filter((c) =>
      normalizeText(
        [c.codeProjet, c.reference, c.designation, c.demandeur, c.usine].join(' '),
      ).includes(q),
    );
  }, [scoped, search]);

  const selected =
    filtered.find((c) => c.reference === selectedRef) || filtered[0] || null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard value={kpis.total} label="Créations · 7 jours" />
        <KpiCard value={kpis.reussies} label="Réussies" tone="emerald" />
        <KpiCard value={kpis.partielle} label="Partielle" tone="amber" />
        <KpiCard value={kpis.echec} label="En échec" tone="red" />
      </div>

      {/* Tableau de suivi */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
            {filter === 'echec' ? 'Créations en échec' : 'Suivi des créations SAP'}
            {isDemo && (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 normal-case tracking-normal">
                données de démo
              </span>
            )}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code projet, article, demandeur…"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement…
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center text-sm text-red-600">
            {error?.message || 'Impossible de charger les créations SAP.'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Aucune création à afficher.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase tracking-wide">Code projet</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Article</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Désignation</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Usine</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Demandeur</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.reference || c.referenceRaw}
                  onClick={() => setSelectedRef(c.reference)}
                  className={`cursor-pointer ${
                    selected && selected.reference === c.reference ? 'bg-primary/5' : ''
                  }`}
                >
                  <TableCell className="text-sm text-muted-foreground">{c.codeProjet || '—'}</TableCell>
                  <TableCell className="text-sm font-semibold">{c.reference || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[280px] truncate">{c.designation || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.usine || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.demandeur || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDate(c.createdOn)}
                  </TableCell>
                  <TableCell>
                    <ResultatBadge resultat={c.resultat} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Détail de la création sélectionnée */}
      {!isLoading && !isError && selected && <CreationDetail creation={selected} />}
    </div>
  );
}
