import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listErreurs } from '@/api/gestionErreurs';
import { listProjets } from '@/api/projet';
import { buildCreations, computeKpis, joinCodeProjet, buildSuiviFlux } from '@/lib/erreursSap';
// DEV uniquement : repli démo quand Dataverse ne renvoie rien (voir la page sans
// publier). Jamais activé en prod (import.meta.env.DEV === false).
import { demoErreurRows, demoProjets } from '@/dev/erreursSapDemo';

export const GESTION_ERREURS_QUERY_KEY = ['gestion-erreurs'];
export const PROJETS_QUERY_KEY = ['projets'];

// Hook principal du suivi des créations SAP. Charge les erreurs et les projets, puis
// regroupe/enrichit/calcule les KPIs. Recalcul mémoïsé sur les données brutes.
export function useErreursSap() {
  const erreursQ = useQuery({
    queryKey: GESTION_ERREURS_QUERY_KEY,
    queryFn: listErreurs,
  });
  const projetsQ = useQuery({
    queryKey: PROJETS_QUERY_KEY,
    queryFn: listProjets,
  });

  // Repli démo (DEV) : uniquement quand la lecture Dataverse a abouti à vide ou a
  // échoué. Le bloc est encapsulé dans `if (import.meta.env.DEV)` pour que le build
  // de prod l'élimine entièrement (code mort) — les données de démo ne sont jamais
  // embarquées ni activées en prod.
  let rows = erreursQ.data;
  let projets = projetsQ.data;
  let demoActif = false;
  if (import.meta.env.DEV) {
    demoActif =
      erreursQ.isError || (erreursQ.isSuccess && (erreursQ.data?.length ?? 0) === 0);
    if (demoActif) {
      rows = demoErreurRows;
      projets = demoProjets;
    }
  }

  const { creations, kpis, suiviFlux, fluxKpis } = useMemo(() => {
    const base = buildCreations(rows ?? []);
    const enriched = joinCodeProjet(base, projets ?? []);
    // Tri : plus récentes d'abord.
    enriched.sort((a, b) => (b.createdOn || '').localeCompare(a.createdOn || ''));
    // Vue project-driven (statut par flux) : pilotée par les projets ayant une
    // valeur de flux, avec le détail d'erreurs rattaché quand c'est rouge.
    const suivi = buildSuiviFlux(projets ?? [], enriched);
    const enErreur = suivi.filter((s) => s.fluxDe === 'erreur' || s.fluxFl === 'erreur').length;
    return {
      creations: enriched,
      kpis: computeKpis(enriched),
      suiviFlux: suivi,
      fluxKpis: { total: suivi.length, enErreur, reussis: suivi.length - enErreur },
    };
  }, [rows, projets]);

  return {
    creations,
    kpis,
    suiviFlux,
    fluxKpis,
    isLoading: erreursQ.isLoading || projetsQ.isLoading,
    // En repli démo, on masque l'erreur Dataverse pour afficher le jeu de démo.
    isError: demoActif ? false : erreursQ.isError,
    error: erreursQ.error,
    isDemo: demoActif,
  };
}
