import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings2,
  List,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  DROPDOWN_KEYS,
  OPTIONSET_QUERY_KEY,
  useOptionSetRows,
} from '@/lib/adminLists';
import { create, remove, update } from '@/api/optionSet';

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

function EditableRow({ row, onSave, onAskDelete, disabled }) {
  const [draft, setDraft] = useState(row.value);

  const handleBlur = () => {
    const v = draft.trim();
    if (!v || v === row.value) {
      setDraft(row.value);
      return;
    }
    onSave(row.id, v);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="h-9 flex-1"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onAskDelete(row)}
        disabled={disabled}
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useOptionSetRows();

  const [selectedKey, setSelectedKey] = useState('reseaux');
  const [newValue, setNewValue] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const currentRows = rows.filter((r) => r.dropdownId === selectedKey);
  const countByKey = (key) =>
    rows.filter((r) => r.dropdownId === key).length;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: OPTIONSET_QUERY_KEY });

  const createMut = useMutation({
    mutationFn: ({ dropdownId, value }) => create(dropdownId, value),
    onSuccess: () => {
      invalidate();
      setNewValue('');
      toast({ title: 'Valeur ajoutée' });
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: err?.message || "L'ajout a échoué.",
        variant: 'destructive',
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, value }) => update(id, value),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Valeur modifiée' });
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: err?.message || 'La modification a échoué.',
        variant: 'destructive',
      });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id) => remove(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Valeur supprimée' });
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: err?.message || 'La suppression a échoué.',
        variant: 'destructive',
      });
    },
  });

  const busy =
    createMut.isPending || updateMut.isPending || removeMut.isPending;

  const handleAdd = () => {
    const v = newValue.trim();
    if (!v) return;
    if (currentRows.some((r) => r.value === v)) {
      toast({ title: 'Doublon', description: 'Cette valeur existe déjà.' });
      return;
    }
    createMut.mutate({ dropdownId: selectedKey, value: v });
  };

  const confirmDelete = () => {
    if (toDelete) {
      removeMut.mutate(toDelete.id);
      setToDelete(null);
    }
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
            {busy && (
              <Loader2 className="ml-auto w-5 h-5 text-primary animate-spin" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-secondary/60 border-b border-border px-4 py-3 flex items-center gap-2">
              <List className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wide">
                Listes déroulantes
              </h2>
            </div>
            <nav className="p-2 space-y-0.5">
              {DROPDOWN_KEYS.map((key) => (
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
                      {countByKey(key)}
                    </span>
                    {selectedKey === key && (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">
                {LIST_LABELS[selectedKey]}
              </h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {currentRows.length} valeur{currentRows.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-6 space-y-5">
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
                    disabled={createMut.isPending}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={createMut.isPending}
                  className="self-end h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              <div className="border border-border rounded-lg divide-y divide-border">
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement…
                  </div>
                ) : currentRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucune valeur. Ajoutez-en une ci-dessus.
                  </div>
                ) : (
                  currentRows.map((row) => (
                    <EditableRow
                      key={row.id}
                      row={row}
                      onSave={(id, value) => updateMut.mutate({ id, value })}
                      onAskDelete={(r) => setToDelete(r)}
                      disabled={busy}
                    />
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground italic">
                Les modifications sont enregistrées automatiquement.
              </p>
            </div>
          </section>
        </div>
      </main>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette valeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `La valeur "${toDelete.value}" sera définitivement supprimée. Cette action est irréversible.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
