import React, { useMemo, useState } from 'react';
import { listProjets } from '@/api/projet';
import { usePerimetre } from '@/lib/PerimetreContext';
import { peutVoirDossier } from '@/lib/perimetre';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Loader2, Radar, Hourglass, CheckCircle2, XCircle, Inbox,
  FlaskConical, Database, TrendingUp, Building2, Factory, PieChart as PieIcon,
  Layers, X,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStatutMeta } from '@/lib/deStatus';
import { CodeChapeauAlertIcon } from '@/components/CodeChapeauAlertIcon';
import { SAMPLE_PROJETS, SAMPLE_ORGS } from '@/dev/dashboardSampleData';
import {
  filterProjets, computeKpis, byStatut, byMonth, byOrg, byUsine, listStatuts,
} from '@/lib/dashboardStats';

const FADE_UP_KEYFRAMES = `
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
`;

const TONE_BADGE = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

// Tonalités statut → couleur graphique (aligné sur les badges).
const TONE_HEX = {
  amber: '#d97706', blue: '#2563eb', violet: '#7c3aed',
  indigo: '#4f46e5', emerald: '#059669', red: '#dc2626',
};
// Palette organisation (marque Boncolac : violet + or + sarcelle).
const ORG_HEX = ['#7c3aed', '#e0a010', '#0d9488', '#be185d'];
const USINE_HEX = '#7c3aed';

const USINES_OPTIONS = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen', 'Produit négoce'];

// Carte KPI compacte.
function Kpi({ icon: Icon, value, label, tone = 'primary', suffix }) {
  const toneCls = {
    primary: 'from-violet-100 to-violet-200 text-violet-700',
    blue: 'from-blue-100 to-blue-200 text-blue-700',
    emerald: 'from-emerald-100 to-emerald-200 text-emerald-700',
    red: 'from-red-100 to-red-200 text-red-700',
    amber: 'from-amber-100 to-amber-200 text-amber-700',
    indigo: 'from-indigo-100 to-indigo-200 text-indigo-700',
  }[tone];
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${toneCls} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <p className="text-2xl font-bold text-foreground">
            {value}{suffix ? <span className="text-base font-semibold text-muted-foreground ml-0.5">{suffix}</span> : null}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        </div>
      </div>
    </div>
  );
}

