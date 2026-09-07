import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, Check } from 'lucide-react';

export default function RefusSection({
  onVisa,
  onRefus,
  visaLabel,
  isVisible,
  blockers = [], // champs vides bloquant le visa ({ name, label })
}) {
  const bloque = blockers.length > 0;
  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  // Motif obligatoire : contrôlé en désactivant le bouton, sans alert() natif
  // (aucune boîte de dialogue navigateur dans l'app).
  const motifValide = motifRefus.trim().length > 0;

  const handleConfirmRefus = () => {
    if (!motifValide) return;
    onRefus(motifRefus);
    setShowRefus(false);
    setMotifRefus('');
  };

  if (!isVisible) return null;

  if (showRefus) {
    return (
      <div className="space-y-4 pt-6 border-t border-border">
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
          {!motifValide && (
            <p className="text-xs text-red-600">Le motif est obligatoire pour refuser.</p>
          )}
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
            disabled={!motifValide}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Confirmer le refus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-border space-y-3">
      {bloque && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5">
          <strong>Champs à remplir avant de viser ({blockers.length}) :</strong>{' '}
          {blockers.map((b) => b.label).join(', ')}
        </p>
      )}
      <div className="flex justify-between">
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
          disabled={bloque}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4 mr-2" />
          {visaLabel}
        </Button>
      </div>
    </div>
  );
}