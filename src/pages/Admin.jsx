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
  Upload,
  Activity,
  AlertTriangle,
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
import { parseOptionListFile } from '@/lib/parseOptionList';
import SuiviCreationsSap from '@/components/admin/SuiviCreationsSap';
import { useErreursSap } from '@/lib/useErreursSap';

const LIST_LABELS = {
  reseaux: 'Réseaux',
  groupes_autorisation: "Groupe d'autorisation",
  axes_strategiques: 'Axes stratégiques',
  secteurs_activite: "Secteurs d'activité",
  categories_vif: 'Catégories (Vif)',
  types_logistique: 'Types de logistique',
  services_demandeur: 'Services demandeur',
  canaux_distrib: 'Canaux de distribution',
};

// Exécute `fn` sur chaque item par salves de `size` (Promise.allSettled) pour
// éviter de saturer Dataverse (throttling) avec des centaines d'appels simultanés.
async function runInBatches(items, fn, size = 20) {
  let ok = 0;
  const errors = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.allSettled(chunk.map((it) => fn(it)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') ok += 1;
      else errors.push({ item: chunk[j], reason: r.reason });
    });
  }
  return { ok, errors };
}

function EditableRow({ row, onSave, onAskDelete, disabled }) {
  const [draft, setDraft] = useState(row.value);
  const [draftDesignation, setDraftDesignation] = useState(row.designation ?? '');

  const handleBlur = () => {
    const v = draft.trim();
    const d = draftDesignation.trim();
    if (!v) {
      setDraft(row.value);
      setDraftDesignation(row.designation ?? '');
      return;
    }
    if (v === row.value && d === (row.designation ?? '')) return;
    onSave(row.id, v, d);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-9 flex-1"
        disabled={disabled}
      />
      <Input
        value={draftDesignation}
        onChange={(e) => setDraftDesignation(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Désignation…"
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
  // Vue « Créations SAP » : null = éditeur de listes déroulantes, sinon 'suivi' | 'echec'.
  const [sapView, setSapView] = useState(null);
  const { suiviFlux, fluxKpis } = useErreursSap();
  const sapSuiviCount = suiviFlux.length;
  const sapEchecCount = fluxKpis.enErreur;
  const [newValue, setNewValue] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const currentRows = rows.filter((r) => r.dropdownId === selectedKey);
  const countByKey = (key) =>
    rows.filter((r) => r.dropdownId === key).length;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: OPTIONSET_QUERY_KEY });

  const createMut = useMutation({
    mutationFn: ({ dropdownId, value, designation }) =>
      create(dropdownId, value, designation),
    onSuccess: () => {
      invalidate();
      setNewValue('');
      setNewDesignation('');
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
    mutationFn: ({ id, value, designation }) => update(id, value, designation),
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
    createMut.isPending || updateMut.isPending || removeMut.isPending || importing || deletingAll;

  // Suppression de toutes les valeurs de la liste sélectionnée, par salves.
  const handleDeleteAll = async () => {
    const ids = currentRows.map((r) => r.id);
    setConfirmDeleteAll(false);
    if (ids.length === 0) return;
    setDeletingAll(true);
    try {
      const { ok, errors } = await runInBatches(ids, (id) => remove(id));
      invalidate();
      const firstErr = errors[0]?.reason;
      const firstMsg = firstErr?.message || (firstErr ? String(firstErr) : '');
      toast({
        title: errors.length ? 'Suppression partielle' : 'Liste vidée',
        description:
          `${ok} valeur(s) supprimée(s)${errors.length ? ` · ${errors.length} échec(s)` : ''}.` +
          (firstMsg ? ` Erreur : ${firstMsg}` : ''),
        variant: errors.length ? 'destructive' : undefined,
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err?.message || 'La suppression a échoué.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleAdd = () => {
    const v = newValue.trim();
    if (!v) return;
    if (currentRows.some((r) => r.value === v)) {
      toast({ title: 'Doublon', description: 'Cette valeur existe déjà.' });
      return;
    }
    createMut.mutate({
      dropdownId: selectedKey,
      value: v,
      designation: newDesignation.trim(),
    });
  };

  // Ajout en masse depuis un fichier Excel à deux colonnes (A = valeur,
  // B = désignation) : chaque ligne est créée sur la liste sélectionnée
  // (selectedKey -> cr04e_id_dd). Les doublons (valeur déjà présente dans la
  // liste) sont ignorés.
  const handleBulkImport = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const { lignes } = await parseOptionListFile(file);
      const existing = new Set(currentRows.map((r) => r.value));
      const aAjouter = lignes.filter((l) => !existing.has(l.value));
      const ignores = lignes.length - aAjouter.length;
      if (aAjouter.length === 0) {
        toast({
          title: 'Rien à ajouter',
          description: `Les ${lignes.length} valeur(s) du fichier existent déjà dans « ${LIST_LABELS[selectedKey]} ».`,
        });
        return;
      }
      // Ajout par salves pour ne pas saturer Dataverse sur les gros fichiers.
      const { ok, errors } = await runInBatches(aAjouter, (l) =>
        create(selectedKey, l.value, l.designation),
      );
      invalidate();
      const parts = [`${ok} valeur(s) ajoutée(s) à « ${LIST_LABELS[selectedKey]} »`];
      if (ignores) parts.push(`${ignores} doublon(s) ignoré(s)`);
      if (errors.length) parts.push(`${errors.length} échec(s)`);
      toast({
        title: errors.length ? 'Import partiel' : 'Import terminé',
        description: parts.join(' · ') + '.',
        variant: errors.length ? 'destructive' : undefined,
      });
    } catch (err) {
      toast({
        title: "Échec de l'import",
        description: err?.message || 'Impossible de lire ce fichier Excel.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
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
                Listes déroulantes et suivi des créations SAP
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
              {DROPDOWN_KEYS.map((key) => {
                const active = sapView === null && selectedKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSapView(null);
                      setSelectedKey(key);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{LIST_LABELS[key]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {countByKey(key)}
                      </span>
                      {active && <ChevronRight className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}

              {/* Groupe Créations SAP */}
              <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Créations SAP
              </div>
              {[
                { key: 'suivi', label: 'Suivi', icon: Activity, count: sapSuiviCount },
                { key: 'echec', label: 'En échec', icon: AlertTriangle, count: sapEchecCount },
              ].map(({ key, label, icon: Icon, count }) => {
                const active = sapView === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSapView(key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{count}</span>
                      {active && <ChevronRight className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {sapView ? (
            <SuiviCreationsSap filter={sapView} />
          ) : (
          <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">
                {LIST_LABELS[selectedKey]}
              </h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {currentRows.length} valeur{currentRows.length > 1 ? 's' : ''}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteAll(true)}
                disabled={busy || currentRows.length === 0}
                className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                {deletingAll ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                )}
                Tout supprimer
              </Button>
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
                <div className="flex-1">
                  <Label className="text-slate-700 font-medium text-sm">
                    Désignation
                  </Label>
                  <Input
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                    placeholder="Désignation (facultatif)…"
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

              {/* Ajout en masse depuis un fichier Excel (2 colonnes : valeur, désignation) */}
              <div>
                <label
                  htmlFor="bulk-import"
                  className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-all ${
                    importing
                      ? 'border-primary/30 bg-primary/5 cursor-wait'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                  }`}
                >
                  {importing ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {importing ? 'Import en cours…' : 'Ajout en masse (fichier Excel)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fichier à deux colonnes (A = valeur, B = désignation), en-tête en 1ère ligne. Les valeurs seront ajoutées à « {LIST_LABELS[selectedKey]} ».
                    </p>
                  </div>
                </label>
                <input
                  id="bulk-import"
                  type="file"
                  accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                  disabled={importing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBulkImport(f);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
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
                      onSave={(id, value, designation) =>
                        updateMut.mutate({ id, value, designation })
                      }
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
          )}
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

      <AlertDialog
        open={confirmDeleteAll}
        onOpenChange={(open) => !open && setConfirmDeleteAll(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {currentRows.length} valeur(s) de la liste « {LIST_LABELS[selectedKey]} » seront
              définitivement supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
