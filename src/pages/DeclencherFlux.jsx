import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';

// URL du déclencheur manuel Power Automate.
// Le flux est appelé sans corps (aucun objet) pour le moment.
const FLOW_TRIGGER_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b8f4279690234b06b54b19487f016c8e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3BcraSNpkuHBTC-kS79fNiT9KYNSqqmdMOASDsE4jVI';

const STATUS = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
};

// Tente de formater joliment la réponse (JSON indenté si possible).
const formatResponse = (text) => {
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

export default function DeclencherFlux() {
  const [status, setStatus] = useState(STATUS.idle);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);

  const triggerFlow = async () => {
    setStatus(STATUS.loading);
    setMessage('');
    setResponse(null);
    try {
      const res = await fetch(FLOW_TRIGGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Aucun objet envoyé pour le moment.
        body: JSON.stringify({}),
      });

      const text = await res.text().catch(() => '');

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }

      setStatus(STATUS.success);
      setMessage(`Flux déclenché — HTTP ${res.status} ${res.statusText}`.trim());
      setResponse(formatResponse(text) || '(réponse vide)');
    } catch (err) {
      setStatus(STATUS.error);
      setMessage(err?.message || 'Une erreur est survenue lors du déclenchement du flux.');
    }
  };

  const isLoading = status === STATUS.loading;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 overflow-hidden relative">
      {/* Halos d'ambiance */}
      <div
        className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, hsl(270,65%,55%) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, hsl(38,80%,55%) 0%, transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div
          className="rounded-3xl shadow-2xl overflow-hidden text-white"
          style={{
            background:
              'linear-gradient(160deg, hsl(270,65%,26%) 0%, hsl(270,62%,18%) 60%, hsl(272,55%,14%) 100%)',
          }}
        >
          {/* En-tête */}
          <div className="px-8 pt-9 pb-7 text-center">
            <div className="relative mx-auto mb-5 w-20 h-20">
              <div
                className="relative w-full h-full rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'hsl(38,80%,55%)' }}
              >
                <Zap className="w-9 h-9" style={{ color: 'hsl(270,65%,18%)' }} fill="currentColor" />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">Déclencher le flux</h1>
            <p className="text-sm mt-2 text-white/60 leading-relaxed">
              Lance le flux Power Automate manuellement.
              <br />
              Aucune donnée n'est transmise pour le moment.
            </p>
          </div>

          {/* Corps */}
          <div className="px-8 pb-9">
            <motion.div whileHover={!isLoading ? { scale: 1.02 } : {}} whileTap={!isLoading ? { scale: 0.97 } : {}}>
              <Button
                onClick={triggerFlow}
                disabled={isLoading}
                size="lg"
                className="w-full h-14 text-base font-bold gap-2 rounded-xl shadow-lg border-0 disabled:opacity-100"
                style={{ background: 'hsl(38,80%,55%)', color: 'hsl(270,65%,15%)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Déclenchement en cours…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Déclencher le flux
                  </>
                )}
              </Button>
            </motion.div>

            <AnimatePresence mode="wait">
              {status === STATUS.success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="rounded-xl bg-emerald-400/15 border border-emerald-300/30 px-4 py-3 text-sm text-emerald-200"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{message}</span>
                  </div>
                  {response && (
                    <div className="mt-3">
                      <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">
                        Réponse
                      </p>
                      <pre className="max-h-60 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-emerald-100/90 whitespace-pre-wrap break-words font-mono">
                        {response}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}

              {status === STATUS.error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex items-start gap-2.5 rounded-xl bg-rose-400/15 border border-rose-300/30 px-4 py-3 text-sm text-rose-200"
                >
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="break-words">{message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
