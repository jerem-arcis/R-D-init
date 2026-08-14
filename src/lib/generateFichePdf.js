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

  // Conteneur de rendu à la largeur A4 « web » (794px ≈ 210mm @96dpi).
  // Placé à l'ORIGINE de l'écran (et non à left:-10000px) puis masqué derrière la
  // page : html2canvas positionne ses éléments à partir de coordonnées viewport,
  // et un hôte très loin hors-champ décale le rendu du texte. z-index négatif +
  // pointer-events:none le rendent invisible et inerte pour l'utilisateur.
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:0;top:0;width:794px;background:#ffffff;z-index:-9999;pointer-events:none;';
  host.innerHTML = buildFichePdfHtml(fiche, de);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 2,            // netteté
      useCORS: true,
      backgroundColor: '#ffffff',
      // Pas de windowWidth/scroll forcés : l'hôte est déjà à 794px à l'origine,
      // et surcharger la fenêtre désynchronise le repère de html2canvas.
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
    document.body.removeChild(host);
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
