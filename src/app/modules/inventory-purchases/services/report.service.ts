import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../models/product.model';
import { Purchase } from '../models/purchase.model';

@Injectable({
     providedIn: 'root'
})
export class InventoryReportService {

     /**
      * Genera un reporte PDF de productos
      */
     async generateProductReport(
          products: Product[],
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215]; // #0078D7
          const headerBlue: [number, number, number] = [0, 102, 204];
          const lightGray: [number, number, number] = [245, 245, 245];

          // ========== ENCABEZADO ==========
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización
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
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE DE PRODUCTOS', pageWidth / 2, 65, { align: 'center' });

          // Fecha de generación
          const today = new Date();
          const formattedDate = this.formatDate(today);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
          doc.text(`Total de productos: ${products.length}`, pageWidth - 15, 75, { align: 'right' });

          // ========== TABLA DE PRODUCTOS ==========
          const tableData = products.map((product, index) => [
               (index + 1).toString(),
               product.productCode || '-',
               product.productName || '-',
               product.categoryName || '-',
               product.unitOfMeasure || '-',
               product.currentStock?.toString() || '0',
               product.minimumStock?.toString() || '0',
               this.formatCurrency(product.unitCost || 0),
               this.formatStatus(product.status)
          ]);

          autoTable(doc, {
               startY: 85,
               head: [['#', 'Código', 'Nombre', 'Categoría', 'Unidad', 'Stock Act.', 'Stock Mín.', 'Costo Unit.', 'Estado']],
               body: tableData,
               theme: 'grid',
               headStyles: {
                    fillColor: headerBlue,
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [255, 255, 255]
               },
               bodyStyles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle'
               },
               alternateRowStyles: {
                    fillColor: lightGray
               },
               columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },  // #
                    1: { halign: 'center', cellWidth: 20 },  // Código
                    2: { halign: 'left', cellWidth: 40 },    // Nombre
                    3: { halign: 'left', cellWidth: 25 },    // Categoría
                    4: { halign: 'center', cellWidth: 18 },  // Unidad
                    5: { halign: 'center', cellWidth: 18 },  // Stock Actual
                    6: { halign: 'center', cellWidth: 18 },  // Stock Mínimo
                    7: { halign: 'right', cellWidth: 20 },   // Costo
                    8: { halign: 'center', cellWidth: 20 }   // Estado
               },
               margin: { left: 15, right: 15 }
          });

          // ========== ESTADÍSTICAS ==========
          const finalY = (doc as any).lastAutoTable.finalY || 85;
          this.addProductStatistics(doc, products, finalY + 15);

          // ========== PIE DE PÁGINA ==========
          this.addFooter(doc, organizationName);

          // Descargar PDF
          const fileName = `Reporte_Productos_${this.formatDateForFilename(today)}.pdf`;
          doc.save(fileName);
     }

     /**
      * Genera un reporte PDF de compras
      */
     async generatePurchaseReport(
          purchases: Purchase[],
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215];
          const headerBlue: [number, number, number] = [0, 102, 204];
          const lightGray: [number, number, number] = [245, 245, 245];

          // ========== ENCABEZADO ==========
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización
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
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE DE COMPRAS', pageWidth / 2, 65, { align: 'center' });

          // Fecha de generación
          const today = new Date();
          const formattedDate = this.formatDate(today);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
          doc.text(`Total de compras: ${purchases.length}`, pageWidth - 15, 75, { align: 'right' });

          // ========== TABLA DE COMPRAS ==========
          const tableData = purchases.map((purchase, index) => [
               (index + 1).toString(),
               purchase.purchaseCode || '-',
               this.formatDate(new Date(purchase.purchaseDate)),
               purchase.supplierName || '-',
               purchase.invoiceNumber || '-',
               this.formatCurrency(purchase.totalAmount || 0),
               this.formatPurchaseStatus(purchase.status),
               purchase.requestedByUser?.fullName || '-'
          ]);

          autoTable(doc, {
               startY: 85,
               head: [['#', 'Código', 'Fecha', 'Proveedor', 'Factura', 'Monto Total', 'Estado', 'Solicitante']],
               body: tableData,
               theme: 'grid',
               headStyles: {
                    fillColor: headerBlue,
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [255, 255, 255]
               },
               bodyStyles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle'
               },
               alternateRowStyles: {
                    fillColor: lightGray
               },
               columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },  // #
                    1: { halign: 'center', cellWidth: 25 },  // Código
                    2: { halign: 'center', cellWidth: 22 },  // Fecha
                    3: { halign: 'left', cellWidth: 35 },    // Proveedor
                    4: { halign: 'center', cellWidth: 22 },  // Factura
                    5: { halign: 'right', cellWidth: 25 },   // Monto
                    6: { halign: 'center', cellWidth: 22 },  // Estado
                    7: { halign: 'left', cellWidth: 28 }     // Solicitante
               },
               margin: { left: 15, right: 15 }
          });

          // ========== ESTADÍSTICAS ==========
          const finalY = (doc as any).lastAutoTable.finalY || 85;
          this.addPurchaseStatistics(doc, purchases, finalY + 15);

          // ========== PIE DE PÁGINA ==========
          this.addFooter(doc, organizationName);

          // Descargar PDF
          const fileName = `Reporte_Compras_${this.formatDateForFilename(today)}.pdf`;
          doc.save(fileName);
     }

     /**
      * Agregar estadísticas de productos al PDF
      */
     private addProductStatistics(doc: jsPDF, products: Product[], startY: number): void {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Resumen Estadístico', 15, startY);

          const activeProducts = products.filter(p => p.status === 'ACTIVO').length;
          const inactiveProducts = products.filter(p => p.status === 'INACTIVO').length;
          const lowStockProducts = products.filter(p => p.currentStock < p.minimumStock).length;
          const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.unitCost), 0);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`• Productos activos: ${activeProducts}`, 20, startY + 10);
          doc.text(`• Productos inactivos: ${inactiveProducts}`, 20, startY + 17);
          doc.text(`• Productos con stock bajo: ${lowStockProducts}`, 20, startY + 24);
          doc.text(`• Valor total del inventario: ${this.formatCurrency(totalValue)}`, 20, startY + 31);
     }

     /**
      * Agregar estadísticas de compras al PDF
      */
     private addPurchaseStatistics(doc: jsPDF, purchases: Purchase[], startY: number): void {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Resumen Estadístico', 15, startY);

          const pendingPurchases = purchases.filter(p => p.status === 'PENDIENTE').length;
          const authorizedPurchases = purchases.filter(p => p.status === 'AUTORIZADO').length;
          const completedPurchases = purchases.filter(p => p.status === 'COMPLETADO').length;
          const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
          const averageAmount = purchases.length > 0 ? totalAmount / purchases.length : 0;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`• Compras pendientes: ${pendingPurchases}`, 20, startY + 10);
          doc.text(`• Compras autorizadas: ${authorizedPurchases}`, 20, startY + 17);
          doc.text(`• Compras completadas: ${completedPurchases}`, 20, startY + 24);
          doc.text(`• Monto total: ${this.formatCurrency(totalAmount)}`, 20, startY + 31);
          doc.text(`• Monto promedio: ${this.formatCurrency(averageAmount)}`, 20, startY + 38);
     }

     /**
      * Agregar pie de página al PDF
      */
     private addFooter(doc: jsPDF, organizationName: string): void {
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageWidth = doc.internal.pageSize.getWidth();

          doc.setDrawColor(200, 200, 200);
          doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
               `${organizationName} - Sistema de Gestión JASS`,
               pageWidth / 2,
               pageHeight - 12,
               { align: 'center' }
          );
          doc.text(
               `Generado el ${this.formatDate(new Date())}`,
               pageWidth / 2,
               pageHeight - 7,
               { align: 'center' }
          );
     }

     /**
      * Cargar imagen desde URL y convertir a base64
      */
     private loadImage(url: string): Promise<string> {
          return new Promise((resolve, reject) => {
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
      * Formatea la fecha
      */
     private formatDate(date: Date): string {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
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
      * Formatea el estado del producto
      */
     private formatStatus(status: string): string {
          switch (status?.toUpperCase()) {
               case 'ACTIVO':
                    return 'Activo';
               case 'INACTIVO':
                    return 'Inactivo';
               case 'DESCONTINUADO':
                    return 'Descontinuado';
               default:
                    return status || '-';
          }
     }

     /**
      * Formatea el estado de la compra
      */
     private formatPurchaseStatus(status: string): string {
          switch (status?.toUpperCase()) {
               case 'PENDIENTE':
                    return 'Pendiente';
               case 'AUTORIZADO':
                    return 'Autorizado';
               case 'COMPLETADO':
                    return 'Completado';
               case 'CANCELADO':
                    return 'Cancelado';
               default:
                    return status || '-';
          }
     }

     /**
      * Formatea moneda
      */
     private formatCurrency(amount: number): string {
          return `S/ ${amount.toFixed(2)}`;
     }

     /**
      * 🆕 Genera un reporte detallado del KARDEX de un producto
      */
     async generateKardexReport(
          productName: string,
          productCode: string,
          movements: any[],
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF('landscape'); // Modo horizontal para más espacio
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215];
          const headerBlue: [number, number, number] = [0, 102, 204];
          const lightGray: [number, number, number] = [245, 245, 245];

          // ========== ENCABEZADO ==========
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización
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
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('KARDEX DE PRODUCTO', pageWidth / 2, 65, { align: 'center' });

          // Información del producto
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text(`Producto: ${productName}`, 15, 75);
          doc.text(`Código: ${productCode}`, 15, 82);

          const today = new Date();
          const formattedDate = this.formatDate(today);
          doc.setFontSize(10);
          doc.text(`Fecha de generación: ${formattedDate}`, pageWidth - 15, 75, { align: 'right' });
          doc.text(`Total de movimientos: ${movements.length}`, pageWidth - 15, 82, { align: 'right' });

          // ========== TABLA KARDEX ==========
          const tableData = movements.map((movement, index) => [
               (index + 1).toString(),
               this.formatDate(new Date(movement.movementDate)),
               this.formatMovementType(movement.movementType),
               movement.movementReason || '-',
               movement.referenceDocument || '-',
               movement.performedBy || movement.userInfo?.fullName || '-',
               movement.movementType === 'ENTRADA' ? movement.quantity.toString() : '-',
               movement.movementType === 'SALIDA' ? movement.quantity.toString() : '-',
               movement.newStock.toString(),
               this.formatCurrency(movement.unitCost),
               this.formatCurrency(movement.totalValue),
               movement.observations || '-'
          ]);

          autoTable(doc, {
               startY: 95,
               head: [[
                    '#',
                    'Fecha',
                    'Tipo',
                    'Motivo',
                    'Documento',
                    'Usuario',
                    'Entrada',
                    'Salida',
                    'Saldo',
                    'Costo Unit.',
                    'Valor Total',
                    'Observaciones'
               ]],
               body: tableData,
               theme: 'grid',
               headStyles: {
                    fillColor: headerBlue,
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [255, 255, 255]
               },
               bodyStyles: {
                    fontSize: 7,
                    cellPadding: 2,
                    valign: 'middle'
               },
               alternateRowStyles: {
                    fillColor: lightGray
               },
               columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },   // #
                    1: { halign: 'center', cellWidth: 22 },   // Fecha
                    2: { halign: 'center', cellWidth: 18 },   // Tipo
                    3: { halign: 'left', cellWidth: 25 },     // Motivo
                    4: { halign: 'center', cellWidth: 25 },   // Documento
                    5: { halign: 'left', cellWidth: 35 },     // Usuario
                    6: { halign: 'center', cellWidth: 18 },   // Entrada
                    7: { halign: 'center', cellWidth: 18 },   // Salida
                    8: { halign: 'center', cellWidth: 18 },   // Saldo
                    9: { halign: 'right', cellWidth: 22 },    // Costo
                    10: { halign: 'right', cellWidth: 22 },   // Valor
                    11: { halign: 'left', cellWidth: 35 }     // Observaciones
               },
               margin: { left: 10, right: 10 }
          });

          // ========== RESUMEN KARDEX ==========
          const finalY = (doc as any).lastAutoTable.finalY || 95;
          this.addKardexStatistics(doc, movements, finalY + 10);

          // ========== PIE DE PÁGINA ==========
          this.addFooter(doc, organizationName);

          // Descargar PDF
          const fileName = `Kardex_${productCode}_${this.formatDateForFilename(today)}.pdf`;
          doc.save(fileName);
     }

     /**
      * 🆕 Genera un reporte detallado de una compra individual
      */
     async generatePurchaseDetailReport(
          purchase: Purchase,
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215];
          const headerBlue: [number, number, number] = [0, 102, 204];
          const lightGray: [number, number, number] = [245, 245, 245];
          const infoBlue: [number, number, number] = [240, 248, 255];

          // ========== ENCABEZADO ==========
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización
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
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('DETALLE DE COMPRA', pageWidth / 2, 65, { align: 'center' });

          // ========== INFORMACIÓN DE LA COMPRA ==========
          let currentY = 80;

          // Sección 1: Datos Generales
          doc.setFillColor(infoBlue[0], infoBlue[1], infoBlue[2]);
          doc.rect(15, currentY, pageWidth - 30, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('DATOS GENERALES', 18, currentY + 6);

          currentY += 12;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          // Columna izquierda
          doc.text(`Código de Compra:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(purchase.purchaseCode || '-', 70, currentY);

          currentY += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha de Compra:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(this.formatDate(new Date(purchase.purchaseDate)), 70, currentY);

          currentY += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Estado:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          this.drawStatusBadge(doc, purchase.status, 70, currentY - 3);

          // Columna derecha
          currentY = 92;
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha de Recepción:`, 115, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(purchase.deliveryDate ? this.formatDate(new Date(purchase.deliveryDate)) : 'Pendiente', 165, currentY);

          currentY += 6;
          doc.setFont('helvetica', 'normal');
          doc.text(`Creado:`, 115, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(this.formatDate(new Date(purchase.createdAt)), 165, currentY);

          // Sección 2: Proveedor
          currentY += 12;
          doc.setFillColor(infoBlue[0], infoBlue[1], infoBlue[2]);
          doc.rect(15, currentY, pageWidth - 30, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('PROVEEDOR', 18, currentY + 6);

          currentY += 12;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Nombre:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(purchase.supplierName || '-', 70, currentY);

          // Sección 3: Información de Facturación
          currentY += 10;
          doc.setFillColor(infoBlue[0], infoBlue[1], infoBlue[2]);
          doc.rect(15, currentY, pageWidth - 30, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('INFORMACIÓN DE FACTURACIÓN', 18, currentY + 6);

          currentY += 12;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`N° Factura:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(purchase.invoiceNumber || '-', 70, currentY);

          // Sección 4: Usuarios
          currentY += 10;
          doc.setFillColor(infoBlue[0], infoBlue[1], infoBlue[2]);
          doc.rect(15, currentY, pageWidth - 30, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('USUARIOS INVOLUCRADOS', 18, currentY + 6);

          currentY += 12;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Solicitado por:`, 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.text(purchase.requestedByUser?.fullName || '-', 70, currentY);

          if (purchase.approvedByUserId) {
               currentY += 6;
               doc.setFont('helvetica', 'normal');
               doc.text(`Autorizado por ID:`, 20, currentY);
               doc.setFont('helvetica', 'bold');
               doc.text(purchase.approvedByUserId, 70, currentY);
          }

          // ========== TABLA DE DETALLES ==========
          currentY += 15;
          doc.setFillColor(infoBlue[0], infoBlue[1], infoBlue[2]);
          doc.rect(15, currentY, pageWidth - 30, 8, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('DETALLE DE PRODUCTOS', 18, currentY + 6);

          currentY += 10;

          const tableData = (purchase.details || []).map((detail, index) => [
               (index + 1).toString(),
               detail.productName || '-',
               detail.quantityOrdered?.toString() || '0',
               'unidad',
               this.formatCurrency(detail.unitCost || 0),
               this.formatCurrency((detail.quantityOrdered || 0) * (detail.unitCost || 0))
          ]);

          autoTable(doc, {
               startY: currentY,
               head: [['#', 'Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal']],
               body: tableData,
               theme: 'grid',
               headStyles: {
                    fillColor: headerBlue,
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle'
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
                    0: { halign: 'center', cellWidth: 12 },   // #
                    1: { halign: 'left', cellWidth: 70 },     // Producto
                    2: { halign: 'center', cellWidth: 22 },   // Cantidad
                    3: { halign: 'center', cellWidth: 22 },   // Unidad
                    4: { halign: 'right', cellWidth: 28 },    // Precio
                    5: { halign: 'right', cellWidth: 28 }     // Subtotal
               },
               margin: { left: 15, right: 15 }
          });

          // ========== TOTALES ==========
          const finalY = (doc as any).lastAutoTable.finalY || currentY;
          currentY = finalY + 10;

          // Cuadro de totales
          const totalsX = pageWidth - 85;
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(totalsX, currentY, 70, 25, 'F');
          doc.setDrawColor(180, 180, 180);
          doc.rect(totalsX, currentY, 70, 25);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('TOTAL:', totalsX + 5, currentY + 8);
          doc.setFontSize(14);
          doc.setTextColor(0, 102, 204);
          doc.text(this.formatCurrency(purchase.totalAmount), totalsX + 65, currentY + 8, { align: 'right' });

          // Observaciones (si existen)
          if (purchase.observations) {
               currentY += 30;
               doc.setTextColor(0, 0, 0);
               doc.setFontSize(10);
               doc.setFont('helvetica', 'bold');
               doc.text('Observaciones:', 15, currentY);
               doc.setFont('helvetica', 'normal');
               const splitObservations = doc.splitTextToSize(purchase.observations, pageWidth - 35);
               doc.text(splitObservations, 20, currentY + 6);
          }

          // ========== PIE DE PÁGINA ==========
          this.addFooter(doc, organizationName);

          // Descargar PDF
          const fileName = `Compra_${purchase.purchaseCode}_${this.formatDateForFilename(new Date())}.pdf`;
          doc.save(fileName);
     }

     /**
      * Dibuja un badge de estado
      */
     private drawStatusBadge(doc: jsPDF, status: string, x: number, y: number): void {
          let bgColor: [number, number, number];
          let textColor: [number, number, number] = [255, 255, 255];
          let statusText = '';

          switch (status?.toUpperCase()) {
               case 'PENDIENTE':
                    bgColor = [255, 193, 7]; // Amarillo
                    statusText = 'Pendiente';
                    textColor = [0, 0, 0];
                    break;
               case 'AUTORIZADO':
                    bgColor = [33, 150, 243]; // Azul
                    statusText = 'Autorizado';
                    break;
               case 'COMPLETADO':
                    bgColor = [76, 175, 80]; // Verde
                    statusText = 'Completado';
                    break;
               case 'CANCELADO':
                    bgColor = [244, 67, 54]; // Rojo
                    statusText = 'Cancelado';
                    break;
               default:
                    bgColor = [158, 158, 158]; // Gris
                    statusText = status || '-';
          }

          // Dibujar el badge
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.roundedRect(x, y, 35, 6, 2, 2, 'F');

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.text(statusText, x + 17.5, y + 4.5, { align: 'center' });

          doc.setTextColor(0, 0, 0);
     }

     /**
      * Formatea el método de pago
      */
     private formatPaymentMethod(method: string): string {
          switch (method?.toUpperCase()) {
               case 'EFECTIVO':
                    return 'Efectivo';
               case 'TRANSFERENCIA':
                    return 'Transferencia';
               case 'CHEQUE':
                    return 'Cheque';
               case 'TARJETA':
                    return 'Tarjeta';
               default:
                    return method || '-';
          }
     }

     /**
      * Formatea el tipo de movimiento
      */
     private formatMovementType(type: string): string {
          switch (type?.toUpperCase()) {
               case 'ENTRADA':
                    return 'Entrada';
               case 'SALIDA':
                    return 'Salida';
               case 'AJUSTE':
                    return 'Ajuste';
               default:
                    return type || '-';
          }
     }

     /**
      * Agregar estadísticas del kardex
      */
     private addKardexStatistics(doc: jsPDF, movements: any[], startY: number): void {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Resumen de Movimientos', 15, startY);

          const entradas = movements.filter(m => m.movementType === 'ENTRADA');
          const salidas = movements.filter(m => m.movementType === 'SALIDA');
          const totalEntradas = entradas.reduce((sum, m) => sum + m.quantity, 0);
          const totalSalidas = salidas.reduce((sum, m) => sum + m.quantity, 0);
          const saldoFinal = movements.length > 0 ? movements[movements.length - 1].newStock : 0;
          const valorTotal = movements.length > 0 ? movements[movements.length - 1].totalValue : 0;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`• Total de entradas: ${totalEntradas} unidades (${entradas.length} movimientos)`, 20, startY + 8);
          doc.text(`• Total de salidas: ${totalSalidas} unidades (${salidas.length} movimientos)`, 20, startY + 15);
          doc.text(`• Saldo final: ${saldoFinal} unidades`, 20, startY + 22);
          doc.text(`• Valor total del stock: ${this.formatCurrency(valorTotal)}`, 20, startY + 29);
     }

     /**
      * 🆕 Genera un reporte PDF detallado de un movimiento individual de inventario
      */
     async generateMovementDetailReport(
          movement: any,
          organizationName: string,
          organizationLogo?: string,
          organizationPhone?: string
     ): Promise<void> {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // Colores del diseño
          const primaryBlue = [0, 120, 215]; // #0078D7
          const headerBlue: [number, number, number] = [0, 102, 204];

          // ========== ENCABEZADO ==========
          doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          doc.rect(0, 0, pageWidth, 50, 'F');

          // Logo (si existe)
          if (organizationLogo) {
               try {
                    const imgData = await this.loadImage(organizationLogo);
                    doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
               } catch (error) {
                    console.error('Error al cargar logo:', error);
               }
          }

          // Información de la organización
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
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('DETALLE DE MOVIMIENTO DE INVENTARIO', pageWidth / 2, 65, { align: 'center' });

          let currentY = 78;
          const pageHeight = doc.internal.pageSize.getHeight();
          const bottomMargin = 30;

          // Función auxiliar para verificar espacio y agregar página si es necesario
          const checkSpaceAndAddPage = (neededSpace: number): void => {
               if (currentY + neededSpace > pageHeight - bottomMargin) {
                    doc.addPage();
                    currentY = 20;
               }
          };

          // ========== DATOS GENERALES DEL MOVIMIENTO ==========
          checkSpaceAndAddPage(60);

          // Encabezado de sección con bordes redondeados simulados
          doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
          doc.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('DATOS GENERALES', 20, currentY + 8);

          // Caja con borde
          currentY += 12;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(15, currentY, pageWidth - 30, 42);

          currentY += 8;

          // Información básica del movimiento con mejor espaciado
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Código de Movimiento:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.movementCode || 'N/A', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Fecha del Movimiento:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(this.formatDate(new Date(movement.movementDate)), 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Tipo de Movimiento:', 20, currentY);

          // Badge para tipo de movimiento
          const movementTypeColor = movement.movementType === 'ENTRADA' ? [76, 175, 80] : [244, 67, 54];
          doc.setFillColor(movementTypeColor[0], movementTypeColor[1], movementTypeColor[2]);
          doc.roundedRect(78, currentY - 4, 28, 6, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(this.formatMovementType(movement.movementType), 92, currentY + 0.5, { align: 'center' });
          doc.setTextColor(0, 0, 0);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Razón:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.movementReason || '-', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Documento de Referencia:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.referenceDocument || 'N/A', 80, currentY);

          currentY += 12;

          // ========== PRODUCTO ==========
          checkSpaceAndAddPage(50);

          doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
          doc.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('PRODUCTO', 20, currentY + 8);

          currentY += 12;
          doc.setDrawColor(200, 200, 200);
          doc.rect(15, currentY, pageWidth - 30, 32);

          currentY += 8;

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Nombre del Producto:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.productInfo?.productName || 'N/A', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Código:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.productInfo?.productCode || 'N/A', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Categoría:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.productInfo?.categoryName || 'N/A', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Unidad de Medida:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.productInfo?.unitOfMeasure || 'N/A', 80, currentY);

          currentY += 12;

          // ========== CANTIDADES Y VALORES ==========
          checkSpaceAndAddPage(60);

          doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
          doc.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('CANTIDADES Y VALORES', 20, currentY + 8);

          currentY += 12;
          doc.setDrawColor(200, 200, 200);
          doc.rect(15, currentY, pageWidth - 30, 42);

          currentY += 8;

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Cantidad:', 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(33, 150, 243);
          doc.text(`${movement.quantity} ${movement.productInfo?.unitOfMeasure || 'unidades'}`, 80, currentY);
          doc.setTextColor(0, 0, 0);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Stock Anterior:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.previousStock?.toString() || '0', 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Stock Nuevo:', 20, currentY);

          // Caja destacada para stock nuevo
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(78, currentY - 4, 30, 7, 2, 2, 'F');
          doc.setTextColor(0, 102, 204);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(movement.newStock?.toString() || '0', 93, currentY + 1, { align: 'center' });
          doc.setTextColor(0, 0, 0);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Costo Unitario:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(this.formatCurrency(movement.unitCost || 0), 80, currentY);

          currentY += 7;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Valor Total:', 20, currentY);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 102, 204);
          doc.text(this.formatCurrency(movement.totalValue || 0), 80, currentY);
          doc.setTextColor(0, 0, 0);

          currentY += 12;

          // ========== USUARIO ==========
          const userSectionHeight = movement.userInfo?.userCode ? 35 : 28;
          checkSpaceAndAddPage(userSectionHeight);

          doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
          doc.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('USUARIO RESPONSABLE', 20, currentY + 8);

          currentY += 12;
          const userBoxHeight = movement.userInfo?.userCode ? 20 : 13;
          doc.setDrawColor(200, 200, 200);
          doc.rect(15, currentY, pageWidth - 30, userBoxHeight);

          currentY += 8;

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Realizado por:', 20, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(movement.performedBy || movement.userInfo?.fullName || 'N/A', 80, currentY);

          if (movement.userInfo?.userCode) {
               currentY += 7;
               doc.setFontSize(9);
               doc.setFont('helvetica', 'bold');
               doc.text('Código de Usuario:', 20, currentY);
               doc.setFont('helvetica', 'normal');
               doc.setFontSize(10);
               doc.text(movement.userInfo.userCode, 80, currentY);
          }

          currentY += 12;

          // ========== VERIFICAR SI NECESITAMOS NUEVA PÁGINA ==========
          // ========== OBSERVACIONES ==========
          if (movement.observations) {
               const observationsLines = doc.splitTextToSize(movement.observations, pageWidth - 40);
               const obsBoxHeight = (observationsLines.length * 5) + 16;
               const neededSpace = obsBoxHeight + 24; // Espacio para encabezado + caja

               // Si no cabe en la página actual, crear nueva página
               checkSpaceAndAddPage(neededSpace);

               doc.setFillColor(headerBlue[0], headerBlue[1], headerBlue[2]);
               doc.roundedRect(15, currentY, pageWidth - 30, 12, 2, 2, 'F');

               doc.setFontSize(11);
               doc.setFont('helvetica', 'bold');
               doc.setTextColor(255, 255, 255);
               doc.text('OBSERVACIONES', 20, currentY + 8);

               currentY += 12;

               doc.setDrawColor(200, 200, 200);
               doc.rect(15, currentY, pageWidth - 30, obsBoxHeight);

               currentY += 8;

               doc.setTextColor(60, 60, 60);
               doc.setFontSize(9);
               doc.setFont('helvetica', 'normal');
               doc.text(observationsLines, 20, currentY);

               currentY += obsBoxHeight - 4;
          }

          // ========== PIE DE PÁGINA ==========
          // Agregar pie de página en cada página
          const totalPages = doc.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
               doc.setPage(i);
               this.addFooter(doc, organizationName);
          }          // Descargar PDF
          const today = new Date();
          const fileName = `Movimiento_${movement.movementCode || 'N/A'}_${this.formatDateForFilename(today)}.pdf`;
          doc.save(fileName);
     }
}
