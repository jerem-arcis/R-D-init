import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TraiterDE() {
  const urlParams = new URLSearchParams(window.location.search);
  const deId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [selectedEAN, setSelectedEAN] = useState('');

  const { data: de, isLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const { data: codesEAN = [], isLoading: isLoadingCodes } = useQuery({
    queryKey: ['codes_ean', de?.usine],
    queryFn: async () => {
      const codes = await base44.entities.CodeEAN.filter({ 
        usine: de?.usine, 
        disponible: true 
      });
      
      // Si aucun code disponible, créer 5 codes fictifs pour tests
      if (codes.length === 0 && de?.usine) {
        const baseCode = de.usine === 'Wasens' ? '3250390001' : 
                        de.usine === 'Agen' ? '3250390002' : 
                        de.usine === 'Montauban' ? '3250390003' : 
                        '3250390009';
        
        const nouveauxCodes = [];
        for (let i = 1; i <= 5; i++) {
          const code = `${baseCode}00${i}`;
          const nouveauCode = await base44.entities.CodeEAN.create({
            code,
            usine: de.usine,
            disponible: true
          });
          nouveauxCodes.push(nouveauCode);
        }
        return nouveauxCodes;
      }
      
      return codes;
    },
    enabled: !!de?.usine,
  });

  useEffect(() => {
    if (codesEAN.length > 0 && !selectedEAN) {
      setSelectedEAN(codesEAN[0].code);
    }
  }, [codesEAN, selectedEAN]);

  const updateDEMutation = useMutation({
    mutationFn: ({ deId, data }) => base44.entities.DemandeEtude.update(deId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      navigate(createPageUrl('DemandesEtude'));
    }
  });

  const updateCodeEANMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CodeEAN.update(id, data)
  });

  const createFLMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.create(data)
  });

  const handleValider = async () => {
    if (!selectedEAN) {
      alert('Veuillez sélectionner un code EAN');
      return;
    }

    const codeChapeau = `${selectedEAN} ${de.designation_article}`;
    
    const codeEANObj = codesEAN.find(c => c.code === selectedEAN);
    
    await updateCodeEANMutation.mutateAsync({
      id: codeEANObj.id,
      data: {
        disponible: false,
        date_utilisation: new Date().toISOString(),
        demande_etude_id: deId
      }
    });

    const ficheFL = await createFLMutation.mutateAsync({
      code_article: codeChapeau,
      libelle_article: de.designation_article,
      demande_etude_id: deId,
      etat_global: 'en_attente',
      etape_courante: 1
    });

    await updateDEMutation.mutateAsync({
      deId,
      data: {
        statut: 'validee',
        code_ean: selectedEAN,
        code_chapeau: codeChapeau,
        date_validation: new Date().toISOString(),
        fiche_lancement_id: ficheFL.id
      }
    });
  };

  const handleRefuser = async () => {
    if (!motifRefus.trim()) {
      alert('Veuillez saisir un motif de refus');
      return;
    }

    await updateDEMutation.mutateAsync({
      deId,
      data: {
        statut: 'refusee',
        motif_refus: motifRefus,
        date_refus: new Date().toISOString()
      }
    });
  };

  if (isLoading || !de) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-[#FAF6EC] to-[#EFE8D9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B3A8E]" />
      </div>
    );
  }

  const isReadOnly = de.statut === 'validee' || de.statut === 'refusee';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] via-[#FAF6EC] to-[#EFE8D9]">
      <header className="bg-gradient-to-r from-white to-[#FAF6EC] border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('DemandesEtude')}>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-[#5B3A8E] hover:bg-[#5B3A8E]/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                Demande d'Étude — {de.designation_article}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">ID: {deId?.slice(0, 8)}...</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
          {de.statut === 'validee' && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700">
                Demande validée - Code chapeau généré : <strong>{de.code_chapeau}</strong>
              </AlertDescription>
            </Alert>
          )}

          {de.statut === 'refusee' && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Demande refusée - Motif : {de.motif_refus}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Désignation</Label>
              <Input value={de.designation_article} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Usine</Label>
              <Input value={de.usine} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Catégorie</Label>
              <Input value={de.categorie_produit} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Poids net estimé (g)</Label>
              <Input value={de.poids_net_estime} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Dimensions (L x l x H mm)</Label>
              <Input 
                value={`${de.longueur_mm} x ${de.largeur_mm} x ${de.hauteur_mm}`} 
                disabled 
                className="bg-slate-50" 
              />
            </div>
          </div>

          {!isReadOnly && (
            <>
              <div className="pt-6 border-t border-gray-200 space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Code EAN suggéré pour {de.usine}
                  </Label>
                  {isLoadingCodes ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Chargement des codes EAN...</span>
                    </div>
                  ) : codesEAN.length === 0 ? (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertDescription className="text-amber-700">
                        Aucun code EAN disponible pour cette usine. 5 codes de test ont été créés automatiquement.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Code suggéré :</p>
                        <p className="font-bold text-lg text-emerald-700">{selectedEAN}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 text-sm">
                          Ou sélectionner un autre code disponible :
                        </Label>
                        <Select value={selectedEAN} onValueChange={setSelectedEAN}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {codesEAN.map((code) => (
                              <SelectItem key={code.id} value={code.code}>
                                {code.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
                {selectedEAN && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-slate-700 mb-1">Code chapeau qui sera généré :</p>
                    <p className="font-bold text-lg text-[#5B3A8E]">
                      {selectedEAN} {de.designation_article}
                    </p>
                  </div>
                )}
              </div>

              {!showRefus ? (
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowRefus(true)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    onClick={handleValider}
                    disabled={!selectedEAN || updateDEMutation.isPending}
                    className="bg-gradient-to-r from-[#5B3A8E] to-[#7B4FB5] hover:from-[#4A2E75] hover:to-[#6A3FA0] text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Valider et créer FL
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">
                      Motif de refus <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={motifRefus}
                      onChange={(e) => setMotifRefus(e.target.value)}
                      placeholder="Expliquer pourquoi cette demande est refusée..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRefus(false);
                        setMotifRefus('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleRefuser}
                      disabled={updateDEMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmer le refus
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}