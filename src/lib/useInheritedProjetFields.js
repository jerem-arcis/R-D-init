import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProjets } from '@/api/projet';

// Re-remonte sur la FL les champs hérités du projet Dataverse lié (retrouvé par
// code chapeau) : centre de profit, hiérarchie produit, date de la demande.
// Dataverse fait foi : toListShape expose déjà les libellés formatés des lookups
// (FormattedValue) ; on n'écrit sur la FL que lorsqu'ils diffèrent → converge sans
// boucle (après écriture + refetch, la FL porte la valeur, plus rien à écrire).
// Couvre les FL matérialisées avant le branchement et les lookups renseignés
// après coup. Partagé par les 2 vues (Vue par service / Vue complète).
export function useInheritedProjetFields(fiche, onPatch) {
  const { data: projet } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
    enabled: !!fiche?.code_chapeau,
    select: (list) => list.find((p) => p.code_chapeau === fiche.code_chapeau) || null,
  });

  useEffect(() => {
    if (!projet || !fiche) return;
    const patch = {};
    if (projet.centre_profit && projet.centre_profit !== fiche.centre_profit) {
      patch.centre_profit = projet.centre_profit;
    }
    if (
      projet.hierarchie_produit_famille &&
      projet.hierarchie_produit_famille !== fiche.hierarchie_produit
    ) {
      patch.hierarchie_produit = projet.hierarchie_produit_famille;
    }
    if (projet.date_demande && projet.date_demande !== fiche.date_demande) {
      patch.date_demande = projet.date_demande;
    }
    if (Object.keys(patch).length) onPatch(patch);
  }, [projet, fiche]); // eslint-disable-line react-hooks/exhaustive-deps
}
