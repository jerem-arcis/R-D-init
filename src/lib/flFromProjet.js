// Héritage projet Dataverse (dl_validee) → Fiche de Lancement.
//
// À la matérialisation automatique d'une FL (cf. DemandesEtude.jsx), on préremplit
// ce que Dataverse connaît déjà pour éviter les ressaisies. On reste sur les champs
// FIABLES et directement réutilisables :
//   - identité : code chapeau / code article / désignation / code projet ;
//   - EAN : générés par la règle GS1 existante (src/lib/ean.js), format FL = tableau.
//
// Les champs pilotés par règle (secteur, hiérarchie, classe valo, centre profit…)
// ne sont PAS prérenseignés ici : le projet les stocke en codes bruts alors que la
// FL attend des libellés de liste — mapping à établir avant de les hériter.

import { buildEANSet } from '@/lib/ean';

// Construit les champs FL hérités d'un projet Dataverse.
// `projet` : ligne au format liste (toListShape) — { code_chapeau, code_projet,
//            designation_article, ... }.
// `deLocale` : DE locale éventuelle (localStorage), uniquement en repli désignation
//            et pour relier le brouillon éditable.
export function ficheFromProjet(projet, deLocale = null) {
  const chapeau = projet?.code_chapeau || '';
  const designation =
    projet?.designation_article ||
    deLocale?.designation_article ||
    deLocale?.autre_designation ||
    '';

  const fields = {
    code_article: chapeau,
    code_chapeau: chapeau,
    libelle_article: designation,
    code_etude_rd: projet?.code_projet || '',
    demande_etude_id: deLocale?.id ?? null,
  };

  // EAN : mêmes règles que la DE (préfixe GS1 325151 + 4 premiers chiffres du code
  // chapeau + niveau + clé). buildEANSet renvoie '' si < 4 chiffres → on n'ajoute
  // rien dans ce cas (pas d'EAN faux). Format FL : un tableau par niveau.
  const eans = buildEANSet(chapeau);
  if (eans.ean_couche) {
    fields.ean_couche = [eans.ean_couche];
    fields.ean_carton = [eans.ean_carton];
    fields.ean_palette = [eans.ean_palette];
  }

  return fields;
}
