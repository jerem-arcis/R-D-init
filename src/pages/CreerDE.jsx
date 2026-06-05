import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Save, Send, FileText, Layers, Settings2, ChevronRight, Upload, Sparkles, Loader2, CheckCircle2, X, Check, ChevronsUpDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// ---------- Listes ----------
const AXES_STRATEGIQUES = [
  'Froid positif',
  'Démarche utilisateurs en RHF',
  'Développement de nos marques',
  'Plan produits inscrits au budget',
  'Business Courant',
  'Schéma directeur industriel'
];

const RESEAUX = ['GDM', 'MDD', 'HSFC', 'EXPORT', 'RMN', 'RMD', 'BPT_GMS', 'BPT_RHF', 'BTB', 'SOCIETE'];

const TYPES_DEMANDE_DE = [
  'CA Additionnel',
  'Retravail Produit - CA existant',
  "Changement d'usine",
  'DE/DL',
  'AO - CA Additionnel',
  'AO - Retravail Produit'
];

const FAMILLES_PRODUIT = ['Traiteur', 'Mochi', 'Pâtisseries'];

const SECTEURS_ACTIVITE = [
  'Boncolac',
  'Boncolac Traiteur',
  'Marque Distributeur',
  'Marque RHF',
  'Marque Export',
  'Autre'
];

const CLIENTS = [
  'Carrefour',
  'Auchan',
  'Leclerc',
  'Intermarché',
  'Système U',
  'Casino',
  'Monoprix',
  'Lidl',
  'Aldi',
  'Metro',
  'Promocash',
  'Transgourmet',
  'Pomona',
  'Sysco France',
  'Brake France',
  'API Restauration',
  'Sodexo',
  'Elior',
  'Compass Group',
  'Newrest'
];

const CATEGORIES_VIF = ['Permanent', 'Spot', 'Saisonnier'];
const TYPES_LOGISTIQUE = ['Franco / One Shot', 'Franco', 'Départ'];

// ---------- Listes Section "Autre" ----------
const TYPES_DEMANDE_AUTRE = [
  { value: '1', label: '1 - Transfert industriel restant dans nos savoir-faire' },
  { value: '2', label: '2 - Produit semi-fini fabriqué pour une autre usine (savoir-faire déjà validé)' },
  { value: '3', label: '3 - Massification' },
  { value: '4', label: '4 - Produits extérieurs négoce' },
  { value: '5', label: '5 - Produits fabriqués par une filiale du groupe (hors Boncolac Histo)' },
  { value: '6', label: '6 - Changement produit mineur avec impact financier de moins de 2%' },
  { value: '7', label: '7 - Modification palettisation mineure avec impact financier de moins de 2%' }
];

const USINES_FAB = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen', 'Produit négoce'];

const CODE_DIV_BY_USINE = {
  Bonloc: '2886',
  'Produit négoce': '2820',
  Rivesaltes: '2866',
  Aire: '2859',
  Agen: '2847'
};

const ACTIVITES = ['PATISSERIES', 'TRAITEUR', 'MOCHIS'];
const TYPES_MARQUE = ['Marque Nationale RHF / Export', 'Marque Nationale GMS', 'Marque distributeur'];

// Pour la logique "Centre de profit" usine = Agen
const PRODUITS_AGEN = ['Pains surprises', 'Assortiments ou plateaux', 'Plaques', '(vide)'];

const SERVICES_DEMANDEUR = [
  'Commerce',
  'ADV',
  'Marketing',
  'R&D',
  'Industriel',
  'Supply Chain',
  'Contrôle de gestion',
  'Qualité',
  'Achats'
];

// ---------- Helpers de calcul automatique ----------
const computeClasseValorisation = ({ usine, type_demande, activite }) => {
  if (['Rivesaltes', 'Bonloc', 'Agen'].includes(usine)) return '7012';
  if (usine === 'Aire') return '2038';
  if (['4', '5'].includes(type_demande) && activite === 'TRAITEUR') return '2038';
  if (['4', '5'].includes(type_demande) && activite === 'PATISSERIES') return '2030';
  return '';
};

