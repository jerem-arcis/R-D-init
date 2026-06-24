import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Save, Send, FileText, Layers, Settings2, ChevronRight, Loader2, CheckCircle2, X, Check, ChevronsUpDown, Search, XCircle, Database, Monitor, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAdminLists, useAdminOptions, buildOptions, OPTIONSET_QUERY_KEY } from '@/lib/adminLists';
import { useSapOptions } from '@/lib/sapLists';
import { createProjetFromDE, updateProjetFromDE, PROJET_STATUT } from '@/api/projet';
import { create as createOptionSetValue } from '@/api/optionSet';
import { mapBeCPGToDE, withValue, dropdownAdditionsFromMapping } from '@/lib/becpgMapping';

// ---------- Listes (fixes, non gérées via Admin) ----------
const TYPES_DEMANDE_DE = [
  'CA Additionnel',
  'Retravail Produit - CA existant',
  "Changement d'usine",
  'DE/DL',
  'AO - CA Additionnel',
  'AO - Retravail Produit'
];

// Listes encore présentes mais non gérées via Admin pour l'instant
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

// TODO(sécurité) : ces URLs de flux Power Automate contiennent une signature SAS
// (sig=) exposée côté client (bundle JS + historique Git). À terme : proxifier via
// un backend authentifié (URL en variable d'env secrète), régénérer les signatures
// des 2 flux, ajouter autorisation + cap de longueur sur les payloads. Risque atténué
// car app interne Power Platform (accès SSO), assumé pour l'instant.
// URL du flux Power Automate qui retourne les données beCPG d'un CodePJ.
const BECPG_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5a622144c10f44a6becafb2df0f78775/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5BL_-hxk0OMUfcJT9GRVKoh1BX7hkNsag7Qy3KxzpkQ';

// URL du flux Power Automate qui envoie la désignation produit vers SAP.
const SAP_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3bb2973cf1f04b5d96faf9c178abab3f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=RiXc-MYGR9LYdZ8b1sizYPHOUijB3SKwtI1eK-73c4w';

// TODO(sécurité) : voir le bloc ci-dessus — cette URL contiendra elle aussi une
// signature SAS exposée côté client ; à proxifier via un backend authentifié.
// URL du flux Power Automate qui génère le prochain code chapeau (OData SAP).
const NOUVEAU_CODE_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1677a6a5aae34cdf97672ae34548452b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a44EIOXAXlRvQYUq4N8PfB-DTXi2Pa3DQiRIKjxE0ZQ';

// URL du flux Power Automate déclenché à la validation d'une DE : on lui envoie
// le code chapeau dans { "Numéro": <code> }. (Même host que les flux ci-dessus,
// donc déjà couvert par le CSP connect-src.) Même TODO sécurité : SAS exposée.
const VALIDATION_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/daa73024b17f4d6e942c316d4ec09901/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wjYyxeqhqDI_Jh65wFt7fZopDmKlLqt_ahz-shnkS48';

// Extrait le code chapeau du corps de réponse du flux : si JSON, cherche les
// clés usuelles ; sinon retourne le texte brut nettoyé.
const extractCodeChapeau = (text) => {
  const raw = (text || '').trim();
  if (!raw) return '';
  try {
    const json = JSON.parse(raw);
    if (typeof json === 'string' || typeof json === 'number') return String(json).trim();
    // Le flux renvoie le code dans headers.réponse — on regarde aussi cet objet.
    const candidates = [json, json?.headers, json?.body];
    const keys = ['réponse', 'reponse', 'response', 'code_chapeau', 'codeChapeau', 'code', 'Code', 'Product', 'product', 'value', 'result', 'body'];
    for (const obj of candidates) {
      if (!obj || typeof obj !== 'object') continue;
      for (const key of keys) {
        if (obj[key] != null && typeof obj[key] !== 'object') return String(obj[key]).trim();
      }
    }
    return raw;
  } catch {
    return raw;
  }
};

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

