import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save, CheckCircle2, Clock } from 'lucide-react';

import VisaToolbar from '@/components/fiche/VisaToolbar';
import TextField from '@/components/fiche/fields/TextField';
import SelectField from '@/components/fiche/fields/SelectField';
import MultiSelectField from '@/components/fiche/fields/MultiSelectField';
import EANField from '@/components/fiche/fields/EANField';
import EmballagesTable from '@/components/fiche/fields/EmballagesTable';
import LibelleParPaysTable from '@/components/fiche/fields/LibelleParPaysTable';
import {
  CENTRES_PROFIT, SITES_STOCKAGE, GROUPES_STATISTIQUE_ARTICLE, GROUPES_ARTICLE,
  GROUPES_RISTOURNE, GROUPES_IMPUTATION, CLES_CALCUL_LOT, PROFILS_COUVERTURE,
  TYPES_APPROVISIONNEMENT, ECLATEMENTS_GROUPE_MARCHANDISE, TYPES_USINE, TYPES_PALETTE,
  MASQUES_ETIQUETTE_COLIS, UNITES_DUREE_VIE, STATUTS_LANCEMENT, FABRICATION_NEGOCE,
  ORIGINES_FABRICATION, CANAUX_DISTRIBUTION, SECTEURS_ACTIVITE, MARQUES,
  NOMENCLATURES_DOUANIERES, MENTIONS_PRODUIT, getValueFromDE,
  FIELD_OWNERS, OWNER_META, isFieldEditable, getFieldState, getCurrentOwner,
} from '@/lib/ficheSchema';

const GROUPS = [
  { id: 'identification', title: 'Identification du produit', owners: ['cg', 'sc'] },
  { id: 'statut', title: 'Statut & dates clés', owners: ['cg', 'com'] },
  { id: 'classification', title: 'Classification commerciale', owners: ['cg', 'com'] },
  { id: 'libelles', title: 'Libellés & étiquettes', owners: ['ind', 'com'] },
  { id: 'emballages', title: 'Emballages & dimensions', owners: ['ind'] },
  { id: 'codes_barres', title: 'Codes-barres (EAN / GTIN)', owners: ['sc', 'com'] },
  { id: 'groupements_sap', title: 'Groupements SAP & douanes', owners: ['sc', 'ind', 'com'] },
  { id: 'appro_stock', title: 'Approvisionnement & stock', owners: ['sc', 'gb', 'ind'] },
];

const CURRENT_BANNER_STYLES = {
  cg: 'bg-violet-50 border-violet-200 text-violet-900',
  sc: 'bg-sky-50 border-sky-200 text-sky-900',
  gb: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  ind: 'bg-amber-50 border-amber-200 text-amber-900',
  com: 'bg-rose-50 border-rose-200 text-rose-900',
};

