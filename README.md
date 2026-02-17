# Power Apps Code App - Template Starter

> Installez [Runme](https://marketplace.visualstudio.com/items?itemName=stateful.runme) pour les boutons **Run** et **Copy**.

---

## 1. Setup

```sh {"id":"init","name":"init"}
powershell -ExecutionPolicy Bypass -File ./init.ps1
```

---

## 2. Dev

```sh {"id":"dev","name":"dev","background":"true"}
npm run dev
```

```sh {"id":"build","name":"build"}
npm run build
```

```sh {"id":"push","name":"push"}
pac code push
```

---

## 3. Générer les scripts Dataverse

Les fichiers dans `script template/` servent de **modèle**. Tu ne les modifies jamais directement.
Copie le prompt ci-dessous dans Claude Code, décris tes tables, et il crée les 3 scripts prêts à lancer.

### Prompt

```text
Lis les 3 fichiers template dans le dossier "script template/" :
- template-create-tables.ps1
- template-seed-data.ps1
- template-delete.ps1

En te basant sur ces templates, crée 3 nouveaux fichiers PowerShell
dans un dossier "scripts/" à la racine du projet :

1. scripts/create-tables.ps1
   → Copie template-create-tables.ps1 mais remplace la section
     "TES TABLES ICI" par mes tables décrites ci-dessous.
   → Garde TOUTES les fonctions utilitaires du template telles quelles.
   → Crée les tables parents AVANT les enfants.

2. scripts/seed-data.ps1
   → Copie template-seed-data.ps1 mais remplace la section
     "TES DONNEES ICI" par des données d'exemple réalistes
     pour chaque table (3-5 lignes par table).
   → Insère les parents en premier, stocke les IDs pour les lookups.
   → Utilise les bonnes valeurs numériques pour les choices.

3. scripts/delete.ps1
   → Copie template-delete.ps1 mais remplace la variable $tables
     avec mes tables dans le bon ordre (enfants avant parents).

---
VOICI MES TABLES :

(Décris tes tables ici en langage naturel, exemple :)

Table "client" :
  - email (email)
  - telephone (phone)
  - adresse (texte long)
  - statut : prospect, actif, inactif (choice)
  - date_inscription (date seule)
  - photo (image)

Table "projet" :
  - description (memo)
  - budget (money)
  - date_debut (date seule)
  - date_fin (date seule)
  - priorite : basse, moyenne, haute, critique (choice)
  - tags : frontend, backend, design, infra (multi-choice)
  - est_archive (boolean)
  - lien vers client (lookup)

Table "tache" :
  - description (memo)
  - statut : a_faire, en_cours, terminee (choice)
  - date_echeance (date seule)
  - temps_estime (decimal, precision 1)
  - lien vers projet (lookup)
---
```

### Lancer les scripts générés

```sh {"id":"create","name":"create"}
powershell -ExecutionPolicy Bypass -File ./scripts/create-tables.ps1
```

```sh {"id":"seed","name":"seed"}
powershell -ExecutionPolicy Bypass -File ./scripts/seed-data.ps1
```

Vider les données (garder les tables) :

```sh {"id":"delete-data","name":"delete-data"}
powershell -ExecutionPolicy Bypass -File ./scripts/delete.ps1
```

Tout supprimer (tables + données) :

```sh {"id":"drop-all","name":"drop-all"}
powershell -ExecutionPolicy Bypass -File ./scripts/delete.ps1 -DropTables
```

---

## Structure

```text
├── src/                     # Code React + TypeScript
├── plugins/                 # Plugin Vite Power Apps
├── script template/         # Templates (ne pas modifier)
│   ├── template-create-tables.ps1
│   ├── template-seed-data.ps1
│   └── template-delete.ps1
├── scripts/                 # Scripts générés (par le prompt)
│   ├── create-tables.ps1
│   ├── seed-data.ps1
│   └── delete.ps1
├── power.config.json        # Config Power Apps
└── init.ps1                 # Setup automatique
```

---

[Power Apps](https://docs.microsoft.com/power-apps/) | [PAC CLI](https://docs.microsoft.com/power-platform/developer/cli/introduction) | [React](https://react.dev/) | [Vite](https://vitejs.dev/)
