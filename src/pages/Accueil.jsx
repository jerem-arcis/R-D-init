import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Clock, 
  Loader2, 
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STEP_NAMES = {
  1: 'ControleDeGestion',
  2: 'SupplyChain',
  3: 'Gestion du besoin',
  4: 'Industriel',
  5: 'Commerce',
  6: 'FL',
  7: 'Exportable'
};

export default function Accueil() {
  const [filter, setFilter] = useState('toutes');

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches'],
    queryFn: () => base44.entities.FicheLancement.list('-created_date'),
  });

  const getVisasValides = (fiche) => {
    let count = 0;
    if (fiche.visa_controle_gestion) count++;
    if (fiche.visa_supply_chain) count++;
    if (fiche.visa_gestion_besoin) count++;
    if (fiche.visa_industriel) count++;
    if (fiche.visa_commerce) count++;
    if (fiche.statut_sap === 'Création SAP effectuée') count++;
    if (fiche.fl_exportee) count++;
    return count;
  };

  const filteredFiches = fiches.filter(fiche => {
    const visasValides = getVisasValides(fiche);

    if (filter === 'en_attente') {
      return visasValides === 0;
    }
    if (filter === 'en_cours') {
      return visasValides > 0 && visasValides < 7;
    }
    if (filter === 'terminees') {
      return visasValides === 7;
    }
    return true;
  });

  const getEtatBadge = (fiche) => {
    const visasValides = getVisasValides(fiche);
    if (visasValides === 7) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Validée
        </Badge>
      );
    }
    if (visasValides > 0) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          En cours
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <Clock className="w-3 h-3 mr-1" />
        En attente
      </Badge>
    );
  };

  const getIndicateurAvancement = (fiche) => {
    const validees = getVisasValides(fiche);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-slate-900">{validees}</span>
          <span className="text-sm text-slate-500">/ 7</span>
        </div>
        <span className="text-xs text-slate-500">validées</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-1 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69383b6842c6c81a3e8e96d2/22582b55d_boncolac.jpeg"
                  alt="Boncolac"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Fiches de Lancement <span className="text-primary">(FL)</span></h1>
                <p className="text-sm text-muted-foreground mt-0.5">Gestion des fiches de lancement produit</p>
              </div>
            </div>
            <Link to={createPageUrl('CreerFL')}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Plus className="w-4 h-4 mr-2" />
                Créer une FL
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtres */}
        <div className="mb-6">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger 
                value="en_attente" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <Clock className="w-4 h-4 mr-2" />
                Demandes en attente
              </TabsTrigger>
              <TabsTrigger
                value="en_cours"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Demandes en cours
              </TabsTrigger>
              <TabsTrigger
                value="terminees"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Terminées
              </TabsTrigger>
              <TabsTrigger
                value="toutes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                Toutes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {fiches.filter(f => getVisasValides(f) === 0).length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">En attente</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Loader2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {fiches.filter(f => getVisasValides(f) > 0 && getVisasValides(f) < 7).length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">En cours</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {fiches.filter(f => getVisasValides(f) === 7).length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Terminées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredFiches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <AlertCircle className="w-10 h-10 text-primary/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune fiche trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">Il n'y a pas de fiche correspondant à ce filtre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b-2 border-primary">
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Identifiant</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Code article</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Libellé article</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Avancement</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">État</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Date création</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiches.map((fiche) => (
                  <TableRow
                    key={fiche.id}
                    className="hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border"
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {fiche.id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {fiche.code_article || <span className="text-muted-foreground/60">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {fiche.libelle_article || <span className="text-muted-foreground/60">—</span>}
                    </TableCell>
                    <TableCell>
                      {getIndicateurAvancement(fiche)}
                    </TableCell>
                    <TableCell>
                      {getEtatBadge(fiche)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fiche.created_date
                        ? format(new Date(fiche.created_date), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`FicheDetail?id=${fiche.id}`)}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                        >
                          <ChevronRight className="w-5 h-5 text-primary" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

      </main>
    </div>
  );
}