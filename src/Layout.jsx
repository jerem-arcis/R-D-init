import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header Boncolac Style */}
      <header className="bg-[#2C2C2C] border-b border-[#444]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Accueil')} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69383b6842c6c81a3e8e96d2/22582b55d_boncolac.jpeg" 
                alt="Boncolac" 
                className="w-16 h-16 object-contain"
              />
              <div className="text-white">
                <div className="font-bold text-lg tracking-tight">FICHE LANCEMENT</div>
                <div className="text-xs text-gray-400">Gestion des produits</div>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link 
                to={createPageUrl('DemandesEtude')}
                className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                  currentPageName === 'DemandesEtude' || currentPageName === 'CreerDE' || currentPageName === 'TraiterDE'
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Demandes d'Étude (DE)
              </Link>
              <Link 
                to={createPageUrl('Accueil')}
                className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                  currentPageName === 'Accueil' || currentPageName === 'FicheDetail' || currentPageName === 'CreerFL'
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Fiches de Lancement (FL)
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  );
}