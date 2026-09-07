import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, AlertCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const VISAS = [
  { key: 'supply_chain', label: 'ADV', short: 'ADV' },
  { key: 'industriel', label: 'Industriel', short: 'IND' },
  { key: 'commerce', label: 'Commerce', short: 'COM' },
];

function VisaPill({ visa, fiche, onVisa, onRefus, blockers = [] }) {
  const [open, setOpen] = useState(false);
  const [showRefus, setShowRefus] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [motif, setMotif] = useState('');
  const bloque = blockers.length > 0;

  const validated = fiche[`visa_${visa.key}`];
  const refused = fiche[`refus_${visa.key}`];
  const date = fiche[`visa_${visa.key}_date`] || fiche[`refus_${visa.key}_date`];

  const state = validated ? 'ok' : refused ? 'ko' : 'pending';

  const cls = {
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
    ko: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
  }[state];

  const Icon = state === 'ok' ? ShieldCheck : state === 'ko' ? X : AlertCircle;

  // Motif obligatoire : bouton désactivé + message inline, jamais d'alert()
  // natif (aucune boîte de dialogue navigateur dans l'app).
  const motifValide = motif.trim().length > 0;

  const confirmRefus = () => {
    if (!motifValide) return;
    onRefus(motif);
    setMotif('');
    setShowRefus(false);
    setOpen(false);
  };

  // Fermeture du popover : on remet les sous-étapes à zéro (confirmation / refus).
  const handleOpenChange = (o) => {
    setOpen(o);
    if (!o) {
      setShowRefus(false);
      setShowConfirm(false);
      setMotif('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all ${cls}`}
        >
          <Icon className="w-3 h-3" />
          {visa.short}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{visa.label}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>
              {state === 'ok' ? 'Validé' : state === 'ko' ? 'Refusé' : 'En attente'}
            </span>
          </div>
          {date && (
            <p className="text-[11px] text-slate-500">
              {format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          {refused && fiche[`refus_${visa.key}_motif`] && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              <strong>Motif :</strong> {fiche[`refus_${visa.key}_motif`]}
            </p>
          )}

          {!validated && !showRefus && !showConfirm && (
            <div className="space-y-2 pt-1">
              {bloque && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                  <strong>Champs à remplir ({blockers.length}) :</strong>{' '}
                  {blockers.map((b) => b.label).join(', ')}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={bloque}
                  onClick={() => setShowConfirm(true)}
                  className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Viser
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRefus(true)}
                  className="flex-1 h-8 border-red-300 text-red-600 hover:bg-red-50 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Refuser
                </Button>
              </div>
            </div>
          )}

          {showConfirm && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-slate-700">
                Confirmer le visa <strong>{visa.label}</strong> ? Cette action verrouille les champs de la section.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 h-7 text-xs">
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onVisa();
                    setShowConfirm(false);
                    setOpen(false);
                  }}
                  className="flex-1 h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Confirmer
                </Button>
              </div>
            </div>
          )}

          {showRefus && (
            <div className="space-y-2 pt-1">
              <Label className="text-xs">Motif de refus *</Label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Pourquoi refuser..."
                className="min-h-[60px] text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowRefus(false)} className="flex-1 h-7 text-xs">
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={confirmRefus}
                  disabled={!motifValide}
                  className="flex-1 h-7 bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function VisaToolbar({ fiche, onVisaHandlers, onRefusHandlers, blockers = {} }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
        Visas :
      </span>
      {VISAS.map((v) => (
        <VisaPill
          key={v.key}
          visa={v}
          fiche={fiche}
          onVisa={onVisaHandlers[v.key]}
          onRefus={onRefusHandlers[v.key]}
          blockers={blockers[v.key] || []}
        />
      ))}
    </div>
  );
}
