import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, Check } from 'lucide-react';

export default function RefusSection({ 
  onVisa, 
  onRefus, 
  visaLabel,
  isVisible 
}) {
  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  const handleConfirmRefus = () => {
    if (!motifRefus.trim()) {
      alert('Veuillez saisir un motif de refus');
      return;
    }
    onRefus(motifRefus);
    setShowRefus(false);
    setMotifRefus('');
  };

  if (!isVisible) return null;

  if (showRefus) {
    return (
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
    );
  }

  return (
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
        className="bg-[#5B3A8E] hover:bg-[#4A2E75] text-white px-6 py-2 h-11"
      >
        <Check className="w-4 h-4 mr-2" />
        {visaLabel}
      </Button>
    </div>
  );
}