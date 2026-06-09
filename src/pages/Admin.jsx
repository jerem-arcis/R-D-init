import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings2,
  List,
  Plus,
  Trash2,
  Save,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { loadAdminLists, saveAdminLists } from '@/lib/adminLists';

const LIST_LABELS = {
  reseaux: 'Réseaux',
  groupes_article: 'Groupes article',
  axes_strategiques: 'Axes stratégiques',
  familles_produit: 'Familles produit',
  secteurs_activite: "Secteurs d'activité",
  categories_vif: 'Catégories (Vif)',
  types_logistique: 'Types de logistique',
  services_demandeur: 'Services demandeur',
};

export default function Admin() {
  const { toast } = useToast();
  const [lists, setLists] = useState(loadAdminLists);
  const [selectedKey, setSelectedKey] = useState('reseaux');
  const [newValue, setNewValue] = useState('');

  const currentList = lists[selectedKey] || [];

  const handleAdd = () => {
    const v = newValue.trim();
    if (!v) return;
    if (currentList.includes(v)) {
      toast({ title: 'Doublon', description: 'Cette valeur existe déjà.' });
      return;
    }
    const updated = { ...lists, [selectedKey]: [...currentList, v] };
    setLists(updated);
    setNewValue('');
  };

  const handleRemove = (val) => {
    const updated = {
      ...lists,
      [selectedKey]: currentList.filter((v) => v !== val),
    };
    setLists(updated);
  };

  const handleEdit = (index, newVal) => {
    const arr = [...currentList];
    arr[index] = newVal;
    setLists({ ...lists, [selectedKey]: arr });
  };

  const handleSave = () => {
    saveAdminLists(lists);
    toast({
      title: 'Modifications enregistrées',
      description: 'Les listes ont été sauvegardées.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                Administration
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gérer les valeurs des listes déroulantes de l'application
              </p>
            </div>
            <Button
              onClick={handleSave}
              className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          {/* Liste des dropdowns à gérer */}
          <aside className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-secondary/60 border-b border-border px-4 py-3 flex items-center gap-2">
              <List className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wide">
                Listes déroulantes
              </h2>
            </div>
            <nav className="p-2 space-y-0.5">
              {Object.keys(LIST_LABELS).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedKey === key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{LIST_LABELS[key]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {lists[key]?.length || 0}
                    </span>
                    {selectedKey === key && (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          {/* Édition de la liste */}
          <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">
                {LIST_LABELS[selectedKey]}
              </h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {currentList.length} valeur{currentList.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-6 space-y-5">
              {/* Ajouter une valeur */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-slate-700 font-medium text-sm">
                    Ajouter une valeur
                  </Label>
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                    placeholder="Nouvelle valeur…"
                    className="h-11 mt-2"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAdd}
                  className="self-end h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {/* Liste existante */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {currentList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucune valeur. Ajoutez-en une ci-dessus.
                  </div>
                ) : (
                  currentList.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <Input
                        value={val}
                        onChange={(e) => handleEdit(idx, e.target.value)}
                        className="h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(val)}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground italic">
                Astuce : pensez à cliquer sur « Enregistrer » en haut à droite
                pour conserver vos modifications.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
