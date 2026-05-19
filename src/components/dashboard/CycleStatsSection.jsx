import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity, ChevronRight, AlarmClock, CalendarOff, ExternalLink,
  CheckCircle2, Factory, Layers, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { buildAlertEntries } from '@/lib/launchAlert';
import {
  STEPS, computeTransitions, formatDuration,
  getDurationSeverity, getSlowestTransitions, getStaleWaitingTransitions,
} from '@/lib/cycleStats';

const STEP_BADGE_STYLES = {
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
  violet: 'bg-violet-100 text-violet-700 border-violet-300',
  sky: 'bg-sky-100 text-sky-700 border-sky-300',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  rose: 'bg-rose-100 text-rose-700 border-rose-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

const STEP_FILL_HEX = {
  slate: '#64748b',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
};

const StepBadge = ({ step }) => (
  <div className={`px-3 py-2 rounded-lg border-2 font-bold text-xs uppercase tracking-wider shadow-sm ${STEP_BADGE_STYLES[step.color] || STEP_BADGE_STYLES.slate}`}>
    {step.shortLabel}
  </div>
);

const SEVERITY_TEXT_COLOR = {
  fast: 'text-emerald-600',
  normal: 'text-amber-600',
  slow: 'text-rose-600',
  unknown: 'text-slate-400',
};

const SEVERITY_BG_BADGE = {
  fast: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  normal: 'bg-amber-100 text-amber-700 border-amber-300',
  slow: 'bg-rose-100 text-rose-700 border-rose-300',
  unknown: 'bg-slate-100 text-slate-500 border-slate-300',
};

const DurationValue = ({ ms, className = '' }) => {
  const sev = getDurationSeverity(ms);
  return (
    <span className={`${SEVERITY_TEXT_COLOR[sev]} ${className}`}>
      {formatDuration(ms)}
    </span>
  );
};

const TransitionMiniBadge = ({ transition }) => (
  <div className="inline-flex items-center gap-1">
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${STEP_BADGE_STYLES[transition.from.color] || STEP_BADGE_STYLES.slate}`}>
      {transition.from.shortLabel}
    </span>
    <ChevronRight className="w-3 h-3 text-slate-400" />
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${STEP_BADGE_STYLES[transition.to.color] || STEP_BADGE_STYLES.slate}`}>
      {transition.to.shortLabel}
    </span>
  </div>
);

const SERVICE_FILTER_OPTIONS = [
  { key: 'cg',     shortLabel: 'CG',  label: 'Contrôle de Gestion', color: 'violet' },
  { key: 'sc',     shortLabel: 'SC',  label: 'Supply Chain',        color: 'sky' },
  { key: 'gb',     shortLabel: 'GB',  label: 'Gestion du besoin',   color: 'emerald' },
  { key: 'ind',    shortLabel: 'Ind', label: 'Industriel',          color: 'amber' },
  { key: 'com',    shortLabel: 'Com', label: 'Commerce',            color: 'rose' },
  { key: 'sap',    shortLabel: 'SAP', label: 'Création SAP',        color: 'indigo' },
  { key: 'export', shortLabel: 'Exp', label: 'Export FL',           color: 'slate' },
];

const STEP_LABEL_TO_KEY = {
  'Contrôle de Gestion': 'cg',
  'Supply Chain': 'sc',
  'Gestion du besoin': 'gb',
  'Industriel': 'ind',
  'Commerce': 'com',
  'Création SAP': 'sap',
  'Export FL': 'export',
};

