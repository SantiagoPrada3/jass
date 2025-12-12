import { Injectable } from '@angular/core';
import { Payment, PaymentDetail } from '../models/payment.model';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import * as CryptoJS from 'crypto-js';
import * as QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  // Generar timestamp en formato fecha-hora-minuto-segundo
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  // Generar fecha legible para mostrar en el PDF
  private generateReadableDateTime(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  // Generar hash SHA-256 con fecha actual completa (fecha, hora, minuto, segundo) y RUC
  private generateVerificationHash(ruc: string): string {
    // Obtener la fecha actual exacta en el momento de la generación
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Crear string con fecha completa: YYYYMMDDHHMMSS
    const currentDateTime = `${year}${month}${day}${hours}${minutes}${seconds}`;

    // Combinar fecha actual + RUC para el hash
    const dataToHash = `${currentDateTime}${ruc}`;

    console.log(`Generando hash con: ${dataToHash}`);

    return CryptoJS.SHA256(dataToHash).toString(CryptoJS.enc.Hex);
  }

  // Generar código de verificación corto para mostrar (primeros 8 caracteres del hash)
  private generateShortVerificationCode(hash: string): string {
    return hash.substring(0, 8).toUpperCase();
  }

  // Crear una versión compacta del PDF para incluir en el QR
  private createCompactPDF(payment: Payment, finalAmount: number, timestamp: string, ruc: string, verificationHash: string): string {
    const compactDoc = new jsPDF('p', 'mm', [80, 120]); // Tamaño más pequeño

    // Contenido mínimo
    compactDoc.setFontSize(8);
    compactDoc.text(`Recibo: ${payment.paymentCode}`, 5, 10);
    compactDoc.text(`Usuario: ${payment.userName}`, 5, 15);
    compactDoc.text(`Monto: S/. ${finalAmount.toFixed(2)}`, 5, 20);
    compactDoc.text(`Fecha: ${new Date().toLocaleDateString()}`, 5, 25);
    compactDoc.text(`Estado: ${payment.paymentStatus}`, 5, 30);

    // Hash de verificación (solo primeros 16 caracteres)
    compactDoc.setFontSize(6);
    compactDoc.text(`Hash: ${verificationHash.substring(0, 16)}`, 5, 35);

    return compactDoc.output('datauristring');
  }

  // Generar código QR como imagen base64
  private async generateQRCode(data: string): Promise<string> {
    try {
      // Verificar el tamaño de los datos
      const dataSize = new Blob([data]).size;
      console.log(`Tamaño de datos para QR: ${dataSize} bytes`);

      if (dataSize > 2000) { // Límite aproximado para QR
        throw new Error('Datos demasiado grandes para código QR');
      }

      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 120,
        margin: 1,
        errorCorrectionLevel: 'L', // Nivel bajo para maximizar capacidad
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generando código QR:', error);
      throw error; // Re-lanzar el error para manejo en el método principal
    }
  }

  // Calcular el monto con recargo si es necesario
  calculateAmountWithSurcharge(payment: Payment): number {
    const paymentYear = new Date(payment.paymentDate).getFullYear();
    const currentYear = new Date().getFullYear();

    // Si el pago es de un año anterior al actual, agregar 5 soles de recargo
    if (paymentYear < currentYear) {
      return payment.totalAmount + 5;
    }

    return payment.totalAmount;
  }

  // Calcular el monto de detalle con recargo si es necesario
  calculateDetailAmountWithSurcharge(detail: PaymentDetail, paymentDate: string): number {
    const paymentYear = new Date(paymentDate).getFullYear();
    const currentYear = new Date().getFullYear();

    // Si el pago es de un año anterior al actual, agregar recargo proporcional
    if (paymentYear < currentYear) {
      // Calcular recargo proporcional basado en el monto del detalle
      const surchargePercentage = 5 / 100; // 5 soles como porcentaje base
      return detail.amount + (detail.amount * surchargePercentage);
    }

    return detail.amount;
  }

  // Generar PDF individual para un pago
  async generatePaymentPDF(payment: Payment): Promise<void> {
    console.log('🔄 Iniciando generación de PDF para pago:', payment.paymentCode);

    // Usar logo directamente si está disponible en el payment
    let organizationLogo: string | null = null;
    if (payment.organizationLogo) {
      try {
        console.log('🖼️ Logo encontrado en payment.organizationLogo');
        console.log('🔗 URL del logo:', payment.organizationLogo);

        organizationLogo = payment.organizationLogo;
        console.log('✅ Logo listo para usar en PDF');
      } catch (error) {
        console.error('❌ Error procesando logo:', error);
        organizationLogo = null;
      }
    } else {
      console.log('⚠️ No se encontró logo en payment.organizationLogo');
    }

    // Crear dos documentos: uno temporal para generar el QR y uno final
    const tempDoc = new jsPDF();
    const finalAmount = this.calculateAmountWithSurcharge(payment);

    // Generar datos de verificación
    const timestamp = this.generateTimestamp();
    const ruc = '20445398455';
    const verificationHash = this.generateVerificationHash(ruc);

    // Crear un PDF compacto para incluir en el QR
    const compactPdfBase64 = this.createCompactPDF(payment, finalAmount, timestamp, ruc, verificationHash);

    // Crear datos para el QR que incluyen el PDF compacto
    const currentDateTime = new Date();
    const qrData = JSON.stringify({
      codigo: payment.paymentCode,
      ruc: ruc,
      timestamp: timestamp,
      fechaEmision: currentDateTime.toISOString(),
      monto: finalAmount,
      hash: verificationHash.substring(0, 16),
      pdfCompacto: compactPdfBase64 // Incluir el PDF compacto
    });

    // Generar el QR con el PDF incluido
    let qrCodeImage: string;
    try {
      qrCodeImage = await this.generateQRCode(qrData);
      console.log('QR generado exitosamente con PDF compacto incluido');
    } catch (error) {
      console.warn('PDF compacto aún demasiado grande para QR, usando datos básicos');
      // Fallback: QR solo con datos básicos si incluso el PDF compacto es muy grande
      const basicQrData = JSON.stringify({
        codigo: payment.paymentCode,
        ruc: ruc,
        timestamp: timestamp,
        monto: finalAmount,
        hash: verificationHash.substring(0, 16),
        mensaje: 'PDF disponible en el documento impreso'
      });
      qrCodeImage = await this.generateQRCode(basicQrData);
    }

    // Crear el documento final con el QR y logo incluidos
    const finalDoc = new jsPDF();
    this.createPDFContent(finalDoc, payment, finalAmount, timestamp, ruc, verificationHash, qrCodeImage, organizationLogo);

    // Descargar el PDF final
    finalDoc.save(`recibo-${payment.paymentCode}.pdf`);
    console.log('✅ PDF generado exitosamente:', `recibo-${payment.paymentCode}.pdf`);
  }

  // Método auxiliar para crear el contenido del PDF
  private createPDFContent(
    doc: jsPDF,
    payment: Payment,
    finalAmount: number,
    timestamp: string,
    ruc: string,
    verificationHash: string,
    qrCodeImage: string | null,
    organizationLogo: string | null = null
  ): void {

    // ===========================
    // HEADER - ENCABEZADO MEJORADO
    // ===========================

    // Fondo header con degradado visual (usando rectángulos superpuestos)
    doc.setFillColor(0, 102, 204); // Azul profesional
    doc.rect(0, 0, 210, 40, 'F');

    // Logo de la organización (lado derecho) - Más pequeño
    if (organizationLogo) {
      try {
        console.log('🖼️ Agregando logo al PDF');
        doc.addImage(organizationLogo, 'JPEG', 165, 8, 30, 24);
        console.log('✅ Logo agregado exitosamente');
      } catch (error) {
        console.error('❌ Error agregando logo:', error);
      }
    }

    // Título principal de la organización
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('JUNTA ADMINISTRADORA DE', 10, 12);
    doc.text('SERVICIO Y SANEAMIENTO', 10, 19);
    doc.setFontSize(12);
    doc.text('JASS/PNC-R', 10, 26);

    // Información de contacto (fuente más pequeña)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUC: ${ruc} | Cel: 974839389`, 10, 33);

    // Recuadro con información del recibo (lado derecho del header)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 45, 85, 20, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(0, 102, 204);
    doc.setFont('helvetica', 'bold');
    doc.text('N° RECIBO:', 12, 52);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(payment.paymentCode, 35, 52);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text('FECHA:', 12, 59);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(payment.paymentDate).toLocaleDateString('es-PE'), 30, 59);

    // ===========================
    // DATOS DEL USUARIO
    // ===========================

    let yPosition = 70;

    // Título de sección
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPosition, 190, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(0, 102, 204);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL USUARIO', 15, yPosition + 5.5);

    yPosition += 8;

    // Contenido de datos del usuario con mejor espaciado
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(10, yPosition, 190, 30, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('N° Documento:', 15, yPosition + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(payment.userDocument || 'N/A', 50, yPosition + 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('Nombre:', 15, yPosition + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    // Dividir nombre largo si es necesario
    const nameLines = doc.splitTextToSize(payment.userName || 'N/A', 150);
    nameLines.forEach((line: string, index: number) => {
      doc.text(line, 50, yPosition + 15 + (index * 5));
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('Dirección:', 15, yPosition + 23);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const addressLines = doc.splitTextToSize(payment.userAddress || 'N/A', 140);
    addressLines.forEach((line: string, index: number) => {
      doc.text(line, 50, yPosition + 23 + (index * 5));
    }); yPosition += 35;

    // ===========================
    // TABLA DE SERVICIOS - DISEÑO PROFESIONAL
    // ===========================

    // Header de tabla
    doc.setFillColor(0, 102, 204);
    doc.rect(10, yPosition, 190, 10, 'F');

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTO', 15, yPosition + 6.5);
    doc.text('PERÍODO', 135, yPosition + 6.5);
    doc.text('IMPORTE', 185, yPosition + 6.5, { align: 'right' });

    yPosition += 10;

    // Líneas de la tabla
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);

    const tableStartY = yPosition;

    // Contenido de la tabla
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    if (payment.details && payment.details.length > 0) {
      payment.details.forEach((detail, index) => {
        const detailAmount = this.calculateDetailAmountWithSurcharge(detail, payment.paymentDate);

        // Fondo alternado para filas
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(10, yPosition, 190, 10, 'F');
        }

        // Concepto
        const conceptText = detail.concept.toUpperCase();
        const conceptLines = doc.splitTextToSize(conceptText, 110);
        conceptLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, 12, yPosition + 5 + (lineIndex * 4));
        });

        // Período
        doc.text(`${this.getMonthName(detail.month)}`, 137, yPosition + 5);
        doc.text(`${detail.year}`, 137, yPosition + 8);

        // Importe
        doc.setFont('helvetica', 'bold');
        doc.text(`S/ ${detailAmount.toFixed(2)}`, 195, yPosition + 6.5, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        yPosition += 10;

        // Línea separadora
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(10, yPosition, 200, yPosition);
      });
    } else {
      // Si no hay detalles, mostrar un solo servicio
      doc.setFillColor(250, 250, 250);
      doc.rect(10, yPosition, 190, 10, 'F');

      const serviceText = payment.paymentType.replace('_', ' DE ').toUpperCase();
      doc.text(serviceText, 12, yPosition + 6.5);

      const paymentYear = new Date(payment.paymentDate).getFullYear();
      const paymentMonth = new Date(payment.paymentDate).getMonth() + 1;
      doc.text(`${this.getMonthName(paymentMonth)}`, 137, yPosition + 4);
      doc.text(`${paymentYear}`, 137, yPosition + 7.5);

      doc.setFont('helvetica', 'bold');
      doc.text(`S/ ${finalAmount.toFixed(2)}`, 195, yPosition + 6.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      yPosition += 10;
    }

    // Borde completo de la tabla
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(10, tableStartY, 10, yPosition); // Izquierda
    doc.line(200, tableStartY, 200, yPosition); // Derecha
    doc.line(10, yPosition, 200, yPosition); // Inferior
    doc.line(130, tableStartY, 130, yPosition); // Separador período
    doc.line(165, tableStartY, 165, yPosition); // Separador importe

    yPosition += 5;

    // ===========================
    // TOTAL - DESTACADO
    // ===========================

    doc.setFillColor(0, 153, 51); // Verde para total
    doc.roundedRect(10, yPosition, 190, 15, 2, 2, 'F');

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTE TOTAL:', 15, yPosition + 10);
    doc.setFontSize(16);
    doc.text(`S/ ${finalAmount.toFixed(2)}`, 195, yPosition + 10, { align: 'right' });

    yPosition += 20;

    // ===========================
    // ESTADO DEL PAGO
    // ===========================

    let statusColor: [number, number, number] = [255, 165, 0];
    let statusText = 'PENDIENTE';

    if (payment.paymentStatus === 'Pagado') {
      statusColor = [0, 153, 51]; // Verde
      statusText = 'PAGADO';
    } else if (payment.paymentStatus === 'Cancelado') {
      statusColor = [220, 20, 60]; // Rojo
      statusText = 'CANCELADO';
    }

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(65, yPosition, 80, 18, 3, 3, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, 105, yPosition + 12, { align: 'center' });

    yPosition += 23;

    // ===========================
    // MENSAJE INFORMATIVO
    // ===========================

    doc.setFillColor(255, 243, 205); // Amarillo suave
    doc.roundedRect(10, yPosition, 190, 20, 2, 2, 'F');

    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, yPosition, 190, 20, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setTextColor(120, 80, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Pague puntualmente y evite el corte del servicio', 105, yPosition + 6, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('"El agua es el elemento y principio de las cosas."', 105, yPosition + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Ama el agua, protegela', 105, yPosition + 17, { align: 'center' });

    yPosition += 25;    // ===========================
    // FOOTER - CÓDIGO QR Y VERIFICACIÓN
    // ===========================

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(10, yPosition, 200, yPosition);

    yPosition += 8;

    // Área de footer dividida en dos columnas
    const footerStartY = yPosition;

    // COLUMNA IZQUIERDA: Información de emisión y hash
    // Información de emisión
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de emisión:', 12, yPosition);
    doc.setFont('helvetica', 'normal');
    const readableDateTime = this.generateReadableDateTime();
    doc.text(readableDateTime, 12, yPosition + 5);

    yPosition += 12;

    // Hash de verificación
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('Código de verificación SHA-256:', 12, yPosition);
    yPosition += 4;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    // Dividir hash en 2 líneas más legibles
    const hashLine1 = verificationHash.substring(0, 32);
    const hashLine2 = verificationHash.substring(32);
    doc.text(hashLine1, 12, yPosition);
    yPosition += 3.5;
    doc.text(hashLine2, 12, yPosition);

    // COLUMNA DERECHA: Código QR con marco
    if (qrCodeImage) {
      try {
        const qrSize = 35;
        const qrX = 155;
        const qrY = footerStartY - 3;

        // Marco decorativo alrededor del QR
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(0.5);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 9, 2, 2, 'S');

        // QR code
        doc.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);

        // Texto debajo del QR
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Escanea para verificar', qrX + (qrSize / 2), qrY + qrSize + 5, { align: 'center' });
      } catch (error) {
        console.error('Error agregando QR al PDF:', error);
      }
    }
  }  // Exportar todos los pagos a Excel
  exportToExcel(payments: Payment[]): void {
    const data = payments.map(payment => {
      const finalAmount = this.calculateAmountWithSurcharge(payment);
      return {
        'Código de Pago': payment.paymentCode,
        'Organización': payment.organizationName,
        'Usuario': payment.userName,
        'Documento': payment.userDocument,
        'Email': payment.email,
        'Caja de Agua': payment.boxCode,
        'Tipo de Pago': payment.paymentType,
        'Método de Pago': payment.paymentMethod,
        'Monto Original': payment.totalAmount,
        'Monto Final': finalAmount,
        'Recargo Aplicado': finalAmount - payment.totalAmount,
        'Fecha de Pago': payment.paymentDate,
        'Estado': payment.paymentStatus,
        'Referencia Externa': payment.externalReference || 'N/A',
        'Fecha de Creación': payment.createdAt,
        'Última Actualización': payment.updatedAt
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `pagos-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Exportar todos los pagos a CSV
  exportToCSV(payments: Payment[]): void {
    const data = payments.map(payment => {
      const finalAmount = this.calculateAmountWithSurcharge(payment);
      return {
        'Código de Pago': payment.paymentCode,
        'Organización': payment.organizationName,
        'Usuario': payment.userName,
        'Documento': payment.userDocument,
        'Email': payment.email,
        'Caja de Agua': payment.boxCode,
        'Tipo de Pago': payment.paymentType,
        'Método de Pago': payment.paymentMethod,
        'Monto Original': payment.totalAmount,
        'Monto Final': finalAmount,
        'Recargo Aplicado': finalAmount - payment.totalAmount,
        'Fecha de Pago': payment.paymentDate,
        'Estado': payment.paymentStatus,
        'Referencia Externa': payment.externalReference || 'N/A',
        'Fecha de Creación': payment.createdAt,
        'Última Actualización': payment.updatedAt
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pagos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || 'N/A';
  }
}
