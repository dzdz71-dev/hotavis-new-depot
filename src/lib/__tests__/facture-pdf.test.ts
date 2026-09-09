import { describe, expect, it } from "vitest";
import { buildFacturePDF, factureFilename, factureNumber } from "../facture-pdf.server";

const baseData = {
  commandeId: "12345678-abcd-4000-8000-000000000000",
  prenom: "Jean",
  nom: "Dupont",
  email: "jean@example.com",
  telephone: "0612345678",
  entreprise: "Boulangerie Test",
  ville: "Lyon",
  activite: "Boulangerie",
  montantCentimes: 49900,
  createdAt: "2026-08-01T10:00:00.000Z",
  paidAt: "2026-08-01T10:05:00.000Z",
};

describe("buildFacturePDF", () => {
  it("génère un PDF valide (%PDF-, taille cohérente)", () => {
    const bytes = buildFacturePDF(baseData);
    expect(2000 < bytes.length).toBe(true);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("numéro et nom de fichier déterministes (jamais de doublon)", () => {
    expect(factureNumber("12345678-abcd-4000-8000-000000000000")).toBe("FAC-12345678");
    expect(factureFilename("12345678-abcd-4000-8000-000000000000")).toBe(
      "facture-FAC-12345678.pdf",
    );
  });

  it("le montant influence le contenu du PDF", () => {
    const petit = buildFacturePDF({ ...baseData, montantCentimes: 10000 });
    const gros = buildFacturePDF({ ...baseData, montantCentimes: 99000 });
    expect(Buffer.from(petit).equals(Buffer.from(gros))).toBe(false);
  });

  it("gère paidAt absent (fallback createdAt) sans erreur", () => {
    const bytes = buildFacturePDF({ ...baseData, paidAt: null });
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});
