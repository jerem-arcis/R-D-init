import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RefusSection from './RefusSection';
import { ValidationBadge, RefusBadge, RefusAlert } from './StatusBadges';

export default function SupplyChainTab({ fiche, onUpdate, onVisa, onRefus, isReadOnly }) {
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
          <h2 className="text-xl font-semibold text-slate-900">Supply Chain</h2>
          <p className="text-sm text-slate-500 mt-1">Informations renseignées par l'ADV</p>
        </div>
        <div className="flex items-center gap-3">
          <RefusBadge isRefused={fiche.refus_supply_chain} date={fiche.refus_supply_chain_date} />
          <ValidationBadge isValidated={fiche.visa_supply_chain} date={fiche.visa_supply_chain_date} />
        </div>
      </div>

      <RefusAlert motif={fiche.refus_supply_chain_motif} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isInitialMode && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Code article</Label>
              <Input
                value={fiche.code_article || ''}
                disabled
                className="h-10 bg-slate-50 text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Libellé de l'article</Label>
              <Input
                value={fiche.libelle_article || ''}
                disabled
                className="h-10 bg-slate-50 text-slate-500"
              />
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="sites_stockage" className="text-slate-700 font-medium bg-yellow-100 px-2 py-1 inline-block rounded">
            Sites de stockage
          </Label>
          <Textarea
            id="sites_stockage"
            value={fiche.sites_stockage || ''}
            onChange={(e) => handleChange('sites_stockage', e.target.value)}
            disabled={isReadOnly}
            className={`min-h-[120px] ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
            placeholder="Ex: 2825-Olano Montauban&#10;2824-Olano Wasens&#10;..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label className="text-slate-700 font-medium bg-yellow-100 px-2 py-1 inline-block rounded mb-2">
            Groupement d'articles
          </Label>
          <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">QC2-Groupe statistique article</span>
              <span className="font-medium text-slate-900">1-Groupe article 1</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">AY-MB INTERMARCHE</span>
              <span className="font-medium text-slate-900">AY-MB INTERMARCHE</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">QC2-Groupe de retournes</span>
              <span className="font-medium text-slate-900">AY-MB INTERMARCHE</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">QC2-Groupe imputation article</span>
              <span className="font-medium text-slate-900">01-c'produits fins</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">QC2-Article prix</span>
              <span className="font-medium text-slate-900 bg-yellow-100 px-2 py-0.5 rounded">{fiche.code_article || '648900000'}</span>
            </div>
          </div>
        </div>

        {!isInitialMode && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Ancien article</Label>
              <Input
                value={fiche.ancien_article || ''}
                onChange={(e) => handleChange('ancien_article', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
              />
            </div>

            <div className="space-y-2 md:col-span-2 mt-4">
              <Label className="text-slate-700 font-medium bg-cyan-100 px-2 py-1 inline-block rounded mb-2">
                Compteur GTIN
              </Label>
              <div className="grid grid-cols-3 gap-4 bg-cyan-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">EAN14 carton</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-cyan-200 text-center py-2 rounded text-sm font-mono">
                      {fiche.ean14_carton || '4'}
                    </div>
                    <Input
                      type="number"
                      value={fiche.ean14_carton || ''}
                      onChange={(e) => handleChange('ean14_carton', e.target.value)}
                      disabled={isReadOnly}
                      className="w-20 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">EAN14 Couche</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-cyan-200 text-center py-2 rounded text-sm font-mono">
                      {fiche.ean14_couche || '5'}
                    </div>
                    <Input
                      type="number"
                      value={fiche.ean14_couche || ''}
                      onChange={(e) => handleChange('ean14_couche', e.target.value)}
                      disabled={isReadOnly}
                      className="w-20 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">EAN14 Palette</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-cyan-200 text-center py-2 rounded text-sm font-mono">
                      {fiche.ean14_palette || '6'}
                    </div>
                    <Input
                      type="number"
                      value={fiche.ean14_palette || ''}
                      onChange={(e) => handleChange('ean14_palette', e.target.value)}
                      disabled={isReadOnly}
                      className="w-20 h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {isInitialMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="vl" className="text-slate-700 font-medium">
                VL
              </Label>
              <Input
                id="vl"
                value={fiche.vl || ''}
                onChange={(e) => handleChange('vl', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir le VL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupement_articles" className="text-slate-700 font-medium">
                Groupement d'articles (MVKE-KONDM)
              </Label>
              <Input
                id="groupement_articles"
                value={fiche.groupement_articles || ''}
                onChange={(e) => handleChange('groupement_articles', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir le groupement d'articles"
              />
            </div>
          </>
        )}
      </div>

      <RefusSection
        onVisa={onVisa}
        onRefus={onRefus}
        visaLabel="Visa SupplyChain"
        isVisible={!isReadOnly && !fiche.visa_supply_chain}
      />
    </div>
  );
}