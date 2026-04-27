import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Building2, Truck, Package, Factory, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function FLTab({ fiche }) {
  const queryClient = useQueryClient();

  const createSAPMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FicheLancement.update(fiche.id, {
        statut_sap: 'Création SAP effectuée',
        cree_sap_par: user.email,
        date_creation_sap: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', fiche.id] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    }
  });

  const handleCreateSAP = async () => {
    if (confirm('Confirmer la création de l\'article dans SAP ?')) {
      await createSAPMutation.mutateAsync();
    }
  };
  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const Field = ({ label, value }) => (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-sm text-slate-900">{value || '—'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">FL — Synthèse</h2>
          <p className="text-sm text-slate-500 mt-1">
            Consolidation de toutes les informations (lecture seule)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fiche.statut_sap === 'Création SAP effectuée' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700">Création SAP effectuée</p>
                {fiche.date_creation_sap && fiche.cree_sap_par && (
                  <p className="text-xs text-emerald-600">
                    {format(new Date(fiche.date_creation_sap), 'dd MMM yyyy à HH:mm', { locale: fr })} par {fiche.cree_sap_par}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-700">À créer dans SAP</p>
              </div>
              <Button
                onClick={handleCreateSAP}
                disabled={createSAPMutation.isPending}
                className="bg-gradient-to-r from-[#5B3A8E] to-[#7B4FB5] hover:from-[#4A2E75] hover:to-[#6A3FA0] text-white uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Créer l'article dans SAP
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contrôle de Gestion */}
        <Section title="Contrôle de Gestion" icon={FileText}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code article" value={fiche.code_article} />
            <Field label="Libellé article" value={fiche.libelle_article} />
            <Field label="Code étude R&D" value={fiche.code_etude_rd} />
            <Field label="Centre de profit" value={fiche.centre_profit} />
          </div>
          {fiche.visa_controle_gestion && (
            <Badge className="mt-4 bg-emerald-100 text-emerald-700">Visa validé</Badge>
          )}
        </Section>

        {/* Supply Chain */}
        <Section title="Supply Chain" icon={Truck}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="VL" value={fiche.vl} />
            <Field label="Sites de stockage" value={fiche.sites_stockage} />
            <Field label="Groupement d'articles" value={fiche.groupement_articles} />
          </div>
          {fiche.visa_supply_chain && (
            <Badge className="mt-4 bg-emerald-100 text-emerald-700">Visa validé</Badge>
          )}
        </Section>

        {/* Gestion du besoin */}
        <Section title="Gestion du besoin" icon={Package}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Clé calcul lot usine" value={fiche.cle_calcul_lot_usine} />
            <Field label="Clé calcul lot stockiste" value={fiche.cle_calcul_lot_stockiste} />
          </div>
          {fiche.visa_gestion_besoin && (
            <Badge className="mt-4 bg-emerald-100 text-emerald-700">Visa validé</Badge>
          )}
        </Section>

        {/* Industriel */}
        <Section title="Industriel" icon={Factory}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Désignation article" value={fiche.designation_article} />
            <Field label="Type usine" value={fiche.type_usine} />
            <Field label="UVC" value={fiche.uvc} />
            <Field label="Colis" value={fiche.colis} />
            <Field label="Nb UC/couche" value={fiche.nombre_uc_couche} />
            <Field label="Nb UC/palette" value={fiche.nombre_uc_palette} />
            <Field label="Dimensions" value={fiche.dimension_longueur && fiche.dimension_largeur && fiche.dimension_hauteur 
              ? `${fiche.dimension_longueur} × ${fiche.dimension_largeur} × ${fiche.dimension_hauteur} mm` 
              : null} />
            <Field label="Poids brut" value={fiche.poids_brut ? `${fiche.poids_brut} kg` : null} />
            <Field label="Poids net" value={fiche.poids_net ? `${fiche.poids_net} kg` : null} />
            <Field label="Durée de vie" value={fiche.duree_vie_industriel} />
          </div>
          {fiche.visa_industriel && (
            <Badge className="mt-4 bg-emerald-100 text-emerald-700">Visa validé</Badge>
          )}
        </Section>

        {/* Commerce */}
        <Section title="Commerce" icon={ShoppingCart}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Statut de lancement" value={fiche.statut_lancement} />
            <Field label="Fabrication/Négoce" value={fiche.fabrication_negoce} />
            <Field label="Origine fabrication" value={fiche.origine_fabrication} />
            <Field label="Marque" value={fiche.marque} />
            <Field label="Code pays" value={fiche.code_pays} />
            <Field label="Secteur d'activité" value={fiche.secteur_activite} />
            <Field label="Client" value={fiche.client} />
            <Field label="Canaux de vente" value={fiche.canaux_vente} />
            <Field label="GTIN carton" value={fiche.gtin_carton} />
            <Field label="GTIN couche" value={fiche.gtin_couche} />
            <Field label="GTIN palette" value={fiche.gtin_palette} />
            <Field label="Hiérarchie produit" value={fiche.hierarchie_produit} />
          </div>
          {fiche.visa_commerce && (
            <Badge className="mt-4 bg-emerald-100 text-emerald-700">Visa validé</Badge>
          )}
        </Section>
      </div>
    </div>
  );
}