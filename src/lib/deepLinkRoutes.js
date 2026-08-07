// Table des liens profonds (mails Power Automate) → URL de page interne.
// Pur, sans I/O : `DeepLink.jsx` fournit un lecteur de params et exécute la
// résolution async (code PJ → GUID) et la navigation.

export const FL_SECTIONS = ['supply_chain', 'industriel', 'commerce', 'synthese'];

const enc = encodeURIComponent;

// Construit l'URL FL avec section optionnelle validée.
const flUrl = (guid, section) => {
  const base = `/FicheDetail?id=${enc(guid)}`;
  return FL_SECTIONS.includes(section) ? `${base}&section=${enc(section)}` : base;
};

// Renvoie le 1er route dont le param déclencheur est présent, sinon null.
// Priorité : code_pj (nouveau), puis projet_id / code_chapeau (legacy).
export function matchDeepLink(read) {
  const codePj = read('code_pj');
  if (codePj) {
    const vue = read('vue') === 'de' ? 'de' : 'fl';
    const section = read('section');
    const validSection = FL_SECTIONS.includes(section) ? section : '';
    return {
      ssKey: `deeplink:code_pj:${codePj}:${vue}:${validSection}`,
      value: codePj,
      resolveNeeded: true,
      buildUrl: (guid) =>
        vue === 'de' ? `/CreerDE?projet_id=${enc(guid)}` : flUrl(guid, section),
    };
  }

  const projetId = read('projet_id');
  if (projetId) {
    return {
      ssKey: `deeplink:projet_id:${projetId}`,
      value: projetId,
      resolveNeeded: false,
      buildUrl: (v) => `/CreerDE?projet_id=${enc(v)}`,
    };
  }

  const codeChapeau = read('code_chapeau');
  if (codeChapeau) {
    return {
      ssKey: `deeplink:code_chapeau:${codeChapeau}`,
      value: codeChapeau,
      resolveNeeded: false,
      buildUrl: (v) => `/DemandesEtude?code_chapeau=${enc(v)}`,
    };
  }

  return null;
}
