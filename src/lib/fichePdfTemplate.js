// Gabarit HTML de l'export PDF « Fiche de Lancement » (style Boncolac, 1 page A4).
//
// Fonction PURE : entrée = objets (fiche, de), sortie = string HTML. Aucune
// dépendance React/DOM → testable en isolation. Le rendu image est fait par
// generateFichePdf.js (html2canvas → jsPDF).
//
// Le gabarit lit TOUS ses blocs depuis l'objet `fiche` (avec repli « — » si vide).
// Les champs absents du modèle app restent « — » sur une vraie fiche, mais sont
// alimentés par le jeu d'exemple (fichePdfDemo.js) quand la fiche est incomplète.
// cf. docs/superpowers/specs/2026-07-27-export-pdf-fiche-lancement-design.md

import { BONCOLAC_LOGO_DATA_URI } from '@/assets/boncolacLogo';

const DASH = '—';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const isEmpty = (v) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

// Valeur affichable : « 0 » reste « 0 », vide devient « — ».
const val = (v) => {
  if (v === 0 || v === '0') return '0';
  return isEmpty(v) ? DASH : esc(String(v));
};

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const formatDateFr = (s) => {
  if (isEmpty(s)) return DASH;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return esc(String(s));
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Dimensions L × l × H d'un bloc emballage.
const dims = (b) => {
  if (!b || [b.long, b.larg, b.haut].every(isEmpty)) return DASH;
  return `${val(b.long)} × ${val(b.larg)} × ${val(b.haut)}`;
};

// Boîtes de chiffres (façon formulaire) pour un EAN ; prend le 1er élément du tableau.
const eanDigits = (arr) => {
  const code = Array.isArray(arr) ? arr[0] : arr;
  if (isEmpty(code)) return `<span class="v muted">${DASH} non renseigné</span>`;
  const boxes = String(code).split('').map((c) => `<span>${esc(c)}</span>`).join('');
  return `<span class="v"><span class="digits">${boxes}</span></span>`;
};

// Pastilles à partir d'une valeur/tableau ; « — » grisé si vide.
const pills = (arr) => {
  if (isEmpty(arr)) return `<span class="pill" style="opacity:.55">${DASH}</span>`;
  return (Array.isArray(arr) ? arr : [arr]).map((x) => `<span class="pill">${esc(x)}</span>`).join('');
};

// Une case de visa : état signé / refusé / en attente + date.
const visaCell = (label, key, fiche) => {
  const signed = fiche[`visa_${key}`];
  const refused = fiche[`refus_${key}`];
  const date = fiche[`visa_${key}_date`] || fiche[`refus_${key}_date`];
  const cls = signed ? 'done' : refused ? 'ko' : '';
  const status = signed ? 'Signé' : refused ? 'Refusé' : 'En attente';
  const detail = date ? formatDateFr(date) : DASH;
  return `<div class="visa ${cls}"><span class="vk">${esc(label)}</span><div class="vn">${detail}</div><span class="vs">${status}</span></div>`;
};

// Durée de vie « 548 J » : valeur + 1er token de l'unité (« J - Jours » → « J »).
const dureeVie = (fiche) => {
  if (isEmpty(fiche.duree_vie)) return DASH;
  const unit = (fiche.unite_duree_vie || '').split(' ')[0];
  return `${val(fiche.duree_vie)}${unit ? ' ' + esc(unit) : ''}`;
};

export function buildFichePdfHtml(fiche = {}, de = null) {
  const titre = fiche.libelle_long_40 || fiche.libelle_article || fiche.code_article || 'Fiche de lancement';
  const statut = fiche.statut_sap || fiche.statut_lancement || 'Fiche de lancement produit';
  const racine = fiche.code_racine || fiche.code_article;
  const uvc = fiche.uvc_block || {};
  const pal = fiche.palette_block || {};

  return `<div class="fl-pdf-sheet">
  <style>
  .fl-pdf-sheet *{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
  .fl-pdf-sheet{width:794px;background:#fff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#241a3a;display:flex;flex-direction:column;overflow:hidden;}
  .fl-pdf-sheet .hero{background:linear-gradient(135deg,#2e164f 0%,#45247a 48%,#6a3fa0 100%);padding:14px 24px;display:flex;align-items:center;gap:14px;}
  .fl-pdf-sheet .logo{background:#fff;border-radius:9px;padding:7px;width:60px;flex:0 0 60px;box-shadow:0 5px 14px rgba(0,0,0,.18);}
  .fl-pdf-sheet .logo img{display:block;width:100%;height:auto;border-radius:3px;}
  .fl-pdf-sheet .htxt{flex:1;color:#fff;}
  .fl-pdf-sheet .kicker{margin:0 0 3px;font-size:9.5px;letter-spacing:2.2px;text-transform:uppercase;color:#d7c8f0;font-weight:600;}
  .fl-pdf-sheet h1{margin:0;font-size:18px;font-weight:800;line-height:1.1;}
  .fl-pdf-sheet .hero-right{display:flex;align-items:center;gap:10px;}
  .fl-pdf-sheet .badge-status{background:#fff3e0;color:#e65100;font-size:10px;font-weight:800;padding:5px 12px;border-radius:16px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;}
  .fl-pdf-sheet .racine{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:8px;padding:5px 12px;text-align:center;}
  .fl-pdf-sheet .racine .rl{display:block;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:#e5daf7;}
  .fl-pdf-sheet .racine .rv{display:block;font-size:15px;font-weight:800;line-height:1.05;}
  .fl-pdf-sheet .accent{height:3px;background:linear-gradient(90deg,#6a3fa0,#b388ff 50%,#6a3fa0);}
  .fl-pdf-sheet .body{padding:9px 18px 11px;display:flex;flex-direction:column;gap:6px;}
  .fl-pdf-sheet .strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
  .fl-pdf-sheet .strip .cell{background:#f3eefb;border:1px solid #e1d4f5;border-radius:8px;padding:6px 10px;}
  .fl-pdf-sheet .strip .cell .k{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#8b6fb8;font-weight:700;margin-bottom:1px;}
  .fl-pdf-sheet .strip .cell .v{font-size:12px;font-weight:800;color:#45247a;line-height:1.15;}
  .fl-pdf-sheet .card{border:1px solid #e6e2ee;border-radius:9px;overflow:hidden;}
  .fl-pdf-sheet .card>h2{margin:0;padding:4px 10px;font-size:9px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:#fff;background:linear-gradient(90deg,#45247a,#6a3fa0);}
  .fl-pdf-sheet .card .inner{padding:7px 10px;}
  .fl-pdf-sheet .grid{display:grid;gap:6px 12px;}
  .fl-pdf-sheet .g2{grid-template-columns:1fr 1fr;}.fl-pdf-sheet .g3{grid-template-columns:1fr 1fr 1fr;}.fl-pdf-sheet .g4{grid-template-columns:repeat(4,1fr);}
  .fl-pdf-sheet .f{display:flex;flex-direction:column;gap:1px;min-width:0;}
  .fl-pdf-sheet .f .k{font-size:8px;letter-spacing:.5px;text-transform:uppercase;color:#8b6fb8;font-weight:700;}
  .fl-pdf-sheet .f .v{font-size:11px;font-weight:600;color:#241a3a;word-break:break-word;line-height:1.2;}
  .fl-pdf-sheet .f .v.big{font-size:12.5px;font-weight:800;color:#45247a;}
  .fl-pdf-sheet .f .v.muted{color:#a49db4;font-weight:500;font-style:italic;}
  .fl-pdf-sheet .span2{grid-column:span 2;}
  .fl-pdf-sheet .row2{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
  .fl-pdf-sheet .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;}
  .fl-pdf-sheet .digits{display:inline-flex;gap:2px;flex-wrap:wrap;vertical-align:middle;}
  .fl-pdf-sheet .digits span{width:15px;height:19px;border:1px solid #e1d4f5;border-radius:3px;background:#f7f6fa;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#45247a;font-variant-numeric:tabular-nums;}
  .fl-pdf-sheet .pills{display:flex;flex-wrap:wrap;gap:4px;}
  .fl-pdf-sheet .pill{background:#f3eefb;border:1px solid #e1d4f5;color:#45247a;border-radius:14px;padding:2px 9px;font-size:10px;font-weight:700;}
  .fl-pdf-sheet .defbox{background:#f7f6fa;border-left:3px solid #6a3fa0;border-radius:0 6px 6px 0;padding:6px 10px;font-size:10.5px;color:#555566;line-height:1.4;}
  .fl-pdf-sheet .metrics{display:grid;gap:5px;}
  .fl-pdf-sheet .metric{background:#f3eefb;border:1px solid #e1d4f5;border-radius:7px;padding:5px 6px;text-align:center;}
  .fl-pdf-sheet .metric .mv{font-size:13px;font-weight:800;color:#45247a;line-height:1.05;}
  .fl-pdf-sheet .metric .mu{font-size:7.5px;color:#8b6fb8;font-weight:700;text-transform:uppercase;letter-spacing:.3px;margin-top:2px;}
  .fl-pdf-sheet .visas{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
  .fl-pdf-sheet .visa{border:1px dashed #e1d4f5;border-radius:7px;padding:6px 6px;text-align:center;}
  .fl-pdf-sheet .visa .vk{font-size:8px;letter-spacing:.4px;text-transform:uppercase;color:#8b6fb8;font-weight:700;}
  .fl-pdf-sheet .visa .vn{font-size:11px;font-weight:700;color:#241a3a;margin-top:3px;}
  .fl-pdf-sheet .visa .vs{font-size:8.5px;font-weight:700;color:#e65100;background:#fff3e0;border-radius:10px;padding:1px 7px;display:inline-block;margin-top:3px;}
  .fl-pdf-sheet .visa.done .vs{color:#2e7d32;background:#e8f5e9;}
  .fl-pdf-sheet .visa.ko .vs{color:#c62828;background:#fdecea;}
  .fl-pdf-sheet .foot{padding:7px 18px;text-align:center;border-top:1px solid #e6e2ee;}
  .fl-pdf-sheet .foot p{margin:0;font-size:9px;color:#9a93ab;line-height:1.4;}
  .fl-pdf-sheet .foot .brand{color:#45247a;font-weight:700;margin-top:1px;}
  </style>

  <div class="hero">
    <div class="logo"><img src="${BONCOLAC_LOGO_DATA_URI}" alt="Boncolac"></div>
    <div class="htxt">
      <p class="kicker">Fiche de lancement produit</p>
      <h1>${val(titre)}</h1>
    </div>
    <div class="hero-right">
      <span class="badge-status">● ${val(statut)}</span>
      <div class="racine"><span class="rl">Racine</span><span class="rv">${val(racine)}</span></div>
    </div>
  </div>
  <div class="accent"></div>

  <div class="body">

    <div class="strip">
      <div class="cell"><div class="k">Origine fabrication</div><div class="v">${val(fiche.origine_fabrication)}</div></div>
      <div class="cell"><div class="k">Code logistique</div><div class="v">${val(fiche.code_logistique)}</div></div>
      <div class="cell"><div class="k">Marque</div><div class="v">${val(fiche.marque)}</div></div>
    </div>

    <div class="card">
      <h2>Informations marketing</h2>
      <div class="inner">
        <div class="grid g4" style="margin-bottom:6px;">
          <div class="f"><span class="k">Pays</span><span class="v big">${val(fiche.pays)}</span></div>
          <div class="f"><span class="k">CNUF / CNUD</span><span class="v">${val(fiche.cnuf_cnud)}</span></div>
          <div class="f"><span class="k">Code produit</span><span class="v">${val(fiche.code_produit)}</span></div>
          <div class="f"><span class="k">Coeff</span><span class="v big">${val(fiche.coeff)}</span></div>
        </div>
        <div class="grid" style="grid-template-columns:118px 1fr;gap:4px 12px;align-items:center;">
          <div class="f"><span class="k">EAN 14 carton</span></div>
          <div>${eanDigits(fiche.colis_block?.gtin ?? fiche.ean_carton)}</div>
          <div class="f"><span class="k">EAN 14 couche</span></div>
          <div>${eanDigits(fiche.couche_block?.gtin ?? fiche.ean_couche)}</div>
          <div class="f"><span class="k">EAN 14 palette</span></div>
          <div>${eanDigits(fiche.palette_block?.gtin ?? fiche.ean_palette)}</div>
        </div>
      </div>
    </div>

    <div class="row2">
      <div class="card"><h2>Réseaux</h2><div class="inner"><div class="pills">${pills(fiche.reseaux)}</div></div></div>
      <div class="card"><h2>Stockage</h2><div class="inner"><div class="pills">${pills(fiche.sites_stockage)}</div></div></div>
    </div>

    <div class="row3">
      <div class="card"><h2>Durée de vie</h2><div class="inner"><div class="f"><span class="v big">${dureeVie(fiche)}</span></div></div></div>
      <div class="card"><h2>Contrat-date</h2><div class="inner"><div class="f"><span class="v muted">${val(fiche.contrat_date)}</span></div></div></div>
      <div class="card"><h2>Ancien code article</h2><div class="inner"><div class="f"><span class="v big">${val(fiche.ancien_numero_article)}</span></div></div></div>
    </div>

    <div class="row2">
      <div class="card">
        <h2>Classification</h2>
        <div class="inner">
          <div class="grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:5px;">
            <div class="f"><span class="k">Gde famille</span><span class="v big">${val(fiche.grande_famille)}</span></div>
            <div class="f"><span class="k">Famille</span><span class="v big">${val(fiche.famille)}</span></div>
            <div class="f"><span class="k">Ss famille</span><span class="v big">${val(fiche.sous_famille)}</span></div>
            <div class="f"><span class="k">Groupe</span><span class="v big">${val(fiche.groupe)}</span></div>
            <div class="f"><span class="k">Fam. arrang.</span><span class="v muted">${val(fiche.fam_arrangement)}</span></div>
          </div>
          <div class="f"><span class="k">Libellé</span><span class="v">${val(fiche.libelle_classification)}</span></div>
        </div>
      </div>
      <div class="card">
        <h2>Libellé produit</h2>
        <div class="inner">
          <div class="f" style="margin-bottom:5px;"><span class="k">Général (40)</span><span class="v big">${val(fiche.libelle_long_40)}</span></div>
          <div class="grid g2">
            <div class="f"><span class="k">Code article client</span><span class="v big">${val(fiche.code_article_client)}</span></div>
            <div class="f"><span class="k">Standard (18)</span><span class="v">${val(fiche.libelle_caisse)}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card"><h2>Définition produit</h2><div class="inner"><div class="defbox">${val(fiche.definition_produit)}</div></div></div>

    <div class="card">
      <h2>Groupements &amp; classification SAP</h2>
      <div class="inner">
        <div class="grid g3">
          <div class="f"><span class="k">Secteur d'activité</span><span class="v">${val(fiche.secteur_activite)}</span></div>
          <div class="f"><span class="k">Groupe marchandises</span><span class="v">${val(fiche.groupe_marchandises)}</span></div>
          <div class="f"><span class="k">Agrément</span><span class="v muted">${val(fiche.agrement)}</span></div>
          <div class="f"><span class="k">Groupe stat. article</span><span class="v">${val(fiche.groupe_statistique_article)}</span></div>
          <div class="f"><span class="k">Couv.</span><span class="v muted">${val(fiche.couv)}</span></div>
          <div class="f"><span class="k">Ancien ou art. similaire</span><span class="v muted">${val(fiche.ancien_similaire)}</span></div>
          <div class="f span2"><span class="k">Nomenclature douanière</span><span class="v">${val(fiche.nomenclature_douaniere)}</span></div>
          <div class="f"><span class="k">Centre profit / Qté an</span><span class="v big">${val(fiche.centre_profit)} · ${val(de && de.qte_previsionnelle_annuelle)}</span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Caractéristiques physiques de l'UV</h2>
      <div class="inner">
        <div class="metrics" style="grid-template-columns:repeat(4,1fr);">
          <div class="metric"><div class="mv">${val(uvc.volume)}</div><div class="mu">Volume ml</div></div>
          <div class="metric"><div class="mv">${val(uvc.poids_net)}</div><div class="mu">Poids net kg</div></div>
          <div class="metric"><div class="mv">${val(uvc.poids_brut)}</div><div class="mu">Poids brut kg</div></div>
          <div class="metric"><div class="mv">${dims(uvc)}</div><div class="mu">L × l × H cm</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Informations logistique &nbsp;·&nbsp; ${val(fiche.type_palette)}</h2>
      <div class="inner">
        <div class="metrics" style="grid-template-columns:repeat(6,1fr);">
          <div class="metric"><div class="mv">${val(fiche.nb_ue_uc)}</div><div class="mu">UE / UC</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_uc_ue)}</div><div class="mu">UC / UE</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_uc_palette)}</div><div class="mu">UC / palette</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_cartons_couche)}</div><div class="mu">Cart. / couche</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_couches_palette)}</div><div class="mu">Couches / pal.</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_cartons_palette)}</div><div class="mu">Cart. / palette</div></div>
          <div class="metric"><div class="mv">${val(fiche.hauteur_couche)}</div><div class="mu">Haut. couche cm</div></div>
          <div class="metric"><div class="mv">${val(fiche.hauteur_palette)}</div><div class="mu">Haut. palette cm</div></div>
          <div class="metric"><div class="mv">${val(pal.poids_brut)}</div><div class="mu">Poids brut kg</div></div>
          <div class="metric"><div class="mv">${val(fiche.nb_cartons_cheminee)}</div><div class="mu">Cart. cheminée</div></div>
          <div class="metric"><div class="mv">${dims(fiche.colis_block)}</div><div class="mu">Carton ext. cm</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Validations &nbsp;·&nbsp; Créée le ${formatDateFr(fiche.date_envoi_ficher)} &nbsp;·&nbsp; Dispo le ${formatDateFr(fiche.date_limite_creation_mm01)}</h2>
      <div class="inner">
        <div class="visas">
          ${visaCell('Supply Chain', 'supply_chain', fiche)}
          ${visaCell('Industriel', 'industriel', fiche)}
          ${visaCell('Commerce', 'commerce', fiche)}
        </div>
      </div>
    </div>

  </div>

  <div class="foot">
    <p>Document généré automatiquement depuis l'application Fiches de Lancement.</p>
    <p class="brand">Boncolac · Pâtissier-Traiteur depuis 1955</p>
  </div>
</div>`;
}
