// Moteur d'export PDF de la Fiche de Lancement.
//
// Rend le gabarit HTML (fichePdfTemplate) dans un conteneur hors-écran, le
// capture en image via html2canvas (fonds/dégradés inclus), puis l'insère dans
// un PDF A4 (jsPDF) et déclenche le téléchargement.
//
// Le contenu est TOUJOURS ramené sur UNE SEULE page A4 (ajustement « contain »).
// Si la fiche n'est pas assez remplie, on génère l'exemple complet (fichePdfDemo).
//
// jspdf & html2canvas sont importés dynamiquement pour ne pas alourdir le bundle
// initial (chargés au 1er export uniquement).

import { buildFichePdfHtml } from './fichePdfTemplate';
import { pickPdfSource } from './fichePdfDemo';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Construit le document jsPDF d'une fiche. Partagé par le téléchargement et par
// l'envoi au flux : un seul rendu, donc un seul gabarit à maintenir.
async function buildPdfDocument(fiche, de) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Rendu dans une IFRAME ISOLÉE (largeur A4 « web » 794px ≈ 210mm @96dpi).
  //
  // html2canvas CLONE l'élément cible dans le document HÔTE et hérite donc de SA
  // cascade CSS. Rendu directement dans la page de l'app, le CSS global (Tailwind
  // preflight : line-height/vertical-align, + police Inter) contaminait les
  // métriques de texte du gabarit et décalait le contenu (cases EAN remontées,
  // valeurs collées en haut de leurs boîtes). Une iframe vierge ne porte QUE le
  // <style> autonome du gabarit -> le rendu redevient fidèle au navigateur.
  // (Cause racine reproduite au pixel près : sans isolation = décalé, avec = OK.)
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:794px;height:10px;border:0;visibility:hidden;z-index:-9999;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"></head>` +
        `<body style="margin:0;background:#ffffff">${buildFichePdfHtml(fiche, de)}</body></html>`,
    );
    doc.close();

    const sheet = doc.querySelector('.fl-pdf-sheet');
    // L'iframe doit être assez haute pour contenir toute la fiche (sinon layout tronqué).
    iframe.style.height = `${sheet.scrollHeight + 40}px`;
    // Attendre les polices du document de l'iframe (data URI logo déjà décodé ;
    // pas de webfont ici, mais garantit une mise en page stable avant capture).
    if (doc.fonts && doc.fonts.ready) {
      await doc.fonts.ready;
    }

    const canvas = await html2canvas(sheet, {
      scale: 2,            // netteté
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Ajustement « contain » : on met à l'échelle pour que l'image tienne
    // ENTIÈREMENT sur une page, en conservant les proportions, centrée.
    const scale = Math.min(A4_WIDTH_MM / canvas.width, A4_HEIGHT_MM / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    const x = (A4_WIDTH_MM - w) / 2;
    const y = (A4_HEIGHT_MM - h) / 2;
    pdf.addImage(canvas, 'PNG', x, y, w, h, undefined, 'FAST');
    return pdf;
  } finally {
    document.body.removeChild(iframe);
  }
}

// Téléchargement depuis l'app. Reste disponible sans limite : aucun verrou, la
// fiche peut être exportée autant de fois que voulu, avant comme après l'envoi
// vers SAP.
export async function generateFichePdf(rawFiche = {}, rawDe = null) {
  const { fiche, de, isDemo } = pickPdfSource(rawFiche, rawDe);
  const pdf = await buildPdfDocument(fiche, de);
  const code = isDemo ? 'EXEMPLE' : fiche.code_article || 'fiche';
  pdf.save(`FL-${code}.pdf`);
}

// Même document, renvoyé en base64 pour transmission à un flux Power Automate
// (pièce jointe du mail d'alerte).
//
// Contrairement au téléchargement, AUCUN repli sur la fiche d'exemple : une
// alerte doit porter la vraie fiche ou rien. Le base64 est nu (sans en-tête
// « data:application/pdf;base64, ») pour être passé tel quel à base64ToBinary().
export async function generateFichePdfBase64(fiche = {}, de = null) {
  const pdf = await buildPdfDocument(fiche, de);
  const code = fiche.code_article || 'fiche';
  return {
    fileName: `FL-${code}.pdf`,
    base64: pdf.output('datauristring').split(',')[1],
  };
}
