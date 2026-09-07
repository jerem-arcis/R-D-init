import { Cr04e_projetsService } from '@/generated';
import { lookupBind, codeFromLookupValue } from '@/api/sapLists';
import {
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeTypeProduitDS,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
  isTypeNegoce,
  usineOrigineFromDivision,
  usineFabFromDivision,
  activiteFromHierarchie,
  typeMarqueFromSecteur,
  agenTypeFromDivision,
  agenChoixFromCentre,
} from '@/lib/dsRules';

import { toNumber, trimOrUndef } from '@/api/_odata';

export const DS_STATUTS = ['ds_brouillon', 'ds_attente_cc', 'ds_validee'];

// Valeurs calculées d'une DS à partir de formData (réutilisé par le payload et la
// vue/synthèse). Tout est dérivé des inputs via dsRules.
// Phase de dev : les champs auto-calculés sont éditables. Une saisie manuelle est
// stockée dans une clé d'override dédiée `_ds_<champ>_ovr` qui, si présente, gagne
// sur la valeur calculée (et part donc telle quelle vers SAP/Dataverse). On utilise
// une clé dédiée — et non `_ds_<champ>` (le snapshot persisté d'une DS rouverte) —
// pour ne pas geler le recalcul quand on modifie un input d'une DS existante.
export function computeDsValues(formData) {
  const ctx = {
    usine: formData.autre_usine_fab,
    type_demande: formData.autre_type_demande,
    activite: formData.autre_activite,
    agen_type: formData.autre_agen_type,
    agen_choix: formData.autre_agen_choix,
  };
  // Override manuel prioritaire sur le calcul ('' / null = pas d'override).
  const ovr = (key, computed) => {
    const v = formData[key];
    return v === '' || v == null ? computed : v;
  };
  // En négoce (usine d'origine = « Produit négoce »), pas de code division
  // d'origine : forcé vide, un éventuel override est ignoré (rien n'est poussé).
  const origineNegoce = formData.autre_usine_origine === 'Produit négoce';
  return {
    divisionFab: ovr('_ds_division_fab_ovr', codeDivisionFabrication(ctx)),
    divisionOrigine: origineNegoce
      ? ''
      : ovr('_ds_division_origine_ovr', codeDivisionOrigine(formData.autre_usine_origine)),
    hierarchie: ovr('_ds_hierarchie_ovr', computeHierarchieDS(formData.autre_activite)),
    // Classe de valorisation : calculée selon usine / activité (cf. computeClasseValoDS),
    // avec override manuel prioritaire — le champ est saisissable côté formulaire.
    classeValo: ovr('_ds_classe_valo_ovr', computeClasseValoDS(ctx)),
    centreProfit: ovr('_ds_centre_profit_ovr', computeCentreProfitDS(ctx)),
    secteur: ovr('_ds_secteur_ovr', computeSecteurDS(formData.autre_type_marque)),
    // TypeProduit SAP : Aire → NEGO, sinon PFIN (usine de fabrication).
    typeProduit: computeTypeProduitDS(ctx.usine),
  };
}

