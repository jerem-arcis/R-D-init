import { describe, it, expect } from 'vitest';
import {
  stripLeadingZeros,
  parseParametre,
  extractParametre,
  matchVue,
  sapTablePrefix,
  resolveVue,
  flattenParametre,
  buildChecklist,
  buildCreations,
  computeResultat,
  computeKpis,
  isStatutResolu,
  joinCodeProjet,
  fluxStatut,
  resolveFluxOutcome,
  buildSuiviFlux,
} from './erreursSap';

const projetsFixture = [
  { code_chapeau: '810501', code_projet: 'PJ4987', designation_article: 'Tarte', usine_validee: 'AGEN', demandeur: 'Alice' },
];

describe('joinCodeProjet', () => {
  it('associe le code projet par référence article (match direct)', () => {
    const out = joinCodeProjet([{ reference: '810501', referenceRaw: '810501' }], projetsFixture);
    expect(out[0].codeProjet).toBe('PJ4987');
    expect(out[0].designation).toBe('Tarte');
    expect(out[0].usine).toBe('AGEN');
    expect(out[0].demandeur).toBe('Alice');
  });

  it('normalise les zéros de tête du journal (000000810501 -> 810501)', () => {
    const out = joinCodeProjet([{ reference: '810501', referenceRaw: '000000810501' }], projetsFixture);
    expect(out[0].codeProjet).toBe('PJ4987');
  });

  it('projet introuvable -> codeProjet vide, repli sur valeurs existantes', () => {
    const out = joinCodeProjet(
      [{ reference: '999', referenceRaw: '999', designation: 'Extrait', usine: 'X', demandeur: 'Bob' }],
      projetsFixture,
    );
    expect(out[0].codeProjet).toBe('');
    expect(out[0].designation).toBe('Extrait');
    expect(out[0].usine).toBe('X');
    expect(out[0].demandeur).toBe('Bob');
  });
});

// Paramètre envoyé réel (extrait de la demande) : JSON à plat, clés « entryInput/... ».
const PARAM = JSON.stringify({
  entity: 'A_Product',
  relativePath: '/',
  'entryInput/Product': '000000000000810501',
  'entryInput/ProductType': 'PFIN',
  'entryInput/NetWeight': '6.123',
  'entryInput/ProductGroup': 'PF-A',
  'entryInput/to_Description/results': [
    { Product: '000000000000810501', Language: 'EN', ProductDescription: 'Test power automate' },
    { Product: '000000000000810501', Language: 'FR', ProductDescription: 'Croissant beurre test' },
  ],
  'entryInput/to_Valuation/results': [
    { Product: '000000000000810501', ValuationArea: '2823', ValuationClass: '7038' },
  ],
});

describe('stripLeadingZeros', () => {
  it('retire les zéros de tête', () => {
    expect(stripLeadingZeros('000000000000810501')).toBe('810501');
  });
  it('gère les valeurs vides / nulles', () => {
    expect(stripLeadingZeros('')).toBe('');
    expect(stripLeadingZeros(null)).toBe('');
    expect(stripLeadingZeros(undefined)).toBe('');
  });
  it('ne vide pas une valeur uniquement composée de zéros', () => {
    expect(stripLeadingZeros('0000')).toBe('0');
  });
});

describe('parseParametre / extractParametre', () => {
  it('parse un JSON valide et renvoie null si illisible', () => {
    expect(parseParametre(PARAM)).toMatchObject({ entity: 'A_Product' });
    expect(parseParametre('pas du json')).toBeNull();
    expect(parseParametre('')).toBeNull();
  });

  it('extrait désignation (FR prioritaire), usine (ValuationArea) et entité', () => {
    const x = extractParametre(PARAM);
    expect(x.entity).toBe('A_Product');
    expect(x.product).toBe('000000000000810501');
    expect(x.designation).toBe('Croissant beurre test'); // FR gagne sur EN
    expect(x.usine).toBe('2823');
  });

  it('retombe sur la 1re description si pas de FR', () => {
    const raw = JSON.stringify({
      'entryInput/to_Description/results': [
        { Language: 'EN', ProductDescription: 'Only english' },
      ],
    });
    expect(extractParametre(raw).designation).toBe('Only english');
  });

  it('tolère un paramètre absent', () => {
    expect(extractParametre(null)).toEqual({});
    expect(extractParametre('{bad')).toEqual({});
  });
});

