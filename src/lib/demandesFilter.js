// Filtrage & tri de la liste des Demandes d'Étude / Simplifiées (page DemandesEtude).
// Fonctions PURES (testées dans demandesFilter.test.js) : la page ne fait plus que
// brancher l'état des contrôles dessus. Extrait de DemandesEtude.jsx pour être
// réutilisable et vérifiable sans monter le composant React.

import { normalizeText as normalize } from './utils';
import { codeChapeauAlert } from './deStatus';

// ---- Accès "type-aware" aux champs (DE/DE_DL vs Autre) --------------------
export const getType = (de) => de.type_de || 'de';
export const getDesignation = (de) =>
  getType(de) === 'autre' ? de.autre_designation : de.designation_article;
export const getDemandeur = (de) =>
  getType(de) === 'autre' ? de.autre_demandeur : de.demandeur;
export const getTypeDemande = (de) =>
  getType(de) === 'autre'
    ? (de.autre_type_demande ? `Autre - type ${de.autre_type_demande}` : null)
    : de.type_demande_de;
export const getUsine = (de) =>
  de.usine_validee || (getType(de) === 'autre' ? de.autre_usine_fab : null);
export const getCodeProjet = (de) =>
  getType(de) === 'autre' ? de.autre_code_origine : de.code_projet;

// ---- Prédicats de statut (partagés avec les compteurs KPI) ----------------
export const isDEValidated = (statut) => statut === 'dl_validee';
export const isEnAttenteCC = (statut) =>
  statut === 'de_attente_cc' || statut === 'ds_attente_cc';
export const isValideeCount = (statut) =>
  isDEValidated(statut) || statut === 'ds_validee';

// Liste triée des demandeurs présents dans le jeu de données (pour le dropdown).
export function listDemandeurs(demandes) {
  const set = new Set();
  for (const de of demandes) {
    const v = getDemandeur(de);
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}

// Onglet statut : la clé « regroupe » certains statuts DE + DS de même sens.
function matchesStatutTab(de, filter) {
  if (!filter || filter === 'toutes') return true;
  if (filter === 'dl_validee') return isValideeCount(de.statut);
  if (filter === 'de_attente_cc') return isEnAttenteCC(de.statut);
  if (filter === 'de_brouillon')
    return de.statut === 'de_brouillon' || de.statut === 'ds_brouillon';
  return de.statut === filter;
}

// Date de création normalisée en 'YYYY-MM-DD' pour comparaison lexicographique
// avec les bornes des <input type="date">. Renvoie '' si absente/illisible.
function createdDay(de) {
  const raw = de.created_date;
  if (!raw) return '';
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : '';
}

// Applique tous les filtres de la page. `c` = critères (état des contrôles).
// Valeurs "neutres" : filter='toutes', typeFilter='tous', typeDemandeFilter='tous',
// dsCasFilter='tous', usineFilter='toutes', demandeurFilter='tous', dateFrom/dateTo=''.
export function filterDemandes(demandes, c = {}) {
  const searchTerm = normalize((c.search || '').trim());
  return demandes.filter((de) => {
    if (c.typeFilter && c.typeFilter !== 'tous' && getType(de) !== c.typeFilter) return false;
    if (!matchesStatutTab(de, c.filter || 'toutes')) return false;

    if (c.typeDemandeFilter === 'DS') {
      // Filtre DS : ne garder que les DS, et éventuellement un cas d'usage précis.
      if (getType(de) !== 'ds') return false;
      if (c.dsCasFilter && c.dsCasFilter !== 'tous' && String(de.type_demande_de || '') !== c.dsCasFilter)
        return false;
    } else if (c.typeDemandeFilter && c.typeDemandeFilter !== 'tous') {
      const td = getTypeDemande(de);
      if (!td || !td.toLowerCase().includes(c.typeDemandeFilter.toLowerCase())) return false;
    }

    if (c.usineFilter && c.usineFilter !== 'toutes' && getUsine(de) !== c.usineFilter) return false;
    if (c.demandeurFilter && c.demandeurFilter !== 'tous' && getDemandeur(de) !== c.demandeurFilter)
      return false;

    if (c.dateFrom || c.dateTo) {
      const day = createdDay(de);
      if (!day) return false;
      if (c.dateFrom && day < c.dateFrom) return false;
      if (c.dateTo && day > c.dateTo) return false;
    }

    if (c.alertOnly && codeChapeauAlert(de, c.today).level === 'none') return false;

    if (searchTerm) {
      const haystack = [
        getCodeProjet(de),
        getDesignation(de),
        getDemandeur(de),
        getTypeDemande(de),
        getUsine(de),
        de.code_article,
      ]
        .map(normalize)
        .join(' ');
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });
}

// ---- Tri par colonne -------------------------------------------------------
const SORT_ACCESSORS = {
  type: (de) => getType(de),
  code_projet: (de) => getCodeProjet(de) || '',
  designation: (de) => getDesignation(de) || '',
  demandeur: (de) => getDemandeur(de) || '',
  usine: (de) => getUsine(de) || '',
  statut: (de) => de.statut || '',
  created_date: (de) => de.created_date || '',
};

export const SORT_KEYS = Object.keys(SORT_ACCESSORS);

// Tri stable (copie), `dir` = 'asc' | 'desc'. La date se compare en temps réel,
// le reste en ordre alphabétique FR "numérique" (PJ5012 avant PJ5100).
export function sortDemandes(demandes, key, dir = 'asc') {
  const acc = SORT_ACCESSORS[key];
  if (!acc) return demandes;
  const sign = dir === 'desc' ? -1 : 1;
  return [...demandes].sort((a, b) => {
    if (key === 'created_date') {
      const da = a.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b.created_date ? new Date(b.created_date).getTime() : 0;
      return (da - db) * sign;
    }
    return String(acc(a)).localeCompare(String(acc(b)), 'fr', { numeric: true }) * sign;
  });
}
