import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { toDraft, hasChanged } from './bufferedValue';

// Input "tamponné" : la frappe met à jour un état LOCAL uniquement ; `onCommit`
// n'est appelé qu'à la SORTIE du champ (blur) ou sur Entrée — jamais à chaque
// caractère. Évite un PATCH Dataverse par frappe, cause de lags / bugs de saisie
// sur la fiche de lancement (FL).
//
// Props :
//  - value    : valeur "source" (contrôlée par le parent)
//  - onCommit : (valeur) => void, appelé au blur/Entrée si la valeur a changé
//  - parse    : (chaîne) => valeur, transformation avant commit (ex. Number)
//  - ...rest  : props passées à l'<Input> (type, disabled, className, placeholder…)
export default function BufferedInput({ value, onCommit, parse, onKeyDown, ...rest }) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const focused = useRef(false);

  // Resynchronise l'affichage quand la valeur externe change HORS saisie active
  // (ex. après enregistrement d'un autre champ / rechargement des données).
  useEffect(() => {
    if (!focused.current) setDraft(toDraft(value));
  }, [value]);

  const commit = () => {
    focused.current = false;
    if (!hasChanged(draft, value)) return; // rien tapé / valeur inchangée → pas de save
    onCommit?.(parse ? parse(draft) : draft);
  };

  return (
    <Input
      {...rest}
      value={draft}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Entrée valide la saisie (déclenche le blur → commit).
        if (e.key === 'Enter') e.currentTarget.blur();
        onKeyDown?.(e);
      }}
    />
  );
}
