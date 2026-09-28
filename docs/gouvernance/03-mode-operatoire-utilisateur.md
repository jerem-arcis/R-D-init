# Mode opératoire — expliqué très simplement

> **Statut : brouillon (v0.1)** · à relire ensemble.
> But : qu'une personne **qui n'a jamais vu l'outil** comprenne quoi faire, écran par écran.
> Les images sont dans `docs/modop/img/`.

---

## L'idée en une phrase

On veut **créer un nouveau produit dans SAP** (le grand logiciel de l'entreprise).
Pour ça, on remplit des **fiches** à plusieurs, chacun son bout, puis on appuie sur un
bouton qui **envoie tout à SAP**. 🎉

Le voyage d'un produit ressemble à ça :

```
①  Je demande         ②  On me donne un      ③  Le chef dit OK      ④  Chaque équipe        ⑤  On envoie
    un produit    →       « code chapeau »  →    (Contrôle de    →      remplit sa part   →     à SAP,
   (la DE)                (son numéro)            Gestion)              et signe (visa)         c'est créé !
```

- **DE** = *Demande d'Étude* → pour un produit **qu'on fabrique**.
- **DS** = *Demande Simplifiée* → pour un produit **qu'on achète pour revendre** (négoce).
- **FL** = *Fiche de Lancement* → la grande fiche qu'on remplit à plusieurs avant SAP.

---

## Écran 1 — L'accueil (le tableau de bord) 🏠
*(image `01-dashboard.png`)*

C'est la **page d'entrée**. Elle te montre :
- les produits **en retard** (en rouge) — à traiter vite ;
- les produits **bientôt à lancer** (orange / jaune) ;
- un **calendrier** des lancements.

👉 **Ce que tu fais ici :** tu regardes s'il y a du **rouge**. Si oui, tu cliques dessus
pour aller voir ce qui bloque.

---

## Écran 2 — La liste des demandes 📋
*(image `02-demandes-etude.png`)*

C'est la **liste de toutes les demandes** (DE et DS). En haut, des **onglets** pour filtrer :
Brouillon · En attente de code chapeau · Validée · Refusée.

👉 **Ce que tu fais ici :**
- Pour **créer** : bouton **« + Créer une DE »** (fabriqué) ou **« + Créer une DS »** (négoce).
- Pour **continuer** une demande : tu **cliques sur la ligne**.

---

## Écran 3 — Créer une demande ✏️
*(image `03-creer-de.png`)*

C'est le **formulaire**. Tu remplis les cases (qui demande, quel produit, quel poids, etc.).

👉 **Les 3 boutons importants :**
1. **« Récupération beCPG »** — va chercher des infos toutes seules (gain de temps).
2. **« Demander mon code »** / **« Besoin d'un nouveau code »** — pour obtenir le
   **code chapeau** (le numéro du produit). ⭐ Sans ce numéro, on ne peut pas envoyer à SAP.
3. **« Envoyer vers SAP »** — quand tout est rempli **et** que tu as le code chapeau.

⚠️ **Astuce :** si une case obligatoire manque (ex. le **poids net**), le bouton « Envoyer »
reste **gris**. Remplis-la et il redevient cliquable.

Quand tu cliques **« Envoyer vers SAP »**, une **fenêtre** apparaît :
- 🟢 **vert** = « C'est envoyé, bravo ! »
- 🔴 **rouge** = « Il y a un souci » → note le message et préviens l'**admin**.

Tu n'as pas fini ? Bouton **« Enregistrer »** = ça garde un **brouillon**, tu reviendras plus tard.

---

## Écran 4 — L'accueil des Fiches de Lancement 🗂️
*(image `04-accueil-fl.png`)*

Une fois la demande **validée**, elle devient une **Fiche de Lancement (FL)**. Cette page
liste **toutes les FL** à remplir, triées par **urgence** (les plus pressées en haut).

👉 **Ce que tu fais ici :** tu cliques sur **ta** fiche pour aller remplir **ta partie**.

---

## Écran 5 — Remplir ta partie (la fiche par service) 🧩
*(image `05-fiche-par-service.png`)*

La fiche est coupée en **morceaux**, un par équipe :
- **ADV** (Supply Chain) : codes-barres (EAN), groupes, prix, dates de conservation…
- **Industriel** : cartons, palettes, étiquettes, usine…
- **Commerce** : noms du produit, marque, origine, où on le stocke…

👉 **Ce que tu fais :**
1. Tu remplis **seulement les cases de ta partie**.
2. Quand c'est bon, tu appuies sur **« Viser »** (= « je signe, ma partie est finie ✅ »).
3. Si quelque chose ne va pas, tu appuies sur **« Refuser »** et tu **écris pourquoi**.

⚠️ **Important :** une fois que tu as **visé**, tes cases se **verrouillent** (on ne peut
plus les changer). Vérifie **avant** de signer !

💡 Chaque équipe travaille **en même temps**, pas besoin d'attendre les autres.

---

## Écran 6 — La fiche complète (tout sur une page) 📄
*(image `06-fiche-complete.png`)*

La **même fiche**, mais **tout affiché d'un coup** (pratique pour relire l'ensemble).
En bas, quand **les 3 équipes ont signé**, le bouton **« Créer dans SAP »** s'active.

