import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

// Dossier ou page hors du périmètre société de l'utilisateur.
export default function AccesRefuse({ message = "Ce dossier appartient à une société à laquelle vous n'êtes pas rattaché." }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <ShieldAlert className="w-10 h-10 mx-auto text-rose-600" />
        <h1 className="text-lg font-bold text-foreground">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="outline">Retour au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
