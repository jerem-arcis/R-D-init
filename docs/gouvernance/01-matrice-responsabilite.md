# Matrice de responsabilité — App Boncolac (DE / DS / FL → SAP)

> **Statut : brouillon de travail (v0.1)** · à valider ensemble.
> Les cellules marquées ⚠️ sont des **hypothèses** déduites du code ou du process ;
> elles doivent être confirmées par le métier.
>
> **Rappel important :** aujourd'hui l'application **ne bloque personne par rôle**.
> N'importe quel utilisateur connecté peut faire n'importe quelle action (créer, viser,
> envoyer à SAP, ouvrir l'Admin). Cette matrice décrit **qui *doit* faire quoi** ; elle
> sert de base à la mise en place des **groupes de sécurité** (voir
> [`02-groupes-et-listes-diffusion.md`](02-groupes-et-listes-diffusion.md)) qui la rendront
> réellement applicable.

---

## 1. Les rôles

| Rôle (métier) | Correspondance dans l'app | Rôle en 1 phrase |
|---|---|---|
| **ADV / Supply Chain** | visa `supply_chain` (libellé **« ADV »** dans la FL) + pilotage code chapeau & envoi SAP | Fait le lien avec SAP : code chapeau, EAN, groupes article/ristourne/statistique/imputation, prix, DLC/DLUO, gestion par lots. |
| **Gestion Besoin (GB)** | owner `gb` (section **masquée** dans l'UI aujourd'hui) | Paramètres d'approvisionnement / planification (clé de lot, profil de couverture, délais de sécurité). ⚠️ Actuellement non exposé. |
| **Industriel (Usine / Ordonnancement)** | visa `industriel` | Emballages, étiquettes colis, type d'usine, palette, durée de vie, dimensions. |
| **Commerce** | visa `commerce` | Libellés commerciaux, origine, canaux de distribution, hiérarchie produit, marque, nomenclature douanière, sites de stockage, GTIN. |
| **Marketing** | (pas de visa dédié) | ⚠️ Initie le besoin produit / la marque ; co-saisit avec Commerce. À arbitrer : fusion avec Commerce ou colonne propre. |
| **Contrôle de Gestion (CDG)** | visa `controle_gestion` (piloté **hors app**, via Power Automate) | Qualifie la DE (centre de profit, feu vert budgétaire) → fait passer le projet en phase FL. |
| **Qualité / R&D** | champ `code_etude_rd` uniquement | ⚠️ Aujourd'hui non actif dans le workflow. Fournit le code étude R&D en amont. |
| **Admin / IT** | page Admin | Gère les listes déroulantes, le registre des flux, suit et débloque les erreurs SAP, (à venir) gère les droits. |

> ⚠️ **Question ouverte n°1 — ADV vs Supply Chain vs Gestion Besoin.** Dans le code, la
> section « ADV » porte les données Supply Chain, et « Gestion Besoin » est une section
> séparée mais masquée. Il faut trancher : est-ce **un seul rôle** (ADV = Supply Chain +
> Gestion Besoin) ou **deux/trois rôles distincts** ? La matrice ci-dessous les regroupe
> sous **« ADV / Supply Chain »** par défaut.

---

## 2. Légende RACI

| Lettre | Sens |
|---|---|
| **R** | *Responsible* — **fait** l'action (saisit, clique, exécute). |
| **A** | *Accountable* — **rend des comptes** / valide ; décideur final (1 seul par ligne). |
| **C** | *Consulted* — **consulté** avant/pendant (donne un avis, une donnée). |
| **I** | *Informed* — **informé** du résultat (reçoit une notif / un mail). |

---

## 3. Matrice — cycle complet

Colonnes : **ADV** (ADV/Supply Chain) · **COM** (Commerce) · **MKT** (Marketing) · **IND** (Industriel) · **CDG** (Contrôle de Gestion) · **QUA** (Qualité/R&D) · **ADM** (Admin/IT).

### Phase 1 — Demande (DE / DS)

| Action | ADV | COM | MKT | IND | CDG | QUA | ADM |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Exprimer le besoin d'un nouveau produit ⚠️ | C | R/A | R | | | C | |
| Créer une **DE** (produit fabriqué) | R/A | C | C | | I | C | |
| Créer une **DS** (négoce / simplifiée) | A | R | R | | | | |
| Récupérer les données beCPG (bouton) | R | | | | | C | |
| Demander / obtenir le **code chapeau** (VL ou nouveau code) | R/A | | | | | | |
| Enregistrer un brouillon | R | R | R | | | | |
| **Envoyer la DE vers SAP** (VERIF_DE + SAP_SEND) | R/A | | | | I | | I |
| **Envoyer la DS vers SAP** | R/A | C | | | | | I |

### Phase 2 — Qualification CDG

| Action | ADV | COM | MKT | IND | CDG | QUA | ADM |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Valider la DE** → passe en Fiche de Lancement (`dl_validee`) | I | I | | | R/A | | |
| **Refuser la DE** (avec motif) → `dl_refusee` | I | I | | | R/A | | |

### Phase 3 — Fiche de Lancement (visas par service, en parallèle)

> La FL n'a **pas de cheminement séquentiel** : chaque service saisit **sa** section et
> pose **son** visa quand il veut. Poser un visa **fige** les champs de cette section.

| Action | ADV | COM | MKT | IND | CDG | QUA | ADM |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Renseigner + **viser la section ADV / Supply Chain** (EAN, groupes article/ristourne/stat/imputation, prix, DLC) | R/A | | | | | | |
| Renseigner + **viser la section Industriel** (emballages, étiquettes, usine, palette, durée de vie) | C | | | R/A | | C | |
| Renseigner + **viser la section Commerce** (libellés, origine, canaux, hiérarchie, marque, nomenclature, sites, GTIN) | C | R/A | C | | | | |
| **Viser Contrôle de Gestion** (centre de profit) ⚠️ hors UI, via Power Automate | I | | | | R/A | | |
| Saisir les paramètres **Gestion Besoin** (planif/appro) ⚠️ section masquée | R/A | | | C | | | |
| **Refuser** une section (motif obligatoire) | R | R | | R | R | | |
| **Créer l'article dans SAP** depuis la FL (SAP_SEND_FL — 3 visas requis) | R/A | I | | I | I | | I |
| **Exporter la FL en PDF** | R | R | | R | C | | |

### Phase 4 — Administration & support

| Action | ADV | COM | MKT | IND | CDG | QUA | ADM |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Gérer les **listes déroulantes** (Admin : ajout / import Excel / suppression) | C | C | C | C | C | | R/A |
| Suivre / **débloquer les erreurs SAP** (journal `cr04e_gestiondeserreurs`) | C | | | | | | R/A |
| Gérer le **registre des flux** (`cr04e_fluxregistre`) | | | | | | | R/A |
| Gérer les **droits utilisateurs** (à venir : table user↔org) | I | I | I | I | I | I | R/A |
| Consulter le **tableau de bord** (alertes, calendrier de lancement) | R | R | R | R | R | R | R |

---

## 4. Lecture rapide « qui a le droit de faire quoi »

- **ADV / Supply Chain** — le rôle pivot : demande le code chapeau, envoie la DE/DS à SAP,
  vise la section ADV de la FL, déclenche la création de l'article dans SAP. C'est le rôle
  le plus « puissant » côté outil.
- **Commerce** — crée les DS, saisit et vise la partie commerciale de la FL. Consulté sur le
  besoin produit.
- **Marketing** — ⚠️ initie le besoin / la marque, co-saisit le commercial. Rôle à préciser.
- **Industriel** — saisit et vise la partie technique/emballage de la FL.
- **Contrôle de Gestion** — porte de sortie : valide/refuse la DE, vise le volet gestion.
- **Qualité / R&D** — ⚠️ en amont (code étude R&D), pas encore actif dans l'outil.
- **Admin / IT** — configure l'outil (listes, flux, droits) et dépanne les envois SAP.

---

## 5. Questions ouvertes à trancher ensemble

1. **ADV = Supply Chain = Gestion Besoin ?** (cf. §1) — combien de colonnes réelles ?
2. **Marketing** : colonne propre ou fusion avec Commerce ?
3. **Qui crée la DE** au départ : ADV, ou Commerce/Marketing qui expriment le besoin et ADV
   qui « met en machine » ? (impacte les lignes Phase 1)
4. **CDG** : la validation reste-t-elle 100 % hors app (Power Automate) ou veut-on un écran
   de validation dans l'outil ?
5. **Visa croisé** : peut-on autoriser un service à viser à la place d'un autre en secours
   (backup / congés) ? Si oui, prévoir un rôle « superviseur ».
6. **Qualité** : doit-elle poser un visa dans la FL (aujourd'hui absent) ?