describe('flattenParametre', () => {
  it('aplatit A_Product : retire entryInput/, déplie descriptions et valorisation', () => {
    const pairs = flattenParametre(PARAM);
    const map = Object.fromEntries(pairs.map((p) => [p.key, p.value]));
    expect(map.entity).toBe('A_Product');
    expect(map.Product).toBe('000000000000810501');
    expect(map.ProductType).toBe('PFIN');
    expect(map['to_Description/results[1].ProductDescription']).toBe('Croissant beurre test');
    expect(map['to_Valuation/results[0].ValuationArea']).toBe('2823');
  });

  it('aplatit A_ProductStorage', () => {
    const raw = JSON.stringify({
      entity: 'A_ProductStorage',
      'entryInput/Product': '000000000000810601',
      'entryInput/StorageConditions': 'SU',
      'entryInput/MinRemainingShelfLife': 3,
      'entryInput/TotalShelfLife': 12,
    });
    const map = Object.fromEntries(flattenParametre(raw).map((p) => [p.key, p.value]));
    expect(map.entity).toBe('A_ProductStorage');
    expect(map.StorageConditions).toBe('SU');
    expect(map.MinRemainingShelfLife).toBe('3');
  });

  it('aplatit Z_ProductCharcValueSet (payload imbriqué)', () => {
    const raw = JSON.stringify({
      relativePath: '/Z_ProductCharcValueSet',
      'entryInput/httpMethod': 'POST',
      bypassMetadata: true,
      'entryInput/payload': {
        Charact: 'SDBSASM',
        Product: '000000000000810601',
        Objecttable: 'MARA',
        ValueChar: '1',
      },
    });
    const map = Object.fromEntries(flattenParametre(raw).map((p) => [p.key, p.value]));
    expect(map['payload.Charact']).toBe('SDBSASM');
    expect(map['payload.Objecttable']).toBe('MARA');
    expect(map.httpMethod).toBe('POST');
    expect(map.bypassMetadata).toBe('true');
  });

  it('tolère un paramètre vide/illisible', () => {
    expect(flattenParametre(null)).toEqual([]);
    expect(flattenParametre('{bad')).toEqual([]);
  });
});

describe('matchVue', () => {
  it('reconnaît les vues canoniques par mots-clés', () => {
    expect(matchVue('Vue vente')).toBe('vue_vente');
    expect(matchVue('SALES')).toBe('vue_vente');
    expect(matchVue('Données de base')).toBe('donnees_base');
    expect(matchVue('Classification')).toBe('classification');
    expect(matchVue('Division et planification')).toBe('division');
  });
  it('renvoie null pour une vue inconnue', () => {
    expect(matchVue('Truc bidon')).toBeNull();
    expect(matchVue('')).toBeNull();
  });
});

describe('sapTablePrefix', () => {
  it('extrait le nom de table SAP avant le tiret', () => {
    expect(sapTablePrefix('MVKE-MTPOS')).toBe('MVKE');
    expect(sapTablePrefix('marc-dismm')).toBe('MARC');
    expect(sapTablePrefix('MARM_UMREZ')).toBe('MARM');
  });
  it('renvoie vide sans forme TABLE-CHAMP', () => {
    expect(sapTablePrefix('SDBSAMQ')).toBe('');
    expect(sapTablePrefix('')).toBe('');
    expect(sapTablePrefix(null)).toBe('');
  });
});

describe('resolveVue', () => {
  it('déduit la vue du préfixe de table SAP (prioritaire)', () => {
    expect(resolveVue({ codeErreurSap: 'MVKE-MTPOS' })).toBe('vue_vente');
    expect(resolveVue({ codeErreurSap: 'MARC-DISMM' })).toBe('division');
    expect(resolveVue({ codeErreurSap: 'MARA-MTART' })).toBe('donnees_base');
    expect(resolveVue({ codeErreurSap: 'MARM-UMREZ' })).toBe('emballage');
    expect(resolveVue({ codeErreurSap: 'MBEW-STPRS' })).toBe('valorisation');
  });
  it('détecte la classification via le message quand pas de préfixe', () => {
    expect(
      resolveVue({ codeErreurSap: 'SDBSAMQ', messageErreur: "La caractéristique n'a pas été valorisée." }),
    ).toBe('classification');
  });
  it('le préfixe SAP prime sur un cr04e_vue trompeur (= entité)', () => {
    // vue = 'A_Product' (nom de l'entité), mais le code dit clairement Vue vente.
    expect(resolveVue({ vue: 'A_Product', codeErreurSap: 'MVKE-MTPOS' })).toBe('vue_vente');
  });
  it('retombe sur cr04e_vue si ni préfixe ni classification', () => {
    expect(resolveVue({ vue: 'Vue vente' })).toBe('vue_vente');
  });
  it('renvoie null si rien n’est exploitable', () => {
    expect(resolveVue({ vue: 'A_Product' })).toBeNull();
  });
});

