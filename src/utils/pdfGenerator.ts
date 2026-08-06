import jsPDF from 'jspdf';
import { autoTable, type UserOptions } from 'jspdf-autotable';

type ColorRGB = [number, number, number];

const FONT = 'helvetica';
const DEFAULT_CLINIC = 'Clínica Veterinaria VetSystem';

const COLORS: Record<string, ColorRGB> = {
  primary: [37, 99, 235],
  primaryLight: [96, 165, 250],
  secondary: [22, 163, 74],
  warning: [245, 158, 11],
  error: [239, 68, 68],
  background: [248, 250, 252],
  text: [30, 41, 59],
  textSecondary: [100, 116, 139],
  border: [226, 232, 240],
  white: [255, 255, 255],
  darkBg: [15, 23, 42],
  grey: [100, 116, 139],
};

const TIPO_INVENTARIO_LABELS: Record<string, string> = {
  medicamento: 'Medicamento', vacuna: 'Vacuna', insumo: 'Insumo', otro: 'Otro',
};
const TIPO_INVENTARIO_COLORS: Record<string, ColorRGB> = {
  medicamento: COLORS.primary, vacuna: COLORS.secondary, insumo: COLORS.warning, otro: COLORS.grey,
};
const ESTADO_CITA_LABELS: Record<string, string> = {
  pendiente: 'PENDIENTE', realizada: 'REALIZADA', cancelada: 'CANCELADA',
};
const ESTADO_CITA_COLORS: Record<string, ColorRGB> = {
  pendiente: COLORS.warning, realizada: COLORS.secondary, cancelada: COLORS.grey,
};
const TIPO_HISTORIAL_LABELS: Record<string, string> = {
  consulta: 'Consulta', vacuna: 'Vacuna', cirugia: 'Cirugía', receta: 'Receta',
};
const TIPO_HISTORIAL_COLORS: Record<string, ColorRGB> = {
  consulta: COLORS.primary, vacuna: COLORS.secondary, cirugia: COLORS.error, receta: COLORS.warning,
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '-';
  }
}

function wrapText(doc: jsPDF, text: string | null | undefined, maxWidth: number): string[] {
  const value = text || '-';
  return doc.splitTextToSize(value, maxWidth);
}

