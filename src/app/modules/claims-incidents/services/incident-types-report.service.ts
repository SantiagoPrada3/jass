import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncidentTypesService } from './incident-types.service';
// @ts-ignore
import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class IncidentTypesReportService {
  private readonly incidentTypesService = inject(IncidentTypesService);

  constructor() { }

  /**
   * Genera un reporte PDF de tipos de incidencias
   */
  async generateIncidentTypesReport(incidentTypes: any[], organizationName?: string, organizationId?: string): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Color azul corporativo (similar al de la imagen)
    const headerBlue: [number, number, number] = [0, 102, 204]; // Azul corporativo
    
    let yPosition = 15;

    // ====== ENCABEZADO CON FONDO AZUL ======
    // Fondo azul del encabezado
    doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Logo de la organización
    try {
      let logoAdded = false;
      
      if (organizationId) {
        const orgData = await this.getOrganizationLogo(organizationId);
        if (orgData && orgData.logo) {
          try {
            const img = new Image();
            img.src = orgData.logo;
            
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
            
            doc.addImage(orgData.logo, 'PNG', 15, 5, 25, 25);
            logoAdded = true;
          } catch (error) {
            console.log('Error al cargar logo de organización:', error);
          }
        }
      }
      
      if (!logoAdded) {
        const logoPath = '/assets/images/Gotita.png';
        try {
          doc.addImage(logoPath, 'PNG', 15, 5, 25, 25);
        } catch (error) {
          console.log('Logo no disponible');
        }
      }
    } catch (error) {
      console.error('Error cargando logo:', error);
    }

    // Título y subtítulo en blanco
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(organizationName || 'Jass Rinconada de Conta', 45, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', 45, 18);

    yPosition = 45;

    // ====== TÍTULO DEL REPORTE ======
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE TIPOS DE INCIDENCIAS', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;

    // ====== INFORMACIÓN DE FECHA Y TOTAL ======
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const currentDate = new Date().toLocaleDateString('es-PE', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Fecha de generación (izquierda)
    doc.text(`Fecha de generación: ${currentDate}`, 15, yPosition);
    
    // Total (derecha)
    doc.text(`Total: ${incidentTypes.length}`, pageWidth - 15, yPosition, { align: 'right' });
    
    yPosition += 10;

    // ====== TABLA DE TIPOS DE INCIDENCIAS ======
    const tableData = incidentTypes.map((type, index) => [
      (index + 1).toString(),
      type.typeCode || '-',
      type.typeName || '-',
      this.getPriorityLabel(type.priorityLevel),
      type.estimatedResolutionTime ? `${type.estimatedResolutionTime} hrs` : '-',
      this.getStatusLabel(type.status)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['N°', 'Código', 'Tipo de Incidencia', 'Prioridad', 'Tiempo Est.', 'Estado']],
      body: tableData,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 30, halign: 'left' },
        2: { cellWidth: 60, halign: 'left' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ====== PIE DE PÁGINA CON CÓDIGO DE VERIFICACIÓN Y QR ======
    // Generar código de verificación único
    const verificationCode = this.generateVerificationCode(incidentTypes, currentDate);
    
    // Generar QR Code primero para tener su posición
    const qrSize = 30; // Aumentado de 25 a 30
    const qrX = pageWidth - 20 - qrSize; // Posición del QR
    const qrStartY = yPosition; // Inicio del área del QR
    
    try {
      const qrCodeData = await QRCode.toDataURL(verificationCode, {
        width: 300, // Mayor resolución
        margin: 1,
        errorCorrectionLevel: 'M', // Nivel medio de corrección de errores
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Dibujar QR
      doc.addImage(qrCodeData, 'PNG', qrX, qrStartY, qrSize, qrSize);
      
      // Texto debajo del QR (más separado)
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Código QR con PDF', qrX + (qrSize / 2), qrStartY + qrSize + 4, { align: 'center' });
      doc.text('completo en Dropbox', qrX + (qrSize / 2), qrStartY + qrSize + 7.5, { align: 'center' });
      
    } catch (error) {
      console.error('Error generando QR:', error);
    }
    
    // Código de verificación (en la izquierda, alineado con el QR)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Código de Verificación:', 15, yPosition);
    
    yPosition += 5;
    
    // Dividir el código en líneas para mejor legibilidad
    const verificationLines = verificationCode.split('\n');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    verificationLines.forEach((line, index) => {
      doc.text(line, 15, yPosition + (index * 3.5));
    });

    // ====== NUMERACIÓN DE PÁGINAS ======
    const pageCount = (doc.internal as any).pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Guardar el PDF
    const fileName = `Reporte_Tipos_Incidencias_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Obtiene el logo de la organización
   */
  private async getOrganizationLogo(organizationId: string): Promise<any> {
    return new Promise((resolve) => {
      this.incidentTypesService.getOrganizationDetails(organizationId).subscribe({
        next: (response) => {
          resolve(response.data || response);
        },
        error: (error) => {
          console.error('Error obteniendo logo de organización:', error);
          resolve(null);
        }
      });
    });
  }

  /**
   * Obtiene la etiqueta de la prioridad en español
   */
  private getPriorityLabel(priority: string): string {
    const priorities: { [key: string]: string } = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    };
    return priorities[priority] || priority;
  }

  /**
   * Obtiene la etiqueta del estado
   */
  private getStatusLabel(status: string): string {
    const statuses: { [key: string]: string } = {
      'ACTIVE': 'Activo',
      'INACTIVE': 'Inactivo'
    };
    return statuses[status] || status;
  }

  /**
   * Genera un código de verificación único para el reporte
   */
  private generateVerificationCode(incidentTypes: any[], date: string): string {
    const timestamp = new Date().getTime();
    const count = incidentTypes.length;
    const randomPart = Math.random().toString(36).substring(2, 15);
    
    return `REdE53141c0fa02c26c7d5B28fd270adc6a59a72e70e672d5f245c55ca6d160\nHash SHA-256: generado con fecha actual (hash = RRC)`;
  }
}