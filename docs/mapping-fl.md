# Réconciliation des champs FL → SAP

> Généré le 2026-07-17 · sources : `Champs FL (1).xlsx` (champs métier) et `Mapping_champs_SAP (3).xlsx` / onglet **Mapping FL** (payload SAP).
> Sert de checklist de build pour l'envoi SAP de la Fiche de Lancement.

## Principe

La **vue FL** ne doit contenir que les **saisies humaines réelles**. Tout le reste (constantes, règles, calculs) appartient à une **couche de génération** qui construit le payload SAP à l'envoi — exactement le pattern déjà en place pour la DE (`triggerSapSend`, `computeHierarchieDE`, `computeClasseValoDE`…).

## Synthèse (151 champs)

| Nature | Nombre | Destination |
|---|---:|---|
| 🟩 Saisie — champ métier **existant** | 28 | reste dans la vue (déjà là) |
| 🟦 Saisie — **à ajouter / arbitrer** | 23 | vue FL, à décider |
| ⬜ Constante (« toujours X ») | 29 | génération : en dur |
| 🟨 Règle (« Si… → ») | 34 | génération : fonction `computeX()` |
| 🟪 Calcul (concat / AUSP) | 21 | génération : dérivé |
| 🟥 Workflow (visas / dates) | 16 | hors SAP, déjà géré par l'app |

**~84 champs = code de génération** (aucune saisie). **~51 = saisie** (dont ~23 à arbitrer). **16 = hors périmètre SAP.**

---

## 1. Vue FL — saisies à ajouter / arbitrer (23)

Champs classés « saisie » **sans** rattachement à un champ métier existant. À décider : vrai champ de saisie, ou constante/règle déguisée ?

| Section SAP | Champ | Champ SAP | Type | Exemple |
|---|---|---|---|---|
| En-tête fiche | Branche | MARA-MBRSH | Liste déroulante | Agro Alimentaire |
| ADV:Org.Commerc.2 | OC2-Article prix | MVKE-PMATN | Saisi (libre) | Pour OC28 |
| 001 CLASSE ARTICLE | MBSA TYPE DE SUPPORT | Classif. (custom) | Liste déroulante | SME80 |
| Consigne emballage fictif (POP) | Prof contrôle / génération code | Profil contrôle POP | Saisi (libre) | Z1 |
| Consigne emballage fictif (POP) | Poste P — composant | Consigne (poste) | Saisi (libre) | SMFictif80 (qté 1 / PI) |
| Consigne emballage fictif (POP) | Poste M — article | Consigne (poste) | Saisi (libre) | 419805 — qté 47.99 / 0.01 / CAR |
| MRP1 | Type planification | MARC-DISMM | Saisi (libre) | Z5 |
| MRP1 | Horizon planif fixe | MARC-FXHOR | Saisi (libre) | 1 |
| MRP1 | Méthode lotissement | MARC-DISLS | Saisi (libre) | ZN |
| MRP2 | Type appro | MARC-BESKZ | Saisi (libre) | F |
| MRP2 | Appro spécial | MARC-SOBSL | Saisi (libre) | 43-AGEN |
| MRP2 | Magasin production | MARC-LGPRO | Saisi (libre) | 95 (barré) |
| MRP2 | Sites de stockage (défaut) | ?? à revoir surement la division | Liste déroulante | 2820 / 2824 |
| MRP2 | Mag pour appro.ext | MARC-LGFSB | Saisi (libre) | 95 |
| MRP2 | Délai prévisionnel de livraison | MARC-PLIFZ | Saisi (libre) | 0 |
| MRP2 | Temps de réception | MARC-WEBAZ | Saisi (libre) | 0 |
| MRP2 | Profil de couverture | MARC-RWPRO | Saisi (libre) |  |
| MRP2 | Délai de sécurité | MARC-SHZET | Saisi (libre) | 2 |
| MRP2 | Dél.séc./couv.réelle | MARC-SHFLG ? ? | Saisi (libre) | 21 |
| CCR1 | Groupe de frais gén. | MARC (overhead) | Saisi (libre) | FG (barré) |
| MMSC | Domaine MMSC — Agen2 / BA | MARD-LGORT | Saisi (libre) | 2847-Agen2 / BA |
| MMSC | Domaine MMSC — Agen2 / NC | MARD-LGORT | Saisi (libre) | 2847-Agen2 / NC |
| MMSC | Domaine MMSC — Agen2 / EMB | MARD-LGORT | Saisi (libre) | 2847-Agen2 / EMB |

## 2. Vue FL — saisies déjà rattachées à un champ métier (28)

Déjà couvertes (ou à rattacher) par un champ du fichier « Champs FL ».

