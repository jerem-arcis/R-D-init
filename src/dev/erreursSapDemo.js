// Jeu de données de DÉMO pour le suivi des créations SAP.
//
// ⚠️ DEV UNIQUEMENT — utilisé par `useErreursSap` seulement sous
// `import.meta.env.DEV` quand Dataverse ne renvoie rien (ou erreur). Permet de voir
// la page Admin → Créations SAP en local (`npm run dev`) SANS publier. En prod, les
// vraies données Dataverse priment toujours. Ne touche à aucune donnée réelle.
//
// Les lignes ont la forme normalisée produite par `@/api/gestionErreurs` (toRow) ;
// les projets celle de `@/api/projet` (toListShape). Le rapprochement se fait par
// code chapeau, comme en réel.

// Aujourd'hui = 2026-08-04 (cohérent avec les KPIs 7 jours).
const iso = (s) => new Date(s).toISOString();

const paramFor = (ref, designation, usine) =>
  JSON.stringify({
    entity: 'A_Product',
    'entryInput/Product': ref,
    'entryInput/ProductType': 'PFIN',
    'entryInput/to_Description/results': [
      { Language: 'EN', ProductDescription: designation },
      { Language: 'FR', ProductDescription: designation },
    ],
    'entryInput/to_Valuation/results': [{ ValuationArea: usine }],
  });

// Payload « stockage » (A_ProductStorage).
const paramStorage = (ref) =>
  JSON.stringify({
    entity: 'A_ProductStorage',
    'entryInput/Product': ref,
    'entryInput/StorageConditions': 'SU',
    'entryInput/MinRemainingShelfLife': 3,
    'entryInput/TotalShelfLife': 12,
  });

// Payload « caractéristique de classification » (Z_ProductCharcValueSet).
const paramCharc = (ref) =>
  JSON.stringify({
    relativePath: '/Z_ProductCharcValueSet',
    'entryInput/httpMethod': 'POST',
    bypassMetadata: true,
    'entryInput/payload': {
      Charact: 'SDBSASM',
      Product: ref,
      Classnum: 'SDCLBSALOG',
      Classtype: '001',
      Objecttable: 'MARA',
      CharactDescr: 'MBSA type de support',
      ValueChar: '1',
    },
  });

export const demoErreurRows = [
  // 809201 — Cookie protéiné : Vue vente + Classification en erreur -> Échec
  {
    id: 'seed-e1', reference: '000000000000809201', vue: 'Vue vente',
    codeErreurSap: 'MVKE-MTPOS',
    messageErreur:
      "Le groupe de types de postes n'a pas été transmis pour la vue vente : cette vue n'a pas été créée dans SAP.",
    statutTraitement: 'Nouvelle', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000809201', 'Cookie protéiné-PICARD', '2802'),
    createdOn: iso('2026-08-03T09:14:00'), createdBy: 'stephane.delcroix', codeChapeau: 'C809201',
  },
  {
    id: 'seed-e2', reference: '000000000000809201', vue: 'Classification',
    codeErreurSap: 'SDBSAMQ',
    messageErreur: "La caractéristique logistique n'a pas pu être valorisée sur l'article.",
    statutTraitement: 'Nouvelle', statutCode: 'DE', entite: 'Z_ProductCharcValueSet',
    parametre: paramCharc('000000000000809201'),
    createdOn: iso('2026-08-03T09:14:00'), createdBy: 'stephane.delcroix', codeChapeau: 'C809201',
  },
  {
    id: 'seed-e2b', reference: '000000000000809201', vue: 'Données de base',
    codeErreurSap: 'M3',
    messageErreur: "Entrez un type d'article.",
    statutTraitement: 'Nouvelle', statutCode: 'DE', entite: 'A_ProductStorage',
    parametre: paramStorage('000000000000809201'),
    createdOn: iso('2026-08-03T09:14:00'), createdBy: 'stephane.delcroix', codeChapeau: 'C809201',
  },

  // 905414 — Tartelette Rose : Vue vente corrigée + Emballage nouvelle -> Partielle
  {
    id: 'seed-e3', reference: '000000000000905414', vue: 'Vue vente',
    codeErreurSap: 'MVKE-VKORG',
    messageErreur: "Organisation commerciale manquante : la vue vente n'a pas été créée.",
    statutTraitement: 'Corrigee', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000905414', 'Tartelette Rose St Valentin-PICARD', '2847'),
    createdOn: iso('2026-08-03T08:52:00'), createdBy: 'stephane.delcroix', codeChapeau: 'C905414',
  },
  {
    id: 'seed-e4', reference: '000000000000905414', vue: 'Emballage',
    codeErreurSap: 'MARM-UMREZ',
    messageErreur: "Le facteur de conversion d'unité est absent pour l'unité de vente.",
    statutTraitement: 'Nouvelle', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000905414', 'Tartelette Rose St Valentin-PICARD', '2847'),
    createdOn: iso('2026-08-03T08:52:00'), createdBy: 'stephane.delcroix', codeChapeau: 'C905414',
  },

  // 404501 — corrigée -> Réussie
  {
    id: 'seed-e5', reference: '000000000000404501', vue: 'Classification',
    codeErreurSap: 'SDBSAMQ',
    messageErreur: 'Caractéristique logistique désormais valorisée.',
    statutTraitement: 'Corrigee', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000404501', 'Tarte Rose Fête des mères-PICARD', '2833'),
    createdOn: iso('2026-08-02T17:30:00'), createdBy: 'yannick.trouvay', codeChapeau: 'C404501',
  },

  // 404502 — ignorée -> Réussie
  {
    id: 'seed-e6', reference: '000000000000404502', vue: 'Vue vente',
    codeErreurSap: 'MVKE-MTPOS',
    messageErreur: 'Type de poste non requis pour ce circuit - anomalie ignorée.',
    statutTraitement: 'Ignoree', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000404502', '2 x Tartelettes Tatin -U', '2802'),
    createdOn: iso('2026-08-02T16:05:00'), createdBy: 'yannick.trouvay', codeChapeau: 'C404502',
  },

  // 807710 — corrigée -> Réussie
  {
    id: 'seed-e7', reference: '000000000000807710', vue: 'Emballage',
    codeErreurSap: 'MARM-UMREZ',
    messageErreur: "Facteur de conversion corrigé pour l'unité U.",
    statutTraitement: 'Corrigee', statutCode: 'DE', entite: 'A_Product',
    parametre: paramFor('000000000000807710', 'Cookie Ube BVP pour Coop -COOP Suisse', '2886'),
    createdOn: iso('2026-08-02T11:47:00'), createdBy: 'daniel.deoliveira', codeChapeau: 'C807710',
  },
];