// ---------- Encart de récupération beCPG par CodePJ ----------
const RecupererBeCPG = ({ onApply }) => {
  const [codePJ, setCodePJ] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleFetch = async () => {
    const code = codePJ.trim();
    if (!code || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(BECPG_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CodePJ: code }),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Réponse du flux illisible (JSON invalide).');
      }
      const mapped = mapBeCPGToDE(json);
      if (!mapped) {
        setStatus('error');
        setMessage(`Aucun projet trouvé pour le code « ${code} ».`);
        return;
      }
      const count = onApply(mapped);
      setStatus('success');
      setMessage(`${count} champ(s) renseigné(s) depuis « ${code} ».`);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Erreur lors de la récupération des informations.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5 rounded-xl border-2 border-dashed border-violet-500/30 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 self-start">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <Search className="w-6 h-6 text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            Récupération depuis beCPG
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Saisissez un Code PJ pour pré-remplir automatiquement la demande.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={codePJ}
              onChange={(e) => setCodePJ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetch();
                }
              }}
              placeholder="Ex: PJ4987"
              className="h-10 max-w-[200px] font-mono"
            />
            <Button
              type="button"
              onClick={handleFetch}
              disabled={isLoading || !codePJ.trim()}
              className="h-10 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Récupérer les informations
            </Button>
          </div>
        </div>
      </div>
      {status === 'success' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-700">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-words">{message}</span>
        </div>
      )}
    </div>
  );
};

// ---------- Aperçu SAP : vue synthèse (style Synthèse FL) ----------
const SynthField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value !== '' && value != null ? value : '—'}</p>
  </div>
);

const SynthCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

const SapSynthesisDialog = ({ open, onOpenChange, data, zug }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
      <section className="bg-gradient-to-br from-slate-50 to-violet-50">
        <header className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 flex items-center gap-3">
          <Monitor className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">Synthèse SAP — aperçu</h2>
            <p className="text-xs text-violet-100">Consolidation des données article — lecture seule, rien n'est écrit dans SAP</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SynthCard title="Données de base" icon={Layers}>
            <SynthField label="Désignation" value={data.designation_article} />
            <SynthField label="Groupe article" value={data.groupe_article} />
            <SynthField label="Poids brut" value={data.poids_brut && `${data.poids_brut} g`} />
            <SynthField label="Poids net" value={data.poids_net && `${data.poids_net} g`} />
            <SynthField label="ZUG" value={zug} />
            <SynthField label="Groupe d'autorisation" value={data.groupe_autorisation} />
          </SynthCard>
          <SynthCard title="Ventes" icon={ShoppingCart}>
            <SynthField label="Client" value={data.client} />
            <SynthField label="Division (usine)" value={data.division} />
            <SynthField label="Secteur d'activité" value={data.marque} />
            <SynthField label="Hiérarchie produit" value={data.famille_produit} />
          </SynthCard>
          <SynthCard title="Comptabilité" icon={FileText}>
            <SynthField label="Division" value={data.division} />
            <SynthField label="Classe de valorisation" value={data.classe_valorisation} />
            <SynthField label="Contrôle prix" value={data.classe_valorisation ? 'S' : ''} />
          </SynthCard>
          <SynthCard title="Calcul du coût" icon={Settings2}>
            <SynthField label="Centre de profit" value={data.centre_profit} />
            <SynthField label="Groupe de frais généraux" value={data.groupe_frais_generaux} />
          </SynthCard>
        </div>
      </section>
    </DialogContent>
  </Dialog>
);

