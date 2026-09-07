import React, { useState } from 'react';
import { updateFiche } from '@/api/fiche';
import { postFlowRaw, FLUX } from '@/api/flux';
import { generateFichePdfBase64 } from '@/lib/generateFichePdf';
import { useSapOptions } from '@/lib/sapLists';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import SapSendModal from '@/components/SapSendModal';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Envoi de la FL vers SAP : le flux `SAP_SEND_FL` n'attend QUE l'identifiant de la
// ligne Dataverse ({ "ID": "<guid cr04e_projetid>" }) — il relit lui-même la fiche
// et ses tables filles côté Power Automate. Renvoie { ok, title, message } ; le
// pilotage de la pop-up est fait par l'appelant. Même convention de statuts que la
// DE : 200 = succès, 400 = erreur(s) métier SAP.
async function sendFlToSap(ficheId, codeArticle) {
  try {
    const res = await postFlowRaw(FLUX.SAP_SEND_FL, { ID: ficheId });
    if (res.status === 200) {
      return {
        ok: true,
        title: 'Envoyé vers SAP',
        message: "La création de l'article a bien été transmise à SAP.",
      };
    }
    if (res.status === 400) {
      return {
        ok: false,
        title: 'Une ou plusieurs erreurs sur SAP',
        message: `Contactez l'administrateur.\nArticle ${codeArticle || '-'}.`,
      };
    }
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      title: 'Envoi SAP échoué',
      message: `Le flux a répondu HTTP ${res.status}${text ? ` - ${text}` : ''}.`,
    };
  } catch (err) {
    return {
      ok: false,
      title: 'Envoi SAP non déclenché',
      message: `L'envoi vers SAP a échoué : ${err?.message || 'erreur inconnue'}.`,
    };
  }
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

  const sap = useSapOptions();
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

  // 1) POST { ID } au flux SAP_SEND_FL, 2) si SAP a répondu 200, on bascule la FL
  // en « Création SAP effectuée ». Un échec du flux laisse le statut inchangé :
  // la fiche reste modifiable et l'envoi peut être relancé.
  // Pas de window.confirm : les boîtes de dialogue natives du navigateur sont
  // proscrites dans l'app (rendu hors charte, bloquantes, filtrées selon le
  // contexte d'hébergement). Le garde-fou est ailleurs : les 3 visas sont requis
  // et la date d'envoi verrouille définitivement le bouton après le premier envoi.
  const handleCreateSAP = async () => {
    setIsSending(true);
    setSapModal({ status: 'loading' });
    const result = await sendFlToSap(fiche.id, fiche.code_article);
    if (result.ok) {
      // 1) Alerte + fiche récap en pièce jointe, AVANT la mise à jour du statut :
      //    la fiche n'a pas encore basculé en lecture seule, donc le PDF reflète
      //    exactement ce qui vient d'être envoyé à SAP.
      const alerte = await envoyerFicheFinale(fiche);
      if (alerte) result.message += `\n\n${alerte}`;
      // 2) Statut + date d'envoi (c'est cette date qui verrouille le bouton).
      try {
        await createSAPMutation.mutateAsync();
      } catch (err) {
        console.error('[FL statut SAP]', err);
        result.message += `\n\nLe statut de la fiche n'a pas pu être mis à jour : ${err?.message || 'erreur inconnue'}.`;
      }
    }
    setSapModal({ status: result.ok ? 'success' : 'error', title: result.title, message: result.message });
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
            <Button
              onClick={handleCreateSAP}
              disabled={!allVisaDone || dejaEnvoyee || isSending || createSAPMutation.isPending}
              className="bg-violet-600 text-white hover:bg-violet-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {isSending ? 'Envoi vers SAP…' : "Créer l'article dans SAP"}
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
