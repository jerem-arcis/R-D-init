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
  XCircle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DemandesEtude() {
  const [filter, setFilter] = useState('a_traiter_adv');

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['demandes_etude'],
    queryFn: () => base44.entities.DemandeEtude.list('-created_date'),
  });

  const filteredDemandes = demandes.filter(de => {
    if (filter === 'toutes') return true;
    return de.statut === filter;
  });

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'validee':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Validée
          </Badge>
        );
      case 'refusee':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Refusée
          </Badge>
        );
      case 'a_traiter_adv':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            À traiter (ADV)
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <FileText className="w-3 h-3 mr-1" />
            Brouillon
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-1 bg-card rounded-xl shadow-sm ring-1 ring-border">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69383b6842c6c81a3e8e96d2/22582b55d_boncolac.jpeg"
                  alt="Boncolac"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Demandes d'Étude <span className="text-primary">(DE)</span></h1>
                <p className="text-sm text-muted-foreground mt-0.5">Gestion des demandes d'étude</p>
              </div>
            </div>
            <Link to={createPageUrl('CreerDE')}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Plus className="w-4 h-4 mr-2" />
                Créer une DE
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger 
                value="a_traiter_adv" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <Clock className="w-4 h-4 mr-2" />
                À traiter (ADV)
              </TabsTrigger>
              <TabsTrigger 
                value="brouillon"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <FileText className="w-4 h-4 mr-2" />
                Brouillons
              </TabsTrigger>
              <TabsTrigger 
                value="validee"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validées
              </TabsTrigger>
              <TabsTrigger 
                value="refusee"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refusées
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

        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 ring-1 ring-border">
                <FileText className="w-10 h-10 text-primary/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune demande trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">Il n'y a pas de demande correspondant à ce filtre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b-2 border-primary">
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Identifiant</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Désignation</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Usine</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Catégorie</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Statut</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-xs tracking-wide">Date création</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDemandes.map((de) => (
                  <TableRow
                    key={de.id}
                    className="hover:bg-secondary/50 transition-colors cursor-pointer group border-b border-border"
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {de.id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {de.designation_article}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {de.usine}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {de.categorie_produit}
                    </TableCell>
                    <TableCell>
                      {getStatutBadge(de.statut)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {de.created_date
                        ? format(new Date(de.created_date), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`TraiterDE?id=${de.id}`)}>
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'a_traiter_adv').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">À traiter</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'brouillon').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Brouillons</p>
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
                  {demandes.filter(d => d.statut === 'validee').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Validées</p>
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {demandes.filter(d => d.statut === 'refusee').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Refusées</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}