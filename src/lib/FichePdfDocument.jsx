// Document PDF VECTORIEL de la Fiche de Lancement (react-pdf).
//
// Remplace l'ancien rendu html2canvas (capture image, sujette aux décalages de
// texte selon la cascade CSS / l'environnement). Ici tout est vectoriel : texte
// net, sélectionnable, positionné au point près — aucun décalage possible.
// Identité Boncolac conservée (violet, logo, mêmes sections et données).

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { BONCOLAC_LOGO_DATA_URI } from '@/assets/boncolacLogo';
import { siteStockageLabel } from '@/lib/ficheSchema';
import {
  val, dims, dureeVie, eanChars, visaInfo, pillsList, formatDateShort, DASH,
} from './fichePdfData';

const C = {
  violet: '#45247a',
  violetMid: '#6a3fa0',
  violetDeep: '#2e164f',
  ink: '#241a3a',
  label: '#8b6fb8',
  border: '#e1d4f5',
  soft: '#f3eefb',
  box: '#f7f6fa',
  white: '#ffffff',
  green: '#2e7d32', greenBg: '#e8f5e9',
  amber: '#e65100', amberBg: '#fff3e0',
  red: '#c62828', redBg: '#fdecea',
  muted: '#a49db4',
};

const s = StyleSheet.create({
  page: { backgroundColor: C.white, color: C.ink, fontFamily: 'Helvetica', fontSize: 8 },

  // Hero
  hero: { backgroundColor: C.violet, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, gap: 10 },
  logoBox: { backgroundColor: C.white, borderRadius: 6, padding: 5, width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 36, height: 36, objectFit: 'contain' },
  heroTxt: { flexGrow: 1 },
  kicker: { fontSize: 7, letterSpacing: 1.6, color: '#d7c8f0', fontFamily: 'Helvetica-Bold' },
  h1: { fontSize: 15, color: C.white, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#fff3e0', color: C.amber, fontSize: 7.5, fontFamily: 'Helvetica-Bold', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 10, textTransform: 'uppercase' },
  racine: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  racineL: { fontSize: 6, letterSpacing: 1, color: '#e5daf7', textTransform: 'uppercase' },
  racineV: { fontSize: 12, color: C.white, fontFamily: 'Helvetica-Bold' },
  accent: { height: 3, backgroundColor: C.violetMid },

  // Body — pas de flexGrow (sinon il remplit la page et pousse le pied hors A4).
  body: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, gap: 4 },
  row: { flexDirection: 'row', gap: 6 },

  // Strip cells
  strip: { flexDirection: 'row', gap: 6 },
  cell: { flexGrow: 1, flexBasis: 0, backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8 },
  cellK: { fontSize: 6.5, letterSpacing: 0.8, color: C.label, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 1 },
  cellV: { fontSize: 10, color: C.violet, fontFamily: 'Helvetica-Bold' },

  // Card
  card: { borderWidth: 1, borderColor: '#e6e2ee', borderRadius: 6, overflow: 'hidden' },
  cardH: { backgroundColor: C.violet, color: C.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, textTransform: 'uppercase', paddingVertical: 4, paddingHorizontal: 9 },
  inner: { padding: 6 },

  // Field (label + value)
  fK: { fontSize: 6.5, letterSpacing: 0.4, color: C.label, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  fV: { fontSize: 8.5, color: C.ink, marginTop: 1 },
  fVbig: { fontSize: 9, color: C.violet, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  fVmuted: { fontSize: 8.5, color: C.muted, fontFamily: 'Helvetica-Oblique', marginTop: 1 },

  // EAN digit cells
  eanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  eanLabelBox: { width: 92 },
  digits: { flexDirection: 'row', gap: 2 },
  digit: { width: 13, height: 16, borderWidth: 1, borderColor: C.border, borderRadius: 2, backgroundColor: C.box, justifyContent: 'center', alignItems: 'center' },
  digitT: { fontSize: 8.5, color: C.violet, fontFamily: 'Helvetica-Bold' },

  // Pills
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  pill: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, color: C.violet, borderRadius: 9, paddingVertical: 1.5, paddingHorizontal: 7, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  pillEmpty: { color: C.muted, borderColor: C.border, opacity: 0.7 },

  // Def box
  defbox: { backgroundColor: C.box, borderLeftWidth: 3, borderLeftColor: C.violetMid, borderTopLeftRadius: 0, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, fontSize: 8.5, color: '#555566' },

  // Metrics
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metric: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 5, paddingVertical: 4, paddingHorizontal: 3, alignItems: 'center' },
  metricV: { fontSize: 10, color: C.violet, fontFamily: 'Helvetica-Bold' },
  metricU: { fontSize: 6.5, color: C.label, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },

  // Visas
  visas: { flexDirection: 'row', gap: 6 },
  visa: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 5, paddingVertical: 6, alignItems: 'center' },
  visaK: { fontSize: 6.5, letterSpacing: 0.3, color: C.label, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  visaN: { fontSize: 8, color: C.ink, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  visaS: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 7, marginTop: 3 },

  // Foot
  foot: { paddingVertical: 7, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: '#e6e2ee', alignItems: 'center' },
  footP: { fontSize: 7, color: '#9a93ab' },
  footBrand: { fontSize: 7, color: C.violet, fontFamily: 'Helvetica-Bold', marginTop: 1 },
});

// ---- petits composants ----
const Field = ({ k, v, variant, style }) => (
  <View style={[{ minWidth: 0 }, style]}>
    <Text style={s.fK}>{k}</Text>
    <Text style={variant === 'big' ? s.fVbig : variant === 'muted' ? s.fVmuted : s.fV}>{v}</Text>
  </View>
);

const Card = ({ title, children }) => (
  <View style={s.card} wrap={false}>
    <Text style={s.cardH}>{title}</Text>
    <View style={s.inner}>{children}</View>
  </View>
);

const EanRow = ({ label, code }) => {
  const chars = eanChars(code);
  return (
    <View style={s.eanRow}>
      <View style={s.eanLabelBox}><Text style={s.fK}>{label}</Text></View>
      {chars ? (
        <View style={s.digits}>
          {chars.map((c, i) => (
            <View key={i} style={s.digit}><Text style={s.digitT}>{c}</Text></View>
          ))}
        </View>
      ) : (
        <Text style={s.fVmuted}>{DASH} non renseigné</Text>
      )}
    </View>
  );
};

const Pills = ({ items }) => {
  const list = pillsList(items);
  if (list.length === 0) return <View style={s.pills}><Text style={[s.pill, s.pillEmpty]}>{DASH}</Text></View>;
  return <View style={s.pills}>{list.map((p, i) => <Text key={i} style={s.pill}>{p}</Text>)}</View>;
};

const Metric = ({ v, u, w }) => (
  <View style={[s.metric, { width: w }]}>
    <Text style={s.metricV}>{v}</Text>
    <Text style={s.metricU}>{u}</Text>
  </View>
);

const VISA_TONE = {
  signe: { color: C.green, backgroundColor: C.greenBg },
  refuse: { color: C.red, backgroundColor: C.redBg },
  attente: { color: C.amber, backgroundColor: C.amberBg },
};
const VisaCell = ({ label, k, fiche }) => {
  const info = visaInfo(k, fiche);
  return (
    <View style={s.visa}>
      <Text style={s.visaK}>{label}</Text>
      <Text style={s.visaN}>{info.date}</Text>
      <Text style={[s.visaS, VISA_TONE[info.status]]}>{info.label}</Text>
    </View>
  );
};

export function FichePdfDocument({ fiche = {}, de = null }) {
  const titre = fiche.libelle_long_40 || fiche.design_normalisee || fiche.libelle_article || fiche.code_article || 'Fiche de lancement';
  const statut = fiche.statut_sap || fiche.statut_lancement || 'Fiche de lancement produit';
  const racine = fiche.code_racine || fiche.code_article;
  const uvc = fiche.uvc_block || {};
  const pal = fiche.palette_block || {};
  const M6 = '15.9%'; // largeur métrique sur 6 colonnes
  const M4 = '24%';   // sur 4 colonnes

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoBox}><Image style={s.logo} src={BONCOLAC_LOGO_DATA_URI} /></View>
          <View style={s.heroTxt}>
            <Text style={s.kicker}>Fiche de lancement produit</Text>
            <Text style={s.h1}>{val(titre)}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.badge}>{'•'} {val(statut)}</Text>
            <View style={s.racine}>
              <Text style={s.racineL}>Racine</Text>
              <Text style={s.racineV}>{val(racine)}</Text>
            </View>
          </View>
        </View>
        <View style={s.accent} />

        <View style={s.body}>
          {/* Bandeau */}
          <View style={s.strip}>
            <View style={s.cell}><Text style={s.cellK}>Origine fabrication</Text><Text style={s.cellV}>{val(fiche.origine_fabrication)}</Text></View>
            <View style={s.cell}><Text style={s.cellK}>Code logistique</Text><Text style={s.cellV}>{val(fiche.code_logistique)}</Text></View>
            <View style={s.cell}><Text style={s.cellK}>Marque</Text><Text style={s.cellV}>{val(fiche.marque)}</Text></View>
          </View>

          {/* Informations marketing */}
          <Card title="Informations marketing">
            <View style={[s.row, { marginBottom: 4 }]}>
              <Field style={{ width: '25%' }} k="Pays" v={val(fiche.pays)} variant="big" />
              <Field style={{ width: '25%' }} k="CNUF / CNUD" v={val(fiche.cnuf_cnud)} />
              <Field style={{ width: '25%' }} k="Code produit" v={val(fiche.code_produit)} />
              <Field style={{ width: '25%' }} k="Coeff" v={val(fiche.coeff)} variant="big" />
            </View>
            <EanRow label="EAN 14 carton" code={fiche.colis_block?.gtin ?? fiche.ean_carton} />
            <EanRow label="EAN 14 couche" code={fiche.couche_block?.gtin ?? fiche.ean_couche} />
            <EanRow label="EAN 14 palette" code={fiche.palette_block?.gtin ?? fiche.ean_palette} />
          </Card>

          {/* Réseaux / Stockage */}
          <View style={s.row}>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}><Text style={s.cardH}>Réseaux</Text><View style={s.inner}><Pills items={fiche.reseaux} /></View></View>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}><Text style={s.cardH}>Stockage</Text><View style={s.inner}><Pills items={(fiche.sites_stockage || []).map(siteStockageLabel)} /></View></View>
          </View>

          {/* Durée / Contrat / Ancien code */}
          <View style={s.row}>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}><Text style={s.cardH}>Durée de vie</Text><View style={s.inner}><Text style={s.fVbig}>{dureeVie(fiche)}</Text></View></View>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}><Text style={s.cardH}>Contrat-date</Text><View style={s.inner}><Text style={s.fVmuted}>{val(fiche.contrat_date)}</Text></View></View>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}><Text style={s.cardH}>Ancien code article</Text><View style={s.inner}><Text style={s.fVbig}>{val(fiche.ancien_numero_article)}</Text></View></View>
          </View>

          {/* Classification / Libellé produit */}
          <View style={s.row}>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}>
              <Text style={s.cardH}>Classification</Text>
              <View style={s.inner}>
                <View style={[s.row, { marginBottom: 4 }]}>
                  <Field style={{ width: '20%' }} k="Gde famille" v={val(fiche.grande_famille)} variant="big" />
                  <Field style={{ width: '20%' }} k="Famille" v={val(fiche.famille)} variant="big" />
                  <Field style={{ width: '20%' }} k="Ss famille" v={val(fiche.sous_famille)} variant="big" />
                  <Field style={{ width: '20%' }} k="Groupe" v={val(fiche.groupe)} variant="big" />
                  <Field style={{ width: '20%' }} k="Fam. arrang." v={val(fiche.fam_arrangement)} variant="muted" />
                </View>
                <Field k="Libellé" v={val(fiche.libelle_classification)} />
              </View>
            </View>
            <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}>
              <Text style={s.cardH}>Libellé produit</Text>
              <View style={s.inner}>
                <Field style={{ marginBottom: 4 }} k="Désignation article SAP" v={val(fiche.design_normalisee)} variant="big" />
                <View style={s.row}>
                  <Field style={{ width: '50%' }} k="Code article client" v={val(fiche.code_article_client)} variant="big" />
                  <Field style={{ width: '50%' }} k="Standard (18)" v={val(fiche.libelle_caisse)} />
                </View>
              </View>
            </View>
          </View>

          {/* Définition produit */}
          <Card title="Définition produit">
            <View style={s.defbox}><Text>{val(fiche.definition_produit)}</Text></View>
          </Card>

          {/* Groupements & classification SAP */}
          <Card title="Groupements & classification SAP">
            <View style={s.row}>
              <View style={{ width: '33.3%', gap: 4 }}>
                <Field k="Secteur d'activité" v={val(fiche.secteur_activite)} />
                <Field k="Groupe stat. article" v={val(fiche.groupe_statistique_article)} />
                <Field k="Nomenclature douanière" v={val(fiche.nomenclature_douaniere)} />
              </View>
              <View style={{ width: '33.3%', gap: 4 }}>
                <Field k="Groupe marchandises" v={val(fiche.groupe_marchandises)} />
                <Field k="Couv." v={val(fiche.couv)} variant="muted" />
              </View>
              <View style={{ width: '33.3%', gap: 4 }}>
                <Field k="Agrément" v={val(fiche.agrement)} variant="muted" />
                <Field k="Ancien ou art. similaire" v={val(fiche.ancien_similaire)} variant="muted" />
                <Field k="Centre profit / Qté an" v={`${val(fiche.centre_profit)} · ${val(de && de.qte_previsionnelle_annuelle)}`} variant="big" />
              </View>
            </View>
          </Card>

          {/* Caractéristiques physiques de l'UV */}
          <Card title="Caractéristiques physiques de l'UV">
            <View style={s.metrics}>
              <Metric w={M4} v={val(uvc.volume)} u="Volume ml" />
              <Metric w={M4} v={val(uvc.poids_net)} u="Poids net kg" />
              <Metric w={M4} v={val(uvc.poids_brut)} u="Poids brut kg" />
              <Metric w={M4} v={dims(uvc)} u="L × l × H cm" />
            </View>
          </Card>

          {/* Informations logistique */}
          <Card title={`Informations logistique  ·  ${val(fiche.type_palette)}`}>
            <View style={s.metrics}>
              <Metric w={M6} v={val(fiche.nb_ue_uc)} u="UE / UC" />
              <Metric w={M6} v={val(fiche.nb_uc_ue)} u="UC / UE" />
              <Metric w={M6} v={val(fiche.nb_uc_palette)} u="UC / palette" />
              <Metric w={M6} v={val(fiche.nb_cartons_couche)} u="Cart. / couche" />
              <Metric w={M6} v={val(fiche.nb_couches_palette)} u="Couches / pal." />
              <Metric w={M6} v={val(fiche.nb_cartons_palette)} u="Cart. / palette" />
              <Metric w={M6} v={val(fiche.hauteur_couche)} u="Haut. couche cm" />
              <Metric w={M6} v={val(fiche.hauteur_palette)} u="Haut. palette cm" />
              <Metric w={M6} v={val(pal.poids_brut)} u="Poids brut kg" />
              <Metric w={M6} v={val(fiche.nb_cartons_cheminee)} u="Cart. cheminée" />
              <Metric w={M6} v={dims(fiche.colis_block)} u="Carton ext. cm" />
            </View>
          </Card>

          {/* Validations */}
          <Card title={`Validations  ·  Créée le ${formatDateShort(fiche.date_envoi_ficher)}  ·  Dispo le ${formatDateShort(fiche.date_limite_creation_mm01)}`}>
            <View style={s.visas}>
              <VisaCell label="Supply Chain" k="supply_chain" fiche={fiche} />
              <VisaCell label="Industriel" k="industriel" fiche={fiche} />
              <VisaCell label="Commerce" k="commerce" fiche={fiche} />
            </View>
          </Card>
        </View>

        {/* Pied */}
        <View style={s.foot}>
          <Text style={s.footP}>Document généré automatiquement depuis l'application Fiches de Lancement.</Text>
          <Text style={s.footBrand}>Boncolac · Pâtissier-Traiteur depuis 1955</Text>
        </View>
      </Page>
    </Document>
  );
}

// Élément prêt à passer à pdf() (garde le JSX dans ce fichier .jsx).
export const buildFichePdfElement = (fiche, de) => <FichePdfDocument fiche={fiche} de={de} />;
