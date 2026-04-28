import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send } from 'lucide-react';

const USINES = [
  'Montauban',
  'Wasens',
  'Villefranche',
  'Lessay',
  'Autre'
];

const CATEGORIES = [
  { value: 'surgele', label: 'Surgelé' },
  { value: 'patisserie', label: 'Pâtisserie' },
  { value: 'traiteur', label: 'Traiteur' },
  { value: 'snacking', label: 'Snacking' },
  { value: 'autre', label: 'Autre' }
];

export default function CreerDE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    designation_article: '',
    usine: '',
    poids_net_estime: '',
    longueur_mm: '',
    largeur_mm: '',
    hauteur_mm: '',
    categorie_produit: '',
    statut: 'brouillon'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DemandeEtude.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      navigate(createPageUrl('DemandesEtude'));
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBrouillon = () => {
    createMutation.mutate({ ...formData, statut: 'brouillon' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const requiredFields = ['designation_article', 'usine', 'poids_net_estime', 'longueur_mm', 'largeur_mm', 'hauteur_mm', 'categorie_produit'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    createMutation.mutate({ ...formData, statut: 'a_traiter_adv' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DemandesEtude')}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                Nouvelle Demande d'Étude
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Remplir les informations de base</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-card rounded-xl border border-border shadow-md p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="designation_article" className="text-slate-700 font-medium">
                Désignation de l'article <span className="text-red-500">*</span>
              </Label>
              <Input
                id="designation_article"
                value={formData.designation_article}
                onChange={(e) => handleChange('designation_article', e.target.value)}
                placeholder="Ex: Yaourt nature 125g"
                className="h-11"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Usine concernée <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.usine} onValueChange={(value) => handleChange('usine', value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sélectionner une usine" />
                  </SelectTrigger>
                  <SelectContent>
                    {USINES.map(usine => (
                      <SelectItem key={usine} value={usine}>{usine}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Catégorie / Type de produit <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.categorie_produit} onValueChange={(value) => handleChange('categorie_produit', value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poids_net_estime" className="text-slate-700 font-medium">
                Poids net estimé (grammes) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="poids_net_estime"
                type="number"
                value={formData.poids_net_estime}
                onChange={(e) => handleChange('poids_net_estime', e.target.value)}
                placeholder="Ex: 125"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-4">
              <Label className="text-slate-700 font-medium">
                Dimensions approximatives (mm) <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="longueur_mm" className="text-xs text-slate-600">Longueur</Label>
                  <Input
                    id="longueur_mm"
                    type="number"
                    value={formData.longueur_mm}
                    onChange={(e) => handleChange('longueur_mm', e.target.value)}
                    placeholder="mm"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="largeur_mm" className="text-xs text-slate-600">Largeur</Label>
                  <Input
                    id="largeur_mm"
                    type="number"
                    value={formData.largeur_mm}
                    onChange={(e) => handleChange('largeur_mm', e.target.value)}
                    placeholder="mm"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hauteur_mm" className="text-xs text-slate-600">Hauteur</Label>
                  <Input
                    id="hauteur_mm"
                    type="number"
                    value={formData.hauteur_mm}
                    onChange={(e) => handleChange('hauteur_mm', e.target.value)}
                    placeholder="mm"
                    className="h-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveBrouillon}
                disabled={createMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer brouillon
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                disabled={createMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer à l'ADV
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}