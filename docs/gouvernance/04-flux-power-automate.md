# Documentation technique — Flux Power Automate

> **Statut : brouillon technique (v0.2)** · revérifié sur le code actuel
> (branche `feat/groupe-article-ristourne-code`, 2026-09-16).
> Les **internes des flux** (actions SAP OData) ne sont pas dans ce dépôt : leur
> comportement est **déduit** des payloads envoyés et des specs
> (`docs/superpowers/specs/2026-09-09-envoi-sap-par-id-de-ds-design.md`, `docs/mapping-fl.md`).
>
> ✅ **Réduction du payload DE/DS : faite.** La DE et la DS n'envoient plus que
> `{ ID, PoidsNet }` à `SAP_SEND` (vérifié dans `CreerDE.jsx`). Tout le reste
> (code chapeau, EAN, groupes SAP, ZUG…) est **écrit en Dataverse par l'app** puis
> **relu par le flux**. C'est le modèle « n'envoyer que l'ID, le flux relit
> Dataverse » ; il prépare aussi le **multi-organisation** (VKORG poussé par l'app,
> cf. mémoire « multi-org SAP »).

---

## 1. Registre des flux (`cr04e_fluxregistre`)

Les URL des flux ne sont **pas en dur** dans l'app. Elles sont stockées en Dataverse dans
la table **`cr04e_fluxregistre`** (colonnes : `cr04e_cle`, `cr04e_url`, `cr04e_description`,
`statecode`). L'app résout l'URL par la clé via `getFluxUrl(cle)` (`src/api/flux.js`).

> Ajouter un flux = ajouter une **ligne** (clé + URL) dans `cr04e_fluxregistre`, pas de
> redéploiement de l'app. La clé est un **contrat** : ne jamais la renommer.
> Une ligne à `statecode = 1` (inactive) est **ignorée** au chargement.

Deux fonctions d'appel (`src/api/flux.js`) :
- `postFlow(cle, body)` — **lève** une exception si HTTP ≠ 2xx (appelants « simples »).
- `postFlowRaw(cle, body)` — renvoie la `Response` **sans lever** (le code décide selon 200/400).
- `body` omis ⇒ POST **sans corps** (ex. `NOUVEAU_CODE`).
- En-tête forcé **`Accept-Language: en-US`** ⚠️ **indispensable** : sinon le connecteur SAP
  sérialise les décimaux (ex. `PoidsNet`) avec une **virgule** et SAP renvoie `400`
  (cf. mémoire « SAP décimal / Accept-Language »).

Le cache du registre est chargé **une seule fois** par session (Map clé→URL) ; en cas
d'échec réseau la promesse est oubliée pour permettre une nouvelle tentative.

---

## 2. Catalogue des flux

Clé JS (`FLUX.*`, `src/api/flux.js`) → clé réelle `cr04e_cle` en Dataverse :

| Clé (`cr04e_cle`) | Rôle | Déclenché par (UI → fonction) | Payload envoyé | Bloquant ? |
|---|---|---|---|---|
| `BECPG` | Récupère les métadonnées projet depuis beCPG | « Récupération depuis beCPG » → `handleFetch` (`CreerDE.jsx`) | `{ CodePJ }` | non |
| `NOUVEAU_CODE` | Génère le prochain code chapeau | « Besoin d'un nouveau code » → `handleDemanderNouveauCode` | *(vide)* | à la demande |
| `VL_CODE` | Résout une VL en code chapeau | « Demander mon code » → `requestVlCodeChapeau` | `{ "Numéro" }` | à la demande |
| `DOCUMENT` | Récupère le fichier Excel du projet | « Voir le document » → `DocumentViewer.handleFetch` | `{ CodePJ }` | non |
| `VERIF_DE` | Vérifie que le code n'existe pas déjà dans SAP | « Envoyer vers SAP » (DE) → `handleSubmit` | `{ "Numéro" }` | **oui** (pré-check) |
| `SAP_SEND` | Crée l'article dans SAP (DE & DS) | « Envoyer vers SAP » → `triggerSapSend` / `triggerSapSendDs` | `{ ID, PoidsNet }` | **oui** |
| `SAP_SEND_FL` | Crée l'article complet depuis la FL | « Créer dans SAP » → `declencherFluxFl` (`FLSynthesisSection.jsx`) | `{ ID }` | non (polling) |
| `SAP_SEND_Fiche_final` | Envoie la fiche récap PDF (mail) | **auto** après `SAP_SEND_FL` réussi → `envoyerFicheFinale` | `{ ID, NomFichier, Fichier(base64) }` | non |
| `VALIDATION` | *(réservé)* | — **non câblé dans l'app** | — | — |

