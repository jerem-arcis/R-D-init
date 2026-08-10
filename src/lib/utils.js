import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Normalise une chaine pour recherche/comparaison insensible casse + accents.
export const normalizeText = (v) =>
  (v ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

// Garde `typeof window` : le module est importé aussi en environnement de test
// (node) via les helpers purs — sans cette garde, l'accès à `window` y lève.
export const isIframe = typeof window !== 'undefined' && window.self !== window.top;
