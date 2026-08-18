// Moteur d'export PDF de la Fiche de Lancement — rendu VECTORIEL via react-pdf.
//
// Remplace l'ancien pipeline html2canvas → jsPDF (capture image, décalages de texte
// selon la cascade CSS/l'environnement). react-pdf produit un vrai PDF vectoriel :
// texte net, sélectionnable, positionné au point près.
//
// react-pdf et le document sont importés DYNAMIQUEMENT (chargés au 1er export
// seulement) pour ne pas alourdir le bundle initial.

import { pickPdfSource } from './fichePdfDemo';

// Construit le Blob PDF d'une fiche. Partagé par le téléchargement et l'envoi mail :
// un seul document à maintenir (FichePdfDocument.jsx).
async function buildPdfBlob(fiche, de) {
  const [{ pdf }, { buildFichePdfElement }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./FichePdfDocument'),
  ]);
  return pdf(buildFichePdfElement(fiche, de)).toBlob();
}

// Blob → base64 NU (sans l'en-tête « data:application/pdf;base64, »).
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('Lecture du blob échouée'));
    reader.readAsDataURL(blob);
  });
}

// Téléchargement depuis l'app. Aucune limite : la fiche peut être exportée autant
// de fois que voulu. Repli sur la fiche d'exemple si la fiche est trop peu remplie.
export async function generateFichePdf(rawFiche = {}, rawDe = null) {
  const { fiche, de, isDemo } = pickPdfSource(rawFiche, rawDe);
  const blob = await buildPdfBlob(fiche, de);
  const code = isDemo ? 'EXEMPLE' : fiche.code_article || 'fiche';
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `FL-${code}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Même document, renvoyé en base64 pour la pièce jointe du mail (flux Power Automate).
// Contrairement au téléchargement, AUCUN repli sur l'exemple : une alerte porte la
// vraie fiche ou rien.
export async function generateFichePdfBase64(fiche = {}, de = null) {
  const blob = await buildPdfBlob(fiche, de);
  const code = fiche.code_article || 'fiche';
  return {
    fileName: `FL-${code}.pdf`,
    base64: await blobToBase64(blob),
  };
}
