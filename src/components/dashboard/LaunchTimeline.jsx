import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MARKERS = [-14, -7, -3, -1, 0, 1, 3, 7, 14];
const MIN = -14;
const MAX = 14;
const RANGE = MAX - MIN;

const DOT_COLOR = {
  red: 'hsl(0, 75%, 55%)',
  rose: 'hsl(15, 85%, 55%)',
  orange: 'hsl(35, 90%, 55%)',
  amber: 'hsl(45, 90%, 55%)',
  slate: 'hsl(270, 30%, 55%)',
  emerald: 'hsl(150, 65%, 45%)',
};

const positionFor = (jours) => {
  const clamped = Math.max(MIN, Math.min(MAX, jours));
  return ((clamped - MIN) / RANGE) * 100;
};

const labelForOffset = (offset) => {
  if (offset === 0) return "Aujourd'hui";
  if (offset > 0) return `J-${offset}`;
  return `J+${Math.abs(offset)}`;
};

export default function LaunchTimeline({ entries }) {
  const [hovered, setHovered] = useState(null);

  const { onAxis, leftCluster, rightCluster } = useMemo(() => {
    const onAxis = [];
    const leftCluster = [];
    const rightCluster = [];
    for (const e of entries) {
      if (e.bucket.key === 'lancee') continue;
      if (e.joursAvant == null) continue;
      if (e.joursAvant < MIN) leftCluster.push(e);
      else if (e.joursAvant > MAX) rightCluster.push(e);
      else onAxis.push(e);
    }
    return { onAxis, leftCluster, rightCluster };
  }, [entries]);

  return (
    <section className="bg-card rounded-2xl border border-border shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">Timeline des lancements</h3>
          <p className="text-xs text-slate-500">
            {onAxis.length} sur l'axe
            {leftCluster.length > 0 && ` · ${leftCluster.length} hors plage retard`}
            {rightCluster.length > 0 && ` · ${rightCluster.length} > J-14`}
          </p>
        </div>
      </div>

      <div className="relative pt-7 pb-12">
        {/* Cluster de gauche (très en retard) */}
        {leftCluster.length > 0 && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10">
            <div className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold ring-1 ring-red-200 whitespace-nowrap">
              + {leftCluster.length} retard
            </div>
          </div>
        )}
        {rightCluster.length > 0 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10">
            <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold ring-1 ring-slate-200 whitespace-nowrap">
              + {rightCluster.length} après J-14
            </div>
          </div>
        )}

        {/* Axe */}
        <div className="relative mx-16 h-1.5 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, hsl(0, 75%, 60%) 0%, hsl(20, 85%, 60%) 25%, hsl(40, 90%, 60%) 50%, hsl(150, 60%, 55%) 75%, hsl(210, 50%, 65%) 100%)',
          }}
        >
          {/* Marqueur "Aujourd'hui" : barre verticale forte */}
          {MARKERS.map((m) => {
            const left = positionFor(m);
            const isToday = m === 0;
            return (
              <div
                key={m}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${left}%` }}
              >
                <div
                  className={`w-px ${isToday ? 'h-8 bg-slate-900' : 'h-4 bg-slate-400'}`}
                  style={{ transform: 'translate(-0.5px, -50%)' }}
                />
                <span
                  className={`absolute top-6 -translate-x-1/2 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                    isToday ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-500'
                  }`}
                >
                  {labelForOffset(m)}
                </span>
              </div>
            );
          })}

          {/* Pastilles fiches */}
          {onAxis.map((e) => {
            const left = positionFor(e.joursAvant);
            const isHover = hovered === e.fiche.id;
            return (
              <Link
                key={e.fiche.id}
                to={createPageUrl(`FicheDetail?id=${e.fiche.id}`)}
                onMouseEnter={() => setHovered(e.fiche.id)}
                onMouseLeave={() => setHovered(null)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                style={{ left: `${left}%` }}
              >
                <span
                  className="block rounded-full ring-2 ring-white shadow-lg transition-all duration-200 group-hover:scale-150"
                  style={{
                    width: isHover ? 18 : 14,
                    height: isHover ? 18 : 14,
                    background: DOT_COLOR[e.bucket.tone] || DOT_COLOR.slate,
                  }}
                />
                {isHover && (
                  <div className="absolute z-30 left-1/2 -translate-x-1/2 -top-2 -translate-y-full w-56 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none">
                    <p className="font-mono text-[10px] text-white/60 mb-0.5">
                      {e.fiche.code_article || '—'}
                    </p>
                    <p className="font-semibold truncate">{e.fiche.libelle_article}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-white/80">{e.bucket.label}</span>
                      <span className="font-bold">{e.visasValides}/7</span>
                    </div>
                    <p className="text-[10px] text-white/60 mt-1">
                      {format(new Date(e.dateLancement), "EEE d MMM", { locale: fr })}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Légende */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-9 text-[10px] text-slate-600">
          {[
            { tone: 'red', label: 'En retard' },
            { tone: 'rose', label: 'Critique' },
            { tone: 'orange', label: 'Imminent' },
            { tone: 'amber', label: '< 2 sem.' },
            { tone: 'slate', label: 'À venir' },
          ].map((l) => (
            <span key={l.tone} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white shadow"
                style={{ background: DOT_COLOR[l.tone] }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
