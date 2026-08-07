import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContext } from '@microsoft/power-apps/app';
import { matchDeepLink } from './deepLinkRoutes';
import { getProjetIdByCodePJ } from '@/api/fiche';
import { useToast } from '@/components/ui/use-toast';

// Lien profond depuis l'e-mail Power Automate. Le player ne propage PAS la query
// string jusqu'à l'iframe : on lit les paramètres via getContext().app.queryParams
// (ASYNCHRONE). Repli window.location.search pour le dev local.
//
// Deux liens par code PJ (résolu ici en GUID) :
//   ?code_pj=<code>&vue=de                 -> /CreerDE?projet_id=<guid>
//   ?code_pj=<code>&vue=fl&section=<sec>   -> /FicheDetail?id=<guid>&section=<sec>
// Repli legacy : ?projet_id=<guid>, ?code_chapeau=<code>.
//
// On ne redirige qu'une fois par valeur (sessionStorage) : sinon chaque F5 relit
// queryParams (toujours présent côté player) et renverrait l'utilisateur sur la
// cible. Une nouvelle valeur (code/vue/section) re-déclenche la redirection.

export default function DeepLink() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let cancelled = false;

    const alreadyDone = (ssKey, value) => {
      try {
        if (sessionStorage.getItem(ssKey) === value) return true;
        sessionStorage.setItem(ssKey, value);
      } catch {
        // sessionStorage indisponible : on redirige quand même.
      }
      return false;
    };

    const run = async (route) => {
      if (!route || cancelled) return;
      if (alreadyDone(route.ssKey, route.value)) return;

      let resolved = route.value;
      if (route.resolveNeeded) {
        try {
          resolved = await getProjetIdByCodePJ(route.value);
        } catch (err) {
          console.error('DeepLink: résolution code PJ a échoué', err);
          toast({ variant: 'destructive', title: 'Échec de l’ouverture du lien' });
          return;
        }
        if (!resolved) {
          toast({
            variant: 'destructive',
            title: `Code PJ « ${route.value} » introuvable`,
          });
          if (!cancelled) navigate('/Accueil', { replace: true });
          return;
        }
      }
      if (!cancelled) navigate(route.buildUrl(resolved), { replace: true });
    };

    // Repli dev local : query string réelle du navigateur.
    const urlParams = new URLSearchParams(window.location.search);
    const localRoute = matchDeepLink((p) => urlParams.get(p) ?? undefined);
    if (localRoute) {
      run(localRoute);
      return;
    }

    // Player Power Apps : getContext() est asynchrone.
    Promise.resolve(getContext())
      .then((ctx) => matchDeepLink((p) => ctx?.app?.queryParams?.[p]))
      .then((route) => run(route))
      .catch((err) => console.error('DeepLink: getContext a échoué', err));

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  return null;
}