// Construit le payload cr04e_projet pour une DS. `sapOptions` sert à résoudre les
// lookups code→GUID. Champs vides et lookups non résolus omis.
export function buildDsPayload(formData, { sapOptions = {}, statut } = {}) {
  const c = computeDsValues(formData);
  const payload = {
    cr04e_demandeur: trimOrUndef(formData.autre_demandeur),
    cr04e_datedelademande: trimOrUndef(formData.autre_date),
    cr04e_typedelademande: trimOrUndef(formData.autre_type_demande),
    cr04e_nomduproduitdesignation: trimOrUndef(formData.autre_designation),
    cr04e_poidsnet: toNumber(formData.autre_poids_net_uv),
    cr04e_codeprojet: trimOrUndef(formData.autre_code_origine),
    cr04e_codechapeau: trimOrUndef(formData.code_chapeau),
    cr04e_secteurdactivite: trimOrUndef(c.secteur),
    cr04e_codedivisionorigine: trimOrUndef(c.divisionOrigine),
    cr04e_service: trimOrUndef(formData.autre_service),
    cr04e_descriptiondubesoin: trimOrUndef(formData.autre_description),
    // Activité (PATISSERIES/TRAITEUR/MOCHIS) stockée en propre — distincte du
    // secteur d'activité. Permet de recalculer la hiérarchie à la réouverture.
    cr04e_activite_ds: trimOrUndef(formData.autre_activite),
    cr04e_statut_en_cours: trimOrUndef(statut),
    // Type de produit SAP : « Aire » → NEGO (négoce), sinon PFIN (produit fini) —
    // même valeur que le champ TypeProduit du payload SAP_SEND. La règle est portée
    // par computeTypeProduitDS (cf. dsRules) ; le pendant DE vaut toujours PFIN.
    cr04e_typedeproduit: c.typeProduit,
  };

  const divBind = lookupBind('divisions', c.divisionFab, sapOptions.divisions);
  if (divBind) payload['cr04e_DivisionUsine@odata.bind'] = divBind;
  const classeBind = lookupBind('classes_valorisation', c.classeValo, sapOptions.classes_valorisation);
  if (classeBind) payload['cr04e_Classedevalorisation@odata.bind'] = classeBind;
  const hierBind = lookupBind('familles_produit', c.hierarchie, sapOptions.familles_produit);
  if (hierBind) payload['cr04e_Hierarchieproduitfamille@odata.bind'] = hierBind;
  const cpBind = lookupBind('centres_profit', c.centreProfit, sapOptions.centres_profit);
  if (cpBind) payload['cr04e_Centredeprofit@odata.bind'] = cpBind;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export async function createDsFromForm(formData, ctx) {
  const result = await Cr04e_projetsService.create(buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

export async function updateDsFromForm(id, formData, ctx) {
  const result = await Cr04e_projetsService.update(id, buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

// Lit une ligne cr04e_projet (DS) et reconstruit le formData DS (type 'autre').
// Les inputs non stockés sont redéduits des valeurs persistées quand c'est possible.
export async function getDsById(id, sapOptions = {}) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = result?.data ?? null;
  if (!p) return null;
  const divisionFab = codeFromLookupValue('divisions', p._cr04e_divisionusine_value, sapOptions.divisions);
  const centreProfit = codeFromLookupValue('centres_profit', p._cr04e_centredeprofit_value, sapOptions.centres_profit);
  const classeValo = codeFromLookupValue('classes_valorisation', p._cr04e_classedevalorisation_value, sapOptions.classes_valorisation);
  const hierarchie = codeFromLookupValue('familles_produit', p._cr04e_hierarchieproduitfamille_value, sapOptions.familles_produit);
  const divisionOrigine = p.cr04e_codedivisionorigine ?? '';
  const secteur = p.cr04e_secteurdactivite ?? '';
  // Re-déduction des saisies (selects) à partir des valeurs SAP persistées : sans
  // ça, les listes déroulantes reviennent vides à la réouverture d'un brouillon.
  const usineFab = usineFabFromDivision(divisionFab);
  return {
    projet_id: p.cr04e_projetid,
    type_de: 'autre',
    autre_demandeur: p.cr04e_demandeur ?? '',
    autre_date: (p.cr04e_datedelademande ?? '').slice(0, 10),
    autre_service: p.cr04e_service ?? '',
    autre_type_demande: p.cr04e_typedelademande ?? '',
    autre_description: p.cr04e_descriptiondubesoin ?? '',
    autre_code_origine: p.cr04e_codeprojet ?? '',
    autre_designation: p.cr04e_nomduproduitdesignation ?? '',
    autre_poids_net_uv: p.cr04e_poidsnet ?? '',
    // Négoce : la division d'origine est vide (pas de code) -> on repose l'usine
    // d'origine « Produit négoce » à partir du type de demande.
    autre_usine_origine:
      usineOrigineFromDivision(divisionOrigine) ||
      (isTypeNegoce(p.cr04e_typedelademande) ? 'Produit négoce' : ''),
    autre_usine_fab: usineFab,
    // Activité : colonne dédiée en priorité ; repli sur la déduction depuis la hiérarchie.
    autre_activite: (p.cr04e_activite_ds ?? '') || activiteFromHierarchie(hierarchie),
    autre_type_marque: typeMarqueFromSecteur(secteur),
    autre_agen_type: usineFab === 'Agen' ? agenTypeFromDivision(divisionFab) : '',
    autre_agen_choix: usineFab === 'Agen' ? agenChoixFromCentre(centreProfit) : '',
    code_chapeau: p.cr04e_codechapeau ?? '',
    statut: p.cr04e_statut_en_cours ?? '',
    // Valeurs SAP persistées (filet de sécurité pour l'aperçu / push ADV) :
    _ds_centre_profit: centreProfit,
    _ds_division_fab: divisionFab,
    _ds_division_origine: divisionOrigine,
    _ds_secteur: secteur,
    _ds_classe_valo: classeValo,
    _ds_hierarchie: hierarchie,
  };
}
