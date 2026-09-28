# Gouvernance & documentation — App Boncolac

Dossier de travail pour cadrer **qui fait quoi**, **comment**, et **comment ça marche
techniquement**. Tous les documents sont des **brouillons v0.1** à valider ensemble.

| # | Document | Pour qui | Statut |
|---|---|---|---|
| 01 | [Matrice de responsabilité (RACI)](01-matrice-responsabilite.md) | Direction / chefs de service | 🟡 Brouillon — hypothèses à valider |
| 02 | [Groupes de sécurité & listes de diffusion](02-groupes-et-listes-diffusion.md) | IT / Admin M365 | 🟡 Brouillon |
| 03 | [Mode opératoire utilisateur (très simple)](03-mode-operatoire-utilisateur.md) | Tous les utilisateurs | 🟡 Brouillon |
| 04 | [Flux Power Automate (technique)](04-flux-power-automate.md) | Dev / Power Platform | 🟡 Brouillon |

## Ordre de lecture conseillé

1. **01 — Matrice** : on se met d'accord sur qui a le droit de faire quoi.
2. **02 — Groupes** : on en déduit les groupes de sécurité et listes mail à créer.
3. **03 — Mode opératoire** : ce qu'on donne aux utilisateurs finaux.
4. **04 — Flux** : la mécanique interne (envois SAP), pour l'équipe technique.

## Points transverses à trancher (résumé)

- **Taxonomie des rôles** : ADV = Supply Chain = Gestion Besoin ? Marketing et Qualité :
  rôles réels ou à fusionner ? (bloque 01 et 02)
- **CDG** : validation dans l'app ou 100 % Power Automate ?
- **Contrôle d'accès** : aujourd'hui **inexistant** dans l'app — priorité quick win
  (masquer l'Admin + boutons sensibles par groupe).
- **Alertes mail** : temps réel ou digest quotidien ? Nominatif ou boîtes partagées ?

## Sources

Construit à partir du code (`src/`), des specs (`docs/superpowers/specs/`), du
`docs/mapping-fl.md` et des récaps de session. Voir les liens en bas de chaque document.
