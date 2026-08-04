import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listErreurs } from '@/api/gestionErreurs';
import { listProjets } from '@/api/projet';
import { buildCreations, computeKpis } from '@/lib/erreursSap';
// DEV uniquement : repli démo quand Dataverse ne renvoie rien (voir la page sans
// publier). Jamais activé en prod (import.meta.env.DEV === false).
import { demoErreurRows, demoProjets } from '@/dev/erreursSapDemo';

export const GESTION_ERREURS_QUERY_KEY = ['gestion-erreurs'];
export const PROJETS_QUERY_KEY = ['projets'];

// Enrichit chaque création avec les infos projet, matchées PAR CONTENU du code
// chapeau (pas une jointure OData : simple correspondance en mémoire, comme demandé).
// Repli sur les valeurs extraites du paramètre envoyé / créateur quand le projet est
// introuvable.
function enrichWithProjet(creations, projets) {
  const byChapeau = new Map();
  for (const p of projets) {
    if (p.code_chapeau) byChapeau.set(String(p.code_chapeau).trim(), p);
  }

  return creations.map((c) => {
    const projet = c.codeChapeau
      ? byChapeau.get(String(c.codeChapeau).trim())
      : undefined;
    return {
      ...c,
      codeProjet: projet?.code_projet || '',
      designation: projet?.designation_article || c.designation || '',
      usine: projet?.usine_validee || c.usine || '',
      demandeur: projet?.demandeur || c.demandeur || '',
    };
  });
}

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

  const { creations, kpis } = useMemo(() => {
    const base = buildCreations(rows ?? []);
    const enriched = enrichWithProjet(base, projets ?? []);
    // Tri : plus récentes d'abord.
    enriched.sort((a, b) => (b.createdOn || '').localeCompare(a.createdOn || ''));
    return { creations: enriched, kpis: computeKpis(enriched) };
  }, [rows, projets]);

  return {
    creations,
    kpis,
    isLoading: erreursQ.isLoading || projetsQ.isLoading,
    // En repli démo, on masque l'erreur Dataverse pour afficher le jeu de démo.
    isError: demoActif ? false : erreursQ.isError,
    error: erreursQ.error,
    isDemo: demoActif,
  };
}
