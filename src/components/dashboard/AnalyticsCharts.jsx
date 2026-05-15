import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  Treemap, RadialBarChart, RadialBar, ComposedChart,
  FunnelChart, Funnel, LabelList, Sankey,
} from 'recharts';
import {
  BarChart3, PieChart as PieIcon, TrendingUp, Activity, Radar as RadarIcon,
  Layers, ScatterChart as ScatterIcon, Grid3x3, Gauge, GitBranch, Filter,
  LineChart as LineIcon, CalendarDays, BarChartHorizontal, Network, Sigma, Circle,
} from 'lucide-react';
import { VISA_KEYS, STEP_LABELS, BUCKET_CONFIG } from '@/lib/launchAlert';

// Palette violette/dorée alignée sur le thème glossy de l'app.
const COLORS = {
  primary: 'hsl(270, 62%, 37%)',
  primaryLight: 'hsl(270, 55%, 55%)',
  primaryDark: 'hsl(270, 65%, 22%)',
  gold: 'hsl(38, 80%, 55%)',
  goldLight: 'hsl(45, 90%, 65%)',
  red: 'hsl(0, 75%, 55%)',
  rose: 'hsl(15, 85%, 55%)',
  orange: 'hsl(35, 90%, 55%)',
  amber: 'hsl(45, 90%, 55%)',
  emerald: 'hsl(150, 65%, 45%)',
  slate: 'hsl(270, 30%, 55%)',
  cyan: 'hsl(195, 70%, 50%)',
  pink: 'hsl(330, 70%, 60%)',
  indigo: 'hsl(245, 65%, 55%)',
};

const PALETTE = [
  COLORS.primary, COLORS.gold, COLORS.cyan, COLORS.emerald,
  COLORS.pink, COLORS.indigo, COLORS.orange, COLORS.primaryLight,
  COLORS.amber, COLORS.rose, COLORS.slate, COLORS.goldLight,
];

const BUCKET_COLOR = {
  retard: COLORS.red,
  critique: COLORS.rose,
  imminent: COLORS.orange,
  semaine: COLORS.amber,
  venir: COLORS.slate,
  lancee: COLORS.emerald,
};

