import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Search, X, ChevronDown, ChevronRight, ListChecks, ClipboardCheck, Info } from 'lucide-react';
import {
  FL_FIELDS, NATURE_META, STATUS_META,
  groupBySection, counts, ruleCounts, saisieCounts,
} from '@/lib/flMapping';

// Ordre d'affichage des natures dans le bandeau de compteurs.
const NATURE_ORDER = ['SAISIE', 'REGLE', 'CONSTANTE', 'CALCUL', 'WORKFLOW'];

// Colonne « Dans ta page ? » : couverture d'un champ dans le formulaire FL actuel.
const coverage = (f) => {
  if (f.cat !== 'SAISIE') return { label: 'auto (généré)', cls: 'text-slate-300' };
  if (!f.effective) return { label: 'doublon / constante', cls: 'text-slate-400' };
  if (f.justAdded) return { label: '✅ ajouté', cls: 'text-emerald-700 font-semibold' };
  if (f.inPage) return { label: '✅ oui', cls: 'text-emerald-600' };
  return { label: '❌ à ajouter', cls: 'text-red-600 font-semibold' };
};

// Badge coloré générique (classes Tailwind fournies par les META du module).
const Pill = ({ badge, children }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${badge}`}>
    {children}
  </span>
);

// Une ligne = un champ SAP.
const FieldRow = ({ f }) => {
  const nat = NATURE_META[f.cat];
  const st = STATUS_META[f.status];
  const cov = coverage(f);
  const ruleOrVal = f.rule || f.valeur;
  return (
    <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 align-top ${f.justAdded ? 'bg-emerald-50/40' : ''}`}>
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-800">{f.lib || '—'}</div>
        {f.cellule && <div className="text-[11px] text-slate-400">{f.cellule}</div>}
      </td>
      <td className="px-4 py-2.5">
        <span className="font-mono text-xs text-teal-700 whitespace-nowrap">{f.sapField || '—'}</span>
      </td>
      <td className="px-4 py-2.5"><Pill badge={nat.badge}>{nat.label}</Pill></td>
      <td className="px-4 py-2.5"><Pill badge={st.badge}>{st.label}</Pill></td>
      <td className={`px-4 py-2.5 text-xs whitespace-nowrap ${cov.cls}`}>{cov.label}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[340px]">
        {ruleOrVal || <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{f.metier || '—'}</td>
    </tr>
  );
};

