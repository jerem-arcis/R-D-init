import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RefusSection from './RefusSection';
import { ValidationBadge, RefusBadge, RefusAlert } from './StatusBadges';

export default function GestionBesoinTab({ fiche, onUpdate, onVisa, onRefus, isReadOnly }) {
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
          <h2 className="text-xl font-semibold text-slate-900">Gestion du besoin</h2>
          <p className="text-sm text-slate-500 mt-1">Informations renseignées par l'ADV</p>
        </div>
        <div className="flex items-center gap-3">
          <RefusBadge isRefused={fiche.refus_gestion_besoin} date={fiche.refus_gestion_besoin_date} />
          <ValidationBadge isValidated={fiche.visa_gestion_besoin} date={fiche.visa_gestion_besoin_date} />
        </div>
      </div>

      <RefusAlert motif={fiche.refus_gestion_besoin_motif} />

      <div className="space-y-6">
        {/* Clés de calcul - Mode initial */}
        {isInitialMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cle_calcul_lot_usine" className="text-slate-700 font-medium">
                Clé de calcul de la taille de lot (usine)
              </Label>
              <Input
                id="cle_calcul_lot_usine"
                value={fiche.cle_calcul_lot_usine || ''}
                onChange={(e) => handleChange('cle_calcul_lot_usine', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir la clé de calcul usine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cle_calcul_lot_stockiste" className="text-slate-700 font-medium">
                Clé de calcul de la taille de lot (stockiste)
              </Label>
              <Input
                id="cle_calcul_lot_stockiste"
                value={fiche.cle_calcul_lot_stockiste || ''}
                onChange={(e) => handleChange('cle_calcul_lot_stockiste', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir la clé de calcul stockiste"
              />
            </div>
          </div>
        )}

        {/* Mode complet */}
        {!isInitialMode && (
          <>
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <h3 className="font-semibold text-slate-800 mb-3">Divisions usines</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">
                    Clé de calcul de taille de lot [division usine] :
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-3 py-1 bg-white rounded border">
                      {fiche.cle_calcul_lot_usine || 'EX'}
                    </span>
                    <span className="text-xs text-slate-500">Le produit ne part pas de l'usine</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Profil de couverture</Label>
                    <Input
                      value={fiche.profil_couverture_usine || ''}
                      onChange={(e) => handleChange('profil_couverture_usine', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">OU</Label>
                    <div className="h-9 flex items-center justify-center bg-white border rounded">
                      <span className="text-slate-400">—</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Délai de sécurité</Label>
                    <Input
                      value={fiche.delai_securite_usine || ''}
                      onChange={(e) => handleChange('delai_securite_usine', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Dél séc/couv réelle</Label>
                    <Input
                      value={fiche.delai_sec_couv_reelle_usine || ''}
                      onChange={(e) => handleChange('delai_sec_couv_reelle_usine', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Type d'approvisionnement [divisions usines]</Label>
                    <Input
                      value={fiche.type_approvisionnement_usine || 'E'}
                      onChange={(e) => handleChange('type_approvisionnement_usine', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Délai prévisionnel de livraison</Label>
                    <Input
                      value={fiche.delai_previsionnel_livraison || ''}
                      onChange={(e) => handleChange('delai_previsionnel_livraison', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <h3 className="font-semibold text-slate-800 mb-3">Divisions stockistes</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">
                    Clé de calcul de taille de lot [division stockiste] :
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-3 py-1 bg-white rounded border">
                      {fiche.cle_calcul_lot_stockiste || 'ZN'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Pâtisseries : hors RHF - Produits Mc Do - Produits saisonniers * Glaces : hors PFA * Traiteur : hors frais
                    </span>
                  </div>
                </div>

                <div className="bg-yellow-100 rounded p-3 mb-3">
                  <h4 className="font-semibold text-sm mb-2">Critères</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pâtisserie RHF</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pâtisserie RHF McDO</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pâtisserie RHF pas McDO</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pâtisserie non saisonnière</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>EX</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">PFA</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">OneShot existe</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Frais</span>
                      <span className="bg-yellow-200 px-2 py-0.5 rounded">FAUX</span>
                      <span>ZN</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Profil de couverture</Label>
                    <Input
                      value={fiche.profil_couverture_stockiste || ''}
                      onChange={(e) => handleChange('profil_couverture_stockiste', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">OU</Label>
                    <div className="h-9 flex items-center justify-center bg-white border rounded">
                      <span className="text-slate-400">—</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Délai de sécurité</Label>
                    <Input
                      value={fiche.delai_securite_stockiste || '21'}
                      onChange={(e) => handleChange('delai_securite_stockiste', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Dél séc/couv réelle</Label>
                    <Input
                      value={fiche.delai_sec_couv_reelle_stockiste || ''}
                      onChange={(e) => handleChange('delai_sec_couv_reelle_stockiste', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Type d'approvisionnement [division stockiste]</Label>
                    <Input
                      value={fiche.type_approvisionnement_stockiste || 'F'}
                      onChange={(e) => handleChange('type_approvisionnement_stockiste', e.target.value)}
                      disabled={isReadOnly}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Approvisionnement spécial</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={fiche.approvisionnement_special || '43'}
                        onChange={(e) => handleChange('approvisionnement_special', e.target.value)}
                        disabled={isReadOnly}
                        className="h-9 flex-1"
                      />
                      <span className="text-xs px-2 py-1 bg-white border rounded">43-AGEN</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Temps de réception [divisions stockistes]</Label>
                  <Input
                    value={fiche.temps_reception_stockiste || '0 jours'}
                    onChange={(e) => handleChange('temps_reception_stockiste', e.target.value)}
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <RefusSection
        onVisa={onVisa}
        onRefus={onRefus}
        visaLabel="Visa Gestion du besoin"
        isVisible={!isReadOnly && !fiche.visa_gestion_besoin}
      />
    </div>
  );
}