const ChartCard = ({ title, subtitle, Icon, badge, children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 hover:shadow-md transition-shadow ${className}`}
  >
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.gold})`,
          }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {badge && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
          style={{
            background: `${COLORS.gold}22`,
            color: COLORS.primaryDark,
          }}
        >
          {badge}
        </span>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const tooltipStyle = {
  background: 'white',
  border: `1px solid ${COLORS.primary}33`,
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(76, 29, 149, 0.12)',
  padding: '8px 12px',
};

const groupBy = (arr, key) => {
  const m = new Map();
  for (const x of arr) {
    const k = (typeof key === 'function' ? key(x) : x[key]) || '—';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
};

export default function AnalyticsCharts({ entries, fiches, des }) {
  const data = useMemo(() => {
    // 1. Répartition par bucket d'alerte
    const bucketData = Object.values(BUCKET_CONFIG).map((b) => ({
      name: b.short,
      key: b.key,
      value: entries.filter((e) => e.bucket.key === b.key).length,
      fill: BUCKET_COLOR[b.key],
    }));

    // 2. Lancements par mois (timeline)
    const byMonth = new Map();
    for (const e of entries) {
      if (!e.dateLancement) continue;
      const d = new Date(e.dateLancement);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = byMonth.get(k) || { mois: k, total: 0, critiques: 0, lancees: 0 };
      cur.total += 1;
      if (e.bucket.isCritical) cur.critiques += 1;
      if (e.bucket.key === 'lancee') cur.lancees += 1;
      byMonth.set(k, cur);
    }
    const monthData = Array.from(byMonth.values()).sort((a, b) =>
      a.mois.localeCompare(b.mois)
    );

    // 3. Répartition par famille produit
    const familles = groupBy(des, 'famille_produit')
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 4. Par usine
    const usines = groupBy(des, 'usine_fab');

    // 5. Par service demandeur
    const services = groupBy(des, 'service_demandeur').sort((a, b) => b.value - a.value);

    // 6. Tunnel des visas (entonnoir des étapes)
    const total = fiches.length || 1;
    const funnelSteps = [
      ...VISA_KEYS.map((k) => ({
        name: STEP_LABELS[k],
        value: fiches.filter((f) => f[k]).length,
      })),
      {
        name: STEP_LABELS.statut_sap,
        value: fiches.filter((f) => f.statut_sap === 'Création SAP effectuée').length,
      },
      {
        name: STEP_LABELS.fl_exportee,
        value: fiches.filter((f) => f.fl_exportee).length,
      },
    ].map((s, i) => ({
      ...s,
      pct: Math.round((s.value / total) * 100),
      fill: PALETTE[i % PALETTE.length],
    }));

    // 7. Étape bloquante (radar)
    const blockMap = new Map();
    for (const e of entries) {
      if (e.bucket.key === 'lancee' || !e.blockingStep) continue;
      blockMap.set(e.blockingStep, (blockMap.get(e.blockingStep) || 0) + 1);
    }
    const blockingData = Array.from(blockMap.entries()).map(([etape, n]) => ({
      etape,
      bloque: n,
    }));

    // 8. Scatter poids/volume
    const scatter = des
      .filter((d) => d.poids_net && d.volume)
      .map((d) => ({
        x: Number(d.poids_net),
        y: Number(d.volume),
        z: 100,
        name: d.designation_article || d.designation,
      }));

    // 9. Treemap par marque
    const marques = groupBy(des, 'marque').map((m, i) => ({
      ...m,
      size: m.value,
      fill: PALETTE[i % PALETTE.length],
    }));

    // 10. Progression moyenne des visas (radial gauges par étape)
    const visasGauge = VISA_KEYS.map((k, i) => {
      const n = fiches.filter((f) => f[k]).length;
      const pct = total ? Math.round((n / total) * 100) : 0;
      return {
        name: STEP_LABELS[k],
        value: pct,
        fill: PALETTE[i % PALETTE.length],
      };
    });

    // 11. Réseau de distribution
    const reseaux = groupBy(des, 'reseau');

    // 12. Catégorie × Activité (stacked)
    const stackMap = new Map();
    for (const d of des) {
      const cat = d.categorie || '—';
      const act = d.activite || '—';
      const cur = stackMap.get(cat) || { categorie: cat };
      cur[act] = (cur[act] || 0) + 1;
      stackMap.set(cat, cur);
    }
    const stackData = Array.from(stackMap.values());
    const activites = Array.from(
      new Set(des.map((d) => d.activite).filter(Boolean))
    );

    // 13. Pareto par famille (cumul %)
    const totalFam = familles.reduce((s, f) => s + f.value, 0) || 1;
    let cum = 0;
    const pareto = familles.map((f) => {
      cum += f.value;
      return { ...f, cumPct: Math.round((cum / totalFam) * 100) };
    });

    // 14. Histogramme des délais (j avant lancement) — bins
    const bins = [
      { range: '< -7j', min: -Infinity, max: -8, count: 0 },
      { range: '-7 / -1', min: -7, max: -1, count: 0 },
      { range: '0 - 7j', min: 0, max: 7, count: 0 },
      { range: '8 - 14j', min: 8, max: 14, count: 0 },
      { range: '15 - 30j', min: 15, max: 30, count: 0 },
      { range: '31 - 60j', min: 31, max: 60, count: 0 },
      { range: '> 60j', min: 61, max: Infinity, count: 0 },
    ];
    for (const e of entries) {
      if (e.joursAvant == null) continue;
      const b = bins.find((x) => e.joursAvant >= x.min && e.joursAvant <= x.max);
      if (b) b.count += 1;
    }

    // 15. Heatmap calendrier (12 dernières semaines × jours de la semaine)
    const WEEKS = 12;
    const startDay = new Date();
    startDay.setDate(startDay.getDate() - WEEKS * 7);
    const cells = [];
    const dayMap = new Map();
    for (const e of entries) {
      if (!e.dateLancement) continue;
      const d = new Date(e.dateLancement);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    for (let w = 0; w < WEEKS + 18; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(startDay);
        d.setDate(d.getDate() + w * 7 + dow);
        const key = d.toISOString().slice(0, 10);
        cells.push({
          week: w,
          dow,
          date: key,
          count: dayMap.get(key) || 0,
        });
      }
    }
    const maxCount = Math.max(1, ...cells.map((c) => c.count));

    // 16. Bubble chart : poids × jours avant lancement (z = visas validés)
    const bubble = entries
      .filter((e) => e.fiche && e.joursAvant != null)
      .map((e) => ({
        x: e.joursAvant,
        y: Number(e.de?.poids_net) || 0,
        z: (e.visasValides || 0) * 60 + 60,
        name: e.fiche.libelle_article,
      }));

    // 17. Sankey Service → Bucket
    const serviceSet = Array.from(new Set(des.map((d) => d.service_demandeur || '—')));
    const bucketSet = Object.values(BUCKET_CONFIG).map((b) => b.label);
    const nodes = [
      ...serviceSet.map((s) => ({ name: s })),
      ...bucketSet.map((b) => ({ name: b })),
    ];
    const linkMap = new Map();
    for (const e of entries) {
      const svc = e.de?.service_demandeur || '—';
      const buc = e.bucket.label;
      const k = `${svc}>>${buc}`;
      linkMap.set(k, (linkMap.get(k) || 0) + 1);
    }
    const sankeyLinks = [];
    for (const [k, v] of linkMap.entries()) {
      const [svc, buc] = k.split('>>');
      const src = serviceSet.indexOf(svc);
      const tgt = serviceSet.length + bucketSet.indexOf(buc);
      if (src >= 0 && tgt >= serviceSet.length) {
        sankeyLinks.push({ source: src, target: tgt, value: v });
      }
    }
    const sankeyData = { nodes, links: sankeyLinks };

    // 18. KPI donuts : taux de complétion global
    const totalVisas = fiches.length * 7;
    const completedVisas = fiches.reduce((s, f) => {
      let n = 0;
      for (const k of VISA_KEYS) if (f[k]) n++;
      if (f.statut_sap === 'Création SAP effectuée') n++;
      if (f.fl_exportee) n++;
      return s + n;
    }, 0);
    const completionPct = totalVisas
      ? Math.round((completedVisas / totalVisas) * 100)
      : 0;
    const completion = [
      { name: 'Validé', value: completionPct, fill: COLORS.emerald },
      { name: 'Restant', value: 100 - completionPct, fill: '#e2e8f0' },
    ];

    // 19. Axe stratégique (donut)
    const axes = groupBy(des, 'axe_strategique').sort((a, b) => b.value - a.value);

    // 20. Type de demande (horizontal bar)
    const typesDemande = groupBy(des, 'type_demande_de').sort((a, b) => b.value - a.value);

    return {
      bucketData, monthData, familles, usines, services, funnelSteps,
      blockingData, scatter, marques, visasGauge, reseaux, stackData, activites,
      pareto, bins, cells, maxCount, bubble, sankeyData, completion,
      completionPct, axes, typesDemande,
    };
  }, [entries, fiches, des]);

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
          Analyses & visualisations
        </h2>
        <p className="text-[11px] text-slate-500">
          Démonstration des graphiques disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. BAR CHART - Buckets d'alerte */}
        <ChartCard
          title="Répartition par état d'alerte"
          subtitle="Vue d'ensemble du portefeuille de lancements"
          Icon={BarChart3}
          badge="Barres"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bucketData}>
              <defs>
                <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3e8ff55' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.bucketData.map((d) => (
                  <Cell key={d.key} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. DONUT CHART - Familles produit */}
        <ChartCard
          title="Top familles produit"
          subtitle="Répartition par famille (8 plus représentées)"
          Icon={PieIcon}
          badge="Anneau"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.familles}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                cornerRadius={6}
              >
                {data.familles.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. AREA CHART - Timeline des lancements */}
        <ChartCard
          title="Cadence de lancement"
          subtitle="Volume mensuel — total vs critiques"
          Icon={TrendingUp}
          badge="Aires"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthData}>
              <defs>
                <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="critG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.red} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={COLORS.primary}
                strokeWidth={2}
                fill="url(#totalG)"
              />
              <Area
                type="monotone"
                dataKey="critiques"
                name="Critiques"
                stroke={COLORS.red}
                strokeWidth={2}
                fill="url(#critG)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. RADIAL BAR - Visas validés */}
        <ChartCard
          title="Taux de visa par étape"
          subtitle="% de fiches ayant validé chaque étape"
          Icon={Gauge}
          badge="Radial"
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart
              innerRadius="20%"
              outerRadius="95%"
              data={data.visasGauge}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: '#f1f5f9' }}
                dataKey="value"
                cornerRadius={8}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v}%`, 'Validé']}
              />
              <Legend
                iconSize={8}
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 10 }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. RADAR CHART - Étapes bloquantes */}
        <ChartCard
          title="Étapes bloquantes"
          subtitle="Où sont coincées les fiches actives ?"
          Icon={RadarIcon}
          badge="Radar"
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={data.blockingData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="etape" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Radar
                name="Bloque"
                dataKey="bloque"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.45}
                strokeWidth={2}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. HORIZONTAL BAR - Par service */}
        <ChartCard
          title="Demandes par service"
          subtitle="Volume initié par chaque service demandeur"
          Icon={Layers}
          badge="Horizontal"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.services} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3e8ff55' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={COLORS.indigo} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. STACKED BAR - Catégorie × Activité */}
        <ChartCard
          title="Catégorie × Activité"
          subtitle="Répartition croisée empilée"
          Icon={GitBranch}
          badge="Empilé"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.stackData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="categorie" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.activites.map((act, i) => (
                <Bar
                  key={act}
                  dataKey={act}
                  stackId="a"
                  fill={PALETTE[i % PALETTE.length]}
                  radius={i === data.activites.length - 1 ? [8, 8, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 8. SCATTER - Poids vs Volume */}
        <ChartCard
          title="Profil physique des produits"
          subtitle="Poids net (g) × Volume (L)"
          Icon={ScatterIcon}
          badge="Nuage"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="x"
                name="Poids"
                unit="g"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Volume"
                unit="L"
                tick={{ fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[80, 250]} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter data={data.scatter} fill={COLORS.gold} fillOpacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 9. TREEMAP - Marques */}
        <ChartCard
          title="Poids des marques"
          subtitle="Surface proportionnelle au nombre de DE"
          Icon={Grid3x3}
          badge="Treemap"
        >
          <ResponsiveContainer width="100%" height={260}>
            <Treemap
              data={data.marques}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              fill={COLORS.primary}
              content={<TreemapContent />}
            />
          </ResponsiveContainer>
        </ChartCard>

        {/* 10. FUNNEL - Tunnel des visas */}
        <ChartCard
          title="Entonnoir des étapes de validation"
          subtitle="Du premier visa à la FL exportée"
          Icon={Filter}
          badge="Funnel"
        >
          <ResponsiveContainer width="100%" height={260}>
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Funnel dataKey="value" data={data.funnelSteps} isAnimationActive>
                <LabelList
                  position="right"
                  dataKey="name"
                  style={{ fontSize: 11, fill: '#334155' }}
                />
                <LabelList
                  position="center"
                  dataKey="pct"
                  formatter={(v) => `${v}%`}
                  style={{ fontSize: 12, fontWeight: 700, fill: '#fff' }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 11. LINE CHART - Tendance cumulée */}
        <ChartCard
          title="Tendance cumulée des lancements"
          subtitle="Cumul mensuel des fiches planifiées"
          Icon={LineIcon}
          badge="Courbe"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data.monthData.reduce((acc, cur, i) => {
                const prev = acc[i - 1]?.cumul || 0;
                acc.push({ mois: cur.mois, cumul: prev + cur.total });
                return acc;
              }, [])}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="cumul"
                stroke={COLORS.gold}
                strokeWidth={3}
                dot={{ r: 4, fill: COLORS.primary, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 13. PARETO - Familles */}
        <ChartCard
          title="Pareto des familles produit"
          subtitle="Volume + cumul % (loi des 80/20)"
          Icon={Sigma}
          badge="Pareto"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data.pareto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="value"
                name="Fiches"
                fill={COLORS.primary}
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumPct"
                name="Cumul %"
                stroke={COLORS.gold}
                strokeWidth={3}
                dot={{ r: 4, fill: COLORS.gold, stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 14. HISTOGRAMME - Délais avant lancement */}
        <ChartCard
          title="Histogramme des délais"
          subtitle="Distribution des fiches par tranche de jours"
          Icon={BarChart3}
          badge="Distribution"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3e8ff55' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.bins.map((b, i) => (
                  <Cell
                    key={i}
                    fill={
                      b.max < 0
                        ? COLORS.red
                        : b.max <= 7
                          ? COLORS.orange
                          : b.max <= 30
                            ? COLORS.gold
                            : COLORS.primary
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 15. HEATMAP CALENDRIER */}
        <ChartCard
          title="Calendrier des lancements"
          subtitle="Intensité quotidienne — heatmap façon GitHub"
          Icon={CalendarDays}
          badge="Heatmap"
          className="lg:col-span-2"
        >
          <CalendarHeatmap cells={data.cells} maxCount={data.maxCount} />
        </ChartCard>

        {/* 16. BUBBLE CHART - Délai vs Poids vs Visas */}
        <ChartCard
          title="Carte de risque (bubble)"
          subtitle="Délai × Poids — taille = visas validés"
          Icon={Circle}
          badge="Bulles"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="x"
                name="Jours"
                unit="j"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Poids"
                unit="g"
                tick={{ fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, n) => [v, n]}
              />
              <Scatter data={data.bubble} fill={COLORS.pink} fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 17. SANKEY - Flux Service → Bucket */}
        <ChartCard
          title="Flux Service → État d'alerte"
          subtitle="Chemin des demandes selon leur urgence"
          Icon={Network}
          badge="Sankey"
          className="lg:col-span-2"
        >
          {data.sankeyData.links.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <Sankey
                data={data.sankeyData}
                node={<SankeyNode />}
                link={{ stroke: COLORS.primary, strokeOpacity: 0.25 }}
                nodePadding={20}
                margin={{ top: 10, right: 120, bottom: 10, left: 120 }}
              >
                <Tooltip contentStyle={tooltipStyle} />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
              Pas assez de données pour le flux
            </div>
          )}
        </ChartCard>

        {/* 18. KPI DONUT - Complétion globale */}
        <ChartCard
          title="Taux de complétion global"
          subtitle="% des visas validés sur le portefeuille"
          Icon={Gauge}
          badge="KPI"
        >
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.completion}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={0}
                  stroke="none"
                >
                  {data.completion.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="text-5xl font-black"
                style={{ color: COLORS.primaryDark }}
              >
                {data.completionPct}%
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
                validés
              </span>
            </div>
          </div>
        </ChartCard>

        {/* 19. DONUT - Axe stratégique */}
        <ChartCard
          title="Axes stratégiques"
          subtitle="Répartition des DE par axe"
          Icon={PieIcon}
          badge="Anneau"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.axes}
                dataKey="value"
                nameKey="name"
                outerRadius={95}
                paddingAngle={2}
                label={({ percent }) => `${Math.round(percent * 100)}%`}
                labelLine={false}
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                {data.axes.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 10 }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 20. HORIZONTAL BAR - Types de demande */}
        <ChartCard
          title="Types de demande"
          subtitle="Nature des projets en cours"
          Icon={BarChartHorizontal}
          badge="Horizontal"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.typesDemande} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#fbbf2422' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={COLORS.gold} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 12. COMPOSED CHART - Usines */}
        <ChartCard
          title="Charge par usine"
          subtitle="Volume + ligne de tendance"
          Icon={Activity}
          badge="Composé"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.usines}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="value"
                name="Fiches"
                barSize={50}
                radius={[8, 8, 0, 0]}
                fill={COLORS.primary}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Tendance"
                stroke={COLORS.gold}
                strokeWidth={3}
                dot={{ r: 5, fill: COLORS.gold, stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

// Heatmap calendrier (style GitHub) - rendu SVG custom.
const CalendarHeatmap = ({ cells, maxCount }) => {
  const SIZE = 14;
  const GAP = 3;
  const weeks = Math.max(...cells.map((c) => c.week)) + 1;
  const width = weeks * (SIZE + GAP) + 30;
  const height = 7 * (SIZE + GAP) + 30;
  const DOW_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const colorFor = (count) => {
    if (count === 0) return '#f1f5f9';
    const ratio = count / maxCount;
    if (ratio < 0.34) return 'hsl(270, 50%, 80%)';
    if (ratio < 0.67) return 'hsl(270, 60%, 60%)';
    return 'hsl(270, 65%, 40%)';
  };

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} style={{ minWidth: '100%' }}>
        {DOW_LABELS.map((l, i) => (
          <text
            key={l + i}
            x={5}
            y={20 + i * (SIZE + GAP) + 11}
            fontSize={9}
            fill="#64748b"
            fontWeight={700}
          >
            {l}
          </text>
        ))}
        {cells.map((c) => (
          <rect
            key={c.date}
            x={25 + c.week * (SIZE + GAP)}
            y={20 + c.dow * (SIZE + GAP)}
            width={SIZE}
            height={SIZE}
            rx={3}
            fill={colorFor(c.count)}
            stroke="#fff"
            strokeWidth={1}
          >
            <title>{`${c.date} — ${c.count} lancement${c.count > 1 ? 's' : ''}`}</title>
          </rect>
        ))}
      </svg>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        <span>Moins</span>
        {['#f1f5f9', 'hsl(270, 50%, 80%)', 'hsl(270, 60%, 60%)', 'hsl(270, 65%, 40%)'].map(
          (c) => (
            <span
              key={c}
              className="inline-block rounded-sm"
              style={{ background: c, width: 12, height: 12 }}
            />
          )
        )}
        <span>Plus</span>
      </div>
    </div>
  );
};

// Node custom pour le Sankey (libellé + valeur).
const SankeyNode = ({ x, y, width, height, index, payload, containerWidth }) => {
  const isOut = x + width + 6 > containerWidth;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={PALETTE[index % PALETTE.length]}
        rx={4}
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize={11}
        fontWeight={700}
        fill="#334155"
        dominantBaseline="middle"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize={9}
        fill="#94a3b8"
        dominantBaseline="middle"
      >
        {payload.value}
      </text>
    </g>
  );
};

// Rendu custom du Treemap pour libellés lisibles.
const TreemapContent = ({ x, y, width, height, name, value, fill }) => {
  if (width < 40 || height < 30) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />;
  }
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={x + 8}
        y={y + 18}
        fill="#fff"
        fontSize={11}
        fontWeight={700}
        style={{ pointerEvents: 'none' }}
      >
        {name}
      </text>
      <text
        x={x + 8}
        y={y + 34}
        fill="#fff"
        fontSize={13}
        fontWeight={800}
        opacity={0.9}
        style={{ pointerEvents: 'none' }}
      >
        {value}
      </text>
    </g>
  );
};
