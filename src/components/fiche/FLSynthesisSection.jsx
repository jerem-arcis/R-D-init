import React, { useState } from 'react';
import { updateFiche } from '@/api/fiche';
import { postFlowRaw, FLUX } from '@/api/flux';
import { generateFichePdfBase64 } from '@/lib/generateFichePdf';
import { useSapOptions } from '@/lib/sapLists';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SapSendModal from '@/components/SapSendModal';
import { CheckCircle2, AlertCircle, FileCheck2, Truck, Factory, ShoppingCart, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Field = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value || '-'}</p>
  </div>
);

const SubSection = ({ title, icon: Icon, visa, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      {visa && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Visa OK</Badge>}
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

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

  const fmtBlock = (b) => (b ? `${b.unite ?? '-'} u • ${b.poids_brut ?? '-'} kg • ${b.long ?? '-'}×${b.larg ?? '-'}×${b.haut ?? '-'} mm` : null);

  return (
    <section id="synthese-fl" className="scroll-mt-32 bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
      <header className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileCheck2 className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">Synthèse FL</h2>
            <p className="text-xs text-violet-100">Consolidation de toutes les sections - lecture seule</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sapDone ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-300/40 rounded-lg text-sm">
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
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/30 border border-amber-300/40 rounded text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Visa(s) manquant(s)
                </div>
              )}
              {dejaEnvoyee && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 border border-white/30 rounded text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Fiche envoyée le {fiche.date_envoi_ficher}
                </div>
              )}
              <Button
                onClick={handleCreateSAP}
                disabled={!allVisaDone || dejaEnvoyee || isSending || createSAPMutation.isPending}
                className="bg-white text-violet-700 hover:bg-violet-50 font-semibold"
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
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubSection title="Identification du produit" icon={FileText}>
          <Field label="Code article" value={fiche.code_article} />
          <Field label="Libellé article" value={fiche.libelle_article} />
          <Field label="Code étude R&D" value={fiche.code_etude_rd} />
          <Field label="Centre de profit" value={fiche.centre_profit} />
          <Field label="Date de la demande" value={fiche.date_demande} />
          <Field label="Date envoi fiche" value={fiche.date_envoi_ficher} />
        </SubSection>

        <SubSection title="Supply Chain" icon={Truck} visa={fiche.visa_supply_chain}>
          <Field label="Groupe statistique article" value={fiche.groupe_statistique_article} />
          <Field label="Groupe d'article" value={fiche.groupe_article} />
          <Field label="Groupe de ristournes" value={fiche.groupe_ristourne} />
          <Field label="Groupe imputation article" value={fiche.groupe_imputation} />
        </SubSection>

        <SubSection title="Industriel" icon={Factory} visa={fiche.visa_industriel}>
          <Field label="Type d'usine" value={fiche.type_usine} />
          <Field label="Type de palette" value={fiche.type_palette} />
          <Field label="UVC" value={fmtBlock(fiche.uvc_block)} />
          <Field label="Colis" value={fmtBlock(fiche.colis_block)} />
          <Field label="Palette" value={fmtBlock(fiche.palette_block)} />
          <Field label="Durée de vie" value={fiche.duree_vie && `${fiche.duree_vie} j`} />
        </SubSection>

        <SubSection title="Commerce" icon={ShoppingCart} visa={fiche.visa_commerce}>
          <Field label="Désign. normalisée" value={fiche.design_normalisee} />
          <Field label="Libellé long 40" value={fiche.libelle_long_40} />
          <Field label="Libellé article caisse" value={fiche.libelle_caisse} />
          <Field label="Marque" value={fiche.marque} />
          <Field label="Secteur" value={fiche.secteur_activite} />
          <Field label="Hiérarchie produit" value={fiche.hierarchie_produit} />
          <Field label="Origine fabrication" value={fiche.origine_fabrication} />
          <Field label="Canaux" value={Array.isArray(fiche.canaux_distribution) ? fiche.canaux_distribution.join(', ') : fiche.canaux_distribution} />
          <Field label="Nomenclature douanière" value={fiche.nomenclature_douaniere} />
          <Field label="GTIN colis" value={fiche.colis_block?.gtin} />
        </SubSection>
      </div>

      <SapSendModal
        state={sapModal}
        okLabel="Fermer"
        onClose={() => setSapModal(null)}
      />
    </section>
  );
}
