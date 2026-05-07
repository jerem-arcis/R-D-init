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
import { ArrowLeft, Save, Send, FileText, Layers, Settings2, ChevronRight } from 'lucide-react';

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

const FAMILLES_PRODUIT = [
  'Accompagnements traiteur',
  'Autres bases creatives',
  'Boncolac frais traiteur',
  'Bouchees aperitives chaudes',
  'Bouchees aperitives froides',
  'Bouchees evenementielles',
  'Brochettes',
  'Croques traiteur',
  'Entrees chaudes',
  'Entrees froides',
  'Pain surprise',
  'Pain surprise a garnir',
  'PDTS étude ES',
  'Pizza',
  'Plaques de pain',
  'Plat individuels',
  'Roules traiteur',
  'Saucisses',
  'Verrines et contenants'
];

const MARQUES = [
  'Boncolac',
  'Boncolac Traiteur',
  'Marque Distributeur',
  'Marque RHF',
  'Marque Export',
  'Autre'
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

  const [step, setStep] = useState('selection'); // 'selection' | 'form'
  const [formType, setFormType] = useState(null); // 'de' | 'de_dl' | 'autre'

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
                    <Field label="Axe stratégique" required>
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
                    <Field label="Type de la demande" required>
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
                    <Field label="Famille de produit" required>
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
                    <Field label="Marque">
                      <Select
                        value={formData.marque}
                        onValueChange={(v) => handleChange('marque', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner une marque" />
                        </SelectTrigger>
                        <SelectContent>
                          {MARQUES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
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