describe('computeResultat', () => {
  const err = (statutTraitement) => ({ statutTraitement });
  it('Réussie quand tout est corrigé/ignoré', () => {
    expect(computeResultat([err('Corrigee'), err('Ignoree')])).toBe('reussie');
  });
  it('Échec quand rien n’est résolu', () => {
    expect(computeResultat([err('Nouvelle'), err('PriseEnCompte')])).toBe('echec');
  });
  it('Partielle quand c’est mélangé', () => {
    expect(computeResultat([err('Corrigee'), err('Nouvelle')])).toBe('partielle');
  });
  it('traite les valeurs inconnues comme non résolues', () => {
    expect(computeResultat([err('Bidon')])).toBe('echec');
  });
});

describe('isStatutResolu', () => {
  it('Corrigee / Ignoree sont résolus, le reste non', () => {
    expect(isStatutResolu('Corrigee')).toBe(true);
    expect(isStatutResolu('Ignoree')).toBe(true);
    expect(isStatutResolu('Nouvelle')).toBe(false);
    expect(isStatutResolu('inconnu')).toBe(false);
  });
});

describe('buildChecklist', () => {
  it('marque en erreur les vues touchées, neutre les autres', () => {
    const steps = buildChecklist([
      { vue: 'Vue vente', messageErreur: 'x' },
      { vue: 'Classification', messageErreur: 'y' },
    ]);
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));
    expect(byKey.vue_vente).toBe('erreur');
    expect(byKey.classification).toBe('erreur');
    expect(byKey.donnees_base).toBe('neutre');
    expect(byKey.emballage).toBe('neutre');
  });

  it('regroupe les lignes non rattachées sous une seule étape « Autre »', () => {
    const steps = buildChecklist([
      { vue: 'M3', codeErreurSap: 'M3', messageErreur: 'z' },
      { vue: 'MG', codeErreurSap: 'MG', messageErreur: 'w' },
    ]);
    const autres = steps.filter((s) => s.key === 'autre');
    expect(autres).toHaveLength(1);
    expect(autres[0].label).toBe('Autre');
    expect(autres[0].status).toBe('erreur');
    expect(autres[0].errors).toHaveLength(2);
  });

  it('rattache via le préfixe de code erreur même si cr04e_vue = entité', () => {
    const steps = buildChecklist([
      { vue: 'A_Product', codeErreurSap: 'MVKE-MTPOS', messageErreur: 'x' },
      { vue: 'A_Product', codeErreurSap: 'SDBSAMQ', messageErreur: 'caractéristique manquante' },
    ]);
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));
    expect(byKey.vue_vente).toBe('erreur');
    expect(byKey.classification).toBe('erreur');
    // Pas d'étape « A_Product » parasite en fin de liste.
    expect(steps.some((s) => s.label === 'A_Product')).toBe(false);
  });
});

describe('buildCreations', () => {
  const rows = [
    {
      id: '1', reference: '000000000000810501', vue: 'Vue vente',
      codeErreurSap: 'MVKE-MTPOS', messageErreur: 'Zone obligatoire vide',
      statutTraitement: 'Nouvelle', entite: 'A_Product', parametre: PARAM,
      createdOn: '2026-08-03T09:14:00Z', createdBy: 'stephane.delcroix', codeChapeau: '748401',
    },
    {
      id: '2', reference: '000000000000810501', vue: 'Classification',
      codeErreurSap: 'SDBSAMQ', messageErreur: 'Caractéristique non valorisée',
      statutTraitement: 'Corrigee', entite: 'A_Product', parametre: PARAM,
      createdOn: '2026-08-03T09:15:00Z', createdBy: 'stephane.delcroix', codeChapeau: '748401',
    },
    {
      id: '3', reference: '000000000000905414', vue: 'Vue vente',
      codeErreurSap: 'X', messageErreur: 'autre', statutTraitement: 'Corrigee',
      entite: 'A_Product', parametre: null,
      createdOn: '2026-08-02T08:52:00Z', createdBy: 'yannick.trouvay', codeChapeau: '905000',
    },
  ];

  it('regroupe par référence (zéros retirés)', () => {
    const creations = buildCreations(rows);
    expect(creations).toHaveLength(2);
    const c1 = creations.find((c) => c.reference === '810501');
    expect(c1.errors).toHaveLength(2);
    expect(c1.referenceRaw).toBe('000000000000810501');
  });

  it('enrichit depuis le paramètre envoyé (désignation, usine) et l’entité', () => {
    const c1 = buildCreations(rows).find((c) => c.reference === '810501');
    expect(c1.designation).toBe('Croissant beurre test');
    expect(c1.usine).toBe('2823');
    expect(c1.entite).toBe('A_Product');
    expect(c1.demandeur).toBe('stephane.delcroix');
    expect(c1.codeChapeau).toBe('748401');
  });

  it('calcule le résultat agrégé par création', () => {
    const creations = buildCreations(rows);
    const c1 = creations.find((c) => c.reference === '810501'); // Nouvelle + Corrigee
    const c2 = creations.find((c) => c.reference === '905414'); // Corrigee seul
    expect(c1.resultat).toBe('partielle');
    expect(c2.resultat).toBe('reussie');
  });

  it('prend la date de création la plus récente du groupe', () => {
    const c1 = buildCreations(rows).find((c) => c.reference === '810501');
    expect(c1.createdOn).toBe('2026-08-03T09:15:00Z');
  });
});

