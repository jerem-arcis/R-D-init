import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus } from 'lucide-react';

export default function CreerFL() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [codeArticle, setCodeArticle] = useState('');
  const [libelleArticle, setLibelleArticle] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.create(data),
    onSuccess: (fiche) => {
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
      navigate(createPageUrl(`FicheDetail?id=${fiche.id}`));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!codeArticle.trim() || !libelleArticle.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    createMutation.mutate({
      code_article: codeArticle,
      libelle_article: libelleArticle,
      etat_global: 'en_attente',
      etape_courante: 1
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-[#FAF6EC] to-[#EFE8D9]">
      <header className="bg-gradient-to-r from-white to-[#FAF6EC] border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Accueil')}>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-[#5B3A8E] hover:bg-[#5B3A8E]/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                Nouvelle Fiche de Lancement
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">Création directe d'une FL</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code_article" className="text-slate-700 font-medium">
                Code article <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code_article"
                value={codeArticle}
                onChange={(e) => setCodeArticle(e.target.value)}
                placeholder="Ex: 648900000"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle_article" className="text-slate-700 font-medium">
                Libellé article <span className="text-red-500">*</span>
              </Label>
              <Input
                id="libelle_article"
                value={libelleArticle}
                onChange={(e) => setLibelleArticle(e.target.value)}
                placeholder="Ex: Yaourt nature 125g"
                className="h-11"
                required
              />
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#5B3A8E] to-[#7B4FB5] hover:from-[#4A2E75] hover:to-[#6A3FA0] text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                disabled={createMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer la fiche
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}