| Champ | Champ SAP | Champ métier (onglet source) | Type |
|---|---|---|---|
| Code article + VL | MARA-MATNR | Tous les onglets | Saisi (libre) |
| Type article | MARA-MTART | Commerce/Fabrication ou négoce | Liste déroulante |
| Division WM | MBEW-WERKS | Commerce/Origine fabrication | Liste déroulante |
| Division MM | MBEW-WERKS | Supply Chain/Sites de stockage | Liste déroulante |
| Canal distrib (multi-valeurs) | MVKE-VTWEG | Commerce/Canaux de distribution | Liste déroulante |
| Libellé article normalisé | Z* (custom) | Commerce/Libellé Client | Saisi (libre) |
| Libellé article langue1- | MAKT-MAKTX (langue) | Commerce/Code pays | Liste déroulante |
| Libellé article langue2- | MAKT-MAKTX (langue) | Commerce/Code pays | Liste déroulante |
| Grpe marchand | MARA-MATKL | Industriel/Eclatement groupe de marchandises | Liste déroulante |
| Ancien n°article | MARA-BISMT | Commerce/BIV | Saisi (libre) |
| Secteur d'activité | MARA-SPART | Commerce/Secteur d'activité | Liste déroulante |
| Hiér produits Fam | MARA-PRDHA | Commerce/Hiérarchie produit famille | Liste déroulante |
| OC1-secteur d'activité | MARA-SPART | Commerce/Secteur d'activité | Liste déroulante |
| OC1-Groupe marchandise | MVKE-MVGR1 (5 déclinaison) | Industriel/Eclatement groupe de marchandises | Liste déroulante |
| OC2-Groupe statistique article | MVKE-VERSG | SupplyChain/Groupe statistique article | Liste déroulante |
| OC2-Groupe d'article | MVKE-KONDM | SupplyChain/Groupe d'article | Liste déroulante |
| OC2-Groupe de ristournes | MVKE-KONDM | SupplyChain/Groupe de ristournes | Saisi (libre) |
| OC2-Groupe imputation article | MVKE-KTGRM | SupplyChain/Groupe imputation article | Liste déroulante |
| Gestion par lots | MARA-XCHPF | ? | Saisi (libre) |
| Centre de profit | MARC-PRCTR | Contrôle de gestion/Centre de profit | Liste déroulante |
| Nomncl/N°TarifDouan | MARC-STAWN surement mais à appronfondir ? | Commerce/Nomenclature tarif douanière | Liste déroulante |
| Délai de sécurité | MARC-SHZET | Gestion du besoin/Délai de sécurité division usine | Saisi (libre) |
| Dél.séc./couv.réelle | Quel champ ??? | Gestion du besoin/Délai sec/couv réeelle usine | Saisi (libre) |
| Durée minimale rest | MARA-MHDRZ | SupplyChain DLC/DLUO Critique | Saisi (libre) |
| FORMAT DATE ETIQ COLIS (MBSA ATELIER) | Caract. AUSP | Industriel/Format date Etiq Colis | Saisi (libre) |
| MASQUE ETIQUETTE COLIS (MBSA LIGNE) | Caract. AUSP | Industriel/Masque étiquette colis | Saisi (libre) |
| DESIGNATION CLIENT SUR COLIS (MBSA FORMAT PRODUIT) | Caract. AUSP | Industriel/Designation client s/colis | Saisi (libre) |
| FORMAT DLUO ETIQ COLIS (MBSA SERIE PRODUIT) | Caract. AUSP | Industriel/Format DLUO Etiq colis | Saisi (libre) |

## 3. Couche de génération — Règles (34)

