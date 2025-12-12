import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Organization, Zone, Admin } from '../models/organization.model';

@Injectable({
    providedIn: 'root'
})
export class OrganizationReportService {

    /**
     * Genera un reporte PDF de organizaciones con el diseño estándar
     */
    async generateOrganizationReport(
        organizations: Organization[],
        systemName: string = 'JASS',
        systemLogo?: string,
        systemPhone?: string
    ): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Colores del diseño
        const primaryBlue = [0, 120, 215]; // #0078D7
        const headerBlue: [number, number, number] = [0, 102, 204]; // Azul del encabezado de tabla
        const lightGray: [number, number, number] = [245, 245, 245];

        // ========== ENCABEZADO ==========
        await this.addHeader(doc, systemName, systemLogo, systemPhone, primaryBlue);

        // ========== TÍTULO DEL REPORTE ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ORGANIZACIONES', pageWidth / 2, 65, { align: 'center' });

        // Fecha de generación
        const today = new Date();
        const formattedDate = this.formatDate(today);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
        doc.text(`Total de organizaciones: ${organizations.length}`, pageWidth - 15, 75, { align: 'right' });

        // ========== TABLA DE ORGANIZACIONES ==========

        // Preparar datos para la tabla
        const tableData = organizations.map((org, index) => [
            (index + 1).toString(),
            org.organizationCode || '-',
            org.organizationName || '-',
            org.legalRepresentative || '-',
            org.address || '-',
            org.phone || '-'
        ]);

        autoTable(doc, {
            startY: 85,
            head: [['#', 'Código', 'Nombre', 'Representante Legal', 'Dirección', 'Teléfono']],
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
                fontSize: 8,
                cellPadding: 2,
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: lightGray
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 }, // #
                1: { halign: 'center', cellWidth: 28 }, // Código
                2: { halign: 'left', cellWidth: 45 },   // Nombre
                3: { halign: 'left', cellWidth: 40 },   // Representante
                4: { halign: 'left', cellWidth: 45 },   // Dirección
                5: { halign: 'center', cellWidth: 22 }  // Teléfono
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

        const activeOrgs = organizations.filter(o => o.status === 'ACTIVE').length;
        const inactiveOrgs = organizations.filter(o => o.status === 'INACTIVE').length;
        const totalZones = organizations.reduce((sum, org) => sum + (org.zones?.length || 0), 0);

        doc.text(`• Organizaciones activas: ${activeOrgs}`, 20, finalY + 8);
        doc.text(`• Organizaciones inactivas: ${inactiveOrgs}`, 20, finalY + 15);
        doc.text(`• Total de organizaciones: ${organizations.length}`, 20, finalY + 22);
        doc.text(`• Total de zonas: ${totalZones}`, 20, finalY + 29);

        // ========== PIE DE PÁGINA ==========
        this.addFooter(doc);

        // Guardar el PDF
        const fileName = `reporte-organizaciones-${this.formatDateForFilename(today)}.pdf`;
        doc.save(fileName);
    }

    /**
   * Genera un reporte PDF de zonas y calles de una organización específica
   */
    async generateZonesReport(
        organization: Organization,
        systemName: string = 'JASS',
        systemLogo?: string,
        systemPhone?: string
    ): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Colores del diseño
        const primaryBlue = [0, 120, 215];
        const headerBlue: [number, number, number] = [0, 102, 204];
        const lightGray: [number, number, number] = [245, 245, 245];

        // ========== ENCABEZADO ==========
        await this.addHeader(doc, systemName, systemLogo, systemPhone, primaryBlue);

        // ========== TÍTULO DEL REPORTE ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ZONAS Y CALLES', pageWidth / 2, 65, { align: 'center' });

        // Fecha de generación
        const today = new Date();
        const formattedDate = this.formatDate(today);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
        doc.text(`Organización: ${organization.organizationName}`, 15, 82);

        // Contar zonas totales
        const totalZones = organization.zones?.length || 0;
        doc.text(`Total de zonas: ${totalZones}`, pageWidth - 15, 75, { align: 'right' });

        // ========== TABLA DE ZONAS ==========

        // Preparar datos para la tabla
        const tableData: any[] = [];
        let index = 1;

        if (organization.zones && organization.zones.length > 0) {
            organization.zones.forEach(zone => {
                tableData.push([
                    index.toString(),
                    zone.zoneCode || '-',
                    zone.zoneName || '-',
                    zone.description || '-',
                    (zone.streets?.length || 0).toString()
                ]);
                index++;
            });
        }

        // Si no hay zonas, agregar una fila indicándolo
        if (tableData.length === 0) {
            tableData.push([
                '-',
                '-',
                'No hay zonas registradas',
                '-',
                '0'
            ]);
        }

