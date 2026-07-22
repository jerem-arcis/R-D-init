import { AlertTriangle } from 'lucide-react';
import { codeChapeauAlert } from '@/lib/deStatus';

// Petite icône d'attention (rouge) signalant qu'une demande (DE ou DS) attend son
// code chapeau depuis plus de 5 jours ouvrés. Placée en fin de ligne, après la date
// de création. Purement indicative : ne modifie jamais le statut. Rien en deçà du seuil.
export function CodeChapeauAlertIcon({ de, className = '' }) {
  const alerte = codeChapeauAlert(de);
  if (alerte.level !== 'retard') return null;
  return (
    <AlertTriangle
      className={`w-4 h-4 shrink-0 text-red-600 ${className}`}
      title="Retard code chapeau (≥ 5 jours ouvrés)"
      aria-label="Retard code chapeau"
    />
  );
}
