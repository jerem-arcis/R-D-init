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

export async function generateFichePdf(rawFiche = {}, rawDe = null) {
  const { fiche, de, isDemo } = pickPdfSource(rawFiche, rawDe);

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Conteneur hors-écran à la largeur A4 « web » (794px ≈ 210mm @96dpi).
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;z-index:-1;';
  host.innerHTML = buildFichePdfHtml(fiche, de);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 2,            // netteté
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
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

    const code = isDemo ? 'EXEMPLE' : (fiche.code_article || 'fiche');
    pdf.save(`FL-${code}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
