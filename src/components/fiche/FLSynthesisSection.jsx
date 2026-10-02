import React, { useState, useRef, useEffect } from 'react';
import { updateFiche, getFicheFluxState } from '@/api/fiche';
import { postFlowRaw, FLUX } from '@/api/flux';
import { resolveFluxOutcome } from '@/lib/erreursSap';
import { generateFichePdfBase64 } from '@/lib/generateFichePdf';
import { useSapOptions } from '@/lib/sapLists';
import { useFichePerimetre } from '@/lib/useFichePerimetre';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import SapSendModal from '@/components/SapSendModal';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Cadence et durée max du polling (cf. handleCreateSAP). Le flux SAP met > 2 min :
// on relit la ligne toutes les 5 s pendant 10 min avant d'afficher « toujours en
// cours » (sans conclure à un échec).
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Déclenche le flux SAP_SEND_FL SANS se fier à sa réponse HTTP (le flux répond au
// terme de la création SAP, > 2 min -> timeout systématique). On ne veut détecter
// QUE l'échec immédiat de déclenchement (URL du registre introuvable, réseau) :
// on laisse ~8 s au POST pour rejeter ; au-delà, on considère le flux « parti » et
// c'est le polling de la ligne qui fera foi. Renvoie { triggered, error }.
async function declencherFluxFl(ficheId) {
  const post = postFlowRaw(FLUX.SAP_SEND_FL, { ID: ficheId });
  const early = await Promise.race([
    post.then(() => ({ triggered: true })).catch((err) => ({ triggered: false, error: err })),
    sleep(8000).then(() => ({ triggered: true, slow: true })),
  ]);
  // Réponse tardive/timeout du flux ignorée (évite une "unhandled rejection").
  post.catch(() => {});
  return early;
}

// Alerte « fiche finale » : le PDF de la fiche récap est généré DANS L'APP (même
// gabarit que le bouton « Exporter PDF ») puis transmis au flux en base64, qui
// l'attache au mail. Contrat du déclencheur SAP_SEND_Fiche_final :
//   { ID: string, NomFichier: string, Fichier: string (base64 nu) }
// Non bloquant : la création SAP a déjà réussi, un échec d'alerte ne doit pas
// faire passer l'opération pour un échec. On renvoie un message à afficher.
async function envoyerFicheFinale(fiche) {
  try {
    const { fileName, base64 } = await generateFichePdfBase64(fiche, null);
    const res = await postFlowRaw(FLUX.SAP_SEND_FICHE_FINAL, {
      ID: fiche.id,
      NomFichier: fileName,
      Fichier: base64,
    });
    if (res.ok) return null;
    return `L'article est créé, mais l'envoi de la fiche récap a échoué (HTTP ${res.status}).`;
  } catch (err) {
    console.error('[FL alerte fiche finale]', err);
    return `L'article est créé, mais l'envoi de la fiche récap a échoué : ${err?.message || 'erreur inconnue'}.`;
  }
}

// Date du jour au format AAAA-MM-JJ, en heure LOCALE (toISOString passerait par
// UTC et daterait la veille en soirée).
function aujourdhuiISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function FLSynthesisSection({ fiche }) {
  const queryClient = useQueryClient();
  const [sapModal, setSapModal] = useState(null);
  const [isSending, setIsSending] = useState(false);
  // Le polling peut durer plusieurs minutes : on ignore les setState si le
  // composant a été démonté entre-temps (navigation).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const setModalIfMounted = (m) => { if (mountedRef.current) setSapModal(m); };

  const sap = useSapOptions();
  // Envoi en erreur : seuls les admins de la société peuvent relancer.
  const { envoiEnErreur, peutEnvoyerSap } = useFichePerimetre(fiche);
  const createSAPMutation = useMutation({
    mutationFn: () =>
      updateFiche(
        fiche.id,
        {
          statut_sap: 'Création SAP effectuée',
          // Horodatage de l'envoi : c'est ce champ qui interdit un second envoi.
          date_envoi_ficher: aujourdhuiISO(),
        },
        { sapOptions: sap },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', fiche.id] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });

  // Envoi FL -> SAP par POLLING (le flux met > 2 min, sa réponse HTTP n'est pas
  // fiable) : 1) on mémorise `modifiedon` (baseline) ; 2) on déclenche le flux ;
  // 3) on relit la ligne toutes les 5 s : tant que `modifiedon` n'a pas bougé ->
  // « en cours » ; dès qu'il bouge on lit `flux_envoi_fl` -> réussi / erreur.
  //   - réussi : alerte fiche récap + bascule statut/date d'envoi (verrouille le bouton).
  //   - erreur : rien n'est persisté, la fiche reste modifiable et ré-envoyable.
  //   - toujours « en cours » après 10 min : état neutre, rien persisté.
  // Pas de window.confirm (boîtes natives proscrites) ; garde-fous : les 3 visas
  // requis + la date d'envoi qui verrouille après un envoi réussi.
  const handleCreateSAP = async () => {
    setIsSending(true);
    setSapModal({ status: 'loading' });

    // Baseline fiable : la valeur mappée sur la fiche, sinon une lecture fraîche
    // (évite qu'un baseline manquant fasse conclure sur un ancien flux_envoi_fl).
    let baseline = fiche.modified_on;
    if (!baseline) {
      try { baseline = (await getFicheFluxState(fiche.id)).modifiedon; } catch { /* garde null */ }
    }

    // 1) Déclenche le flux ; seul un échec IMMÉDIAT (réseau/registre) est bloquant.
    const trig = await declencherFluxFl(fiche.id);
    if (!trig.triggered) {
      setModalIfMounted({
        status: 'error',
        title: 'Envoi SAP non déclenché',
        message: `L'envoi vers SAP n'a pas pu démarrer : ${trig.error?.message || 'erreur inconnue'}.`,
      });
      setIsSending(false);
      return;
    }

    // 2) Polling de la ligne jusqu'à conclusion ou expiration.
    const started = Date.now();
    let outcome = 'pending';
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);
      if (!mountedRef.current) return;
      let state;
      try { state = await getFicheFluxState(fiche.id); }
      catch { continue; } // lecture transitoire en échec -> on retente au tick suivant
      outcome = resolveFluxOutcome(baseline, state);
      if (outcome !== 'pending') break;
    }

    if (outcome === 'reussi') {
      let message = "La création de l'article a bien été transmise à SAP.";
      // Alerte + fiche récap en pièce jointe (non bloquant).
      const alerte = await envoyerFicheFinale(fiche);
      if (alerte) message += `\n\n${alerte}`;
      // Statut + date d'envoi (c'est cette date qui verrouille le bouton).
      try {
        await createSAPMutation.mutateAsync();
      } catch (err) {
        console.error('[FL statut SAP]', err);
        message += `\n\nLe statut de la fiche n'a pas pu être mis à jour : ${err?.message || 'erreur inconnue'}.`;
      }
      setModalIfMounted({ status: 'success', title: 'Article créé dans SAP', message });
    } else if (outcome === 'erreur') {
      // Relit la fiche : son statut d'envoi « erreur » la fige (hors admins).
      queryClient.invalidateQueries({ queryKey: ['fiche', fiche.id] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
      setModalIfMounted({
        status: 'error',
        title: 'Une ou plusieurs erreurs sur SAP',
        message: `Contactez l'administrateur.\nArticle ${fiche.code_article || '-'}.`,
      });
    } else {
      // Timeout : le flux tourne toujours. Ni succès ni échec.
      setModalIfMounted({
        status: 'pending',
        title: 'Création toujours en cours',
        message: "SAP n'a pas encore répondu. La création se poursuit côté SAP — vérifiez le suivi des créations dans quelques minutes.",
      });
    }
    setIsSending(false);
  };

  const sapDone = fiche.statut_sap === 'Création SAP effectuée';
  // Fiche déjà transmise : la date d'envoi fait office de garde-fou anti-double
  // envoi, même si le statut n'a pas suivi.
  const dejaEnvoyee = !!fiche.date_envoi_ficher;
  const allVisaDone =
    fiche.visa_supply_chain &&
    fiche.visa_industriel &&
    fiche.visa_commerce;

  return (
    <section id="synthese-fl" className="scroll-mt-32 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {sapDone ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <div>
              <p className="font-medium">Création SAP effectuée</p>
              {fiche.date_creation_sap && (
                <p className="text-[10px] opacity-80">
                  {format(new Date(fiche.date_creation_sap), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  {fiche.cree_sap_par && ` par ${fiche.cree_sap_par}`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {!allVisaDone && !dejaEnvoyee && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 mr-auto">
                <AlertCircle className="w-3.5 h-3.5" />
                Les 3 visas sont requis avant l'envoi vers SAP
              </div>
            )}
            {dejaEnvoyee && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 mr-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Fiche envoyée le {fiche.date_envoi_ficher}
              </div>
            )}
            {envoiEnErreur && !dejaEnvoyee && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 mr-auto">
                <AlertCircle className="w-3.5 h-3.5" />
                {peutEnvoyerSap
                  ? "Envoi vers SAP en erreur : corrigez la fiche puis relancez (réservé aux admins)."
                  : "Envoi vers SAP en erreur : fiche bloquée, seul un admin peut la corriger et la relancer."}
              </div>
            )}
            <Button
              onClick={handleCreateSAP}
              disabled={!allVisaDone || dejaEnvoyee || !peutEnvoyerSap || isSending || createSAPMutation.isPending}
              className="bg-violet-600 text-white hover:bg-violet-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {isSending ? 'Envoi vers SAP…' : envoiEnErreur ? 'Relancer la création SAP' : "Créer l'article dans SAP"}
            </Button>
          </>
        )}
      </div>

      <SapSendModal
        state={sapModal}
        okLabel="Fermer"
        onClose={() => setSapModal(null)}
      />
    </section>
  );
}