// Section repliable = une vue SAP.
const SectionGroup = ({ section, items, open, onToggle }) => (
  <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-200 px-5 py-2.5 text-left hover:bg-slate-100 transition-colors"
    >
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        {section}
      </h2>
      <span className="text-xs text-slate-400 font-medium">{items.length} champ{items.length > 1 ? 's' : ''}</span>
    </button>
    {open && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2 text-left font-semibold">Champ</th>
              <th className="px-4 py-2 text-left font-semibold">Champ SAP</th>
              <th className="px-4 py-2 text-left font-semibold">Nature</th>
              <th className="px-4 py-2 text-left font-semibold">Statut</th>
              <th className="px-4 py-2 text-left font-semibold">Dans ta page ?</th>
              <th className="px-4 py-2 text-left font-semibold">Valeur / Règle</th>
              <th className="px-4 py-2 text-left font-semibold">Champ métier</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f, i) => <FieldRow key={f.section + f.cellule + i} f={f} />)}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default function FicheComplete() {
  const [catFilter, setCatFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [todoOnly, setTodoOnly] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [legendOpen, setLegendOpen] = useState(true);

  const natureCounts = useMemo(() => counts(), []);
  const rc = useMemo(() => ruleCounts(), []);
  const sc = useMemo(() => saisieCounts(), []);
  const sections = useMemo(() => [...new Set(FL_FIELDS.map((f) => f.section))], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FL_FIELDS.filter((f) => {
      if (catFilter !== 'ALL' && f.cat !== catFilter) return false;
      if (sectionFilter !== 'ALL' && f.section !== sectionFilter) return false;
      if (todoOnly && f.status !== 'regle_todo') return false;
      if (q) {
        const hay = `${f.lib} ${f.sapField} ${f.rule} ${f.valeur} ${f.section} ${f.metier}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catFilter, sectionFilter, query, todoOnly]);

  const groups = useMemo(() => groupBySection(filtered), [filtered]);
  const filtersActive = catFilter !== 'ALL' || sectionFilter !== 'ALL' || !!query || todoOnly;

  const clearFilters = () => {
    setCatFilter('ALL'); setSectionFilter('ALL'); setQuery(''); setTodoOnly(false);
  };
  const toggleSection = (s) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Accueil')}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                Fiche complète — aperçu FL → SAP
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Les {FL_FIELDS.length} champs du mapping SAP, par nature et statut de règle · lecture seule
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Bandeau explicatif : comment lire la page + d'où viennent les données */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-slate-50 transition-colors"
          >
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              Comment lire cette page
            </h2>
            {legendOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          {legendOpen && (
            <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-slate-600">
              <p className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <strong>Source :</strong> tous les champs sont extraits du fichier
                <span className="font-mono text-teal-700"> Mapping_champs_SAP.xlsx</span> (onglet « Mapping FL »).
                Le fichier client <span className="font-mono">734501-FL.xls</span> n'est pas exploité (format binaire non lu).
              </p>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Nature — d'où vient la valeur du champ</div>
                <ul className="space-y-1.5">
                  <li className="flex gap-2 items-start"><Pill badge={NATURE_META.SAISIE.badge}>Saisie</Pill><span>un humain la tape → doit figurer dans le formulaire.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={NATURE_META.CONSTANTE.badge}>Constante</Pill><span>toujours la même valeur → mise « en dur » par le code.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={NATURE_META.REGLE.badge}>Règle</Pill><span>calculée selon d'autres champs (« Si… → ») → logique à coder.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={NATURE_META.CALCUL.badge}>Calcul</Pill><span>dérivée / concaténée (ex. libellés collés) → code.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={NATURE_META.WORKFLOW.badge}>Workflow</Pill><span>visa / date → géré par l'appli, pas envoyé à SAP.</span></li>
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Statut — pour les règles : « on a » vs « il nous faut »</div>
                <ul className="space-y-1.5">
                  <li className="flex gap-2 items-start"><Pill badge={STATUS_META.regle_reusable.badge}>Règle · on a</Pill><span>une fonction existe <strong>déjà dans ton code</strong> (<span className="font-mono text-xs">deRules / dsRules</span>) → réutilisable. ⚠️ Vient de <strong>ton code</strong>, pas de l'Excel.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={STATUS_META.regle_todo.badge}>Règle · à coder</Pill><span>la logique est décrite dans l'Excel mais <strong>pas encore codée</strong>.</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={STATUS_META.constante.badge}>Constante</Pill><span>valeur fixe (rappel de la nature).</span></li>
                  <li className="flex gap-2 items-start"><Pill badge={STATUS_META.calcul.badge}>Calcul</Pill><span>dérivé (rappel de la nature).</span></li>
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Dans ta page ? — couverture du formulaire FL actuel</div>
                <ul className="space-y-1 text-xs">
                  <li><span className="text-emerald-600 font-semibold">✅ oui</span> — le champ est déjà dans ton formulaire.</li>
                  <li><span className="text-emerald-700 font-semibold">✅ ajouté</span> — tout juste ajouté (Groupe statistique article, Gestion par lots).</li>
                  <li><span className="text-red-600 font-semibold">❌ à ajouter</span> — vraie saisie encore absente du formulaire.</li>
                  <li><span className="text-slate-400">doublon / constante</span> — fausse saisie (doublon du fichier ou valeur toujours identique) → à ignorer.</li>
                  <li><span className="text-slate-300">auto (généré)</span> — pas une saisie : rempli par le code, n'a pas à être dans le formulaire.</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Compteurs par nature (cliquables) */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCatFilter('ALL')}
            aria-pressed={catFilter === 'ALL'}
            className={`bg-white rounded-xl border px-4 py-3 text-left transition-all min-w-[96px] ${catFilter === 'ALL' ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{FL_FIELDS.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Tous</div>
          </button>
          {NATURE_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter((c) => (c === cat ? 'ALL' : cat))}
              aria-pressed={catFilter === cat}
              className={`bg-white rounded-xl border px-4 py-3 text-left transition-all min-w-[96px] ${catFilter === cat ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{natureCounts[cat] || 0}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">{NATURE_META[cat].label}</div>
            </button>
          ))}
          {/* Carte saisies : brut → vraies → en page */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 ml-auto">
            <ClipboardCheck className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Saisies</div>
              <div className="text-sm font-semibold text-slate-800">
                <span className="text-emerald-600">{sc.effective} réelles</span>
                <span className="text-slate-300 mx-1.5">·</span>
                <span className="text-slate-500">{sc.inPage} en page</span>
                <span className="text-slate-300 mx-1.5">·</span>
                <span className={sc.missing ? 'text-red-600' : 'text-slate-400'}>{sc.missing} manquant{sc.missing > 1 ? 's' : ''}</span>
              </div>
              <div className="text-[11px] text-slate-400">({sc.doublons} doublons/fausses saisies écartés du brut {sc.brut})</div>
            </div>
          </div>

          {/* Carte règles : on a vs à coder */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4">
            <ListChecks className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Règles</div>
              <div className="text-sm font-semibold text-slate-800">
                <span className="text-orange-600">{rc.todo} à coder</span>
                <span className="text-slate-300 mx-1.5">·</span>
                <span className="text-sky-600">{rc.reusable} réutilisable{rc.reusable > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-3 flex flex-wrap items-center gap-3 sticky top-2 z-10">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un champ, un code SAP, une règle…"
              className="pl-9 pr-9 h-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[230px] h-9">
              <SelectValue placeholder="Vue SAP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les vues SAP</SelectItem>
              {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={todoOnly}
              onChange={(e) => setTodoOnly(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            Règles à coder uniquement
          </label>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {filtered.length} / {FL_FIELDS.length} champs
            </span>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="w-3.5 h-3.5 mr-1" />
                Effacer
              </Button>
            )}
          </div>
        </div>

        {/* Sections par vue SAP */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            Aucun champ ne correspond à ces filtres.
          </div>
        ) : (
          groups.map(({ section, items }) => (
            <SectionGroup
              key={section}
              section={section}
              items={items}
              open={!collapsed.has(section)}
              onToggle={() => toggleSection(section)}
            />
          ))
        )}
      </main>
    </div>
  );
}
