import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, Send, FileText, Layers, Settings2, ChevronRight, Loader2, CheckCircle2, X, Check, ChevronsUpDown, Search, XCircle, Database, Monitor, ShoppingCart, FileSpreadsheet, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAdminLists, useAdminOptions, buildOptions, OPTIONSET_QUERY_KEY } from '@/lib/adminLists';
import { useSapOptions } from '@/lib/sapLists';
import { createProjetFromDE, updateProjetFromDE, getProjetById, PROJET_STATUT } from '@/api/projet';
import { createDsFromForm, updateDsFromForm, getDsById, DS_STATUTS } from '@/api/ds';
import { create as createOptionSetValue } from '@/api/optionSet';
import { mapBeCPGToDE, withValue, dropdownAdditionsFromMapping } from '@/lib/becpgMapping';
import {
  DE_DIVISION_CODES,
  computeHierarchieDE,
  computeClasseValoDE,
  computeCentreProfitDE,
  computeGroupeArticleDE,
  computeGroupeArticleLockedDE,
  needsSurgeleWarningDE,
  computeSecteurFromReseau,
  AXES_STRATEGIQUES_DE,
} from '@/lib/deRules';

import { usePowerPlatform } from '@/PowerProvider';
import {
  USINES_ORIGINE,
  USINES_FABRICATION,
  ACTIVITES as DS_ACTIVITES,
  TYPES_MARQUE as DS_TYPES_MARQUE,
  AGEN_TYPES,
  AGEN_CHOIX,
  isTypeNegoce,
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
} from '@/lib/dsRules';

// ---------- Listes (fixes, non gérées via Admin) ----------
const TYPES_DEMANDE_DE = [
  'CA Additionnel',
  'Retravail Produit - CA existant',
];

// ---------- Listes Section "Autre" ----------
const TYPES_DEMANDE_AUTRE = [
  { value: '1', label: '1 - Transfert industriel restant dans nos savoir-faire' },
  { value: '2', label: '2 - Produit semi-fini fabriqué pour une autre usine (savoir-faire déjà validé)' },
  { value: '3', label: '3 - Massification' },
  { value: '4', label: '4 - Produits extérieurs négoce' },
  { value: '5', label: '5 - Produits fabriqués par une filiale du groupe (hors Boncolac Histo)' },
  { value: '6', label: '6 - Changement produit mineur avec impact financier de moins de 2%' },
  { value: '7', label: '7 - Modification palettisation mineure avec impact financier de moins de 2%' }
];

// Exemples affichés à côté du sélecteur Type de demande (scope Commerce/Marketing).
const CAS_USAGE_EXEMPLES = [
  { value: '1', titre: 'Transfert industriel restant dans nos savoir-faire', exemple: 'Transfert de la TCM de Rivesaltes vers Bonloc / Mi cuit Domino\'s de Bonloc vers Rivesaltes' },
  { value: '2', titre: 'Produit semi-fini fabriqué pour une autre usine (savoir-faire déjà validé)', exemple: 'Semi-fini fabriqué par Agen pour Aire' },
  { value: '3', titre: 'Massification', exemple: '' },
  { value: '4', titre: 'Produits extérieurs négoce', exemple: 'Achat fournisseur externe (canelés, …)' },
  { value: '5', titre: 'Produits fabriqués par une filiale du groupe (hors Boncolac Histo)', exemple: 'Macarons de MagM, produits de Cakesmith, Proper Cornish, etc.' },
  { value: '6', titre: 'Changement produit mineur (< 2% impact financier)', exemple: 'Changement charte étui / Modification étiquette / Changement mineur de MP' },
  { value: '7', titre: 'Modification palettisation mineure (< 2% impact financier)', exemple: 'Ajout/suppression d\'une couche / Palette Europe ↔ grand export' },
];


// TODO(sécurité) : ces URLs de flux Power Automate contiennent une signature SAS
// (sig=) exposée côté client (bundle JS + historique Git). À terme : proxifier via
// un backend authentifié (URL en variable d'env secrète), régénérer les signatures
// des 2 flux, ajouter autorisation + cap de longueur sur les payloads. Risque atténué
// car app interne Power Platform (accès SSO), assumé pour l'instant.
// URL du flux Power Automate qui retourne les données beCPG d'un CodePJ.
const BECPG_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5a622144c10f44a6becafb2df0f78775/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5BL_-hxk0OMUfcJT9GRVKoh1BX7hkNsag7Qy3KxzpkQ';

// TODO(sécurité) : voir le bloc ci-dessus — cette URL contiendra elle aussi une
// signature SAS exposée côté client ; à proxifier via un backend authentifié.
// URL du flux Power Automate qui génère le prochain code chapeau (OData SAP).
const NOUVEAU_CODE_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1677a6a5aae34cdf97672ae34548452b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a44EIOXAXlRvQYUq4N8PfB-DTXi2Pa3DQiRIKjxE0ZQ';

// URL du flux Power Automate déclenché à la validation d'une DE : on lui envoie
// le code chapeau dans { "Numéro": <code> }. (Même host que les flux ci-dessus,
// donc déjà couvert par le CSP connect-src.) Même TODO sécurité : SAS exposée.
const VALIDATION_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/daa73024b17f4d6e942c316d4ec09901/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wjYyxeqhqDI_Jh65wFt7fZopDmKlLqt_ahz-shnkS48';

// Flux Power Automate « Envoyer vers SAP » : reçoit l'ensemble des champs de la
// DE (codes bruts, pas les libellés « code — désignation »). Même host -> CSP OK.
const SAP_SEND_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f89cbd33946f49bb883505142eb04762/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=psCae2PoNO_IPL3XmafnxQOr74NMGJdC6skIO9yFAJo';

// Flux « code chapeau à partir d'une VL » : en mode « Besoin d'une VL », le code
// saisi est un CODE DE BASE. À l'envoi, on appelle d'abord ce flux avec
// { "Numéro": <code de base> } ; il renvoie le vrai code chapeau (texte simple,
// ex. « 741603 ») qui alimente ensuite le process classique. Même host -> CSP OK.
const VL_CODE_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9f20ba3d982c47388445509a6e992efd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pa5adaOQtjiBlP_I8ePM-C3svlLl7t1Ah-XiNnff5dY';

// Flux « document projet » : reçoit { "CodePJ": <code projet> } et renvoie le
// binaire brut d'un classeur Excel (.xlsm, application/vnd.ms-excel.sheet.macroenabled.12).
// PAS de base64 : le corps EST le fichier. Aucun Content-Disposition -> on nomme
// le fichier <CodePJ>.xlsm nous-mêmes. Même host que les autres flux -> CSP OK.
const DOCUMENT_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/55ac4404412141bd8e3748446d1d7b7f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rPNAeoQdjqP3dHyHcpYZzYpb2Qom-R6Z7VzZG3NVC4I';

// Génère un EAN-13 « bidon » mais valide (clé de contrôle correcte). `prefix`
// distingue les niveaux (UV / carton / palette) pour des codes lisiblement
// différents. Purement décoratif tant que la vraie source EAN n'est pas branchée.
const genEAN13 = (prefix = '30') => {
  let base = String(prefix).replace(/\D/g, '').slice(0, 12);
  while (base.length < 12) base += Math.floor(Math.random() * 10);
  const sum = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return base + check;
};

// Génère le jeu EAN UV / Carton / Palette (préfixes distincts pour les distinguer).
const genEANSet = () => ({
  ean_uv: genEAN13('30'),
  ean_carton: genEAN13('31'),
  ean_palette: genEAN13('32'),
});

// Extrait le code chapeau du corps de réponse du flux : si JSON, cherche les
// clés usuelles ; sinon retourne le texte brut nettoyé.
const extractCodeChapeau = (text) => {
  const raw = (text || '').trim();
  if (!raw) return '';
  try {
    const json = JSON.parse(raw);
    if (typeof json === 'string' || typeof json === 'number') return String(json).trim();
    // Le flux renvoie le code dans headers.réponse — on regarde aussi cet objet.
    const candidates = [json, json?.headers, json?.body];
    const keys = ['réponse', 'reponse', 'response', 'code_chapeau', 'codeChapeau', 'code', 'Code', 'Numéro', 'Numero', 'numero', 'Product', 'product', 'value', 'result', 'body'];
    for (const obj of candidates) {
      if (!obj || typeof obj !== 'object') continue;
      for (const key of keys) {
        if (obj[key] != null && typeof obj[key] !== 'object') return String(obj[key]).trim();
      }
    }
    return raw;
  } catch {
    return raw;
  }
};

// ---------- Sous-composants ----------
const FormSection = ({ title, icon: Icon, children }) => (
  <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
    <div className="bg-secondary/60 border-b border-border px-6 py-3 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-2">
    <Label className="text-slate-700 font-medium text-sm">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
  </div>
);

// Champ auto-calculé. Sans `onChange` -> lecture seule (valeur forcée).
// Avec `onChange` (phase de dev) -> pré-rempli par la règle mais éditable : la
// saisie surcharge la valeur calculée et part vers SAP/Dataverse.
//  - avec `options` -> liste déroulante (référentiel SAP) sur la valeur auto ;
//  - sans `options`  -> champ texte/nombre libre (ex. ZUG, secteur sans table).
const ReadOnlyField = ({ label, value, hint, onChange, options, type = 'text' }) => (
  <Field label={label} hint={hint}>
    {onChange && options ? (
      <SearchableSelect
        value={value || ''}
        onChange={onChange}
        options={buildOptions(options, value)}
        placeholder="Sélectionner..."
      />
    ) : (
      <Input
        type={type}
        value={value ?? ''}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        placeholder={onChange ? '— Auto (modifiable) —' : '— Calculé automatiquement —'}
        className={onChange ? 'h-11' : 'h-11 bg-muted/40 text-foreground/90 cursor-not-allowed'}
      />
    )}
  </Field>
);