// Composants définis au niveau module — sinon React démonte/remonte les inputs à chaque frappe
const Group = ({ visible, id, title, children }) =>
  !visible ? null : (
    <section id={id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-32">
      <header className="bg-slate-50 border-b border-slate-200 px-5 py-2.5">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );

const Fld = ({ visible, children }) => (visible ? children : null);

const visaPatch = (visaField, refusField) => ({
  [visaField]: true,
  [`${visaField}_date`]: new Date().toISOString(),
  [refusField]: false,
  [`${refusField}_motif`]: null,
});

const refusPatch = (visaField, refusField, motif) => ({
  [refusField]: true,
  [`${refusField}_motif`]: motif,
  [`${refusField}_date`]: new Date().toISOString(),
  [visaField]: false,
});

export default function FicheDetailV2() {
  const [searchParams] = useSearchParams();
  const ficheId = searchParams.get('id');
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  const [localFiche, setLocalFiche] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['fiche', ficheId],
    queryFn: () => base44.entities.FicheLancement.filter({ id: ficheId }),
    enabled: !!ficheId,
    select: (data) => data[0] || null,
  });

  const { data: de } = useQuery({
    queryKey: ['de-for-fiche', fiche?.demande_etude_id],
    queryFn: () => base44.entities.DemandeEtude.get(fiche.demande_etude_id),
    enabled: !!fiche?.demande_etude_id,
  });

  useEffect(() => {
    if (fiche) setLocalFiche(fiche);
  }, [fiche]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FicheLancement.update(ficheId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] });
      queryClient.invalidateQueries({ queryKey: ['fiches'] });
    },
  });

  const handleUpdate = async (updates) => {
    setLocalFiche((prev) => ({ ...prev, ...updates }));
    setIsSaving(true);
    await updateMutation.mutateAsync(updates);
    setIsSaving(false);
  };

  const createSAPMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FicheLancement.update(ficheId, {
        statut_sap: 'Création SAP effectuée',
        cree_sap_par: user.email,
        date_creation_sap: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche', ficheId] });
    },
  });

  const visibleGroups = useMemo(() => {
    const currentOwnerLocal = localFiche ? getCurrentOwner(localFiche) : null;
    if (onlyCurrent && currentOwnerLocal) {
      return GROUPS.filter((g) => g.owners?.includes(currentOwnerLocal));
    }
    return GROUPS;
  }, [onlyCurrent, localFiche]);

  if (isLoading || !localFiche) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Helper : génère les props standard d'un champ depuis son nom (ownership + disabled)
  const fld = (name, extra = {}) => {
    const owner = FIELD_OWNERS[name];
    const meta = OWNER_META[owner];
    const state = getFieldState(name, localFiche);
    return {
      value: localFiche[name],
      onChange: (v) => handleUpdate({ [name]: v }),
      disabled: !isFieldEditable(name, localFiche),
      owner,
      ownerLabel: meta?.label,
      fieldState: state,
      ...extra,
    };
  };

  const visaHandlers = {
    controle_gestion: () => handleUpdate(visaPatch('visa_controle_gestion', 'refus_controle_gestion')),
    supply_chain: () => handleUpdate(visaPatch('visa_supply_chain', 'refus_supply_chain')),
    gestion_besoin: () => handleUpdate(visaPatch('visa_gestion_besoin', 'refus_gestion_besoin')),
    industriel: () => handleUpdate(visaPatch('visa_industriel', 'refus_industriel')),
    commerce: () => handleUpdate(visaPatch('visa_commerce', 'refus_commerce')),
  };
  const refusHandlers = {
    controle_gestion: (m) => handleUpdate(refusPatch('visa_controle_gestion', 'refus_controle_gestion', m)),
    supply_chain: (m) => handleUpdate(refusPatch('visa_supply_chain', 'refus_supply_chain', m)),
    gestion_besoin: (m) => handleUpdate(refusPatch('visa_gestion_besoin', 'refus_gestion_besoin', m)),
    industriel: (m) => handleUpdate(refusPatch('visa_industriel', 'refus_industriel', m)),
    commerce: (m) => handleUpdate(refusPatch('visa_commerce', 'refus_commerce', m)),
  };

  const allVisaDone =
    localFiche.visa_controle_gestion && localFiche.visa_supply_chain &&
    localFiche.visa_gestion_besoin && localFiche.visa_industriel && localFiche.visa_commerce;
  const isLocked = localFiche.statut_sap === 'Création SAP effectuée';
  const currentOwner = getCurrentOwner(localFiche);
  const currentMeta = currentOwner ? OWNER_META[currentOwner] : null;

  const showGroup = (id) => visibleGroups.some((g) => g.id === id);

  // Champ visible : pas filtré, ou owner match avec la section en cours
  const showField = (name) =>
    !onlyCurrent || !currentOwner || FIELD_OWNERS[name] === currentOwner;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Accueil')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight leading-tight">
                  {localFiche.code_article || 'Nouvelle fiche'}
                  {localFiche.libelle_article && ` — ${localFiche.libelle_article}`}
                </h1>
                <p className="text-[11px] text-slate-500">
                  ID: {ficheId?.slice(0, 8)}…
                  {de && <span className="ml-3">DE: {de.code_projet}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Save className="w-3.5 h-3.5 animate-pulse" />
                  Enregistrement…
                </div>
              )}
              <Link to={createPageUrl(`FicheDetail?id=${ficheId}`)}>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  ← Vue V1 (sections)
                </Button>
              </Link>
              {!isLocked && (
                <Button
                  size="sm"
                  disabled={!allVisaDone || createSAPMutation.isPending}
                  onClick={() => window.confirm("Créer l'article dans SAP ?") && createSAPMutation.mutate()}
                  className="h-8 text-xs bg-violet-700 hover:bg-violet-800 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Créer dans SAP
                </Button>
              )}
              {isLocked && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  SAP créé
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-100">
            <VisaToolbar
              fiche={localFiche}
              onVisaHandlers={visaHandlers}
              onRefusHandlers={refusHandlers}
            />
            {currentOwner && !isLocked && (
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyCurrent}
                  onChange={(e) => setOnlyCurrent(e.target.checked)}
                  className="w-3.5 h-3.5 accent-violet-600 cursor-pointer"
                />
                Section en cours uniquement
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide border ${
                  onlyCurrent ? 'bg-violet-600 text-white border-violet-700' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {currentMeta?.short}
                </span>
              </label>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-5 space-y-4">
        {/* Banner étape courante */}
        {currentMeta && !isLocked && (
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${CURRENT_BANNER_STYLES[currentOwner]}`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <div className="text-sm">
              <strong>En attente de {currentMeta.label}</strong>
              {' — '}
              les champs <span className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded">{currentMeta.short}</span> sont éditables, les autres restent visibles mais verrouillés.
            </div>
          </div>
        )}
        {isLocked && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <strong>Article créé dans SAP</strong> — fiche en lecture seule.
          </div>
        )}

        {/* ----- 1. Identification ----- */}
        <Group visible={showGroup('identification')} id="identification" title="Identification du produit">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Fld visible={showField('code_article')}><TextField label="Code article" required {...fld('code_article')} /></Fld>
            <Fld visible={showField('code_chapeau')}><TextField label="Code chapeau" {...fld('code_chapeau')} /></Fld>
            <Fld visible={showField('code_etude_rd')}><TextField label="Code étude R&D" {...fld('code_etude_rd', { value: localFiche.code_etude_rd || getValueFromDE(de, 'code_etude_rd') })} fromDE /></Fld>
            <Fld visible={showField('ancien_numero_article')}><TextField label="Ancien n° article (BIV)" {...fld('ancien_numero_article')} /></Fld>
            <Fld visible={showField('libelle_article')}><TextField label="Libellé article" required colSpan={4} {...fld('libelle_article', { value: localFiche.libelle_article || getValueFromDE(de, 'libelle_article') })} fromDE /></Fld>
          </div>
        </Group>

        {/* ----- 2. Statut & dates ----- */}
        <Group visible={showGroup('statut')} id="statut" title="Statut & dates clés">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('statut_lancement')}><SelectField label="Statut de lancement" {...fld('statut_lancement')} options={STATUTS_LANCEMENT} /></Fld>
            <Fld visible={showField('date_envoi_ficher')}><TextField label="Date envoi de la fiche" type="date" {...fld('date_envoi_ficher')} /></Fld>
            <Fld visible={showField('date_limite_creation_mm01')}><TextField label="Date limite de création" type="date" {...fld('date_limite_creation_mm01')} /></Fld>
          </div>
        </Group>

        {/* ----- 3. Classification commerciale ----- */}
        <Group visible={showGroup('classification')} id="classification" title="Classification commerciale">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('centre_profit')}><SelectField label="Centre de profit" {...fld('centre_profit')} options={CENTRES_PROFIT} fromSAP /></Fld>
            <Fld visible={showField('fabrication_negoce')}><SelectField label="Fabrication ou négoce" {...fld('fabrication_negoce')} options={FABRICATION_NEGOCE} /></Fld>
            <Fld visible={showField('origine_fabrication')}><SelectField label="Origine de fabrication" {...fld('origine_fabrication')} options={ORIGINES_FABRICATION} /></Fld>
            <Fld visible={showField('canaux_distribution')}><MultiSelectField label="Canaux de distribution" {...fld('canaux_distribution')} options={CANAUX_DISTRIBUTION} /></Fld>
            <Fld visible={showField('secteur_activite')}><SelectField label="Secteur d'activité" {...fld('secteur_activite')} options={SECTEURS_ACTIVITE} /></Fld>
            <Fld visible={showField('marque')}><SelectField label="Marque" {...fld('marque')} options={MARQUES} fromSAP /></Fld>
            <Fld visible={showField('mention_produit')}><SelectField label="Mention produit" {...fld('mention_produit')} options={MENTIONS_PRODUIT} /></Fld>
          </div>
        </Group>

        {/* ----- 4. Libellés ----- */}
        <Group visible={showGroup('libelles')} id="libelles" title="Libellés & étiquettes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Fld visible={showField('libelle_long_40')}><TextField label="Libellé long 40 caractères" maxLength={40} {...fld('libelle_long_40')} /></Fld>
            <Fld visible={showField('libelle_client')}><TextField label="Libellé client" {...fld('libelle_client')} /></Fld>
            <Fld visible={showField('libelle_etiquette_colis')}><TextField label="Libellé étiquette colis" {...fld('libelle_etiquette_colis')} /></Fld>
            <Fld visible={showField('designation_client_colis')}><TextField label="Désignation client sur colis" {...fld('designation_client_colis')} /></Fld>
            <Fld visible={showField('masque_etiquette_colis')}><SelectField label="Masque de l'étiquette colis" {...fld('masque_etiquette_colis')} options={MASQUES_ETIQUETTE_COLIS} /></Fld>
            <Fld visible={showField('format_date_etiquette_colis')}><TextField label="Format date étiquette" {...fld('format_date_etiquette_colis')} /></Fld>
            <Fld visible={showField('format_dluo_etiquette_colis')}><TextField label="Format DLUO étiquette" {...fld('format_dluo_etiquette_colis')} /></Fld>
            <Fld visible={showField('type_magasin')}><TextField label="Type de magasin" {...fld('type_magasin')} /></Fld>
          </div>
          <Fld visible={showField('libelle_par_pays')}>
            <LibelleParPaysTable
              value={localFiche.libelle_par_pays}
              onChange={(v) => handleUpdate({ libelle_par_pays: v })}
              disabled={!isFieldEditable('libelle_par_pays', localFiche)}
            />
          </Fld>
        </Group>

        {/* ----- 5. Emballages ----- */}
        <Group visible={showGroup('emballages')} id="emballages" title="Emballages & dimensions">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('type_usine')}><SelectField label="Type d'usine" {...fld('type_usine')} options={TYPES_USINE} fromSAP /></Fld>
            <Fld visible={showField('type_palette')}><SelectField label="Type de support/palette" {...fld('type_palette')} options={TYPES_PALETTE} /></Fld>
            <div className="grid grid-cols-2 gap-2">
              <Fld visible={showField('duree_vie')}><TextField label="Durée de vie" type="number" {...fld('duree_vie')} /></Fld>
              <Fld visible={showField('unite_duree_vie')}><SelectField label="Unité" {...fld('unite_duree_vie')} options={UNITES_DUREE_VIE} /></Fld>
            </div>
          </div>
          <Fld visible={showField('uvc_block')}>
            <EmballagesTable
              fiche={localFiche}
              onUpdate={handleUpdate}
              isEditable={(name) => isFieldEditable(name, localFiche)}
            />
          </Fld>
        </Group>

        {/* ----- 6. Codes-barres ----- */}
        <Group visible={showGroup('codes_barres')} id="codes_barres" title="Codes-barres (EAN / GTIN)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('ean_carton')}><EANField label="EAN carton" {...fld('ean_carton')} /></Fld>
            <Fld visible={showField('ean_couche')}><EANField label="EAN couche" {...fld('ean_couche')} /></Fld>
            <Fld visible={showField('ean_palette')}><EANField label="EAN palette" {...fld('ean_palette')} /></Fld>
            <Fld visible={showField('gtin_uvc')}><TextField label="GTIN UVC" {...fld('gtin_uvc')} /></Fld>
            <Fld visible={showField('biv')}><TextField label="BIV (ancien n° vu)" {...fld('biv')} /></Fld>
          </div>
        </Group>

        {/* ----- 7. Groupements SAP ----- */}
        <Group visible={showGroup('groupements_sap')} id="groupements_sap" title="Groupements SAP & douanes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('vl')}><TextField label="VL" maxLength={2} {...fld('vl')} /></Fld>
            <Fld visible={showField('article_prix')}><TextField label="Article prix" {...fld('article_prix')} /></Fld>
            <Fld visible={showField('eclatement_groupe_marchandise')}><SelectField label="Éclatement groupe marchandise" {...fld('eclatement_groupe_marchandise')} options={ECLATEMENTS_GROUPE_MARCHANDISE} fromSAP /></Fld>
            <Fld visible={showField('groupe_statistique_article')}><SelectField label="Groupe statistique article" {...fld('groupe_statistique_article')} options={GROUPES_STATISTIQUE_ARTICLE} fromSAP /></Fld>
            <Fld visible={showField('groupe_article')}><SelectField label="Groupe article" {...fld('groupe_article')} options={GROUPES_ARTICLE} fromSAP /></Fld>
            <Fld visible={showField('groupe_ristourne')}><SelectField label="Groupe de ristourne" {...fld('groupe_ristourne')} options={GROUPES_RISTOURNE} fromSAP /></Fld>
            <Fld visible={showField('groupe_imputation')}><SelectField label="Groupe d'imputation" {...fld('groupe_imputation')} options={GROUPES_IMPUTATION} fromSAP /></Fld>
            <Fld visible={showField('nomenclature_douaniere')}><SelectField label="Nomenclature douanière" {...fld('nomenclature_douaniere')} options={NOMENCLATURES_DOUANIERES} fromSAP /></Fld>
          </div>
        </Group>

        {/* ----- 8. Appro & stock ----- */}
        <Group visible={showGroup('appro_stock')} id="appro_stock" title="Approvisionnement & stock">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('sites_stockage')}><MultiSelectField label="Sites de stockage" required {...fld('sites_stockage')} options={SITES_STOCKAGE} fromSAP /></Fld>
            <Fld visible={showField('dluc_dluo_critique')}><TextField label="DLC/DLUO critique (j)" type="number" {...fld('dluc_dluo_critique')} /></Fld>
            <Fld visible={showField('type_approvisionnement')}><SelectField label="Type d'approvisionnement" {...fld('type_approvisionnement')} options={TYPES_APPROVISIONNEMENT} /></Fld>
            <Fld visible={showField('cle_calcul_lot_usine')}><SelectField label="Clé calcul lot — usine" {...fld('cle_calcul_lot_usine')} options={CLES_CALCUL_LOT} fromSAP /></Fld>
            <Fld visible={showField('cle_calcul_lot_stockiste')}><SelectField label="Clé calcul lot — stockage" {...fld('cle_calcul_lot_stockiste')} options={CLES_CALCUL_LOT} fromSAP /></Fld>
            <Fld visible={showField('profil_couverture')}><SelectField label="Profil de couverture" {...fld('profil_couverture')} options={PROFILS_COUVERTURE} /></Fld>
            <Fld visible={showField('delai_securite')}><TextField label="Délai de sécurité (j)" type="number" {...fld('delai_securite')} /></Fld>
            <Fld visible={showField('delai_securite_couv_reelle')}><TextField label="Délai sécurité — couverture réelle" type="number" {...fld('delai_securite_couv_reelle')} /></Fld>
            <Fld visible={showField('delai_previsionnel_livraison')}><TextField label="Délai prévisionnel livraison" {...fld('delai_previsionnel_livraison')} fromSAP /></Fld>
            <Fld visible={showField('temps_reception_usine')}><TextField label="Temps réception (usine, j)" type="number" {...fld('temps_reception_usine')} /></Fld>
            <Fld visible={showField('temps_reception_stockiste')}><TextField label="Temps réception (stockiste)" {...fld('temps_reception_stockiste')} fromSAP /></Fld>
          </div>
        </Group>
      </main>
    </div>
  );
}
