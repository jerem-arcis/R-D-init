import { describe, it, expect } from "vitest";
import { etapeSuivante, STATUTS } from "./deStatus";

describe("etapeSuivante (bouton « Passer l'étape »)", () => {
  it("Projet qualifié et en cours d'étude -> Validée", () => {
    expect(etapeSuivante("dl_attente_validation_cdg")).toBe("dl_validee");
    expect(STATUTS[etapeSuivante("dl_attente_validation_cdg")].label).toBe("Validée");
  });

  it("ne mène jamais à « Article créé dans SAP »", () => {
    for (const statut of Object.keys(STATUTS)) {
      expect(etapeSuivante(statut)).not.toBe("fl_sap_cree");
    }
  });

  it("aucun bouton pour les autres statuts", () => {
    for (const statut of ["de_brouillon", "de_attente_cc", "dl_validee", "dl_refusee",
                          "ds_brouillon", "ds_attente_cc", "ds_validee", "fl_sap_cree", "", undefined]) {
      expect(etapeSuivante(statut)).toBeNull();
    }
  });
});
