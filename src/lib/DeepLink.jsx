import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Lien profond depuis l'e-mail Power Automate.
// Le lien ouvre l'app via le player Power Apps avec ?code_chapeau=<code> dans la
// query string réelle du navigateur. Comme l'app utilise un HashRouter, on lit
// cette query externe au démarrage et on redirige une seule fois vers
// #/DL?code_chapeau=<code> (la page Traitement DL gère ensuite l'ouverture/
// surbrillance). Si le paramètre est absent, ce composant ne fait rien.
export default function DeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code_chapeau');
    if (code) {
      navigate(`/DL?code_chapeau=${encodeURIComponent(code)}`, { replace: true });
    }
    // Au montage uniquement : on ne veut rediriger qu'à l'arrivée sur l'app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