// En-tête de carte graphique.
function ChartCard({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  // Données réelles (Dataverse) — utilisées quand la source « Réel » est active.
  // Périmètre société : les indicateurs ne portent que sur les dossiers de mes sociétés.
  const { perimetre } = usePerimetre();
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['projets-de'],
    queryFn: listProjets,
    select: (rows) => rows.filter((d) => peutVoirDossier(perimetre, d.division)),
  });

  // --- État des filtres ---
  const [source, setSource] = useState('sample'); // 'sample' (exemple) | 'reel'
  const [selectedOrgs, setSelectedOrgs] = useState(SAMPLE_ORGS.map((o) => o.code));
  const [type, setType] = useState('all');
  const [usine, setUsine] = useState('');
  const [statut, setStatut] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isSample = source === 'sample';
  const baseProjets = isSample ? SAMPLE_PROJETS : reels;

  const projets = useMemo(() => filterProjets(baseProjets, {
    orgs: isSample ? selectedOrgs : [],
    type, usine, statut, dateFrom, dateTo,
  }), [baseProjets, isSample, selectedOrgs, type, usine, statut, dateFrom, dateTo]);

  const kpis = useMemo(() => computeKpis(projets), [projets]);
  const dataStatut = useMemo(() => byStatut(projets), [projets]);
  const dataMonth = useMemo(() => byMonth(projets), [projets]);
  const dataOrg = useMemo(() => byOrg(projets), [projets]);
  const dataUsine = useMemo(() => byUsine(projets), [projets]);
  const statutOptions = useMemo(() => listStatuts(baseProjets), [baseProjets]);
  const recents = useMemo(() => [...projets]
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
    .slice(0, 8), [projets]);

  const toggleOrg = (code) => setSelectedOrgs((prev) =>
    prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);

  const filtersActive = type !== 'all' || !!usine || !!statut || !!dateFrom || !!dateTo
    || (isSample && selectedOrgs.length !== SAMPLE_ORGS.length);
  const clearFilters = () => {
    setType('all'); setUsine(''); setStatut(''); setDateFrom(''); setDateTo('');
    setSelectedOrgs(SAMPLE_ORGS.map((o) => o.code));
  };

  return (
    <div className="min-h-screen bg-background">
      <style>{FADE_UP_KEYFRAMES}</style>

      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, hsl(270, 62%, 37%), hsl(38, 80%, 55%))' }}>
                <Radar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground uppercase tracking-tight leading-tight">
                  Tableau de bord <span className="text-primary">Pipeline</span>
                </h1>
                <p className="text-xs text-muted-foreground">Suivi des demandes d'étude et de lancement</p>
              </div>
            </div>

            {/* Bascule source Exemple / Réel */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
              <button type="button" onClick={() => setSource('sample')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isSample ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <FlaskConical className="w-3.5 h-3.5" /> Données d'exemple
              </button>
              <button type="button" onClick={() => setSource('reel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  !isSample ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Database className="w-3.5 h-3.5" /> Réel (Dataverse)
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-5 space-y-5">
        {(!isSample && isLoading) ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {isSample && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                <span><b>Données d'exemple</b> - {SAMPLE_PROJETS.length} demandes fictives réparties sur 3 organisations commerciales (VKORG),
                  pour illustrer le tableau de bord multi-org. Bascule sur « Réel » pour les vraies données Dataverse.</span>
              </div>
            )}

            {/* --- Barre de filtres --- */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-3 space-y-3" style={{ animation: 'fadeUp 400ms ease-out both' }}>
              {isSample && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Organisation :
                  </span>
                  {SAMPLE_ORGS.map((o, i) => {
                    const on = selectedOrgs.includes(o.code);
                    return (
                      <button key={o.code} type="button" onClick={() => toggleOrg(o.code)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          on ? 'text-white border-transparent' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}
                        style={on ? { background: ORG_HEX[i % ORG_HEX.length] } : undefined}>
                        {o.code} · {o.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Type :</span>
                  {[{ id: 'all', label: 'Tous' }, { id: 'de', label: 'DE' }, { id: 'ds', label: 'DS' }].map((t) => (
                    <button key={t.id} type="button" onClick={() => setType(t.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                        type === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="w-[180px]">
                  <SearchableSelect value={usine} onChange={(v) => setUsine(v || '')}
                    options={USINES_OPTIONS} placeholder="Toutes les usines"
                    searchPlaceholder="Rechercher une usine…" emptyText="Aucune usine." className="h-9" />
                </div>

                <div className="w-[220px]">
                  <SearchableSelect value={statut} onChange={(v) => setStatut(v || '')}
                    options={statutOptions} placeholder="Tous les statuts"
                    searchPlaceholder="Rechercher un statut…" emptyText="Aucun statut." className="h-9" />
                </div>

                <div className="flex items-center gap-1.5">
                  <Input type="date" value={dateFrom} max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px]" aria-label="Date de début" />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input type="date" value={dateTo} min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px]" aria-label="Date de fin" />
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">{projets.length} demande{projets.length > 1 ? 's' : ''}</span>
                  {filtersActive && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                      <X className="w-3.5 h-3.5 mr-1" /> Effacer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* --- KPI --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" style={{ animation: 'fadeUp 500ms ease-out 80ms both' }}>
              <Kpi icon={Layers} value={kpis.total} label="Total demandes" tone="primary" />
              <Kpi icon={Hourglass} value={kpis.enCours} label="En cours" tone="blue" />
              <Kpi icon={Inbox} value={kpis.attenteCC} label="Attente code chapeau" tone="amber" />
              <Kpi icon={CheckCircle2} value={kpis.validees} label="Validées DE/DS" tone="emerald" />
              <Kpi icon={Database} value={kpis.creesSap} label="Créées SAP" tone="indigo" />
              <Kpi icon={XCircle} value={kpis.refusees} label="Refusées" tone="red" />
            </div>

            {/* --- Graphiques --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ animation: 'fadeUp 600ms ease-out 160ms both' }}>
              {/* Évolution mensuelle */}
              <ChartCard icon={TrendingUp} title="Évolution mensuelle des demandes">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dataMonth} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDe" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gDs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="de" name="DE" stackId="1" stroke="#7c3aed" fill="url(#gDe)" strokeWidth={2} />
                    <Area type="monotone" dataKey="ds" name="DS" stackId="1" stroke="#0d9488" fill="url(#gDs)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#7c3aed' }} /> DE</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#0d9488' }} /> DS</span>
                </div>
              </ChartCard>

              {/* Répartition par statut (donut) */}
              <ChartCard icon={PieIcon} title="Répartition par statut">
                <div className="flex items-center gap-2">
                  <ResponsiveContainer width="55%" height={240}>
                    <PieChart>
                      <Pie data={dataStatut} dataKey="value" nameKey="label" cx="50%" cy="50%"
                        innerRadius={52} outerRadius={88} paddingAngle={2}>
                        {dataStatut.map((s, i) => <Cell key={i} fill={TONE_HEX[s.tone] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {dataStatut.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: TONE_HEX[s.tone] || '#94a3b8' }} />
                        <span className="text-foreground/80 flex-1 truncate">{s.label}</span>
                        <span className="font-bold text-foreground tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>

              {/* Par organisation commerciale */}
              <ChartCard icon={Building2} title="Par organisation commerciale"
                badge={<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] uppercase tracking-wide ml-1">Vision multi-org</Badge>}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataOrg} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                    <Bar dataKey="value" name="Demandes" radius={[6, 6, 0, 0]}>
                      {dataOrg.map((o, i) => <Cell key={i} fill={ORG_HEX[i % ORG_HEX.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Par usine */}
              <ChartCard icon={Factory} title="Par usine (division)">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataUsine} layout="vertical" margin={{ top: 6, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="usine" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={92} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                    <Bar dataKey="value" name="Demandes" fill={USINE_HEX} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* --- Demandes récentes (filtrées) --- */}
            <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden" style={{ animation: 'fadeUp 700ms ease-out 240ms both' }}>
              <div className="bg-secondary px-5 py-3 border-b border-border flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Demandes récentes</h2>
                <Link to={createPageUrl('DemandesEtude')} className="ml-auto text-xs font-semibold text-primary hover:underline">
                  Voir toutes les DE
                </Link>
              </div>
              {recents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3 ring-1 ring-border">
                    <Inbox className="w-8 h-8 text-primary/60" />
                  </div>
                  <p className="text-base font-semibold text-foreground">Aucune demande</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajuste les filtres pour afficher des demandes.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary border-b-2 border-primary">
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code projet</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                      {isSample && <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Org.</TableHead>}
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Usine</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code chapeau</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                      <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recents.map((p) => {
                      const meta = getStatutMeta(p.statut);
                      return (
                        <TableRow key={p.id} className="hover:bg-secondary/50 transition-colors border-b border-border">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.code_projet || <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {p.designation_article || <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          {isSample && (
                            <TableCell className="text-xs">
                              <span className="font-mono text-muted-foreground">{p.organisation}</span>
                              <span className="text-muted-foreground/60"> · {p.organisation_label}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-foreground/80 text-sm">
                            {p.usine_validee || <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.code_chapeau || <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={TONE_BADGE[meta.tone] || TONE_BADGE.amber}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>{p.created_date ? format(new Date(p.created_date), 'dd MMM yyyy', { locale: fr }) : '-'}</span>
                              <CodeChapeauAlertIcon de={p} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
