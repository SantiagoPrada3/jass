import { WaterBoxAssignment } from '../../models/maintenance.model';
import * as CryptoJS from 'crypto-js';
import * as QRCode from 'qrcode';

export interface GeneratePdfOptions {
  getBoxCodeById: (id: number) => string;
  getUsernameById: (userId: string) => string;
  organizationName?: string;
  organizationLogo?: string; // optional base64 data URL or image URL
  title?: string;
  filename?: string;
}

function escapeHtml(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function ensureJsPdfLoaded(): Promise<void> {
  const win = window as any;
  if (win && win.jspdf) return;
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('jspdf-cdn');
    if (existing) {
      setTimeout(() => resolve(), 150);
      return;
    }
    const s = document.createElement('script');
    s.id = 'jspdf-cdn';
    s.type = 'text/javascript';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => setTimeout(() => resolve(), 150);
    s.onerror = () => reject(new Error('Failed to load jsPDF from CDN'));
    document.head.appendChild(s);
  });
}

// Generar fecha legible para mostrar en el PDF (similar a payments-billing)
function generateReadableDateTime(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Generar hash SHA-256 con fecha actual completa y RUC (copiado/adaptado)
function generateVerificationHash(ruc: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const currentDateTime = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const dataToHash = `${currentDateTime}${ruc}`;
  return CryptoJS.SHA256(dataToHash).toString(CryptoJS.enc.Hex);
}

// Formatea el estado de asignación a español (Activo/Inactivo/Suspendido)
function formatAssignmentStatus(status: any): string {
  if (status === null || status === undefined) return '-';
  const s = String(status).trim();
  if (s.length === 0) return '-';
  const up = s.toUpperCase();
  switch (up) {
    case 'ACTIVE':
    case 'ACTIVO':
      return 'Activo';
    case 'INACTIVE':
    case 'INACTIVO':
      return 'Inactivo';
    case 'SUSPENDED':
    case 'SUSPENDIDO':
      return 'Suspendido';
    default:
      // Capitalize first letter of whatever string
      const low = s.toLowerCase();
      return low.charAt(0).toUpperCase() + low.slice(1);
  }
}

// Crear una versión compacta del PDF para incluir en el QR (si cabe)
function createCompactPDFForAssignment(assignmentsCount: number, timestamp: string, ruc: string, verificationHash: string): string {
  const win = window as any;
  if (!win || !win.jspdf || !win.jspdf.jsPDF) return '';
  const { jsPDF } = win.jspdf as any;
  const compactDoc = new jsPDF('p', 'mm', [80, 120]);
  compactDoc.setFontSize(8);
  compactDoc.text(`Asignaciones: ${assignmentsCount}`, 5, 10);
  compactDoc.text(`Fecha: ${new Date().toLocaleDateString()}`, 5, 15);
  compactDoc.text(`Hash: ${verificationHash.substring(0, 16)}`, 5, 20);
  return compactDoc.output('datauristring');
}

// Generar código QR como imagen base64
async function generateQRCode(data: string): Promise<string> {
  try {
    const dataSize = new Blob([data]).size;
    if (dataSize > 2000) {
      throw new Error('Datos demasiado grandes para código QR');
    }
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generando código QR:', error);
    throw error;
  }
}

async function loadImageDataUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch image: ' + url);
  const blob = await resp.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(blob);
  });
}

