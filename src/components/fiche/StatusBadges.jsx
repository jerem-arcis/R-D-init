import React from 'react';
import { ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ValidationBadge({ isValidated, date }) {
  if (!isValidated) return null;
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
      <ShieldCheck className="w-5 h-5 text-emerald-600" />
      <div>
        <p className="text-sm font-medium text-emerald-700">Visa validé</p>
        {date && (
          <p className="text-xs text-emerald-600">
            {format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
        )}
      </div>
    </div>
  );
}

export function RefusBadge({ isRefused, date }) {
  if (!isRefused) return null;
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
      <XCircle className="w-5 h-5 text-red-600" />
      <div>
        <p className="text-sm font-medium text-red-700">Étape refusée</p>
        {date && (
          <p className="text-xs text-red-600">
            {format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
        )}
      </div>
    </div>
  );
}

export function RefusAlert({ motif }) {
  if (!motif) return null;
  
  return (
    <Alert className="bg-red-50 border-red-200">
      <XCircle className="w-4 h-4 text-red-600" />
      <AlertDescription className="text-red-700">
        <strong>Motif du refus :</strong> {motif}
      </AlertDescription>
    </Alert>
  );
}