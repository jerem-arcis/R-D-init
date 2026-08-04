import { describe, it, expect } from 'vitest';
import {
  stripLeadingZeros,
  parseParametre,
  extractParametre,
  matchVue,
  sapTablePrefix,
  resolveVue,
  buildChecklist,
  buildCreations,
  computeResultat,
  computeKpis,
  isStatutResolu,
} from './erreursSap';

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

  it('ajoute en fin de liste les vues inconnues (en erreur)', () => {
    const steps = buildChecklist([{ vue: 'Vue exotique SAP', messageErreur: 'z' }]);
    const extra = steps.find((s) => s.label === 'Vue exotique SAP');
    expect(extra).toBeTruthy();
    expect(extra.status).toBe('erreur');
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