// ---------- Encart de récupération beCPG par CodePJ ----------
const RecupererBeCPG = ({ onApply }) => {
  const [codePJ, setCodePJ] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleFetch = async () => {
    const code = codePJ.trim();
    if (!code || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(BECPG_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CodePJ: code }),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Réponse du flux illisible (JSON invalide).');
      }
      const mapped = mapBeCPGToDE(json);
      if (!mapped) {
        setStatus('error');
        setMessage(`Aucun projet trouvé pour le code « ${code} ».`);
        return;
      }
      const count = onApply(mapped);
      setStatus('success');
      setMessage(`${count} champ(s) renseigné(s) depuis « ${code} ».`);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Erreur lors de la récupération des informations.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5 rounded-xl border-2 border-dashed border-violet-500/30 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 self-start">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <Search className="w-6 h-6 text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            Récupération depuis beCPG
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Saisissez un Code PJ pour pré-remplir automatiquement la demande.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={codePJ}
              onChange={(e) => setCodePJ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetch();
                }
              }}
              placeholder="Ex: PJ4987"
              className="h-10 max-w-[200px] font-mono"
            />
            <Button
              type="button"
              onClick={handleFetch}
              disabled={isLoading || !codePJ.trim()}
              className="h-10 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Récupérer les informations
            </Button>
          </div>
        </div>
      </div>
      {status === 'success' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-700">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-words">{message}</span>
        </div>
      )}
    </div>
  );
};

// Plage rendue bornée pour ne pas figer le navigateur sur une feuille géante.
const GRID_MAX_ROWS = 400;
const GRID_MAX_COLS = 60;

// Palette de thème Office par défaut (bg1, text1, bg2, text2, accent1..6, liens) :
// sert à résoudre les couleurs « theme » d'Excel qui n'ont pas d'ARGB explicite.
const THEME_PALETTE = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72'];

// Éclaircit (tint>0) ou assombrit (tint<0) une couleur hex, façon Excel.
function applyTint(hex, tint) {
  if (!tint) return hex;
  const adj = (c) => (tint < 0 ? Math.round(c * (1 + tint)) : Math.round(c * (1 - tint) + 255 * tint));
  const to2 = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return to2(adj(parseInt(hex.slice(0, 2), 16))) + to2(adj(parseInt(hex.slice(2, 4), 16))) + to2(adj(parseInt(hex.slice(4, 6), 16)));
}

// Couleur ExcelJS ({argb} | {theme,tint} | {indexed}) -> couleur CSS (ou null).
function excelColorToCss(color) {
  if (!color) return null;
  if (color.argb) {
    const a = color.argb;
    return '#' + (a.length === 8 ? a.slice(2) : a);
  }
  if (typeof color.theme === 'number' && THEME_PALETTE[color.theme]) {
    return '#' + applyTint(THEME_PALETTE[color.theme], color.tint || 0);
  }
  return null; // indexed/auto -> laissé au défaut (quadrillage clair)
}

const BORDER_WIDTH = { hair: '1px', thin: '1px', dotted: '1px', dashed: '1px', medium: '2px', mediumDashed: '2px', thick: '3px', double: '3px' };
const BORDER_STYLE = { double: 'double', dotted: 'dotted', dashed: 'dashed', mediumDashed: 'dashed' };
function borderCss(side) {
  if (!side || !side.style) return undefined;
  const w = BORDER_WIDTH[side.style] || '1px';
  const s = BORDER_STYLE[side.style] || 'solid';
  return `${w} ${s} ${excelColorToCss(side.color) || '#000'}`;
}

// 'B71' -> { r:71, c:2 } (indices 1-based).
function a1ToRC(a1) {
  const m = /^([A-Z]+)(\d+)$/.exec(a1);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { r: parseInt(m[2], 10), c };
}
// 2 -> 'B'
function colLetter(c) {
  let s = '';
  while (c > 0) { s = String.fromCharCode(65 + ((c - 1) % 26)) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

// Convertit une feuille ExcelJS en grille stylée (sérialisable, rendue sans ExcelJS) :
// texte formaté, couleurs de fond, polices, bordures, alignements, fusions, largeurs
// de colonnes et hauteurs de lignes — pour coller au rendu du fichier d'origine.
function worksheetToStyledGrid(ws) {
  const rowCount = Math.min(ws.rowCount || 0, GRID_MAX_ROWS);
  const colCount = Math.min(ws.columnCount || 0, GRID_MAX_COLS);
  if (!rowCount || !colCount) return { cols: [], rows: [], truncated: false };
  const truncated = (ws.rowCount || 0) > rowCount || (ws.columnCount || 0) > colCount;

  // Fusions -> ancres (span à appliquer) + cellules couvertes (à sauter).
  const covered = new Set();
  const anchors = new Map();
  for (const rangeStr of ws.model.merges || []) {
    const [a, b] = rangeStr.split(':');
    const s = a1ToRC(a);
    const e = a1ToRC(b || a);
    anchors.set(`${s.r},${s.c}`, { rowspan: e.r - s.r + 1, colspan: e.c - s.c + 1 });
    for (let r = s.r; r <= e.r; r++)
      for (let c = s.c; c <= e.c; c++)
        if (r !== s.r || c !== s.c) covered.add(`${r},${c}`);
  }

  // Largeur Excel de base (px) par colonne.
  const excelPx = [];
  for (let c = 1; c <= colCount; c++) {
    const w = ws.getColumn(c).width;
    excelPx[c] = w ? Math.round(w * 7 + 5) : 64;
  }
  // Longueur max du contenu par colonne (cellules simples) -> auto-ajustement.
  const colMaxChars = new Array(colCount + 1).fill(0);

  const rows = [];
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= colCount; c++) {
      const key = `${r},${c}`;
      if (covered.has(key)) continue; // absorbée par l'ancre de fusion
      const cell = row.getCell(c);
      const span = anchors.get(key);

      // cell.text peut lever (MergeValue.toString sur une valeur null) : on protège.
      let text = '';
      try {
        const t = cell.text;
        text = typeof t === 'string' ? t : t == null ? '' : String(t);
      } catch {
        text = '';
      }
      if (text === '[object Object]') text = '';

      // Auto-ajustement : on ne compte que les cellules simples (non fusionnées)
      // et sans retour à la ligne, pour ne pas gonfler une colonne à cause d'un
      // titre étalé ou d'un paragraphe destiné à wrapper.
      const wrap = cell.alignment && cell.alignment.wrapText;
      if ((!span || span.colspan === 1) && !wrap && text.length > colMaxChars[c]) {
        colMaxChars[c] = text.length;
      }

      const font = cell.font || {};
      const align = cell.alignment || {};
      const bd = cell.border || {};
      const fill = cell.fill;
      const bg = fill && fill.type === 'pattern' && fill.pattern === 'solid'
        ? excelColorToCss(fill.fgColor)
        : null;
      const style = {
        fontWeight: font.bold ? 700 : undefined,
        fontStyle: font.italic ? 'italic' : undefined,
        textDecoration: font.underline ? 'underline' : undefined,
        fontSize: font.size ? font.size + 'pt' : undefined,
        fontFamily: font.name || undefined,
        color: excelColorToCss(font.color) || undefined,
        background: bg || undefined,
        textAlign: align.horizontal || (typeof cell.value === 'number' ? 'right' : undefined),
        verticalAlign: align.vertical === 'middle' ? 'middle' : align.vertical === 'bottom' ? 'bottom' : 'top',
        whiteSpace: align.wrapText ? 'normal' : 'nowrap',
        borderTop: borderCss(bd.top),
        borderRight: borderCss(bd.right),
        borderBottom: borderCss(bd.bottom),
        borderLeft: borderCss(bd.left),
      };
      cells.push({ text, rowspan: span ? span.rowspan : 1, colspan: span ? span.colspan : 1, style });
    }
    rows.push({ num: r, height: row.height ? Math.round(row.height * 1.34) : undefined, cells });
  }

  // Largeur finale = max(largeur Excel, largeur du contenu), bornée [44, 460] px :
  // les valeurs ne sont plus tronquées, le tout scrollable horizontalement.
  const cols = [];
  for (let c = 1; c <= colCount; c++) {
    const contentPx = colMaxChars[c] * 6.6 + 12;
    const width = Math.round(Math.max(44, Math.min(460, Math.max(excelPx[c], contentPx))));
    cols.push({ letter: colLetter(c), width });
  }

  return { cols, rows, truncated };
}

