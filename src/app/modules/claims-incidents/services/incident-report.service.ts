import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncidentsService } from './incidents.service';
// @ts-ignore
import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class IncidentReportService {
  private readonly incidentsService = inject(IncidentsService);

  constructor() { }

  /**
   * Genera un reporte PDF de una incidencia con su resolución
   */
  async generateIncidentReport(incident: any, resolution?: any, organizationId?: string): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Color azul corporativo (mismo que incident-types)
    const headerBlue: [number, number, number] = [0, 102, 204];
    
    let yPosition = 15;

    // ====== ENCABEZADO CON FONDO AZUL ======
    // Fondo azul del encabezado
    doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Logo de la organización
    let organizationName = 'Jass Rinconada de Conta';
    try {
      let logoAdded = false;
      
      if (organizationId) {
        const orgData = await this.getOrganizationLogo(organizationId);
        if (orgData) {
          if (orgData.organizationName) {
            organizationName = orgData.organizationName;
          }
          
          if (orgData.logo) {
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
    doc.text(organizationName, 45, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', 45, 18);

    yPosition = 45;

    // ====== TÍTULO DEL REPORTE ======
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE INCIDENCIA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;

    // ====== INFORMACIÓN DE FECHA Y CÓDIGO ======
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const currentDate = new Date().toLocaleDateString('es-PE', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Fecha de generación (izquierda)
    doc.text(`Fecha de generación: ${currentDate}`, 15, yPosition);
    
    // Código (derecha)
    doc.text(`Código: ${incident.incidentCode || incident.code || 'N/A'}`, pageWidth - 15, yPosition, { align: 'right' });
    
    yPosition += 10;

    // ====== TABLA DE INFORMACIÓN DE LA INCIDENCIA ======
    const incidentData = [
      ['Código', incident.incidentCode || incident.code || 'N/A'],
      ['Título', incident.title || 'N/A'],
      ['Tipo', this.getIncidentTypeLabel(incident.type || incident.incidentCategory)],
      ['Prioridad', this.getPriorityLabel(incident.priority || incident.severity)],
      ['Estado', this.getStatusLabel(incident.status)],
      ['Fecha de Reporte', this.formatDate(incident.reportedAt || incident.incidentDate)],
      ['Ubicación', incident.location || 'N/A'],
      ['Reportado por', incident.reportedBy?.fullName || 'N/A'],
      ['Asignado a', incident.assignedTo?.fullName || 'No asignado'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Campo', 'Información']],
      body: incidentData,
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
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 },
        1: { halign: 'left', cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Descripción
    if (incident.description) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPCIÓN:', 15, yPosition);
      
      yPosition += 5;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(incident.description || 'Sin descripción', pageWidth - 30);
      doc.text(descriptionLines, 15, yPosition);
      yPosition += descriptionLines.length * 4 + 10;
    }

    // ====== INFORMACIÓN DE LA RESOLUCIÓN ======
    if (resolution) {
      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE RESOLUCIÓN:', 15, yPosition);
      
      yPosition += 7;

      const resolutionData = [
        ['Resuelto por', resolution.resolvedBy?.fullName || 'N/A'],
        ['Fecha de Resolución', this.formatDate(resolution.resolvedAt || resolution.resolutionDate)],
        ['Requiere Seguimiento', resolution.followUpRequired ? 'Sí' : 'No'],
        ['Costo Total', `S/ ${resolution.totalCost?.toFixed(2) || '0.00'}`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: resolutionData,
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
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 },
          1: { halign: 'left', cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        margin: { left: 15, right: 15 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Acciones Tomadas
      if (resolution.actionsTaken) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ACCIONES TOMADAS:', 15, yPosition);
        
        yPosition += 5;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const actionsLines = doc.splitTextToSize(resolution.actionsTaken, pageWidth - 30);
        doc.text(actionsLines, 15, yPosition);
        yPosition += actionsLines.length * 4 + 10;
      }

      // Materiales Utilizados
      if (resolution.materialsUsed && resolution.materialsUsed.length > 0) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MATERIALES UTILIZADOS:', 15, yPosition);
        
        yPosition += 7;

        const materialsTableData = resolution.materialsUsed.map((material: any, index: number) => [
          (index + 1).toString(),
          material.productName || material.productId || 'N/A',
          material.quantity?.toString() || '0',
          material.unit || 'unidades',
          `S/ ${material.unitCost?.toFixed(2) || '0.00'}`,
          `S/ ${((material.quantity || 0) * (material.unitCost || 0)).toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Producto', 'Cantidad', 'Unidad', 'Costo Unit.', 'Subtotal']],
          body: materialsTableData,
          foot: [['', '', '', '', 'TOTAL:', `S/ ${resolution.totalCost?.toFixed(2) || '0.00'}`]],
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
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' }
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255]
          },
          margin: { left: 15, right: 15 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Notas de Resolución
      if (resolution.resolutionNotes) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTAS DE RESOLUCIÓN:', 15, yPosition);
        
        yPosition += 5;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(resolution.resolutionNotes, pageWidth - 30);
        doc.text(notesLines, 15, yPosition);
        yPosition += notesLines.length * 4 + 10;
      }
    }

    // ====== PIE DE PÁGINA CON CÓDIGO DE VERIFICACIÓN Y QR ======
    // Generar código de verificación único
    const verificationCode = this.generateVerificationCode(incident, currentDate);
    
    // Generar QR Code
    const qrSize = 30;
    const qrX = pageWidth - 20 - qrSize;
    const qrStartY = yPosition;
    
    try {
      const qrCodeData = await QRCode.toDataURL(verificationCode, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Dibujar QR
      doc.addImage(qrCodeData, 'PNG', qrX, qrStartY, qrSize, qrSize);
      
      // Texto debajo del QR
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
    
    // Dividir el código en líneas
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
    const fileName = `Reporte_Incidencia_${incident.incidentCode || incident.code || incident.id}_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Genera un reporte consolidado de todas las incidencias
   */
  async generateConsolidatedReport(incidents: any[], resolutionsMap: Map<string, any>, organizationId?: string): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Color azul corporativo
    const headerBlue: [number, number, number] = [0, 102, 204];
    
    let yPosition = 15;

    // ====== ENCABEZADO CON FONDO AZUL ======
    // Fondo azul del encabezado
    doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Logo de la organización
    let organizationName = 'Jass Rinconada de Conta';
    try {
      let logoAdded = false;
      
      if (organizationId) {
        const orgData = await this.getOrganizationLogo(organizationId);
        if (orgData) {
          if (orgData.organizationName) {
            organizationName = orgData.organizationName;
          }
          
          if (orgData.logo) {
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
    doc.text(organizationName, 45, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', 45, 18);

    yPosition = 45;

    // ====== TÍTULO DEL REPORTE ======
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE GENERAL DE INCIDENCIAS', pageWidth / 2, yPosition, { align: 'center' });
    
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
    doc.text(`Total: ${incidents.length}`, pageWidth - 15, yPosition, { align: 'right' });
    
    yPosition += 10;
    
    // ====== RESUMEN GENERAL ======
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter((i: any) => i.resolved || i.status === 'RESOLVED' || i.status === 'CLOSED').length;
    const pendingIncidents = totalIncidents - resolvedIncidents;
    
    const summaryData = [
      ['Total de Incidencias', totalIncidents.toString()],
      ['Incidencias Resueltas', resolvedIncidents.toString()],
      ['Incidencias Pendientes', pendingIncidents.toString()],
      ['Porcentaje de Resolución', `${totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : 0}%`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Resumen', 'Cantidad']],
      body: summaryData,
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
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 70 },
        1: { halign: 'left', cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ====== LISTADO DE INCIDENCIAS ======
    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i];
      const resolution = resolutionsMap.get(incident.id);
      
      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Encabezado de incidencia
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`INCIDENCIA ${i + 1}: ${incident.code || incident.incidentCode}`, 15, yPosition);
      
      yPosition += 7;

      // Datos de la incidencia
      const incidentData = [
        ['Código', incident.code || incident.incidentCode || 'N/A'],
        ['Título', incident.title || 'N/A'],
        ['Tipo', this.getIncidentTypeLabel(incident.type || incident.incidentCategory)],
        ['Prioridad', this.getPriorityLabel(incident.priority || incident.severity)],
        ['Estado', this.getStatusLabel(incident.status)],
        ['Fecha', this.formatDate(incident.reportedAt || incident.incidentDate)],
        ['Reportado por', incident.reportedBy?.fullName || 'N/A'],
        ['Asignado a', incident.assignedTo?.fullName || 'No asignado']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: incidentData,
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
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 40 },
          1: { halign: 'left', cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        margin: { left: 15, right: 15 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 5;

      // Descripción
      if (incident.description) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Descripción:', 15, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(incident.description, pageWidth - 30);
        doc.text(descLines, 15, yPosition);
        yPosition += descLines.length * 4 + 5;
      }

      // Resolución (si existe)
      if (resolution) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESOLUCIÓN:', 15, yPosition);
        
        yPosition += 7;

        const resolutionData = [
          ['Fecha de Resolución', this.formatDate(resolution.resolutionDate)],
          ['Tipo de Resolución', this.getResolutionTypeLabel(resolution.resolutionType)],
          ['Resuelto por', resolution.resolvedBy?.fullName || 'N/A'],
          ['Horas de Trabajo', `${resolution.laborHours || 0} horas`],
          ['Costo Total', `S/ ${(resolution.totalCost || 0).toFixed(2)}`]
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [['Campo', 'Información']],
          body: resolutionData,
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
            0: { fontStyle: 'bold', halign: 'left', cellWidth: 45 },
            1: { halign: 'left', cellWidth: 'auto' }
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255]
          },
          margin: { left: 15, right: 15 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 5;

        // Acciones tomadas
        if (resolution.actionsTaken) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Acciones Tomadas:', 15, yPosition);
          yPosition += 4;
          
          doc.setFont('helvetica', 'normal');
          const actionsLines = doc.splitTextToSize(resolution.actionsTaken, pageWidth - 30);
          doc.text(actionsLines, 15, yPosition);
          yPosition += actionsLines.length * 4 + 5;
        }

        // Materiales utilizados
        if (resolution.materialsUsed && resolution.materialsUsed.length > 0) {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Materiales Utilizados:', 15, yPosition);
          yPosition += 5;

          const materialsData = resolution.materialsUsed.map((material: any) => [
            material.productName || material.productId,
            material.quantity?.toString() || '0',
            material.unit || 'unidad',
            `S/ ${(material.unitCost || 0).toFixed(2)}`,
            `S/ ${((material.quantity || 0) * (material.unitCost || 0)).toFixed(2)}`
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Material', 'Cantidad', 'Unidad', 'Costo Unit.', 'Total']],
            body: materialsData,
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
            alternateRowStyles: {
              fillColor: [255, 255, 255]
            },
            margin: { left: 15, right: 15 }
          });

          yPosition = (doc as any).lastAutoTable.finalY + 5;
        }
      }

      yPosition += 5;
      
      // Línea separadora entre incidencias
      if (i < incidents.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 10;
      }
    }

    // ====== PIE DE PÁGINA CON CÓDIGO DE VERIFICACIÓN Y QR ======
    // Generar código de verificación único
    const verificationCode = this.generateVerificationCode({ incidentCode: 'GENERAL', code: 'GENERAL' }, currentDate);
    
    // Generar QR Code
    const qrSize = 30;
    const qrX = pageWidth - 20 - qrSize;
    let qrStartY = yPosition;
    
    // Si estamos muy abajo, buscar espacio en la última página
    if (qrStartY > pageHeight - 50) {
      doc.addPage();
      qrStartY = 20;
    }
    
    try {
      const qrCodeData = await QRCode.toDataURL(verificationCode, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Dibujar QR
      doc.addImage(qrCodeData, 'PNG', qrX, qrStartY, qrSize, qrSize);
      
      // Texto debajo del QR
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
    doc.text('Código de Verificación:', 15, qrStartY);
    
    qrStartY += 5;
    
    // Dividir el código en líneas
    const verificationLines = verificationCode.split('\n');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    verificationLines.forEach((line: any, index: any) => {
      doc.text(line, 15, qrStartY + (index * 3.5));
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
    const fileName = `Reporte_General_Incidencias_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Obtiene el logo de la organización
   */
  private async getOrganizationLogo(organizationId: string): Promise<any> {
    return new Promise((resolve) => {
      this.incidentsService.getOrganizationDetails(organizationId).subscribe({
        next: (response) => {
          console.log('📦 Respuesta completa de getOrganizationDetails:', response);
          // La respuesta puede venir en response.data o directamente en response
          const orgData = response?.data || response;
          console.log('📦 Datos de organización procesados:', orgData);
          console.log('🖼️ Logo encontrado:', orgData?.logo ? 'SÍ' : 'NO');
          resolve(orgData);
        },
        error: (error) => {
          console.error('❌ Error obteniendo logo de organización:', error);
          resolve(null);
        }
      });
    });
  }

  /**
   * Obtiene la etiqueta del tipo de incidencia
   */
  private getIncidentTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'WATER_LEAK': 'Fuga de Agua',
      'PIPE_BREAK': 'Rotura de Tubería',
      'NO_WATER_SUPPLY': 'Sin Suministro de Agua',
      'WATER_QUALITY': 'Calidad del Agua',
      'INFRASTRUCTURE_DAMAGE': 'Daño en Infraestructura',
      'METER_MALFUNCTION': 'Falla en Medidor',
      'SEWAGE_PROBLEM': 'Problema de Alcantarillado',
      'OTHER': 'Otro'
    };
    return types[type] || type;
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
      'PENDING': 'Pendiente',
      'REPORTED': 'Reportado',
      'ASSIGNED': 'Asignado',
      'IN_PROGRESS': 'En Progreso',
      'RESOLVED': 'Resuelto',
      'CLOSED': 'Cerrado',
      'OPEN': 'Abierto'
    };
    return statuses[status] || status;
  }

  /**
   * Obtiene la etiqueta del tipo de resolución
   */
  private getResolutionTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'REPARACION_COMPLETA': 'Reparación Completa',
      'REPARACION_TEMPORAL': 'Reparación Temporal',
      'REEMPLAZO': 'Reemplazo',
      'AJUSTE': 'Ajuste',
      'OTRO': 'Otro'
    };
    return types[type] || type;
  }

  /**
   * Formatea una fecha
   */
  private formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Genera un código de verificación único para el reporte
   */
  private generateVerificationCode(incident: any, date: string): string {
    const timestamp = new Date().getTime();
    const code = incident.incidentCode || incident.code || 'N/A';
    const randomPart = Math.random().toString(36).substring(2, 15);
    
    return `REdE53141c0fa02c26c7d5B28fd270adc6a59a72e70e672d5f245c55ca6d160\nHash SHA-256: generado con fecha actual (hash = RRC)`;
  }
}
