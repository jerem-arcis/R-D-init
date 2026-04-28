import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ControleGestionTab({ fiche, onUpdate, onVisa, onRefus, isReadOnly }) {
  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  const handleChange = (field, value) => {
    if (!isReadOnly) {
      onUpdate({ [field]: value });
    }
  };

  const handleConfirmRefus = () => {
    if (!motifRefus.trim()) {
      alert('Veuillez saisir un motif de refus');
      return;
    }
    onRefus(motifRefus);
    setShowRefus(false);
    setMotifRefus('');
  };

  // Mode initial : afficher seulement les champs de base si étape <= 3
  const isInitialMode = fiche.etape_courante <= 3;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Contrôle de Gestion</h2>
          <p className="text-sm text-slate-500 mt-1">Informations renseignées par l'ADV</p>
        </div>
        <div className="flex items-center gap-3">
          {fiche.refus_controle_gestion && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-700">Étape refusée</p>
                {fiche.refus_controle_gestion_date && (
                  <p className="text-xs text-red-600">
                    {format(new Date(fiche.refus_controle_gestion_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          )}
          {fiche.visa_controle_gestion && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700">Visa validé</p>
                {fiche.visa_controle_gestion_date && (
                  <p className="text-xs text-emerald-600">
                    {format(new Date(fiche.visa_controle_gestion_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {fiche.refus_controle_gestion && fiche.refus_controle_gestion_motif && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Motif du refus :</strong> {fiche.refus_controle_gestion_motif}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="code_article" className="text-slate-700 font-medium">
            Code article
          </Label>
          <Input
            id="code_article"
            value={fiche.code_article || ''}
            onChange={(e) => handleChange('code_article', e.target.value)}
            disabled={isReadOnly}
            className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
            placeholder="Saisir le code article"
          />
        </div>

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

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="libelle_article" className="text-slate-700 font-medium">
            Libellé article (19/60 car)
          </Label>
          <Input
            id="libelle_article"
            value={fiche.libelle_article || ''}
            onChange={(e) => handleChange('libelle_article', e.target.value)}
            disabled={isReadOnly}
            className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
            placeholder="Saisir le libellé article"
          />
        </div>

        {!isInitialMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="reference_demande_etude" className="text-slate-700 font-medium">
                Référence demande d'étude
              </Label>
              <Input
                id="reference_demande_etude"
                value={fiche.reference_demande_etude || ''}
                onChange={(e) => handleChange('reference_demande_etude', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code_etude_rd" className="text-slate-700 font-medium">
                Code Etude R&D
              </Label>
              <Input
                id="code_etude_rd"
                value={fiche.code_etude_rd || ''}
                onChange={(e) => handleChange('code_etude_rd', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="centre_profit" className="text-slate-700 font-medium bg-yellow-100 px-2 py-1 inline-block rounded">
                Centre de profit
              </Label>
              <Input
                id="centre_profit"
                value={fiche.centre_profit || ''}
                onChange={(e) => handleChange('centre_profit', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
              />
            </div>

            <div className="space-y-2 md:col-span-2 mt-4">
              <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">DevaLine :</Label>
                  <Input
                    type="date"
                    value={fiche.devaline || ''}
                    onChange={(e) => handleChange('devaline', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">Retour information :</Label>
                  <Input
                    type="date"
                    value={fiche.retour_information || ''}
                    onChange={(e) => handleChange('retour_information', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">Date limite création MM01 :</Label>
                  <Input
                    type="date"
                    value={fiche.date_limite_creation_mm01 || ''}
                    onChange={(e) => handleChange('date_limite_creation_mm01', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">Date envoi ficher :</Label>
                  <Input
                    type="date"
                    value={fiche.date_envoi_ficher || ''}
                    onChange={(e) => handleChange('date_envoi_ficher', e.target.value)}
                    disabled={isReadOnly}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {isInitialMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="code_etude_rd" className="text-slate-700 font-medium">
                Code étude R&D
              </Label>
              <Input
                id="code_etude_rd"
                value={fiche.code_etude_rd || ''}
                onChange={(e) => handleChange('code_etude_rd', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir le code étude R&D"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="centre_profit" className="text-slate-700 font-medium">
                Centre de profit (MARC-PRCTR)
              </Label>
              <Input
                id="centre_profit"
                value={fiche.centre_profit || ''}
                onChange={(e) => handleChange('centre_profit', e.target.value)}
                disabled={isReadOnly}
                className={`h-11 ${isReadOnly ? 'bg-slate-50 text-slate-500' : ''}`}
                placeholder="Saisir le centre de profit"
              />
            </div>
          </>
        )}
      </div>

      {!isReadOnly && !fiche.visa_controle_gestion && !showRefus && (
        <div className="pt-6 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setShowRefus(true)}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Refuser l'étape
          </Button>
          <Button
            onClick={onVisa}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 h-auto uppercase text-sm font-bold tracking-wide"
          >
            <Check className="w-4 h-4 mr-2" />
            Visa ControleDeGestion
          </Button>
        </div>
      )}

      {showRefus && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">
              Motif de refus <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="Expliquer pourquoi cette étape est refusée..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRefus(false);
                setMotifRefus('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmRefus}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirmer le refus
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}