👉 **Ce que fait ce bouton :** il envoie **toute la fiche à SAP**. Ça prend **quelques
minutes** — c'est normal. Une fenêtre te dit quand c'est **fini** :
- 🟢 « Article créé dans SAP » = **gagné**, le produit existe !
- 🔴 « Erreur » = préviens l'**admin**.
- ⏳ « Toujours en cours » = attends un peu et reviens vérifier.

Il y a aussi un bouton **« Export PDF »** pour **imprimer / sauver** la fiche.

---

## Écran 7 — Les sites de stockage 📦
*(image `07-sites-stockage.png`)*

Ici on dit **dans quels entrepôts** le produit sera rangé. Tu **coches** les bons sites.
*(C'est en général la partie Commerce.)*

---

## Écran 8 — L'administration (réservé) 🔧
*(image `08-admin.png`)*

Page **pour l'admin uniquement**. On y gère :
- les **listes déroulantes** (les choix proposés dans les formulaires) ;
- le **journal des erreurs SAP** (pour comprendre pourquoi un envoi a raté).

👉 Si tu n'es **pas admin**, tu n'as **rien à faire ici**.

---

## Les mots compliqués, traduits 🗣️

| Le mot | Ça veut dire… |
|---|---|
| **DE** | Demande pour un produit **qu'on fabrique**. |
| **DS** | Demande pour un produit **qu'on achète pour revendre**. |
| **FL** | La grande fiche qu'on **remplit à plusieurs**. |
| **Code chapeau** | Le **numéro du produit**. Sans lui, on ne peut rien envoyer. |
| **Viser** | **Signer** = « ma partie est finie et correcte ». |
| **SAP** | Le **grand logiciel** de l'entreprise où vit le produit. |
| **CDG** | Contrôle de Gestion = le **chef qui dit oui/non** au projet. |
| **Brouillon** | Une demande **pas encore envoyée**, gardée pour plus tard. |

---

## Si ça bloque 🆘

| Problème | Quoi faire |
|---|---|
| Le bouton « Envoyer » est **gris** | Il manque une **case obligatoire** (souvent le poids). Remplis-la. |
| Fenêtre **rouge** après l'envoi | Note le message, préviens l'**admin**. |
| Je ne peux plus **modifier** une case | Elle est **verrouillée** car la partie est **visée** ou l'article **déjà créé**. |
| « Création **toujours en cours** » | Normal, SAP prend du temps. Reviens dans quelques minutes. |
| Je ne trouve pas ma fiche | Regarde les **onglets** de filtre ou la **barre de recherche**. |

---

> 📌 Ce mode opératoire remplacera / complétera le fichier
> `docs/modop/Mode-Operatoire-Boncolac-FL.docx` (mêmes captures d'écran).
