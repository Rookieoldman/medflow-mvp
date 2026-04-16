import PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

export type AdminTransferPdfInput = {
  mrn: string;
  patientFullName: string;
  dobFormatted: string;
  location: string;
  testTypeLabel: string;
  scopeLabel: string;
  priorityLabel: string;
  difficultyLabel: string;
  statusLabel: string;
  requiresAcceptanceLabel: string;
  createdAtFormatted: string;
  updatedAtFormatted: string;
  durationLabel: string | null;
  creatorName: string;
  celadorName: string | null;
  acceptance: null | {
    signerName: string;
    signerRole: string | null;
    signedAtFormatted: string;
    signatureDataUrl: string | null;
  };
  incidents: { typeLabel: string; note: string | null; atFormatted: string; byName: string }[];
  events: { atFormatted: string; fromLabel: string; toLabel: string; actorName: string; note: string | null }[];
};

const C = {
  hero: "#1e3a8f",
  heroSub: "#dbeafe",
  heroHint: "#93c5fd",
  accent: "#2563eb",
  text: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  boxFill: "#f1f5f9",
  boxBorder: "#cbd5e1",
  white: "#ffffff",
  urgent: "#b91c1c",
};

function mx(doc: PdfDoc) {
  return doc.page.margins.left;
}

function cw(doc: PdfDoc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawHero(doc: PdfDoc, data: AdminTransferPdfInput, generated: string) {
  const w = doc.page.width;
  const h = 96;
  doc.save();
  doc.rect(0, 0, w, h).fill(C.hero);
  const x = mx(doc);
  const width = cw(doc);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22).text("Resumen de traslado", x, 28, { width });
  doc.font("Helvetica").fontSize(12).fillColor(C.heroSub).text(data.patientFullName, x, 52, { width });
  doc.fontSize(9)
    .fillColor(C.heroHint)
    .text(`MRN ${data.mrn}   ·   ${generated}`, x, 74, { width });
  doc.restore();
  doc.x = x;
  doc.y = h + 22;
}

function sectionTitle(doc: PdfDoc, title: string) {
  const x = mx(doc);
  const width = cw(doc);
  doc.moveDown(0.5);
  const y = doc.y;
  doc.save();
  doc.rect(x, y, 4, 15).fill(C.accent);
  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(12.5).text(title, x + 12, y + 1, { width: width - 14 });
  doc.restore();
  doc.y = y + 24;
}

function field(doc: PdfDoc, label: string, value: string, opts?: { urgent?: boolean }) {
  const x = mx(doc);
  const width = cw(doc);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label.toUpperCase(), x, doc.y, {
    width,
    characterSpacing: 0.4,
  });
  doc.moveDown(0.08);
  doc.font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(opts?.urgent ? C.urgent : C.text)
    .text(value, x, doc.y, { width });
  doc.moveDown(0.55);
}

function divider(doc: PdfDoc) {
  const x = mx(doc);
  const width = cw(doc);
  doc.moveDown(0.35);
  const y = doc.y;
  doc.save();
  doc.strokeColor(C.line).lineWidth(0.8).moveTo(x, y).lineTo(x + width, y).stroke();
  doc.restore();
  doc.y = y + 16;
}

/** Rejilla 2 columnas para datos compactos */
function grid2(
  doc: PdfDoc,
  cells: { label: string; value: string; urgent?: boolean }[]
) {
  const x0 = mx(doc);
  const width = cw(doc);
  const gap = 18;
  const colW = (width - gap) / 2;
  let col = 0;
  let rowTop = doc.y;
  let rowMax = doc.y;

  for (const cell of cells) {
    const x = col === 0 ? x0 : x0 + colW + gap;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(cell.label.toUpperCase(), x, rowTop, {
      width: colW,
    });
    doc.font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(cell.urgent ? C.urgent : C.text)
      .text(cell.value, x, rowTop + 12, { width: colW });
    const cellBottom = rowTop + 34;
    rowMax = Math.max(rowMax, cellBottom);
    col++;
    if (col > 1) {
      col = 0;
      rowTop = rowMax + 6;
    }
  }
  doc.y = rowMax + (col === 1 ? 8 : 4);
}

function tryEmbedSignature(doc: PdfDoc, dataUrl: string, maxW: number, maxH: number) {
  const m = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!m) return;
  try {
    const buf = Buffer.from(m[2], "base64");
    doc.image(buf, { fit: [maxW, maxH] });
    doc.moveDown(0.45);
  } catch {
    doc.fontSize(9).fillColor(C.muted).text("(No se pudo incrustar la imagen de firma)");
  }
}

function incidentBox(doc: PdfDoc, inc: AdminTransferPdfInput["incidents"][0]) {
  const x = mx(doc);
  const width = cw(doc);
  const pad = 12;
  const y0 = doc.y + 4;
  const textW = width - 2 * pad;
  const titleH = doc.heightOfString(inc.typeLabel, { width: textW, ellipsis: false });
  const meta = `${inc.atFormatted}  ·  ${inc.byName}`;
  const metaH = doc.heightOfString(meta, { width: textW });
  const noteH = inc.note ? doc.heightOfString(inc.note, { width: textW }) : 0;
  const boxH = Math.max(46, pad * 2 + titleH + metaH + noteH + (inc.note ? 8 : 0));

  doc.save();
  doc.fillColor(C.boxFill).roundedRect(x, y0, width, boxH, 6).fill();
  doc.strokeColor(C.boxBorder).lineWidth(0.45).roundedRect(x, y0, width, boxH, 6).stroke();
  doc.restore();

  doc.x = x + pad;
  doc.y = y0 + pad;
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.text).text(inc.typeLabel, { width: textW });
  doc.moveDown(0.15);
  doc.font("Helvetica").fontSize(8.5).fillColor(C.muted).text(meta, { width: textW });
  if (inc.note) {
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(inc.note, { width: textW });
  }
  doc.x = x;
  doc.y = y0 + boxH + 8;
}