// Lightweight PDF generator using jsPDF (no html2canvas). More reliable for plain tabular reports.
async function generateWithJsPdf(assignments: WaterBoxAssignment[], opts: GeneratePdfOptions, filename: string) {
  await ensureJsPdfLoaded();
  const win = window as any;
  if (!win || !win.jspdf || !win.jspdf.jsPDF) throw new Error('jsPDF not available');
  const { jsPDF } = win.jspdf as any;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Header block with colored background. Visual design tuned to match provided image.
  const headerBase = 110; // taller header to fit logo + lines like the reference
  const orgExtra = 0;
  const headerHeight = headerBase + orgExtra;
  // offset top for header rectangle - place at very top so no white stripe appears
  const headerOffsetY = 0;
  // Main blue stripe (use same header blue as user-management: #0066cc)
  doc.setFillColor(0, 102, 204); // #0066cc
  doc.rect(0, headerOffsetY, pageWidth, headerHeight, 'F');

  // (removed thin lighter-blue separator to match requested design)

  // Logo (left) and organization info (to the right) in white
  doc.setTextColor(255, 255, 255);
  // Prepare image placement variables
  const imgWidth = 72;
  const imgHeight = 72;
  const imgLeftX = margin;
  const headerRectHeight = headerHeight;
  const imgLeftY = headerOffsetY + Math.max(6, Math.round((headerRectHeight - imgHeight) / 2));

  // Draw org name and subtitle to the right of logo
  const orgTextX = imgLeftX + imgWidth + 14;
  const orgNameY = imgLeftY + 18;
  if (opts.organizationName) {
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(String(opts.organizationName), orgTextX, orgNameY);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', orgTextX, orgNameY + 14);
    // small address/phone lines to mirror the example (if provided in opts, otherwise leave blank)
    doc.setFontSize(9);
    if ((opts as any).organizationAddress) {
      doc.text(String((opts as any).organizationAddress), orgTextX, orgNameY + 30);
    }
    if ((opts as any).organizationPhone) {
      doc.text(`Tel: ${String((opts as any).organizationPhone)}`, orgTextX, orgNameY + 42);
    }
  }

  // (removed top border and top gap so the blue stripe starts at the very top of the page)

  // meta text not in header; will be placed below title
  doc.setTextColor(0, 0, 0);
  // leave a comfortable gap after header so title stays centered and not clipped
  y = headerOffsetY + headerHeight + 18; // start content after header + gap

  // Before the table: draw centered title, separator line and meta (fecha / total)
  const titleText = opts.title || 'REPORTE DE ASIGNACIONES';
  // Title styling to match example (bolder, larger but not oversized)
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  // Centered title
  const titleX = pageWidth / 2;
  const titleY = y + 6;
  doc.text(String(titleText).toUpperCase(), titleX, titleY, { align: 'center' } as any);
  // separator position (no line drawn as user requested)
  const sepY = titleY + 14;
  doc.setDrawColor(200);
  doc.setLineWidth(0.8);
  // meta info: fecha a la izquierda, total a la derecha
  const now = new Date();
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const fechaText = `Fecha de generación: ${now.toLocaleDateString()}`;
  // use a shorter label to save horizontal space - contar solo assignments válidos con verificación estricta
  const validCountFiltered = assignments.filter(a => {
    if (!a || a === null || a === undefined) return false;
    if (!a.id || a.id === null || a.id === undefined || isNaN(a.id)) return false;
    if (!a.waterBoxId || a.waterBoxId === null || a.waterBoxId === undefined) return false;
    if (!a.userId || a.userId === null || a.userId === undefined || a.userId === '') return false;
    const boxCode = opts.getBoxCodeById(a.waterBoxId);
    const username = opts.getUsernameById(a.userId);
    if (!boxCode || boxCode === '') return false;
    if (!username || username === '') return false;
    return true;
  });
  const totalText = `Total: ${validCountFiltered.length}`;

  // small horizontal inset to avoid touching printable edges
  const leftX = margin + 6;
  const rightX = pageWidth - margin - 6;

  // Measure text widths and avoid overlap; si no caben en la misma línea, poner el total en la línea siguiente
  try {
    const fechaW = (doc as any).getTextWidth ? (doc as any).getTextWidth(fechaText) : fechaText.length * 6;
    const totalW = (doc as any).getTextWidth ? (doc as any).getTextWidth(totalText) : totalText.length * 6;
    const avail = pageWidth - margin * 2 - 12; // account for inset
    if (fechaW + totalW + 24 > avail) {
      // colocar en dos líneas (total en la siguiente línea, alineado a la derecha)
      doc.text(fechaText, leftX, sepY + 20);
      doc.text(totalText, rightX, sepY + 20 + 12, { align: 'right' } as any);
      // aumentar separación vertical antes de la tabla (+12pt)
      y = sepY + 20 + 36; // antes: +24
    } else {
      doc.text(fechaText, leftX, sepY + 20);
      doc.text(totalText, rightX, sepY + 20, { align: 'right' } as any);
      // aumentar separación vertical antes de la tabla (+12pt)
      y = sepY + 46; // antes: 34
    }
  } catch (e) {
    // Fallback simple placement with inset
    doc.text(fechaText, leftX, sepY + 20);
    doc.text(totalText, rightX, sepY + 20, { align: 'right' } as any);
    // aumentar separación vertical antes de la tabla (+12pt)
    y = sepY + 46;
  }

  // table column widths (sum should be <= pageWidth - 2*margin)
  // Balanced widths: N°, N° suministro (wide), Usuario (balanced), Inicio (wider), Fin, Cuota (wider), Estado
  const colWidths = [30, 100, 115, 70, 75, 65, 70];
  const colsX: number[] = [];
  let x = margin;
  for (let w of colWidths) { colsX.push(x); x += w; }

  // header (table header with colored background) — styles copied from user-management autoTable
  doc.setFontSize(11); // header font size slightly larger to match reference image
  doc.setFont(undefined, 'bold');
  const headers = ['N°', 'N° suministro', 'Usuario', 'Inicio', 'Fin', 'Cuota', 'Estado'];
  const headerBgHeight = 22;
  // prepare table bounding box (we'll draw a gray border around it later)
  const tableLeft = margin - 4;
  // Calculate exact table width - use ONLY the sum of columns, no extra space
  const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const tableTop = y - 12; // header background Y
  // draw header background (use user-management header blue) - cover exactly to end of Estado column
  doc.setFillColor(0, 102, 204); // #0066cc
  const exactHeaderEnd = colsX[colWidths.length - 1] + colWidths[colWidths.length - 1];
  const exactHeaderWidth = exactHeaderEnd - tableLeft;
  doc.rect(tableLeft, tableTop, exactHeaderWidth, headerBgHeight + 6, 'F');
  doc.setTextColor(255, 255, 255);
  for (let i = 0; i < headers.length; i++) {
    // give more horizontal padding like the reference
    doc.text(String(headers[i]), colsX[i] + 6, y);
  }
  y += headerBgHeight + 8;
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  // Dibujar logo en la esquina superior izquierda del header (usamos imgLeftX/imgLeftY ya calculados)
  try {
    const imgX = imgLeftX;
    const imgY = imgLeftY;
    // Draw white box behind logo to match the visual in the reference (logo inside white square)
    const logoBoxPadding = 10;
    const logoBoxX = imgX - logoBoxPadding / 2;
    const logoBoxY = imgY - logoBoxPadding / 2;
    const logoBoxW = imgWidth + logoBoxPadding;
    const logoBoxH = imgHeight + logoBoxPadding;
    try {
      doc.setFillColor(255, 255, 255);
      doc.rect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 'F');
    } catch (_) { /* ignore drawing box */ }

    if (opts.organizationLogo) {
      try {
        if (String(opts.organizationLogo).startsWith('data:')) {
          doc.addImage(String(opts.organizationLogo), 'PNG', imgX, imgY, imgWidth, imgHeight);
        } else {
          const imgData = await loadImageDataUrl(String(opts.organizationLogo));
          doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
        }
      } catch (e) {
        try {
          const imgData = await loadImageDataUrl('/assets/images/Gotita.png');
          doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
        } catch (_) { /* ignore */ }
      }
    } else {
      try {
        const imgData = await loadImageDataUrl('/assets/images/Gotita.png');
        doc.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
      } catch (_) { /* ignore */ }
    }
  } catch (e) {
    // no-op: seguir sin logo
  }

  const lineHeight = 24; // taller rows to match spacing in reference
  // Ensure body text uses normal weight (not bold) and set to dark gray, 10pt to match image
  doc.setFontSize(10);
  try { doc.setFont('helvetica', 'normal'); } catch (_) { doc.setFont(undefined, 'normal'); }
  // dark gray for body text (#333)
  doc.setTextColor(51, 51, 51);
  // collect rendered rows so we can later paint a full light-gray background
  const renderedRows: Array<{ values: string[]; y: number; rowIndex: number; }> = [];
  // Filtrar solo assignments válidos para evitar filas adicionales - verificación más estricta
  
  const validAssignments = assignments.filter(a => {
    // Verificar que el assignment existe y tiene todos los campos requeridos
    if (!a || a === null || a === undefined) {
      return false;
    }
    if (!a.id || a.id === null || a.id === undefined || isNaN(a.id)) {
      return false;
    }
    if (!a.waterBoxId || a.waterBoxId === null || a.waterBoxId === undefined) {
      return false;
    }
    if (!a.userId || a.userId === null || a.userId === undefined || a.userId === '') {
      return false;
    }
    // Verificar que se pueda obtener el código de la caja y el nombre de usuario
    const boxCode = opts.getBoxCodeById(a.waterBoxId);
    const username = opts.getUsernameById(a.userId);
    if (!boxCode || boxCode === '') {
      return false;
    }
    if (!username || username === '') {
      return false;
    }
    return true;
  });
  


  // Doble verificación: procesar exactamente la cantidad de assignments válidos sin bucles externos
  
  for (let rowIndex = 0; rowIndex < validAssignments.length; rowIndex++) {
    const a = validAssignments[rowIndex];
    
    // Verificación adicional por si acaso
    if (!a || !a.id || !a.waterBoxId || !a.userId) {
      continue;
    }
    
    // reinforce normal weight for each row (some jsPDF versions may preserve previous bold state)
    try { doc.setFont('helvetica', 'normal'); } catch (_) { doc.setFont(undefined, 'normal'); }
    
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      // re-draw header on new page
      y = margin;
      // small top header indicator
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(opts.title || 'Reporte', margin, y);
      doc.setFont(undefined, 'normal');
      y += 18;
    }
    
    const boxCode = opts.getBoxCodeById(a.waterBoxId);
    const username = opts.getUsernameById(a.userId);
    const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '-';
    const end = a.endDate ? new Date(a.endDate).toLocaleDateString() : '-';
    const fee = typeof a.monthlyFee === 'number' ? `S/ ${a.monthlyFee.toFixed(2)}` : (a.monthlyFee || '-');

    // Usar índice incremental simple en lugar de ID del assignment para evitar números inconsistentes
    const values = [String(rowIndex + 1), String(boxCode), String(username), String(start), String(end), String(fee), String(formatAssignmentStatus(a.status))];
    

    
    // alternating row background
    if (rowIndex % 2 === 0) {
      // alternate rows like autoTable (light gray) - use exact table width to avoid extra gray cells
      doc.setFillColor(245, 245, 245); // #f5f5f5
      doc.rect(tableLeft, y - lineHeight + 6, tableWidth, lineHeight, 'F');
    }
    // draw borders for row
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    // text values
    for (let i = 0; i < values.length && i < headers.length; i++) {
      const tx = String(values[i]);
      // simple truncation if too long
      const maxChars = Math.floor(colWidths[i] / 6);
      const text = tx.length > maxChars ? tx.slice(0, maxChars - 3) + '...' : tx;
      // apply horizontal padding for body cells
      if (i === headers.length - 1) {
        // center Estado column
        const centerX = colsX[i] + colWidths[i] / 2;
        try {
          doc.text(escapeHtml(text), centerX, y, { align: 'center' } as any);
        } catch (_) {
          doc.text(escapeHtml(text), colsX[i] + 6, y);
        }
      } else {
        doc.text(escapeHtml(text), colsX[i] + 6, y);
      }
    }
    // record row (y is the baseline used for the texts) so we can re-draw above the fill
    renderedRows.push({ values, y, rowIndex });
    y += lineHeight;
  }
  

  
  // Verificación final: asegurar que renderedRows tenga exactamente el mismo número que validAssignments
  if (renderedRows.length !== validAssignments.length) {
    // Truncar renderedRows para que coincida exactamente con validAssignments
    renderedRows.splice(validAssignments.length);
  }

  // Dibujar borde gris (cuadro) alrededor de la tabla completa (encierra header + filas)
  try {
    // Calcular tableBottom usando exactamente las filas que se renderizaron, no la variable y
    const tableBottom = renderedRows.length > 0 ? 
      renderedRows[renderedRows.length - 1].y + 6 : // último Y + padding
      tableTop + headerBgHeight + 8; // si no hay filas, solo el header
    


    // Ensure the table interior is white (matching the example) then draw header and grid on top
    try {
      doc.setFillColor(255, 255, 255); // white background for table interior
      doc.rect(tableLeft, tableTop, tableWidth, tableBottom - tableTop, 'F');
    } catch (fillErr) {
      console.warn('Fallo al rellenar el fondo blanco del cuadro de tabla en jsPDF', fillErr);
    }

    // Re-draw header background and header texts on top of the fill - exact width to Estado column end
    try {
      doc.setFillColor(0, 102, 204);
      const exactHeaderEnd = colsX[colWidths.length - 1] + colWidths[colWidths.length - 1];
      const exactHeaderWidth = exactHeaderEnd - tableLeft;
      doc.rect(tableLeft, tableTop, exactHeaderWidth, headerBgHeight + 6, 'F');
      doc.setTextColor(255, 255, 255);
      try { doc.setFontSize(11); } catch (_) {}
      try {
        doc.setFont(undefined, 'bold');
      } catch (_) { /* ignore if font change fails */ }
      for (let i = 0; i < headers.length; i++) {
        doc.text(String(headers[i]), colsX[i] + 6, tableTop + 18);
      }
      try { doc.setFontSize(10); } catch (_) {}
      try {
        doc.setFont(undefined, 'normal');
      } catch (_) { /* ignore */ }
    } catch (hdrErr) {
      console.warn('No se pudo re-dibujar el encabezado sobre el fondo blanco', hdrErr);
    }

    // Re-draw rows on top of the filled area and draw internal grid lines
    try {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 51, 51);

      // Draw vertical grid lines (column separators) spanning the table
      try {
        doc.setDrawColor(200);
        doc.setLineWidth(0.4);
        // left outer border
        doc.line(tableLeft, tableTop, tableLeft, tableBottom);
        // internal verticals at each column right edge (NOT including after the last column)
        for (let ci = 0; ci < colWidths.length - 1; ci++) {
          const xLine = colsX[ci] + colWidths[ci];
          doc.line(xLine, tableTop, xLine, tableBottom);
        }
        // Draw only the final right border at the exact end of the last column
        const finalRightX = colsX[colWidths.length - 1] + colWidths[colWidths.length - 1];
        doc.line(finalRightX, tableTop, finalRightX, tableBottom);
      } catch (vErr) {
        console.warn('No se pudieron dibujar las líneas verticales de la rejilla', vErr);
      }

      // Draw horizontal separators like autoTable (row bottoms) - use exact column end
      try {
        doc.setDrawColor(200);
        doc.setLineWidth(0.4);
        const exactTableEnd = colsX[colWidths.length - 1] + colWidths[colWidths.length - 1];
        for (const r of renderedRows) {
          const rowBottom = r.y + 6; // consistent con el rect dibujado antes
          doc.line(tableLeft, rowBottom, exactTableEnd, rowBottom);
        }
      } catch (hErr) {
        console.warn('No se pudieron dibujar las líneas horizontales de la rejilla', hErr);
      }

      // Re-draw texts for rows on top of the grid (no alternating fill to match example)
      for (const r of renderedRows) {
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        for (let i = 0; i < r.values.length; i++) {
          const tx = String(r.values[i] || '');
          let textToDraw = tx;
          try {
            // Prefer using getTextWidth to measure exact width
            const gtw = (doc as any).getTextWidth;
            if (gtw) {
              const maxW = Math.max(8, colWidths[i] - 8); // reserve some padding
              if (gtw(textToDraw) > maxW) {
                // truncate until it fits, then add ellipsis
                let truncated = textToDraw;
                while (truncated.length > 0 && gtw(truncated + '...') > maxW) {
                  truncated = truncated.slice(0, -1);
                }
                textToDraw = truncated.length > 0 ? (truncated + '...') : '...';
              }
            } else {
              // Fallback: approximate by characters (6pt per char)
              const approxCharW = 6;
              const maxChars = Math.max(3, Math.floor((colWidths[i] - 8) / approxCharW));
              if (textToDraw.length > maxChars) {
                textToDraw = textToDraw.slice(0, Math.max(0, maxChars - 3)) + '...';
              }
            }
          } catch (_) {
            // ignore measurement errors and fall back to simple truncation
            const maxChars = Math.max(3, Math.floor((colWidths[i] - 8) / 6));
            if (textToDraw.length > maxChars) textToDraw = textToDraw.slice(0, Math.max(0, maxChars - 3)) + '...';
          }
          // apply same horizontal padding used above
          if (i === headers.length - 1) {
            const centerX = colsX[i] + colWidths[i] / 2;
            try {
              doc.text(escapeHtml(textToDraw), centerX, r.y, { align: 'center' } as any);
            } catch (_) {
              doc.text(escapeHtml(textToDraw), colsX[i] + 6, r.y);
            }
          } else {
            doc.text(escapeHtml(textToDraw), colsX[i] + 6, r.y);
          }
        }
      }
    } catch (rowsErr) {
      console.warn('No se pudieron re-dibujar las filas sobre el fondo gris', rowsErr);
    }

    // Finally draw the outer gray stroke (frame) - use exact column coordinates
    try {
      doc.setDrawColor(180); // gris suave
      doc.setLineWidth(0.8);
      const exactTableEnd = colsX[colWidths.length - 1] + colWidths[colWidths.length - 1];
      // top - only to exact end of Estado column
      doc.line(tableLeft, tableTop, exactTableEnd, tableTop);
      // left
      doc.line(tableLeft, tableTop, tableLeft, tableBottom);
      // bottom - only to exact end of Estado column
      doc.line(tableLeft, tableBottom, exactTableEnd, tableBottom);
      // NO right outer border - already drawn exactly at finalRightX in the vertical lines section
    } catch (frameErr) {
      console.warn('No se pudo dibujar el marco parcial de la tabla', frameErr);
    }
  } catch (e) {
    // no-op si falla el dibujo del borde
    console.warn('No se pudo dibujar el borde de la tabla en jsPDF', e);
  }

  // --- Bloque de verificación + QR (copiado/adaptado desde payments-billing) ---
  try {
    const readableDateTime = generateReadableDateTime();
    const ruc = '20445398455'; // mismo RUC usado en payments module
    const verificationHash = generateVerificationHash(ruc);

    // Texto del bloque de verificación (omitimos 'Emitido' porque ya aparece en el header)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(8);
    doc.text('Código de Verificación:', 15, y + 12);

    // Mostrar el hash en una sola línea (corrida). Si no cabe, truncar con '...'
    const codeStr = verificationHash || '';
    const qrSize = 60;
    const qrX = pageWidth - margin - qrSize;
    const availableWidth = Math.max(50, qrX - (15 + 6)); // espacio disponible antes del QR
    const approxCharWidth = 6; // aproximación en pts por carácter
    const maxChars = Math.max(10, Math.floor(availableWidth / approxCharWidth));
    let displayCode = codeStr;
    if (displayCode.length > maxChars) {
      displayCode = displayCode.substring(0, maxChars - 3) + '...';
    }

    // Código en una línea separada de la etiqueta
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(displayCode, 15, y + 22);

    // Nota explicativa
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Hash SHA-256 generado con fecha actual exacta + RUC', 15, y + 30);

    // Ajustar posición vertical base para el QR de modo que quede alineado con la línea del código
    const qrBaseY = y + 14;

    // Intentar generar QR que contenga PDF compacto y metadatos
    try {
      const timestamp = new Date().toISOString();
      const compactPdf = createCompactPDFForAssignment(assignments.length, timestamp, ruc, verificationHash);
      const qrData = JSON.stringify({ tipo: 'asignaciones', timestamp, ruc, hash: verificationHash.substring(0, 16), pdfCompacto: compactPdf });
      let qrCodeImage = '';
      try {
        qrCodeImage = await generateQRCode(qrData);
      } catch (e) {
        // fallback: QR con datos básicos
        const basicQr = JSON.stringify({ tipo: 'asignaciones', timestamp, ruc, hash: verificationHash.substring(0, 16), mensaje: 'PDF disponible en impreso' });
        qrCodeImage = await generateQRCode(basicQr);
      }

      if (qrCodeImage) {
        try {
          // Dibujar QR alineado a la derecha y verticalmente alineado al bloque de hash
          const qrSize = 60;
          const qrX = pageWidth - margin - qrSize;
          const qrY = qrBaseY - 4; // un poco más arriba para no quedar muy abajo
          doc.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text('Código QR con PDF', qrX + 6, qrY + qrSize + 12);
          doc.setFontSize(6);
          doc.text('Escanear para descargar', qrX + 4, qrY + qrSize + 18);
        } catch (err) {
          console.warn('No se pudo insertar el QR en el PDF de asignaciones', err);
          doc.setFontSize(8);
          doc.text('QR: Ver versión digital', pageWidth - 140, y + 20);
        }
      }
    } catch (qrErr) {
      console.warn('Generación de QR falló para asignaciones', qrErr);
      doc.setFontSize(8);
      doc.text('QR generándose...', pageWidth - 140, y + 20);
    }
  } catch (e) {
    console.warn('Error generando bloque de verificación en PDF de asignaciones', e);
  }

  // --- Footer en cada página (línea, fondo suave y textos centrados / número de página) ---
  try {
    const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
    const footerHeight = 48;
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      // draw light background block for footer
      const footerTop = pageHeight - footerHeight;
      doc.setFillColor(246, 246, 246);
      doc.rect(0, footerTop, pageWidth, footerHeight, 'F');
      // thin separator line above footer
      doc.setDrawColor(200);
      doc.setLineWidth(0.8);
      const lineY = footerTop - 8;
      if (lineY > 0) doc.line(margin + 8, lineY, pageWidth - margin - 8, lineY);

      // footer texts
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      try { doc.setFont('helvetica', 'normal'); } catch (_) { doc.setFont(undefined, 'normal'); }
      const centerX = pageWidth / 2;
      doc.text('Documento generado automáticamente por el Sistema JASS', centerX, footerTop + 18, { align: 'center' } as any);
      doc.text('Este documento no requiere firma', centerX, footerTop + 32, { align: 'center' } as any);
      doc.text(`Página ${p} de ${pageCount}`, pageWidth - margin, footerTop + 18, { align: 'right' } as any);
    }
  } catch (fErr) {
    // no-op: si algo falla en el footer, no evitar guardar el PDF
    console.warn('No se pudo dibujar el footer en el PDF', fErr);
  }

  doc.save(filename);
}

