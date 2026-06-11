import { describe, it, expect } from "vitest";
import {
  mapBeCPGToDE,
  withValue,
  dropdownAdditionsFromMapping,
} from "./becpgMapping";

// Réponse de référence renvoyée par le flux Power Automate pour le CodePJ "PJ4987".
const PJ4987 = {
  entities: [
    {
      entity: {
        "cm:name": "Tarte Citron BIO-BNC FS",
        attributes: {
          "bnc:deAxeStrategique_fr": "Business Courant",
          "bcpg:code": "PJ4987",
          "bcpg:plants": [
            { "cm:name": "BONLOC", id: "7f149504", type: "bcpg:plant" },
          ],
          "bnc:deVolumeUV": 30000,
          "pjt:projectHierarchy1": {
            "bcpg:lkvValue": "RMN",
            id: "af1f3871",
            type: "bcpg:linkedValue",
            "bcpg:code": "LNK38",
          },
          "pjt:projectOrigin": "Retravail Produit - CA existant",
          "bnc:dePorteurCommercial": {
            "cm:userName": "laure.bertrand",
            id: "e58b977c",
            type: "cm:person",
          },
          "bnc:deAxeStrategique": "Business Courant",
          "bnc:deClient": "BONCOLAC",
          "bnc:deDateEchantillon": "2025-03-31T22:00:00.000Z",
          "bnc:deDateDemande": "2024-12-17T23:00:00.000Z",
          "bnc:deDateLivraison": "2025-08-31T22:00:00.000Z",
          "bnc:deFamilleProduit": "TARTES",
          "cm:name": "Tarte Citron BIO-BNC FS",
        },
        id: "62da6e6e",
        type: "pjt:project",
        "bcpg:code": "PJ4987",
      },
    },
  ],
};

describe("mapBeCPGToDE", () => {
  it("mappe tous les champs de la réponse PJ4987", () => {
    expect(mapBeCPGToDE(PJ4987)).toEqual({
      code_projet: "PJ4987",
      designation_article: "Tarte Citron BIO-BNC FS",
      date_demande: "2024-12-17",
      axe_strategique: "Business Courant",
      reseau: "RMN",
      type_demande_de: "Retravail Produit - CA existant",
      demandeur: "laure.bertrand",
      famille_produit: "TARTES",
      marque: "BONLOC",
      client: "BONCOLAC",
      qte_previsionnelle_annuelle: 30000,
    });
  });

  it("tronque les dates ISO en YYYY-MM-DD", () => {
    const out = mapBeCPGToDE(PJ4987);
    expect(out.date_demande).toBe("2024-12-17");
  });

  it("renvoie null quand entities est vide", () => {
    expect(mapBeCPGToDE({ entities: [] })).toBeNull();
  });

  it("renvoie null quand entities est absent", () => {
    expect(mapBeCPGToDE({})).toBeNull();
    expect(mapBeCPGToDE(null)).toBeNull();
  });

  it("n'inclut pas les clés dont la source est absente", () => {
    const minimal = {
      entities: [{ entity: { "bcpg:code": "PJ0001", attributes: {} } }],
    };
    expect(mapBeCPGToDE(minimal)).toEqual({ code_projet: "PJ0001" });
  });
});

describe("withValue", () => {
  it("ajoute la valeur si absente de la liste", () => {
    expect(withValue(["A", "B"], "C")).toEqual(["A", "B", "C"]);
  });

  it("ne duplique pas une valeur déjà présente", () => {
    expect(withValue(["A", "B"], "B")).toEqual(["A", "B"]);
  });

  it("renvoie la liste inchangée pour une valeur vide", () => {
    expect(withValue(["A", "B"], "")).toEqual(["A", "B"]);
    expect(withValue(["A", "B"], undefined)).toEqual(["A", "B"]);
  });
});

describe("dropdownAdditionsFromMapping", () => {
  const adminLists = {
    axes_strategiques: ["Business Courant"],
    reseaux: ["RMN", "MDD"],
    familles_produit: ["Traiteur", "Mochi", "Pâtisseries"],
    secteurs_activite: ["Boncolac"],
  };

  it("ne propose que les valeurs absentes des dropdowns Dataverse", () => {
    const mapped = {
      axe_strategique: "Business Courant", // déjà présent
      reseau: "RMN", // déjà présent
      famille_produit: "TARTES", // absent → à créer
      marque: "BONLOC", // absent → à créer
      type_demande_de: "Retravail Produit - CA existant", // non géré → ignoré
      client: "BONCOLAC", // non géré → ignoré
    };
    expect(dropdownAdditionsFromMapping(mapped, adminLists)).toEqual([
      { dropdownId: "familles_produit", value: "TARTES" },
      { dropdownId: "secteurs_activite", value: "BONLOC" },
    ]);
  });

  it("renvoie un tableau vide si toutes les valeurs existent déjà", () => {
    const mapped = { axe_strategique: "Business Courant", reseau: "MDD" };
    expect(dropdownAdditionsFromMapping(mapped, adminLists)).toEqual([]);
  });

  it("gère un dropdown encore vide (liste absente)", () => {
    expect(
      dropdownAdditionsFromMapping({ marque: "BONLOC" }, {})
    ).toEqual([{ dropdownId: "secteurs_activite", value: "BONLOC" }]);
  });

  it("renvoie un tableau vide pour mapped null", () => {
    expect(dropdownAdditionsFromMapping(null, adminLists)).toEqual([]);
  });
});