function eventRow(doc: PdfDoc, ev: AdminTransferPdfInput["events"][0], zebra: boolean) {
  const x = mx(doc);
  const width = cw(doc);
  const pad = 10;
  const y0 = doc.y + 2;
  const from = ev.fromLabel || "—";
  const main = `${ev.atFormatted}   ${from}  →  ${ev.toLabel}`;
  const textW = width - 2 * pad;
  const mainH = doc.heightOfString(main, { width: textW });
  const actorH = doc.heightOfString(ev.actorName, { width: textW });
  const noteH = ev.note ? doc.heightOfString(`Nota: ${ev.note}`, { width: textW }) : 0;
  const boxH = pad * 2 + mainH + actorH + noteH + (ev.note ? 4 : 0);

  doc.save();
  if (zebra) {
    doc.fillColor("#f8fafc").roundedRect(x, y0, width, boxH, 4).fill();
  }
  doc.strokeColor("#e2e8f0").lineWidth(0.35).roundedRect(x, y0, width, boxH, 4).stroke();
  doc.restore();

  doc.x = x + pad;
  doc.y = y0 + pad;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.text).text(main, { width: textW });
  doc.moveDown(0.12);
  doc.font("Helvetica").fontSize(8.5).fillColor(C.muted).text(ev.actorName, { width: textW });
  if (ev.note) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569").text(`Nota: ${ev.note}`, { width: textW });
  }
  doc.x = x;
  doc.y = y0 + boxH + 5;
}

function footer(doc: PdfDoc, opts?: { page: number; total: number }) {
  const x = mx(doc);
  const width = cw(doc);
  const pageHint =
    opts && opts.total > 1 ? ` · Página ${opts.page} de ${opts.total}` : "";
  doc.save();
  doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8");
  const lineH = doc.currentLineHeight(true);
  const y = doc.page.maxY() - lineH - 4;
  doc.text(`MedFlow · Documento para uso interno del hospital${pageHint}`, x, y, {
    width,
    align: "center",
  });
  doc.restore();
}

export function buildAdminTransferPdfBuffer(data: AdminTransferPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: "A4",
      bufferPages: true,
      info: {
        Title: `Traslado ${data.mrn}`,
        Author: "MedFlow — Administración",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const generated = new Date().toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    drawHero(doc, data, generated);

    sectionTitle(doc, "Paciente");
    field(doc, "Nombre completo", data.patientFullName);
    field(doc, "Número de historia (MRN)", data.mrn);
    field(doc, "Fecha de nacimiento", data.dobFormatted);

    divider(doc);

    sectionTitle(doc, "Clasificación del traslado");
    grid2(doc, [
      { label: "Ámbito", value: data.scopeLabel },
      { label: "Prioridad", value: data.priorityLabel, urgent: data.priorityLabel === "Urgente" },
      { label: "Dificultad de movilización", value: data.difficultyLabel },
      { label: "Estado actual", value: data.statusLabel },
      { label: "Requiere firma de aceptación", value: data.requiresAcceptanceLabel },
      { label: "Tipo de prueba", value: data.testTypeLabel },
    ]);

    divider(doc);

    sectionTitle(doc, "Ubicación");
    field(doc, "Punto de origen / ubicación", data.location);

    divider(doc);

    sectionTitle(doc, "Cronología");
    field(doc, "Registro (alta del traslado)", data.createdAtFormatted);
    field(doc, "Última actualización en sistema", data.updatedAtFormatted);
    if (data.durationLabel) {
      field(doc, "Tiempo entre alta y última actualización", data.durationLabel);
    }

    divider(doc);

    sectionTitle(doc, "Equipo");
    field(doc, "Técnico (solicitante)", data.creatorName);
    field(doc, "Celador asignado", data.celadorName ?? "Sin asignar");

    if (data.acceptance) {
      divider(doc);
      sectionTitle(doc, "Aceptación y firma");
      field(doc, "Firmante", data.acceptance.signerName);
      if (data.acceptance.signerRole) {
        field(doc, "Rol declarado", data.acceptance.signerRole);
      }
      field(doc, "Fecha y hora de la firma", data.acceptance.signedAtFormatted);
      if (data.acceptance.signatureDataUrl) {
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("Firma digitalizada", mx(doc), doc.y);
        doc.moveDown(0.35);
        tryEmbedSignature(doc, data.acceptance.signatureDataUrl, 260, 100);
      }
    }

    divider(doc);
    sectionTitle(doc, `Incidencias (${data.incidents.length})`);
    if (data.incidents.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor(C.muted).text("No constan incidencias para este traslado.", mx(doc), doc.y, {
        width: cw(doc),
      });
      doc.moveDown(1);
    } else {
      for (const inc of data.incidents) {
        if (doc.y > doc.page.height - 140) doc.addPage();
        incidentBox(doc, inc);
      }
    }

    divider(doc);
    sectionTitle(doc, `Historial de estados (${data.events.length})`);
    if (data.events.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor(C.muted).text("No hay eventos registrados.", mx(doc), doc.y, {
        width: cw(doc),
      });
      doc.moveDown(1);
    } else {
      data.events.forEach((ev, i) => {
        if (doc.y > doc.page.height - 120) doc.addPage();
        eventRow(doc, ev, i % 2 === 1);
      });
    }

    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      footer(doc, { page: i - start + 1, total: count });
    }

    doc.end();
  });
}
