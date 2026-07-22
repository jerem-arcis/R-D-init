import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { codeChapeauAlert } from '@/lib/deStatus';

// Panneau d'attention rouge affiché à côté du statut d'une demande (DE ou DS) qui
// attend son code chapeau depuis plus de 5 jours ouvrés. Purement indicatif : il
// ne modifie jamais le statut. Rien n'est affiché en deçà du seuil.
export function CodeChapeauAlertBadge({ de }) {
  const alerte = codeChapeauAlert(de);
  if (alerte.level !== 'retard') return null;
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Attention · retard code chapeau
    </Badge>
  );
}
