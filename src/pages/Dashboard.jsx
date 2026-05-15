import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarOff, Radar, RotateCcw } from 'lucide-react';
import { buildAlertEntries, summarize } from '@/lib/launchAlert';
import { resetMockDemoData } from '@/lib/mockSeed';
import { Button } from '@/components/ui/button';
import RadarHero from '@/components/dashboard/RadarHero';
import CriticalCard from '@/components/dashboard/CriticalCard';
import LaunchTimeline from '@/components/dashboard/LaunchTimeline';

const FADE_UP_KEYFRAMES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export default function Dashboard() {
  const qc = useQueryClient();

  const handleReset = () => {
    if (!window.confirm('Recharger les données de démo ? Toutes les fiches et demandes actuelles seront remplacées.')) return;
    resetMockDemoData();
    qc.invalidateQueries();
  };

  const fichesQuery = useQuery({
    queryKey: ['fiches'],
    queryFn: () => base44.entities.FicheLancement.list('-created_date'),
  });
  const desQuery = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });

  const isLoading = fichesQuery.isLoading || desQuery.isLoading;
  const fiches = fichesQuery.data || [];
  const des = desQuery.data || [];

  const { entries, unplanned, summary, criticalEntries, totalActive } = useMemo(() => {
    const { entries, unplanned } = buildAlertEntries(fiches, des);
    const summary = summarize(entries);

    // On garde jusqu'à 3 cartes : d'abord critiques, complétées par les imminentes.
    const critical = entries.filter((e) => e.bucket.isCritical);
    const fillers = entries.filter(
      (e) => !e.bucket.isCritical && e.bucket.key !== 'lancee'
    );
    const criticalEntries = [...critical, ...fillers].slice(0, 3);

    const totalActive = entries.filter((e) => e.bucket.key !== 'lancee').length;

    return { entries, unplanned, summary, criticalEntries, totalActive };
  }, [fiches, des]);

  return (
    <div className="min-h-screen bg-background">
      <style>{FADE_UP_KEYFRAMES}</style>

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(270, 62%, 37%), hsl(38, 80%, 55%))',
                }}
              >
                <Radar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground uppercase tracking-tight leading-tight">
                  Tableau de bord <span className="text-primary">Alerting</span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Lancements suivis par rapport à leur date cible
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="uppercase text-[10px] font-bold tracking-wider"
              title="Remplace toutes les fiches actuelles par 9 fiches d'exemple réparties dans tous les buckets"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Données de démo
            </Button>
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
            <div style={{ animation: 'fadeUp 500ms ease-out both' }}>
              <RadarHero
                critical={summary.critical}
                counts={summary.counts}
                totalActive={totalActive}
              />
            </div>

            {criticalEntries.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
                    À traiter en priorité
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Top {criticalEntries.length} fiche{criticalEntries.length > 1 ? 's' : ''} les plus urgentes
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {criticalEntries.map((e, i) => (
                    <CriticalCard key={e.fiche.id} entry={e} index={i} />
                  ))}
                </div>
              </section>
            )}

            <div style={{ animation: 'fadeUp 600ms ease-out 150ms both' }}>
              <LaunchTimeline entries={entries} />
            </div>

            {unplanned > 0 && (
              <p className="text-xs text-slate-500 flex items-center gap-2 pl-1">
                <CalendarOff className="w-3.5 h-3.5" />
                {unplanned} fiche{unplanned > 1 ? 's' : ''} non planifiée{unplanned > 1 ? 's' : ''} (sans date de lancement renseignée)
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
