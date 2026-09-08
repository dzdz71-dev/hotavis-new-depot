import { describe, expect, it } from "vitest";
import { buildRapportPDF, imageDimensions } from "../rapport-pdf.server";

const baseData = {
  commandeId: "12345678-abcd-4000-8000-000000000000",
  entreprise: "Boulangerie Test",
  prenom: "Jean",
  nom: "Dupont",
  email: "jean@example.com",
  dateLivraison: new Date().toISOString(),
};

describe("buildRapportPDF", () => {
  it("génère un PDF valide avec statuts et observations", () => {
    const bytes = buildRapportPDF({
      ...baseData,
      items: [
        { label: "Nom de l'entreprise", categorie: "Informations de l'entreprise", statut: "effectue" },
        { label: "Catégorie principale", categorie: "Catégories", statut: "partiel", observation: "Catégorie secondaire à revoir" },
        { label: "Mise en ligne des photos", categorie: "Photos", statut: "effectue", observation: "Photos ajoutées" },
        { label: "État de la vérification", categorie: "Création et vérification", statut: "en_attente", observation: "Validation demandée par Google" },
        { label: "Vidéos de l'entreprise", categorie: "Vidéos", statut: "non_effectue" },
      ],
    });
    expect(2000 < bytes.length).toBe(true);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("gère un rapport long (multi-pages) sans erreur", () => {
    const items = Array.from({ length: 34 }, (_, i) => ({
      label: `Prestation numéro ${i + 1} avec un libellé volontairement long pour tester le retour à la ligne`,
      categorie: i % 2 === 0 ? "Catégorie A" : "Catégorie B",
      statut: (["effectue", "partiel", "non_effectue", "en_attente"] as const)[i % 4],
      observation:
        i % 3 === 0
          ? "Observation de test assez longue pour vérifier le retour à la ligne dans la colonne observation"
          : "",
    }));
    const bytes = buildRapportPDF({ ...baseData, items });
    expect(5000 < bytes.length).toBe(true);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});

describe("imageDimensions", () => {
  it("lit les dimensions d'un PNG", () => {
    const png = new Uint8Array(33);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const dv = new DataView(png.buffer);
    dv.setUint32(16, 800);
    dv.setUint32(20, 600);
    expect(imageDimensions(png)).toEqual({ width: 800, height: 600, format: "PNG" });
  });

  it("retourne null pour des données invalides", () => {
    expect(imageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});