const computeCentreProfit = ({ usine, activite, type_demande, produit_agen }) => {
  if (activite === 'MOCHIS') return '21PF';
  if (usine === 'Aire') return '27TDL';
  if (usine === 'Rivesaltes' || usine === 'Bonloc') return '22PF';
  if (['4', '5'].includes(type_demande) && activite === 'PATISSERIES') return '22HA';
  if (['4', '5'].includes(type_demande) && activite === 'TRAITEUR') return '27HA';
  if (usine === 'Agen') {
    if (produit_agen === 'Pains surprises') return '27PS';
    if (produit_agen === 'Assortiments ou plateaux') return '27CA';
    if (produit_agen === 'Plaques') return '27PL';
    if (produit_agen === '(vide)' || !produit_agen) return '27CA';
  }
  return '';
};

const computeSecteurActivite = (type_marque) => {
  if (type_marque === 'Marque Nationale RHF / Export') return '10';
  if (type_marque === 'Marque Nationale GMS') return '12';
  if (type_marque === 'Marque distributeur') return '15';
  return '';
};

const isUsineRequiredType = (t) => ['1', '2', '3', '6', '7'].includes(t);

// ---------- Presets de pré-remplissage (démo import fichier) ----------
const PREFILL_PRESETS_DE = [
  {
    code_projet: 'PRJ-2026-042',
    axe_strategique: 'Développement de nos marques',
    reseau: 'GDM',
    type_demande_de: 'CA Additionnel',
    demandeur: 'Sophie Martin',
    famille_produit: 'Bouchees aperitives froides',
    designation_article: 'Verrines apéritives saumon-aneth 12x40g',
    marque: 'Boncolac Traiteur',
  },
  {
    code_projet: 'PRJ-2026-068',
    axe_strategique: 'Plan produits inscrits au budget',
    reseau: 'RHF',
    type_demande_de: 'Retravail Produit - CA existant',
    demandeur: 'Julien Dubois',
    famille_produit: 'Pizza',
    designation_article: 'Pizza 4 fromages 350g — recette V2',
    marque: 'Boncolac',
  },
  {
    code_projet: 'PRJ-2026-095',
    axe_strategique: 'Business Courant',
    reseau: 'MDD',
    type_demande_de: 'CA Additionnel',
    demandeur: 'Marie Lefèvre',
    famille_produit: 'Croques traiteur',
    designation_article: 'Croque jambon-emmental 2x100g MDD',
    marque: 'Marque Distributeur',
  },
];

