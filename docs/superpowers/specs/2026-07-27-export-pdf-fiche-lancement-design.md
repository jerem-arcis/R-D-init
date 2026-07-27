# Export PDF stylé de la Fiche de Lancement — Design

Date : 2026-07-27
Statut : en attente de validation utilisateur

## 1. Objectif

Ajouter dans l'application un bouton **« Exporter PDF »** qui génère, à partir des
données de la fiche affichée, un PDF **une page A4** reprenant la structure de la
Fiche de Lancement papier (`914201.pdf`) mais dans un **style Boncolac** (violet,
cartes, lisible) — le rendu validé étant `mockup-fl-pdf-1page.html`.

## 2. Décisions validées

| Sujet | Décision |
|---|---|
| Technique | Gabarit HTML hors-écran → `html2canvas` (scale 2) → `jsPDF` A4 → téléchargement direct |
| Mise en page | Réplique embellie de la FL papier, **1 page**, = `mockup-fl-pdf-1page.html` |
| Emplacement du bouton | Header de `FicheDetailV2`, à côté de `ViewSwitch` |
| Nom du fichier | `FL-<code_article>.pdf` dynamique (le code logistique du papier n'existe pas dans l'app) |
| Champs vides | Afficher un tiret neutre `—` (jamais de fausse donnée, génération toujours possible) |
| Blocs sans source de données | **Conservés** dans le PDF, remplis de `—` |
| Couleurs à l'impression | `print-color-adjust: exact` + capture raster html2canvas (fonds toujours présents) |
| Logo | Intégré en **base64** (pas d'URL externe) pour éviter les soucis CORS de `html2canvas` |
| Bloc Validations | Exception au « tout à l'identique » : affiche les **4 visas réels de l'app** (SC/GB/IND/COM) avec statut + date, au lieu des 4 « Directions » du papier (inexistantes) |

## 3. Architecture

Trois éléments, responsabilités isolées :

### 3.1 `src/lib/fichePdfTemplate.js` — le gabarit
- Fonction pure `buildFichePdfHtml(fiche, de) -> string` (HTML).
- Contient le CSS + la structure du `mockup-fl-pdf-1page.html`.
- Utilise un helper `val(x)` qui renvoie `x` si non vide, sinon `'—'`.
- Le logo est importé depuis `src/assets/boncolac-logo-base64.js` (constante data-URI).
- Aucune dépendance React : testable en isolation (entrée = objets, sortie = string).

### 3.2 `src/lib/generateFichePdf.js` — le moteur
- `generateFichePdf(fiche, de)` :
  1. crée un conteneur `div` hors-écran (`position:fixed; left:-10000px; width:794px`),
  2. y injecte `buildFichePdfHtml(fiche, de)`,
  3. `await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })`,
  4. crée un `jsPDF('p','mm','a4')`, place l'image à la largeur page (210 mm), hauteur proportionnelle,
  5. `doc.save('FL-' + (fiche.code_article || 'fiche') + '.pdf')`,
  6. retire le conteneur (finally).
- Import dynamique de `jspdf`/`html2canvas` (`await import(...)`) pour ne pas alourdir le bundle initial.
- Renvoie/relaie les erreurs pour permettre un toast d'échec.

### 3.3 Bouton dans `src/pages/FicheDetailV2.jsx`
- Bouton `Exporter PDF` (icône `FileDown` de lucide) dans le header, à côté de `ViewSwitch`.
- État local `isExporting` → spinner + désactivation pendant la génération.
- `onClick` → `try { await generateFichePdf(localFiche, de) } catch { toast erreur }`.
- Toujours actif (pas de blocage si champs incomplets).

## 4. Mapping des données (bloc PDF → champ app)

`val()` = valeur ou `—`. `de` = DemandeEtude liée (déjà chargée dans `FicheDetailV2`).

| Bloc PDF | Contenu | Source app |
|---|---|---|
| Hero — titre | Libellé produit | `fiche.libelle_long_40` ‖ `fiche.libelle_article` |
| Hero — statut | Badge statut | `fiche.statut_lancement` (ou `statut_sap` si créé) |
| Hero — code racine | 9142 | ❌ `—` |
| Strip — origine | 2859·TerreDesLys | `fiche.origine_fabrication` |
| Strip — code logistique | 914201 | ❌ `—` |
| Strip — marque | PICARD | `fiche.marque` |
| Strip — durée de vie | 548 j | `fiche.duree_vie` + `fiche.unite_duree_vie` |
| Marketing — Pays/CNUF/Code produit/Coeff/clés | | ❌ `—` |
| Marketing — EAN carton/couche/palette | boîtes chiffres | `fiche.ean_carton[0]` / `ean_couche[0]` / `ean_palette[0]` (tableaux) |
| Réseaux | pastilles | ❌ `—` (pastille « Non renseigné ») |
| Stockage | pastilles | `fiche.sites_stockage[]` |
| Ancien code article | | `fiche.ancien_numero_article` |
| Classification — familles + libellé | | ❌ familles `—` ; `fiche.hierarchie_produit` si présent |
| Libellé produit — Général(40) | | `fiche.libelle_long_40` |
| Libellé produit — Standard(18) / Code client | | `—` / `fiche.libelle_client` |
| Définition produit | | ❌ `—` (ou `de.designation` si tu confirmes) |
| Groupements SAP — Secteur/Groupe march./Groupe stat./Nomenclature | | `secteur_activite`/`groupe_marchandises`/`groupe_statistique_article`/`nomenclature_douaniere` |
| Groupements SAP — Centre profit / Qté an | | `fiche.centre_profit` / `de.qte_previsionnelle_annuelle` |
| Physique UV — volume/poids net/poids brut/L·l·H | | `fiche.uvc_block` {volume, poids_net, poids_brut, long, larg, haut} |
| Logistique — type palette | | `fiche.type_palette` |
| Logistique — Nb UC/UE, UC/palette, cartons/couche, couches/palette, cartons/palette, hauteurs, cheminée | | ❌ `—` (pas de source ; entité `DeclinaisonLogistique` non peuplée) |
| Logistique — dimensions carton ext. | | `fiche.colis_block` {long, larg, haut} |
| Dates — création / mise à dispo | | `fiche.date_envoi_ficher` / `fiche.date_limite_creation_mm01` |
| Validations | 4 visas réels | `visa_supply_chain` / `visa_gestion_besoin` / `visa_industriel` / `visa_commerce` (+ `_date`, `refus_*`) |

Notes :
- Les blocs de dimensions/poids attendent les unités du modèle app (`uvc_block.poids_net`
  est en **g** dans `seedFL`, `long/larg/haut` en **mm**). Le gabarit affichera les
  unités réelles de l'app (mm, g) — à ajuster si tu veux des cm/kg comme le papier.
- EAN stockés en **tableaux** → on prend le 1er élément.

## 5. Gestion des cas limites

- Fiche sans DE liée → Qté/an = `—` (pas d'erreur).
- Champ tableau vide (`ean_couche = []`) → `—` + clé `!` (comme `#VALEUR!` du papier).
- `code_article` absent → nom de fichier `FL-fiche.pdf`.
- Échec html2canvas → toast « Échec de la génération du PDF » ; conteneur nettoyé.

## 6. Hors périmètre (YAGNI)

- Pas d'aperçu avant téléchargement.
- Pas de choix multi-format (une seule version, 1 page).
- Pas de sauvegarde serveur du PDF (téléchargement navigateur uniquement).
- Pas d'alimentation des entités `DeclinaisonLogistique`/`CodeEAN` (données absentes = `—`).

## 7. Tests

- `fichePdfTemplate.test.js` : `buildFichePdfHtml` avec (a) fiche complète (seed-fl-5),
  (b) fiche quasi vide → vérifier présence des `—`, échappement HTML, 1er EAN pris,
  Qté/an depuis DE, mapping des 4 visas.
- Génération html2canvas non testée unitairement (dépend du DOM navigateur) — vérif manuelle.
