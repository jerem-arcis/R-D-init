import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePowerPlatform } from '@/PowerProvider';
import { listReferentiels } from '@/api/referentiels';
import { resoudreMesGroupes } from '@/api/groupes';
import { allGroupIds, buildPerimetre, parseGroupIds } from '@/lib/perimetre';

// Périmètre société & droits de l'utilisateur connecté : charge les quatre
// référentiels (société, division, orgCo, canal) puis résout son appartenance aux
// groupes Entra qu'ils référencent. Les règles vivent dans src/lib/perimetre.js.

export const REFERENTIELS_QUERY_KEY = ['referentiels-societe'];

// Simulation des groupes en développement local (jamais en build de prod) :
//   localStorage.setItem('perimetre_groupes', '<guid>;<guid>')
const SIMU_KEY = 'perimetre_groupes';
function groupesSimules() {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem(SIMU_KEY);
    return raw === null ? null : parseGroupIds(raw);
  } catch {
    return null;
  }
}

const PerimetreContext = createContext(null);

export function PerimetreProvider({ children }) {
  const { isInitialized, powerContext } = usePowerPlatform();
  const utilisateur = useMemo(() => ({
    objectId: powerContext?.user?.objectId ?? '',
    upn: powerContext?.user?.userPrincipalName ?? '',
    nom: powerContext?.user?.fullName ?? '',
  }), [powerContext]);

  const refs = useQuery({
    queryKey: REFERENTIELS_QUERY_KEY,
    queryFn: listReferentiels,
    staleTime: 5 * 60 * 1000,
  });

  const groupIds = useMemo(() => allGroupIds(refs.data?.societes), [refs.data]);
  const simules = useMemo(groupesSimules, []);

  const membres = useQuery({
    queryKey: ['mes-groupes', utilisateur.objectId || utilisateur.upn, groupIds],
    queryFn: () => resoudreMesGroupes(groupIds, utilisateur),
    enabled: isInitialized && refs.isSuccess && groupIds.length > 0 && simules === null,
    staleTime: 5 * 60 * 1000,
  });

  const mesGroupes = simules ?? membres.data?.groupes;
  const perimetre = useMemo(
    () => (refs.data ? buildPerimetre({ ...refs.data, mesGroupes: mesGroupes ?? [] }) : null),
    [refs.data, mesGroupes],
  );

  const erreursGroupes = membres.data?.erreurs;
  const value = useMemo(() => ({
    perimetre,
    utilisateur,
    // Groupes qui n'ont pas pu être résolus (supprimés, connecteur en échec).
    erreursGroupes: erreursGroupes ?? [],
    simulation: simules !== null,
  }), [perimetre, utilisateur, erreursGroupes, simules]);

  const enAttenteGroupes = groupIds.length > 0 && simules === null && !membres.data && !membres.isError;
  if (refs.isLoading || !isInitialized || (refs.isSuccess && enAttenteGroupes)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Référentiels ou groupes illisibles : on ne peut pas établir les droits. On
  // bloque plutôt que d'ouvrir l'app sans cloisonnement.
  if (refs.isError || membres.isError) {
    const err = refs.error || membres.error;
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-rose-600" />
          <h1 className="text-lg font-bold text-foreground">Droits d'accès indisponibles</h1>
          <p className="text-sm text-muted-foreground">
            Impossible de charger les sociétés et vos groupes. {err?.message}
          </p>
          <Button onClick={() => { refs.refetch(); membres.refetch(); }}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return <PerimetreContext.Provider value={value}>{children}</PerimetreContext.Provider>;
}

export function usePerimetre() {
  const ctx = useContext(PerimetreContext);
  if (!ctx) throw new Error('usePerimetre doit être utilisé dans un PerimetreProvider');
  return ctx;
}