// Rendu grille « type Excel Online » : en-têtes de colonnes/lignes figés, largeurs
// et hauteurs d'origine, styles de cellules appliqués (couleurs, bordures, police).
const SheetGrid = ({ grid }) => {
  if (!grid || !grid.rows.length) {
    return <div className="p-10 text-center text-sm text-slate-400">Feuille vide.</div>;
  }
  return (
    <table className="excel-styled">
      <colgroup>
        <col style={{ width: 46 }} />
        {grid.cols.map((c, i) => (
          <col key={i} style={{ width: (c.width || 64) + 'px' }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="excel-corner" />
          {grid.cols.map((c, i) => (
            <th key={i} className="excel-colhead">{c.letter}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row) => (
          <tr key={row.num} style={row.height ? { height: row.height + 'px' } : undefined}>
            <th className="excel-rowhead">{row.num}</th>
            {row.cells.map((cell, i) => (
              <td
                key={i}
                className="excel-cell"
                rowSpan={cell.rowspan}
                colSpan={cell.colspan}
                title={cell.text || undefined}
                style={cell.style}
              >
                {cell.text}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ---------- Visualiseur de document projet (.xlsm renvoyé par le flux) ----------
// Bouton « Voir le document » : appelle DOCUMENT_FLOW_URL avec { CodePJ: <code
// projet> }, récupère le binaire brut du classeur Excel, le parse côté navigateur
// (SheetJS) et affiche chaque feuille en grille « type Excel Online » dans une
// modale (onglets). Un bouton « Télécharger » sert de secours (fichier brut).
const DocumentViewer = ({ codePJ }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const [sheets, setSheets] = useState([]); // [{ name, cols, rows, truncated }]
  const [active, setActive] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);

  const code = (codePJ || '').trim();

  const load = async () => {
    if (!code) return;
    setOpen(true);
    setStatus('loading');
    setMessage('');
    setSheets([]);
    setActive(0);
    try {
      const res = await fetch(DOCUMENT_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CodePJ: code }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${t ? ` — ${t.slice(0, 200)}` : ''}`);
      }
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength === 0) {
        throw new Error(`Réponse vide : aucun document trouvé pour « ${code} ».`);
      }
      // URL de téléchargement de secours : on garde le fichier brut tel quel.
      const blob = new Blob([buf], {
        type: 'application/vnd.ms-excel.sheet.macroenabled.12',
      });
      const url = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      // Parsing ExcelJS (chargé à la demande pour ne pas alourdir le bundle initial)
      // -> une grille stylée par feuille (couleurs, bordures, police, fusions…).
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const parsed = wb.worksheets.map((ws) => ({
        name: ws.name,
        ...worksheetToStyledGrid(ws),
      }));
      setSheets(parsed);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Erreur lors de la récupération du document.');
    }
  };

  // Libère l'URL blob au démontage (évite les fuites mémoire).
  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  return (
    <>
      <Button
        type="button"
        onClick={load}
        disabled={!code || status === 'loading'}
        variant="outline"
        className="h-11 border-sky-300 text-sky-700 hover:bg-sky-50"
      >
        {status === 'loading' ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Eye className="w-4 h-4 mr-2" />
        )}
        Voir le document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-5 py-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-600" />
              Document — {code}
            </DialogTitle>
          </DialogHeader>

          {status === 'loading' && (
            <div className="flex items-center justify-center py-24 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement du document…
            </div>
          )}

          {status === 'error' && (
            <div className="m-5 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-700">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words">{message}</span>
            </div>
          )}

          {status === 'success' && sheets.length > 0 && (
            <div className="flex flex-1 min-h-0 flex-col">
              <style>{`
                .excel-styled { border-collapse: collapse; table-layout: fixed; font-size: 11px; color: #000; background: #fff; font-family: Calibri, 'Segoe UI', sans-serif; }
                .excel-styled th, .excel-styled td {
                  padding: 1px 5px; overflow: hidden; text-overflow: ellipsis;
                  vertical-align: top; height: 20px; line-height: 1.3;
                }
                .excel-styled .excel-cell { border: 1px solid #e6e8eb; background: #fff; }
                .excel-colhead { position: sticky; top: 0; z-index: 2; background: #f3f4f6;
                  text-align: center; font-weight: 600; color: #64748b;
                  box-shadow: inset -1px -1px 0 #cbd5e1; }
                .excel-rowhead { position: sticky; left: 0; z-index: 1; background: #f3f4f6;
                  text-align: center; font-weight: 500; color: #64748b;
                  box-shadow: inset -1px -1px 0 #cbd5e1; }
                .excel-corner { position: sticky; left: 0; top: 0; z-index: 3; background: #e2e8f0;
                  box-shadow: inset -1px -1px 0 #cbd5e1; }
              `}</style>
              {sheets.length > 1 && (
                <div className="shrink-0 flex gap-1 overflow-x-auto px-4 pt-3 border-b border-slate-200 bg-slate-50">
                  {sheets.map((s, i) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setActive(i)}
                      className={cn(
                        'shrink-0 rounded-t-md px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
                        i === active
                          ? 'border-sky-600 text-sky-700 bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {sheets[active]?.truncated && (
                <div className="shrink-0 px-4 py-1.5 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-200">
                  Aperçu limité aux {GRID_MAX_ROWS} premières lignes / {GRID_MAX_COLS} colonnes — utilisez « Télécharger » pour la feuille complète.
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto bg-slate-100 p-3">
                <SheetGrid grid={sheets[active]} />
              </div>
              {blobUrl && (
                <div className="shrink-0 flex justify-end px-5 py-3 border-t border-slate-200 bg-slate-50">
                  <a href={blobUrl} download={`${code}.xlsm`}>
                    <Button type="button" variant="outline" className="h-9">
                      <Download className="w-4 h-4 mr-2" /> Télécharger (.xlsm)
                    </Button>
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// ---------- Aperçu SAP : vue synthèse (style Synthèse FL) ----------
const SynthField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value !== '' && value != null ? value : '—'}</p>
  </div>
);

const SynthCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

const SapSynthesisDialog = ({ open, onOpenChange, data, zug }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
      <section className="bg-gradient-to-br from-slate-50 to-violet-50">
        <header className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 flex items-center gap-3">
          <Monitor className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">Synthèse SAP — aperçu</h2>
            <p className="text-xs text-violet-100">Consolidation des données article — lecture seule, rien n'est écrit dans SAP</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SynthCard title="Données de base" icon={Layers}>
            <SynthField label="Désignation" value={data.designation_article} />
            <SynthField label="Groupe article" value={data.groupe_article} />
            <SynthField label="Poids brut" value={data.poids_brut && `${data.poids_brut} g`} />
            <SynthField label="Poids net" value={data.poids_net && `${data.poids_net} g`} />
            <SynthField label="ZUG" value={zug} />
            <SynthField label="Groupe d'autorisation" value={data.groupe_autorisation} />
          </SynthCard>
          <SynthCard title="Ventes" icon={ShoppingCart}>
            <SynthField label="Client" value={data.client} />
            <SynthField label="Division (usine)" value={data.division} />
            <SynthField label="Secteur d'activité" value={data.marque} />
            <SynthField label="Hiérarchie produit" value={data.famille_produit} />
          </SynthCard>
          <SynthCard title="Comptabilité" icon={FileText}>
            <SynthField label="Division" value={data.division} />
            <SynthField label="Classe de valorisation" value={data.classe_valorisation} />
            <SynthField label="Contrôle prix" value={data.classe_valorisation ? 'S' : ''} />
          </SynthCard>
          <SynthCard title="Calcul du coût" icon={Settings2}>
            <SynthField label="Centre de profit" value={data.centre_profit} />
            <SynthField label="Groupe de frais généraux" value={data.groupe_frais_generaux} />
          </SynthCard>
        </div>
      </section>
    </DialogContent>
  </Dialog>
);

// ---------- Composant principal ----------
export default function CreerDE() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminLists = useAdminLists();
  const adminOptions = useAdminOptions();
  // Référentiels alimentés par SAP : lus depuis leurs tables Dataverse dédiées.
  const sapOptions = useSapOptions();
  // Groupe article (division) : ne conserver que les codes commençant par « PF ».
  const groupesArticleOptions = sapOptions.groupes_article.filter((o) =>
    String(o.value).toUpperCase().startsWith('PF'),
  );
  // Agen : liste restreinte aux groupes « PF-A… » (assortiments / surgelés Agen).
  const groupesArticleAgenOptions = groupesArticleOptions.filter((o) =>
    String(o.value).toUpperCase().startsWith('PF-A'),
  );
  // Hiérarchie produit famille : on ne propose que les familles 21 / 22 / 27.
  const hierarchieOptions = sapOptions.familles_produit.filter((o) =>
    ['21', '22', '27'].some((p) => String(o.value).startsWith(p)),
  );
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id'); // édition d'un brouillon local (localStorage)
  const projetIdParam = searchParams.get('projet_id'); // ouverture depuis Dataverse (mail / autre poste)
  const typeParam = searchParams.get('type'); // 'de' | 'ds' : création directe (plus d'écran de choix)
  const openingExistingInit = !!(editId || projetIdParam);

  // Plus d'écran de sélection : en création, on entre directement dans le bon
  // formulaire selon ?type (défaut DE). En ouverture d'un existant, les effets
  // de chargement (editDE / projetDV / dsDV) fixent le type et passent en 'form'.
  const [step, setStep] = useState(openingExistingInit ? 'selection' : 'form');
  const [formType, setFormType] = useState(
    openingExistingInit ? null : typeParam === 'ds' ? 'autre' : 'de'
  ); // 'de' | 'autre'

  const [formData, setFormData] = useState({
    // DE / DE/DL
    code_projet: '',
    axe_strategique: '',
    date_demande: new Date().toISOString().slice(0, 10),
    reseau: '',
    type_demande_de: '',
    demandeur: '',
    famille_produit: '',
    designation_article: '',
    marque: '',
    client: '',
    categorie: '',
    date_lancement: '',
    type_logistique: '',
    date_echantillon: '',
    date_mise_dispo: '',
    poids_op: '',
    poids_brut: '',
    poids_net: '',
    volume: '',
    unite: '',
    qte_previsionnelle_annuelle: '',
    groupe_article: '',
    division: '',
    classe_valorisation: '',
    centre_profit: '',
    groupe_autorisation: '',
    groupe_frais_generaux: '',

    // Article d'origine (DE)
    besoin_vl: false,
    code_vl: '',
    besoin_nouveau_code: false,

    // Codes EAN (bloc optionnel) — codes générés à l'activation.
    besoin_ean: false,
    ean_uv: '',
    ean_carton: '',
    ean_palette: '',

    // GUID de la ligne cr04e_projet liée (Dataverse) — pour maj au lieu de recréer.
    projet_id: '',

    // Autre (DS)
    autre_demandeur: '',
    autre_date: new Date().toISOString().slice(0, 10),
    autre_service: '',
    autre_type_demande: '',
    autre_code_origine: '',
    autre_usine_fab: '',
    autre_usine_origine: '',
    autre_agen_type: '',
    autre_agen_choix: '',
    autre_description: '',
    autre_besoin_vl: false,
    autre_besoin_nouveau_code: false,
    autre_designation: '',
    autre_activite: '',
    autre_poids_net_uv: '',
    autre_type_marque: '',
    autre_hierarchie: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const { powerContext } = usePowerPlatform();
  const connectedUser =
    powerContext?.user?.fullName ||
    powerContext?.user?.userFullName ||
    powerContext?.user?.displayName ||
    '';
  useEffect(() => {
    if (formType === 'autre' && connectedUser && !formData.autre_demandeur) {
      setFormData((prev) => ({ ...prev, autre_demandeur: connectedUser }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, connectedUser]);

  // Mode édition : charge la DE existante et pré-remplit le formulaire.
  const { data: editDE } = useQuery({
    queryKey: ['demande_etude', editId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: editId }),
    enabled: !!editId,
    select: (d) => d[0] || null,
  });

  useEffect(() => {
    if (editDE) {
      setFormType(editDE.type_de || 'de');
      setFormData((prev) => ({ ...prev, ...editDE }));
      // Restaure le mode d'origine à partir des booléens persistés.
      setOrigineMode(
        editDE.besoin_vl ? 'vl' : editDE.besoin_nouveau_code ? 'nouveau_code' : null
      );
      // Restaure le code chapeau généré (« nouveau code ») : il vit dans le state
      // `nouveauCode` (hors formData), donc on le repeuple depuis code_chapeau
      // persisté, sinon le bouton « Envoyer vers SAP » resterait bloqué.
      if (editDE.besoin_nouveau_code && editDE.code_chapeau) {
        setNouveauCode(editDE.code_chapeau);
      }
      // Idem côté VL : le code résolu sauvegardé est le code_chapeau.
      if (editDE.besoin_vl && editDE.code_chapeau) {
        setVlResolvedCode(editDE.code_chapeau);
      }
      setStep('form');
    }
  }, [editDE]);

  // Ouverture depuis Dataverse (lien du mail « en attente de code chapeau », ou
  // reprise sur un autre poste) : on charge la ligne cr04e_projet et on préremplit
  // le formulaire DE. Ignoré si on est déjà en édition d'un brouillon local.
  const { data: projetDV } = useQuery({
    queryKey: ['projet-dataverse', projetIdParam],
    queryFn: () => getProjetById(projetIdParam),
    enabled: !!projetIdParam && !editId,
  });

  useEffect(() => {
    if (projetDV && !DS_STATUTS.includes(projetDV.statut)) {
      setFormType('de');
      setFormData((prev) => ({ ...prev, ...projetDV }));
      setStep('form');
    }
  }, [projetDV]);

  // Si le projet ouvert est une DS (statut DS), on le recharge au format DS.
  // On attend que sapOptions.divisions soit chargé pour que getDsById puisse
  // résoudre les reverse-lookups (division, classe, hiérarchie, centre profit).
  const { data: dsDV } = useQuery({
    queryKey: ['ds-dataverse', projetIdParam],
    queryFn: () => getDsById(projetIdParam, sapOptions),
    enabled: !!projetIdParam && !editId && !!(sapOptions.divisions && sapOptions.divisions.length),
  });
  useEffect(() => {
    if (dsDV && DS_STATUTS.includes(dsDV.statut)) {
      setFormType('autre');
      setFormData((prev) => ({ ...prev, ...dsDV }));
      setStep('form');
    }
  }, [dsDV]);

  // Champs volontairement EXCLUS de l'auto-remplissage beCPG : la Hiérarchie
  // produit famille est figée (21/22/27, référentiel SAP) et le Secteur
  // d'activité est saisi manuellement — beCPG ne doit pas les écraser.
  const BECPG_EXCLUDED_FIELDS = ['famille_produit', 'marque'];

  // Applique les champs récupérés depuis beCPG (écrase les valeurs existantes),
  // hors champs exclus. Retourne le nombre de champs réellement appliqués.
  const handleApplyBeCPG = (mapped) => {
    const filtered = Object.fromEntries(
      Object.entries(mapped || {}).filter(([k]) => !BECPG_EXCLUDED_FIELDS.includes(k))
    );
    setFormData((prev) => ({ ...prev, ...filtered }));
    void persistNewDropdownValues(filtered);
    return Object.keys(filtered).length;
  };

  // Crée dans Dataverse (comme un ajout Admin) les valeurs de dropdown renvoyées
  // par beCPG qui n'existent pas encore dans la liste correspondante.
  const persistNewDropdownValues = async (mapped) => {
    const additions = dropdownAdditionsFromMapping(mapped, adminLists);
    if (additions.length === 0) return;
    try {
      await Promise.all(
        additions.map((a) => createOptionSetValue(a.dropdownId, a.value))
      );
      queryClient.invalidateQueries({ queryKey: OPTIONSET_QUERY_KEY });
      toast({
        title: 'Listes mises à jour',
        description: `${additions.length} valeur(s) ajoutée(s) aux listes : ${additions
          .map((a) => a.value)
          .join(', ')}.`,
      });
    } catch (err) {
      toast({
        title: 'Ajout aux listes échoué',
        description:
          err?.message || "Impossible d'ajouter certaines valeurs aux listes déroulantes.",
        variant: 'destructive',
      });
    }
  };

  // DS : état de création/envoi SAP (partagé brouillon + créer + push ADV)
  const [isCreatingDs, setIsCreatingDs] = useState(false);
  const handleCreateDs = async (statut) => {
    if (isCreatingDs) return;
    setIsCreatingDs(true);
    try {
      const ctx = { sapOptions, statut };
      // Côté Commerce (brouillon / création), on ne conserve PAS de code chapeau :
      // il est créé par l'ADV au moment du push vers SAP (comme la DE).
      const dsData = { ...formData, code_chapeau: '' };
      let projetId = formData.projet_id;
      if (projetId) await updateDsFromForm(projetId, dsData, ctx);
      else {
        const created = await createDsFromForm(dsData, ctx);
        projetId = created?.cr04e_projetid || '';
      }
      queryClient.invalidateQueries({ queryKey: ['projets-de'] });
      toast({ title: 'DS enregistrée', description: statut === 'ds_brouillon' ? 'Brouillon enregistré.' : 'DS créée — en attente de création de code chapeau.' });
      navigate(createPageUrl('DemandesEtude'));
    } catch (err) {
      toast({ title: 'Échec de l\'enregistrement de la DS', description: err?.message || 'Erreur inconnue.', variant: 'destructive' });
    } finally {
      setIsCreatingDs(false);
    }
  };

  const triggerSapSendDs = async (effectiveCode) => {
    const body = {
      CodeChapeau: effectiveCode || codeChapeau || formData.code_chapeau || '',
      NomProduit: formData.autre_designation || '',
      HierarchieProduitFamille: (dsHierarchie || '').split(/\s+/)[0] || '',
      SecteurActivite: dsSecteur || '',
      PoidsNet: formData.autre_poids_net_uv === '' || formData.autre_poids_net_uv == null ? '' : String(formData.autre_poids_net_uv),
      DivisionUsine: dsDivisionFab || '',
      ClasseValorisation: dsClasseValo || '',
      CentreProfit: dsCentreProfit || '',
      GroupeAutorisation: '',
      GroupeFraisGeneraux: '',
      GroupeArticleDivision: '',
    };
    const res = await fetch(SAP_SEND_FLOW_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
    }
  };
  const handleDsPushSap = async () => {
    if (isCreatingDs) return;
    // Le code chapeau est obligatoire pour l'ADV avant l'envoi vers SAP.
    const effectiveCode = codeChapeau || formData.code_chapeau || '';
    if (!effectiveCode) {
      toast({
        title: 'Code chapeau requis',
        description: "Obtenez le code chapeau (« Besoin d'une VL » → « Demander mon code », ou « Besoin d'un nouveau code ») avant l'envoi vers SAP.",
        variant: 'destructive',
      });
      return;
    }
    setIsCreatingDs(true);
    try {
      await triggerSapSendDs(effectiveCode);
      if (formData.projet_id) await updateDsFromForm(formData.projet_id, { ...formData, code_chapeau: effectiveCode }, { sapOptions, statut: 'ds_validee' });
      queryClient.invalidateQueries({ queryKey: ['projets-de'] });
      toast({ title: 'DS envoyée vers SAP', description: 'La DS est passée en « DS validée ».' });
      navigate(createPageUrl('DemandesEtude'));
    } catch (err) {
      toast({ title: 'Échec envoi SAP', description: err?.message || 'Erreur inconnue.', variant: 'destructive' });
    } finally {
      setIsCreatingDs(false);
    }
  };

  // Soumission « Envoyer vers SAP » en cours (résolution VL + écriture projet +
  // flux). Désactive le bouton pour éviter un double-envoi (double création projet).
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sapPreviewOpen, setSapPreviewOpen] = useState(false); // aperçu "vue SAP"

  // Bloc « Article d'origine » (DE) : VL et nouveau code sont mutuellement exclusifs.
  // origine_mode pilote l'affichage / l'activation ('vl' | 'nouveau_code' | null).
  const [origine_mode, setOrigineMode] = useState(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [nouveauCode, setNouveauCode] = useState(''); // code chapeau renvoyé par le flux (affichage seul)
  // Mode VL : code chapeau résolu via le bouton « Demander mon code » (flux VL).
  const [vlResolvedCode, setVlResolvedCode] = useState('');
  const [isRequestingVlCode, setIsRequestingVlCode] = useState(false);

  const handleToggleVL = (checked) => {
    if (checked) {
      // Bascule vers VL : on annule un éventuel « nouveau code » déjà demandé
      // (mode + code affiché) pour éviter toute confusion. Les deux restent
      // librement interchangeables, sans retour arrière.
      setOrigineMode('vl');
      handleChange('besoin_vl', true);
      handleChange('besoin_nouveau_code', false);
      setNouveauCode('');
    } else {
      setOrigineMode(null);
      handleChange('besoin_vl', false);
      handleChange('code_vl', '');
      setVlResolvedCode('');
    }
  };

  // Bouton « Demander mon code » (VL) : appelle le flux VL avec le code de base
  // saisi et affiche le code chapeau renvoyé. Le code résolu sert ensuite à
  // l'envoi vers SAP (plus besoin de le re-demander). Si on change le code de
  // base, le code résolu est effacé (voir onChange du champ).
  const handleRequestVlCode = async () => {
    // En DS, la base VL est le « Code article d'origine » déjà saisi ; en DE c'est code_vl.
    const base = ((formType === 'autre' ? formData.autre_code_origine : formData.code_vl) || '').trim();
    if (!base) return;
    setIsRequestingVlCode(true);
    setVlResolvedCode('');
    try {
      const code = await requestVlCodeChapeau(base);
      setVlResolvedCode(code);
    } catch (err) {
      toast({
        title: 'Code chapeau VL non obtenu',
        description: `Impossible de récupérer le code à partir de la VL : ${err?.message || 'erreur inconnue'}.`,
        variant: 'destructive',
      });
    } finally {
      setIsRequestingVlCode(false);
    }
  };

  // Active/désactive le bloc EAN. À l'activation, génère un jeu de codes bidons
  // (UV / carton / palette) une seule fois ; à la désactivation, on les vide.
  const handleToggleEAN = (checked) => {
    if (checked) {
      handleChange('besoin_ean', true);
      if (!formData.ean_uv) {
        setFormData((prev) => ({ ...prev, ...genEANSet() }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        besoin_ean: false,
        ean_uv: '',
        ean_carton: '',
        ean_palette: '',
      }));
    }
  };

  // Déclenche le flux Power Automate qui génère le prochain code chapeau.
  const handleDemanderNouveauCode = async () => {
    // Active le mode « nouveau code » : décoche / masque la VL.
    setOrigineMode('nouveau_code');
    handleChange('besoin_vl', false);
    handleChange('code_vl', '');
    handleChange('besoin_nouveau_code', true);
    setIsRequestingCode(true);
    setNouveauCode('');
    try {
      // Déclenchement sans corps ; on attend la réponse du flux (le code chapeau).
      const res = await fetch(NOUVEAU_CODE_FLOW_URL, { method: 'POST' });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      // Le code vient normalement du corps. Repli best-effort sur des en-têtes
      // (noms ASCII valides uniquement ; get() lève sur un nom invalide).
      const readHeader = (h) => {
        try { return res.headers.get(h); } catch { return null; }
      };
      const headerCode = ['reponse', 'response', 'code', 'code_chapeau']
        .map(readHeader)
        .find((v) => v != null && v !== '');
      const code = extractCodeChapeau(text) || (headerCode ? String(headerCode).trim() : '');
      if (!code) {
        throw new Error('Réponse du flux vide : le code doit être renvoyé dans le corps (Body) de l\'action Réponse.');
      }
      // Affichage seul : le code n'est pas stocké dans la DE.
      setNouveauCode(code);
    } catch (err) {
      toast({
        title: 'Échec de la demande de nouveau code',
        description: err?.message || 'Une erreur est survenue lors de la demande.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Mode VL : résout le vrai code chapeau à partir du code de base saisi.
  // Appelle VL_CODE_FLOW_URL avec { "Numéro": <code de base> } et renvoie le code
  // chapeau (texte simple, ex. « 741603 »). BLOQUANT côté appelant : sans ce code
  // on ne peut pas enchaîner le process classique.
  const requestVlCodeChapeau = async (numero) => {
    const res = await fetch(VL_CODE_FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'Numéro': numero }),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
    }
    const code = extractCodeChapeau(text);
    if (!code) {
      throw new Error("Réponse du flux VL vide : le code chapeau doit être renvoyé dans le corps (Body) de l'action Réponse.");
    }
    return code;
  };

  // Déclenche le flux Power Automate de validation avec le code chapeau dans le
  // corps { "Numéro": <code> }. Non bloquant : un échec n'empêche pas la
  // validation de la DE, il affiche seulement un avertissement.
  const triggerValidationFlow = async (numero) => {
    try {
      const res = await fetch(VALIDATION_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'Numéro': numero }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
    } catch (err) {
      toast({
        title: 'Flux non déclenché',
        description: `La DE est validée, mais l'appel au flux a échoué : ${err?.message || 'erreur inconnue'}.`,
        variant: 'destructive',
      });
    }
  };

  // Envoi vers SAP : POST l'ensemble des champs de la DE au flux dédié. On envoie
  // les CODES bruts (formData.<champ> = code, pas le libellé « code — désignation »).
  // La hiérarchie produit est figée (« 21 DE DE DE ») -> on n'envoie que le code
  // de tête (« 21 »). Non bloquant : un échec n'annule pas la validation.
  const triggerSapSend = async (codeChapeau) => {
    const hierarchieCode = (formData.famille_produit || '').trim().split(/\s+/)[0] || '';
    const body = {
      CodeChapeau: codeChapeau || '',
      NomProduit: formData.designation_article || '',
      HierarchieProduitFamille: hierarchieCode,
      SecteurActivite: formData.marque || '',
      PoidsNet: formData.poids_net === '' || formData.poids_net == null ? '' : String(formData.poids_net),
      DivisionUsine: formData.division || '',
      ClasseValorisation: formData.classe_valorisation || '',
      CentreProfit: formData.centre_profit || '',
      GroupeAutorisation: formData.groupe_autorisation || '',
      GroupeFraisGeneraux: formData.groupe_frais_generaux || '',
      GroupeArticleDivision: formData.groupe_article || '',
    };
    try {
      const res = await fetch(SAP_SEND_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
    } catch (err) {
      toast({
        title: 'Envoi SAP non déclenché',
        description: `La DE est validée, mais l'envoi vers SAP a échoué : ${err?.message || 'erreur inconnue'}.`,
        variant: 'destructive',
      });
    }
  };


  // Valeurs calculées DS (dérivées en direct, sans useMemo)
  const dsCtx = {
    usine: formData.autre_usine_fab,
    type_demande: formData.autre_type_demande,
    activite: formData.autre_activite,
    agen_type: formData.autre_agen_type,
    agen_choix: formData.autre_agen_choix,
  };
  // Phase de dev : un override manuel (`_ds_*_ovr`) gagne sur le calcul, puis repli
  // sur le calcul, puis sur le snapshot persisté (`_ds_*`) d'une DS rouverte.
  const dsOvr = (ovrKey, computed, snapKey) =>
    (formData[ovrKey] || '') || computed || formData[snapKey] || '';
  const dsDivisionOrigine = dsOvr('_ds_division_origine_ovr', codeDivisionOrigine(formData.autre_usine_origine), '_ds_division_origine');
  const dsDivisionFab = dsOvr('_ds_division_fab_ovr', codeDivisionFabrication(dsCtx), '_ds_division_fab');
  const dsHierarchie = dsOvr('_ds_hierarchie_ovr', computeHierarchieDS(formData.autre_activite), '_ds_hierarchie');
  const dsClasseValo = dsOvr('_ds_classe_valo_ovr', computeClasseValoDS(dsCtx), '_ds_classe_valo');
  const dsCentreProfit = dsOvr('_ds_centre_profit_ovr', computeCentreProfitDS(dsCtx), '_ds_centre_profit');
  const dsSecteur = dsOvr('_ds_secteur_ovr', computeSecteurDS(formData.autre_type_marque), '_ds_secteur');
  // DS validée : fiche en lecture seule (consultation, aucune modification possible).
  const dsReadOnly = formType === 'autre' && formData.statut === 'ds_validee';
  // DE en lecture seule : étude terminée (validée), en phase DL, ou refusée.
  // Brouillon et en_attente_cc restent éditables (création / obtention du code chapeau).
  const DE_READONLY_STATUTS = ['validee', 'en_attente_dl', 'en_attente_validation_dl', 'refusee'];
  const deReadOnly = formType === 'de' && DE_READONLY_STATUTS.includes(formData.statut);
  const dsUsinesOrigine = USINES_ORIGINE.filter(
    (u) => u !== 'Produit négoce' || isTypeNegoce(formData.autre_type_demande),
  );

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? base44.entities.DemandeEtude.update(editId, data)
        : base44.entities.DemandeEtude.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes_etude'] });
      queryClient.invalidateQueries({ queryKey: ['projets-de'] });
      navigate(createPageUrl('DemandesEtude'));
    }
  });

  // ZUG = poids net × 1000 (auto). Phase de dev : éditable -> une saisie manuelle
  // (formData.zug) surcharge le calcul et alimente l'envoi SAP.
  const zugAuto = formData.poids_net === '' ? '' : Number(formData.poids_net) * 1000;
  const zug = formData.zug === '' || formData.zug == null ? zugAuto : Number(formData.zug);

  // ---- Règles DE pilotées par la division (usine) et le réseau (lib/deRules) ----
  // Liste Division restreinte aux 4 sites de fabrication.
  const deDivisionOptions = sapOptions.divisions.filter((o) =>
    DE_DIVISION_CODES.includes(String(o.value)),
  );
  const deHierarchie = computeHierarchieDE(formData.division);
  const deClasseValo = computeClasseValoDE(formData.division);
  const deCentreProfitAuto = computeCentreProfitDE(formData.division);
  // Groupe article verrouillé (Bonloc/Rivesaltes uniquement) vs défaut Agen.
  const deGroupeArticleLocked = computeGroupeArticleLockedDE(formData.division);
  const deSecteur = computeSecteurFromReseau(formData.reseau);
  const deAgenWarning = needsSurgeleWarningDE(formData.division);

  // Reporte les valeurs calculées dans formData (envoi SAP / écriture Dataverse).
  // Champs verrouillés : toujours forcés à la valeur de la règle. Champs libres
  // (centre de profit Agen, groupe article Agen/Aire) : on ne pose qu'un DÉFAUT
  // quand le champ est vide, sans écraser une saisie de l'utilisateur ni une
  // valeur restaurée d'un brouillon.
  useEffect(() => {
    if (formType !== 'de') return;
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      const force = (k, v) => {
        if (v && prev[k] !== v) {
          next[k] = v;
          changed = true;
        }
      };
      const setDefault = (k, v) => {
        if (v && !prev[k]) {
          next[k] = v;
          changed = true;
        }
      };
      force('famille_produit', deHierarchie);
      force('classe_valorisation', deClasseValo);
      force('centre_profit', deCentreProfitAuto); // Aire/Bonloc/Rivesaltes
      force('marque', deSecteur);
      force('groupe_article', deGroupeArticleLocked); // Bonloc/Rivesaltes
      // Agen : PF-AS par défaut (modifiable car « vérifier surgelé »).
      if (deAgenWarning) setDefault('groupe_article', computeGroupeArticleDE(formData.division));
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, formData.division, formData.reseau]);

  const handleSaveBrouillon = async () => {
    let projetId = formData.projet_id;
    // Pour une DE, on reflète le brouillon dans cr04e_projet (Dataverse) pour
    // qu'il apparaisse dans la liste. Non bloquant : si Dataverse échoue, le
    // brouillon est tout de même enregistré localement.
    if (formType === 'de') {
      const ctx = { codeChapeau, zug, sapOptions, statut: PROJET_STATUT.brouillon };
      try {
        if (projetId) {
          await updateProjetFromDE(projetId, formData, ctx);
        } else {
          const created = await createProjetFromDE(formData, ctx);
          projetId = created?.cr04e_projetid || '';
        }
      } catch (err) {
        toast({
          title: 'Projet non synchronisé',
          description: `Brouillon enregistré localement, mais la synchro Dataverse a échoué : ${err?.message || 'erreur inconnue'}.`,
          variant: 'destructive',
        });
      }
    }
    // On persiste AUSSI le code chapeau dans le brouillon local : sinon le code
    // VL / nouveau code (state `nouveauCode`, hors formData) est perdu à la
    // réouverture du brouillon. Stocké ici, il est restauré au chargement (voir
    // l'effet editDE plus haut) pour repeupler le bloc « Article d'origine ».
    saveMutation.mutate({
      ...formData,
      projet_id: projetId,
      zug,
      type_de: formType,
      code_chapeau: codeChapeau,
      statut: 'brouillon',
    });
  };

  // Code chapeau issu du bloc « Article d'origine ». Dans les deux modes il est
  // désormais RÉSOLU en amont (bouton « Demander mon code » côté VL, ou flux
  // « nouveau code »), donc l'envoi vers SAP n'a plus à le re-demander.
  const codeChapeau =
    origine_mode === 'nouveau_code'
      ? (nouveauCode || '').trim()
      : origine_mode === 'vl'
        ? (vlResolvedCode || '').trim()
        : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Pour une DE, la validation est bloquée tant qu'aucun code chapeau n'a été
    // obtenu (VL saisie ou nouveau code demandé).
    if (formType === 'de' && !codeChapeau) {
      toast({
        title: 'Code chapeau requis',
        description: "Coche « Besoin d'une VL » puis clique « Demander mon code », ou clique « Besoin d'un nouveau code ».",
        variant: 'destructive',
      });
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
    // Le code chapeau est déjà résolu en amont (bouton « Demander mon code » en VL,
    // ou flux « nouveau code »). On l'utilise directement pour le process classique.
    const effectiveCode = codeChapeau;
    // Écriture de la ligne cr04e_projet (BLOQUANT : on n'avance pas si ça échoue,
    // la table Projet est la sortie principale de l'envoi vers SAP). Statut
    // « en attente de DL » => la partie DE est validée. Maj si un projet existe
    // déjà (brouillon), sinon création.
    // On capture le GUID du projet Dataverse pour le stocker sur la DE locale :
    // indispensable pour que la phase DL puisse mettre à jour cr04e_statut_en_cours.
    let projetId = formData.projet_id;
    if (formType === 'de') {
      const ctx = { codeChapeau: effectiveCode, zug, sapOptions, statut: PROJET_STATUT.en_attente_dl };
      try {
        if (projetId) {
          await updateProjetFromDE(projetId, formData, ctx);
        } else {
          const created = await createProjetFromDE(formData, ctx);
          projetId = created?.cr04e_projetid || '';
        }
      } catch (err) {
        toast({
          title: 'Envoi vers SAP échoué',
          description: `La DE n'a pas été envoyée : ${err?.message || 'erreur inconnue'}.`,
          variant: 'destructive',
        });
        return;
      }
    }
    // Déclenche les flux (non bloquant : on attend l'envoi avant de naviguer,
    // mais un échec ne stoppe pas la DE) :
    //  - notification « en attente de DL » (code chapeau seul) ;
    //  - envoi vers SAP (ensemble des champs).
    if (formType === 'de') await triggerSapSend(effectiveCode);
    if (effectiveCode) await triggerValidationFlow(effectiveCode);
    // La DE passe direct en phase DL.
    saveMutation.mutate({
      ...formData,
      projet_id: projetId,
      zug,
      type_de: formType,
      code_division_calc: dsDivisionFab,
      classe_valorisation_calc: dsClasseValo,
      centre_profit_calc: dsCentreProfit,
      secteur_activite_calc: dsSecteur,
      code_chapeau: effectiveCode,
      date_code_chapeau: effectiveCode ? new Date().toISOString() : null,
      statut: 'en_attente_dl',
    });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouverture d'un enregistrement existant depuis la liste (édition brouillon
  // local ou consultation/préremplissage Dataverse). Sert à NE PAS afficher
  // l'écran de choix de type au chargement, et à router le bouton retour.
  const isOpeningExisting = !!(editId || projetIdParam);

  const handleBack = () => {
    // Consultation/édition d'un enregistrement ouvert depuis la liste :
    // retour à la page précédente (et non à l'écran de choix de création).
    if (isOpeningExisting) {
      navigate(-1);
      return;
    }
    // Flux de création : retour à la liste (il n'y a plus d'écran de choix).
    navigate(createPageUrl('DemandesEtude'));
  };

  const formTitle =
    formType === 'de'
      ? 'Demande d\'Étude (DE)'
      : formType === 'autre'
          ? 'Demande Spécifique (DS)'
          : 'Nouvelle Demande';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {formTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Remplir les informations de la demande
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isOpeningExisting && step !== 'form' ? (
          // Chargement d'un enregistrement existant : spinner, jamais l'écran
          // de choix de type (évite le flash de la page de sélection).
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Encart « Récupération depuis beCPG » : visible en création d'une DE
                depuis zéro (et reprise de brouillon). Masqué à l'ouverture d'un
                projet en_attente_cc (projet_id) : le mapping des champs est alors
                automatique (toFormData + cascade deRules), même comportement que
                l'import beCPG manuel. */}
            {formType === 'de' && !projetIdParam && (
              <RecupererBeCPG onApply={handleApplyBeCPG} />
            )}

            {/* Document projet : accessible dès que le code projet est renseigné,
                en création comme en visualisation. Placé HORS du <fieldset disabled>
                pour rester cliquable en lecture seule. */}
            {formType === 'de' && formData.code_projet?.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-sky-800">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Document lié au projet <span className="font-semibold">{formData.code_projet.trim()}</span></span>
                </div>
                <DocumentViewer codePJ={formData.code_projet} />
              </div>
            )}

            {formType === 'de' && (
              <fieldset disabled={deReadOnly} className="space-y-6 border-0 p-0 m-0 min-w-0 disabled:opacity-95">
                {deReadOnly && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
                    Demande d'Étude — fiche en lecture seule.
                  </div>
                )}
                <FormSection title="Informations générales" icon={FileText}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Code projet" required>
                      <Input
                        value={formData.code_projet}
                        onChange={(e) => handleChange('code_projet', e.target.value)}
                        placeholder="Ex: PRJ-2026-001"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Date de la demande" required>
                      <Input
                        type="date"
                        value={formData.date_demande}
                        onChange={(e) => handleChange('date_demande', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                    <Field label="Axe stratégique">
                      <SearchableSelect
                        value={formData.axe_strategique}
                        onChange={(v) => handleChange('axe_strategique', v)}
                        options={buildOptions(
                          AXES_STRATEGIQUES_DE.map((v) => ({ value: v })),
                          formData.axe_strategique,
                        )}
                        placeholder="Budget / Hors budget"
                      />
                    </Field>
                    <Field label="Réseau" required>
                      <SearchableSelect
                        value={formData.reseau}
                        onChange={(v) => handleChange('reseau', v)}
                        options={buildOptions(adminOptions.reseaux, formData.reseau)}
                        placeholder="Sélectionner un réseau"
                      />
                    </Field>
                    <Field label="Type de la demande">
                      <Select
                        key={`type-${formData.type_demande_de}`}
                        value={formData.type_demande_de}
                        onValueChange={(v) => handleChange('type_demande_de', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {withValue(TYPES_DEMANDE_DE, formData.type_demande_de).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Demandeur" required>
                      <Input
                        value={formData.demandeur}
                        onChange={(e) => handleChange('demandeur', e.target.value)}
                        placeholder="Nom et prénom"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Qté prévisionnelle annuelle">
                      <Input
                        type="number"
                        value={formData.qte_previsionnelle_annuelle}
                        onChange={(e) => handleChange('qte_previsionnelle_annuelle', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Division (Usine)" required hint="Sites de fabrication uniquement">
                      <SearchableSelect
                        value={formData.division}
                        onChange={(v) => handleChange('division', v)}
                        options={buildOptions(deDivisionOptions, formData.division)}
                        placeholder="Bonloc / Rivesaltes / Agen / Aire"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Produit" icon={Layers}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <Field label="Nom du produit / Désignation" required>
                        <Input
                          value={formData.designation_article}
                          onChange={(e) => handleChange('designation_article', e.target.value)}
                          placeholder="Ex: Yaourt nature 125g"
                          className="h-11"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Client" hint="Saisie libre — prérempli depuis beCPG">
                        <Input
                          value={formData.client}
                          onChange={(e) => handleChange('client', e.target.value)}
                          placeholder="Nom du client"
                          className="h-11"
                        />
                      </Field>
                    </div>
                    <ReadOnlyField
                      label="Hiérarchie produit famille"
                      value={formData.famille_produit || deHierarchie}
                      onChange={(v) => handleChange('famille_produit', v)}
                      options={hierarchieOptions}
                      hint="Selon la division (Pâtisseries → 22, Traiteur → 27)"
                    />
                    <ReadOnlyField
                      label="Secteur d'activité"
                      value={formData.marque || deSecteur}
                      onChange={(v) => handleChange('marque', v)}
                      options={adminOptions.secteurs_activite}
                      hint="Selon le réseau"
                    />
                    <Field label="Poids net">
                      <Input
                        type="number"
                        value={formData.poids_net}
                        onChange={(e) => handleChange('poids_net', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <Field label="ZUG" hint="Auto : poids net × 1000 (modifiable)">
                      <Input
                        type="number"
                        value={zug}
                        onChange={(e) => handleChange('zug', e.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </Field>
                    <ReadOnlyField
                      label="Classe de valorisation"
                      value={formData.classe_valorisation || deClasseValo}
                      onChange={(v) => handleChange('classe_valorisation', v)}
                      options={sapOptions.classes_valorisation}
                      hint="Production → 7012, Aire → 2038"
                    />
                    {deCentreProfitAuto ? (
                      <ReadOnlyField
                        label="Centre de profit"
                        value={formData.centre_profit || deCentreProfitAuto}
                        onChange={(v) => handleChange('centre_profit', v)}
                        options={sapOptions.centres_profit}
                        hint="Selon la division"
                      />
                    ) : (
                      <Field label="Centre de profit" hint="Choix libre (Agen)">
                        <SearchableSelect
                          value={formData.centre_profit}
                          onChange={(v) => handleChange('centre_profit', v)}
                          options={buildOptions(sapOptions.centres_profit, formData.centre_profit)}
                          placeholder="Sélectionner un centre"
                        />
                      </Field>
                    )}
                    <Field label="Groupe d'autorisation">
                      <SearchableSelect
                        value={formData.groupe_autorisation}
                        onChange={(v) => handleChange('groupe_autorisation', v)}
                        options={buildOptions(adminOptions.groupes_autorisation, formData.groupe_autorisation)}
                        placeholder="Sélectionner un groupe"
                      />
                    </Field>
                    <Field label="Groupe de frais généraux">
                      <SearchableSelect
                        value={formData.groupe_frais_generaux}
                        onChange={(v) => handleChange('groupe_frais_generaux', v)}
                        options={buildOptions(sapOptions.groupes_frais_generaux, formData.groupe_frais_generaux)}
                        placeholder="Sélectionner un groupe"
                      />
                    </Field>
                    {deGroupeArticleLocked ? (
                      <ReadOnlyField
                        label="Groupe article (division)"
                        value={formData.groupe_article || deGroupeArticleLocked}
                        onChange={(v) => handleChange('groupe_article', v)}
                        options={groupesArticleOptions}
                        hint="Selon la division"
                      />
                    ) : (
                      <Field
                        label="Groupe article (division)"
                        required
                        hint={deAgenWarning ? 'Agen — PF-AS par défaut, modifiable' : 'Choix libre (Aire)'}
                      >
                        <SearchableSelect
                          value={formData.groupe_article}
                          onChange={(v) => handleChange('groupe_article', v)}
                          options={buildOptions(
                            deAgenWarning ? groupesArticleAgenOptions : groupesArticleOptions,
                            formData.groupe_article,
                          )}
                          placeholder="Sélectionner un groupe"
                        />
                        {deAgenWarning && (
                          <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            ⚠️ Attention : vérifiez que vous avez bien un produit surgelé.
                          </p>
                        )}
                      </Field>
                    )}
                  </div>
                </FormSection>

                <FormSection title="Article d'origine" icon={Layers}>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={origine_mode === 'vl'}
                        onCheckedChange={(v) => handleToggleVL(!!v)}
                      />
                      <span className="text-sm font-medium text-foreground">Besoin d'une VL</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDemanderNouveauCode}
                      disabled={isRequestingCode}
                    >
                      {isRequestingCode ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      Besoin d'un nouveau code
                    </Button>
                  </div>

                  {origine_mode === 'vl' && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-medium text-sm">
                          Code d'article d'origine
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            value={formData.code_vl}
                            onChange={(e) => {
                              handleChange('code_vl', e.target.value);
                              setVlResolvedCode(''); // le code base change -> code résolu obsolète
                            }}
                            placeholder="Ex: 12345678"
                            maxLength={8}
                            className="h-11 font-mono max-w-[260px]"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleRequestVlCode}
                            disabled={!formData.code_vl.trim() || isRequestingVlCode}
                            className="h-10 bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                          >
                            {isRequestingVlCode ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Database className="w-4 h-4 mr-2" />
                            )}
                            Demander mon code
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Code à 6 ou 8 chiffres requis
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Emplacement partagé : affiche le code chapeau résolu, quel que
                      soit le mode (VL via « Demander mon code », ou nouveau code). */}
                  {codeChapeau && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 mt-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">
                          Code chapeau
                        </p>
                        <p className="text-3xl font-black font-mono text-emerald-900 leading-tight">
                          {codeChapeau}
                        </p>
                      </div>
                    </div>
                  )}
                </FormSection>

                <FormSection title="Codes EAN" icon={ShoppingCart}>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <Checkbox
                      checked={formData.besoin_ean}
                      onCheckedChange={(v) => handleToggleEAN(!!v)}
                    />
                    <span className="text-sm font-medium text-foreground">Besoin des codes EAN</span>
                  </label>

                  {formData.besoin_ean && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                      {[
                        { label: 'EAN UV', value: formData.ean_uv },
                        { label: 'EAN Carton', value: formData.ean_carton },
                        { label: 'EAN Palette', value: formData.ean_palette },
                      ].map((e) => (
                        <div
                          key={e.label}
                          className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3"
                        >
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-violet-700 mb-1">
                            {e.label}
                          </p>
                          <p className="text-lg font-mono font-bold text-foreground tracking-wide">
                            {e.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </FormSection>
              </fieldset>
            )}

            {formType === 'autre' && (
              <fieldset disabled={dsReadOnly} className="space-y-6 border-0 p-0 m-0 min-w-0 disabled:opacity-95">
                {dsReadOnly && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
                    DS validée — fiche en lecture seule.
                  </div>
                )}
                <FormSection title="Informations générales" icon={FileText}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Demandeur" required hint="Prérempli depuis l'utilisateur connecté">
                      <Input
                        value={formData.autre_demandeur}
                        onChange={(e) => handleChange('autre_demandeur', e.target.value)}
                        placeholder="Nom et prénom"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Date" required>
                      <Input
                        type="date"
                        value={formData.autre_date}
                        onChange={(e) => handleChange('autre_date', e.target.value)}
                        className="h-11"
                      />
                    </Field>
                    <Field label="Service" required hint="Saisie libre">
                      <Input
                        value={formData.autre_service}
                        onChange={(e) => handleChange('autre_service', e.target.value)}
                        placeholder="Service du demandeur"
                        className="h-11"
                      />
                    </Field>
                    <Field label="Type de demande" required>
                      <Select
                        value={formData.autre_type_demande}
                        onValueChange={(v) => handleChange('autre_type_demande', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_DEMANDE_AUTRE.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Panneau d'exemples des cas d'usage */}
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                      Cas d'usage — exemples
                    </p>
                    <div className="space-y-1.5">
                      {CAS_USAGE_EXEMPLES.map((c) => (
                        <div
                          key={c.value}
                          className={cn(
                            'rounded-lg px-3 py-2 text-xs border',
                            formData.autre_type_demande === c.value
                              ? 'bg-primary/10 border-primary/40 text-foreground'
                              : 'bg-card border-border text-muted-foreground',
                          )}
                        >
                          <span className="font-semibold">{c.value} — {c.titre}</span>
                          {c.exemple && <span className="block mt-0.5 italic">{c.exemple}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Field label="Description du besoin" hint="Saisie libre">
                    <textarea
                      value={formData.autre_description}
                      onChange={(e) => handleChange('autre_description', e.target.value)}
                      placeholder="Décrire le besoin…"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </Field>
                </FormSection>

                <FormSection title="Code d'origine" icon={Layers}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Usine de fabrication d'origine" required>
                      <Select
                        value={formData.autre_usine_origine}
                        onValueChange={(v) => handleChange('autre_usine_origine', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner une usine" />
                        </SelectTrigger>
                        <SelectContent>
                          {dsUsinesOrigine.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <ReadOnlyField
                      label="Code division d'origine"
                      value={dsDivisionOrigine}
                      onChange={(v) => handleChange('_ds_division_origine_ovr', v)}
                      options={sapOptions.divisions}
                      hint="Auto selon l'usine d'origine"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={origine_mode === 'vl'}
                        onCheckedChange={(v) => handleToggleVL(!!v)}
                      />
                      <span className="text-sm font-medium text-foreground">Besoin d'une VL</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDemanderNouveauCode}
                      disabled={isRequestingCode}
                    >
                      {isRequestingCode ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      Besoin d'un nouveau code
                    </Button>
                  </div>

                  {origine_mode === 'vl' && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-slate-700 font-medium text-sm">
                        Code article d'origine
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          value={formData.autre_code_origine}
                          onChange={(e) => {
                            handleChange('autre_code_origine', e.target.value);
                            setVlResolvedCode(''); // le code base change -> code résolu obsolète
                          }}
                          placeholder="Ex: 12345678"
                          maxLength={8}
                          className="h-11 font-mono max-w-[260px]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRequestVlCode}
                          disabled={!(formData.autre_code_origine || '').trim() || isRequestingVlCode}
                          className="h-10 bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                        >
                          {isRequestingVlCode ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4 mr-2" />
                          )}
                          Demander mon code
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Code à 6 ou 8 chiffres requis
                      </p>
                    </div>
                  )}

                  {/* Emplacement partagé : code chapeau résolu (VL ou nouveau code).
                      À la réouverture ADV, origine_mode n'est pas restauré : on retombe
                      donc sur formData.code_chapeau persisté pour rester visible. */}
                  {(codeChapeau || formData.code_chapeau) && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 mt-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">
                          Code chapeau
                        </p>
                        <p className="text-3xl font-black font-mono text-emerald-900 leading-tight">
                          {codeChapeau || formData.code_chapeau}
                        </p>
                      </div>
                    </div>
                  )}
                </FormSection>

                <FormSection title="Produit" icon={Settings2}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <Field label="Désignation article" required>
                        <Input
                          value={formData.autre_designation}
                          onChange={(e) => handleChange('autre_designation', e.target.value)}
                          placeholder="Désignation complète"
                          className="h-11"
                        />
                      </Field>
                    </div>

                    {isTypeNegoce(formData.autre_type_demande) ? (
                      <ReadOnlyField
                        label="Usine de fabrication"
                        value="Produit négoce (2820)"
                        hint="Forcé pour les types 4 et 5"
                      />
                    ) : (
                      <Field label="Usine de fabrication" required>
                        <Select
                          value={formData.autre_usine_fab}
                          onValueChange={(v) => handleChange('autre_usine_fab', v)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Sélectionner une usine" />
                          </SelectTrigger>
                          <SelectContent>
                            {USINES_FABRICATION.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}

                    <ReadOnlyField
                      label="Code division"
                      value={dsDivisionFab}
                      onChange={(v) => handleChange('_ds_division_fab_ovr', v)}
                      options={sapOptions.divisions}
                      hint="Auto selon l'usine de fabrication"
                    />

                    {formData.autre_usine_fab === 'Agen' && !isTypeNegoce(formData.autre_type_demande) && (
                      <>
                        <Field label="Agen — type" required>
                          <Select
                            value={formData.autre_agen_type}
                            onValueChange={(v) => handleChange('autre_agen_type', v)}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Surgelé / FF STEF / FF Autre" />
                            </SelectTrigger>
                            <SelectContent>
                              {AGEN_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Agen — choix" required>
                          <Select
                            value={formData.autre_agen_choix}
                            onValueChange={(v) => handleChange('autre_agen_choix', v)}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Assortiments / Pains / Plaques" />
                            </SelectTrigger>
                            <SelectContent>
                              {AGEN_CHOIX.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </>
                    )}

                    <Field label="Activité" required>
                      <Select
                        value={formData.autre_activite}
                        onValueChange={(v) => handleChange('autre_activite', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {DS_ACTIVITES.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <ReadOnlyField label="Hiérarchie de produits" value={dsHierarchie} onChange={(v) => handleChange('_ds_hierarchie_ovr', v)} options={hierarchieOptions} hint="Auto selon l'activité" />

                    <Field label="Poids net pour 1 UV (en kg)" required>
                      <Input
                        type="number"
                        step="0.001"
                        value={formData.autre_poids_net_uv}
                        onChange={(e) => handleChange('autre_poids_net_uv', e.target.value)}
                        placeholder="0.000"
                        className="h-11"
                      />
                    </Field>

                    <Field label="Type de marque" required>
                      <Select
                        value={formData.autre_type_marque}
                        onValueChange={(v) => handleChange('autre_type_marque', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {DS_TYPES_MARQUE.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <ReadOnlyField label="Secteur d'activité" value={dsSecteur} onChange={(v) => handleChange('_ds_secteur_ovr', v)} options={adminOptions.secteurs_activite} hint="Auto selon le type de marque" />
                  </div>
                </FormSection>

                <FormSection title="Champs calculés (SAP)" icon={Settings2}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ReadOnlyField label="Classe de valorisation" value={dsClasseValo} onChange={(v) => handleChange('_ds_classe_valo_ovr', v)} options={sapOptions.classes_valorisation} hint="Selon usine / type / activité" />
                    <ReadOnlyField label="Centre de profit" value={dsCentreProfit} onChange={(v) => handleChange('_ds_centre_profit_ovr', v)} options={sapOptions.centres_profit} hint="Selon usine / activité" />
                  </div>
                </FormSection>
              </fieldset>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {formType === 'autre' ? (
                formData.statut === 'ds_validee' ? (
                  // DS validée : lecture seule, aucune action.
                  null
                ) : formData.statut === 'en_attente_creation_code_chapeau' && formData.projet_id ? (
                  // DS ouverte par l'ADV : obtention du code chapeau puis push SAP
                  <div className="flex items-center gap-3">
                    {!(codeChapeau || formData.code_chapeau) && (
                      <span className="text-xs text-amber-700 italic">
                        Obtenez d'abord le code chapeau (VL ou nouveau code).
                      </span>
                    )}
                    <Button
                      type="button"
                      onClick={handleDsPushSap}
                      disabled={isCreatingDs || !(codeChapeau || formData.code_chapeau)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isCreatingDs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Envoyer vers SAP
                    </Button>
                  </div>
                ) : (
                  // DS créée par le Commerce
                  <>
                    <Button type="button" variant="outline" onClick={() => handleCreateDs('ds_brouillon')} disabled={isCreatingDs}>
                      <Save className="w-4 h-4 mr-2" /> Enregistrer brouillon
                    </Button>
                    <Button type="button" onClick={() => handleCreateDs('en_attente_creation_code_chapeau')} disabled={isCreatingDs} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {isCreatingDs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Créer la DS
                    </Button>
                  </>
                )
              ) : deReadOnly ? (
                // DE en lecture seule : aucune action.
                null
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveBrouillon}
                    disabled={saveMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer brouillon
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                    disabled={isSubmitting || saveMutation.isPending || (formType === 'de' && !codeChapeau)}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Envoi en cours…' : 'Envoyer vers SAP'}
                  </Button>
                </>
              )}
            </div>

            <SapSynthesisDialog
              open={sapPreviewOpen}
              onOpenChange={setSapPreviewOpen}
              data={formData}
              zug={zug}
            />
          </form>
        )}
      </main>
    </div>
  );
}
