import { describe, it, expect } from "vitest";
import {
  STATUTS,
  STATUT_ORDER,
  getStatutMeta,
  codeChapeauAlert,
  joursOuvresEcoules,
} from "./deStatus";

describe('statuts DS', () => {
  it('expose les 3 statuts DS', () => {
    expect(STATUTS.ds_brouillon?.label).toBe('Brouillon');
    expect(STATUTS.ds_attente_cc?.label).toBe('En attente de code chapeau');
    expect(STATUTS.ds_validee?.label).toBe('DS validée');
  });
  it('getStatutMeta retombe sur de_brouillon si inconnu', () => {
    expect(getStatutMeta('zzz').key).toBe('de_brouillon');
  });
});

describe("STATUTS", () => {
  it("expose tous les statuts du pipeline dans l'ordre", () => {
    expect(STATUT_ORDER).toEqual([
      "de_brouillon",
      "ds_brouillon",
      "de_attente_cc",
      "ds_attente_cc",
      "dl_attente_validation_cdg",
      "dl_validee",
      "ds_validee",
      "dl_refusee",
      "fl_sap_cree",
    ]);
  });
  it("chaque statut a un libellé", () => {
    expect(STATUTS.de_attente_cc.label).toBe("En attente de code chapeau");
    expect(STATUTS.dl_attente_validation_cdg.label).toBe("Projet qualifié et en cours d'étude");
    expect(STATUTS.dl_validee.label).toBe("Validée");
  });
  it("fl_sap_cree = article créé dans SAP (plus de repli « Brouillon »)", () => {
    expect(getStatutMeta("fl_sap_cree").label).toBe("Article créé dans SAP");
    expect(getStatutMeta("fl_sap_cree").key).toBe("fl_sap_cree");
  });
  it("getStatutMeta retombe sur de_brouillon si clé inconnue", () => {
    expect(getStatutMeta("xxx").key).toBe("de_brouillon");
  });
});

describe("joursOuvresEcoules", () => {
  it("renvoie 0 le jour même", () => {
    // 2026-06-15 = lundi
    expect(joursOuvresEcoules(new Date("2026-06-15"), new Date("2026-06-15"))).toBe(0);
  });
  it("ignore le week-end (vendredi -> lundi = 1)", () => {
    expect(joursOuvresEcoules(new Date("2026-06-19"), new Date("2026-06-22"))).toBe(1);
  });
  it("compte 5 jours ouvrés du lundi au lundi suivant (7 jours calendaires)", () => {
    expect(joursOuvresEcoules(new Date("2026-06-15"), new Date("2026-06-22"))).toBe(5);
  });
  it("compte 4 jours ouvrés du lundi au samedi", () => {
    expect(joursOuvresEcoules(new Date("2026-06-15"), new Date("2026-06-20"))).toBe(4);
  });
  it("renvoie 0 si to <= from", () => {
    expect(joursOuvresEcoules(new Date("2026-06-22"), new Date("2026-06-15"))).toBe(0);
  });
});

describe("codeChapeauAlert", () => {
  const mkDe = (statut, created) => ({ statut, created_date: created });
  it("renvoie none hors statut d'attente code chapeau", () => {
    const r = codeChapeauAlert(mkDe("dl_validee", "2026-06-01"), new Date("2026-06-22"));
    expect(r.level).toBe("none");
  });
  it("renvoie none si pas de date de création", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", null), new Date("2026-06-22"));
    expect(r.level).toBe("none");
  });
  it("renvoie none en deçà de 5 jours ouvrés", () => {
    // lundi -> vendredi = 4 jours ouvrés
    const r = codeChapeauAlert(mkDe("de_attente_cc", "2026-06-15"), new Date("2026-06-19"));
    expect(r.level).toBe("none");
    expect(r.joursOuvres).toBe(4);
  });
  it("renvoie retard à 5 jours ouvrés (lundi -> lundi suivant)", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", "2026-06-15"), new Date("2026-06-22"));
    expect(r.level).toBe("retard");
    expect(r.joursOuvres).toBe(5);
  });
  it("s'applique aussi aux DS (ds_attente_cc)", () => {
    const r = codeChapeauAlert(mkDe("ds_attente_cc", "2026-06-15"), new Date("2026-06-22"));
    expect(r.level).toBe("retard");
  });
});
