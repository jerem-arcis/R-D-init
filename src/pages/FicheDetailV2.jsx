import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useInheritedProjetFields } from '@/lib/useInheritedProjetFields';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateFichePdf } from '@/lib/generateFichePdf';

import VisaToolbar from '@/components/fiche/VisaToolbar';
import ViewSwitch from '@/components/fiche/ViewSwitch';
import IdentificationBanner from '@/components/fiche/IdentificationBanner';
import FLSynthesisSection from '@/components/fiche/FLSynthesisSection';
import TextField from '@/components/fiche/fields/TextField';
import SelectField from '@/components/fiche/fields/SelectField';
import MultiSelectField from '@/components/fiche/fields/MultiSelectField';
import EANField from '@/components/fiche/fields/EANField';
import EmballagesTable from '@/components/fiche/fields/EmballagesTable';
import LibelleParPaysTable from '@/components/fiche/fields/LibelleParPaysTable';
import {
  SITES_STOCKAGE, GROUPES_ARTICLE,
  GROUPES_RISTOURNE, GROUPES_IMPUTATION, CLES_CALCUL_LOT, PROFILS_COUVERTURE,
  TYPES_APPROVISIONNEMENT, ECLATEMENTS_GROUPE_MARCHANDISE, TYPES_USINE, TYPES_PALETTE,
  MASQUES_ETIQUETTE_COLIS, UNITES_DUREE_VIE, STATUTS_LANCEMENT, FABRICATION_NEGOCE,
  ORIGINES_FABRICATION, CANAUX_DISTRIBUTION, SECTEURS_ACTIVITE, MARQUES,
  NOMENCLATURES_DOUANIERES, MENTIONS_PRODUIT, SPECIFICITES_PRODUIT,
  GROUPES_STATISTIQUE, GESTION_PAR_LOTS,
  FIELD_OWNERS, OWNER_META, isFieldEditable, getFieldState,
} from '@/lib/ficheSchema';

const GROUPS = [
  { id: 'statut', title: 'Statut & dates clés' },
  { id: 'classification', title: 'Classification commerciale' },
  { id: 'libelles', title: 'Libellés & étiquettes' },
  { id: 'emballages', title: 'Emballages & dimensions' },
  { id: 'codes_barres', title: 'Codes-barres (EAN / GTIN)' },
  { id: 'groupements_sap', title: 'Groupements SAP & douanes' },
  { id: 'appro_stock', title: 'Approvisionnement & stock' },
];