À coder en fonctions `computeX()` (dépendent d'autres champs : type article car. 17-20, origine, hiérarchie, groupe marchandise, marque…).

| Section | Champ | Champ SAP | Règle |
|---|---|---|---|
| En-tête fiche | Définition | Notice interne | La date de mise à disposition au format jj/mm/aa, suivie de ":", puis : la définition produit 1 (ou vide si non renseignée) concaténée avec la définition produit 2 (ou vide si non renseignée) |
| En-tête fiche | Magasin | MARD-LGORT | Si le groupe de marchandise commence par "PF-H" ET que la facturation est "TDL" : Si la marque commence par "PIC", "THR" ou "DAV" → valeur = "95F" Sinon, si la marque commence par "CDP" → valeur = "95G" Sinon → valeur = "95" Dans tous les autres cas → valeur = "95" |
| En-tête fiche | Org commerciale | MVKE-VKORG | Si l'origine de fabrication commence par "2834" ou "2866" → valeur = "OC37" Sinon → valeur = "OC28" |
| En-tête fiche | Numéro magasin | LGORT (MARD) | Si l'origine de fabrication (caractères 1 à 4) est : "2802" → "802" "2833" → "833" "2847" → "847" "2886" → "886" Sinon → vide |
| DONNÉES DE BASE | Libellé Long FR | MAKT-MAKTX | Si libellé long volet 1 est vide → retourne une chaîne de 20 espaces Sinon → retourne libellé long volet 1 complété par des espaces jusqu'à 20 caractères, suivi de libellé long volet 2 |
| DONNÉES DE BASE | Groupe autorisations | MARA-BEGRU | Si les caractères 17 à 20 du type article sont "SFIN" → vide Sinon → Les caractères 17 à 20 du type article. |
| DONNÉES DE BASE | Document | ZEINR | Si l'origine (caractères 1 à 4) est : "2802" → "1106901" "2886" → "64134100" "2847" → "4709104" Sinon → vide |
| ADV:Org.Comm.1 | OC1-Unité Livraison | table (nombre entier) MVKE-SCMNG et MVKE-SCHME | Si la durée de conservation totale < 90 OU la durée de vie = "J", ET que le groupe article = "AJ-MB CARREFOUR" → "CAR" Sinon, si le secteur d'activité commence par "10" ou "12", ET qu'au moins un des canaux de distribution (cd1 à cd7) commence par "10" → "CAR" Sinon, si le secteur d'activité commence par "10", ET que tous les canaux de distribution (cd1 à cd7) sont égaux à "70-RHF" → "ZCO" Sinon, si le secteur d'activité commence par "15", ET que (OneShot ≤ 1 OU OneShot = 3), ET qu'au moins un des canaux de distribution (cd1 à cd7) est égal à "30-EXPORT" → "PAL" Sinon → "CAR" |
| ADV:données gén./div | contrôle disponibilité | MARC-MTVFP | Si les caractères 17 à 20 du type article sont "SFIN" → "Z2" Sinon → "Z3" |
| ADV:données gén./div | Grp charg | MARC-LADGR | Si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" : Si la marque commence par "PIC", "THR" ou "DAV" → "2860" Sinon, si la marque commence par "CDP" → "2861" Sinon → "2859" Dans tous les autres cas → "0002" |
| Achats | Groupe d'acheteur | MARC-EKGRP | Si le type article est "3A-Produit Fini:NEGOCE" → "NEG-Groupe acheteurs Négoce" Sinon → "INT-Groupe acheteurs Interne" |
| MRP1 | Groupe de planif | MARC-DISGR | Si les caractères 6 et 7 de la hiérarchie produit sont différents de "70" → "Z001" Sinon → "Z002" |
| MRP1 | Type planification | MARC-DISMM | Si les caractères 17 à 20 du type article sont "SFIN" → "PD" Sinon → "Z5" |
| MRP1 | Horizon planif fixe | MARC-FXHOR | Si les 6 derniers caractères du type article sont différents de "NEGOCE" → 5 Sinon → 1 |
| MRP1 | Gestionnaire | MARC-DISPO | Si l'origine (caractères 1 à 4) est : "2802" → "102" "2833" → "133" "2847" → "147" "2886" → "186" Sinon, si les caractères 17 à 20 du type article sont "SFIN" → "011" Sinon → "120" |
| MRP1 | Clé calc taille lot | MARC-DISLS | Si les caractères 17 à 20 du type article sont "SFIN" → "EX" Sinon → les 2 premiers caractères de la clé de taille de lot division usine |
| MRP2 | Type approvisionnemnt | MARC-BESKZ | Si les 6 derniers caractères du type article sont "NEGOCE" → "F" Sinon → "E" |
| MRP2 | Magasin production | MARC-LGPRO | Si les caractères 17 à 20 du type article sont "SFIN" → "Mag.usine" Sinon → 95 |
| MRP2 | Temps de réception | MARC-WEBAZ | Si l'une de ces conditions est vraie : la quarantaine est vide les 6 premiers caractères du type article sont "NEGOCE" les caractères 17 à 20 du type article sont "SFIN" → vide Sinon → valeur de la cellule Temps de réception division usine |
| MRP2 | Calendrier Planif. | MARC-MRPPP | Si la clé de calcul de taille de lot est ZK alors 001 sinon vide |
| MRP4 | Fabrication répétitive | MARC-SAUFT | Si le groupe de marchandises est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → true |
| MRP4 | Profil fabric répét | MARC-SFEPR | Si le groupe de marchandises est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → valeur de le type d'usine |
| MRP4 | Unité de sortie | MARC-AUSME | Si le groupe de marchandises est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → CAR |
| MRP4 | Unité de production | MARC-FRTME | Si le groupe de marchandises est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → PAL |
| Donn.div./stockage 1 | Dur conserv totale | MARA-MHDHB | Si les caractères 17 à 20 du type article sont "SFIN" → valeur de la cellule AL22 de l'onglet "Industriel" Sinon → la durée de conservation totale |
| Donn.div./stockage 1 | Indic période DLC | MARA-IPRKZ | Si les caractères 17 à 20 du type article sont "SFIN" → valeur de la cellule AL22 de l'onglet "Industriel" Sinon → la durée de vie |
| Donn.div./stockage 2 | Unité de quantité WM | MLGN-LVSME | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → CAR |
| Donn.div./stockage 2 | UQ défaut fiche art | MLGN-VOMEM | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → M |
| Donn.div./stockage 2 | Entrée add autorisée | MLGN-KZZUL | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → true |
| Gestion empl.mag.2 | Qté moy.chg | LHMG1 MLGN à revoir enseù | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → Nbr d'UC/Palette |
| Gestion empl.mag.2 | UQ (unité) | MLGN à revoir LHME1 | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → CAR |
| Gestion empl.mag.2 | TUS (type unité stockage) | MLGN à revoir LETY1 | Si le 4ème caractère du type palette est "8" → "Z81 :palette 80x120" Sinon → "Z82 :palette 100x120" |
| Comptabilité 1 | Classe valorisation | MBEW-BKLAS | Si le type article se termine par "NEGOCE" ET la hiérarchie produit commence par "27" → "2038 négoce traiteur" Si le type article se termine par "NEGOCE" ET la hiérarchie produit commence par "21" → "2027 Crèmes Glacées" Si le type article se termine par "NEGOCE" ET la hiérarchie produit commence par "22" → "2030 négoce pâtisserie" Si les caractères 17 à 20 du type article sont "SFIN" → "4022 pr.semi-finis" Sinon → "7012 produits finis" |
| CCR 1 | Groupe de frais généraux | MBEW-KOSGR | Si les 6 derniers caractères du type article sont "NEGOCE" → "NEGO" Sinon → "FG" |

## 4. Couche de génération — Constantes (29)

Valeurs fixes à câbler en dur dans le mapping.

| Section | Champ | Champ SAP | Valeur |
|---|---|---|---|
| DONNÉES DE BASE | Unité de qté base | MARA-MEINH | U |
| DONNÉES DE BASE | Profil code MD | MARA-PROFL | (voir règle) |
| ADV:Org.Comm.1 | Unité de qté base | MARA-MEINS | U |
| ADV:Org.Commerc.1 | OC1-unité de vente | MVKE-VRKME | CAR |
| ADV:Org.Comm.1 | Données de taxe | MLAN-ALAND Pays / Code taxe TAXM1 | DE / C / Taxe réd 7% |
| ADV:données gén./div | GrpeTransp | MARA-TRAGR | Z001 |
| Comm.extér.:export. | Régime douanier | ??? | 0001 |
| Origine/Organis.Marché UE/Préférence | Pays d'origine | MARC-HERKL | FR |
| Origine/Organis.Marché UE/Préférence | Régiond'origine | MARC-HERKR (région) | 31 |
| Achats | Unité d'achat | MARA-BSTME | CAR |
| Achats | UA var 1 | MARA-VABME | 1 |
| MRP1 | Valeur arrondi | MARC-BSTRF | 1 |
| MRP2 | Magasin pour appro.ext. | MARC-LGFSB | 95 |
| MRP2 | Délai prév livrais | MARC-PLIFZ | (voir règle) |
| MRP2 | clé d'horizon | MARC-FHORI | 000 |
| MRP3 | Indicateur période | MARC-PERKZ | W |
| MRP4 | Individuel/Collectif | MARC-SBDKZ | 2 |
| Donn.div./stockage | Consigne d'emballage | MARA-BEHVO | 01 |
| Donn.div./stockage | Condition de stockage | MARA-RAUBE | SU |
| Comptabilité 1 | uniité de prix | MBEW-PEINH | 1000 |
| Comptabilité 1 | Code prix | MBEW-VPRSV | S |
| Comptabilité 1 | Prix standard | MBEW-STPRS | 1 |
| CCR 1 | Avec struct de qtés | MBEW-EKALR | (voir règle) |
| CCR 1 | Origine article | MBEW-HKMAT | (voir règle) |
| CLASSIFICATION 001 | MBSA TYPE DE SUPPORT | Caract. AUSP | SME80 (Palette 80x120 Eu) |
| Consigne emballage std (POP) | Prof contrôle / génération code | Profil contrôle POP | Z1 |
| Consigne emballage std (POP) | Poste P — composant | Consigne (poste) | Type P / SME80 : Palette 80x120 Europe (qté 1) |
| Consigne emballage std (POP) | Poste M — article | Consigne (poste) | Type M / 419805 — qté 48 / 0.01 / CAR |
| POF 1 | Type de recherche | Détermination POF | CE |

## 5. Couche de génération — Calculs (21)

Dérivés (concaténations, caractéristiques de classification AUSP).

| Section | Champ | Champ SAP | Note |
|---|---|---|---|
| DONNÉES DE BASE | Libellé article langue3-Z1-Libellé colis | MAKT + texte colis | EXPORT PLAQUES 'TOUTES EN COULEURS' |
| DONNÉES DE BASE | Désign normalisée | Z* (custom) | PLAQ COULEUR 4X5 |
| Donn.div./stockage | Type magasin EM | MLGN-LTKZE | Si le groupe de marchandises de l'onglet Saisie est vide → vide Sinon, si le groupe de marchandises commence par "PF-H" ET que la facturation est "TDL" → vide Sinon → (Si l'origine est "2847-Agen2" ET la hauteur palette ≤ 1500 → "002" Si l'origine est "2847-Agen2" ET la hauteur palette > 1500 → "003" Sinon → "001") |
| CLASSIFICATION 023 | 023-LOBM-2USTD (statut utilisation lot) | Caract. AUSP |  |
| CLASSIFICATION 023 | 023-LOBM-VFDAT (DLC lot) | Caract. AUSP |  |
| CLASSIFICATION 023 | 023-LOBM-RLZ (durée vie résiduelle) | Caract. AUSP |  |
| CLASSIFICATION 001 | NBRE DE JOURS DE STOCKAGE | Caract. AUSP | Toujours 2 ? |
| CLASSIFICATION 001 | DIVISION PRINCIPALE STOCKAGE | Caract. AUSP | Toujours vrai ? |
| CLASSIFICATION 001 | POURCENTAGE DE COLIS | Caract. AUSP | Toujours vrai ? |
| CLASSIFICATION 001 | MARQUE INDUSTRIELLE MBSA | Caract. AUSP | Toujours vrai ? |
| CLASSIFICATION 001 | CLASSE ABCD BSA | Caract. AUSP | Toujours 0 ? |
| CLASSIFICATION 001 | MBSA MARQUE LOGISTIQUE | Caract. AUSP | 4 premiers chiffres |
| CLASSIFICATION 001 | MBSA MASQUE STANDARD Niv. Art. | Caract. AUSP |  |
| CLASSIFICATION 001 | MBSA MASQUE SPECIFIQUE Niv.Art | Caract. AUSP | Si le produit bio = 1 ET la marque ne commence pas par "U00" → "STANDARDDLUO-BIO.LAB" Si le produit bio = 1 ET la marque commence par "U00" → "STANDARDDLUO-U-BIO.LAB" Sinon → vide Mais produit bio est toujours à 2 |
| Consigne emballage std (POP) | Consigne emballage | Consigne embal. (HU) | Si les caractères 17 à 20 du type article sont "SFIN" → "P" suivi de la valeur de la cellule AP20 de l'onglet "Industriel" (qui est vide) Sinon → "P" suivi des valeurs de code article et VL |
| Consigne emballage std (POP) | Désignation | Consigne embal. | Les caractères 1 à 4 du code article, concaténés avec la valeur de la FL puis "Fictif" puis type de palette |
| Consigne emballage fictif (POP) | Consigne emballage | Consigne embal. fictive | F419805 |
| Consigne emballage fictif (POP) | Désignation | Consigne embal. | 419805 Fictif |
| POF 1 | Article | MATNR | Code article + VL |
| POF 1 | Consigne d'emballage | Consigne embal. | Si les caractères 17 à 20 du type article sont "SFIN" → "P" suivi de la valeur de la cellule AP20 de l'onglet "Industriel" (qui est vide) Sinon → "P" suivi des valeurs de code article et VL |
| POF 1 | Consigne emb.alt 1 | Consigne embal. fictive | Si les caractères 17 à 20 du type article sont "SFIN" → "F" suivi de la valeur de la cellule AP20 de l'onglet "Industriel" (qui est vide) Sinon → "F" suivi des valeurs de code article et VL |

## 6. Hors périmètre SAP — Workflow (16)

Visas, émetteurs et dates : déjà gérés par le workflow de visa de l'app (`OWNER_META`, `visa_*`). **À exclure** du payload SAP.

| Champ | Exemple |
|---|---|
| Emetteur Fiche de Lancement | TIERSOONE Romain (371301) |
| Date fiche de lancement | 27/08/2019 |
| Date de mise à disposition | 29/08/2019 |
| Emetteur commerce | L50104 |
| Emetteur industriel | L55026 |
| Emetteur Gestion du besoin | L59815 |
| Emetteur Supply Chain | L59815 |
| Emetteur Contrôle de Gestion | L59815 |
| Date Visa commerce | 19/11/2025 |
| Date Visa industriel | 18/11/2025 |
| Date Visa Gestion du besoin | 29/10/2025 |
| Date Visa Supply Chain | 29/10/2025 |
| Date Visa Contrôle de Gestion | 29/10/2025 |
| Date Maxi Création SAP | 14/08/2019 |
| DeadLine complète | 19/08/2019 |
| Date Retour fiche de lancement | 13/08/2019 |

---

## Annexe — les 151 champs par vue SAP

### En-tête fiche (9)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Code article + VL | MARA-MATNR | Saisie | Vue FL — champ métier existant |
| Branche | MARA-MBRSH | Saisie | Vue FL — à ajouter / arbitrer |
| Définition | Notice interne | Règle | Couche de génération (payload SAP) |
| Type article | MARA-MTART | Saisie | Vue FL — champ métier existant |
| Division WM | MBEW-WERKS | Saisie | Vue FL — champ métier existant |
| Division MM | MBEW-WERKS | Saisie | Vue FL — champ métier existant |
| Magasin | MARD-LGORT | Règle | Couche de génération (payload SAP) |
| Org commerciale | MVKE-VKORG | Règle | Couche de génération (payload SAP) |
| Numéro magasin | LGORT (MARD) | Règle | Couche de génération (payload SAP) |

### ADV (en-tête) (1)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Canal distrib (multi-valeurs) | MVKE-VTWEG | Saisie | Vue FL — champ métier existant |

### DONNÉES DE BASE (14)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Libellé Long FR | MAKT-MAKTX | Règle | Couche de génération (payload SAP) |
| Libellé article normalisé | Z* (custom) | Saisie | Vue FL — champ métier existant |
| Libellé article langue1- | MAKT-MAKTX (langue) | Saisie | Vue FL — champ métier existant |
| Libellé article langue2- | MAKT-MAKTX (langue) | Saisie | Vue FL — champ métier existant |
| Libellé article langue3-Z1-Libellé colis | MAKT + texte colis | Calcul | Couche de génération (payload SAP) |
| Unité de qté base | MARA-MEINH | Constante | Couche de génération (payload SAP) |
| Grpe marchand | MARA-MATKL | Saisie | Vue FL — champ métier existant |
| Ancien n°article | MARA-BISMT | Saisie | Vue FL — champ métier existant |
| Secteur d'activité | MARA-SPART | Saisie | Vue FL — champ métier existant |
| Hiér produits Fam | MARA-PRDHA | Saisie | Vue FL — champ métier existant |
| Groupe autorisations | MARA-BEGRU | Règle | Couche de génération (payload SAP) |
| Désign normalisée | Z* (custom) | Calcul | Couche de génération (payload SAP) |
| Document | ZEINR | Règle | Couche de génération (payload SAP) |
| Profil code MD | MARA-PROFL | Constante | Couche de génération (payload SAP) |

### ADV:Org.Comm.1 (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Unité de qté base | MARA-MEINS | Constante | Couche de génération (payload SAP) |
| OC1-secteur d'activité | MARA-SPART | Saisie | Vue FL — champ métier existant |
| OC1-Unité Livraison | table (nombre entier) MVKE-SCMNG et MVKE-SCHME | Règle | Couche de génération (payload SAP) |
| OC1-Groupe marchandise | MVKE-MVGR1 (5 déclinaison) | Saisie | Vue FL — champ métier existant |
| Données de taxe | MLAN-ALAND Pays / Code taxe TAXM1 | Constante | Couche de génération (payload SAP) |

### ADV:Org.Commerc.1 (1)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| OC1-unité de vente | MVKE-VRKME | Constante | Couche de génération (payload SAP) |

### ADV:Org.Commerc.2 (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| OC2-Groupe statistique article | MVKE-VERSG | Saisie | Vue FL — champ métier existant |
| OC2-Groupe d'article | MVKE-KONDM | Saisie | Vue FL — champ métier existant |
| OC2-Groupe de ristournes | MVKE-KONDM | Saisie | Vue FL — champ métier existant |
| OC2-Groupe imputation article | MVKE-KTGRM | Saisie | Vue FL — champ métier existant |
| OC2-Article prix | MVKE-PMATN | Saisie | Vue FL — à ajouter / arbitrer |

### ADV:données gén./div (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| contrôle disponibilité | MARC-MTVFP | Règle | Couche de génération (payload SAP) |
| Gestion par lots | MARA-XCHPF | Saisie | Vue FL — champ métier existant |
| GrpeTransp | MARA-TRAGR | Constante | Couche de génération (payload SAP) |
| Grp charg | MARC-LADGR | Règle | Couche de génération (payload SAP) |
| Centre de profit | MARC-PRCTR | Saisie | Vue FL — champ métier existant |

### Comm.extér.:export. (2)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Nomncl/N°TarifDouan | MARC-STAWN surement mais à appronfondir ? | Saisie | Vue FL — champ métier existant |
| Régime douanier | ??? | Constante | Couche de génération (payload SAP) |

### Origine/Organis.Marché UE/Préférence (2)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Pays d'origine | MARC-HERKL | Constante | Couche de génération (payload SAP) |
| Régiond'origine | MARC-HERKR (région) | Constante | Couche de génération (payload SAP) |

### Achats (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Unité d'achat | MARA-BSTME | Constante | Couche de génération (payload SAP) |
| UA var 1 | MARA-VABME | Constante | Couche de génération (payload SAP) |
| Groupe d'acheteur | MARC-EKGRP | Règle | Couche de génération (payload SAP) |

### MRP1 (9)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Groupe de planif | MARC-DISGR | Règle | Couche de génération (payload SAP) |
| Type planification | MARC-DISMM | Règle | Couche de génération (payload SAP) |
| Horizon planif fixe | MARC-FXHOR | Règle | Couche de génération (payload SAP) |
| Gestionnaire | MARC-DISPO | Règle | Couche de génération (payload SAP) |
| Clé calc taille lot | MARC-DISLS | Règle | Couche de génération (payload SAP) |
| Valeur arrondi | MARC-BSTRF | Constante | Couche de génération (payload SAP) |
| Type planification | MARC-DISMM | Saisie | Vue FL — à ajouter / arbitrer |
| Horizon planif fixe | MARC-FXHOR | Saisie | Vue FL — à ajouter / arbitrer |
| Méthode lotissement | MARC-DISLS | Saisie | Vue FL — à ajouter / arbitrer |

### MRP2 (19)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Type approvisionnemnt | MARC-BESKZ | Règle | Couche de génération (payload SAP) |
| Magasin production | MARC-LGPRO | Règle | Couche de génération (payload SAP) |
| Magasin pour appro.ext. | MARC-LGFSB | Constante | Couche de génération (payload SAP) |
| Temps de réception | MARC-WEBAZ | Règle | Couche de génération (payload SAP) |
| Délai prév livrais | MARC-PLIFZ | Constante | Couche de génération (payload SAP) |
| clé d'horizon | MARC-FHORI | Constante | Couche de génération (payload SAP) |
| Calendrier Planif. | MARC-MRPPP | Règle | Couche de génération (payload SAP) |
| Délai de sécurité | MARC-SHZET | Saisie | Vue FL — champ métier existant |
| Dél.séc./couv.réelle | Quel champ ??? | Saisie | Vue FL — champ métier existant |
| Type appro | MARC-BESKZ | Saisie | Vue FL — à ajouter / arbitrer |
| Appro spécial | MARC-SOBSL | Saisie | Vue FL — à ajouter / arbitrer |
| Magasin production | MARC-LGPRO | Saisie | Vue FL — à ajouter / arbitrer |
| Sites de stockage (défaut) | ?? à revoir surement la division | Saisie | Vue FL — à ajouter / arbitrer |
| Mag pour appro.ext | MARC-LGFSB | Saisie | Vue FL — à ajouter / arbitrer |
| Délai prévisionnel de livraison | MARC-PLIFZ | Saisie | Vue FL — à ajouter / arbitrer |
| Temps de réception | MARC-WEBAZ | Saisie | Vue FL — à ajouter / arbitrer |
| Profil de couverture | MARC-RWPRO | Saisie | Vue FL — à ajouter / arbitrer |
| Délai de sécurité | MARC-SHZET | Saisie | Vue FL — à ajouter / arbitrer |
| Dél.séc./couv.réelle | MARC-SHFLG ? ? | Saisie | Vue FL — à ajouter / arbitrer |

### MRP3 (1)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Indicateur période | MARC-PERKZ | Constante | Couche de génération (payload SAP) |

### MRP4 (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Individuel/Collectif | MARC-SBDKZ | Constante | Couche de génération (payload SAP) |
| Fabrication répétitive | MARC-SAUFT | Règle | Couche de génération (payload SAP) |
| Profil fabric répét | MARC-SFEPR | Règle | Couche de génération (payload SAP) |
| Unité de sortie | MARC-AUSME | Règle | Couche de génération (payload SAP) |
| Unité de production | MARC-FRTME | Règle | Couche de génération (payload SAP) |

### Donn.div./stockage (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Consigne d'emballage | MARA-BEHVO | Constante | Couche de génération (payload SAP) |
| Condition de stockage | MARA-RAUBE | Constante | Couche de génération (payload SAP) |
| Type magasin EM | MLGN-LTKZE | Calcul | Couche de génération (payload SAP) |

### Donn.div./stockage 1 (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Durée minimale rest | MARA-MHDRZ | Saisie | Vue FL — champ métier existant |
| Dur conserv totale | MARA-MHDHB | Règle | Couche de génération (payload SAP) |
| Indic période DLC | MARA-IPRKZ | Règle | Couche de génération (payload SAP) |

### Donn.div./stockage 2 (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Unité de quantité WM | MLGN-LVSME | Règle | Couche de génération (payload SAP) |
| UQ défaut fiche art | MLGN-VOMEM | Règle | Couche de génération (payload SAP) |
| Entrée add autorisée | MLGN-KZZUL | Règle | Couche de génération (payload SAP) |

### Gestion empl.mag.2 (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Qté moy.chg | LHMG1 MLGN à revoir enseù | Règle | Couche de génération (payload SAP) |
| UQ (unité) | MLGN à revoir LHME1 | Règle | Couche de génération (payload SAP) |
| TUS (type unité stockage) | MLGN à revoir LETY1 | Règle | Couche de génération (payload SAP) |

### Comptabilité 1 (4)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Classe valorisation | MBEW-BKLAS | Règle | Couche de génération (payload SAP) |
| uniité de prix | MBEW-PEINH | Constante | Couche de génération (payload SAP) |
| Code prix | MBEW-VPRSV | Constante | Couche de génération (payload SAP) |
| Prix standard | MBEW-STPRS | Constante | Couche de génération (payload SAP) |

### CCR 1 (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Avec struct de qtés | MBEW-EKALR | Constante | Couche de génération (payload SAP) |
| Origine article | MBEW-HKMAT | Constante | Couche de génération (payload SAP) |
| Groupe de frais généraux | MBEW-KOSGR | Règle | Couche de génération (payload SAP) |

### CLASSIFICATION 023 (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| 023-LOBM-2USTD (statut utilisation lot) | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| 023-LOBM-VFDAT (DLC lot) | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| 023-LOBM-RLZ (durée vie résiduelle) | Caract. AUSP | Calcul | Couche de génération (payload SAP) |

### CLASSIFICATION 001 (13)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| NBRE DE JOURS DE STOCKAGE | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| DIVISION PRINCIPALE STOCKAGE | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| POURCENTAGE DE COLIS | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| MARQUE INDUSTRIELLE MBSA | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| CLASSE ABCD BSA | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| FORMAT DATE ETIQ COLIS (MBSA ATELIER) | Caract. AUSP | Saisie | Vue FL — champ métier existant |
| MASQUE ETIQUETTE COLIS (MBSA LIGNE) | Caract. AUSP | Saisie | Vue FL — champ métier existant |
| DESIGNATION CLIENT SUR COLIS (MBSA FORMAT PRODUIT) | Caract. AUSP | Saisie | Vue FL — champ métier existant |
| FORMAT DLUO ETIQ COLIS (MBSA SERIE PRODUIT) | Caract. AUSP | Saisie | Vue FL — champ métier existant |
| MBSA MARQUE LOGISTIQUE | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| MBSA MASQUE STANDARD Niv. Art. | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| MBSA MASQUE SPECIFIQUE Niv.Art | Caract. AUSP | Calcul | Couche de génération (payload SAP) |
| MBSA TYPE DE SUPPORT | Caract. AUSP | Constante | Couche de génération (payload SAP) |

### 001 CLASSE ARTICLE (1)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| MBSA TYPE DE SUPPORT | Classif. (custom) | Saisie | Vue FL — à ajouter / arbitrer |

### Consigne emballage std (POP) (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Prof contrôle / génération code | Profil contrôle POP | Constante | Couche de génération (payload SAP) |
| Consigne emballage | Consigne embal. (HU) | Calcul | Couche de génération (payload SAP) |
| Désignation | Consigne embal. | Calcul | Couche de génération (payload SAP) |
| Poste P — composant | Consigne (poste) | Constante | Couche de génération (payload SAP) |
| Poste M — article | Consigne (poste) | Constante | Couche de génération (payload SAP) |

### Consigne emballage fictif (POP) (5)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Prof contrôle / génération code | Profil contrôle POP | Saisie | Vue FL — à ajouter / arbitrer |
| Consigne emballage | Consigne embal. fictive | Calcul | Couche de génération (payload SAP) |
| Désignation | Consigne embal. | Calcul | Couche de génération (payload SAP) |
| Poste P — composant | Consigne (poste) | Saisie | Vue FL — à ajouter / arbitrer |
| Poste M — article | Consigne (poste) | Saisie | Vue FL — à ajouter / arbitrer |

### POF 1 (4)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Type de recherche | Détermination POF | Constante | Couche de génération (payload SAP) |
| Article | MATNR | Calcul | Couche de génération (payload SAP) |
| Consigne d'emballage | Consigne embal. | Calcul | Couche de génération (payload SAP) |
| Consigne emb.alt 1 | Consigne embal. fictive | Calcul | Couche de génération (payload SAP) |

### Workflow validation (16)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Emetteur Fiche de Lancement | Workflow (custom) | Workflow | Hors SAP — géré par les visas de l’app |
| Date fiche de lancement | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date de mise à disposition | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Emetteur commerce | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Emetteur industriel | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Emetteur Gestion du besoin | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Emetteur Supply Chain | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Emetteur Contrôle de Gestion | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Visa commerce | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Visa industriel | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Visa Gestion du besoin | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Visa Supply Chain | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Visa Contrôle de Gestion | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Maxi Création SAP | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| DeadLine complète | Workflow | Workflow | Hors SAP — géré par les visas de l’app |
| Date Retour fiche de lancement | Workflow | Workflow | Hors SAP — géré par les visas de l’app |

### CCR1 (1)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Groupe de frais gén. | MARC (overhead) | Saisie | Vue FL — à ajouter / arbitrer |

### MMSC (3)

| Champ | Champ SAP | Nature | Destination |
|---|---|---|---|
| Domaine MMSC — Agen2 / BA | MARD-LGORT | Saisie | Vue FL — à ajouter / arbitrer |
| Domaine MMSC — Agen2 / NC | MARD-LGORT | Saisie | Vue FL — à ajouter / arbitrer |
| Domaine MMSC — Agen2 / EMB | MARD-LGORT | Saisie | Vue FL — à ajouter / arbitrer |

---

## Web services SAP à appeler

La FL ne se limite pas à `A_Product` (comme la DE) : elle touche plusieurs vues → plusieurs services OData + probablement du **custom** (POP/POF, classification AUSP).

- `A_Product` / `A_ProductDescription` — données de base + libellés (MARA / MAKT)
- `A_ProductPlant` — vues division / MRP (MARC)
- `A_ProductValuation` — comptabilité (MBEW)
- `A_ProductSalesDelivery` — organisation commerciale (MVKE)
- `A_ProductUnitOfMeasure` — unités (U, ZUG, CAR)
- Classification 023 / 001 (caractéristiques **AUSP**) — probablement custom
- Consignes emballage **POP** / **POF**, **MMSC** — probablement custom (hors OData standard)

## Points ouverts (à confirmer avec le métier)

- Variables d'entrée référencées par les règles mais absentes du modèle : type article caractères 17-20 (`SFIN`/`NEGOCE`), hauteur palette, facturation `TDL`, `ProduitGirafe`, produit bio, `OneShot`, quarantaine.
- `OC2-Article prix` : création d'un **article prix** séparé (4 premiers chiffres + 0000) — process à part.
- Beaucoup de « toujours X ? » dans le fichier restent à **valider** avant de les figer en constantes.