> ⚠️ Attention à la **casse** : la constante JS `FLUX.SAP_SEND_FICHE_FINAL` vaut la clé
> Dataverse **`SAP_SEND_Fiche_final`**. C'est cette dernière qui doit exister dans
> `cr04e_fluxregistre`.
> `VALIDATION` est déclaré dans `FLUX` mais **aucun code ne l'appelle** : ne pas compter
> dessus tant qu'il n'est pas branché.

---

## 3. Ordre d'exécution par type de demande

### 3.1 DE (Demande d'Étude — produit fabriqué)

```
« Envoyer vers SAP » (handleSubmit)
│
├─ 1. VERIF_DE                     { "Numéro": code_chapeau }        ── BLOQUANT
│      ├─ 200 → on continue
│      └─ 400 → STOP « code déjà existant » (rien n'est écrit)
│
├─ 2. Écriture Dataverse                                            ── BLOQUANT
│      ├─ cr04e_projet         (code chapeau, EAN, division, hiérarchie, centre profit…)
│      ├─ cr04e_divisionprojet (PROD, profil de fabrication répétitive)
│      └─ cr04e_statut_en_cours = 'dl_attente_validation_cdg'
│
└─ 3. SAP_SEND                    { ID, PoidsNet: "1.598" }         ── BLOQUANT
       ├─ 200 → statut reste 'dl_attente_validation_cdg' (au CDG de décider)
       │        + modale succès
       └─ 400 → statut repassé 'de_brouillon' (retry = même ligne, pas de doublon)
                + modale erreur, on reste sur le formulaire
```