const ServiceFilterChips = ({ selected, counts, onToggle, onReset }) => {
  const totalSelected = selected.size;
  const activeOptions = SERVICE_FILTER_OPTIONS.filter((o) => (counts[o.key] || 0) > 0);

  if (activeOptions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-500 mr-1">
        <Filter className="w-3 h-3" />
        <span className="text-[10px] uppercase font-bold tracking-wider">Service</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 ${
          totalSelected === 0
            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
        }`}
      >
        Tous
      </button>
      {activeOptions.map((opt) => {
        const isSelected = selected.has(opt.key);
        const baseStyle = STEP_BADGE_STYLES[opt.color] || STEP_BADGE_STYLES.slate;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onToggle(opt.key)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-1 ${
              isSelected
                ? `${baseStyle} shadow-sm ring-1 ring-offset-1 ring-current`
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
            title={opt.label}
          >
            <span>{opt.shortLabel}</span>
            <span className="text-[9px] opacity-70 font-mono">{counts[opt.key] || 0}</span>
          </button>
        );
      })}
    </div>
  );
};

const WaitingRow = ({ entry }) => {
  const days = Math.floor(entry.duration / (1000 * 60 * 60 * 24));
  return (
    <Link
      to={createPageUrl(`FicheDetail?id=${entry.fiche.id}`)}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50/60 transition-colors border border-transparent hover:border-amber-200 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="px-2 py-1 rounded-md text-xs font-bold border bg-amber-100 text-amber-800 border-amber-300 flex-shrink-0 whitespace-nowrap">
          {days} j
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 truncate">
            <span className="font-mono text-xs text-slate-500">{entry.fiche.code_article || '—'}</span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{entry.fiche.libelle_article || '—'}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <TransitionMiniBadge transition={entry.transition} />
            <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
              En attente depuis <span className="font-bold">{days} jour{days > 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </Link>
  );
};

const ServiceBadge = ({ serviceKey }) => {
  const opt = SERVICE_FILTER_OPTIONS.find((o) => o.key === serviceKey);
  if (!opt) return null;
  const style = STEP_BADGE_STYLES[opt.color] || STEP_BADGE_STYLES.slate;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${style}`}>
      {opt.shortLabel}
    </span>
  );
};