// Projets de démo (rapprochés par code chapeau) — fournissent code projet, usine
// validée, désignation et demandeur, comme la vraie table cr04e_projet.
// `flux` = { de, fl } : statut TEXTE posé par le flux ('reussi' / 'erreur',
// absent = jamais envoyé). Reflète les colonnes cr04e_fluxenvoiede/fl.
const projet = (code_chapeau, code_projet, designation_article, usine_validee, demandeur, created_date, flux = {}) => ({
  id: `seed-p-${code_chapeau}`,
  type_de: 'de',
  code_projet,
  designation_article,
  demandeur,
  usine_validee,
  reseau: '',
  statut: 'dl_validee',
  code_chapeau,
  created_date: iso(created_date),
  ...(('de' in flux) ? { flux_envoi_de: flux.de } : {}),
  ...(('fl' in flux) ? { flux_envoi_fl: flux.fl } : {}),
});

export const demoProjets = [
  // Envois en erreur (ont aussi des lignes dans le journal d'erreurs).
  projet('C809201', 'PJ5996', 'Cookie protéiné-PICARD', '2802', 'stephane.delcroix', '2026-08-01T09:00:00', { de: 'erreur' }),
  projet('C905414', 'PJ6002', 'Tartelette Rose St Valentin-PICARD', '2847', 'stephane.delcroix', '2026-08-01T09:00:00', { de: 'erreur' }),
  // Réussis côté DE (corrigés / ignorés).
  projet('C404501', 'PJ5972', 'Tarte Rose Fête des mères-PICARD', '2833', 'yannick.trouvay', '2026-07-30T09:00:00', { de: 'reussi' }),
  projet('C404502', 'PJ5891', '2 x Tartelettes Tatin -U', '2802', 'yannick.trouvay', '2026-07-30T09:00:00', { de: 'reussi' }),
  // DE réussie + FL réussie.
  projet('C807710', 'PJ6022', 'Cookie Ube BVP pour Coop -COOP Suisse', '2886', 'daniel.deoliveira', '2026-07-29T09:00:00', { de: 'reussi', fl: 'reussi' }),
  // Réussite 100% propre : AUCUNE ligne d'erreur, mais visible en vert (project-driven).
  projet('C660120', 'PJ6050', 'Éclair Vanille bio -CARREFOUR', '2823', 'alice.martin', '2026-08-03T14:00:00', { de: 'reussi' }),
  // FL en erreur, DE réussie.
  projet('C660121', 'PJ6051', 'Financier Amande -CARREFOUR', '2823', 'alice.martin', '2026-08-03T15:00:00', { de: 'reussi', fl: 'erreur' }),
];
