import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContext } from '@microsoft/power-apps/app';

// Lien profond depuis l'e-mail Power Automate.
// Le bouton de l'e-mail ouvre l'app via le player Power Apps avec un paramètre :
//   - ?projet_id=<guid>   -> ouvre le formulaire DE prérempli (mail « en attente
//                            de code chapeau », l'ADV doit obtenir le code) ;
//   - ?code_chapeau=<code> -> ouvre la fiche DL (suivi).
// Le player ne propage PAS la query string jusqu'à window.location de l'app
// (iframe) : on lit le paramètre via le SDK Power Apps. IMPORTANT : getContext()
// est ASYNCHRONE (Promise<IContext>), il faut l'await — sinon ctx.app.queryParams
// est undefined. On redirige une seule fois par valeur. Repli sur
// window.location.search pour le dev local.

// Paramètres pris en charge, par priorité. Le 1er présent gagne.
const ROUTES = [
  {
    param: 'projet_id',
    ssKey: 'deeplink:projet_id',
    to: (v) => `/CreerDE?projet_id=${encodeURIComponent(v)}`,
  },
  {
    param: 'code_chapeau',
    ssKey: 'deeplink:code_chapeau',
    to: (v) => `/DL?code_chapeau=${encodeURIComponent(v)}`,
  },
];

export default function DeepLink() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let cancelled = false;

    // On ne redirige qu'une fois par session de navigateur et par valeur : sinon
    // chaque F5 relit queryParams (toujours présent côté player) et renverrait
    // l'utilisateur sur la cible, l'empêchant de rester ailleurs après un refresh.
    // Une nouvelle valeur re-déclenche bien la redirection.
    const go = (route, value) => {
      if (!value || cancelled) return;
      let alreadyHandled = false;
      try {
        alreadyHandled = sessionStorage.getItem(route.ssKey) === value;
        if (!alreadyHandled) sessionStorage.setItem(route.ssKey, value);
      } catch {
        // sessionStorage indisponible : on redirige quand même.
      }
      if (!alreadyHandled) navigate(route.to(value), { replace: true });
    };

    // Cherche le 1er paramètre présent (URL réelle d'abord, puis SDK player).
    const dispatch = (read) => {
      for (const route of ROUTES) {
        const value = read(route.param);
        if (value) {
          go(route, value);
          return true;
        }
      }
      return false;
    };

    // Repli dev local : query string réelle du navigateur.
    const urlParams = new URLSearchParams(window.location.search);
    if (dispatch((p) => urlParams.get(p))) return;

    // Player Power Apps : getContext() est asynchrone.
    Promise.resolve(getContext())
      .then((ctx) => dispatch((p) => ctx?.app?.queryParams?.[p]))
      .catch((err) => console.error('DeepLink: getContext a échoué', err));

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