const LateLaunchRow = ({ entry }) => {
  const jours = Math.abs(entry.joursAvant);
  const serviceKey = STEP_LABEL_TO_KEY[entry.blockingStep] || null;
  return (
    <Link
      to={createPageUrl(`FicheDetail?id=${entry.fiche.id}`)}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="px-2 py-1 rounded-md text-xs font-bold border bg-rose-100 text-rose-700 border-rose-300 flex-shrink-0 whitespace-nowrap">
          J+{jours}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 truncate">
            <span className="font-mono text-xs text-slate-500">{entry.fiche.code_article || '—'}</span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{entry.fiche.libelle_article || '—'}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {serviceKey && (
              <>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Bloqué</span>
                <ServiceBadge serviceKey={serviceKey} />
              </>
            )}
            <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">
              Lancement {format(new Date(entry.dateLancement), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </Link>
  );
};

const DelayPanel = ({
  title, icon: Icon, accent, entries, emptyMessage, RowComponent, rowKey,
  filterBar, totalBeforeFilter, limit = 8,
}) => {
  const shown = entries.slice(0, limit);
  const hidden = entries.length - shown.length;
  const filteredOut = totalBeforeFilter != null && totalBeforeFilter > entries.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <header className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r ${accent}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        </div>
        <Badge className="bg-white/20 text-white border-white/30 font-bold">
          {entries.length}
          {filteredOut && <span className="opacity-70 ml-1">/ {totalBeforeFilter}</span>}
        </Badge>
      </header>
      {filterBar && (
        <div className="px-3 py-2 bg-slate-50/60 border-b border-slate-100">
          {filterBar}
        </div>
      )}
      <div className="p-2">
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="space-y-0.5">
              {shown.map((entry, i) => (
                <RowComponent key={rowKey(entry, i)} entry={entry} />
              ))}
            </div>
            {hidden > 0 && (
              <p className="text-xs text-slate-500 text-center mt-2 py-2 border-t border-slate-100">
                + {hidden} autre{hidden > 1 ? 's' : ''} non affiché{hidden > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const FlowDiagram = ({ transitions }) => (
  <div className="bg-gradient-to-br from-slate-50 to-violet-50/30 rounded-xl border border-slate-200 p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <Activity className="w-4 h-4 text-violet-600" />
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Flow du cycle de vie</h3>
    </div>

    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((step, i) => {
        const transition = transitions[i - 1];
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className="flex flex-col items-center min-w-[70px] flex-1 px-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Moyenne
                </div>
                <div className="text-sm font-bold">
                  {transition?.count ? (
                    <DurationValue ms={transition.avg} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200 my-1 rounded-full" />
                <div className="text-[9px] text-slate-400">
                  {transition?.count || 0} fiche{(transition?.count || 0) > 1 ? 's' : ''}
                </div>
              </div>
            )}
            <StepBadge step={step} />
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const USINE_ORDER = ['Agen', 'Aire', 'Rivesaltes', 'Bonloc', 'Négoce', 'Toulouse'];

const normalizeUsine = (raw) => {
  if (!raw) return 'Inconnu';
  const parts = String(raw).split(' - ');
  return (parts[1] || parts[0] || 'Inconnu').trim();
};

const buildUsineLookup = (fiches, des) => {
  const deById = new Map(des.map((d) => [d.id, d]));
  const map = new Map();
  for (const f of fiches) {
    const de = f.demande_etude_id ? deById.get(f.demande_etude_id) : null;
    const raw = de?.usine_validee || de?.usine_fab || f.type_usine || null;
    map.set(f.id, normalizeUsine(raw));
  }
  return map;
};

const USINE_PALETTE = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#64748b'];

const RepartitionUsineChart = ({ data, total }) => {
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Factory className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Répartition par usine de production
          </h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-6">Aucune fiche à répartir</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Répartition par usine de production
          </h3>
        </div>
        <p className="text-[11px] text-slate-500">
          <span className="font-bold">{total}</span> fiche{total > 1 ? 's' : ''} au total
        </p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="usine"
            tick={{ fontSize: 12, fontWeight: 600 }}
            width={90}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
            formatter={(v) => [`${v} fiche${v > 1 ? 's' : ''}`, 'Total']}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell key={d.usine} fill={USINE_PALETTE[i % USINE_PALETTE.length]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              fill="#475569"
              style={{ fontSize: 12, fontWeight: 700 }}
              formatter={(v) => `${v} (${((v / total) * 100).toFixed(0)}%)`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DecompositionChart = ({ decomposition }) => {
  const { row, transitions: validTransitions, total } = decomposition;

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Décomposition moyenne du cycle
          </h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-6">
          Pas assez de transitions terminées pour calculer la décomposition
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Décomposition moyenne du cycle
          </h3>
        </div>
        <p className="text-[11px] text-slate-500">
          Cycle moyen total : <span className="font-bold text-slate-700">{formatDuration(total)}</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={row} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatDuration(v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} width={100} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(v, name) => [formatDuration(v), name]}
            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {validTransitions.map((t, i) => {
            const isFirst = i === 0;
            const isLast = i === validTransitions.length - 1;
            return (
              <Bar
                key={t.key}
                dataKey={t.key}
                name={t.label}
                stackId="cycle"
                fill={STEP_FILL_HEX[t.to.color] || '#94a3b8'}
                radius={[
                  isFirst ? 6 : 0,
                  isLast ? 6 : 0,
                  isLast ? 6 : 0,
                  isFirst ? 6 : 0,
                ]}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
        {validTransitions.map((t) => {
          const pct = ((t.avg / total) * 100).toFixed(0);
          return (
            <div key={t.key} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ background: STEP_FILL_HEX[t.to.color] || '#94a3b8' }}
              />
              <span className="font-semibold text-slate-700">{t.label}</span>
              <span className="text-slate-500 font-mono">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CycleStatsSection({ fiches, des = [] }) {
  const [serviceFilterWaiting, setServiceFilterWaiting] = useState(() => new Set());
  const [serviceFilterLate, setServiceFilterLate] = useState(() => new Set());

  const transitions = useMemo(() => computeTransitions(fiches), [fiches]);
  const slowestHistorical = useMemo(() => getSlowestTransitions(fiches), [fiches]);
  const staleWaitingAll = useMemo(() => getStaleWaitingTransitions(fiches), [fiches]);

  const lateLaunchAll = useMemo(() => {
    const { entries } = buildAlertEntries(fiches, des);
    return entries
      .filter((e) => e.bucket.key === 'retard')
      .sort((a, b) => a.joursAvant - b.joursAvant);
  }, [fiches, des]);

  const usineByFicheId = useMemo(() => buildUsineLookup(fiches, des), [fiches, des]);

  const waitingCountsByService = useMemo(() => {
    const counts = {};
    for (const e of staleWaitingAll) {
      const key = e.transition.to.key;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [staleWaitingAll]);

  const lateCountsByService = useMemo(() => {
    const counts = {};
    for (const e of lateLaunchAll) {
      const key = STEP_LABEL_TO_KEY[e.blockingStep];
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [lateLaunchAll]);

  const staleWaiting = useMemo(() => {
    if (serviceFilterWaiting.size === 0) return staleWaitingAll;
    return staleWaitingAll.filter((e) => serviceFilterWaiting.has(e.transition.to.key));
  }, [staleWaitingAll, serviceFilterWaiting]);

  const lateLaunch = useMemo(() => {
    if (serviceFilterLate.size === 0) return lateLaunchAll;
    return lateLaunchAll.filter((e) => {
      const key = STEP_LABEL_TO_KEY[e.blockingStep];
      return key && serviceFilterLate.has(key);
    });
  }, [lateLaunchAll, serviceFilterLate]);

  const repartitionUsine = useMemo(() => {
    const counts = {};
    for (const f of fiches) {
      const u = usineByFicheId.get(f.id) || 'Inconnu';
      counts[u] = (counts[u] || 0) + 1;
    }
    const data = Object.entries(counts)
      .map(([usine, count]) => ({ usine, count }))
      .sort((a, b) => b.count - a.count);
    return { data, total: fiches.length };
  }, [fiches, usineByFicheId]);

  const decomposition = useMemo(() => {
    const validTransitions = transitions.filter((t) => t.count > 0 && t.avg != null);
    if (validTransitions.length === 0) {
      return { row: [], transitions: [], total: 0 };
    }
    const row = { name: 'Cycle' };
    for (const t of validTransitions) row[t.key] = t.avg;
    const total = validTransitions.reduce((s, t) => s + t.avg, 0);
    return { row: [row], transitions: validTransitions, total };
  }, [transitions]);

  const toggleWaiting = (key) => {
    setServiceFilterWaiting((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleLate = (key) => {
    setServiceFilterLate((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!fiches || fiches.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      {/* Panneau Gestion des retards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Gestion des retards service et retard de date de lancement
          </h3>
          <p className="text-[11px] text-slate-500">
            Seuil d'alerte : <span className="font-bold text-rose-600">&gt; 3 jours</span>
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DelayPanel
            title="Bloqué à une étape"
            icon={AlarmClock}
            accent="from-amber-500 to-orange-600"
            entries={staleWaiting}
            totalBeforeFilter={staleWaitingAll.length}
            emptyMessage={
              serviceFilterWaiting.size > 0
                ? 'Aucune fiche bloquée pour ce service'
                : 'Aucune fiche bloquée — tout avance bien 🎉'
            }
            RowComponent={WaitingRow}
            rowKey={(entry, i) => `${entry.fiche.id}-${entry.transition.key}-${i}`}
            filterBar={
              <ServiceFilterChips
                selected={serviceFilterWaiting}
                counts={waitingCountsByService}
                onToggle={toggleWaiting}
                onReset={() => setServiceFilterWaiting(new Set())}
              />
            }
          />
          <DelayPanel
            title="Retard par rapport à la date de lancement"
            icon={CalendarOff}
            accent="from-red-600 to-rose-800"
            entries={lateLaunch}
            totalBeforeFilter={lateLaunchAll.length}
            emptyMessage={
              serviceFilterLate.size > 0
                ? 'Aucune fiche en retard pour ce service'
                : "Aucune fiche n'est en retard sur sa date de lancement"
            }
            RowComponent={LateLaunchRow}
            rowKey={(entry) => entry.fiche.id}
            filterBar={
              <ServiceFilterChips
                selected={serviceFilterLate}
                counts={lateCountsByService}
                onToggle={toggleLate}
                onReset={() => setServiceFilterLate(new Set())}
              />
            }
          />
        </div>
      </div>

      {/* Répartition par usine */}
      <RepartitionUsineChart data={repartitionUsine.data} total={repartitionUsine.total} />

      {/* Flow horizontal */}
      <FlowDiagram transitions={transitions} />

      {/* Décomposition moyenne */}
      <DecompositionChart decomposition={decomposition} />
    </section>
  );
}
