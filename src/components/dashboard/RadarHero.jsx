import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, Flame } from 'lucide-react';

const Stat = ({ label, value, Icon, accent }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/15">
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: accent }}
    >
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="leading-tight">
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
        {label}
      </p>
    </div>
  </div>
);

export default function RadarHero({ critical, counts, totalActive }) {
  const allClear = critical === 0;

  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-xl"
      style={{
        background:
          'linear-gradient(120deg, hsl(270, 65%, 22%) 0%, hsl(270, 62%, 37%) 55%, hsl(38, 80%, 55%) 110%)',
      }}
    >
      {/* Halo décoratif */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'hsl(38, 90%, 65%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-25 blur-3xl"
        style={{ background: 'hsl(280, 80%, 50%)' }}
      />

      <div className="relative px-8 py-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/30"
              style={{
                background: allClear
                  ? 'linear-gradient(135deg, hsl(150, 70%, 45%), hsl(160, 70%, 38%))'
                  : 'linear-gradient(135deg, hsl(0, 80%, 60%), hsl(20, 90%, 55%))',
              }}
            >
              {allClear ? (
                <ShieldCheck className="w-8 h-8 text-white" />
              ) : (
                <Flame className="w-8 h-8 text-white" />
              )}
            </div>
            {!allClear && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
              </span>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/70 mb-0.5">
              Radar du jour
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-white leading-none drop-shadow">
                {critical}
              </span>
              <span className="text-lg font-semibold text-white/85">
                {allClear
                  ? 'aucune fiche critique'
                  : critical === 1
                    ? 'fiche critique'
                    : 'fiches critiques'}
              </span>
            </div>
            <p className="text-sm text-white/75 mt-1">
              {allClear
                ? 'Tout est sous contrôle, les lancements à venir sont sereins.'
                : `Sur ${totalActive} fiche${totalActive > 1 ? 's' : ''} active${totalActive > 1 ? 's' : ''}, ${critical} demande${critical > 1 ? 'nt' : ''} ton attention.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
          <Stat label="En retard" value={counts.retard} Icon={AlertTriangle} accent="hsl(0, 75%, 55%)" />
          <Stat label="≤ J-3" value={counts.critique} Icon={Flame} accent="hsl(15, 85%, 55%)" />
          <Stat label="≤ J-7" value={counts.imminent} Icon={Clock} accent="hsl(35, 90%, 55%)" />
        </div>
      </div>
    </section>
  );
}
