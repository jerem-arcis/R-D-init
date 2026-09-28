# Groupes de sécurité & listes de diffusion — App Boncolac

> **Statut : brouillon de travail (v0.1)** · à valider ensemble.
> Découle directement de la [matrice de responsabilité](01-matrice-responsabilite.md).
>
> **Deux besoins distincts, à ne pas confondre :**
> 1. **Groupes de sécurité** (Entra ID / Azure AD) → **qui peut faire quoi dans l'app**
>    (droits d'accès, et à terme rôle Dataverse).
> 2. **Listes de diffusion** (mail / M365) → **qui reçoit quelle alerte** envoyée par les
>    flux Power Automate.

---

## 0. État des lieux (ce qui existe aujourd'hui)

- **Aucun contrôle de rôle** dans l'app : tout utilisateur connecté voit et fait tout
  (y compris la page Admin). L'authentification actuelle est **simulée** (`mock`), pas
  branchée sur Entra.
- **Aucune adresse mail en dur** dans le code. Les alertes de retard/visa sont affichées
  **dans le tableau de bord** ; les mails éventuels sont envoyés **par les flux Power
  Automate**, dont les destinataires sont configurés **dans les flux** (pas dans l'app).
- Conclusion : les groupes et listes ci-dessous sont **à créer** dans M365/Entra, puis
  à **référencer** (a) dans l'app pour les droits, (b) dans les flux pour les mails.

---

## 1. Groupes de sécurité (Entra ID / Azure AD)

Convention de nommage proposée : `SEC-BONCOLAC-<Rôle>`.

| Groupe | Membres (métier) | Donne accès à | Rôle Dataverse cible ⚠️ |
|---|---|---|---|
| `SEC-BONCOLAC-Utilisateurs` | **Tous** les utilisateurs de l'app | Connexion + tableau de bord (lecture) | Basic User + lecture projets |
| `SEC-BONCOLAC-ADV` | Équipe ADV / Supply Chain | Créer/envoyer DE & DS, code chapeau, viser section ADV, créer article SAP | Écriture projet + envoi flux |
| `SEC-BONCOLAC-Commerce` | Équipe Commerce | Créer DS, saisir/viser section Commerce | Écriture section Commerce |
| `SEC-BONCOLAC-Marketing` | Équipe Marketing ⚠️ | (à trancher : idem Commerce ?) | idem Commerce |
| `SEC-BONCOLAC-Industriel` | Usines / Ordonnancement | Saisir/viser section Industriel | Écriture section Industriel |
| `SEC-BONCOLAC-CDG` | Contrôle de Gestion | Valider/refuser la DE, viser volet gestion | Validation projet |
| `SEC-BONCOLAC-Qualite` | Qualité / R&D ⚠️ | (à définir — visa Qualité ?) | à définir |
| `SEC-BONCOLAC-Admin` | Admin fonctionnel / IT | Page Admin (listes, flux, journal d'erreurs, droits) | System Customizer / Admin |

**Notes de mise en œuvre :**
- Un utilisateur peut appartenir à **plusieurs** groupes (ex. un ADV est aussi
  « Utilisateurs »). Prévoir que `SEC-BONCOLAC-Utilisateurs` contienne tous les autres
  (ou soit un groupe parent).
- Étape 1 (rapide) : masquer la page **Admin** et les boutons sensibles selon le groupe
  (`src/Layout.jsx`), pour arrêter le « tout le monde peut tout ».
- Étape 2 (robuste) : rôles de **sécurité Dataverse** + (projet en cours) table de liaison
  **user ↔ organisation** (cf. mémoire « multi-org SAP »), pour un vrai cloisonnement au
  niveau des données.

---

## 2. Listes de diffusion (alertes mail via Power Automate)

Convention de nommage proposée : `DL-BONCOLAC-<Sujet>`.

| Liste de diffusion | Déclencheur (événement / flux) | Destinataires | Contenu du mail |
|---|---|---|---|
| `DL-BONCOLAC-CodeChapeau` | DE passée « en attente de code chapeau » — relances **J+0 / J+6** (`deStatus.codeChapeauAlert`) | ADV | « Code chapeau à obtenir/relancer pour la DE X » |
| `DL-BONCOLAC-ValidationCDG` | DE passée en `dl_attente_validation_cdg` (après envoi SAP réussi) | CDG | « Une DE attend votre validation » + lien profond |
| `DL-BONCOLAC-Visa-ADV` | FL en attente du visa ADV/Supply Chain | ADV | « Fiche de Lancement à viser (section ADV) » |
| `DL-BONCOLAC-Visa-Industriel` | FL en attente du visa Industriel | Industriel | « Fiche de Lancement à viser (section Industriel) » |
| `DL-BONCOLAC-Visa-Commerce` | FL en attente du visa Commerce | Commerce | « Fiche de Lancement à viser (section Commerce) » |
| `DL-BONCOLAC-ErreursSAP` | Flux `SAP_SEND` / `SAP_SEND_FL` renvoie **erreur** (`cr04e_gestiondeserreurs` alimentée) | ADV + Admin | « Échec de création SAP — article X / PJ Y » + détail |
| `DL-BONCOLAC-Retards` | Fiche en retard / critique / imminent (buckets `launchAlert`) | ADV + Commerce + Industriel | Récap des lancements en risque de retard |
| `DL-BONCOLAC-FicheFinale` | Article créé dans SAP → PDF récap (flux `SAP_SEND_FICHE_FINAL`) | Commerce + Supply Chain + demandeur | Fiche de Lancement finale (PDF) en pièce jointe |

**Notes :**
- Les alertes **code chapeau (J+0/J+6)** et **retards** sont déjà **calculées dans l'app**
  (`src/lib/deStatus.js`, `src/lib/launchAlert.js`) et affichées au tableau de bord ; il
  reste à brancher un flux d'**envoi mail** dessus vers la bonne DL.
- Le mail de **fiche finale** est déjà émis par le flux `SAP_SEND_FICHE_FINAL` (PDF en
  base64) → il suffit d'y mettre `DL-BONCOLAC-FicheFinale` en destinataire.
- Découpler visa ADV / Industriel / Commerce en **3 listes** permet de ne pas spammer les
  services qui n'ont rien à faire sur une fiche donnée.

---

## 3. Correspondance groupe ↔ liste de diffusion

Pour chaque rôle, un **groupe de sécurité** (droits) **et** la/les **listes** qui le
notifient. Le plus simple : la liste de diffusion reprend les membres du groupe de sécurité.

| Rôle | Groupe de sécurité | Listes de diffusion reçues |
|---|---|---|
| ADV / Supply Chain | `SEC-BONCOLAC-ADV` | CodeChapeau, Visa-ADV, ErreursSAP, Retards, FicheFinale |
| Commerce | `SEC-BONCOLAC-Commerce` | Visa-Commerce, Retards, FicheFinale |
| Marketing | `SEC-BONCOLAC-Marketing` | (à définir) |
| Industriel | `SEC-BONCOLAC-Industriel` | Visa-Industriel, Retards |
| Contrôle de Gestion | `SEC-BONCOLAC-CDG` | ValidationCDG |
| Qualité / R&D | `SEC-BONCOLAC-Qualite` | (à définir) |
| Admin / IT | `SEC-BONCOLAC-Admin` | ErreursSAP |

---

## 4. Plan de mise en place (proposé)

1. **Créer les groupes de sécurité** `SEC-BONCOLAC-*` dans Entra et y placer les personnes.
2. **Créer les listes de diffusion** `DL-BONCOLAC-*` (peuvent pointer sur les groupes).
3. **Brancher l'app sur Entra** (remplacer le `mock` d'auth) et lire l'appartenance groupe.
4. **Masquer/afficher** pages & boutons selon le groupe (quick win sécurité).
5. **Câbler les flux Power Automate** pour envoyer chaque alerte à sa DL.
6. **(Cible)** rôles Dataverse + table user↔org pour le cloisonnement fin des données.

---

## 5. Questions ouvertes

1. Les listes de diffusion doivent-elles être **nominatives** ou **par service** (boîte
   partagée) ? (ex. `adv@boncolac...` vs personnes)
2. Marketing et Qualité : groupes/listes réels ou à fusionner/supprimer ?
3. Faut-il une liste **`DL-BONCOLAC-Direction`** en copie des retards critiques ?
4. Fréquence des alertes retard : **temps réel** (à chaque changement) ou **digest
   quotidien** ?
