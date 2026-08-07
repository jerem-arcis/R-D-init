import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { BONCOLAC_LOGO_DATA_URI } from '@/assets/boncolacLogo';
import { Button } from '@/components/ui/button';

// Pop-up centrale de l'envoi vers SAP. Pilotée par `state` :
//   null                                   -> masquée
//   { status: 'loading' }                  -> logo + spinner (non fermable)
//   { status: 'success', title, message }  -> vert + bouton
//   { status: 'error',   title, message }  -> rouge + bouton
// `onClose` est appelé au clic du bouton (le parent décide de naviguer ou non).
export default function SapSendModal({ state, onClose }) {
  if (!state) return null;
  const { status, title, message } = state;
  const loading = status === 'loading';
  const success = status === 'success';
  const error = status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-border bg-card px-8 py-8 text-center shadow-2xl"
      >
        <img
          src={BONCOLAC_LOGO_DATA_URI}
          alt="Boncolac"
          className="mx-auto h-10 w-auto object-contain"
        />

        <div className="mt-6 flex justify-center">
          {loading && <Loader2 className="h-14 w-14 animate-spin text-primary" />}
          {success && <CheckCircle2 className="h-14 w-14 text-emerald-500" />}
          {error && <XCircle className="h-14 w-14 text-red-500" />}
        </div>

        <h2
          className={`mt-5 text-lg font-bold ${
            success ? 'text-emerald-700' : error ? 'text-red-700' : 'text-foreground'
          }`}
        >
          {loading ? 'Envoi vers SAP en cours…' : title}
        </h2>

        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {loading
            ? 'Merci de patienter, cela prend quelques secondes.'
            : message}
        </p>

        {!loading && (
          <Button
            type="button"
            onClick={onClose}
            className={`mt-6 w-full text-white ${
              success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {success ? 'Voir mes DE' : 'Fermer'}
          </Button>
        )}
      </div>
    </div>
  );
}
