import { jsPDF } from "jspdf";

// =====================================================================
// GENERATION DE LA FACTURE (cote serveur)
// Meme template que src/lib/facture-pdf.ts (telechargement navigateur),
// mais retourne les octets du PDF pour stockage dans reports-gmb +
// piece jointe email pendant la livraison.
// Numero deterministe FAC-{8 premiers du commandeId} : une facture
// regeneree est identique a l'existante -> jamais de doublon.
// =====================================================================

export type FactureServerData = {
  commandeId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  entreprise: string;
  ville: string;
  activite: string;
  montantCentimes: number;
  createdAt: string;
  paidAt: string | null;
};

const GOOGLE_BLUE: [number, number, number] = [66, 133, 244];
const GOOGLE_GREEN: [number, number, number] = [52, 168, 83];
const DARK_GRAY: [number, number, number] = [33, 33, 33];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const MEDIUM_GRAY: [number, number, number] = [120, 120, 120];

/** Numero de facture deterministe (identique au PDF cote client). */
export function factureNumber(commandeId: string): string {
  return `FAC-${commandeId.slice(0, 8).toUpperCase()}`;
}

/** Nom de fichier de la facture (piece jointe email / telechargement). */
export function factureFilename(commandeId: string): string {
  return `facture-${factureNumber(commandeId)}.pdf`;
}

/** Genere la facture PDF et retourne ses octets (aucun telechargement). */
export function buildFacturePDF(data: FactureServerData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- Header avec bande coloree ---
  doc.setFillColor(...GOOGLE_BLUE);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Hotavis", margin, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Création & optimisation Google Business Profile", margin, 28);

  // Numero de facture (a droite)
  const factureNum = factureNumber(data.commandeId);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth - margin, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(factureNum, pageWidth - margin, 25, { align: "right" });

  // --- Date de facturation ---
  let y = 50;
  const dateFacture = data.paidAt ? new Date(data.paidAt) : new Date(data.createdAt);
  const dateStr = dateFacture.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setTextColor(...MEDIUM_GRAY);
  doc.setFontSize(9);
  doc.text("Date d'émission :", margin, y);
  doc.setTextColor(...DARK_GRAY);
  doc.setFont("helvetica", "bold");
  doc.text(dateStr, margin + 35, y);


  // --- Section "Facture a" ---
  y += 15;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentWidth / 2 - 5, 45, 2, 2, "F");

  doc.setTextColor(...GOOGLE_BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FACTURÉ À", margin + 5, y + 8);

  doc.setTextColor(...DARK_GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const clientLines = [
    `${data.prenom || ""} ${data.nom || ""}`.trim(),
    data.entreprise || "",
    data.ville || "",
    data.email || "",
    data.telephone || "",
  ];
  clientLines.forEach((line, i) => {
    doc.text(line, margin + 5, y + 16 + i * 6);
  });

  // --- Section "De" (Hotavis) ---
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 45, 2, 2, "F");

  doc.setTextColor(...GOOGLE_BLUE);
  doc.setFont("helvetica", "bold");
  doc.text("DE", margin + contentWidth / 2 + 10, y + 8);

  doc.setTextColor(...DARK_GRAY);
  doc.setFont("helvetica", "normal");
  const hotavisLines = [
    "Hotavis",
    "Création & optimisation",
    "Google Business Profile",
    "contact@hotavis.fr",
  ];
  hotavisLines.forEach((line, i) => {
    doc.text(line, margin + contentWidth / 2 + 10, y + 16 + i * 6);
  });

  // --- Tableau prestation ---
  y += 60;
  doc.setTextColor(...DARK_GRAY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Détail de la prestation", margin, y);

  y += 5;
  const tableY = y;
  doc.setFillColor(...GOOGLE_BLUE);
  doc.rect(margin, tableY, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 3, tableY + 5.5);
  doc.text("Activité", margin + contentWidth * 0.55, tableY + 5.5);

  // Ligne de la prestation
  y = tableY + 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 12, "F");
  doc.setTextColor(...DARK_GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Création & optimisation fiche Google Business Profile", margin + 3, y + 5);
  doc.text(data.activite || "", margin + contentWidth * 0.55, y + 5);
  const montantEuros = (data.montantCentimes / 100).toFixed(2);
  doc.setFont("helvetica", "bold");
  doc.text(`${montantEuros} €`, pageWidth - margin - 3, y + 5, { align: "right" });

  // Bordure du tableau
  y += 12;
  doc.setDrawColor(...GOOGLE_BLUE);
  doc.setLineWidth(0.3);
  doc.rect(margin, tableY, contentWidth, y - tableY);

  // --- Total ---
  y += 10;
  const totalBoxWidth = 70;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  doc.setFillColor(...GOOGLE_GREEN);
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL TTC", totalBoxX + 5, y + 9);
  doc.text(`${montantEuros} €`, totalBoxX + totalBoxWidth - 5, y + 9, {
    align: "right",
  });

  // --- Informations legales / pied de page ---
  y = pageHeight - 40;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setTextColor(...MEDIUM_GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Hotavis — SIRET en cours d'attribution — contact@hotavis.fr", margin, y);
  y += 4;
  doc.text("Facture payable à réception. Merci de votre confiance.", margin, y);

  return new Uint8Array(doc.output("arraybuffer"));
}
