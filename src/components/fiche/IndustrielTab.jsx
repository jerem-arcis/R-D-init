import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function IndustrielTab({ fiche, onUpdate, onVisa, isReadOnly }) {
  const handleChange = (field, value) => {
    if (!isReadOnly) {
      onUpdate({ [field]: value });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Industriel</h2>
          <p className="text-sm text-slate-500 mt-1">Informations renseignées par le Site</p>
        </div>
        {fiche.visa_industriel && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">Visa validé</p>
              {fiche.visa_industriel_date && (
                <p className="text-xs text-emerald-600">
                  {format(new Date(fiche.visa_industriel_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* En-tête */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm">Code article</Label>
            <Input
              value={fiche.code_article || ''}
              disabled
              className="h-10 bg-white text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm">Désignation article</Label>
            <Input
              value={fiche.designation_article || ''}
              onChange={(e) => handleChange('designation_article', e.target.value)}
              disabled={isReadOnly}
              className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm">Demande d'étude</Label>
            <Input
              value={fiche.demande_etude || ''}
              onChange={(e) => handleChange('demande_etude', e.target.value)}
              disabled={isReadOnly}
              className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
            />
          </div>
        </div>

        {/* Libellés */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Libellés</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Libellé article plus</Label>
              <Input
                value={fiche.libelle_article_plus || ''}
                onChange={(e) => handleChange('libelle_article_plus', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">mask100x150S.lab</Label>
              <Input
                value={fiche.mask100x150s_lab || ''}
                onChange={(e) => handleChange('mask100x150s_lab', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Type palette */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Type palette</h3>
          <div className="space-y-2">
            <Input
              value={fiche.type_palette_industriel || 'SME80 : Palette 80 x 120 Europe'}
              onChange={(e) => handleChange('type_palette_industriel', e.target.value)}
              disabled={isReadOnly}
              className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
            />
          </div>
        </div>

        {/* Conditionnement et dimensions */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Conditionnement et dimensions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">PCB / rang sup.</Label>
              <Input
                value={fiche.pcb_rang_sup || ''}
                onChange={(e) => handleChange('pcb_rang_sup', e.target.value)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Volume (U)</Label>
              <Input
                type="number"
                value={fiche.volume || ''}
                onChange={(e) => handleChange('volume', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Poids brut</Label>
              <Input
                type="number"
                step="0.01"
                value={fiche.poids_brut || ''}
                onChange={(e) => handleChange('poids_brut', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Poids net</Label>
              <Input
                type="number"
                step="0.01"
                value={fiche.poids_net || ''}
                onChange={(e) => handleChange('poids_net', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">long (mm)</Label>
              <Input
                type="number"
                value={fiche.dimension_longueur || ''}
                onChange={(e) => handleChange('dimension_longueur', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">larg (mm)</Label>
              <Input
                type="number"
                value={fiche.dimension_largeur || ''}
                onChange={(e) => handleChange('dimension_largeur', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">haut (mm)</Label>
              <Input
                type="number"
                value={fiche.dimension_hauteur || ''}
                onChange={(e) => handleChange('dimension_hauteur', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">UVC</Label>
              <Input
                value={fiche.uvc || ''}
                onChange={(e) => handleChange('uvc', e.target.value)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">U /élém.</Label>
              <Input
                value={fiche.u_elem || ''}
                onChange={(e) => handleChange('u_elem', e.target.value)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Colis</Label>
              <Input
                value={fiche.colis || ''}
                onChange={(e) => handleChange('colis', e.target.value)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Nbre d'UC/Couche</Label>
              <Input
                type="number"
                value={fiche.nombre_uc_couche || ''}
                onChange={(e) => handleChange('nombre_uc_couche', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Nbre d'UC/Palette</Label>
              <Input
                type="number"
                value={fiche.nombre_uc_palette || ''}
                onChange={(e) => handleChange('nombre_uc_palette', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations supplémentaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Nombre de colis dans cheminde</Label>
              <Input
                type="number"
                value={fiche.nombre_colis_cheminde || ''}
                onChange={(e) => handleChange('nombre_colis_cheminde', parseFloat(e.target.value) || null)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Temps de réception [divisions usines]</Label>
              <Input
                value={fiche.temps_reception_industriel || ''}
                onChange={(e) => handleChange('temps_reception_industriel', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
                placeholder="10 jours"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Famille des SPECL</Label>
              <Input
                value={fiche.famille_specl || ''}
                onChange={(e) => handleChange('famille_specl', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Format DLUO Etiq.Colis</Label>
              <Input
                value={fiche.format_dluo_etiq_colis || ''}
                onChange={(e) => handleChange('format_dluo_etiq_colis', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
                placeholder="3 = MM AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Type Mge EM FR</Label>
              <Input
                value={fiche.type_mge_em_fr || ''}
                onChange={(e) => handleChange('type_mge_em_fr', e.target.value)}
                disabled={isReadOnly}
                className={`h-10 ${isReadOnly ? 'bg-white text-slate-500' : ''}`}
                placeholder="001"
              />
            </div>
          </div>
        </div>
      </div>

      {!isReadOnly && !fiche.visa_industriel && (
        <div className="pt-6 border-t border-slate-200">
          <Button
            onClick={onVisa}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 h-11"
          >
            <Check className="w-4 h-4 mr-2" />
            Visa Industriel
          </Button>
        </div>
      )}
    </div>
  );
}