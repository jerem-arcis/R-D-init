import { useEffect, useState } from 'react';

export const STORAGE_KEY = 'boncolac_admin_lists';
const UPDATE_EVENT = 'boncolac:admin-lists-updated';

export const DEFAULT_LISTS = {
  reseaux: ['MDD', 'HSFC', 'GDM', 'RMN', 'RMD', 'BPT_GMS', 'BPT_RHF', 'EXPORT RHF', 'EXPORT RETAIL'],
  groupes_article: ['Valeur 1', 'Valeur 2', 'Valeur 3', 'Valeur 4'],
  axes_strategiques: [
    'Froid positif',
    'Démarche utilisateurs en RHF',
    'Développement de nos marques',
    'Plan produits inscrits au budget',
    'Business Courant',
    'Schéma directeur industriel',
  ],
  familles_produit: ['Traiteur', 'Mochi', 'Pâtisseries'],
  secteurs_activite: [
    'Boncolac',
    'Boncolac Traiteur',
    'Marque Distributeur',
    'Marque RHF',
    'Marque Export',
    'Autre',
  ],
  categories_vif: ['Permanent', 'Spot', 'Saisonnier'],
  types_logistique: ['Franco / One Shot', 'Franco', 'Départ'],
  services_demandeur: [
    'Commerce',
    'ADV',
    'Marketing',
    'R&D',
    'Industriel',
    'Supply Chain',
    'Contrôle de gestion',
    'Qualité',
    'Achats',
  ],
};

export const loadAdminLists = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LISTS, ...JSON.parse(raw) };
  } catch (e) {
    // ignore
  }
  return DEFAULT_LISTS;
};

export const saveAdminLists = (lists) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export function useAdminLists() {
  const [lists, setLists] = useState(loadAdminLists);

  useEffect(() => {
    const refresh = () => setLists(loadAdminLists());
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return lists;
}
