import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContext } from '@microsoft/power-apps/app';

// Lien profond depuis l'e-mail Power Automate.
// Le bouton de l'e-mail ouvre l'app via le player Power Apps avec
// ?code_chapeau=<code>. Le player ne propage PAS la query string jusqu'à
// window.location de l'app (iframe) : on lit le paramètre via le SDK Power Apps.
// IMPORTANT : getContext() est ASYNCHRONE (renvoie une Promise<IContext>), il
// faut l'await — sinon ctx.app.queryParams est undefined. On redirige alors une
// seule fois le HashRouter vers #/DL?code_chapeau=<code>. Repli sur
// window.location.search pour le dev local.
export default function DeepLink() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let cancelled = false;

    // On ne redirige qu'une fois par session de navigateur et par code : sinon
    // chaque F5 relit queryParams (toujours présent côté player) et renverrait
    // l'utilisateur sur la DL, l'empêchant de rester ailleurs après un refresh.
    // Un nouveau lien (code différent) re-déclenche bien la redirection.
    const SS_KEY = 'deeplink:code_chapeau';
    const go = (code) => {
      if (!code || cancelled) return;
      let alreadyHandled = false;
      try {
        alreadyHandled = sessionStorage.getItem(SS_KEY) === code;
        if (!alreadyHandled) sessionStorage.setItem(SS_KEY, code);
      } catch {
        // sessionStorage indisponible : on redirige quand même (comportement initial).
      }
      if (!alreadyHandled) {
        navigate(`/DL?code_chapeau=${encodeURIComponent(code)}`, { replace: true });
      }
    };

    // Repli dev local : query string réelle du navigateur.
    const fromUrl = new URLSearchParams(window.location.search).get('code_chapeau');
    if (fromUrl) {
      go(fromUrl);
      return;
    }

    // Player Power Apps : getContext() est asynchrone.
    Promise.resolve(getContext())
      .then((ctx) => go(ctx?.app?.queryParams?.code_chapeau))
      .catch((err) => console.error('DeepLink: getContext a échoué', err));

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
