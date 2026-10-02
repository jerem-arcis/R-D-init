import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { usePerimetre, REFERENTIELS_QUERY_KEY } from '@/lib/PerimetreContext';
import { lignesAdmin, parseGroupIds, TYPES_DIVISION } from '@/lib/perimetre';
import { updateSociete, updateDivision, updateOrgCo, updateCanal } from '@/api/referentiels';

// Référentiels de structure SAP (Société, Organisation commerciale, Canal, Division)
// dans l'Admin. Modification SEULE : les lignes sont créées par SAP. Un admin ne
// voit que les lignes de ses sociétés (cf. lignesAdmin dans lib/perimetre.js).

export const REFERENTIEL_VIEWS = [
  { key: 'societes', label: 'Sociétés' },
  { key: 'orgcos', label: 'Organisations commerciales' },
  { key: 'canaux', label: 'Canaux de distribution' },
  { key: 'divisions', label: 'Divisions' },
];

const GROUPES = [
  { role: 'admin', label: 'Groupe Admin' },
  { role: 'adv', label: 'Groupe ADV' },
  { role: 'commerce', label: 'Groupe Commerce' },
  { role: 'industrie', label: 'Groupe Industrie' },
  { role: 'qualite', label: 'Groupe Qualité' },
];

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SANS_TYPE = '__aucun';

// Champ texte enregistré à la sortie (ou Entrée), comme les autres listes de l'Admin.
function CellInput({ value, onSave, disabled, placeholder, className = '' }) {
  const [draft, setDraft] = useState(value ?? '');
  const commit = () => {
    const v = draft.trim();
    if (v === (value ?? '')) return;
    if (onSave(v) === false) setDraft(value ?? '');
  };
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={`h-9 ${className}`}
    />
  );
}

const Code = ({ children }) => (
  <span className="w-24 shrink-0 font-mono text-sm font-semibold text-foreground">{children}</span>
);
const Rattachement = ({ children }) => (
  <span className="w-28 shrink-0 text-xs text-muted-foreground">{children || '—'}</span>
);

export default function ReferentielsSociete({ view }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { perimetre } = usePerimetre();
  const lignes = lignesAdmin(perimetre);

  const mut = useMutation({
    mutationFn: (fn) => fn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REFERENTIELS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['sap-list', 'divisions'] });
      toast({ title: 'Valeur modifiée' });
    },
    onError: (err) =>
      toast({ title: 'Erreur', description: err?.message || 'La modification a échoué.', variant: 'destructive' }),
  });
  const save = (fn) => mut.mutate(fn);
  const busy = mut.isPending;

  // Une cellule de groupes ne contient que des identifiants de groupe Entra (GUID),
  // séparés par « ; ». Une saisie invalide est refusée : elle retirerait des droits.
  const saveGroupe = (s, role) => (v) => {
    const invalides = parseGroupIds(v).filter((id) => !GUID.test(id));
    if (invalides.length) {
      toast({
        title: 'Identifiant de groupe invalide',
        description: `« ${invalides[0]} » n'est pas un identifiant de groupe Entra (GUID).`,
        variant: 'destructive',
      });
      return false;
    }
    save(() => updateSociete(s.id, { groupes: { [role]: parseGroupIds(v).join(';') } }));
    return true;
  };

  const meta = REFERENTIEL_VIEWS.find((v) => v.key === view);
  const rows = { societes: lignes.societes, orgcos: lignes.orgCos, canaux: lignes.canaux, divisions: lignes.divisions }[view] ?? [];

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide">{meta?.label}</h2>
        {busy && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} ligne{rows.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-6 space-y-4">
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground border border-border rounded-lg">
            Aucune ligne dans votre périmètre.
          </div>
        )}

        {view === 'societes' && rows.map((s) => (
          <div key={s.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Code>{s.code}</Code>
              <CellInput value={s.nom} onSave={(v) => save(() => updateSociete(s.id, { nom: v }))} disabled={busy} placeholder="Nom de la société…" className="flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GROUPES.map(({ role, label }) => (
                <div key={role}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <CellInput
                    value={s.groupes[role]}
                    onSave={saveGroupe(s, role)}
                    disabled={busy}
                    placeholder="ID du groupe Entra (vide = aucun)"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
            {s.ouverte && (
              <p className="text-xs text-amber-700">
                Aucun groupe renseigné : cette société est visible et modifiable par tous.
              </p>
            )}
          </div>
        ))}

        {view !== 'societes' && rows.length > 0 && (
          <div className="border border-border rounded-lg divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Code>{r.value}</Code>
                <CellInput
                  value={r.designation}
                  disabled={busy}
                  placeholder="Désignation…"
                  className="flex-1"
                  onSave={(v) => save(() => (
                    view === 'divisions' ? updateDivision(r.id, { designation: v })
                      : view === 'orgcos' ? updateOrgCo(r.id, { designation: v })
                        : updateCanal(r.id, { designation: v })
                  ))}
                />
                <Rattachement>
                  {view === 'canaux' ? r.orgCo : r.societe && `Société ${r.societe}`}
                </Rattachement>
                {view === 'divisions' && (
                  <Select
                    value={TYPES_DIVISION.includes(r.type) ? r.type : SANS_TYPE}
                    onValueChange={(v) => save(() => updateDivision(r.id, { type: v === SANS_TYPE ? '' : v }))}
                    disabled={busy}
                  >
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SANS_TYPE}>Sans type</SelectItem>
                      {TYPES_DIVISION.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          Les modifications sont enregistrées automatiquement. Les lignes sont créées par SAP :
          ni ajout ni suppression ici.
          {view === 'divisions' && ' DE : divisions PROD. FL : divisions STOCK (toutes si aucune).'}
        </p>
      </div>
    </section>
  );
}
