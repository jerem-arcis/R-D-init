import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { normalizeText } from '@/lib/utils';
import { buildChecklist, flattenParametre } from '@/lib/erreursSap';
import { useErreursSap } from '@/lib/useErreursSap';

// Pastille de statut d'un flux (colonne Flux DE / Flux FL). null = non renseigné.
const FLUX_PILL = {
  reussi: { label: 'Réussi', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  erreur: { label: 'Erreur', cls: 'bg-red-100 text-red-700 border-red-200', Icon: AlertCircle },
};

function FluxPill({ statut }) {
  const meta = FLUX_PILL[statut];
  if (!meta) return <span className="text-muted-foreground/40 text-sm">—</span>;
  const { label, cls, Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'dd/MM HH:mm');
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
    tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-foreground';
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

// Carte d'une erreur : entité + code erreur, message, et déroulant du paramètre
// envoyé (parsé en paires clé/valeur, quelle que soit la forme du JSON).
function ErrorCard({ err }) {
  const params = useMemo(() => flattenParametre(err.parametre), [err.parametre]);
  return (
    <div className="rounded-lg border border-red-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {err.entite && (
          <span className="inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            {err.entite}
          </span>
        )}
        {err.codeErreurSap && (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600">
            {err.codeErreurSap}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-foreground">{err.messageErreur || '-'}</p>

      {params.length > 0 && (
        <details className="group mt-3">
          <summary className="flex items-center gap-1 cursor-pointer list-none text-xs font-medium text-primary hover:underline">
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            Voir ce qui a été envoyé
          </summary>
          <dl className="mt-2 rounded-lg border border-border bg-muted/30 divide-y divide-border overflow-hidden">
            {params.map((p, i) => (
              <div key={`${p.key}-${i}`} className="grid grid-cols-[minmax(120px,40%)_1fr] gap-2 px-3 py-1.5">
                <dt className="text-[11px] font-mono text-muted-foreground break-all">{p.key}</dt>
                <dd className="text-[11px] text-foreground break-all">{p.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

// En-tête commun aux panneaux détail (erreur ou réussite).
function DetailHeader({ row }) {
  return (
    <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
        {row.codeProjet && <span>{row.codeProjet} · </span>}
        <span>Article {row.reference || '-'}</span>
        {row.designation && (
          <span className="text-muted-foreground normal-case font-normal"> · {row.designation}</span>
        )}
        {row.usine && <span className="text-muted-foreground"> · {row.usine}</span>}
      </div>
      <div className="text-[11px] text-muted-foreground whitespace-nowrap">
        {fmtDateLong(row.createdOn)}
      </div>
    </div>
  );
}

// Panneau détail des erreurs jointes (journal cr04e_gestiondeserreurs).
function CreationDetail({ row }) {
  const { creation } = row;
  const steps = useMemo(() => buildChecklist(creation.errors), [creation]);
  const [selectedStepKey, setSelectedStepKey] = useState(null);

  // À chaque changement d'article : on remet à zéro la sélection. Les erreurs ne
  // s'affichent que lorsqu'on clique explicitement sur une vue en erreur.
  useEffect(() => {
    setSelectedStepKey(null);
  }, [creation.reference, creation.referenceRaw]);

  const selectedStep = steps.find((s) => s.key === selectedStepKey) || null;
  const cards = selectedStep ? selectedStep.errors : [];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DetailHeader row={row} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,300px)_1fr]">
        {/* Checklist des vues SAP — cliquez une vue en erreur pour voir ses messages */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-3 space-y-1">
          {steps.map((s) => {
            const clickable = s.status === 'erreur';
            const active = clickable && s.key === selectedStepKey;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setSelectedStepKey(s.key)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                  active
                    ? 'bg-red-100 ring-1 ring-red-300'
                    : clickable
                      ? 'bg-red-50 hover:bg-red-100 cursor-pointer'
                      : 'cursor-default'
                }`}
              >
                {STEP_ICON[s.status]}
                <span className={s.status === 'erreur' ? 'text-red-700 font-medium' : 'text-foreground'}>
                  {s.label}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">{STEP_HINT[s.status]}</span>
              </button>
            );
          })}
        </div>

        {/* Messages de la vue sélectionnée uniquement */}
        <div className="p-4 space-y-3">
          {!selectedStep ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez une vue en erreur pour voir le détail.
            </p>
          ) : (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {selectedStep.label} · {cards.length} erreur{cards.length > 1 ? 's' : ''}
              </div>
              {cards.map((err) => (
                <ErrorCard key={err.id} err={err} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Panneau détail sans journal d'erreurs rattaché : réussite propre, ou flux en
// erreur mais sans ligne dans le journal (message générique).
function StatusDetail({ row }) {
  const anyError = row.fluxDe === 'erreur' || row.fluxFl === 'erreur';
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DetailHeader row={row} />
      <div className="px-5 py-6 flex items-center gap-2 text-sm">
        {anyError ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-foreground">
              Flux en erreur, mais aucun détail dans le journal d’erreurs. Relancez l’envoi depuis la page de création.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-foreground">Envoi réussi — rien à corriger.</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue principale — pilotée par les projets ayant un statut de flux (DE / FL).
// filter = 'suivi' (tout) | 'echec' (seulement les flux en erreur).
// ---------------------------------------------------------------------------
export default function SuiviCreationsSap({ filter = 'suivi' }) {
  const { suiviFlux, fluxKpis, isLoading, isError, error, isDemo } = useErreursSap();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const scoped = useMemo(
    () =>
      filter === 'echec'
        ? suiviFlux.filter((r) => r.fluxDe === 'erreur' || r.fluxFl === 'erreur')
        : suiviFlux,
    [suiviFlux, filter],
  );

  const filtered = useMemo(() => {
    const q = normalizeText(search).trim();
    if (!q) return scoped;
    return scoped.filter((r) =>
      normalizeText(
        [r.codeProjet, r.reference, r.designation, r.demandeur, r.usine].join(' '),
      ).includes(q),
    );
  }, [scoped, search]);

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard value={fluxKpis.total} label="Projets suivis" />
        <KpiCard value={fluxKpis.reussis} label="Réussis" tone="emerald" />
        <KpiCard value={fluxKpis.enErreur} label="En erreur" tone="red" />
      </div>

      {/* Tableau de suivi */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
            {filter === 'echec' ? 'Flux en erreur' : 'Suivi des envois SAP'}
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
            {error?.message || 'Impossible de charger les envois SAP.'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Aucun envoi à afficher.
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
                <TableHead className="text-[11px] uppercase tracking-wide">Flux DE</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Flux FL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer ${
                    selected && selected.id === r.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <TableCell className="text-sm text-muted-foreground">{r.codeProjet || '-'}</TableCell>
                  <TableCell className="text-sm font-semibold">{r.reference || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[280px] truncate">{r.designation || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.usine || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.demandeur || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDate(r.createdOn)}
                  </TableCell>
                  <TableCell><FluxPill statut={r.fluxDe} /></TableCell>
                  <TableCell><FluxPill statut={r.fluxFl} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Détail de l'envoi sélectionné : erreurs jointes, sinon statut simple */}
      {!isLoading && !isError && selected && (
        selected.creation ? <CreationDetail row={selected} /> : <StatusDetail row={selected} />
      )}
    </div>
  );
}
