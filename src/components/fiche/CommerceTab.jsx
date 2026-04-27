import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CommerceTab({ fiche, onUpdate, onVisa, isReadOnly }) {
  const handleChange = (field, value) => {
    if (!isReadOnly) {
      onUpdate({ [field]: value });
    }
  };

  const isInitialMode = fiche.etape_courante <= 3;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Commerce</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isInitialMode ? 'Saisie initiale par ADV' : 'Renseigné par ADV, validé par Commerce'}
          </p>
        </div>
        {fiche.visa_commerce && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">Visa validé</p>
              {fiche.visa_commerce_date && (
                <p className="text-xs text-emerald-600">
                  {format(new Date(fiche.visa_commerce_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Champs initiaux toujours visibles */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations de base</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Statut de lancement</Label>
              <Input
                value={fiche.statut_lancement || ''}
                onChange={(e) => handleChange('statut_lancement', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Fabrication ou Négoce</Label>
              <Select
                value={fiche.fabrication_negoce || ''}
                onValueChange={(value) => handleChange('fabrication_negoce', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fabrication">Fabrication</SelectItem>
                  <SelectItem value="Négoce">Négoce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Origine fabrication</Label>
              <Input
                value={fiche.origine_fabrication || ''}
                onChange={(e) => handleChange('origine_fabrication', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
                placeholder="Ex: 3A-Produit Fini DFINI"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Date de fiche de lancement</Label>
              <Input
                type="date"
                value={fiche.date_fiche_lancement || ''}
                onChange={(e) => handleChange('date_fiche_lancement', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Champs complets - visibles seulement après étape 3 */}
        {!isInitialMode && (
          <>
            {/* En-tête */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 text-sm">Code VL</Label>
                <Input value={fiche.vl || ''} disabled className="h-10 bg-slate-50 text-slate-500" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-600 text-sm">Libellé article</Label>
                <Input value={fiche.libelle_article || ''} disabled className="h-10 bg-slate-50 text-slate-500" />
              </div>
            </div>

            {/* SODEGEMAT */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">SODEGEMAT</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-slate-500">Sites</div>
                  <div className="font-medium">TDL</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-slate-500">09-TRANSFERT</div>
                  <div className="font-medium"></div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-slate-500">10-CMROULIAT-PAT GMS</div>
                  <div className="font-medium"></div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-slate-500">30-EXPORT</div>
                  <div className="font-medium"></div>
                </div>
              </div>
            </div>

            {/* Libellés */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Libellés descriptifs article normalisés et langues</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Libellé Caisse (0/18 car.)</Label>
                  <Input
                    value={fiche.libelle_caisse || ''}
                    onChange={(e) => handleChange('libelle_caisse', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={18}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Lib.client</Label>
                  <Input
                    value={fiche.libelle_client || ''}
                    onChange={(e) => handleChange('libelle_client', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                    placeholder="20 MINI CROQUES ITM"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Libellé langue 40 caractères (0 car = 0 car)</Label>
                  <Textarea
                    value={fiche.libelle_langue_40 || ''}
                    onChange={(e) => handleChange('libelle_langue_40', e.target.value)}
                    disabled={isReadOnly}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-sm">Code Pays</Label>
                    <Select
                      value={fiche.code_pays || ''}
                      onValueChange={(value) => handleChange('code_pays', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR-Fran">FR-Fran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Définition produit */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Définition du produit</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Définition du produit 43 car + 35 car</Label>
                  <Textarea
                    value={fiche.definition_produit || ''}
                    onChange={(e) => handleChange('definition_produit', e.target.value)}
                    disabled={isReadOnly}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Mise à jour recette suite nouvelle béchamel</Label>
                  <Input
                    value={fiche.mise_a_jour_recette || ''}
                    onChange={(e) => handleChange('mise_a_jour_recette', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Nouveau code étui 6 cls vernis ACHB</Label>
                  <Input
                    value={fiche.nouveau_code_etui || ''}
                    onChange={(e) => handleChange('nouveau_code_etui', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Marché */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Marché</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Secteur d'activité</Label>
                  <Input
                    value={fiche.secteur_activite || ''}
                    onChange={(e) => handleChange('secteur_activite', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                    placeholder="15-Marques Distrib."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Marque</Label>
                  <Input
                    value={fiche.marque || ''}
                    onChange={(e) => handleChange('marque', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Durée de vie</Label>
                  <div className="flex gap-2">
                    <Input
                      value={fiche.duree_vie || ''}
                      onChange={(e) => handleChange('duree_vie', e.target.value)}
                      disabled={isReadOnly}
                      className="h-10 flex-1"
                    />
                    <div className="w-12 h-10 bg-white border rounded flex items-center justify-center text-sm">M</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">n° artcle olevCGP</Label>
                  <Input disabled className="h-10 bg-white" />
                </div>
              </div>
            </div>

            {/* Hiérarchie produits */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Hiérarchie produits Fam</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Nombre/by TarifOxam</Label>
                  <Input
                    value={fiche.nombre_tarifoxam || ''}
                    onChange={(e) => handleChange('nombre_tarifoxam', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Type palette</Label>
                  <Input
                    value={fiche.type_palette_commerce || ''}
                    onChange={(e) => handleChange('type_palette_commerce', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                    placeholder="SME80 : Palette 80 x 120 Europe"
                  />
                </div>
              </div>
            </div>

            {/* Caractéristiques physiques */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Caractéristiques physiques</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Volume (U)</Label>
                  <Input
                    type="number"
                    value={fiche.volume_commerce || ''}
                    onChange={(e) => handleChange('volume_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Poids brut</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fiche.poids_brut_commerce || ''}
                    onChange={(e) => handleChange('poids_brut_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Poids net</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fiche.poids_net_commerce || ''}
                    onChange={(e) => handleChange('poids_net_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">long (mm)</Label>
                  <Input
                    type="number"
                    value={fiche.long_commerce || ''}
                    onChange={(e) => handleChange('long_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">larg (mm)</Label>
                  <Input
                    type="number"
                    value={fiche.larg_commerce || ''}
                    onChange={(e) => handleChange('larg_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">haut (mm)</Label>
                  <Input
                    type="number"
                    value={fiche.haut_commerce || ''}
                    onChange={(e) => handleChange('haut_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">PCB / rang.sup.</Label>
                  <Input
                    value={fiche.pcb_rang_sup_commerce || ''}
                    onChange={(e) => handleChange('pcb_rang_sup_commerce', e.target.value)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">UVC</Label>
                  <Input
                    value={fiche.uvc_commerce || ''}
                    onChange={(e) => handleChange('uvc_commerce', e.target.value)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">U /élém.</Label>
                  <Input
                    value={fiche.u_elem_commerce || ''}
                    onChange={(e) => handleChange('u_elem_commerce', e.target.value)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Colis</Label>
                  <Input
                    value={fiche.colis_commerce || ''}
                    onChange={(e) => handleChange('colis_commerce', e.target.value)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Nbre d'UC/Couche</Label>
                  <Input
                    type="number"
                    value={fiche.nombre_uc_couche_commerce || ''}
                    onChange={(e) => handleChange('nombre_uc_couche_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Nbre d'UC/Palette</Label>
                  <Input
                    type="number"
                    value={fiche.nombre_uc_palette_commerce || ''}
                    onChange={(e) => handleChange('nombre_uc_palette_commerce', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* GTIN */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">GTIN</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">EAN14 carton</Label>
                  <Input
                    value={fiche.gtin_ean14_carton || ''}
                    onChange={(e) => handleChange('gtin_ean14_carton', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">EAN14 Couche</Label>
                  <Input
                    value={fiche.gtin_ean14_couche || ''}
                    onChange={(e) => handleChange('gtin_ean14_couche', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">EAN14 Palette</Label>
                  <Input
                    value={fiche.gtin_ean14_palette || ''}
                    onChange={(e) => handleChange('gtin_ean14_palette', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Client et statistiques */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Client et statistiques</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Client</Label>
                  <Input
                    value={fiche.client || ''}
                    onChange={(e) => handleChange('client', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                    placeholder="ITM"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Qté sur 12 mois</Label>
                  <Input
                    type="number"
                    value={fiche.qte_sur_12_mois || ''}
                    onChange={(e) => handleChange('qte_sur_12_mois', parseFloat(e.target.value) || null)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 text-sm">Coeff Stat</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={fiche.coeff_stat || ''}
                      onChange={(e) => handleChange('coeff_stat', parseFloat(e.target.value) || null)}
                      disabled={isReadOnly}
                      className="h-10 flex-1"
                    />
                    <div className="w-12 h-10 bg-white border rounded flex items-center justify-center text-xs">0.2</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!isReadOnly && !fiche.visa_commerce && (
        <div className="pt-6 border-t border-slate-200">
          <Button
            onClick={onVisa}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 h-11"
          >
            <Check className="w-4 h-4 mr-2" />
            Visa Commerce
          </Button>
        </div>
      )}
    </div>
  );
}