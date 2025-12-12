import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FormsModule } from '@angular/forms';
import { WaterQualityApi } from '../../services/water-quality-api';
import { TestingPoints } from '../../models/quality-test.model';
import { CreatePointsComponent } from './create-points/create-points.component';
import { DetailsPointsComponent } from './details-points/details-points.component';
import { Toast } from '../../../../shared/components/ui/notifications/toast/toast';
import jsPDF from 'jspdf';

// Interface to represent a point with zone information for display
interface PointWithZone {
  id: string;
  organizationId: string;
  pointCode: string;
  pointName: string;
  pointType: string;
  zoneId: string;
  locationDescription: string;
  street: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  zone: {
    id: string;
    name: string;
  } | null;
}

@Component({
  selector: 'app-analysis-points',
  standalone: true,
  imports: [CommonModule, FormsModule, CreatePointsComponent, DetailsPointsComponent,],
  templateUrl: './analysis-points.html',
  styleUrls: ['./analysis-points.css']
})
export class AnalysisPoints implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Calidad de Agua',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 004 21h16a8.014 8.014 0 00-.572-5.572zM7 9a2 2 0 11-4 0 2 2 0 014 0zM17 9a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      label: 'Puntos de Análisis',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    }
  ];

  // Data
  points: PointWithZone[] = [];
  filteredPoints: PointWithZone[] = [];
  paginatedPoints: PointWithZone[] = [];

  // Lookup data
  zonesLookup: { [key: string]: string } = {};
  organizationName: string = '';

  // Statistics
  totalPoints: number = 0;
  activePoints: number = 0;
  inactivePoints: number = 0;
  showingPoints: number = 0;

  // Zones
  availableZones: string[] = [];
  selectedZone: string = '';

  // Filters
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // States
  isLoading: boolean = false;
  isCreating: boolean = false;
  editingPoint: TestingPoints | null = null;

  // Dropdowns
  isZoneDropdownOpen: boolean = false;
  isStatusDropdownOpen: boolean = false;

  // Modal states
  isDetailsModalOpen: boolean = false;
  selectedPointId: string | null = null;
  selectedPointData: PointWithZone | null = null;

  Math = Math;

  constructor(
    public authService: AuthService,
    private notificationService: NotificationService,
    private waterQualityApi: WaterQualityApi
  ) { }

  ngOnInit(): void {

    this.loadPoints();
  }

  loadPoints(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    const organizationId = user?.organizationId;


    if (!organizationId) {

      this.notificationService.error(
        'Error de Autenticación',
        'No se pudo obtener la información de la organización. Por favor, inicie sesión de nuevo.'
      );
      this.isLoading = false;
      return;
    }


    this.waterQualityApi.getTestingPointsByOrganizationId(organizationId).subscribe({
      next: (response) => {
        const apiResponse = response as any;

        if (apiResponse && (apiResponse.success || apiResponse.status) && Array.isArray(apiResponse.data)) {
          // Mapear los datos directamente sin modificaciones
          this.points = apiResponse.data.map((point: any) => ({
            id: point.id || '',
            organizationId: point.organizationId || '',
            pointCode: point.pointCode || '',
            pointName: point.pointName || '',
            pointType: point.pointType || '',
            zoneId: point.zoneId || '',
            locationDescription: point.locationDescription || '',
            street: point.street || '',
            coordinates: point.coordinates || { latitude: 0, longitude: 0 },
            status: point.status || 'ACTIVE',
            createdAt: point.createdAt || '',
            updatedAt: point.updatedAt || '',
            zone: point.zone || null
          }));


          // Cargar información adicional
          this.loadAdditionalInfo().then(() => {
            // Después de cargar las zonas, actualizar la vista
            this.filterPoints();
            this.calculateStatistics();
          });

          if (this.points.length > 0) {
            this.notificationService.success(
              'Datos cargados',
              `Se cargaron ${this.points.length} punto(s) correctamente`
            );
          } else {

            this.notificationService.info(
              'Sin puntos',
              'No hay puntos de análisis registrados para esta organización'
            );
          }
        } else {

          this.points = [];
          this.filterPoints();
          this.notificationService.warning(
            'Sin datos',
            'No se encontraron puntos de análisis registrados'
          );
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading points:', error);
        console.error('🔍 Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });

        const errorMessage = error?.error?.message || error?.message || 'Error al conectar con el servidor';
        this.notificationService.error(
          'Error al cargar datos',
          `${errorMessage} (Status: ${error?.status || 'Unknown'})`
        );
        this.isLoading = false;
        this.points = [];
        this.filterPoints();
      }
    });
  }

  calculateStatistics(): void {
    this.totalPoints = this.points.length;
    this.activePoints = this.points.filter(p => p.status === 'ACTIVE').length;
    this.inactivePoints = this.points.filter(p => p.status !== 'ACTIVE').length;
  }

  private async loadAdditionalInfo(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) return;

    // Cargar información de las zonas y esperar a que termine
    return new Promise((resolve) => {
      this.waterQualityApi.getZonesByOrganization(currentUser.organizationId).subscribe({
        next: (response: any) => {
          if ((response.success || response.status) && Array.isArray(response.data)) {
            // Limpiar lookup anterior
            this.zonesLookup = {};

            // Filtrar zonas por organización actual y crear lookup
            const currentOrgId = currentUser.organizationId;
            const orgZones = response.data.filter((zone: any) =>
              zone.organizationId === currentOrgId
            );

            // Crear lookup de zonas
            orgZones.forEach((zone: any) => {
              const zoneId = zone.zoneId;
              const zoneName = zone.zoneName;
              this.zonesLookup[zoneId] = zoneName;
            });

            console.log('📊 Total zones loaded:', orgZones.length);
            // Mostrar solo los primeros nombres de las zonas para debugging
            if (orgZones.length > 0) {
              console.log('First 3 zone names:', Object.values(this.zonesLookup).slice(0, 3));
            }

            // Actualizar zonas disponibles para filtros
            this.availableZones = Object.values(this.zonesLookup) as string[];
          } else {
            console.warn('⚠️ No zones data received or invalid format');
            this.zonesLookup = {};
            this.availableZones = [];
          }
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading zones:', error);
          this.zonesLookup = {};
          this.availableZones = [];
          resolve();
        }
      });
    });
  }

  private async loadOrganizationInfo(organizationId: string): Promise<void> {
    try {
      const response = await fetch(`https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.name) {
          this.organizationName = data.data.name;
        } else if (data?.name) {
          this.organizationName = data.name;
        } else {
          this.organizationName = 'Organización no encontrada';
        }
      }
    } catch (error) {
      this.organizationName = 'Error al cargar organización';
    }
  }



  getZoneName(zoneId: string): string {
    if (!zoneId) {
      return 'Sin zona';
    }

    const zoneName = this.zonesLookup[zoneId];
    if (zoneName) {
      return zoneName;
    }

    // Log solo cuando hay zonas disponibles pero no se encuentra la específica
    if (Object.keys(this.zonesLookup).length > 0) {
      console.log('⚠️ Zone not found for ID:', zoneId, 'Available zones:', Object.keys(this.zonesLookup));
    }

    return 'Zona no encontrada';
  }

  filterPoints(): void {
    this.filteredPoints = [...this.points];

    if (this.statusFilter !== 'all') {
      const status = this.statusFilter === 'active' ? 'ACTIVE' : 'INACTIVE';
      this.filteredPoints = this.filteredPoints.filter(p => p.status === status);
    }

    if (this.searchTerm && this.searchTerm.trim()) {
      const lowercasedTerm = this.searchTerm.toLowerCase().trim();
      this.filteredPoints = this.filteredPoints.filter(p =>
        (p.pointCode && p.pointCode.toLowerCase().includes(lowercasedTerm)) ||
        (p.pointName && p.pointName.toLowerCase().includes(lowercasedTerm))
      );
    }

    if (this.selectedZone && this.selectedZone.trim()) {
      this.filteredPoints = this.filteredPoints.filter(p => this.getZoneName(p.zoneId) === this.selectedZone);
    }

    this.showingPoints = this.filteredPoints.length;
    this.totalPages = Math.ceil(this.showingPoints / this.pageSize);
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPoints = this.filteredPoints.slice(startIndex, endIndex);
  }

  onSearch(): void {
    this.filterPoints();
  }

  viewPointDetails(point: PointWithZone): void {
    // Cerrar cualquier otro modal que esté abierto
    this.isCreating = false;
    this.editingPoint = null;

    // Enriquecer los datos del punto con información adicional
    const enrichedPoint = {
      ...point,
      organizationName: this.organizationName,
      zoneName: this.getZoneName(point.zoneId),
      // Asegurar que la zona esté disponible
      zone: {
        id: point.zoneId,
        name: this.getZoneName(point.zoneId)
      }
    };

    console.log('🔍 Opening details for point:', enrichedPoint);

    // Abrir modal de detalles
    this.selectedPointId = point.id;
    this.selectedPointData = enrichedPoint;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedPointId = null;
    this.selectedPointData = null;
  }

  openCreatePointModal(): void {
    // Cerrar cualquier otro modal que esté abierto
    this.isDetailsModalOpen = false;
    this.selectedPointId = null;
    this.selectedPointData = null;

    // Abrir modal de crear
    this.editingPoint = null;
    this.isCreating = true;
  }

  openEditPointModal(point: PointWithZone): void {
    // Cerrar cualquier otro modal que esté abierto
    this.isDetailsModalOpen = false;
    this.selectedPointId = null;
    this.selectedPointData = null;

    // Enriquecer el punto con información de zona antes de pasarlo al modal de edición
    const enrichedPoint = {
      ...point,
      // Asegurar que la zona esté disponible
      zone: {
        id: point.zoneId,
        name: this.getZoneName(point.zoneId)
      }
    };

    console.log('🔧 Opening edit modal for point:', enrichedPoint);

    // Abrir modal de editar
    this.editingPoint = enrichedPoint;
    this.isCreating = true;
  }

  closeCreatePointModal(): void {
    this.isCreating = false;
    this.editingPoint = null;
  }

  onPointCreated(point: any): void {
    this.closeCreatePointModal();
    this.loadPoints();
    this.notificationService.success(
      'Punto creado',
      'El punto de análisis se ha creado correctamente'
    );
  }

  onPointUpdated(point: any): void {
    this.closeCreatePointModal();
    this.loadPoints();
    this.notificationService.success(
      'Punto actualizado',
      'El punto de análisis se ha actualizado correctamente'
    );
  }

  deletePoint(point: PointWithZone): void {
    // Usar notificación de confirmación en lugar de confirm nativo
    const confirmed = confirm(`¿Está seguro que desea eliminar el punto "${point.pointCode}"?`);

    if (!confirmed) {
      return;
    }

    this.waterQualityApi.deleteTestingPoint(point.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            '¡Eliminado!',
            `El punto "${point.pointCode}" fue eliminado correctamente`
          );
          this.loadPoints(); // Reload the list
        } else {
          this.notificationService.error(
            'Error',
            'No se pudo eliminar el punto. Intente nuevamente.'
          );
        }
      },
      error: (error) => {
        console.error('Error deleting point:', error);
        const errorMessage = error?.error?.message || error?.message || 'Error al eliminar el punto';
        this.notificationService.error(
          'Error al eliminar',
          errorMessage
        );
      }
    });
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  trackById(index: number, item: PointWithZone): string {
    return item.id;
  }

  // ===============================
  // Report Generation
  // ===============================

  generateReport(): void {
    this.notificationService.info('Generando reporte', 'Preparando el documento PDF...');
    this.loadOrganizationDataAndCreateReport(this.filteredPoints);
  }

  private async loadOrganizationDataAndCreateReport(points: PointWithZone[]): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      this.notificationService.warning(
        'Información Incompleta',
        'No se pudo obtener la información de la organización. Generando reporte básico...'
      );
      await this.createPDFReportAsync(points, null);
      return;
    }

    try {
      let organization = null;

      // Intentar obtener datos de la organización
      try {
        const response = await fetch(`https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            organization = data.data;
          } else if (data?.success && data?.organization) {
            organization = data.organization;
          } else if (data?.name || data?.organizationName) {
            organization = data;
          }
        }
      } catch (e) {
        console.log('Error obteniendo organización:', e);
      }

      await this.createPDFReportAsync(points, organization);
    } catch (error) {
      console.error('Error en generación de reporte:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'No se pudo crear el documento PDF. Intente nuevamente.'
      );
    }
  }





  private getAppliedFilters(): string {
    const filters = [];

    if (this.searchTerm) {
      filters.push(`Búsqueda: "${this.searchTerm}"`);
    }

    if (this.selectedZone) {
      filters.push(`Zona: ${this.selectedZone}`);
    }

    if (this.statusFilter !== 'all') {
      filters.push(`Estado: ${this.statusFilter === 'active' ? 'Activos' : 'Inactivos'}`);
    }

    return filters.length > 0 ? filters.join(', ') : 'Ninguno';
  }

  private async createPDFReportAsync(points: PointWithZone[], organization: any): Promise<void> {
    const doc = new jsPDF();
    const currentUser = this.authService.getCurrentUser();
    const currentDate = new Date();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';

    // Configuración de colores sobrios y profesionales
    const primaryColor: [number, number, number] = [55, 65, 81]; // Gris oscuro
    const secondaryColor: [number, number, number] = [107, 114, 128]; // Gris medio
    const lightGray: [number, number, number] = [249, 250, 251]; // Gris claro
    const borderColor: [number, number, number] = [209, 213, 219]; // Gris borde
    const blueColor: [number, number, number] = [59, 130, 246]; // Azul profesional
    const greenColor: [number, number, number] = [34, 197, 94]; // Verde
    const redColor: [number, number, number] = [220, 38, 38]; // Rojo

    // Header profesional y sobrio
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');

    // Línea superior
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(3);
    doc.line(0, 0, 210, 0);
    doc.setLineWidth(0.5);

    // Logo de la organización con funcionalidad avanzada
    await this.addOrganizationLogoAsync(doc, organization, 20, 15, 25, 20);

    // Información de la organización
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(organizationName, 55, 22);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control de Calidad del Agua', 55, 30);

    doc.setFontSize(10);
    doc.text('Reporte de Puntos de Análisis', 55, 37);

    // Información adicional de la organización
    if (organization) {
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      if (organization.address) {
        doc.text(`Dirección: ${organization.address}`, 55, 43);
      }
      if (organization.phone) {
        doc.text(`Teléfono: ${organization.phone}`, 140, 43);
      }
    }

    // Línea inferior del header
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(15, 48, 195, 48);
    doc.setLineWidth(0.5);

    // Información de generación con fondo
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, 55, 180, 18, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(15, 55, 180, 18, 'S');

    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${currentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} - ${currentDate.toLocaleTimeString('es-ES')}`, 20, 62);

    // Información del usuario que genera el reporte
    if (currentUser) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (userName) {
        doc.text(`Generado por: ${userName}`, 20, 68);
      }
      if (currentUser.email) {
        doc.text(`Email: ${currentUser.email}`, 120, 68);
      }
    }

    // Estadísticas mejoradas con gráficos
    let yPos = 82;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', 20, yPos);

    // Línea
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(20, yPos + 3, 190, yPos + 3);

    yPos += 15;

    // Estadísticas con barras de progreso
    const stats = [
      { label: 'Total de Puntos', value: this.totalPoints, color: blueColor, percentage: 100 },
      { label: 'Puntos Activos', value: this.activePoints, color: greenColor, percentage: this.getPercentage(this.activePoints, this.totalPoints) },
      { label: 'Puntos Inactivos', value: this.inactivePoints, color: redColor, percentage: this.getPercentage(this.inactivePoints, this.totalPoints) },
      { label: 'Zonas Cubiertas', value: this.availableZones.length, color: primaryColor, percentage: 100 }
    ];

    stats.forEach((stat, index) => {
      const statY = yPos + (index * 12);

      // Etiqueta
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.label, 20, statY);

      // Valor
      doc.setFont('helvetica', 'bold');
      doc.text(`${stat.value}`, 80, statY);

      // Barra de progreso
      const barWidth = 60;
      const barHeight = 4;
      const barX = 100;

      // Fondo de la barra
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(barX, statY - 2, barWidth, barHeight, 'F');

      // Progreso de la barra
      const progressWidth = (stat.percentage / 100) * barWidth;
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.rect(barX, statY - 2, progressWidth, barHeight, 'F');

      // Porcentaje
      doc.setFontSize(8);
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.text(`${stat.percentage}%`, barX + barWidth + 5, statY);
    });

    // Tabla detallada de puntos
    yPos += 60;
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }

    // Título de la tabla
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Puntos de Análisis', 20, yPos);

    // Línea
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(20, yPos + 3, 190, yPos + 3);

    // Headers de tabla con color
    yPos += 12;
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.rect(15, yPos - 3, 180, 12, 'F');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Código', 18, yPos + 4);
    doc.text('Nombre', 45, yPos + 4);
    doc.text('Tipo', 85, yPos + 4);
    doc.text('Zona', 115, yPos + 4);
    doc.text('Estado', 150, yPos + 4);
    doc.text('Ubicación', 170, yPos + 4);

    // Datos de la tabla
    yPos += 15;
    doc.setFont('helvetica', 'normal');

    const pointsToShow = points.slice(0, 20);

    pointsToShow.forEach((point, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;

        // Repetir header en nueva página
        doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Código', 18, yPos + 4);
        doc.text('Nombre', 45, yPos + 4);
        doc.text('Tipo', 85, yPos + 4);
        doc.text('Zona', 115, yPos + 4);
        doc.text('Estado', 150, yPos + 4);
        doc.text('Ubicación', 170, yPos + 4);
        yPos += 15;
      }

      const rowY = yPos + (index * 12);

      // Alternar color de fondo
      if (index % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(15, rowY - 2, 180, 10, 'F');
      }

      // Línea separadora
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(15, rowY + 7, 195, rowY + 7);

      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      // Datos del punto
      doc.setFont('helvetica', 'bold');
      doc.text(point.pointCode || 'N/A', 18, rowY + 2);

      doc.setFont('helvetica', 'normal');
      doc.text(this.truncateText(point.pointName || 'N/A', 15), 45, rowY + 2);
      doc.text(this.truncateText(point.pointType || 'N/A', 10), 85, rowY + 2);
      doc.text(this.truncateText(this.getZoneName(point.zoneId), 12), 115, rowY + 2);
      doc.text(this.truncateText(point.locationDescription || 'N/A', 10), 170, rowY + 2);

      // Estado con color
      const statusColor = point.status === 'ACTIVE' ? greenColor : redColor;
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(point.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO', 150, rowY + 2);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    });

    // Información adicional
    yPos += 15;
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }

    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Filtros aplicados: ${this.getAppliedFilters()}`, 20, yPos);
    doc.text(`Total de registros en reporte: ${pointsToShow.length} de ${this.totalPoints}`, 20, yPos + 8);

    // Footer del documento
    yPos += 20;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 195, yPos);

    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Reporte generado por ${organizationName}`, 20, yPos);
    doc.text(`${currentDate.toLocaleDateString('es-ES')} - ${currentDate.toLocaleTimeString('es-ES')}`, 20, yPos + 6);

    // Numeración de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Página ${i} de ${pageCount}`, 170, 285);
    }

    // Descargar el PDF con nombre mejorado
    const orgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileName = `reporte-puntos-analisis-${orgName}-${currentDate.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    this.notificationService.success(
      'Reporte PDF Generado',
      `El archivo "${fileName}" se ha descargado exitosamente con ${pointsToShow.length} puntos de análisis`
    );
  }

  private async getOrganizationData(): Promise<any> {
    const currentUser = this.authService.getCurrentUser();

    // Intentar obtener datos reales de la organización
    const organizationEndpoints = [
      `/api/organizations/${currentUser?.organizationId}`,
      `/api/organization/details/${currentUser?.organizationId}`,
      `/api/org/${currentUser?.organizationId}`,
      `/api/organizations/current`
    ];

    for (const endpoint of organizationEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          if (data && (data.name || data.organizationName)) {
            return {
              name: data.name || data.organizationName || 'Organización JASS',
              logo: data.logo || data.logoUrl || null,
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || ''
            };
          }
        }
      } catch (error) {
        console.log(`Failed to fetch from ${endpoint}:`, error);
      }
    }

    // Fallback con datos por defecto
    return {
      name: 'Sistema JASS - Gestión de Calidad del Agua',
      logo: null,
      address: '',
      phone: '',
      email: ''
    };
  }

  private async loadOrganizationLogo(organizationData: any): Promise<string | null> {
    if (!organizationData.logo) return null;

    const logoUrls = [
      organizationData.logo,
      `/api/organizations/${this.authService.getCurrentUser()?.organizationId}/logo`,
      `/assets/images/organization-logo.png`,
      `/assets/logos/org-logo.png`,
      `https://via.placeholder.com/100x100/2563EB/FFFFFF?text=JASS`
    ];

    for (const url of logoUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.log(`Failed to load logo from ${url}:`, error);
      }
    }

    return null;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // ===============================
  // Métodos auxiliares para PDF mejorado
  // ===============================

  private getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }



  private async addOrganizationLogoAsync(doc: any, organization: any, x: number, y: number, maxWidth: number, maxHeight: number): Promise<void> {
    // Intentar obtener el logo de diferentes campos posibles
    let logoUrl = null;

    if (organization) {
      logoUrl = organization.logoUrl ||
        organization.logo ||
        organization.image ||
        organization.organizationLogo ||
        organization.profileImage ||
        organization.logoPath ||
        organization.imagePath;

      console.log('URL del logo encontrada:', logoUrl);
    }

    if (logoUrl) {
      try {
        const imageResult = await this.loadImageAsync(logoUrl);

        // Calcular dimensiones finales manteniendo aspect ratio dentro del espacio disponible
        const aspectRatio = imageResult.width / imageResult.height;
        let finalWidth = maxWidth;
        let finalHeight = maxHeight;

        if (aspectRatio > 1) {
          // Imagen más ancha que alta
          finalHeight = maxWidth / aspectRatio;
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspectRatio;
          }
        } else {
          // Imagen más alta que ancha
          finalWidth = maxHeight * aspectRatio;
          if (finalWidth > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspectRatio;
          }
        }

        // Centrar la imagen en el espacio disponible
        const offsetX = (maxWidth - finalWidth) / 2;
        const offsetY = (maxHeight - finalHeight) / 2;

        doc.addImage(imageResult.dataURL, 'PNG', x + offsetX, y + offsetY, finalWidth, finalHeight);
        console.log('Logo agregado exitosamente al PDF con dimensiones:', finalWidth, 'x', finalHeight);
      } catch (error) {
        console.log('Error al cargar logo, usando logo por defecto:', error);
        this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
      }
    } else {
      console.log('No se encontró URL de logo, usando logo por defecto');
      this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
    }
  }

  private async loadImageAsync(url: string): Promise<{ dataURL: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const dataURL = canvas.toDataURL('image/png');
          resolve({
            dataURL,
            width: img.width,
            height: img.height
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`No se pudo cargar la imagen desde: ${url}`));
      };

      img.src = url;
    });
  }

  private addDefaultLogo(doc: any, x: number, y: number, maxWidth: number, maxHeight: number): void {
    // Crear un logo por defecto con las iniciales "JASS"
    const centerX = x + maxWidth / 2;
    const centerY = y + maxHeight / 2;
    const radius = Math.min(maxWidth, maxHeight) / 2 - 2;

    // Círculo de fondo azul
    doc.setFillColor(59, 130, 246); // Color azul
    doc.circle(centerX, centerY, radius, 'F');

    // Texto "JASS" en blanco
    doc.setFontSize(Math.max(8, radius / 2));
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    // Centrar el texto
    const textWidth = doc.getTextWidth('JASS');
    const textX = centerX - textWidth / 2;
    const textY = centerY + radius / 4;

    doc.text('JASS', textX, textY);
  }

}
