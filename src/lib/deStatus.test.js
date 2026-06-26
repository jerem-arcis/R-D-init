import { describe, it, expect } from "vitest";
import { STATUTS, STATUT_ORDER, getStatutMeta, codeChapeauAlert } from "./deStatus";

describe('statuts DS', () => {
  it('expose les 3 statuts DS', () => {
    expect(STATUTS.ds_brouillon?.label).toBe('Brouillon DS');
    expect(STATUTS.en_attente_creation_code_chapeau?.label).toBe('En attente de création de code chapeau');
    expect(STATUTS.ds_validee?.label).toBe('DS validée');
  });
  it('getStatutMeta retombe sur brouillon si inconnu', () => {
    expect(getStatutMeta('zzz').key).toBe('brouillon');
  });
});

describe("STATUTS", () => {
  it("expose tous les statuts du pipeline dans l'ordre", () => {
    expect(STATUT_ORDER).toEqual([
      "brouillon",
      "ds_brouillon",
      "en_attente_code_chapeau",
      "en_attente_creation_code_chapeau",
      "en_attente_dl",
      "en_attente_validation_dl",
      "validee",
      "ds_validee",
      "refusee",
    ]);
  });
  it("chaque statut a un libellé", () => {
    expect(STATUTS.en_attente_code_chapeau.label).toBe("En attente de code chapeau");
    expect(STATUTS.en_attente_dl.label).toBe("En attente de DL");
    expect(STATUTS.en_attente_validation_dl.label).toBe("En attente de validation DL");
  });
  it("getStatutMeta retombe sur brouillon si clé inconnue", () => {
    expect(getStatutMeta("xxx").key).toBe("brouillon");
  });
});

describe("codeChapeauAlert", () => {
  const mkDe = (statut, dateDemande) => ({ statut, date_demande_code_chapeau: dateDemande });
  it("renvoie none hors statut en_attente_code_chapeau", () => {
    const r = codeChapeauAlert(mkDe("validee", "2026-06-01"), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie none si pas de date", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", null), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie j0 le jour même de la demande", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-20"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(0);
  });
  it("renvoie j0 entre J+1 et J+5", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-15"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(5);
  });
  it("renvoie j6 à partir de J+6", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-14"), new Date("2026-06-20"));
    expect(r.level).toBe("j6");
    expect(r.joursEcoules).toBe(6);
  });
});