// ---------- Composant principal ----------
export default function CreerDE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminLists = useAdminLists();
  const adminOptions = useAdminOptions();
  // Référentiels alimentés par SAP : lus depuis leurs tables Dataverse dédiées.
  const sapOptions = useSapOptions();
  // Hiérarchie produit famille : ne conserver que les codes dont les 2 premiers
  // chiffres sont 21, 22 ou 27.
  const famillesProduitOptions = sapOptions.familles_produit.filter((o) =>
    ['21', '22', '27'].includes(String(o.value).slice(0, 2)),
  );
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id'); // édition d'un brouillon existant

  const [step, setStep] = useState('selection'); // 'selection' | 'form'
  const [formType, setFormType] = useState(null); // 'de' | 'autre'

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
    qte_previsionnelle_annuelle: '',
    groupe_article: '',
    division: '',
    classe_valorisation: '',
    centre_profit: '',
    groupe_autorisation: '',
    groupe_frais_generaux: '',

    // Article d'origine (DE)
    besoin_vl: false,
    code_vl: '',
    besoin_nouveau_code: false,

    // GUID de la ligne cr04e_projet liée (Dataverse) — pour maj au lieu de recréer.
    projet_id: '',

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

  // Mode édition : charge la DE existante et pré-remplit le formulaire.
  const { data: editDE } = useQuery({
    queryKey: ['demande_etude', editId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: editId }),
    enabled: !!editId,
    select: (d) => d[0] || null,
  });

  useEffect(() => {
    if (editDE) {
      setFormType(editDE.type_de || 'de');
      setFormData((prev) => ({ ...prev, ...editDE }));
      // Restaure le mode d'origine à partir des booléens persistés.
      setOrigineMode(
        editDE.besoin_vl ? 'vl' : editDE.besoin_nouveau_code ? 'nouveau_code' : null
      );
      setStep('form');
    }
  }, [editDE]);

  // Applique les champs récupérés depuis beCPG (écrase les valeurs existantes).
  // Retourne le nombre de champs renseignés pour le message de confirmation.
  const handleApplyBeCPG = (mapped) => {
    setFormData((prev) => ({ ...prev, ...mapped }));
    void persistNewDropdownValues(mapped);
    return Object.keys(mapped).length;
  };

  // Crée dans Dataverse (comme un ajout Admin) les valeurs de dropdown renvoyées
  // par beCPG qui n'existent pas encore dans la liste correspondante.
  const persistNewDropdownValues = async (mapped) => {
    const additions = dropdownAdditionsFromMapping(mapped, adminLists);
    if (additions.length === 0) return;
    try {
      await Promise.all(
        additions.map((a) => createOptionSetValue(a.dropdownId, a.value))
      );
      queryClient.invalidateQueries({ queryKey: OPTIONSET_QUERY_KEY });
      toast({
        title: 'Listes mises à jour',
        description: `${additions.length} valeur(s) ajoutée(s) aux listes : ${additions
          .map((a) => a.value)
          .join(', ')}.`,
      });
    } catch (err) {
      toast({
        title: 'Ajout aux listes échoué',
        description:
          err?.message || "Impossible d'ajouter certaines valeurs aux listes déroulantes.",
        variant: 'destructive',
      });
    }
  };

  // Envoi de la désignation produit vers SAP via le flux Power Automate.
  const [isSendingSAP, setIsSendingSAP] = useState(false);
  const [sapSent, setSapSent] = useState(false); // notif discrète de succès
  const [sapPreviewOpen, setSapPreviewOpen] = useState(false); // aperçu "vue SAP"
  const handleSendToSAP = async () => {
    const description = formData.designation_article?.trim();
    if (!description) {
      toast({
        title: 'Désignation manquante',
        description: 'Renseignez « Nom du produit / Désignation » avant l\'envoi vers SAP.',
        variant: 'destructive',
      });
      return;
    }
    setIsSendingSAP(true);
    setSapSent(false);
    try {
      const res = await fetch(SAP_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ProductDescription: description }),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      // Succès (HTTP 2xx) : petite notif inline discrète, masquée après 4 s.
      setSapSent(true);
      setTimeout(() => setSapSent(false), 4000);
    } catch (err) {
      toast({
        title: 'Échec de l\'envoi vers SAP',
        description: err?.message || 'Une erreur est survenue lors de l\'envoi.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingSAP(false);
    }
  };

  // Bloc « Article d'origine » (DE) : VL et nouveau code sont mutuellement exclusifs.
  // origine_mode pilote l'affichage / l'activation ('vl' | 'nouveau_code' | null).
  const [origine_mode, setOrigineMode] = useState(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [nouveauCode, setNouveauCode] = useState(''); // code chapeau renvoyé par le flux (affichage seul)

  const handleToggleVL = (checked) => {
    if (checked) {
      setOrigineMode('vl');
      handleChange('besoin_vl', true);
      handleChange('besoin_nouveau_code', false);
    } else {
      setOrigineMode(null);
      handleChange('besoin_vl', false);
      handleChange('code_vl', '');
    }
  };

  // Déclenche le flux Power Automate qui génère le prochain code chapeau.
  const handleDemanderNouveauCode = async () => {
    // Active le mode « nouveau code » : décoche / masque la VL.
    setOrigineMode('nouveau_code');
    handleChange('besoin_vl', false);
    handleChange('code_vl', '');
    handleChange('besoin_nouveau_code', true);
    setIsRequestingCode(true);
    setNouveauCode('');
    try {
      // Déclenchement sans corps ; on attend la réponse du flux (le code chapeau).
      const res = await fetch(NOUVEAU_CODE_FLOW_URL, { method: 'POST' });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      // Le code vient normalement du corps. Repli best-effort sur des en-têtes
      // (noms ASCII valides uniquement ; get() lève sur un nom invalide).
      const readHeader = (h) => {
        try { return res.headers.get(h); } catch { return null; }
      };
      const headerCode = ['reponse', 'response', 'code', 'code_chapeau']
        .map(readHeader)
        .find((v) => v != null && v !== '');
      const code = extractCodeChapeau(text) || (headerCode ? String(headerCode).trim() : '');
      if (!code) {
        throw new Error('Réponse du flux vide : le code doit être renvoyé dans le corps (Body) de l\'action Réponse.');
      }
      // Affichage seul : le code n'est pas stocké dans la DE.
      setNouveauCode(code);
    } catch (err) {
      toast({
        title: 'Échec de la demande de nouveau code',
        description: err?.message || 'Une erreur est survenue lors de la demande.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Déclenche le flux Power Automate de validation avec le code chapeau dans le
  // corps { "Numéro": <code> }. Non bloquant : un échec n'empêche pas la
  // validation de la DE, il affiche seulement un avertissement.
  const triggerValidationFlow = async (numero) => {
    try {
      const res = await fetch(VALIDATION_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'Numéro': numero }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
    } catch (err) {
      toast({
        title: 'Flux non déclenché',
        description: `La DE est validée, mais l'appel au flux a échoué : ${err?.message || 'erreur inconnue'}.`,
        variant: 'destructive',
      });
    }
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

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? base44.entities.DemandeEtude.update(editId, data)
        : base44.entities.DemandeEtude.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      navigate(createPageUrl('DemandesEtude'));
    }
  });

  // ZUG = poids net × 1000 (champ calculé, non modifiable).
  const zug = formData.poids_net === '' ? '' : Number(formData.poids_net) * 1000;

  const handleSaveBrouillon = async () => {
    let projetId = formData.projet_id;
    // Pour une DE, on reflète le brouillon dans cr04e_projet (Dataverse) pour
    // qu'il apparaisse dans la liste. Non bloquant : si Dataverse échoue, le
    // brouillon est tout de même enregistré localement.
    if (formType === 'de') {
      const ctx = { codeChapeau, zug, sapOptions, statut: PROJET_STATUT.brouillon };
      try {
        if (projetId) {
          await updateProjetFromDE(projetId, formData, ctx);
        } else {
          const created = await createProjetFromDE(formData, ctx);
          projetId = created?.cr04e_projetid || '';
        }
      } catch (err) {
        toast({
          title: 'Projet non synchronisé',
          description: `Brouillon enregistré localement, mais la synchro Dataverse a échoué : ${err?.message || 'erreur inconnue'}.`,
          variant: 'destructive',
        });
      }
    }
    saveMutation.mutate({ ...formData, projet_id: projetId, zug, type_de: formType, statut: 'brouillon' });
  };

  // Code chapeau issu du bloc « Article d'origine » : code VL saisi, ou code
  // généré par le flux « nouveau code ». Dérivé pour servir à la fois au blocage
  // du bouton et à la soumission.
  const codeChapeau =
    origine_mode === 'nouveau_code'
      ? (nouveauCode || '').trim()
      : origine_mode === 'vl'
        ? (formData.code_vl || '').trim()
        : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Pour une DE, la validation est bloquée tant qu'aucun code chapeau n'a été
    // obtenu (VL saisie ou nouveau code demandé).
    if (formType === 'de' && !codeChapeau) {
      toast({
        title: 'Code chapeau requis',
        description: "Coche « Besoin d'une VL » et saisis le code, ou clique « Besoin d'un nouveau code ».",
        variant: 'destructive',
      });
      return;
    }
    // Écriture de la ligne cr04e_projet (BLOQUANT : on n'avance pas si ça échoue,
    // la table Projet est la sortie principale de l'envoi vers SAP). Statut
    // « en attente de DL » => la partie DE est validée. Maj si un projet existe
    // déjà (brouillon), sinon création.
    if (formType === 'de') {
      const ctx = { codeChapeau, zug, sapOptions, statut: PROJET_STATUT.en_attente_dl };
      try {
        if (formData.projet_id) {
          await updateProjetFromDE(formData.projet_id, formData, ctx);
        } else {
          await createProjetFromDE(formData, ctx);
        }
      } catch (err) {
        toast({
          title: 'Envoi vers SAP échoué',
          description: `La DE n'a pas été envoyée : ${err?.message || 'erreur inconnue'}.`,
          variant: 'destructive',
        });
        return;
      }
    }
    // Déclenche le flux de validation avec le code chapeau (non bloquant : on
    // attend l'envoi avant de naviguer, mais un échec ne stoppe pas la DE).
    if (codeChapeau) await triggerValidationFlow(codeChapeau);
    // La DE passe direct en phase DL.
    saveMutation.mutate({
      ...formData,
      zug,
      type_de: formType,
      code_division_calc: autreCodeDivision,
      classe_valorisation_calc: autreClasseVal,
      centre_profit_calc: autreCentreProfit,
      secteur_activite_calc: autreSecteur,
      code_chapeau: codeChapeau,
      date_code_chapeau: codeChapeau ? new Date().toISOString() : null,
      statut: 'en_attente_dl',
    });
  };

  const handleBack = () => {
    if (step === 'form' && !editId) {
      setStep('selection');
      setFormType(null);
    } else {
      navigate(createPageUrl('DemandesEtude'));
    }
  };

  const formTitle =
    formType === 'de'
      ? 'Demande d\'Étude (DE)'
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            {formType === 'de' && (
              <RecupererBeCPG onApply={handleApplyBeCPG} />
            )}

            {formType === 'de' && (
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
                      <SearchableSelect
                        value={formData.axe_strategique}
                        onChange={(v) => handleChange('axe_strategique', v)}
                        options={buildOptions(adminOptions.axes_strategiques, formData.axe_strategique)}
                        placeholder="Sélectionner un axe"
                      />
                    </Field>
                    <Field label="Réseau" required>
                      <SearchableSelect
                        value={formData.reseau}
                        onChange={(v) => handleChange('reseau', v)}
                        options={buildOptions(adminOptions.reseaux, formData.reseau)}
                        placeholder="Sélectionner un réseau"
                      />
                    </Field>
                    <Field label="Type de la demande">
                      <Select
                        key={`type-${formData.type_demande_de}`}
                        value={formData.type_demande_de}
                        onValueChange={(v) => handleChange('type_demande_de', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {withValue(TYPES_DEMANDE_DE, formData.type_demande_de).map((t) => (
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
                    <Field label="Qté prévisionnelle annuelle">
                      <Input
                        type="number"
                        value={formData.qte_previsionnelle_annuelle}
                        onChange={(e) => handleChange('qte_previsionnelle_annuelle', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Produit" icon={Layers}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    <div className="md:col-span-2">
                      <Field label="Client" hint="Recherchez et sélectionnez un client">
                        <ClientCombobox
                          value={formData.client}
                          onChange={(v) => handleChange('client', v)}
                          options={withValue(CLIENTS, formData.client)}
                        />
                      </Field>
                    </div>
                    <Field label="Hiérarchie produit famille" required>
                      <SearchableSelect
                        value={formData.famille_produit}
                        onChange={(v) => handleChange('famille_produit', v)}
                        options={buildOptions(famillesProduitOptions, formData.famille_produit)}
                        placeholder="Sélectionner une famille"
                      />
                    </Field>
                    <Field label="Secteur d'activité">
                      <SearchableSelect
                        value={formData.marque}
                        onChange={(v) => handleChange('marque', v)}
                        options={buildOptions(adminOptions.secteurs_activite, formData.marque)}
                        placeholder="Sélectionner un secteur"
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
                    <Field label="ZUG" hint="Calculé : poids net × 1000">
                      <Input
                        type="number"
                        value={zug}
                        readOnly
                        tabIndex={-1}
                        placeholder="0"
                        className="h-11 bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    </Field>
                    <Field label="Division (Usine)">
                      <SearchableSelect
                        value={formData.division}
                        onChange={(v) => handleChange('division', v)}
                        options={buildOptions(sapOptions.divisions, formData.division)}
                        placeholder="Sélectionner une division"
                      />
                    </Field>
                    <Field label="Classe de valorisation">
                      <SearchableSelect
                        value={formData.classe_valorisation}
                        onChange={(v) => handleChange('classe_valorisation', v)}
                        options={buildOptions(sapOptions.classes_valorisation, formData.classe_valorisation)}
                        placeholder="Sélectionner une classe"
                      />
                    </Field>
                    <Field label="Centre de profit">
                      <SearchableSelect
                        value={formData.centre_profit}
                        onChange={(v) => handleChange('centre_profit', v)}
                        options={buildOptions(adminOptions.centres_profit, formData.centre_profit)}
                        placeholder="Sélectionner un centre"
                      />
                    </Field>
                    <Field label="Groupe d'autorisation">
                      <SearchableSelect
                        value={formData.groupe_autorisation}
                        onChange={(v) => handleChange('groupe_autorisation', v)}
                        options={buildOptions(adminOptions.groupes_autorisation, formData.groupe_autorisation)}
                        placeholder="Sélectionner un groupe"
                      />
                    </Field>
                    <Field label="Groupe de frais généraux">
                      <SearchableSelect
                        value={formData.groupe_frais_generaux}
                        onChange={(v) => handleChange('groupe_frais_generaux', v)}
                        options={buildOptions(sapOptions.groupes_frais_generaux, formData.groupe_frais_generaux)}
                        placeholder="Sélectionner un groupe"
                      />
                    </Field>
                    <Field label="Groupe article (division)" required>
                      <SearchableSelect
                        value={formData.groupe_article}
                        onChange={(v) => handleChange('groupe_article', v)}
                        options={buildOptions(sapOptions.groupes_article, formData.groupe_article)}
                        placeholder="Sélectionner un groupe"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Article d'origine" icon={Layers}>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={origine_mode === 'vl'}
                        disabled={origine_mode === 'nouveau_code'}
                        onCheckedChange={(v) => handleToggleVL(!!v)}
                      />
                      <span className="text-sm font-medium text-foreground">Besoin d'une VL</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDemanderNouveauCode}
                      disabled={origine_mode === 'vl' || isRequestingCode}
                    >
                      {isRequestingCode ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      Besoin d'un nouveau code
                    </Button>
                    {nouveauCode && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-left-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Nouveau code : <span className="font-mono font-semibold text-foreground">{nouveauCode}</span>
                      </span>
                    )}
                  </div>

                  {origine_mode === 'vl' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      <Field
                        label="Code d'article d'origine"
                        hint="Code à 6 ou 8 chiffres requis"
                      >
                        <Input
                          value={formData.code_vl}
                          onChange={(e) => handleChange('code_vl', e.target.value)}
                          placeholder="Ex: 12345678"
                          maxLength={8}
                          className="h-11 font-mono"
                        />
                      </Field>
                    </div>
                  )}
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
                      <SearchableSelect
                        value={formData.autre_service}
                        onChange={(v) => handleChange('autre_service', v)}
                        options={buildOptions(adminOptions.services_demandeur, formData.autre_service)}
                        placeholder="Sélectionner un service"
                      />
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
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer brouillon
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                disabled={saveMutation.isPending || (formType === 'de' && !codeChapeau)}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer vers SAP
              </Button>
            </div>

            <SapSynthesisDialog
              open={sapPreviewOpen}
              onOpenChange={setSapPreviewOpen}
              data={formData}
              zug={zug}
            />
          </form>
        )}
      </main>
    </div>
  );
}
