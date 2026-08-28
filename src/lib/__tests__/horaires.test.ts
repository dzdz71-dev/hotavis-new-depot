import { describe, it, expect } from "vitest";
import { z } from "zod";

// On recrée le schéma ici pour tester la logique de validation sans dépendre
// du module complet (qui importe @tanstack/react-start et ne peut pas tourner
// dans vitest sans config supplémentaire).
const horaireJourSchema = z
  .object({
    ferme: z.boolean(),
    ouverture: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis")
      .optional()
      .nullable(),
    fermeture: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis")
      .optional()
      .nullable(),
  })
  .refine((d) => d.ferme || (d.ouverture && d.fermeture), {
    message: "Si non fermé, ouverture et fermeture sont requises",
  });

const horairesSchema = z
  .object({
    mon: horaireJourSchema,
    tue: horaireJourSchema,
    wed: horaireJourSchema,
    thu: horaireJourSchema,
    fri: horaireJourSchema,
    sat: horaireJourSchema,
    sun: horaireJourSchema,
  })
  .strict();

describe("horairesSchema", () => {
  const validHoraires = {
    mon: { ferme: false, ouverture: "09:00", fermeture: "18:00" },
    tue: { ferme: false, ouverture: "09:00", fermeture: "18:00" },
    wed: { ferme: false, ouverture: "09:00", fermeture: "18:00" },
    thu: { ferme: false, ouverture: "09:00", fermeture: "18:00" },
    fri: { ferme: false, ouverture: "09:00", fermeture: "18:00" },
    sat: { ferme: true },
    sun: { ferme: true },
  };

  it("valide des horaires corrects", () => {
    expect(() => horairesSchema.parse(validHoraires)).not.toThrow();
  });

  it("rejette si un jour est manquant", () => {
    const bad = { ...validHoraires, sun: undefined };
    expect(() => horairesSchema.parse(bad)).toThrow();
  });

  it("rejette les clés inattendues (strict)", () => {
    const bad = { ...validHoraires, foo: { ferme: true } };
    expect(() => horairesSchema.parse(bad)).toThrow();
  });

  it("rejette un format HH:MM invalide", () => {
    const bad = {
      ...validHoraires,
      mon: { ferme: false, ouverture: "9h00", fermeture: "18:00" },
    };
    expect(() => horairesSchema.parse(bad)).toThrow(/Format HH:MM/);
  });

  it("rejette si non fermé mais ouverture manquante", () => {
    const bad = {
      ...validHoraires,
      mon: { ferme: false, ouverture: "", fermeture: "18:00" },
    };
    expect(() => horairesSchema.parse(bad)).toThrow();
  });

  it("accepte si fermé sans ouverture/fermeture", () => {
    const ok = {
      ...validHoraires,
      mon: { ferme: true },
    };
    expect(() => horairesSchema.parse(ok)).not.toThrow();
  });
});