describe('fluxStatut', () => {
  it('texte écrit par le flux : réussi / erreur (insensible casse et espaces)', () => {
    expect(fluxStatut('reussi')).toBe('reussi');
    expect(fluxStatut('réussi')).toBe('reussi');
    expect(fluxStatut('erreur')).toBe('erreur');
    expect(fluxStatut('ERREUR')).toBe('erreur');
    expect(fluxStatut(' erreur ')).toBe('erreur');
  });
  it('accepte aussi 0 = réussi, 1 = erreur', () => {
    expect(fluxStatut('0')).toBe('reussi');
    expect(fluxStatut('1')).toBe('erreur');
  });
  it('tolère un booléen (false = réussi, true = erreur)', () => {
    expect(fluxStatut(false)).toBe('reussi');
    expect(fluxStatut(true)).toBe('erreur');
  });
  it('vide / non renseigné -> null', () => {
    expect(fluxStatut('')).toBeNull();
    expect(fluxStatut('   ')).toBeNull();
    expect(fluxStatut(undefined)).toBeNull();
    expect(fluxStatut(null)).toBeNull();
  });
  it('valeur inconnue -> null (pas de faux statut affiché)', () => {
    expect(fluxStatut('bidon')).toBeNull();
  });
});

describe('resolveFluxOutcome (polling envoi FL)', () => {
  const T0 = '2026-09-14T10:00:00Z';
  const T1 = '2026-09-14T10:03:00Z';

  it('modifiedon inchangé -> pending (le flux n\'a rien écrit)', () => {
    expect(resolveFluxOutcome(T0, { modifiedon: T0, flux: '' })).toBe('pending');
    // Même si une ancienne valeur de flux traîne, sans changement -> pending.
    expect(resolveFluxOutcome(T0, { modifiedon: T0, flux: 'erreur' })).toBe('pending');
  });

  it('modifiedon changé + statut lisible -> réussi / erreur', () => {
    expect(resolveFluxOutcome(T0, { modifiedon: T1, flux: 'reussi' })).toBe('reussi');
    expect(resolveFluxOutcome(T0, { modifiedon: T1, flux: 'erreur' })).toBe('erreur');
  });

  it('modifiedon changé mais statut encore vide -> pending (écriture intermédiaire)', () => {
    expect(resolveFluxOutcome(T0, { modifiedon: T1, flux: '' })).toBe('pending');
    expect(resolveFluxOutcome(T0, { modifiedon: T1, flux: null })).toBe('pending');
  });

  it('ré-envoi : flux valait déjà « erreur », le changement de modifiedon permet de reconclure', () => {
    // baseline = T1 (modifiedon au moment du ré-envoi) ; le flux réécrit -> T2.
    const T2 = '2026-09-14T10:06:00Z';
    expect(resolveFluxOutcome(T1, { modifiedon: T2, flux: 'reussi' })).toBe('reussi');
    // tant que modifiedon reste à T1, on n'a pas reconclu sur l'ancienne erreur.
    expect(resolveFluxOutcome(T1, { modifiedon: T1, flux: 'erreur' })).toBe('pending');
  });

  it('baseline null (modifiedon inconnu au départ) : tout modifiedon non vide compte comme changement', () => {
    expect(resolveFluxOutcome(null, { modifiedon: T1, flux: 'reussi' })).toBe('reussi');
    expect(resolveFluxOutcome(null, { modifiedon: null, flux: 'reussi' })).toBe('pending');
  });
});

