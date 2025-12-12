import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/components/ui/breadcrumb/breadcrumb';
import { DistributionApi } from '../../../services/distribution-api';
import { AuthService } from '../../../../../core/auth/services/auth';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Route, RouteZone } from '../../../models/routes.model';
import { Status, StatusLabels } from '../../../models/api-response.model';
// Importar OrganizationApi para obtener los nombres de zonas
import { DistributionOrganizationApi as OrganizationApi, Zone } from '../../../services/organization-api.service';
// Importar jsPDF y autotable para generación de reportes
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Importar los modales de creación, edición y visualización
import { CreateRouteModal } from '../create-route-modal/create-route-modal';
import { UpdateRouteModal } from '../update-route-modal/update-route-modal';
import { ViewRouteModal } from '../view-route-modal/view-route-modal';
// Importar el modal de confirmación
import { RouteConfirmationModal, ConfirmationModalData } from '../confirmation-modal/confirmation-modal';

interface ConfirmationData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  routeName?: string;
  routeCode?: string;
}

@Component({
  selector: 'app-routes-list',
  standalone: true,
  imports: [Breadcrumb, FormsModule, CommonModule, CreateRouteModal, UpdateRouteModal, ViewRouteModal, RouteConfirmationModal],
  templateUrl: './routes-list.html'
})
export class RoutesList implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Distribución',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 004 21h16a8.014 8.014 0 00-.572-5.572zM7 9a2 2 0 11-4 0 2 2 0 014 0zM17 9a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      label: 'Rutas',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
    }
  ];

  // Datos
  routes: Route[] = [];
  filteredRoutes: Route[] = [];
  paginatedRoutes: Route[] = [];
  organizationData: any = null;

  // Filtros
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Estados
  isLoading: boolean = false;

  // Dropdowns custom
  isStatusDropdownOpen: boolean = false;

  // Modal de detalles de ruta
  isRouteDetailsModalOpen: boolean = false;
  selectedRouteId: string | null = null;

  // Modal de crear ruta
  isCreateRouteModalOpen: boolean = false;
  currentOrganizationId: string | null = null;

  // Modal de editar ruta
  isUpdateRouteModalOpen: boolean = false;
  editingRoute: Route | null = null;

  // Modal de ver ruta
  isViewRouteModalOpen: boolean = false;
  viewingRoute: Route | null = null;

  // Modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationData: ConfirmationModalData = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  pendingActionRoute: Route | null = null;
  pendingActionType: 'delete' | 'restore' | null = null;

  // Datos de zonas para mostrar nombres
  zonesData: Map<string, Zone> = new Map();

  // Referencia a Math para usar en el template
  Math = Math;

  // Add enum values so they can be accessed in the template
  Status = Status;

  // Estadísticas calculadas
  get totalRoutes(): number {
    return this.routes.length;
  }

  get activeRoutes(): number {
    return this.routes.filter(r => r.status === Status.ACTIVE).length;
  }

  get inactiveRoutes(): number {
    return this.routes.filter(r => r.status === Status.INACTIVE).length;
  }

  constructor(
    private distributionApi: DistributionApi,
    private authService: AuthService,
    private notificationService: NotificationService,
    private organizationApi: OrganizationApi,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRoutes();
    this.loadOrganizationData();
  }

  /**
   * Cargar datos de la organización para obtener nombres de zonas
   */
  loadOrganizationData(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      return;
    }

    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.organizationData = response.data;
          // Cargar zonas en el mapa para acceso rápido
          if (response.data.zones) {
            response.data.zones.forEach(zone => {
              this.zonesData.set(zone.zoneId, zone);
            });
          }
        }
      },
      error: (error) => {
        console.error('Error loading organization data:', error);
      }
    });
  }

  /**
   * Obtener nombre de zona por ID
   */
  getZoneName(zoneId: string): string {
    const zone = this.zonesData.get(zoneId);
    return zone ? zone.zoneName : 'Zona no encontrada';
  }

  /**
   * Cargar todas las rutas
   */
  loadRoutes(): void {
    this.isLoading = true;
    const organizationId = this.getCurrentOrganizationId();

    // Add debugging
    console.log('[RoutesList] Loading routes for organization:', organizationId);

    // Check if we have a valid organization ID
    if (!organizationId || organizationId === 'default-org') {
      console.warn('[RoutesList] No valid organization ID found');
      this.notificationService.error('Error', 'No se pudo identificar la organización');
      this.isLoading = false;
      return;
    }

    this.distributionApi.getAllRoutes(organizationId).subscribe({
      next: (response) => {
        console.log('[RoutesList] Routes API response:', response);
        if (response && response.success || response.status) {
          this.routes = response.data || [];
          console.log('[RoutesList] Loaded routes count:', this.routes.length);
          this.applyFilters();
        } else {
          // Better error handling using ApiResponseHelper
          const errorMessage = (response && (response.message || response.error?.message)) || 'No se pudieron cargar las rutas';
          console.error('[RoutesList] API returned error:', errorMessage);
          this.notificationService.error('Error', errorMessage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[RoutesList] Error loading routes:', error);
        // Handle HTTP errors
        let errorMessage = 'No se pudieron cargar las rutas';
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
        } else if (error.status === 401) {
          errorMessage = 'No autorizado. Por favor inicie sesión nuevamente.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado. No tiene permisos para acceder a esta información.';
        } else if (error.status === 404) {
          errorMessage = 'Recurso no encontrado.';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.notificationService.error('Error', errorMessage);
        this.isLoading = false;
      }
    });
  }

  /**
   * Aplicar filtros de búsqueda y estado
   */
  applyFilters(): void {
    let filtered = [...this.routes];

    // Filtro de estado
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(route => route.status === Status.ACTIVE);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(route => route.status === Status.INACTIVE);
    }

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(route =>
        route.routeCode.toLowerCase().includes(term) ||
        route.routeName.toLowerCase().includes(term)
      );
    }

    this.filteredRoutes = filtered;
    this.updatePagination();
  }

  /**
   * Evento de búsqueda
   */
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  /**
   * Evento de cambio de filtro de estado
   */
  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Métodos para dropdowns custom
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.isStatusDropdownOpen = false;
    this.onStatusFilterChange();
  }

  getStatusDisplayText(): string {
    switch (this.statusFilter) {
      case 'all': return 'Todas las rutas';
      case 'active': return 'Solo activas';
      case 'inactive': return 'Solo inactivas';
      default: return 'Todas las rutas';
    }
  }

  closeDropdowns(): void {
    this.isStatusDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.closeDropdowns();
    }
  }

  /**
   * Obtener etiqueta del estado
   */
  getStatusLabel(status: string): string {
    return StatusLabels[status as Status] || status;
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case this.Status.ACTIVE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case this.Status.INACTIVE:
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Tracking function para ngFor
   */
  trackByRouteId(index: number, route: Route): string {
    return route.id;
  }

  /**
   * Abrir modal de creación
   */
  openCreateRouteModal(): void {
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isCreateRouteModalOpen = true;
  }

  /**
   * Cerrar modal de creación
   */
  closeCreateRouteModal(): void {
    console.log('[RoutesList] Closing create route modal');
    this.isCreateRouteModalOpen = false;
    this.currentOrganizationId = null;
  }

  /**
   * Cerrar modal de detalles
   */
  closeRouteDetailsModal(): void {
    this.isRouteDetailsModalOpen = false;
    this.selectedRouteId = null;
  }

  /**
   * Ver detalles de la ruta (abrir modal de visualización)
   */
  viewRouteDetails(route: Route): void {
    console.log('[RoutesList] Viewing route details:', route);
    this.viewingRoute = route;
    this.isViewRouteModalOpen = true;
  }

  /**
   * Cerrar modal de visualización de ruta
   */
  closeViewRouteModal(): void {
    console.log('[RoutesList] Closing view route modal');
    this.isViewRouteModalOpen = false;
    this.viewingRoute = null;
  }

  /**
   * Abrir modal de edición de ruta
   */
  openUpdateRouteModal(route: Route): void {
    console.log('[RoutesList] Opening update route modal for route:', route);
    this.editingRoute = route;
    this.isUpdateRouteModalOpen = true;
  }

  /**
   * Cerrar modal de edición de ruta
   */
  closeUpdateRouteModal(): void {
    console.log('[RoutesList] Closing update route modal');
    this.isUpdateRouteModalOpen = false;
    this.editingRoute = null;
  }

  /**
   * Manejar cuando se actualiza una ruta
   */
  onRouteUpdated(): void {
    console.log('[RoutesList] Route updated, reloading routes');
    this.loadRoutes();
    this.closeUpdateRouteModal();
  }

  /**
   * Editar ruta desde el modal - Actualizar la lista con los datos actualizados
   */
  editRouteFromModal(route: Route): void {
    // Encontrar y actualizar la ruta en la lista local
    const index = this.routes.findIndex(r => r.id === route.id);
    if (index !== -1) {
      this.routes[index] = route;

      // Recargar los filtros y paginación para reflejar los cambios
      this.applyFilters();

      console.log('✅ Ruta actualizada en la lista:', route);
    }

    // Cerrar el modal
    this.closeRouteDetailsModal();
  }

  /**
   * Actualizar paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredRoutes.length / this.pageSize);

    // Verificar si la página actual es válida
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }

    // Calcular índices para la página actual
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    // Obtener rutas para la página actual
    this.paginatedRoutes = this.filteredRoutes.slice(startIndex, endIndex);
  }

  /**
   * Ir a página específica
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Página anterior
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  /**
   * Página siguiente
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  /**
   * Obtener array de páginas para mostrar en el paginador
   */
  getPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, this.currentPage - halfRange);
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Preparar eliminación de ruta (desactivar)
   */
  prepareDeleteRoute(route: Route): void {
    this.pendingActionRoute = route;
    this.pendingActionType = 'delete';

    this.confirmationData = {
      title: 'Desactivar Ruta',
      message: `¿Está seguro que desea desactivar la ruta ${route.routeCode} - ${route.routeName}?`,
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'warning',
      routeName: route.routeName,
      routeCode: route.routeCode
    };

    this.isConfirmationModalOpen = true;
  }

  /**
   * Preparar restauración de ruta (activar)
   */
  prepareRestoreRoute(route: Route): void {
    this.pendingActionRoute = route;
    this.pendingActionType = 'restore';

    this.confirmationData = {
      title: 'Activar Ruta',
      message: `¿Está seguro que desea activar la ruta ${route.routeCode} - ${route.routeName}?`,
      confirmText: 'Activar',
      cancelText: 'Cancelar',
      type: 'info',
      routeName: route.routeName,
      routeCode: route.routeCode
    };

    this.isConfirmationModalOpen = true;
  }

  /**
   * Confirmar acción pendiente
   */
  onConfirmAction(): void {
    if (!this.pendingActionRoute || !this.pendingActionType) {
      return;
    }

    if (this.pendingActionType === 'delete') {
      this.deleteRoute(this.pendingActionRoute);
    } else if (this.pendingActionType === 'restore') {
      this.restoreRoute(this.pendingActionRoute);
    }

    this.isConfirmationModalOpen = false;
    this.pendingActionRoute = null;
    this.pendingActionType = null;
  }

  /**
   * Cancelar acción pendiente
   */
  onCancelAction(): void {
    this.isConfirmationModalOpen = false;
    this.pendingActionRoute = null;
    this.pendingActionType = null;
  }

  /**
   * Eliminar ruta (desactivar)
   */
  deleteRoute(route: Route): void {
    this.distributionApi.changeRouteStatus(route.id, Status.INACTIVE).subscribe({
      next: (response) => {
        // Verificar si la respuesta indica éxito (manejando diferentes formatos)
        const isSuccess = response && (response.success === true || response.status === true || response.data !== undefined);

        if (isSuccess) {
          this.notificationService.success('Éxito', 'Ruta desactivada correctamente');
          this.loadRoutes(); // Recargar lista
          // Forzar la detección de cambios
          this.changeDetectorRef.detectChanges();
        } else {
          console.error('Error deleting route - response:', response);
          this.notificationService.error('Error', 'No se pudo desactivar la ruta');
        }
      },
      error: (error) => {
        console.error('Error deleting route:', error);
        this.notificationService.error('Error', 'No se pudo desactivar la ruta');
      }
    });
  }

  /**
   * Restaurar ruta (activar)
   */
  restoreRoute(route: Route): void {
    this.distributionApi.changeRouteStatus(route.id, Status.ACTIVE).subscribe({
      next: (response) => {
        // Verificar si la respuesta indica éxito (manejando diferentes formatos)
        const isSuccess = response && (response.success === true || response.status === true || response.data !== undefined);

        if (isSuccess) {
          this.notificationService.success('Éxito', 'Ruta activada correctamente');
          this.loadRoutes(); // Recargar lista
          // Forzar la detección de cambios
          this.changeDetectorRef.detectChanges();
        } else {
          console.error('Error restoring route - response:', response);
          this.notificationService.error('Error', 'No se pudo activar la ruta');
        }
      },
      error: (error) => {
        console.error('Error restoring route:', error);
        this.notificationService.error('Error', 'No se pudo activar la ruta');
      }
    });
  }

  /**
   * Obtener ID de organización del usuario actual
   */
  private getCurrentOrganizationId(): string {
    const currentUser = this.authService.getCurrentUser();
    console.log('[RoutesList] Current user:', currentUser); // Debug log
    const orgId = currentUser?.organizationId;
    console.log('[RoutesList] Organization ID:', orgId); // Debug log
    return orgId || 'default-org';
  }

  /**
   * Maneja el evento cuando se crea una nueva ruta
   */
  onRouteCreated(): void {
    this.notificationService.success('Éxito', 'Ruta creada correctamente');
    this.loadRoutes(); // Recargar lista
    this.closeCreateRouteModal();
  }

  /**
   * Generar reporte de rutas
   */
  generateReport(): void {
    console.log('Generando reporte de rutas');

    // Verificar que ya tengamos los datos de la organización
    if (!this.organizationData) {
      this.notificationService.error('Error', 'No se han cargado los datos de la organización');
      return;
    }

    // Generar el PDF con los datos de la organización y rutas
    this.generatePdfReport(this.organizationData, this.filteredRoutes);
  }

  /**
   * Generar PDF con los datos de la organización y rutas
   */
  private generatePdfReport(organizationData: any, routes: Route[]): void {
    try {
      // Crear una nueva instancia de jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurar fuentes y tamaños
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Agregar encabezado
      this.addHeaderToPdf(doc, organizationData, pageWidth);

      // Agregar título del reporte
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('REPORTE DE RUTAS', pageWidth / 2, 55, { align: 'center' });

      // Agregar información del reporte
      const currentDate = new Date();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${currentDate.toLocaleDateString('es-ES')}`, 20, 65);
      doc.text(`Total de rutas: ${routes.length}`, pageWidth - 20, 65, { align: 'right' });

      // Preparar datos para la tabla (sin la columna de estado)
      const tableData = routes.map((route, index) => [
        (index + 1).toString(),
        route.routeCode || '',
        route.routeName || '',
        route.zones?.length?.toString() || '0',
        `${route.totalEstimatedDuration || 0} min`
      ]);

      // Agregar tabla de rutas usando autoTable correctamente (sin la columna de estado)
      autoTable(doc, {
        head: [['#', 'Código', 'Nombre', 'Zonas', 'Duración Est.']],
        body: tableData,
        startY: 70,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [25, 118, 210], // Azul JASS
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        // Centrar la tabla horizontalmente calculando el ancho total
        margin: { left: (pageWidth - (10 + 25 + 40 + 15 + 25)) / 2, right: (pageWidth - (10 + 25 + 40 + 15 + 25)) / 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // #
          1: { cellWidth: 25 }, // Código
          2: { cellWidth: 40 }, // Nombre
          3: { cellWidth: 15, halign: 'center' }, // Zonas
          4: { cellWidth: 25, halign: 'center' }  // Duración Est.
        }
      });

      // Agregar pie de página (sin resumen estadístico)
      this.addFooterToPdf(doc, pageWidth, pageHeight);

      // Guardar el PDF
      const filename = `reporte-rutas-${organizationData.organizationCode}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      this.notificationService.success('Éxito', 'Reporte PDF generado correctamente');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      this.notificationService.error('Error', 'Error al generar el reporte PDF');
    }
  }

  /**
   * Agregar encabezado al PDF con datos de la organización
   */
  private addHeaderToPdf(doc: jsPDF, organizationData: any, pageWidth: number): void {
    // Fondo azul para el encabezado (simulando un membrete profesional)
    doc.setFillColor(25, 118, 210); // Azul JASS
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Si hay un logo, intentar agregarlo
    if (organizationData.logo) {
      try {
        // Agregar logo (se ajustará al tamaño disponible)
        doc.addImage(organizationData.logo, 'PNG', 15, 8, 25, 25);
      } catch (error) {
        console.warn('No se pudo cargar el logo de la organización:', error);
      }
    }

    // Título de la organización en blanco
    const titleX = organizationData.logo ? 45 : 20;

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // Blanco
    doc.setFont('helvetica', 'bold');
    doc.text(organizationData.organizationName || 'JUNTA ADMINISTRADORA DE AGUA POTABLE', titleX, 18);

    // Subtítulo "Sistema de Agua Potable"
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', titleX, 25);

    // Dirección y teléfono en blanco
    doc.setFontSize(9);
    doc.text(organizationData.address || '', titleX, 32);
    doc.text(`Tel: ${organizationData.phone || ''}`, titleX, 38);

    // Línea divisoria blanca
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(15, 44, pageWidth - 15, 44);

    // Línea gris fina en el borde inferior del encabezado
    doc.setDrawColor(200, 200, 200); // Gris claro
    doc.setLineWidth(0.5);
    doc.line(0, 45, pageWidth, 45);

    // Resetear colores
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  }

  /**
   * Agregar pie de página al PDF
   */
  private addFooterToPdf(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const pageCount = (doc as any).getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Fondo gris claro para el pie
      doc.setFillColor(245, 245, 245);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');

      // Línea divisoria
      doc.setLineWidth(0.2);
      doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);

      // Texto del pie de página
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Documento generado automáticamente por el Sistema JASS', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text('Este documento no requiere firma', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Número de página
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 15, { align: 'right' });

      // Resetear color
      doc.setTextColor(0, 0, 0);
    }
  }
}