function nowStamp(): string {
  return `Generado el ${new Date().toLocaleDateString('es-ES')} · ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

interface HeaderOptions {
  clinicName: string;
  contact: string[];
  reportTitle: string;
  subtitle?: string;
  headerHeight?: number;
}

function drawHeader(doc: jsPDF, opts: HeaderOptions): number {
  const w = doc.internal.pageSize.getWidth();
  const hh = opts.headerHeight ?? 36;

  doc.setFillColor(...COLORS.darkBg);
  doc.rect(0, 0, w, hh, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, hh - 1.5, w, 1.5, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(17);
  doc.setFont(FONT, 'bold');
  doc.text(opts.clinicName.toUpperCase(), w / 2, 9.5, { align: 'center' });

  const contact = opts.contact.filter(Boolean);
  if (contact.length) {
    doc.setFontSize(7.5);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(206, 218, 236);
    doc.text(contact.join('   •   '), w / 2, 15.5, { align: 'center' });
  }

  doc.setFillColor(...COLORS.white);
  doc.roundedRect(w / 2 - 55, 21, 110, 9, 4.5, 4.5, 'F');
  doc.setTextColor(...COLORS.darkBg);
  doc.setFontSize(9.5);
  doc.setFont(FONT, 'bold');
  doc.text(opts.reportTitle.toUpperCase(), w / 2, 27.5, { align: 'center' });

  if (opts.subtitle) {
    doc.setFontSize(8);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(opts.subtitle, w / 2, hh + 3, { align: 'center' });
    return hh + 7;
  }
  return hh - 2;
}

function drawContinuation(doc: jsPDF, title: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.darkBg);
  doc.rect(0, 0, w, 12, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 12, w, 1, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont(FONT, 'bold');
  doc.text(`${title.toUpperCase()} · CONTINUACIÓN`, 12, 8);
}

function finalize(doc: jsPDF) {
  const margin = 15;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const n = (doc.internal as any).getNumberOfPages();
  const stamp = nowStamp();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, h - 14, w - margin, h - 14);
    doc.setFontSize(7);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(stamp, margin, h - 8.5);
    doc.text(`Página ${i} de ${n}`, w / 2, h - 8.5, { align: 'center' });
    doc.text('VetSystem · Gestión Veterinaria', w - margin, h - 8.5, { align: 'right' });
  }
}

async function persist(doc: jsPDF, fileName: string): Promise<string | null> {
  const api = (window as any)?.api;
  if (api?.savePdf) {
    const base64 = doc.output('datauristring').split(',')[1];
    const res = await api.savePdf(fileName, base64);
    return res?.saved ? fileName : null;
  }
  doc.save(fileName);
  return fileName;
}

function sectionLabel(doc: jsPDF, x: number, y: number, w: number, label: string, color: ColorRGB = COLORS.primary) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, 9, 1.5, 1.5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont(FONT, 'bold');
  doc.text(label.toUpperCase(), x + 4, y + 6.2);
}

function infoCell(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setFontSize(6.5);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(10);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text((value || '-').slice(0, Math.max(10, Math.floor(w / 1.9))), x, y + 4.6);
}

function contentBox(doc: jsPDF, x: number, y: number, w: number, text: string | null | undefined, minH = 18): number {
  const lines = wrapText(doc, text, w - 8);
  const h = Math.max(minH, lines.length * 4.6 + 6);
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFontSize(9.5);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(lines, x + 4, y + 5.5);
  return y + h + 4;
}

function statBox(doc: jsPDF, x: number, y: number, w: number, value: number, label: string, color: ColorRGB) {
  doc.setFillColor(...COLORS.background);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, w, 16, 2, 2, 'FD');
  doc.setFontSize(11);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...color);
  doc.text(String(value), x + w / 2, y + 6.8, { align: 'center' });
  doc.setFontSize(6.2);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(label.toUpperCase(), x + w / 2, y + 12, { align: 'center' });
}

function estadoChip(doc: jsPDF, rightX: number, y: number, label: string, color: ColorRGB) {
  doc.setFontSize(7);
  doc.setFont(FONT, 'bold');
  const textW = doc.getTextWidth(label);
  const bw = textW + 5;
  const x = rightX - bw;
  doc.setFillColor(...color);
  doc.roundedRect(x, y - 3.2, bw, 5.6, 2.8, 2.8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.text(label, rightX - 1.5, y, { align: 'right' });
}

interface HistorialPDFMascota {
  nombre?: string;
  especie?: string;
  raza?: string;
  edad?: number;
  peso?: number;
  propietario_nombre?: string;
  propietario_telefono?: string;
}

interface HistorialPDFRecord {
  tipo?: string;
  fecha?: string;
  descripcion?: string;
  diagnostico?: string;
  tratamiento?: string;
}

interface HistorialPDFOptions {
  clinicName?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  includePhotos?: boolean;
  photoDataUrl?: string | null;
}

export async function generateHistorialPDF(
  mascota: HistorialPDFMascota,
  historial: HistorialPDFRecord[],
  options: HistorialPDFOptions = {},
): Promise<string | null> {
  const {
    clinicName = DEFAULT_CLINIC,
    clinicPhone = '',
    clinicAddress = '',
    includePhotos = false,
    photoDataUrl = null,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const subtitle = [`Paciente: ${mascota.nombre || '-'}`, mascota.especie ? `Especie: ${mascota.especie}` : ''].filter(Boolean).join(' · ');
  let y = drawHeader(doc, {
    clinicName,
    contact: [clinicPhone && `Tel: ${clinicPhone}`, clinicAddress].filter(Boolean),
    reportTitle: 'Historial Médico',
    subtitle,
  });

  const hasPhoto = includePhotos && !!photoDataUrl;
  const cardH = 38;
  doc.setFillColor(...COLORS.background);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, 'FD');
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, 1.6, cardH, 'F');

  if (hasPhoto) {
    try {
      const imgType = photoDataUrl && photoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(photoDataUrl as string, imgType, margin + 4, y + 4, 30, 30);
    } catch (_) {}
  }

  const infoX = hasPhoto ? margin + 42 : margin + 8;
  const colW = (contentWidth - (hasPhoto ? 46 : 12)) / 2;

  doc.setFontSize(13);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(mascota.nombre || 'Mascota', infoX, y + 6.5);

  doc.setFontSize(8);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(`${mascota.especie || '-'}${mascota.raza ? `   ·   Raza: ${mascota.raza}` : ''}`, infoX, y + 11.5);

  infoCell(doc, infoX, y + 17, colW, 'Edad', mascota.edad ? `${Math.floor(mascota.edad / 12)} año(s) ${mascota.edad % 12} mes(es)` : '-');
  infoCell(doc, infoX + colW, y + 17, colW, 'Peso', mascota.peso ? `${mascota.peso} kg` : '-');
  infoCell(doc, infoX, y + 26, colW, 'Propietario', mascota.propietario_nombre || '-');
  infoCell(doc, infoX + colW, y + 26, colW, 'Teléfono', mascota.propietario_telefono || '-');

  y += cardH + 8;

  if (historial.length === 0) {
    doc.setFillColor(...COLORS.background);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(9);
    doc.setFont(FONT, 'italic');
    doc.text('No hay registros médicos para esta mascota todavía.', pageWidth / 2, y + 14, { align: 'center' });
    y += 28;
  } else {
    sectionLabel(doc, margin, y, contentWidth, 'Historial de atenciones');
    y += 13;

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Tipo', 'Descripción', 'Diagnóstico', 'Tratamiento']],
      body: historial.map((r) => [
        formatDate(r.fecha),
        TIPO_HISTORIAL_LABELS[r.tipo || 'consulta'] || r.tipo || 'consulta',
        r.descripcion || '-',
        r.diagnostico || '-',
        r.tratamiento || '-',
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8.5, valign: 'middle' },
      bodyStyles: { fontSize: 8, valign: 'top', textColor: COLORS.text },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        data.cell.styles.cellPadding = 2.5;
        if (data.column.index === 0) {
          data.cell.styles.textColor = COLORS.textSecondary;
          data.cell.styles.halign = 'center';
        }
        if (data.column.index === 1) {
          const tipo = historial[data.row.index]?.tipo;
          if (tipo && TIPO_HISTORIAL_COLORS[tipo]) data.cell.styles.textColor = TIPO_HISTORIAL_COLORS[tipo];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).getLastAutoTable?.().finalY + 8;
  }

  if (y < pageHeight - 42) {
    const nH = 14;
    doc.setFillColor(...COLORS.background);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, y, contentWidth, nH, 2, 2, 'FD');
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, 1.6, nH, 'F');
    doc.setFontSize(7.5);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('NOTA', margin + 5, y + 6);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Este documento es parte del historial clínico de la mascota. Consérvelo para futuras consultas.', margin + 24, y + 6);
  }

  finalize(doc);
  const fileName = `historial_${(mascota.nombre || 'mascota').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  return persist(doc, fileName);
}

interface RecetaPDFMascota {
  nombre?: string;
  especie?: string;
  raza?: string;
  edad?: number;
  propietario_nombre?: string;
  propietario_telefono?: string;
}

interface RecetaPDFRecord {
  diagnostico?: string;
  tratamiento?: string;
  descripcion?: string;
  fecha?: string;
}

interface RecetaPDFOptions {
  clinicName?: string;
  clinicPhone?: string;
  vetName?: string;
}

export async function generateRecetaPDF(
  mascota: RecetaPDFMascota,
  registro: RecetaPDFRecord,
  options: RecetaPDFOptions = {},
): Promise<string | null> {
  const { clinicName = DEFAULT_CLINIC, clinicPhone = '', vetName = '' } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = drawHeader(doc, {
    clinicName,
    contact: [clinicPhone && `Tel: ${clinicPhone}`, vetName && `Vet: ${vetName}`].filter(Boolean),
    reportTitle: 'Receta Médica',
    subtitle: `Emitida el ${formatDate(registro.fecha)} · Historia clínica ${mascota.nombre ? `de ${mascota.nombre}` : ''}`,
  });

  doc.setFillColor(...COLORS.background);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, 1.6, 26, 'F');
  doc.setFontSize(11);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(`PACIENTE: ${mascota.nombre || '-'}`, margin + 5, y + 7);

  doc.setFontSize(8);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(
    `${mascota.especie || '-'}  ·  Raza: ${mascota.raza || '-'}  ·  Edad: ${mascota.edad ? `${Math.floor(mascota.edad / 12)}a ${mascota.edad % 12}m` : '-'}`,
    margin + 5,
    y + 13,
  );
  if (mascota.propietario_nombre) {
    doc.text(`Propietario: ${mascota.propietario_nombre}${mascota.propietario_telefono ? `  ·  Tel: ${mascota.propietario_telefono}` : ''}`, margin + 5, y + 19);
  }
  y += 32;

  sectionLabel(doc, margin, y, contentWidth, 'Diagnóstico', COLORS.primary);
  y = contentBox(doc, margin, y + 12, contentWidth, registro.diagnostico || 'Sin diagnóstico registrado', 18);

  sectionLabel(doc, margin, y, contentWidth, 'Tratamiento / Medicamentos', COLORS.secondary);
  y = contentBox(doc, margin, y + 12, contentWidth, registro.tratamiento || 'Sin tratamiento registrado', 24);

  if (registro.descripcion) {
    sectionLabel(doc, margin, y, contentWidth, 'Observaciones', COLORS.warning);
    y = contentBox(doc, margin, y + 12, contentWidth, registro.descripcion, 18);
  }

  if (y > pageHeight - 45) {
    doc.addPage();
    drawContinuation(doc, 'Receta Médica');
    y = 18;
  }

  const sigY = Math.min(pageHeight - 32, y + 26);
  if (sigY + 5 > pageHeight - 14) {
    doc.addPage();
    drawContinuation(doc, 'Receta Médica');
    y = 18;
  }
  const signatureTop = Math.min(pageHeight - 32, y + 22);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(margin, signatureTop, margin + 60, signatureTop);
  doc.setFontSize(7);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('Firma y sello', margin + 30, signatureTop + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(vetName || 'Veterinario/a a cargo', margin + 30, signatureTop - 4, { align: 'center' });

  finalize(doc);
  const fileName = `receta_${(mascota.nombre || 'mascota').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  return persist(doc, fileName);
}

interface InventarioItem {
  nombre: string;
  tipo: string;
  cantidad: number;
  precio?: string;
  proveedor?: string;
  lote?: string;
  fecha_vencimiento?: string;
}

interface InventarioPDFOptions {
  title?: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicAddress?: string;
}

export async function generateInventarioPDF(
  items: InventarioItem[],
  options: InventarioPDFOptions = {},
): Promise<string | null> {
  const { title = 'Reporte de Inventario', clinicName = DEFAULT_CLINIC, clinicPhone = '', clinicAddress = '' } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const totalStock = items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
  const sinStock = items.filter((i) => (Number(i.cantidad) || 0) <= 0).length;
  const bajoStock = items.filter((i) => (Number(i.cantidad) || 0) > 0 && (Number(i.cantidad) || 0) <= 5).length;

  let y = drawHeader(doc, {
    clinicName,
    contact: [clinicPhone && `Tel: ${clinicPhone}`, clinicAddress].filter(Boolean),
    reportTitle: title,
    subtitle: `Total: ${items.length} productos · Unidades en stock: ${totalStock}`,
  });

  const gap = 3;
  const statW = (contentWidth - gap * 3) / 4;
  statBox(doc, margin, y, statW, items.length, 'Productos', COLORS.primary);
  statBox(doc, margin + (statW + gap), y, statW, totalStock, 'Unidades stock', COLORS.secondary);
  statBox(doc, margin + (statW + gap) * 2, y, statW, bajoStock, 'Por agotar', COLORS.warning);
  statBox(doc, margin + (statW + gap) * 3, y, statW, sinStock, 'Sin stock', COLORS.error);
  y += 22;

  sectionLabel(doc, margin, y, contentWidth, 'Detalle de productos', COLORS.primary);
  y += 13;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nombre', 'Tipo', 'Stock', 'Precio', 'Proveedor', 'Lote', 'Vencimiento']],
    body: items.map((item, i) => [
      String(i + 1),
      item.nombre,
      TIPO_INVENTARIO_LABELS[item.tipo] || item.tipo,
      String(item.cantidad),
      item.precio ? `$${parseFloat(item.precio).toFixed(2)}` : '-',
      item.proveedor || '-',
      item.lote || '-',
      item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : '-',
    ]),
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8, valign: 'middle' },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.text },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      if (data.section !== 'body') return;
      data.cell.styles.cellPadding = 2;
      if (data.column.index === 3) {
        const qty = parseInt(data.cell.text[0]) || 0;
        if (qty <= 0) data.cell.styles.textColor = COLORS.error;
        else if (qty <= 5) data.cell.styles.textColor = COLORS.warning;
        else data.cell.styles.textColor = COLORS.secondary;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 2) {
        const tipo = items[data.row.index]?.tipo;
        if (tipo && TIPO_INVENTARIO_COLORS[tipo]) data.cell.styles.textColor = TIPO_INVENTARIO_COLORS[tipo];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  finalize(doc);
  void pageHeight;
  const fileName = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
  return persist(doc, fileName);
}

interface CitaPDFItem {
  fecha: string;
  hora?: string;
  mascota_nombre: string;
  especie?: string;
  propietario_nombre?: string;
  estado: string;
  motivo?: string;
}

interface CitasPDFOptions {
  title?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicAddress?: string;
}

export async function generateCitasPDF(
  citas: CitaPDFItem[],
  options: CitasPDFOptions = {},
): Promise<string | null> {
  const {
    title = 'Reporte de Citas',
    fechaDesde,
    fechaHasta,
    clinicName = DEFAULT_CLINIC,
    clinicPhone = '',
    clinicAddress = '',
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const total = citas.length;
  const pendientes = citas.filter((c) => c.estado === 'pendiente').length;
  const realizadas = citas.filter((c) => c.estado === 'realizada').length;
  const canceladas = citas.filter((c) => c.estado === 'cancelada').length;

  const rangeText = fechaDesde && fechaHasta ? `${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}` : formatDate(new Date().toISOString());
  let y = drawHeader(doc, {
    clinicName,
    contact: [clinicPhone && `Tel: ${clinicPhone}`, clinicAddress].filter(Boolean),
    reportTitle: title,
    subtitle: `Período: ${rangeText}`,
  });

  const gap = 3;
  const stat = (contentWidth - gap * 3) / 4;
  statBox(doc, margin, y, stat, total, 'Citas', COLORS.primary);
  statBox(doc, margin + (stat + gap), y, stat, pendientes, 'Pendientes', COLORS.warning);
  statBox(doc, margin + (stat + gap) * 2, y, stat, realizadas, 'Realizadas', COLORS.secondary);
  statBox(doc, margin + (stat + gap) * 3, y, stat, canceladas, 'Canceladas', COLORS.error);
  y += 22;

  const grouped: Record<string, CitaPDFItem[]> = {};
  citas.forEach((c) => {
    if (!grouped[c.fecha]) grouped[c.fecha] = [];
    grouped[c.fecha].push(c);
  });

  Object.keys(grouped)
    .sort()
    .forEach((fecha) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        drawContinuation(doc, title);
        y = 16;
      }
      const day = grouped[fecha];

      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(margin, y, 55, 8, 2, 2, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(8.5);
      doc.setFont(FONT, 'bold');
      doc.text(formatDate(fecha), margin + 3, y + 5.6);

      doc.setFontSize(7.5);
      doc.setFont(FONT, 'normal');
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(`${day.length} cita(s)`, margin + 61, y + 5.6);
      y += 12;

      day.forEach((c) => {
        if (y > pageHeight - 32) {
          doc.addPage();
          drawContinuation(doc, title);
          y = 16;
        }
        const hh = c.motivo ? 18 : 14;

        doc.setFillColor(...COLORS.background);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(margin, y, contentWidth, hh, 2, 2, 'FD');
        doc.setFillColor(...(ESTADO_CITA_COLORS[c.estado] || COLORS.primary));
        doc.rect(margin, y, 1.6, hh, 'F');

        doc.setFontSize(9);
        doc.setFont(FONT, 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(c.hora ? c.hora.slice(0, 5) : '--:--', margin + 5, y + 5.5);

        doc.setFont(FONT, 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text(c.mascota_nombre || '-', margin + 18, y + 5.5);

        doc.setFontSize(7.5);
        doc.setFont(FONT, 'normal');
        doc.setTextColor(...COLORS.textSecondary);
        doc.text(`${c.propietario_nombre || 'Sin propietario'}${c.especie ? `  ·  ${c.especie}` : ''}`, margin + 18, y + 10.2);

        estadoChip(doc, pageWidth - margin - 1, y + 5.5, ESTADO_CITA_LABELS[c.estado] || c.estado, ESTADO_CITA_COLORS[c.estado] || COLORS.textSecondary);

        if (c.motivo) {
          doc.setFontSize(7.5);
          doc.setFont(FONT, 'italic');
          doc.setTextColor(...COLORS.textSecondary);
          const mlines = doc.splitTextToSize(`Motivo: ${c.motivo}`, contentWidth - 26);
          doc.text(mlines.slice(0, 1), margin + 18, y + 14.5);
        }

        y += hh + 3;
      });
      y += 2;
    });

  finalize(doc);
  const fileName = `citas_${new Date().toISOString().split('T')[0]}.pdf`;
  return persist(doc, fileName);
}

interface HistorialGlobalPDFRecord {
  tipo?: string;
  fecha?: string;
  descripcion?: string;
  diagnostico?: string;
  tratamiento?: string;
  mascota_nombre?: string;
  propietario_nombre?: string;
}

export async function generateHistorialGlobalPDF(
  registros: HistorialGlobalPDFRecord[],
  options: { clinicName?: string; clinicPhone?: string; clinicAddress?: string } = {},
): Promise<string | null> {
  const { clinicName = DEFAULT_CLINIC, clinicPhone = '', clinicAddress = '' } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const tiposCount: Record<string, number> = {};
  registros.forEach((r) => { tiposCount[r.tipo || 'consulta'] = (tiposCount[r.tipo || 'consulta'] || 0) + 1; });
  const vacunas = registros.filter((r) => r.tipo === 'vacuna').length;

  let y = drawHeader(doc, {
    clinicName,
    contact: [clinicPhone && `Tel: ${clinicPhone}`, clinicAddress].filter(Boolean),
    reportTitle: 'Historial Médico Global',
    subtitle: `Total: ${registros.length} registros · ${vacunas} vacunas`,
  });

  const gap = 3;
  const statW = (contentWidth - gap * 3) / 4;
  statBox(doc, margin, y, statW, registros.length, 'Registros', COLORS.primary);
  statBox(doc, margin + (statW + gap), y, statW, tiposCount['consulta'] || 0, 'Consultas', COLORS.primaryLight);
  statBox(doc, margin + (statW + gap) * 2, y, statW, vacunas, 'Vacunas', COLORS.secondary);
  statBox(doc, margin + (statW + gap) * 3, y, statW, tiposCount['receta'] || 0, 'Recetas', COLORS.warning);
  y += 22;

  sectionLabel(doc, margin, y, contentWidth, 'Detalle de registros', COLORS.primary);
  y += 13;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Fecha', 'Paciente', 'Propietario', 'Tipo', 'Descripción / Diagnóstico', 'Tratamiento']],
    body: registros.map((r, i) => [
      String(i + 1),
      formatDate(r.fecha),
      r.mascota_nombre || '-',
      r.propietario_nombre || '-',
      TIPO_HISTORIAL_LABELS[r.tipo || ''] || r.tipo || '-',
      [r.descripcion, r.diagnostico].filter(Boolean).join(' — ') || '-',
      r.tratamiento || '-',
    ]),
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8, valign: 'middle' },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.text },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      if (data.section !== 'body') return;
      data.cell.styles.cellPadding = 2;
      if (data.column.index === 4) {
        const tipo = registros[data.row.index]?.tipo;
        if (tipo && TIPO_HISTORIAL_COLORS[tipo]) data.cell.styles.textColor = TIPO_HISTORIAL_COLORS[tipo];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  finalize(doc);
  void pageHeight;
  const fileName = `historiales_${new Date().toISOString().split('T')[0]}.pdf`;
  return persist(doc, fileName);
}