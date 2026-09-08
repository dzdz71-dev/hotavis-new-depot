import { jsPDF } from "jspdf";

// =====================================================================
// GENERATION DU RAPPORT DE LIVRAISON (cote serveur)
// Document client officiel : identite Hotavis, tableau des prestations
// avec statuts/observations, captures optionnelles, conclusion.
// =====================================================================

export type LivraisonStatut = "effectue" | "partiel" | "non_effectue" | "en_attente";

export type RapportItem = {
  label: string;
  categorie: string;
  statut: LivraisonStatut;
  observation?: string;
};

export type RapportCapture = {
  base64: string;
  format: "JPEG" | "PNG";
  width: number;
  height: number;
};

export type RapportData = {
  commandeId: string;
  entreprise: string;
  prenom: string;
  nom: string;
  email: string;
  dateLivraison: string; // ISO
  items: RapportItem[];
  captures?: RapportCapture[];
};

const BLUE: [number, number, number] = [66, 133, 244];
const GREEN: [number, number, number] = [52, 168, 83];
const ORANGE: [number, number, number] = [230, 126, 34];
const RED: [number, number, number] = [234, 67, 53];
const AMBER: [number, number, number] = [180, 130, 0];
const DARK: [number, number, number] = [33, 33, 33];
const GRAY: [number, number, number] = [110, 110, 110];
const LIGHT: [number, number, number] = [245, 246, 248];

const STATUT_LABEL: Record<LivraisonStatut, string> = {
  effectue: "Effectué",
  partiel: "Partiel",
  non_effectue: "Non effectué",
  en_attente: "En attente",
};

const STATUT_COLOR: Record<LivraisonStatut, [number, number, number]> = {
  effectue: GREEN,
  partiel: ORANGE,
  non_effectue: RED,
  en_attente: AMBER,
};

