import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ImprimableTab({ fiche, onUpdate }) {
  const printRef = useRef();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!printRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `FL_${fiche.code_article || 'fiche'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      pdf.save(filename);

      if (onUpdate) {
        await onUpdate({
          fl_exportee: true,
          date_export: new Date().toISOString(),
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const Section = ({ title, children }) => (
    <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
      <div className="bg-slate-100 px-3 py-2 border-b border-slate-300">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-3 bg-white">{children}</div>
    </div>
  );

  const Field = ({ label, value, className = '' }) => (
    <div className={`${className}`}>
      <span className="text-xs text-slate-500 font-medium">{label}: </span>
      <span className="text-sm text-slate-900 font-medium">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Fiche de Lancement Produit</h2>
          <p className="text-sm text-slate-500 mt-1">Version exportable (lecture seule)</p>
          {fiche.fl_exportee && fiche.date_export && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              ✓ Exportée le {format(new Date(fiche.date_export), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-gradient-to-r from-[#5B3A8E] to-[#7B4FB5] hover:from-[#4A2E75] hover:to-[#6A3FA0] text-white shadow-md hover:shadow-lg transition-all"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              {fiche.fl_exportee ? 'Réexporter en PDF' : 'Exporter en PDF'}
            </>
          )}
        </Button>
      </div>

      <div ref={printRef} className="bg-white p-6 rounded-xl border border-slate-200">
        {/* En-tête */}
        <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">
            Fiche de Lancement Produit
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {fiche.date_fiche_lancement 
              ? format(new Date(fiche.date_fiche_lancement), 'dd MMMM yyyy', { locale: fr })
              : format(new Date(), 'dd MMMM yyyy', { locale: fr })}
          </p>
          <div className="flex justify-center gap-8 mt-3">
            <span className="text-sm font-semibold">Code: {fiche.code_article || '—'}</span>
            <span className="text-sm font-semibold">Libellé: {fiche.libelle_article || '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origine de fabrication */}
          <Section title="Origine de Fabrication">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Fabrication/Négoce" value={fiche.fabrication_negoce} />
              <Field label="Origine" value={fiche.origine_fabrication} />
            </div>
          </Section>

          {/* Statut */}
          <Section title="Statut">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Statut de lancement" value={fiche.statut_lancement} />
              <Field label="Date FL" value={fiche.date_fiche_lancement} />
            </div>
          </Section>

          {/* Code racine */}
          <Section title="Code Racine">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code article" value={fiche.code_article} />
              <Field label="Code étude R&D" value={fiche.code_etude_rd} />
              <Field label="Ancien article" value={fiche.ancien_article} />
            </div>
          </Section>

          {/* Informations marketing */}
          <Section title="Informations Marketing">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Secteur d'activité" value={fiche.secteur_activite} />
              <Field label="Hiérarchie produit" value={fiche.hierarchie_produit} />
            </div>
          </Section>

          {/* Réseaux */}
          <Section title="Réseaux">
            <Field label="Canaux de vente" value={fiche.canaux_vente} />
            <Field label="Client" value={fiche.client} className="mt-1" />
          </Section>

          {/* Stockage */}
          <Section title="Stockage">
            <Field label="VL" value={fiche.vl} />
            <Field label="Sites de stockage" value={fiche.sites_stockage} className="mt-1" />
            <Field label="Groupement articles" value={fiche.groupement_articles} className="mt-1" />
          </Section>

          {/* Durée de vie */}
          <Section title="Durée de Vie">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Durée (industriel)" value={fiche.duree_vie_industriel} />
              <Field label="Durée (commerce)" value={fiche.duree_vie_commerce} />
              <Field label="Temps réception" value={fiche.temps_reception} />
            </div>
          </Section>

          {/* Marque */}
          <Section title="Marque">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Marque" value={fiche.marque} />
              <Field label="Code pays" value={fiche.code_pays} />
            </div>
          </Section>

          {/* Classification */}
          <Section title="Classification">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Éclatement groupe" value={fiche.eclatement_groupe_marchandise} />
              <Field label="Type usine" value={fiche.type_usine} />
              <Field label="Type magasin EM" value={fiche.type_magasin_em} />
            </div>
          </Section>

          {/* Libellé produit */}
          <Section title="Libellé Produit">
            <Field label="Libellé article" value={fiche.libelle_article} />
            <Field label="Libellé étiquette" value={fiche.libelle_produit_etiquette} className="mt-1" />
            <Field label="Libellé caisse" value={fiche.libelle_caisse} className="mt-1" />
            <Field label="Libellé client" value={fiche.libelle_client} className="mt-1" />
          </Section>

          {/* Définition produit */}
          <Section title="Définition Produit">
            <Field label="Désignation article" value={fiche.designation_article} />
            <Field label="Demande d'étude" value={fiche.demande_etude} className="mt-1" />
            <Field label="Libellés descriptifs" value={fiche.libelles_descriptifs_normalises} className="mt-1" />
          </Section>

          {/* Centre de profit */}
          <Section title="Centre de Profit">
            <Field label="Centre de profit (MARC-PRCTR)" value={fiche.centre_profit} />
          </Section>
        </div>

        {/* Caractéristiques physiques - pleine largeur */}
        <Section title="Caractéristiques Physiques">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="UVC" value={fiche.uvc} />
            <Field label="Colis" value={fiche.colis} />
            <Field label="Type palette" value={fiche.type_palette_industriel || fiche.type_palette_commerce} />
            <Field label="Nb UC/couche" value={fiche.nombre_uc_couche} />
            <Field label="Nb UC/palette" value={fiche.nombre_uc_palette} />
            <Field label="Longueur" value={fiche.dimension_longueur ? `${fiche.dimension_longueur} mm` : null} />
            <Field label="Largeur" value={fiche.dimension_largeur ? `${fiche.dimension_largeur} mm` : null} />
            <Field label="Hauteur" value={fiche.dimension_hauteur ? `${fiche.dimension_hauteur} mm` : null} />
            <Field label="Poids brut" value={fiche.poids_brut ? `${fiche.poids_brut} kg` : null} />
            <Field label="Poids net" value={fiche.poids_net ? `${fiche.poids_net} kg` : null} />
          </div>
        </Section>

        {/* Informations logistiques - pleine largeur */}
        <Section title="Informations Logistiques">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Clé lot usine" value={fiche.cle_calcul_lot_usine} />
            <Field label="Clé lot stockiste" value={fiche.cle_calcul_lot_stockiste} />
            <Field label="Famille arrangements" value={fiche.famille_produit_arrangements} />
            <Field label="Format date étiq." value={fiche.format_date_etiquette} />
            <Field label="Format DLUO étiq." value={fiche.format_dluo_etiquette} />
            <Field label="GTIN carton" value={fiche.gtin_carton} />
            <Field label="GTIN couche" value={fiche.gtin_couche} />
            <Field label="GTIN palette" value={fiche.gtin_palette} />
            <Field label="Coef. statistique" value={fiche.coefficient_statistique} />
            <Field label="Qté vendue 12 mois" value={fiche.quantite_vendue_12mois} />
          </div>
        </Section>

        {/* Pied de page */}
        <div className="mt-6 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
          <p>Document généré le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
        </div>
      </div>
    </div>
  );
}