async function ensureHtml2PdfLoaded(): Promise<void> {
  const win = window as any;
  if (win && win.html2pdf) return;
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('html2pdf-cdn');
    if (existing) { setTimeout(() => resolve(), 150); return; }
    const s = document.createElement('script');
    s.id = 'html2pdf-cdn';
    s.type = 'text/javascript';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js';
    s.onload = () => setTimeout(() => resolve(), 150);
    s.onerror = () => reject(new Error('Failed to load html2pdf from CDN'));
    document.head.appendChild(s);
  });
}

export async function generateAssignmentsPdf(assignments: WaterBoxAssignment[], opts: GeneratePdfOptions): Promise<void> {
  const title = opts.title || 'Reporte de Asignaciones';
  const now = new Date();
  const filename = opts.filename || `reporte-asignaciones-${now.toISOString().slice(0,10)}.pdf`;

  // Try jsPDF-based generator first (textual table). This avoids html2canvas blank pages.
  try {
    await generateWithJsPdf(assignments || [], { ...opts, title }, filename);
    return;
  } catch (err) {
    console.warn('jsPDF generation failed, falling back to html2pdf/print', err);
  }

  // Fallback: attempt html2pdf (keeps previous wrapper technique)
  // Filtrar assignments válidos antes de generar HTML - verificación más estricta
  const validAssignments = (assignments || []).filter(a => {
    // Verificar que el assignment existe y tiene todos los campos requeridos
    if (!a || a === null || a === undefined) return false;
    if (!a.id || a.id === null || a.id === undefined || isNaN(a.id)) return false;
    if (!a.waterBoxId || a.waterBoxId === null || a.waterBoxId === undefined) return false;
    if (!a.userId || a.userId === null || a.userId === undefined || a.userId === '') return false;
    // Verificar que se pueda obtener el código de la caja y el nombre de usuario
    const boxCode = opts.getBoxCodeById(a.waterBoxId);
    const username = opts.getUsernameById(a.userId);
    if (!boxCode || boxCode === '') return false;
    if (!username || username === '') return false;
    return true;
  });
  
  // Fallback HTML header that visually resembles the jsPDF header (blue stripe + title)
  const logoImgHtml = opts.organizationLogo ? `<img src="${escapeHtml(String(opts.organizationLogo))}" style="width:72px;height:72px;object-fit:contain;display:block;"/>` : '';
  const orgNameHtml = opts.organizationName ? `<div style="display:inline-block;vertical-align:middle;margin-left:12px"><div style="font-size:20px;font-weight:700;color:#fff">${escapeHtml(String(opts.organizationName))}</div><div style="font-size:11px;color:#fff">Sistema de Agua Potable y Alcantarillado</div></div>` : '';
  const headerHtml = `
    <div style="width:100%;background:#0c6ed0;padding:18px 20px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:1000px;margin:0 auto;display:flex;align-items:center">
        <div style="background:#fff;padding:8px;display:inline-block;box-sizing:border-box;width:92px;height:92px;display:flex;align-items:center;justify-content:center">${logoImgHtml}</div>
        ${orgNameHtml}
      </div>
    </div>
    <div style="padding:24px 20px 6px 20px;font-family:Arial,Helvetica,sans-serif;max-width:1000px;margin:0 auto;text-align:center">
      <h2 style="margin:0 0 12px 0;font-size:18px;color:#111;font-weight:700">${escapeHtml(title).toUpperCase()}</h2>
    </div>
    <div style="max-width:1000px;margin:0 auto;padding:0 20px 30px 20px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:12px;color:#444">Fecha de generación: ${escapeHtml(now.toLocaleDateString())}</div>
      <div style="font-size:12px;color:#444">Total: ${validAssignments.length}</div>
    </div>
  `;
    // Table header styled like user-management autoTable but tuned to match screenshot
    // Balanced widths: N°(6%), N° suministro(20%), Usuario(23%), Inicio(14%), Fin(15%), Cuota(13%), Estado(14%)
    const tableHeader = `<thead><tr style="background:#0066cc;color:#fff"><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:6%">N°</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:20%">N° suministro</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:23%">Usuario</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:14%">Inicio</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:15%">Fin</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:13%">Cuota</th><th style="padding:8px;border:1px solid #ddd;font-weight:700;font-size:12px;color:#fff;width:14%;border-right:1px solid #ddd">Estado</th></tr></thead>`;
    // Usar los assignments válidos ya filtrados anteriormente
    const rows = validAssignments.map((a, ridx) => {
    const boxCode = opts.getBoxCodeById(a.waterBoxId);
    const username = opts.getUsernameById(a.userId);
    const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '-';
    const end = a.endDate ? new Date(a.endDate).toLocaleDateString() : '-';
    const fee = typeof a.monthlyFee === 'number' ? `S/ ${a.monthlyFee.toFixed(2)}` : (a.monthlyFee || '-');
    const cells = [
      escapeHtml(ridx + 1), // Usar índice incremental en lugar del ID
      escapeHtml(boxCode),
      escapeHtml(username),
      escapeHtml(start),
      escapeHtml(end),
      escapeHtml(fee),
      escapeHtml(formatAssignmentStatus(a.status))
    ];
    const columnWidths = ['6%', '19%', '22%', '16%', '12%', '14%', '11%'];
    const tds = cells.map((c, idx) => {
      const base = `padding:8px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;border-left:1px solid #ddd;width:${columnWidths[idx]};`;
      const right = 'border-right:1px solid #ddd';
      // center Estado column
      if (idx === 6) {
        return `<td style="${base}${right}font-weight:400;font-size:10px;color:#333;text-align:center">${c}</td>`;
      }
      return `<td style="${base}${right}font-weight:400;font-size:10px;color:#333">${c}</td>`;
    }).join('');
      // alternate row background to match autoTable alternateRowStyles (#f5f5f5)
      const rowBg = ridx % 2 === 0 ? 'background:#f5f5f5' : '';
      return `<tr style="${rowBg}">${tds}</tr>`;
  }).join('');
    const tableHtml = `<table style="border-collapse:collapse;width:100%;min-width:800px;font-size:10px;background:#fff">${tableHeader}<tbody>${rows}</tbody></table>`;
  // Envolver la tabla en un contenedor blanco con borde (sin borde derecho) para que el cuadro tenga el borde y la rejilla como en el ejemplo
  // Allow horizontal scroll so the rightmost column (Estado) is not clipped
  const tableHtmlWrapped = `<div style="background:#ffffff;border-top:1px solid #ddd;border-left:1px solid #ddd;border-bottom:1px solid #ddd;border-right:1px solid #ddd;border-radius:4px;overflow:auto;margin:0 0 12px 0">${tableHtml}</div>`;

  // Create wrapper on-screen (visible) but positioned to top-left; it will be removed after generation
  const wrapper = document.createElement('div');
  wrapper.id = 'assignments-pdf-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  // let wrapper expand to full available width so table fits — keep max-width in inner container
  wrapper.style.width = '100%';
  wrapper.style.padding = '8px';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#111';
  wrapper.style.opacity = '1';
  wrapper.style.zIndex = '99999';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.pointerEvents = 'none';
  // Add footer HTML for the html2pdf fallback so printed wrapper resembles the jsPDF footer
  const footerHtml = `
    <div style="width:100%;background:#f6f6f6;padding:12px 20px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;margin-top:12px;">
      <div style="max-width:1000px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;">
        <div style="text-align:center;margin:0 auto;">
          <div style="font-size:11px;color:#666">Documento generado automáticamente por el Sistema JASS</div>
          <div style="font-size:11px;color:#666;margin-top:6px">Este documento no requiere firma</div>
        </div>
        <div style="font-size:11px;color:#666;margin-left:12px">Página 1 de 1</div>
      </div>
    </div>
  `;

  wrapper.innerHTML = headerHtml + tableHtmlWrapped + footerHtml;
  document.body.appendChild(wrapper);

  // Wait a moment for layout
  await new Promise(res => setTimeout(res, 150));

  try {
    await ensureHtml2PdfLoaded();
    const win = window as any;
    if (win && win.html2pdf) {
      // @ts-ignore
      await win.html2pdf().set({ margin: 10, filename, html2canvas: { scale: 2 } }).from(wrapper).save();
      return;
    }
  } catch (e) {
    console.warn('html2pdf failed in helper', e);
  } finally {
    try { document.body.removeChild(wrapper); } catch (e) { }
  }

  // Fallback: open printable window
  const popup = window.open('', '_blank');
  if (popup) {
    popup.document.write('<html><head><title>' + escapeHtml(filename) + '</title></head><body>' + headerHtml + tableHtml + footerHtml + '</body></html>');
    popup.document.close();
    popup.focus();
    try { popup.print(); } catch (e) { console.warn('print fallback failed', e); }
  } else {
    window.open('data:text/html;charset=utf-8,' + encodeURIComponent(headerHtml + tableHtml + footerHtml), '_blank');
  }
}