/** Lit les dimensions d'une image PNG ou JPEG sans dependance externe. */
export function imageDimensions(
  bytes: Uint8Array,
): { width: number; height: number; format: "JPEG" | "PNG" } | null {
  // PNG : signature 89 50 4E 47, IHDR width/height big-endian aux offsets 16/20
  if (
    24 < bytes.length &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20), format: "PNG" };
  }
  // JPEG : scan des marqueurs jusqu'au SOF0/1/2
  if (4 < bytes.length && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7), format: "JPEG" };
      }
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      i += 2 + len;
    }
  }
  return null;
}
export function buildRapportPDF(data: RapportData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (pageHeight - 16 < y + needed) {
      doc.addPage();
      y = 16;
    }
  };

  // ---------- En-tete ----------
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Hotavis", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Création & optimisation Google Business Profile", margin, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RAPPORT DE LIVRAISON", pageWidth - margin, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Réf. CMD-${data.commandeId.slice(0, 8).toUpperCase()}`, pageWidth - margin, 20, {
    align: "right",
  });

  // ---------- Bloc client ----------
  y = 40;
  const dateStr = new Date(data.dateLivraison).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ENTREPRISE CLIENTE", margin + 4, y + 6);
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.text(data.entreprise, margin + 4, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`${data.prenom} ${data.nom} · ${data.email}`, margin + 4, y + 19.5);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(`Date de livraison : ${dateStr}`, pageWidth - margin - 4, y + 13, { align: "right" });

  // ---------- Resume ----------
  y += 32;
  const counts: Record<LivraisonStatut, number> = {
    effectue: 0,
    partiel: 0,
    non_effectue: 0,
    en_attente: 0,
  };
  for (const it of data.items) counts[it.statut] += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text("Résumé de la prestation", margin, y);
  y += 3;
  doc.setFontSize(8.5);
  const chips: [string, [number, number, number]][] = [
    [`${counts.effectue} effectuée(s)`, GREEN],
    [`${counts.partiel} partielle(s)`, ORANGE],
    [`${counts.non_effectue} non effectuée(s)`, RED],
    [`${counts.en_attente} en attente`, AMBER],
  ];
  let cx = margin;
  for (const [label, color] of chips) {
    const w = doc.getTextWidth(label) + 7;
    doc.setFillColor(...color);
    doc.roundedRect(cx, y, w, 6.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, cx + 3.5, y + 4.4);
    cx += w + 3;
  }
  y += 13;
  // ---------- Tableau par categorie ----------
  const colLabel = margin;
  const colStatut = margin + contentWidth * 0.52;
  const colObs = margin + contentWidth * 0.68;
  const statutChipW = contentWidth * 0.14;

  const categories: string[] = [];
  for (const it of data.items) {
    if (!categories.includes(it.categorie)) categories.push(it.categorie);
  }

  for (const cat of categories) {
    const items = data.items.filter((it) => it.categorie === cat);
    ensureSpace(18);
    // Bandeau categorie
    doc.setFillColor(...BLUE);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(cat, margin + 3, y + 4.8);
    y += 7;
    // En-tete colonnes
    doc.setFillColor(...LIGHT);
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5);
    doc.text("PRESTATION", colLabel + 2, y + 4.2);
    doc.text("STATUT", colStatut + 2, y + 4.2);
    doc.text("OBSERVATION", colObs + 2, y + 4.2);
    y += 6;

    for (const it of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const labelLines = doc.splitTextToSize(it.label, contentWidth * 0.5 - 4) as string[];
      const obsLines = it.observation
        ? (doc.splitTextToSize(it.observation, contentWidth * 0.3 - 4) as string[])
        : [];
      const rowH = Math.max(labelLines.length, obsLines.length, 1) * 4 + 2.5;
      ensureSpace(rowH + 1);
      doc.setTextColor(...DARK);
      doc.text(labelLines, colLabel + 2, y + 4);
      // Chip statut
      doc.setFillColor(...STATUT_COLOR[it.statut]);
      doc.roundedRect(colStatut + 1, y + 1, statutChipW, 5.5, 1.2, 1.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(STATUT_LABEL[it.statut], colStatut + 1 + statutChipW / 2, y + 4.8, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      if (0 < obsLines.length) {
        doc.setTextColor(...GRAY);
        doc.text(obsLines, colObs + 2, y + 4);
      }
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);
      y += rowH;
    }
    y += 5;
  }

  // ---------- Captures ----------
  if (data.captures && 0 < data.captures.length) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text("Captures d'écran de la fiche Google", margin, y);
    y += 5;
    for (const cap of data.captures) {
      const maxH = 90;
      let w = contentWidth;
      let h = (cap.height / cap.width) * w;
      if (maxH < h) {
        h = maxH;
        w = (cap.width / cap.height) * h;
      }
      ensureSpace(h + 4);
      try {
        doc.addImage(
          `data:image/${cap.format === "JPEG" ? "jpeg" : "png"};base64,${cap.base64}`,
          cap.format,
          margin,
          y,
          w,
          h,
        );
        y += h + 4;
      } catch {
        // Image illisible : ignoree proprement, le rapport reste generé.
      }
    }
  }

  // ---------- Conclusion ----------
  ensureSpace(32);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "F");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONCLUSION DE LIVRAISON", margin + 4, y + 6);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const conclusion = doc.splitTextToSize(
    "Votre prestation Hotavis est clôturée. Ce rapport reflète fidèlement l'état des travaux réalisés sur votre fiche Google Business Profile au jour de la livraison. Si un élément est indiqué « En attente » (par exemple la vérification Google), il dépend d'une validation externe de Google : notre équipe reste à vos côtés pour vous accompagner jusqu'à sa finalisation.",
    contentWidth - 8,
  ) as string[];
  doc.text(conclusion, margin + 4, y + 11.5);

  // ---------- Pied de page ----------
  const fy = pageHeight - 12;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.5);
  doc.line(margin, fy, pageWidth - margin, fy);
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.text("Hotavis — contact@hotavis.fr — https://hotavis.fr", margin, fy + 5);
  doc.text("Merci de votre confiance.", pageWidth - margin, fy + 5, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}