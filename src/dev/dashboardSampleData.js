// Jeu de données d'EXEMPLE pour le tableau de bord (démo/pré-chiffrage).
// But : montrer un tableau de bord filtrable + graphiques « comme si » l'app
// tournait à pleine charge, AVEC la dimension multi-organisation commerciale
// (VKORG) qui est la cible du projet mais n'existe pas encore côté Dataverse.
//
// Données 100 % fictives, générées de façon DÉTERMINISTE (pas de Math.random au
// runtime) → les graphiques sont stables d'un rendu à l'autre. Même forme de
// champs que cr04e_projet (statut, created_date, code_projet, demandeur,
// designation_article, usine_validee…) + un champ `organisation` en plus.

// Organisations commerciales (VKORG fictifs) — cœur de la vision multi-org.
export const SAMPLE_ORGS = [
  { code: '1000', label: 'France GMS' },
  { code: '2000', label: 'Export' },
  { code: '3000', label: 'RHF' },
];

// Usines (division SAP) — reprend les sites réels + le négoce (DS).
const USINES = [
  { usine: 'Bonloc', division: '2886' },
  { usine: 'Rivesaltes', division: '2866' },
  { usine: 'Agen', division: '2847' },
  { usine: 'Aire', division: '2859' },
];
const USINE_NEGOCE = { usine: 'Produit négoce', division: '2820' };

const DEMANDEURS = [
  'Marie Lefèvre', 'Thomas Bernard', 'Sophie Martin', 'Julien Dubois',
  'Camille Roy', 'Antoine Girard', 'Nadia Bouchard', 'Louis Fontaine',
];

const PRODUITS = [
  'Éclair chocolat 90g', 'Mini-quiche lorraine 30g', 'Macaron pistache 12g',
  'Tarte citron meringuée 6 parts', 'Feuilleté saumon 40g', 'Cannelé bordelais 25g',
  'Croissant pur beurre 55g', 'Pain au chocolat 70g', 'Bouchée apéritive tomate 15g',
  'Tartelette fraise 45g', 'Moelleux caramel 80g', 'Quiche 3 fromages 120g',
  'Chausson aux pommes 90g', 'Financier amande 30g', 'Mini-club sandwich',
  'Tarte fine pommes 4 parts', 'Beignet framboise 65g', 'Verrine mousse citron',
  'Brioche tressée 400g', 'Feuilleté chèvre-miel 40g', 'Millefeuille vanille 100g',
  'Cake marbré tranché 35g', 'Pizza royale 200g', 'Éclair café 90g',
  'Tarte myrtille 6 parts', 'Sablé breton 20g', 'Vol-au-vent volaille 60g',
  'Fondant chocolat cœur coulant',
];

// Statuts pondérés (répartition « réaliste » : plus de validées/en cours que de refus).
const DE_STATUTS = [
  ['de_brouillon', 3], ['de_attente_cc', 3], ['dl_attente_validation_cdg', 3],
  ['dl_validee', 6], ['dl_refusee', 1],
];
const DS_STATUTS = [['ds_brouillon', 2], ['ds_attente_cc', 3], ['ds_validee', 6]];

// Le code chapeau n'est attribué qu'à partir de l'attente de validation CDG.
const A_CODE_CHAPEAU = new Set(['dl_attente_validation_cdg', 'dl_validee', 'dl_refusee', 'ds_validee']);

// Poids par mois (2026-01 → 2026-08) : montée en charge vers les mois récents.
const MONTH_WEIGHTS = [6, 7, 8, 9, 10, 12, 13, 8];

// --- PRNG déterministe (LCG) : exécuté une seule fois à l'import ------------
let _seed = 987654321;
const rnd = () => {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickWeighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [val, w] of pairs) {
    if ((r -= w) <= 0) return val;
  }
  return pairs[pairs.length - 1][0];
};
const pad2 = (n) => String(n).padStart(2, '0');

function buildSample() {
  const rows = [];
  let n = 0;
  MONTH_WEIGHTS.forEach((weight, mIdx) => {
    const month = mIdx + 1; // 1..8
    for (let k = 0; k < weight; k++) {
      const type = rnd() < 0.35 ? 'ds' : 'de';
      const statut = pickWeighted(type === 'ds' ? DS_STATUTS : DE_STATUTS);
      const site = type === 'ds' && rnd() < 0.4 ? USINE_NEGOCE : pick(USINES);
      const org = pick(SAMPLE_ORGS);
      const day = 1 + Math.floor(rnd() * 27);
      const code = 5000 + n;
      const hasCC = A_CODE_CHAPEAU.has(statut);
      rows.push({
        id: `sample-${n}`,
        type_de: type,
        organisation: org.code,
        organisation_label: org.label,
        statut,
        usine_validee: site.usine,
        division: site.division,
        demandeur: pick(DEMANDEURS),
        designation_article: pick(PRODUITS),
        code_projet: `PJ${code}`,
        code_chapeau: hasCC ? String(205000 + n) : '',
        created_date: `2026-${pad2(month)}-${pad2(day)}T10:00:00.000Z`,
        poids_net: Math.round((0.03 + rnd() * 1.2) * 1000) / 1000,
      });
      n++;
    }
  });
  return rows;
}

// Généré une fois — importer `SAMPLE_PROJETS` où besoin.
export const SAMPLE_PROJETS = buildSample();