describe('buildSuiviFlux', () => {
  const creationsFixture = [
    { reference: '810501', referenceRaw: '000000000000810501', errors: [{ id: 'e1' }], resultat: 'echec' },
  ];

  it('ne garde que les projets ayant une valeur de flux (DE ou FL)', () => {
    const projets = [
      { id: 'p1', code_chapeau: '810501', flux_envoi_de: 'erreur' },
      { id: 'p2', code_chapeau: '900000' }, // aucune valeur -> exclu
      { id: 'p3', code_chapeau: '900001', flux_envoi_fl: 'reussi' },
    ];
    const rows = buildSuiviFlux(projets, []);
    expect(rows.map((r) => r.id)).toEqual(['p1', 'p3']);
  });

  it('un flux à chaîne vide ne suffit pas à afficher le projet', () => {
    const projets = [{ id: 'p1', code_chapeau: '1', flux_envoi_de: '', flux_envoi_fl: '' }];
    expect(buildSuiviFlux(projets, [])).toEqual([]);
  });

  it('mappe fluxDe / fluxFl en réussi/erreur/null', () => {
    const projets = [
      { id: 'p1', code_chapeau: '1', flux_envoi_de: 'reussi', flux_envoi_fl: 'erreur' },
      { id: 'p2', code_chapeau: '2', flux_envoi_de: 'erreur' }, // fl non renseigné
    ];
    const rows = buildSuiviFlux(projets, []);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.p1.fluxDe).toBe('reussi');
    expect(byId.p1.fluxFl).toBe('erreur');
    expect(byId.p2.fluxDe).toBe('erreur');
    expect(byId.p2.fluxFl).toBeNull();
  });

  it('rattache la création d’erreurs par code chapeau (zéros de tête tolérés)', () => {
    const projets = [{ id: 'p1', code_chapeau: '810501', flux_envoi_de: 'erreur' }];
    const rows = buildSuiviFlux(projets, creationsFixture);
    expect(rows[0].creation).toBe(creationsFixture[0]);
    expect(rows[0].creation.errors).toHaveLength(1);
  });

  it('creation = null quand aucun journal d’erreur ne correspond (réussi propre)', () => {
    const projets = [{ id: 'p1', code_chapeau: '999', flux_envoi_de: 'reussi' }];
    const rows = buildSuiviFlux(projets, creationsFixture);
    expect(rows[0].creation).toBeNull();
  });

  it('expose les métadonnées projet et traite une DS comme la DE (même colonne)', () => {
    const projets = [
      { id: 'p1', code_chapeau: '810501', code_projet: 'PJ1', designation_article: 'Tarte', usine_validee: 'AGEN', demandeur: 'Alice', type_de: 'ds', flux_envoi_de: 'erreur' },
    ];
    const [row] = buildSuiviFlux(projets, []);
    expect(row).toMatchObject({
      codeProjet: 'PJ1', codeChapeau: '810501', designation: 'Tarte', usine: 'AGEN', demandeur: 'Alice', fluxDe: 'erreur',
    });
  });

  it('trie les plus récents d’abord (created_date desc)', () => {
    const projets = [
      { id: 'old', code_chapeau: '1', flux_envoi_de: 'reussi', created_date: '2026-08-01T00:00:00Z' },
      { id: 'new', code_chapeau: '2', flux_envoi_de: 'reussi', created_date: '2026-08-10T00:00:00Z' },
    ];
    const rows = buildSuiviFlux(projets, []);
    expect(rows.map((r) => r.id)).toEqual(['new', 'old']);
  });
});

describe('computeKpis', () => {
  const now = new Date('2026-08-04T12:00:00Z');
  const creations = [
    { createdOn: '2026-08-03T09:00:00Z', resultat: 'echec' },
    { createdOn: '2026-08-02T09:00:00Z', resultat: 'reussie' },
    { createdOn: '2026-08-02T09:00:00Z', resultat: 'partielle' },
    { createdOn: '2026-07-01T09:00:00Z', resultat: 'reussie' }, // hors 7 jours
    { createdOn: null, resultat: 'echec' }, // sans date -> ignoré
  ];

  it('compte les créations des 7 derniers jours par résultat', () => {
    const kpis = computeKpis(creations, { now, days: 7 });
    expect(kpis.total).toBe(3);
    expect(kpis.reussies).toBe(1);
    expect(kpis.partielle).toBe(1);
    expect(kpis.echec).toBe(1);
  });
});
