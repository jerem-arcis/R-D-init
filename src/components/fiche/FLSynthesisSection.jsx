import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileCheck2, Truck, Package, Factory, ShoppingCart, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Field = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value || '—'}</p>
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

export default function FLSynthesisSection({ fiche }) {
  const queryClient = useQueryClient();

  const createSAPMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FicheLancement.update(fiche.id, {
        statut_sap: 'Création SAP effectuée',
        cree_sap_par: user.email,
        date_creation_sap: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', fiche.id] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });

  const handleCreateSAP = () => {
    if (window.confirm("Confirmer la création de l'article dans SAP ?")) {
      createSAPMutation.mutate();
    }
  };

  const sapDone = fiche.statut_sap === 'Création SAP effectuée';
  const allVisaDone =
    fiche.visa_controle_gestion &&
    fiche.visa_supply_chain &&
    fiche.visa_gestion_besoin &&
    fiche.visa_industriel &&
    fiche.visa_commerce;

  const fmtBlock = (b) => (b ? `${b.unite ?? '—'} u • ${b.poids_brut ?? '—'} kg • ${b.long ?? '—'}×${b.larg ?? '—'}×${b.haut ?? '—'} mm` : null);

  return (
    <section id="synthese-fl" className="scroll-mt-32 bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
      <header className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileCheck2 className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">Synthèse FL</h2>
            <p className="text-xs text-violet-100">Consolidation de toutes les sections — lecture seule</p>
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
              {!allVisaDone && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/30 border border-amber-300/40 rounded text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Visa(s) manquant(s)
                </div>
              )}
              <Button
                onClick={handleCreateSAP}
                disabled={!allVisaDone || createSAPMutation.isPending}
                className="bg-white text-violet-700 hover:bg-violet-50 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Créer l'article dans SAP
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubSection title="Contrôle de Gestion" icon={FileText} visa={fiche.visa_controle_gestion}>
          <Field label="Code article" value={fiche.code_article} />
          <Field label="Code chapeau" value={fiche.code_chapeau} />
          <Field label="Libellé article" value={fiche.libelle_article} />
          <Field label="Code étude R&D" value={fiche.code_etude_rd} />
          <Field label="Centre de profit" value={fiche.centre_profit} />
          <Field label="Date envoi fiche" value={fiche.date_envoi_ficher} />
        </SubSection>

        <SubSection title="Supply Chain" icon={Truck} visa={fiche.visa_supply_chain}>
          <Field label="VL" value={fiche.vl} />
          <Field label="Article prix" value={fiche.article_prix} />
          <Field label="Sites de stockage" value={Array.isArray(fiche.sites_stockage) ? fiche.sites_stockage.join(' / ') : fiche.sites_stockage} />
          <Field label="DLC/DLUO critique" value={fiche.dluc_dluo_critique && `${fiche.dluc_dluo_critique} j`} />
          <Field label="EAN carton" value={Array.isArray(fiche.ean_carton) ? fiche.ean_carton.join(', ') : fiche.ean_carton} />
          <Field label="EAN palette" value={Array.isArray(fiche.ean_palette) ? fiche.ean_palette.join(', ') : fiche.ean_palette} />
        </SubSection>

        <SubSection title="Gestion du besoin" icon={Package} visa={fiche.visa_gestion_besoin}>
          <Field label="Clé calcul lot usine" value={fiche.cle_calcul_lot_usine} />
          <Field label="Clé calcul lot stockiste" value={fiche.cle_calcul_lot_stockiste} />
          <Field label="Profil de couverture" value={fiche.profil_couverture} />
          <Field label="Délai de sécurité" value={fiche.delai_securite && `${fiche.delai_securite} j`} />
          <Field label="Type d'approvisionnement" value={fiche.type_approvisionnement} />
          <Field label="Délai prévisionnel livraison" value={fiche.delai_previsionnel_livraison} />
        </SubSection>

        <SubSection title="Industriel" icon={Factory} visa={fiche.visa_industriel}>
          <Field label="Type d'usine" value={fiche.type_usine} />
          <Field label="Type de palette" value={fiche.type_palette} />
          <Field label="UVC" value={fmtBlock(fiche.uvc_block)} />
          <Field label="Colis" value={fmtBlock(fiche.colis_block)} />
          <Field label="Palette" value={fmtBlock(fiche.palette_block)} />
          <Field label="Durée de vie" value={fiche.duree_vie && `${fiche.duree_vie} ${fiche.unite_duree_vie || ''}`} />
        </SubSection>

        <SubSection title="Commerce" icon={ShoppingCart} visa={fiche.visa_commerce}>
          <Field label="Statut lancement" value={fiche.statut_lancement} />
          <Field label="Libellé long 40" value={fiche.libelle_long_40} />
          <Field label="Fabrication / négoce" value={fiche.fabrication_negoce} />
          <Field label="Marque" value={fiche.marque} />
          <Field label="Secteur" value={fiche.secteur_activite} />
          <Field label="Canaux" value={Array.isArray(fiche.canaux_distribution) ? fiche.canaux_distribution.join(', ') : fiche.canaux_distribution} />
          <Field label="Nomenclature douanière" value={fiche.nomenclature_douaniere} />
          <Field label="Mention produit" value={fiche.mention_produit} />
        </SubSection>
      </div>
    </section>
  );
}
