import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, AlertTriangle, Flame, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatJourLabel } from '@/lib/launchAlert';

const TONE = {
  red: {
    band: 'linear-gradient(90deg, hsl(0, 75%, 55%), hsl(15, 85%, 55%))',
    ring: 'ring-red-200',
    chip: 'bg-red-50 text-red-700 ring-red-200',
    Icon: AlertTriangle,
    iconBg: 'hsl(0, 75%, 55%)',
  },
  rose: {
    band: 'linear-gradient(90deg, hsl(10, 85%, 58%), hsl(25, 90%, 58%))',
    ring: 'ring-orange-200',
    chip: 'bg-orange-50 text-orange-700 ring-orange-200',
    Icon: Flame,
    iconBg: 'hsl(15, 85%, 55%)',
  },
  orange: {
    band: 'linear-gradient(90deg, hsl(30, 90%, 58%), hsl(42, 95%, 58%))',
    ring: 'ring-amber-200',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    Icon: Clock,
    iconBg: 'hsl(35, 90%, 55%)',
  },
};

const ProgressRing = ({ valides, total = 7, tone }) => {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, valides / total));
  const dash = circ * pct;
  const stroke =
    tone === 'red'
      ? 'hsl(0, 75%, 55%)'
      : tone === 'rose'
        ? 'hsl(15, 85%, 55%)'
        : 'hsl(35, 90%, 55%)';
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} stroke="hsl(270, 20%, 92%)" strokeWidth="5" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke={stroke}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: 'stroke-dasharray 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-extrabold text-slate-900">{valides}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">/ {total}</span>
      </div>
    </div>
  );
};

export default function CriticalCard({ entry, index = 0 }) {
  const tone = TONE[entry.bucket.tone] || TONE.orange;
  const Icon = tone.Icon;
  const jourLabel = formatJourLabel(entry.joursAvant);

  return (
    <Link
      to={createPageUrl(`FicheDetail?id=${entry.fiche.id}`)}
      className={`group block bg-card rounded-2xl border border-border shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ring-1 ${tone.ring}`}
      style={{
        animation: `fadeUp 500ms ease-out both`,
        animationDelay: `${index * 90}ms`,
      }}
    >
      <div className="h-1.5" style={{ background: tone.band }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: tone.iconBg }}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md ring-1 ${tone.chip}`}>
              {entry.bucket.short}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 leading-none">{jourLabel}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-semibold">
              {format(new Date(entry.dateLancement), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ProgressRing valides={entry.visasValides} tone={entry.bucket.tone} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-500 truncate">
              {entry.fiche.code_article || '—'}
            </p>
            <p className="font-semibold text-slate-900 truncate text-base">
              {entry.fiche.libelle_article || 'Libellé inconnu'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              <span className="text-slate-400">Bloquée : </span>
              <span className="font-semibold text-slate-700">{entry.blockingStep || '—'}</span>
            </p>
          </div>
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-border flex items-center justify-between">
          <span className="text-xs text-slate-500">
            DE : {entry.de?.code_projet || '—'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2.5 transition-all">
            Ouvrir
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
