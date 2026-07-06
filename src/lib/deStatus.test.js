import { describe, it, expect } from "vitest";
import { STATUTS, STATUT_ORDER, getStatutMeta, codeChapeauAlert } from "./deStatus";

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
    ]);
  });
  it("chaque statut a un libellé", () => {
    expect(STATUTS.de_attente_cc.label).toBe("En attente de code chapeau");
    expect(STATUTS.dl_attente_validation_cdg.label).toBe("En attente de validation CDG");
    expect(STATUTS.dl_validee.label).toBe("Validée");
  });
  it("getStatutMeta retombe sur de_brouillon si clé inconnue", () => {
    expect(getStatutMeta("xxx").key).toBe("de_brouillon");
  });
});

describe("codeChapeauAlert", () => {
  const mkDe = (statut, dateDemande) => ({ statut, date_demande_code_chapeau: dateDemande });
  it("renvoie none hors statut de_attente_cc", () => {
    const r = codeChapeauAlert(mkDe("dl_validee", "2026-06-01"), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie none si pas de date", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", null), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie j0 le jour même de la demande", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", "2026-06-20"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(0);
  });
  it("renvoie j0 entre J+1 et J+5", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", "2026-06-15"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(5);
  });
  it("renvoie j6 à partir de J+6", () => {
    const r = codeChapeauAlert(mkDe("de_attente_cc", "2026-06-14"), new Date("2026-06-20"));
    expect(r.level).toBe("j6");
    expect(r.joursEcoules).toBe(6);
  });
});
