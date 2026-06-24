import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePowerPlatform } from '@/PowerProvider';

// Lien profond depuis l'e-mail Power Automate.
// Le bouton de l'e-mail ouvre l'app via le player Power Apps avec
// ?code_chapeau=<code>. Le player ne propage PAS la query string jusqu'à
// window.location de l'app (elle tourne en iframe) : il faut lire le paramètre
// via le SDK Power Apps -> getContext().app.queryParams (exposé ici par
// PowerProvider). On redirige alors une seule fois le HashRouter vers
// #/DL?code_chapeau=<code>. Repli sur window.location.search pour le dev local.
export default function DeepLink() {
  const navigate = useNavigate();
  const { isInitialized, powerContext } = usePowerPlatform();
  const handled = useRef(false);

  useEffect(() => {
    if (!isInitialized || handled.current) return;
    handled.current = true;

    const fromSdk = powerContext?.app?.queryParams?.code_chapeau;
    const fromUrl = new URLSearchParams(window.location.search).get('code_chapeau');
    const code = fromSdk || fromUrl;

    if (code) {
      navigate(`/DL?code_chapeau=${encodeURIComponent(code)}`, { replace: true });
    }
  }, [isInitialized, powerContext, navigate]);

  return null;
}