const PREFILL_PRESETS_AUTRE = [
  {
    autre_demandeur: 'Thomas Bernard',
    autre_service: 'Industriel',
    autre_type_demande: '1',
    autre_code_origine: 'BCL-2024-118',
    autre_usine_fab: 'Bonloc',
    autre_designation: 'Transfert ligne quiche lorraine 4x150g',
    autre_activite: 'TRAITEUR',
    autre_type_marque: 'Marque Nationale RHF / Export',
  },
  {
    autre_demandeur: 'Camille Petit',
    autre_service: 'Achats',
    autre_type_demande: '4',
    autre_code_origine: 'NEG-2026-007',
    autre_usine_fab: 'Produit négoce',
    autre_designation: 'Mini-cakes salés négoce 24x18g',
    autre_activite: 'TRAITEUR',
    autre_type_marque: 'Marque distributeur',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Sous-composants ----------
const FormSection = ({ title, icon: Icon, children }) => (
  <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
    <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-2">
    <Label className="text-slate-700 font-medium text-sm">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
  </div>
);

const ReadOnlyField = ({ label, value, hint }) => (
  <Field label={label} hint={hint}>
    <Input
      value={value || ''}
      readOnly
      placeholder="— Calculé automatiquement —"
      className="h-11 bg-muted/40 text-foreground/90 cursor-not-allowed"
    />
  </Field>
);

// ---------- Combobox Client recherche ----------
const ClientCombobox = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground'
          )}
        >
          {value || 'Rechercher un client…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tapez pour filtrer…" />
          <CommandList>
            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={(v) => {
                    onChange(v === value ? '' : c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c ? 'opacity-100' : 'opacity-0')} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------- Écran de sélection initial ----------
const TypeCard = ({ icon: Icon, title, subtitle, onClick, accent }) => (
  <button
    onClick={onClick}
    className="group relative bg-card rounded-2xl border-2 border-border hover:border-primary p-7 text-left transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
  >
    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
    <div className={`w-14 h-14 rounded-xl ${accent} flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-xl font-bold text-foreground mb-1.5">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
    <div className="mt-5 flex items-center gap-1 text-primary text-xs font-bold uppercase tracking-wide">
      Continuer <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);

// ---------- Composant principal ----------
export default function CreerDE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState('selection'); // 'selection' | 'form'
  const [formType, setFormType] = useState(null); // 'de' | 'de_dl' | 'autre'
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState(null);

  const [formData, setFormData] = useState({
    // DE / DE/DL
    code_projet: '',
    axe_strategique: '',
    date_demande: new Date().toISOString().slice(0, 10),
    reseau: '',
    type_demande_de: '',
    demandeur: '',
    famille_produit: '',
    designation_article: '',
    marque: '',
    client: '',
    categorie: '',
    date_lancement: '',
    type_logistique: '',
    date_echantillon: '',
    date_mise_dispo: '',
    poids_op: '',
    poids_brut: '',
    poids_net: '',
    volume: '',
    unite: '',

    // Autre
    autre_demandeur: '',
    autre_date: new Date().toISOString().slice(0, 10),
    autre_service: '',
    autre_type_demande: '',
    autre_code_origine: '',
    autre_usine_fab: '',
    autre_besoin_vl: false,
    autre_besoin_nouveau_code: false,
    autre_designation: '',
    autre_usine_fabrication_libre: '',
    autre_activite: '',
    autre_poids_net_uv: '',
    autre_type_marque: '',
    autre_produit_agen: '',
    autre_hierarchie: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrefillFromFile = async (file) => {
    if (!file || isPrefilling) return;
    setIsPrefilling(true);
    setPrefilledFrom(null);

    await sleep(1400);

    const pool =
      formType === 'autre' ? PREFILL_PRESETS_AUTRE : PREFILL_PRESETS_DE;
    const preset = pool[Math.floor(Math.random() * pool.length)];

    setFormData((prev) => ({ ...prev, ...preset }));
    setIsPrefilling(false);
    setPrefilledFrom(file.name);

    toast({
      title: 'Champs pré-remplis',
      description: `${Object.keys(preset).length} champs renseignés depuis "${file.name}".`,
    });
  };

  // Champs auto-calculés (Section Autre)
  const autreCodeDivision = useMemo(() => {
    if (isUsineRequiredType(formData.autre_type_demande)) {
      return CODE_DIV_BY_USINE[formData.autre_usine_fab] || '';
    }
    return '2820';
  }, [formData.autre_type_demande, formData.autre_usine_fab]);

  const autreClasseVal = useMemo(
    () =>
      computeClasseValorisation({
        usine: formData.autre_usine_fab,
        type_demande: formData.autre_type_demande,
        activite: formData.autre_activite
      }),
    [formData.autre_usine_fab, formData.autre_type_demande, formData.autre_activite]
  );

  const autreCentreProfit = useMemo(
    () =>
      computeCentreProfit({
        usine: formData.autre_usine_fab,
        activite: formData.autre_activite,
        type_demande: formData.autre_type_demande,
        produit_agen: formData.autre_produit_agen
      }),
    [
      formData.autre_usine_fab,
      formData.autre_activite,
      formData.autre_type_demande,
      formData.autre_produit_agen
    ]
  );

  const autreSecteur = useMemo(
    () => computeSecteurActivite(formData.autre_type_marque),
    [formData.autre_type_marque]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DemandeEtude.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      navigate(createPageUrl('DemandesEtude'));
    }
  });

  const handleSaveBrouillon = () => {
    createMutation.mutate({ ...formData, type_de: formType, statut: 'brouillon' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      type_de: formType,
      code_division_calc: autreCodeDivision,
      classe_valorisation_calc: autreClasseVal,
      centre_profit_calc: autreCentreProfit,
      secteur_activite_calc: autreSecteur,
      statut: 'a_traiter_adv'
    });
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('selection');
      setFormType(null);
    } else {
      navigate(createPageUrl('DemandesEtude'));
    }
  };

  const formTitle =
    formType === 'de'
      ? 'Demande d\'Étude (DE)'
      : formType === 'de_dl'
        ? 'Demande d\'Étude / Déclinaison Logistique (DE/DL)'
        : formType === 'autre'
          ? 'Autre demande'
          : 'Nouvelle Demande';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {step === 'selection' ? "Nouvelle Demande d'Étude" : formTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step === 'selection'
                  ? 'Choisir le type de demande à créer'
                  : 'Remplir les informations de la demande'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {step === 'selection' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TypeCard
              icon={FileText}
              title="DE"
              subtitle="Demande d'Étude classique pour un nouveau produit ou un retravail."
              accent="bg-gradient-to-br from-primary to-primary/70"
              onClick={() => {
                setFormType('de');
                setStep('form');
              }}
            />
            <TypeCard
              icon={Layers}
              title="DE / DL"
              subtitle="Demande d'Étude avec Déclinaison Logistique associée."
              accent="bg-gradient-to-br from-violet-500 to-violet-700"
              onClick={() => {
                setFormType('de_dl');
                setStep('form');
              }}
            />
            <TypeCard
              icon={Settings2}
              title="Autre"
              subtitle="Transfert industriel, négoce, massification, modifications mineures..."
              accent="bg-gradient-to-br from-amber-500 to-orange-600"
              onClick={() => {
                setFormType('autre');
                setStep('form');
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-5 flex flex-wrap items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {isPrefilling ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : prefilledFrom ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Sparkles className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Pré-remplissage assisté
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded-full px-2 py-0.5">
                    Bêta
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isPrefilling
                    ? 'Analyse du fichier en cours…'
                    : prefilledFrom
                      ? <>Champs pré-remplis depuis <span className="font-semibold text-foreground">{prefilledFrom}</span>. Vous pouvez modifier librement.</>
                      : 'Importez un cahier des charges ou un brief : on pré-remplit les champs clés.'}
                </p>
              </div>
              <label
                htmlFor="prefill-file"
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer transition-all ${
                  isPrefilling
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <Upload className="w-4 h-4" />
                {prefilledFrom ? 'Changer de fichier' : 'Importer un fichier'}
              </label>
              <input
                id="prefill-file"
                type="file"
                accept="*"
                disabled={isPrefilling}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePrefillFromFile(f);
                  e.target.value = '';
                }}
                className="sr-only"
              />
              {prefilledFrom && !isPrefilling && (
                <button
                  type="button"
                  onClick={() => setPrefilledFrom(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  aria-label="Masquer le bandeau"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {(formType === 'de' || formType === 'de_dl') && (
              <>
                <FormSection title="Informations générales" icon={FileText}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Code projet" required>
                      <Input
                        value={formData.code_projet}
                        onChange={(e) => handleChange('code_projet', e.target.value)}
                        placeholder="Ex: PRJ-2026-001"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Date de la demande" required>
                      <Input
                        type="date"
                        value={formData.date_demande}
                        onChange={(e) => handleChange('date_demande', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                    <Field label="Axe stratégique">
                      <Select
                        value={formData.axe_strategique}
                        onValueChange={(v) => handleChange('axe_strategique', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un axe" />
                        </SelectTrigger>
                        <SelectContent>
                          {AXES_STRATEGIQUES.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Réseau" required>
                      <Select
                        value={formData.reseau}
                        onValueChange={(v) => handleChange('reseau', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un réseau" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESEAUX.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Type de la demande">
                      <Select
                        value={formData.type_demande_de}
                        onValueChange={(v) => handleChange('type_demande_de', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_DEMANDE_DE.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Demandeur" required>
                      <Input
                        value={formData.demandeur}
                        onChange={(e) => handleChange('demandeur', e.target.value)}
                        placeholder="Nom et prénom"
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Produit" icon={Layers}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Hiérarchie produit famille" required>
                      <Select
                        value={formData.famille_produit}
                        onValueChange={(v) => handleChange('famille_produit', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner une famille" />
                        </SelectTrigger>
                        <SelectContent>
                          {FAMILLES_PRODUIT.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Secteur d'activité">
                      <Select
                        value={formData.marque}
                        onValueChange={(v) => handleChange('marque', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un secteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTEURS_ACTIVITE.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Client" hint="Recherchez et sélectionnez un client">
                        <ClientCombobox
                          value={formData.client}
                          onChange={(v) => handleChange('client', v)}
                          options={CLIENTS}
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Nom du produit / Désignation" required>
                        <Input
                          value={formData.designation_article}
                          onChange={(e) => handleChange('designation_article', e.target.value)}
                          placeholder="Ex: Yaourt nature 125g"
                          className="h-11"
                        />
                      </Field>
                    </div>
                    <Field label="Catégorie" hint="Vif">
                      <Select
                        value={formData.categorie}
                        onValueChange={(v) => handleChange('categorie', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES_VIF.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date de lancement souhaitée" hint="Vif">
                      <Input
                        type="date"
                        value={formData.date_lancement}
                        onChange={(e) => handleChange('date_lancement', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Logistique & échantillons" icon={Settings2}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Type de logistique">
                      <Select
                        value={formData.type_logistique}
                        onValueChange={(v) => handleChange('type_logistique', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_LOGISTIQUE.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date échantillon">
                      <Input
                        type="date"
                        value={formData.date_echantillon}
                        onChange={(e) => handleChange('date_echantillon', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                    <Field label="Date mise à dispo client">
                      <Input
                        type="date"
                        value={formData.date_mise_dispo}
                        onChange={(e) => handleChange('date_mise_dispo', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Caractéristiques physiques">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Poids OP" hint="Vif">
                      <Input
                        type="number"
                        value={formData.poids_op}
                        onChange={(e) => handleChange('poids_op', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Poids brut">
                      <Input
                        type="number"
                        value={formData.poids_brut}
                        onChange={(e) => handleChange('poids_brut', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Poids net">
                      <Input
                        type="number"
                        value={formData.poids_net}
                        onChange={(e) => handleChange('poids_net', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Volume">
                      <Input
                        type="number"
                        value={formData.volume}
                        onChange={(e) => handleChange('volume', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Unité">
                      <Input
                        value={formData.unite}
                        onChange={(e) => handleChange('unite', e.target.value)}
                        placeholder="Ex: kg, L, pcs"
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>
              </>
            )}

            {formType === 'autre' && (
              <>
                <FormSection title="Identification" icon={FileText}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Demandeur" required>
                      <Input
                        value={formData.autre_demandeur}
                        onChange={(e) => handleChange('autre_demandeur', e.target.value)}
                        placeholder="Nom et prénom"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Date" required>
                      <Input
                        type="date"
                        value={formData.autre_date}
                        onChange={(e) => handleChange('autre_date', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                    <Field label="Service du demandeur" required hint="Auto-détecté pour l'utilisateur connecté">
                      <Select
                        value={formData.autre_service}
                        onValueChange={(v) => handleChange('autre_service', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un service" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICES_DEMANDEUR.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Type de demande" required>
                      <Select
                        value={formData.autre_type_demande}
                        onValueChange={(v) => handleChange('autre_type_demande', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_DEMANDE_AUTRE.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Article d'origine" icon={Layers}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field
                      label="Code d'article d'origine"
                      required
                      hint="Code à 6 ou 8 chiffres requis (avec VL)"
                    >
                      <Input
                        value={formData.autre_code_origine}
                        onChange={(e) => handleChange('autre_code_origine', e.target.value)}
                        placeholder="Ex: 12345678"
                        maxLength={8}
                        className="h-11 font-mono"
                      />
                    </Field>

                    {isUsineRequiredType(formData.autre_type_demande) && (
                      <Field label="Usine de fabrication (code origine)">
                        <Select
                          value={formData.autre_usine_fab}
                          onValueChange={(v) => handleChange('autre_usine_fab', v)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Sélectionner une usine" />
                          </SelectTrigger>
                          <SelectContent>
                            {USINES_FAB.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}

                    {isUsineRequiredType(formData.autre_type_demande) && (
                      <ReadOnlyField
                        label="Code division d'origine"
                        value={CODE_DIV_BY_USINE[formData.autre_usine_fab] || ''}
                        hint="Auto-rempli selon l'usine"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.autre_besoin_vl}
                        onCheckedChange={(v) => handleChange('autre_besoin_vl', !!v)}
                      />
                      <span className="text-sm font-medium text-foreground">Besoin d'une VL</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.autre_besoin_nouveau_code}
                        onCheckedChange={(v) => handleChange('autre_besoin_nouveau_code', !!v)}
                      />
                      <span className="text-sm font-medium text-foreground">Besoin d'un nouveau code</span>
                    </label>
                  </div>
                </FormSection>

                <FormSection title="Nouvel article" icon={Settings2}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <Field label="Désignation article" required>
                        <Input
                          value={formData.autre_designation}
                          onChange={(e) => handleChange('autre_designation', e.target.value)}
                          placeholder="Désignation complète"
                          className="h-11"
                        />
                      </Field>
                    </div>

                    {isUsineRequiredType(formData.autre_type_demande) && (
                      <Field label="Usine de fabrication" required>
                        <Input
                          value={formData.autre_usine_fabrication_libre}
                          onChange={(e) => handleChange('autre_usine_fabrication_libre', e.target.value)}
                          placeholder="Usine de fabrication finale"
                          className="h-11"
                        />
                      </Field>
                    )}

                    <ReadOnlyField
                      label="Code division"
                      value={autreCodeDivision}
                      hint={
                        isUsineRequiredType(formData.autre_type_demande)
                          ? "Selon l'usine de fabrication"
                          : 'Valeur par défaut : 2820'
                      }
                    />

                    <Field label="Activité" required>
                      <Select
                        value={formData.autre_activite}
                        onValueChange={(v) => handleChange('autre_activite', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITES.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Poids net pour 1 UV (en kg)" required>
                      <Input
                        type="number"
                        step="0.001"
                        value={formData.autre_poids_net_uv}
                        onChange={(e) => handleChange('autre_poids_net_uv', e.target.value)}
                        placeholder="0.000"
                        className="h-11"
                      />
                    </Field>

                    <Field label="Type de marque" required>
                      <Select
                        value={formData.autre_type_marque}
                        onValueChange={(v) => handleChange('autre_type_marque', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_MARQUE.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {formData.autre_usine_fab === 'Agen' && (
                      <Field label="Produit (Agen)" hint="Détermine le centre de profit">
                        <Select
                          value={formData.autre_produit_agen}
                          onValueChange={(v) => handleChange('autre_produit_agen', v)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUITS_AGEN.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </div>
                </FormSection>

                <FormSection title="Champs calculés (SAP)" icon={Settings2}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ReadOnlyField
                      label="Classe de valorisation"
                      value={autreClasseVal}
                      hint="Selon usine, type de demande et activité"
                    />
                    <ReadOnlyField
                      label="Centre de profit"
                      value={autreCentreProfit}
                      hint="Selon usine, activité et type de demande"
                    />
                    <ReadOnlyField
                      label="Secteur d'activité"
                      value={autreSecteur}
                      hint="Selon le type de marque"
                    />
                    <Field
                      label="Hiérarchie de produits"
                      hint="Normalement rempli automatiquement"
                    >
                      <Input
                        value={formData.autre_hierarchie}
                        onChange={(e) => handleChange('autre_hierarchie', e.target.value)}
                        placeholder="Hiérarchie produit"
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveBrouillon}
                disabled={createMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer brouillon
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                disabled={createMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer à l'ADV
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
