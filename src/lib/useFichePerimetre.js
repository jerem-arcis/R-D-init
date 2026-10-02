import { usePerimetre } from '@/lib/PerimetreContext';
import { canauxPour, divisionsPour, estAdminDossier, peutModifierBloc, peutVoirDossier } from '@/lib/perimetre';
import { fluxStatut } from '@/lib/erreursSap';
import { buildOptions, useAdminOptions } from '@/lib/adminLists';
import { siteStockageLabel } from '@/lib/ficheSchema';

// Options d'un multi-select : comme buildOptions, mais conserve TOUTES les valeurs
// déjà cochées, même sorties du périmètre (jamais de valeur enregistrée perdue).
function buildMultiOptions(rows, current = [], labelOf = (v) => v) {
  const options = buildOptions(rows);
  for (const v of current || []) {
    if (v && !options.some((o) => o.value === v)) {
      options.push({ value: v, label: labelOf(v), keywords: String(v) });
    }
  }
  return options;
}

// Périmètre appliqué à une FL : droits par bloc + listes déroulantes dépendant de la
// société du dossier (déduite de sa division). Partagé par les deux vues de la FL.
export function useFichePerimetre(fiche) {
  const { perimetre } = usePerimetre();
  const adminOptions = useAdminOptions();
  const division = fiche?.division;

  // Envoi FL -> SAP en erreur : la fiche est figée pour tous, SAUF les admins de la
  // société, qui peuvent corriger tous les champs (malgré les visas) et relancer.
  const envoiEnErreur = fluxStatut(fiche?.flux_envoi_fl) === 'erreur';
  const adminDossier = estAdminDossier(perimetre, division);
  const deblocageAdmin = envoiEnErreur && adminDossier;

  const droit = (owner) => (envoiEnErreur ? adminDossier : peutModifierBloc(perimetre, owner, division));
  const droits = { sc: droit('sc'), ind: droit('ind'), com: droit('com') };

  // Tant que le référentiel des canaux est vide (avant import), on garde l'ancienne
  // liste option-set pour ne pas bloquer le visa Commerce.
  const canauxRows = perimetre?.canaux.length ? canauxPour(perimetre, division) : adminOptions.canaux_distrib;

  return {
    accesAutorise: peutVoirDossier(perimetre, division),
    envoiEnErreur,
    // Admin sur une fiche en erreur : champs modifiables même visés.
    deblocageAdmin,
    // Envoi (ou relance) vers SAP autorisé : toujours hors erreur, admins seuls sinon.
    peutEnvoyerSap: !envoiEnErreur || adminDossier,
    droits,
    // Mêmes clés que VisaToolbar.
    peutViser: { supply_chain: droits.sc, industriel: droits.ind, commerce: droits.com },
    peutModifierUnBloc: droits.sc || droits.ind || droits.com,
    canauxOptions: buildMultiOptions(canauxRows, fiche?.canaux_distribution),
    sitesStockageOptions: buildMultiOptions(
      divisionsPour(perimetre, 'FL', division), fiche?.sites_stockage, siteStockageLabel,
    ),
    // Origine de fabrication = site de production : mêmes divisions que la DE.
    origineFabOptions: buildOptions(divisionsPour(perimetre, 'DE'), fiche?.origine_fabrication),
  };
}