        autoTable(doc, {
            startY: 92,
            head: [['#', 'Cód. Zona', 'Nombre Zona', 'Descripción', 'Calles']],
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
                0: { halign: 'center', cellWidth: 15 },  // #
                1: { halign: 'center', cellWidth: 35 },  // Cód. Zona
                2: { halign: 'left', cellWidth: 50 },    // Nombre Zona
                3: { halign: 'left', cellWidth: 60 },    // Descripción
                4: { halign: 'center', cellWidth: 20 }   // Calles
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

        const activeZones = organization.zones?.filter(z => z.status === 'ACTIVE').length || 0;
        const inactiveZones = totalZones - activeZones;
        const totalStreets = organization.zones?.reduce((sum, z) => sum + (z.streets?.length || 0), 0) || 0;

        doc.text(`• Zonas activas: ${activeZones}`, 20, finalY + 8);
        doc.text(`• Zonas inactivas: ${inactiveZones}`, 20, finalY + 15);
        doc.text(`• Total de zonas: ${totalZones}`, 20, finalY + 22);
        doc.text(`• Total de calles: ${totalStreets}`, 20, finalY + 29);

        // ========== PIE DE PÁGINA ==========
        this.addFooter(doc);

        // Guardar el PDF
        const fileName = `reporte-zonas-${this.formatDateForFilename(today)}.pdf`;
        doc.save(fileName);
    }

    /**
   * Genera un reporte PDF de administradores de una organización específica
   */
    async generateAdminsReport(
        organization: Organization,
        systemName: string = 'JASS',
        systemLogo?: string,
        systemPhone?: string
    ): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Colores del diseño
        const primaryBlue = [0, 120, 215];
        const headerBlue: [number, number, number] = [0, 102, 204];
        const lightGray: [number, number, number] = [245, 245, 245];

        // ========== ENCABEZADO ==========
        await this.addHeader(doc, systemName, systemLogo, systemPhone, primaryBlue);

        // ========== TÍTULO DEL REPORTE ==========
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ADMINISTRADORES', pageWidth / 2, 65, { align: 'center' });

        // Fecha de generación
        const today = new Date();
        const formattedDate = this.formatDate(today);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de generación: ${formattedDate}`, 15, 75);
        doc.text(`Organización: ${organization.organizationName}`, 15, 82);

        // Contar administradores totales
        const totalAdmins = organization.admins?.length || 0;
        doc.text(`Total de administradores: ${totalAdmins}`, pageWidth - 15, 75, { align: 'right' });

        // ========== TABLA DE ADMINISTRADORES ==========

        // Preparar datos para la tabla
        const tableData: any[] = [];
        let index = 1;

        if (organization.admins && organization.admins.length > 0) {
            organization.admins.forEach(admin => {
                tableData.push([
                    index.toString(),
                    `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || '-',
                    admin.documentNumber || '-',
                    admin.email || '-',
                    admin.phone || '-'
                ]);
                index++;
            });
        }

        // Si no hay administradores, agregar una fila indicándolo
        if (tableData.length === 0) {
            tableData.push([
                '-',
                'No hay administradores registrados',
                '-',
                '-',
                '-'
            ]);
        }

        autoTable(doc, {
            startY: 92,
            head: [['#', 'Nombre Completo', 'DNI', 'Email', 'Teléfono']],
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
                0: { halign: 'center', cellWidth: 15 },  // #
                1: { halign: 'left', cellWidth: 55 },    // Nombre
                2: { halign: 'center', cellWidth: 28 },  // DNI
                3: { halign: 'left', cellWidth: 60 },    // Email
                4: { halign: 'center', cellWidth: 27 }   // Teléfono
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

        const activeAdmins = organization.admins?.filter(a => a.status === 'ACTIVE').length || 0;
        const inactiveAdmins = totalAdmins - activeAdmins;

        doc.text(`• Administradores activos: ${activeAdmins}`, 20, finalY + 8);
        doc.text(`• Administradores inactivos: ${inactiveAdmins}`, 20, finalY + 15);
        doc.text(`• Total de administradores: ${totalAdmins}`, 20, finalY + 22);

        // ========== PIE DE PÁGINA ==========
        this.addFooter(doc);

        // Guardar el PDF
        const fileName = `reporte-administradores-${this.formatDateForFilename(today)}.pdf`;
        doc.save(fileName);
    }

    /**
     * Agrega el encabezado estándar al documento
     */
    private async addHeader(
        doc: jsPDF,
        systemName: string,
        systemLogo: string | undefined,
        systemPhone: string | undefined,
        primaryBlue: number[]
    ): Promise<void> {
        const pageWidth = doc.internal.pageSize.getWidth();

        // Fondo azul superior
        doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Logo (si existe)
        if (systemLogo) {
            try {
                const imgData = await this.loadImage(systemLogo);
                doc.addImage(imgData, 'PNG', 15, 10, 35, 35);
            } catch (error) {
                console.error('Error al cargar logo:', error);
            }
        }

        // Información del sistema (texto blanco)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(systemName, 60, 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Agua Potable y Alcantarillado', 60, 28);

        if (systemPhone) {
            doc.setFontSize(10);
            doc.text(`Tel: ${systemPhone}`, 60, 36);
        }
    }

    /**
     * Agrega el pie de página con numeración
     */
    private addFooter(doc: jsPDF): void {
        const pageWidth = doc.internal.pageSize.getWidth();
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
     * Formatea la fecha para el nombre del archivo
     */
    private formatDateForFilename(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Formatea el estado
     */
    private formatStatus(status: string): string {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
            case 'ACTIVO':
                return 'Activo';
            case 'INACTIVE':
            case 'INACTIVO':
                return 'Inactivo';
            default:
                return status || '-';
        }
    }
}
