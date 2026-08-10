// Helpers purs du champ "tamponné" (BufferedInput). Extraits pour être testés
// sans monter de composant React.

// Valeur affichée sous forme de chaîne (null/undefined → '' ; nombre → texte).
export const toDraft = (v) => (v ?? '').toString();

// Vrai si le brouillon diffère réellement de la valeur d'origine — comparaison
// par chaîne pour tolérer les écarts de type (ex. '12' saisi vs 12 stocké), afin
// de ne PAS déclencher de sauvegarde quand l'utilisateur sort d'un champ non modifié.
export const hasChanged = (draft, value) => toDraft(draft) !== toDraft(value);