Le flux `SAP_SEND` **relit `cr04e_projet` par `ID`** pour tout le reste (le payload ne porte
que l'`ID` et le `PoidsNet`).

### 3.2 DS (Demande Simplifiée — négoce)

```
Ouvrir la DS 'ds_attente_cc' → renseigner le code chapeau → « Envoyer vers SAP » (handleDsPushSap)
│
├─ 1. Écriture Dataverse                                            ── BLOQUANT
│      cr04e_projet : code chapeau, EAN, groupes SAP et ZUG
│      (poussés par l'app AVANT l'envoi ; le flux les relit)
│
└─ 2. SAP_SEND                    { ID, PoidsNet }                  ── BLOQUANT
       ├─ 200 → cr04e_statut_en_cours = 'ds_validee' (prête pour la FL)
       └─ 400 → statut inchangé ('ds_attente_cc'), formulaire éditable, retry possible
```
> La DS **n'a pas d'étape VERIF_DE** ni de validation CDG : brouillon → code → validée.
> Depuis les commits du 15/09, la DS **écrit code chapeau + groupes SAP + ZUG dans
> `cr04e_projet`** avant `SAP_SEND` (le flux relaie ces valeurs à SAP).

### 3.3 FL (Fiche de Lancement)

Modèle **asynchrone à polling** (le flux met plusieurs minutes ; la réponse HTTP n'est pas
fiable). L'app **surveille `modifiedon`** plutôt que d'attendre la réponse.

```
DE/DS validée (dl_validee / ds_validee) → 3 visas ✓ → « Créer dans SAP » (handleCreateSAP)
│
├─ 1. Lire le modifiedon de référence (baseline)
│      (repli sur getFicheFluxState si absent de la fiche mappée)
│
├─ 2. SAP_SEND_FL                 { ID }                            ── non bloquant
│      seul un échec IMMÉDIAT (réseau / clé absente) est bloquant ; sinon on laisse
│      ~8 s au POST, au-delà le flux est « parti » et le polling fait foi
│
├─ 3. Polling toutes les 5s (max 10 min) : getFicheFluxState(ID)
│      lit { modifiedon, cr04e_fluxenvoiefl } — lecture LÉGÈRE (sans tables filles)
│      └─ tant que modifiedon == baseline → « en cours » (pending)
│
│      quand modifiedon CHANGE (resolveFluxOutcome) :
│      ├─ flux_envoi_fl == 'reussi' →
│      │    ├─ 4. SAP_SEND_Fiche_final  { ID, NomFichier, Fichier } ── non bloquant (mail PDF)
│      │    ├─ 5. cr04e_statut_en_cours = 'fl_sap_cree'  (statut_sap = « Création SAP effectuée »)
│      │    │      + cr04e_dateenvoidelafiche = aujourd'hui (verrouille le bouton + GTIN)
│      │    └─ modale succès « Article créé dans SAP »
│      │
│      └─ flux_envoi_fl == 'erreur' →
│           statut inchangé (dl_validee/ds_validee), formulaire éditable, modale erreur
│
└─ Timeout 10 min (modifiedon jamais changé) → modale neutre « toujours en cours »
```

Le flux `SAP_SEND_FL` relit toute la fiche par `ID`, y compris les **groupements OC2**
(article / ristourne / statistique / imputation), désormais **stockés en Dataverse sous forme
de code à 2 caractères** (commit `e096dad`) et transmis tels quels à SAP.

---

## 4. Qui écrit quoi (app vs flux)

| Champ Dataverse | Table | Écrit par | Valeurs | Rôle |
|---|---|---|---|---|
| `cr04e_statut_en_cours` | `cr04e_projet` | **App** | `de_brouillon`, `de_attente_cc`, `dl_attente_validation_cdg`, `dl_validee`, `dl_refusee`, `ds_brouillon`, `ds_attente_cc`, `ds_validee`, `fl_sap_cree` | Phase du projet |
| `cr04e_fluxenvoiede` | `cr04e_projet` | Flux `SAP_SEND` | `reussi` / `erreur` | Résultat envoi DE **et DS** (même colonne) |
| `cr04e_fluxenvoiefl` | `cr04e_projet` | Flux `SAP_SEND_FL` | `reussi` / `erreur` | Résultat envoi FL (lu par le polling) |
| `cr04e_dateenvoidelafiche` | `cr04e_projet` | **App** (après succès FL) | date ISO (locale) | Verrouille la FL contre un ré-envoi |
| `modifiedon` | `cr04e_projet` | Dataverse (système) | timestamp | Base du polling FL |
| `cr04e_gestiondeserreurs` | table fille | Flux (sur 400/500 SAP) | détail erreur SAP | Journal consulté dans l'Admin |

> **Lecture tolérante des statuts de flux** (`fluxStatut`, `erreursSap.js`) : la colonne
> texte est interprétée souplement — `reussi`/`réussi`/`ok`/`success`/`0`/`false` → **réussi**,
> `erreur`/`error`/`ko`/`echec`/`échec`/`1`/`true` → **erreur**, tout le reste → « — ».
> Le flux peut donc écrire l'une de ces formes sans casser l'affichage.

> **Principe** (spec 2026-09-09, désormais appliqué) : **l'app pilote les statuts** ; **le flux
> relit Dataverse par ID** et crée dans SAP. Le flux reste « bête » (il relaie).

---

## 5. Points d'attention / dette

- **`VERIF_DE`** doit répondre **200/400 rapidement** via une action « Réponse » synchrone
  (une erreur `502 NoResponse` a déjà été observée si une étape amont traîne).
- **`SAP_SEND` / `SAP_SEND_FL`** doivent renvoyer explicitement **200** (succès) / **400**
  (erreurs), et écrire le détail dans `cr04e_gestiondeserreurs`.
- **Décimaux** : garder `Accept-Language: en-US` côté app ; repli possible = remplacer
  l'action OData typée par un **HTTP brut** vers SAP.
- **URL de flux exposées côté client** (signatures SAS) = dette de sécurité connue,
  documentée dans la spec beCPG du 2026-06-11.
- **EAN côté DS (négoce)** : calcul auto appliqué par cohérence — à confirmer (les produits
  négoce gardent souvent l'EAN fournisseur).
- **Clé `VALIDATION`** réservée dans `FLUX` mais **non câblée** : à câbler ou à retirer pour
  éviter la confusion.

---

## 6. Fichiers de référence (app)

| Sujet | Fichier |
|---|---|
| Appel des flux (`getFluxUrl`, `postFlow`, `postFlowRaw`) + registre `FLUX` | `src/api/flux.js` |
| Envoi DE/DS (VERIF_DE, SAP_SEND, payload `{ ID, PoidsNet }`) | `src/pages/CreerDE.jsx` |
| Envoi FL + polling + fiche finale | `src/components/fiche/FLSynthesisSection.jsx` |
| Lecture légère du polling (`getFicheFluxState`) + mapping statut FL | `src/api/fiche.js` |
| Interprétation des statuts de flux (`fluxStatut`, `resolveFluxOutcome`) | `src/lib/erreursSap.js` |
| Statuts projet | `src/lib/deStatus.js`, `src/api/projet.js` |
| Génération payload SAP (règles/constantes) | `src/lib/ficheSap.js`, `src/lib/emballagesSap.js` |
| Journal d'erreurs SAP | `src/api/gestionErreurs.js`, `src/lib/erreursSap.js` |