// Champs retirés de la FL (réduction Commerce/Industriel/Supply Chain + suppression
// de la section Gestion du besoin). Les GTIN se saisissent désormais dans le tableau
// Emballages (colonne GTIN/EAN), plus dans des champs EAN dédiés.
const REMOVED_FIELDS = new Set([
  'statut_lancement', 'libelle_client', 'fabrication_negoce', 'mention_produit',
  'specificite_produit', 'sites_stockage', 'groupe_marchandises', 'groupement_articles',
  'vl', 'article_prix', 'biv', 'ancien_numero_article', 'dluc_dluo_critique', 'gestion_par_lots',
  'ean_carton', 'ean_couche', 'ean_palette', 'ean_manuel',
  'cle_calcul_lot_usine', 'cle_calcul_lot_stockiste',
  'profil_couverture_usine', 'profil_couverture_stockiste',
  'delai_securite_usine', 'delai_securite_stockiste',
  'delai_securite_couv_reelle_usine', 'delai_securite_couv_reelle_stockiste',
  'type_approvisionnement_usine', 'type_approvisionnement_stockiste',
  'appro_special', 'delai_previsionnel_livraison', 'temps_reception_stockiste',
]);
// Groupes entièrement vidés par la réduction → masqués.
const HIDDEN_GROUPS = new Set(['statut', 'codes_barres']);

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
  const [localFiche, setLocalFiche] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Re-remonte les champs hérités du projet Dataverse (centre de profit, hiérarchie
  // produit, date de la demande) sur cette FL. Partagé avec la Vue par service.
  useInheritedProjetFields(fiche, handleUpdate);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await generateFichePdf(localFiche, de);
    } catch (err) {
      console.error('[export PDF]', err);
      toast({ variant: 'destructive', title: 'Échec de la génération du PDF' });
    } finally {
      setIsExporting(false);
    }
  };

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
    supply_chain: () => handleUpdate(visaPatch('visa_supply_chain', 'refus_supply_chain')),
    industriel: () => handleUpdate(visaPatch('visa_industriel', 'refus_industriel')),
    commerce: () => handleUpdate(visaPatch('visa_commerce', 'refus_commerce')),
  };
  const refusHandlers = {
    supply_chain: (m) => handleUpdate(refusPatch('visa_supply_chain', 'refus_supply_chain', m)),
    industriel: (m) => handleUpdate(refusPatch('visa_industriel', 'refus_industriel', m)),
    commerce: (m) => handleUpdate(refusPatch('visa_commerce', 'refus_commerce', m)),
  };

  const isLocked = localFiche.statut_sap === 'Création SAP effectuée';

  // Écriture simultanée : les champs restants sont visibles en permanence.
  // Les champs retirés de la FL (REMOVED_FIELDS) et les groupes vidés (HIDDEN_GROUPS)
  // sont masqués.
  const showGroup = (id) => !HIDDEN_GROUPS.has(id);
  const showField = (name) => !REMOVED_FIELDS.has(name);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Accueil')}>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                  {localFiche.code_article || 'Nouvelle fiche'}
                  {localFiche.libelle_article && ` — ${localFiche.libelle_article}`}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {ficheId?.slice(0, 8)}…
                  {de && <span className="ml-3">DE: {de.code_projet}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Save className="w-4 h-4 animate-pulse" />
                  Enregistrement…
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {isExporting ? 'Génération…' : 'Exporter PDF'}
              </Button>
              <ViewSwitch active="complete" ficheId={ficheId} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <VisaToolbar
              fiche={localFiche}
              onVisaHandlers={visaHandlers}
              onRefusHandlers={refusHandlers}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* ----- Identification (bandeau, hors visa) ----- */}
        <IdentificationBanner fiche={localFiche} de={de} onUpdate={handleUpdate} disabled={isLocked} />

        {/* ----- 1. Statut ----- */}
        <Group visible={showGroup('statut')} id="statut" title="Statut & dates clés">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('statut_lancement')}><SelectField label="Statut de lancement" {...fld('statut_lancement')} options={STATUTS_LANCEMENT} /></Fld>
          </div>
        </Group>

        {/* ----- 3. Classification commerciale ----- */}
        <Group visible={showGroup('classification')} id="classification" title="Classification commerciale">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('fabrication_negoce')}><SelectField label="Fabrication ou négoce" {...fld('fabrication_negoce')} options={FABRICATION_NEGOCE} /></Fld>
            <Fld visible={showField('origine_fabrication')}><SelectField label="Origine de fabrication" {...fld('origine_fabrication')} options={ORIGINES_FABRICATION} /></Fld>
            <Fld visible={showField('canaux_distribution')}><MultiSelectField label="Canaux de distribution" {...fld('canaux_distribution')} options={CANAUX_DISTRIBUTION} /></Fld>
            <Fld visible={showField('secteur_activite')}><SelectField label="Secteur d'activité" {...fld('secteur_activite')} options={SECTEURS_ACTIVITE} /></Fld>
            <Fld visible={showField('marque')}><SelectField label="Marque" {...fld('marque')} options={MARQUES} fromSAP /></Fld>
            <Fld visible={showField('mention_produit')}><SelectField label="Mention produit" {...fld('mention_produit')} options={MENTIONS_PRODUIT} /></Fld>
            <Fld visible={showField('specificite_produit')}><SelectField label="Spécificité produits" {...fld('specificite_produit')} options={SPECIFICITES_PRODUIT} /></Fld>
            <Fld visible={showField('hierarchie_produit')}><TextField label="Hiérarchie produit" {...fld('hierarchie_produit')} /></Fld>
          </div>
        </Group>

        {/* ----- 4. Libellés ----- */}
        <Group visible={showGroup('libelles')} id="libelles" title="Libellés & étiquettes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Fld visible={showField('libelle_long_40')}><TextField label="Libellé long 40 caractères" maxLength={40} {...fld('libelle_long_40')} /></Fld>
            <Fld visible={showField('libelle_caisse')}><TextField label="Libellé caisse" {...fld('libelle_caisse')} /></Fld>
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
              showGtin
              gtinEditable={!isLocked && !localFiche.visa_commerce}
            />
          </Fld>
        </Group>

        {/* ----- 6. Codes-barres ----- */}
        <Group visible={showGroup('codes_barres')} id="codes_barres" title="Codes-barres (EAN / GTIN)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('ean_carton')}><EANField label="EAN carton" {...fld('ean_carton')} /></Fld>
            <Fld visible={showField('ean_couche')}><EANField label="EAN couche" {...fld('ean_couche')} /></Fld>
            <Fld visible={showField('ean_palette')}><EANField label="EAN palette" {...fld('ean_palette')} /></Fld>
            <Fld visible={showField('ean_manuel')}><TextField label="EAN manuel" maxLength={14} {...fld('ean_manuel')} /></Fld>
          </div>
        </Group>

        {/* ----- 7. Groupements SAP ----- */}
        <Group visible={showGroup('groupements_sap')} id="groupements_sap" title="Groupements SAP & douanes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('vl')}><TextField label="VL" maxLength={2} {...fld('vl')} /></Fld>
            <Fld visible={showField('article_prix')}><TextField label="Article prix" {...fld('article_prix')} /></Fld>
            <Fld visible={showField('ancien_numero_article')}><TextField label="Ancien n° article" {...fld('ancien_numero_article')} /></Fld>
            <Fld visible={showField('biv')}><TextField label="BIV (ancien n° vu)" {...fld('biv')} /></Fld>
            <Fld visible={showField('eclatement_groupe_marchandise')}><SelectField label="Éclatement groupe marchandise" {...fld('eclatement_groupe_marchandise')} options={ECLATEMENTS_GROUPE_MARCHANDISE} fromSAP /></Fld>
            <Fld visible={showField('groupe_marchandises')}><TextField label="Groupe de marchandises" {...fld('groupe_marchandises')} fromSAP /></Fld>
            <Fld visible={showField('groupement_articles')}><TextField label="Groupement d'articles" {...fld('groupement_articles')} /></Fld>
            <Fld visible={showField('groupe_article')}><SelectField label="Groupe article" {...fld('groupe_article')} options={GROUPES_ARTICLE} fromSAP /></Fld>
            <Fld visible={showField('groupe_ristourne')}><SelectField label="Groupe de ristourne" {...fld('groupe_ristourne')} options={GROUPES_RISTOURNE} fromSAP /></Fld>
            <Fld visible={showField('groupe_imputation')}><SelectField label="Groupe d'imputation" {...fld('groupe_imputation')} options={GROUPES_IMPUTATION} fromSAP /></Fld>
            <Fld visible={showField('groupe_statistique_article')}><SelectField label="Groupe statistique article" {...fld('groupe_statistique_article')} options={GROUPES_STATISTIQUE} fromSAP /></Fld>
            <Fld visible={showField('nomenclature_douaniere')}><SelectField label="Nomenclature douanière" {...fld('nomenclature_douaniere')} options={NOMENCLATURES_DOUANIERES} fromSAP /></Fld>
          </div>
        </Group>

        {/* ----- 8. Appro & stock ----- */}
        <Group visible={showGroup('appro_stock')} id="appro_stock" title="Approvisionnement & stock">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Fld visible={showField('sites_stockage')}><MultiSelectField label="Sites de stockage" required {...fld('sites_stockage')} options={SITES_STOCKAGE} fromSAP /></Fld>
            <Fld visible={showField('dluc_dluo_critique')}><TextField label="DLC/DLUO critique (j)" type="number" {...fld('dluc_dluo_critique')} /></Fld>
            <Fld visible={showField('gestion_par_lots')}><SelectField label="Gestion par lots" {...fld('gestion_par_lots')} options={GESTION_PAR_LOTS} /></Fld>
            <Fld visible={showField('cle_calcul_lot_usine')}><SelectField label="Clé calcul lot — usine" {...fld('cle_calcul_lot_usine')} options={CLES_CALCUL_LOT} fromSAP /></Fld>
            <Fld visible={showField('cle_calcul_lot_stockiste')}><SelectField label="Clé calcul lot — stockage" {...fld('cle_calcul_lot_stockiste')} options={CLES_CALCUL_LOT} fromSAP /></Fld>
            <Fld visible={showField('profil_couverture_usine')}><SelectField label="Profil couverture — usine" {...fld('profil_couverture_usine')} options={PROFILS_COUVERTURE} /></Fld>
            <Fld visible={showField('profil_couverture_stockiste')}><SelectField label="Profil couverture — stockiste" {...fld('profil_couverture_stockiste')} options={PROFILS_COUVERTURE} /></Fld>
            <Fld visible={showField('type_approvisionnement_usine')}><SelectField label="Type appro — usine" {...fld('type_approvisionnement_usine')} options={TYPES_APPROVISIONNEMENT} /></Fld>
            <Fld visible={showField('type_approvisionnement_stockiste')}><SelectField label="Type appro — stockiste" {...fld('type_approvisionnement_stockiste')} options={TYPES_APPROVISIONNEMENT} /></Fld>
            <Fld visible={showField('delai_securite_usine')}><TextField label="Délai sécurité — usine (j)" type="number" {...fld('delai_securite_usine')} /></Fld>
            <Fld visible={showField('delai_securite_stockiste')}><TextField label="Délai sécurité — stockiste (j)" type="number" {...fld('delai_securite_stockiste')} /></Fld>
            <Fld visible={showField('delai_securite_couv_reelle_usine')}><TextField label="Délai sec/couv réelle — usine" type="number" {...fld('delai_securite_couv_reelle_usine')} /></Fld>
            <Fld visible={showField('delai_securite_couv_reelle_stockiste')}><TextField label="Délai sec/couv réelle — stockiste" type="number" {...fld('delai_securite_couv_reelle_stockiste')} /></Fld>
            <Fld visible={showField('appro_special')}><TextField label="Approvisionnement spécial" {...fld('appro_special')} /></Fld>
            <Fld visible={showField('delai_previsionnel_livraison')}><TextField label="Délai prévisionnel livraison" {...fld('delai_previsionnel_livraison')} fromSAP /></Fld>
            <Fld visible={showField('temps_reception_usine')}><TextField label="Temps réception (usine, j)" type="number" {...fld('temps_reception_usine')} /></Fld>
            <Fld visible={showField('temps_reception_stockiste')}><TextField label="Temps réception (stockiste)" {...fld('temps_reception_stockiste')} fromSAP /></Fld>
          </div>
        </Group>

        {/* ----- Synthèse FL + création SAP (même bloc que la Vue par service) ----- */}
        <FLSynthesisSection fiche={localFiche} />
      </main>
    </div>
  );
}
