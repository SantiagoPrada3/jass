import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { PurchasesApiService } from '../../services/purchases-api.service';
import { CreatePurchaseModal } from '../create-purchase-modal/create-purchase-modal';
import { EditPurchaseStatusModal } from '../edit-purchase-status-modal/edit-purchase-status-modal';
import { PurchaseDetailsModal } from '../purchase-details-modal/purchase-details-modal';
import { InventoryReportService } from '../../services/report.service';
import { OrganizationApiService } from '../../services/organization-api.service';
import {
  Purchase,
  PurchaseStatus,
  PurchaseStatusConfig,
  PurchaseFilters
} from '../../models/purchase.model';

@Component({
  selector: 'app-purchases-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb, CreatePurchaseModal, EditPurchaseStatusModal, PurchaseDetailsModal],
  templateUrl: './purchases-list.html',
  styleUrl: './purchases-list.css'
})
export class PurchasesList implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly purchasesApi = inject(PurchasesApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(InventoryReportService);
  private readonly organizationApi = inject(OrganizationApiService);

  // Referencias para el template
  readonly PurchaseStatus = PurchaseStatus;
  readonly PurchaseStatusConfig = PurchaseStatusConfig;
  readonly Math = Math;

  // Estado del componente
  purchases: Purchase[] = [];
  filteredPurchases: Purchase[] = [];
  paginatedPurchases: Purchase[] = [];
  loading = false;
  error: string | null = null;

  // Filtros
  filters: PurchaseFilters & { priceRange?: string } = {
    organizationId: '',
    searchTerm: '',
    status: undefined,
    dateFrom: '',
    dateTo: '',
    priceRange: undefined
  };

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // UI State
  showFilters = false;
  showStatusDropdown = false;
  showPriceDropdown = false;
  sortField = 'purchaseCode';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal state
  showCreateModal = false;
  showEditStatusModal = false;
  showDetailsModal = false;
  selectedPurchaseForEdit: Purchase | null = null;
  selectedPurchaseForDetails: Purchase | null = null;

  // Breadcrumb
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a1 1 0 00-1-1H4a1 1 0 00-1-1V7a2 2 0 012-2h14a2 2 0 012 2v1'
    },
    {
      label: 'Inventario y Compras',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      label: 'Compras',
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H19M7 13v4a2 2 0 002 2h8a2 2 0 002-2v-4'
    }
  ];

  ngOnInit(): void {
    this.initializeFilters();
    this.loadPurchases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilters(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.organizationId) {
      this.filters.organizationId = currentUser.organizationId;
    }
  }

  loadPurchases(): void {
    if (!this.filters.organizationId) {
      this.error = 'No se pudo obtener la organización del usuario';
      return;
    }

    this.loading = true;
    this.error = null;

    this.purchasesApi.getPurchasesByOrganization(this.filters.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (purchases) => {
          this.purchases = purchases;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar las compras';
          this.loading = false;
          console.error('Error loading purchases:', error);
          this.notificationService.error('Error', 'Error al cargar las compras');
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.purchases];

    // Filtro por término de búsqueda
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(purchase =>
        purchase.purchaseCode.toLowerCase().includes(searchTerm) ||
        purchase.supplierName.toLowerCase().includes(searchTerm) ||
        purchase.invoiceNumber.toLowerCase().includes(searchTerm) ||
        (purchase.requestedByUser?.fullName || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por estado
    if (this.filters.status) {
      filtered = filtered.filter(purchase => purchase.status === this.filters.status);
    }

    // Filtro por rango de precio
    if (this.filters.priceRange) {
      filtered = filtered.filter(purchase => {
        const amount = purchase.totalAmount;
        switch (this.filters.priceRange) {
          case '0-500':
            return amount >= 0 && amount <= 500;
          case '500-1000':
            return amount > 500 && amount <= 1000;
          case '1000-1500':
            return amount > 1000 && amount <= 1500;
          case '1500+':
            return amount > 1500;
          default:
            return true;
        }
      });
    }

    // Filtro por fecha desde
    if (this.filters.dateFrom) {
      filtered = filtered.filter(purchase =>
        new Date(purchase.purchaseDate) >= new Date(this.filters.dateFrom!)
      );
    }

    // Filtro por fecha hasta
    if (this.filters.dateTo) {
      filtered = filtered.filter(purchase =>
        new Date(purchase.purchaseDate) <= new Date(this.filters.dateTo!)
      );
    }

    // Ordenar por código de compra (ya viene ordenado del servicio)
    filtered.sort((a, b) => a.purchaseCode.localeCompare(b.purchaseCode));

    this.filteredPurchases = filtered;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPurchases.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedPurchases = this.filteredPurchases.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onFiltersChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters.searchTerm = '';
    this.filters.status = undefined;
    this.filters.priceRange = undefined;
    this.filters.dateFrom = '';
    this.filters.dateTo = '';
    this.onFiltersChange();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
    // Cerrar dropdown de precio si está abierto
    if (this.showStatusDropdown) {
      this.showPriceDropdown = false;
    }
  }

  togglePriceDropdown(): void {
    this.showPriceDropdown = !this.showPriceDropdown;
    // Cerrar dropdown de estado si está abierto
    if (this.showPriceDropdown) {
      this.showStatusDropdown = false;
    }
  }

  selectStatus(status: PurchaseStatus | undefined): void {
    this.filters.status = status;
    this.showStatusDropdown = false;
    this.onFiltersChange();
  }

  selectPriceRange(priceRange: string | undefined): void {
    this.filters.priceRange = priceRange;
    this.showPriceDropdown = false;
    this.onFiltersChange();
  }

  getSelectedStatusLabel(): string {
    if (!this.filters.status) return 'Todos los estados';
    return this.getStatusLabel(this.filters.status);
  }

  getSelectedPriceRangeLabel(): string {
    if (!this.filters.priceRange) return 'Todos los precios';

    switch (this.filters.priceRange) {
      case '0-500':
        return 'S/ 0 - S/ 500';
      case '500-1000':
        return 'S/ 500 - S/ 1,000';
      case '1000-1500':
        return 'S/ 1,000 - S/ 1,500';
      case '1500+':
        return 'S/ 1,500 o más';
      default:
        return 'Todos los precios';
    }
  }

  // Funciones utilitarias para el template
  formatCurrency(amount: number): string {
    return this.purchasesApi.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.purchasesApi.formatDate(dateString);
  }

  getStatusBadgeClass(status: PurchaseStatus): string {
    return PurchaseStatusConfig[status]?.color || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: PurchaseStatus): string {
    return PurchaseStatusConfig[status]?.label || status;
  }

  // Estadísticas calculadas
  get totalPurchasesCount(): number {
    return this.purchases.length;
  }

  get activePurchasesCount(): number {
    return this.purchases.filter(p =>
      p.status === PurchaseStatus.PENDIENTE ||
      p.status === PurchaseStatus.AUTORIZADO ||
      p.status === PurchaseStatus.COMPLETADO
    ).length;
  }

  get inactivePurchasesCount(): number {
    return this.purchases.filter(p => p.status === PurchaseStatus.CANCELADO).length;
  }

  get pendingPurchasesCount(): number {
    return this.purchases.filter(p => p.status === PurchaseStatus.PENDIENTE).length;
  }

  get authorizedPurchasesCount(): number {
    return this.purchases.filter(p => p.status === PurchaseStatus.AUTORIZADO).length;
  }

  get completedPurchasesCount(): number {
    return this.purchases.filter(p => p.status === PurchaseStatus.COMPLETADO).length;
  }

  get cancelledPurchasesCount(): number {
    return this.purchases.filter(p => p.status === PurchaseStatus.CANCELADO).length;
  }

  get totalAmountSum(): number {
    return this.purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  }

  // Acciones

  editPurchase(purchase: Purchase): void {
    this.openEditStatusModal(purchase);
  }

  changePurchaseStatus(purchase: Purchase, newStatus: PurchaseStatus): void {
    console.log('Cambiar estado de compra:', purchase, newStatus);
    // Cambio de estado se implementará posteriormente
  }

  deletePurchase(purchase: Purchase): void {
    console.log('Eliminar compra:', purchase);
    // Eliminación de compra se implementará posteriormente
  }

  // Modal methods
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onPurchaseCreated(): void {
    this.loadPurchases();
    this.closeCreateModal();
  }

  // Edit Status Modal methods
  openEditStatusModal(purchase: Purchase): void {
    this.selectedPurchaseForEdit = purchase;
    this.showEditStatusModal = true;
  }

  closeEditStatusModal(): void {
    this.showEditStatusModal = false;
    this.selectedPurchaseForEdit = null;
  }

  onPurchaseStatusUpdated(): void {
    this.loadPurchases();
    this.closeEditStatusModal();
  }

  // Details Modal methods
  openDetailsModal(purchase: Purchase): void {
    this.selectedPurchaseForDetails = purchase;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedPurchaseForDetails = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const statusDropdown = target.closest('#status-dropdown') || target.closest('[id^="status-dropdown"]');
    const priceDropdown = target.closest('#price-dropdown') || target.closest('[id^="price-dropdown"]');

    if (!statusDropdown) {
      this.showStatusDropdown = false;
    }

    if (!priceDropdown) {
      this.showPriceDropdown = false;
    }
  }

  // ==================== GENERACIÓN DE REPORTES ====================

  /**
   * Genera un reporte PDF de las compras filtradas
   */
  generatePurchaseReport(): void {
    const purchasesToReport = this.filteredPurchases.length > 0 ? this.filteredPurchases : this.purchases;

    if (purchasesToReport.length === 0) {
      this.notificationService.warning(
        'Sin datos',
        'No hay compras para generar el reporte'
      );
      return;
    }

    // Obtener organizationId del usuario actual
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      console.warn('⚠️ No se encontró organizationId, generando reporte sin logo');
      this.generateReportWithoutOrganization(purchasesToReport);
      return;
    }

    // Obtener información de la organización incluyendo el logo
    console.log('🏢 Obteniendo información de la organización:', organizationId);
    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const orgData = response.data;
          console.log('📄 Generando reporte de compras con logo...');
          console.log('   - Total de compras:', purchasesToReport.length);
          console.log('   - Organización:', orgData.organizationName);
          console.log('   - Logo:', orgData.logo ? 'Disponible' : 'No disponible');

          this.reportService.generatePurchaseReport(
            purchasesToReport,
            orgData.organizationName,
            orgData.logo,
            orgData.phone
          ).then(() => {
            this.notificationService.success(
              'Reporte generado',
              'El reporte PDF se ha descargado exitosamente'
            );
          }).catch((error) => {
            console.error('Error al generar reporte:', error);
            this.notificationService.error(
              'Error al generar reporte',
              'Ocurrió un error al generar el reporte PDF'
            );
          });
        } else {
          console.warn('⚠️ No se pudo obtener información de la organización');
          this.generateReportWithoutOrganization(purchasesToReport);
        }
      },
      error: (error) => {
        console.error('❌ Error obteniendo información de la organización:', error);
        this.generateReportWithoutOrganization(purchasesToReport);
      }
    });
  }

  /**
   * Genera reporte sin información de organización (fallback)
   */
  private generateReportWithoutOrganization(purchases: Purchase[]): void {
    console.log('📄 Generando reporte de compras sin logo...');

    this.reportService.generatePurchaseReport(
      purchases,
      'Sistema JASS',
      undefined,
      undefined
    ).then(() => {
      this.notificationService.success(
        'Reporte generado',
        'El reporte PDF se ha descargado exitosamente'
      );
    }).catch((error) => {
      console.error('Error al generar reporte:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'Ocurrió un error al generar el reporte PDF'
      );
    });
  }

  /**
   * 🆕 Genera un reporte PDF detallado de una compra individual
   */
  async generatePurchaseDetailReport(purchase: Purchase): Promise<void> {
    // Obtener organizationId del usuario actual
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      console.warn('⚠️ No se encontró organizationId');
      // Generar sin logo
      await this.generateDetailReportWithoutOrganization(purchase);
      return;
    }

    try {
      // Obtener información de la organización incluyendo el logo
      console.log('🏢 Obteniendo información de la organización:', organizationId);
      const response = await this.organizationApi.getOrganizationById(organizationId).toPromise();

      if (response?.status && response.data) {
        const orgData = response.data;
        console.log('📄 Generando reporte detallado de compra con logo...');
        console.log('   - Código de compra:', purchase.purchaseCode);
        console.log('   - Organización:', orgData.organizationName);
        console.log('   - Logo:', orgData.logo ? 'Disponible' : 'No disponible');

        await this.reportService.generatePurchaseDetailReport(
          purchase,
          orgData.organizationName,
          orgData.logo,
          orgData.phone
        );

        this.notificationService.success(
          'Reporte generado',
          'El reporte detallado de la compra se ha descargado exitosamente'
        );
      } else {
        console.warn('⚠️ No se pudo obtener información de la organización');
        await this.generateDetailReportWithoutOrganization(purchase);
      }
    } catch (error) {
      console.error('❌ Error obteniendo información de la organización:', error);
      await this.generateDetailReportWithoutOrganization(purchase);
    }
  }

  /**
   * Genera reporte detallado sin información de organización (fallback)
   */
  private async generateDetailReportWithoutOrganization(purchase: Purchase): Promise<void> {
    console.log('📄 Generando reporte detallado de compra sin logo...');

    try {
      await this.reportService.generatePurchaseDetailReport(
        purchase,
        'Sistema JASS',
        undefined,
        undefined
      );

      this.notificationService.success(
        'Reporte generado',
        'El reporte detallado de la compra se ha descargado exitosamente'
      );
    } catch (error) {
      console.error('Error al generar reporte detallado:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'Ocurrió un error al generar el reporte detallado de la compra'
      );
    }
  }
}
