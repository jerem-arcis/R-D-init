# Power Apps Code App - Template Starter

Template de démarrage pour créer des applications Power Apps avec **React**, **TypeScript** et **Vite**.

---

## Table des matières

1. [Présentation](#présentation)
2. [Prérequis](#prérequis)
3. [Démarrage rapide](#démarrage-rapide)
4. [Structure du projet](#structure-du-projet)
5. [Configuration](#configuration)
6. [Développement local](#développement-local)
7. [Ajouter des sources de données](#ajouter-des-sources-de-données)
8. [Publication](#publication)
9. [Architecture technique](#architecture-technique)
10. [Bonnes pratiques](#bonnes-pratiques)
11. [Troubleshooting](#troubleshooting)

---

## Présentation

Ce template permet de développer des **Power Apps Code Apps** en utilisant les technologies web modernes :

- **React 19** pour l'interface utilisateur
- **TypeScript** pour le typage statique
- **Vite 7** pour le build et le Hot Module Replacement (HMR)
- **Power Apps SDK** (`@microsoft/power-apps`) pour l'intégration Power Platform

### Avantages

- Développement local avec rechargement à chaud
- Typage fort avec TypeScript
- Accès aux connecteurs Power Platform (Dataverse, SQL, SharePoint, etc.)
- Build optimisé pour la production
- Intégration native avec l'écosystème Microsoft

---

## Prérequis

### Outils requis

| Outil | Version minimum | Installation |
|-------|-----------------|--------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Inclus avec Node.js |
| **Power Platform CLI (PAC)** | Latest | Voir ci-dessous |

### Installation du Power Platform CLI

```bash
# Via npm (recommandé)
npm install -g @microsoft/powerplatform-cli

# Vérifier l'installation
pac --version
```

### Authentification Power Platform

```bash
# Se connecter à Power Platform
pac auth create

# Lister les environnements disponibles
pac env list

# Sélectionner un environnement
pac env select --environment <environmentId>
```

---

## Démarrage rapide

### 1. Cloner et installer

```bash
# Cloner le repository
git clone <url-du-repo>
cd RetD-init

# Installer les dépendances
npm install
```

### 2. Configurer l'application

Modifier le fichier `power.config.json` :

```json
{
  "appDisplayName": "Mon Application",
  "environmentId": "votre-environment-id"
}
```

### 3. Lancer le développement

```bash
npm run dev
```

Cette commande :
1. Démarre le serveur Vite sur `http://localhost:3000`
2. Lance `pac code run` pour la connexion Power Platform
3. Affiche l'URL de test Power Apps dans la console

### 4. Tester dans Power Apps

Ouvrez l'URL affichée dans la console (format) :
```
https://apps.powerapps.com/play/e/{environmentId}/a/local?_localAppUrl=...
```

---

## Structure du projet

```
RetD-init/
├── src/                          # Code source
│   ├── main.tsx                  # Point d'entrée React
│   ├── App.tsx                   # Composant principal
│   ├── App.css                   # Styles de l'application
│   ├── index.css                 # Styles globaux
│   ├── PowerProvider.tsx         # Context Power Platform
│   └── assets/                   # Ressources statiques
│
├── plugins/                      # Plugins Vite personnalisés
│   └── powerApps.ts              # Plugin d'intégration Power Apps
│
├── dist/                         # Build de production (généré)
├── public/                       # Fichiers statiques publics
│
├── power.config.json             # Configuration Power Apps
├── package.json                  # Dépendances et scripts
├── vite.config.ts                # Configuration Vite
├── tsconfig.json                 # Configuration TypeScript
└── eslint.config.js              # Configuration ESLint
```

### Dossiers générés (après ajout de sources de données)

```
src/
├── Models/                       # Modèles TypeScript générés
└── Services/                     # Services d'accès aux données

.power/
└── schemas/                      # Schémas de référence
```

---

## Configuration

### power.config.json

Fichier central de configuration Power Apps :

```json
{
  "appId": "",                           // ID de l'app (généré automatiquement)
  "appDisplayName": "Nom de l'App",      // Nom affiché dans Power Apps
  "description": "Description",          // Description de l'application
  "environmentId": "xxx-xxx-xxx",        // ID de l'environnement Power Platform
  "buildPath": "./dist",                 // Dossier de build
  "buildEntryPoint": "index.html",       // Point d'entrée
  "logoPath": "Default",                 // Logo de l'application
  "localAppUrl": "http://localhost:3000/", // URL de dev local
  "region": "prod",                      // Région Power Platform
  "connectionReferences": {},            // Références aux connecteurs
  "databaseReferences": {}               // Références aux bases de données
}
```

### Récupérer l'Environment ID

```bash
# Lister tous les environnements
pac env list

# Exemple de sortie :
# Environment ID                        Display Name
# ce7183b0-3bb5-ea9c-8a38-d1e340e360fc  Production
# a1b2c3d4-e5f6-7890-abcd-ef1234567890  Development
```

---

## Développement local

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile et build pour la production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code avec ESLint |

### Utiliser le contexte Power Platform

Le `PowerProvider` fournit l'accès au contexte Power Platform dans vos composants :

```tsx
import { usePowerPlatform } from './PowerProvider';

function MonComposant() {
  const { isInitialized, powerContext } = usePowerPlatform();

  if (!isInitialized) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      {/* Votre UI ici */}
    </div>
  );
}
```

### Structure recommandée d'un composant

```tsx
// src/components/MaFeature.tsx
import { useState, useEffect } from 'react';
import { usePowerPlatform } from '../PowerProvider';

export function MaFeature() {
  const { powerContext } = usePowerPlatform();
  const [data, setData] = useState([]);

  useEffect(() => {
    // Charger les données
  }, []);

  return (
    <div className="ma-feature">
      {/* Contenu */}
    </div>
  );
}
```

---

## Ajouter des sources de données

### Connecteurs disponibles

| Type | API ID | Exemple |
|------|--------|---------|
| **Dataverse** | `shared_commondataserviceforapps` | Tables CDS |
| **SQL Server** | `shared_sql` | Bases Azure SQL |
| **SharePoint** | `shared_sharepointonline` | Listes SharePoint |
| **Office 365 Users** | `shared_office365users` | Profils utilisateurs |
| **Excel Online** | `shared_excelonlinebusiness` | Fichiers Excel |

### Commande d'ajout

```bash
# Syntaxe générale
pac code add-data-source -a <apiId> -c <connectionId>

# Avec table et dataset (SQL, Dataverse)
pac code add-data-source -a <apiId> -c <connectionId> -t <table> -d <dataset>
```

### Exemples concrets

#### Office 365 Users
```bash
pac code add-data-source -a "shared_office365users" -c "aa35d97110f747a49205461cbfcf8558"
```

#### SQL Server
```bash
pac code add-data-source \
  -a "shared_sql" \
  -c "12767db082494ab482618ce5703fe6e9" \
  -t "[dbo].[MaTable]" \
  -d "monserveur.database.windows.net,mabase"
```

#### Dataverse
```bash
pac code add-data-source \
  -a "shared_commondataserviceforapps" \
  -c "votre-connection-id" \
  -t "accounts"
```

### Récupérer le Connection ID

1. Aller sur [make.powerapps.com](https://make.powerapps.com)
2. **Données** → **Connexions**
3. Cliquer sur la connexion souhaitée
4. L'ID est dans l'URL : `connections/{connectionId}/details`

### Utiliser les données générées

Après `add-data-source`, des fichiers sont générés dans `src/Models/` et `src/Services/` :

```tsx
// Exemple d'utilisation
import { MaTableService } from './Services/MaTableService';
import { MaTableModel } from './Models/MaTableModel';

async function chargerDonnees() {
  const service = new MaTableService();
  const items: MaTableModel[] = await service.getAll();
  return items;
}
```

---

## Publication

### Étapes de publication

```bash
# 1. Builder l'application
npm run build

# 2. Publier sur Power Platform
pac code push
```

### Première publication

Lors de la première publication, un `appId` est généré et ajouté à `power.config.json`.

### Mises à jour

Les publications suivantes mettent à jour l'application existante (même `appId`).

### Vérifier le déploiement

1. Aller sur [make.powerapps.com](https://make.powerapps.com)
2. **Apps** → Rechercher votre application
3. Cliquer pour ouvrir et tester

---

## Architecture technique

### Plugin Vite Power Apps

Le plugin `plugins/powerApps.ts` gère :

- **CORS** : Autorise les requêtes depuis `apps.powerapps.com`
- **Config Serving** : Expose `power.config.json` pour le player Power Apps
- **Hot Reload** : Redémarre le serveur si la config change
- **URL Generation** : Génère l'URL de test local

### Flux de développement

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Code local │───▶│ Vite Dev     │───▶│ Power Apps      │
│  (React)    │    │ Server :3000 │    │ Player (iframe) │
└─────────────┘    └──────────────┘    └─────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ power.config │
                   │ .json        │
                   └──────────────┘
```

### Flux de production

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  npm build  │───▶│   ./dist/    │───▶│  pac code push  │
│             │    │              │    │                 │
└─────────────┘    └──────────────┘    └─────────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │ Power Apps   │
                                       │ Environment  │
                                       └──────────────┘
```

---

## Bonnes pratiques

### Organisation du code

```
src/
├── components/          # Composants React réutilisables
├── pages/               # Pages/vues principales
├── hooks/               # Custom hooks
├── services/            # Services métier
├── utils/               # Fonctions utilitaires
├── types/               # Types TypeScript
└── styles/              # Fichiers CSS/SCSS
```

### Gestion d'état

Pour les applications complexes, considérez :
- **React Context** (inclus) pour l'état global simple
- **Zustand** pour une gestion d'état légère
- **TanStack Query** pour le cache des données serveur

### Performance

- Utilisez `React.memo()` pour les composants purs
- Implémentez le lazy loading pour les grosses pages
- Optimisez les images et assets

### Sécurité

- Ne stockez jamais de secrets dans le code
- Utilisez les connecteurs Power Platform pour l'authentification
- Validez toutes les entrées utilisateur

---

## Troubleshooting

### Erreur : "environmentId is not defined"

**Cause** : `power.config.json` n'a pas d'environmentId valide.

**Solution** :
```bash
pac env list  # Récupérer l'ID
# Mettre à jour power.config.json
```

### Erreur CORS

**Cause** : Le navigateur bloque les requêtes cross-origin.

**Solution** : Assurez-vous d'utiliser l'URL générée par `npm run dev` et non `localhost` directement.

### "pac" command not found

**Cause** : Power Platform CLI non installé.

**Solution** :
```bash
npm install -g @microsoft/powerplatform-cli
```

### Le build échoue

**Solution** :
```bash
# Nettoyer et réinstaller
rm -rf node_modules dist
npm install
npm run build
```

### L'application ne se charge pas dans Power Apps

**Vérifiez** :
1. Le serveur Vite est démarré (`npm run dev`)
2. L'environmentId correspond à votre environnement
3. Vous êtes connecté au bon tenant (`pac auth list`)

---

## Ressources

- [Documentation Power Apps](https://docs.microsoft.com/power-apps/)
- [Power Platform CLI](https://docs.microsoft.com/power-platform/developer/cli/introduction)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## Licence

Ce template est fourni pour un usage interne. Consultez les conditions de licence de votre organisation.

---

**Créé avec le Power Apps Code SDK** | React + TypeScript + Vite
