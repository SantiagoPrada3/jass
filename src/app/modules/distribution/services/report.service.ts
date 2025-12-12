import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Fare } from '../models/rates.model'; // Change to Fare model

@Injectable({
     providedIn: 'root'
})
export class ReportService {

     /**
      * Genera un reporte PDF de tarifas con el diseño estándar
      */
     async generateFareReport(
          tariffs: Fare[],
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215]; // #0078D7
          const headerBlue: [number, number, number] = [0, 102, 204]; // Azul del encabezado de tabla
          const lightGray: [number, number, number] = [245, 245, 245];

          // ========== ENCABEZADO ==========

          // Fondo azul superior
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    // Convertir la imagen a base64 si es necesario
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización (texto blanco)
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text(organizationName || 'JASS', 60, 20);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text('Sistema de Agua Potable y Alcantarillado', 60, 28);

          if (organizationPhone) {
               doc.setFontSize(10);
               doc.text(`Tel: ${organizationPhone}`, 60, 36);
          }

          // ========== TÍTULO DEL REPORTE ==========
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(15);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE DE TARIFAS', pageWidth / 2, 65, { align: 'center' });

          // Fecha de generación
          const today = new Date();
          const formattedDate = this.formatDate(today);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
          doc.text(`Total de tarifas: ${tariffs.length}`, pageWidth - 15, 75, { align: 'right' });

          // ========== TABLA DE TARIFAS ==========

          // Preparar datos para la tabla
          const tableData = tariffs.map((fare, index) => [
               (index + 1).toString(),
               fare.fareCode || '-',
               fare.fareName || '',
               this.formatFareType(fare.fareType) || '-',
               `S/. ${(fare.fareAmount || 0).toFixed(2)}`,
               this.formatDateOnly(fare.effectiveDate) || '-'
          ]);

          autoTable(doc, {
               startY: 85,
               head: [['#', 'Código', 'Nombre', 'Tipo', 'Monto', 'Vigencia']],
               body: tableData,
               theme: 'grid',
               headStyles: {
                    fillColor: headerBlue,
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [255, 255, 255]
               },
               bodyStyles: {
                    fontSize: 9,
                    cellPadding: 3,
                    valign: 'middle'
               },
               alternateRowStyles: {
                    fillColor: lightGray
               },
               columnStyles: {
                    0: { halign: 'center', cellWidth: 10 }, // #
                    1: { halign: 'center', cellWidth: 25 }, // Código
                    2: { halign: 'left', cellWidth: 45 },   // Nombre
                    3: { halign: 'center', cellWidth: 25 }, // Tipo
                    4: { halign: 'right', cellWidth: 30 },  // Monto
                    5: { halign: 'center', cellWidth: 25 } // Vigencia
               },
               margin: { left: 15, right: 15 }
          });

          // ========== RESUMEN ==========
          const finalY = (doc as any).lastAutoTable.finalY + 10;

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Resumen:', 15, finalY);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          const activeFares = tariffs.filter(f => f.status === 'ACTIVE').length;
          const inactiveFares = tariffs.filter(f => f.status === 'INACTIVE').length;

          doc.text(`• Tarifas activas: ${activeFares}`, 20, finalY + 8);
          doc.text(`• Tarifas inactivas: ${inactiveFares}`, 20, finalY + 15);
          doc.text(`• Total de tarifas: ${tariffs.length}`, 20, finalY + 22);

          // ========== PIE DE PÁGINA ==========
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
               doc.setPage(i);
               doc.setFontSize(8);
               doc.setTextColor(128, 128, 128);
               doc.text(
                    `Página ${i} de ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
               );
          }

          // Guardar el PDF
          const fileName = `reporte-tarifas-${this.formatDateForFilename(today)}.pdf`;
          doc.save(fileName);
     }

     /**
      * Carga una imagen y la convierte a base64
      */
     private loadImage(url: string): Promise<string> {
          return new Promise((resolve, reject) => {
               // Si ya es base64, devolver directamente
               if (url.startsWith('data:image')) {
                    resolve(url);
                    return;
               }

               const img = new Image();
               img.crossOrigin = 'Anonymous';
               img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
               };
               img.onerror = reject;
               img.src = url;
          });
     }

     /**
      * Formatea la fecha para mostrar
      */
     private formatDate(date: Date): string {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
     }

     /**
      * Formatea solo la fecha (sin hora) para mostrar
      */
     private formatDateOnly(dateInput: string | number): string {
          if (!dateInput) return '-';
          try {
               let date: Date;

               // Si es un número (timestamp en segundos), convertir a milisegundos
               if (typeof dateInput === 'number') {
                    date = new Date(dateInput * 1000); // Convertir de segundos a milisegundos
               } else {
                    date = new Date(dateInput);
               }

               // Validar que la fecha sea válida
               if (isNaN(date.getTime())) {
                    console.error('Invalid date:', dateInput);
                    return '-';
               }

               const day = date.getDate().toString().padStart(2, '0');
               const month = (date.getMonth() + 1).toString().padStart(2, '0');
               const year = date.getFullYear();
               return `${day}/${month}/${year}`;
          } catch (error) {
               console.error('Error al formatear fecha:', error);
               return '-';
          }
     }

     /**
      * Formatea la fecha para el nombre del archivo
      */
     private formatDateForFilename(date: Date): string {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
     }

     /**
      * Formatea el tipo de tarifa
      */
     private formatFareType(type: string): string {
          const fareTypes: { [key: string]: string } = {
               'SEMANAL': 'Semanal',
               'MENSUAL': 'Mensual',
               'ANUAL': 'Anual'
          };
          return fareTypes[type] || type || '-';
     }

}
