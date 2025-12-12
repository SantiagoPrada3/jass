import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/services/auth';
import { NotificationService } from './notification.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  title: string;
  subtitle?: string;
  data: any[];
  columns: ReportColumn[];
  filters?: string;
  organizationId?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportGeneratorService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  async generateZoneReport(reportData: ReportData, zoneName?: string): Promise<void> {
    try {
      this.notificationService.info('Generando reporte', 'Preparando el documento PDF...');

      const currentUser = this.authService.getCurrentUser();
      const organizationId = reportData.organizationId || currentUser?.organizationId;

      let organization = null;
      if (organizationId) {
        organization = await this.loadOrganizationData(organizationId);
      }

      await this.createPDFReport(reportData, organization, zoneName);

    } catch (error) {
      console.error('Error generating report:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'No se pudo generar el documento PDF'
      );
    }
  }

  private async loadOrganizationData(organizationId: string): Promise<any> {
    try {
      // Intentar diferentes endpoints para obtener datos de la organización
      const endpoints = [
        `https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`,
        `https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/management/organizations/${organizationId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.http.get<any>(endpoint).toPromise();
          if (response?.data || response?.organization || response?.name) {
            return response.data || response.organization || response;
          }
        } catch (e) {
          console.log(`Error en endpoint ${endpoint}:`, e);
        }
      }

      return null;
    } catch (error) {
      console.log('Error loading organization data:', error);
      return null;
    }
  }

  private async createPDFReport(reportData: ReportData, organization: any, zoneName?: string): Promise<void> {
    const doc = new jsPDF();
    const currentUser = this.authService.getCurrentUser();
    const currentDate = new Date();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';

    // Configuración de colores
    const primaryBlue: [number, number, number] = [0, 120, 212]; // #0078D4
    const secondaryColor: [number, number, number] = [107, 114, 128];
    const lightGray: [number, number, number] = [249, 250, 251];
    const borderColor: [number, number, number] = [209, 213, 219];

    // Header azul con logo y título
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, 0, 210, 50, 'F');

    // Logo de la organización (fondo blanco)
    doc.setFillColor(255, 255, 255);
    doc.rect(15, 10, 30, 30, 'F');
    await this.addOrganizationLogo(doc, organization, 15, 10, 30, 30);

    // Información de la organización en blanco
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(organizationName, 55, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(reportData.subtitle || 'Sistema de Agua Potable y Alcantarillado', 55, 28);

    // Teléfono si existe
    if (organization?.phone) {
      doc.setFontSize(9);
      doc.text(`Tel: ${organization.phone}`, 55, 35);
    }

    // Línea separadora blanca
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48)

    // Tabla de datos
    let yPos = 55;

    // Título del reporte
    const reportTitle = zoneName ? `${reportData.title} - ${zoneName}` : reportData.title;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, 105, yPos, { align: 'center' });

    // Fecha de generación y total
    yPos += 10;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const dateText = `Fecha de generación: ${currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const totalText = `Total de registros: ${reportData.data.length}`;
    doc.text(dateText, 20, yPos);
    doc.text(totalText, 195, yPos, { align: 'right' });

    yPos += 5;

    // Preparar datos para la tabla
    const tableColumns = reportData.columns.map(col => col.label);
    const tableRows = reportData.data.map(item =>
      reportData.columns.map(col => {
        const value = this.getNestedValue(item, col.key);
        return col.format ? col.format(value) : (value || 'N/A');
      })
    );

    // Generar tabla con autoTable
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: yPos + 10,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 120, 212], // Color azul #0078D4
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: this.getColumnStyles(reportData.columns),
      margin: { left: 15, right: 15 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    this.addFooter(doc, organizationName, currentDate, finalY + 20);

    // Descargar el PDF
    const fileName = this.generateFileName(reportData.title, organizationName, zoneName, currentDate);
    doc.save(fileName);

    this.notificationService.success(
      'Reporte PDF Generado',
      `El archivo "${fileName}" se ha descargado exitosamente con ${reportData.data.length} registros`
    );
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getColumnStyles(columns: ReportColumn[]): any {
    const styles: any = {};
    columns.forEach((col, index) => {
      styles[index] = {
        halign: col.align || 'left',
        cellWidth: col.width || 'auto'
      };
    });
    return styles;
  }

  private async addOrganizationLogo(doc: any, organization: any, x: number, y: number, maxWidth: number, maxHeight: number): Promise<void> {
    let logoUrl = null;

    if (organization) {
      logoUrl = organization.logoUrl ||
        organization.logo ||
        organization.image ||
        organization.organizationLogo ||
        organization.profileImage ||
        organization.logoPath ||
        organization.imagePath;
    }

    if (logoUrl) {
      try {
        const imageResult = await this.loadImage(logoUrl);
        const aspectRatio = imageResult.width / imageResult.height;
        let finalWidth = maxWidth;
        let finalHeight = maxHeight;

        if (aspectRatio > 1) {
          finalHeight = maxWidth / aspectRatio;
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspectRatio;
          }
        } else {
          finalWidth = maxHeight * aspectRatio;
          if (finalWidth > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspectRatio;
          }
        }

        const offsetX = (maxWidth - finalWidth) / 2;
        const offsetY = (maxHeight - finalHeight) / 2;

        doc.addImage(imageResult.dataURL, 'PNG', x + offsetX, y + offsetY, finalWidth, finalHeight);
      } catch (error) {
        console.log('Error loading logo, using default:', error);
        this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
      }
    } else {
      this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
    }
  }

  private loadImage(imageUrl: string): Promise<{ dataURL: string, width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject('No se pudo crear el contexto del canvas');
            return;
          }

          const maxSize = 200;
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxSize;
              height = maxSize / aspectRatio;
            } else {
              height = maxSize;
              width = maxSize * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataURL = canvas.toDataURL('image/png', 0.9);
          resolve({ dataURL, width, height });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject('Error al cargar la imagen');

      // Intentar diferentes URLs
      const possibleUrls = [];
      if (imageUrl.startsWith('http')) {
        possibleUrls.push(imageUrl);
      } else {
        possibleUrls.push(`https://lab.vallegrande.edu.pe${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
        possibleUrls.push(`https://lab.vallegrande.edu.pe/jass${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
        possibleUrls.push(`https://lab.vallegrande.edu.pe/uploads${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
      }

      this.tryLoadFromUrls(img, possibleUrls, 0, reject);
    });
  }

  private tryLoadFromUrls(img: HTMLImageElement, urls: string[], index: number, reject: (reason?: any) => void): void {
    if (index >= urls.length) {
      reject('No se pudo cargar la imagen desde ninguna URL');
      return;
    }

    const currentUrl = urls[index];
    img.onerror = () => this.tryLoadFromUrls(img, urls, index + 1, reject);
    img.src = currentUrl;
  }

  private addDefaultLogo(doc: any, x: number, y: number, width: number, height: number): void {
    const logoWidth = Math.min(width, height * 1.2);
    const logoHeight = Math.min(height, width / 1.2);
    const offsetX = (width - logoWidth) / 2;
    const offsetY = (height - logoHeight) / 2;
    const finalX = x + offsetX;
    const finalY = y + offsetY;

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(finalX, finalY, logoWidth, logoHeight, 'F');

    // Borde azul
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    doc.rect(finalX, finalY, logoWidth, logoHeight, 'S');

    // Círculo central
    doc.setFillColor(59, 130, 246);
    const circleRadius = Math.min(logoWidth, logoHeight) * 0.15;
    doc.circle(finalX + logoWidth / 2, finalY + logoHeight / 2 - circleRadius / 2, circleRadius, 'F');

    // Texto JASS
    const fontSize = Math.min(logoWidth, logoHeight) * 0.25;
    doc.setFontSize(fontSize);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    const textWidth = fontSize * 2;
    doc.text('JASS', finalX + (logoWidth - textWidth) / 2, finalY + logoHeight - fontSize / 2);
  }

  private addFooter(doc: any, organizationName: string, currentDate: Date, yPos: number): void {
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }

    // Línea separadora
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 195, yPos);

    // Información del pie
    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte generado por ${organizationName}`, 20, yPos);
    doc.text(`${currentDate.toLocaleDateString('es-ES')} - ${currentDate.toLocaleTimeString('es-ES')}`, 20, yPos + 6);
    doc.text('Página 1', 170, yPos);
  }

  private generateFileName(title: string, organizationName: string, zoneName: string | undefined, date: Date): string {
    const orgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const titleSlug = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const zoneSlug = zoneName ? `-${zoneName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}` : '';
    const dateStr = date.toISOString().split('T')[0];

    return `${titleSlug}${zoneSlug}-${orgName}-${dateStr}.pdf`;
  }
}