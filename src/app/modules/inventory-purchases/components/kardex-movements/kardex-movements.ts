import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { InventoryMovementApiService } from '../../services/inventory-movement-api.service';
import { InventoryReportService } from '../../services/report.service';
import { OrganizationApiService } from '../../services/organization-api.service';
import {
  InventoryMovement,
  EnrichedInventoryMovement,
  MovementType,
  MovementReason,
  MovementTypeConfig,
  MovementReasonConfig,
  InventoryMovementFilters,
  InventoryMovementStats
} from '../../models/inventory-movement.model';

@Component({
  selector: 'app-kardex-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb],
  templateUrl: './kardex-movements.html',
  styleUrl: './kardex-movements.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class KardexMovements implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly movementsApi = inject(InventoryMovementApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(InventoryReportService);
  private readonly organizationApi = inject(OrganizationApiService);

  // Referencias para el template
  readonly MovementType = MovementType;
  readonly MovementReason = MovementReason;
  readonly MovementTypeConfig = MovementTypeConfig;
  readonly MovementReasonConfig = MovementReasonConfig;
  readonly Math = Math;

  // Estado del componente
  movements: InventoryMovement[] = [];
  enrichedMovements: EnrichedInventoryMovement[] = [];
  filteredMovements: EnrichedInventoryMovement[] = [];
  paginatedMovements: EnrichedInventoryMovement[] = [];
  loading = false;
  error: string | null = null;

  // Estadísticas
  stats: InventoryMovementStats = {
    totalMovements: 0,
    totalEntries: 0,
    totalExits: 0,
    totalValue: 0,
    averageValue: 0,
    recentMovements: 0
  };

  // Filtros
  filters: InventoryMovementFilters = {
    organizationId: '',
    searchTerm: '',
    movementType: undefined,
    movementReason: undefined,
    dateFrom: '',
    dateTo: ''
  };

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // UI State
  showFilters = false;
  showMovementTypeDropdown = false;
  showMovementReasonDropdown = false;
  sortField = 'movementDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Modal de detalles
  showDetailsModal = false;
  selectedMovement: EnrichedInventoryMovement | null = null;

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
      label: 'Kardex / Movimientos',
      icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
    }
  ];

  ngOnInit(): void {
    this.initializeFilters();
    this.loadMovements();
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

  loadMovements(): void {
    if (!this.filters.organizationId) {
      this.error = 'No se pudo obtener la organización del usuario';
      return;
    }

    this.loading = true;
    this.error = null;

    this.movementsApi.getMovementsByOrganization(this.filters.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movements) => {
          console.log('🎉 Movimientos recibidos del backend ENRIQUECIDO:', movements.length);
          if (movements.length > 0) {
            console.log('📦 Primer movimiento:', movements[0]);
            console.log('   ✅ Producto:', (movements[0] as any).productInfo?.productName);
            console.log('   ✅ Usuario:', (movements[0] as any).userInfo?.fullName);
            console.log('   ✅ Categoría:', (movements[0] as any).productInfo?.categoryName);
          }

          this.movements = movements;
          // Los movimientos ya vienen completamente enriquecidos del backend ✨
          this.enrichedMovements = movements as any;
          this.stats = this.movementsApi.calculateStats(movements);
          this.applyFilters();
          this.loading = false;

          console.log('✅ Datos listos para mostrar en el template');
        },
        error: (error) => {
          this.error = 'Error al cargar los movimientos de inventario';
          this.loading = false;
          console.error('❌ Error loading movements:', error);
          this.notificationService.error('Error', 'Error al cargar los movimientos de inventario');
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.enrichedMovements];

    // Filtro por término de búsqueda
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(movement =>
        movement.productInfo.productName.toLowerCase().includes(searchTerm) ||
        movement.productInfo.productCode.toLowerCase().includes(searchTerm) ||
        movement.movementId.toLowerCase().includes(searchTerm) ||
        (movement.referenceDocument && movement.referenceDocument.toLowerCase().includes(searchTerm)) ||
        movement.userInfo.fullName.toLowerCase().includes(searchTerm) ||
        (movement.observations && movement.observations.toLowerCase().includes(searchTerm))
      );
    }

    // Filtro por tipo de movimiento
    if (this.filters.movementType) {
      filtered = filtered.filter(movement => movement.movementType === this.filters.movementType);
    }

    // Filtro por razón de movimiento
    if (this.filters.movementReason) {
      filtered = filtered.filter(movement => movement.movementReason === this.filters.movementReason);
    }

    // Filtro por fecha desde
    if (this.filters.dateFrom) {
      filtered = filtered.filter(movement =>
        new Date(movement.movementDate) >= new Date(this.filters.dateFrom!)
      );
    }

    // Filtro por fecha hasta
    if (this.filters.dateTo) {
      filtered = filtered.filter(movement =>
        new Date(movement.movementDate) <= new Date(this.filters.dateTo!)
      );
    }

    // Ordenar por fecha (más recientes primero por defecto)
    filtered.sort((a, b) =>
      new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );

    this.filteredMovements = filtered;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredMovements.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMovements = this.filteredMovements.slice(startIndex, endIndex);
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
    this.filters.movementType = undefined;
    this.filters.movementReason = undefined;
    this.filters.dateFrom = '';
    this.filters.dateTo = '';
    this.onFiltersChange();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleMovementTypeDropdown(): void {
    this.showMovementTypeDropdown = !this.showMovementTypeDropdown;
    if (this.showMovementTypeDropdown) {
      this.showMovementReasonDropdown = false;
    }
  }

  toggleMovementReasonDropdown(): void {
    this.showMovementReasonDropdown = !this.showMovementReasonDropdown;
    if (this.showMovementReasonDropdown) {
      this.showMovementTypeDropdown = false;
    }
  }

  selectMovementType(type: MovementType | undefined): void {
    this.filters.movementType = type;
    this.showMovementTypeDropdown = false;
    this.onFiltersChange();
  }

  selectMovementReason(reason: MovementReason | undefined): void {
    this.filters.movementReason = reason;
    this.showMovementReasonDropdown = false;
    this.onFiltersChange();
  }

  getSelectedMovementTypeLabel(): string {
    if (!this.filters.movementType) return 'Todos los tipos';
    return MovementTypeConfig[this.filters.movementType]?.label || this.filters.movementType;
  }

  getSelectedMovementReasonLabel(): string {
    if (!this.filters.movementReason) return 'Todas las razones';
    return MovementReasonConfig[this.filters.movementReason]?.label || this.filters.movementReason;
  }

  // Funciones utilitarias para el template
  formatCurrency(amount: number): string {
    return this.movementsApi.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.movementsApi.formatDate(dateString);
  }

  formatDateOnly(dateString: string): string {
    return this.movementsApi.formatDateOnly(dateString);
  }

  getMovementTypeBadgeClass(type: MovementType): string {
    return MovementTypeConfig[type]?.color || 'bg-gray-100 text-gray-800';
  }

  getMovementReasonBadgeClass(reason: MovementReason): string {
    return MovementReasonConfig[reason]?.color || 'bg-gray-100 text-gray-800';
  }

  getMovementTypeLabel(type: MovementType): string {
    return MovementTypeConfig[type]?.label || type;
  }

  getMovementReasonLabel(reason: MovementReason): string {
    return MovementReasonConfig[reason]?.label || reason;
  }

  // Estadísticas calculadas
  get showingCount(): number {
    return this.paginatedMovements.length;
  }

  get totalMovementsCount(): number {
    return this.filteredMovements.length;
  }

  // Acciones
  exportMovements(): void {
    this.movementsApi.exportToCSV(this.filteredMovements, 'kardex-movimientos');
    this.notificationService.success('Éxito', 'Movimientos exportados exitosamente');
  }

  refreshMovements(): void {
    this.loadMovements();
  }

  viewMovementDetails(movement: EnrichedInventoryMovement): void {
    console.log('🔍 Abriendo detalles del movimiento:', movement);
    this.selectedMovement = movement;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    setTimeout(() => {
      this.selectedMovement = null;
    }, 300); // Esperar a que termine la animación
  }

  // Función para trackBy en ngFor
  trackMovement(index: number, movement: EnrichedInventoryMovement): string {
    return movement.movementId;
  }

  // Generar números de página para la paginación
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = Math.min(5, this.totalPages);
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const typeDropdown = target.closest('#movement-type-dropdown') || target.closest('[id^="movement-type-dropdown"]');
    const reasonDropdown = target.closest('#movement-reason-dropdown') || target.closest('[id^="movement-reason-dropdown"]');

    if (!typeDropdown) {
      this.showMovementTypeDropdown = false;
    }

    if (!reasonDropdown) {
      this.showMovementReasonDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showDetailsModal) {
      this.closeDetailsModal();
    }
    if (this.showOutputModal) {
      this.closeOutputModal();
    }
  }

  // ==================== MODAL DE SALIDA ====================
  showOutputModal = false;
  isSubmitting = false;
  quantityError = '';

  // Lista de productos para búsqueda
  allProducts: any[] = [];
  filteredProducts: any[] = [];

  // Formulario de salida
  outputForm = {
    productSearch: '',
    selectedProduct: null as any,
    quantity: 0,
    unitCost: 0,
    movementReason: 'USO_INTERNO',
    referenceDocument: '',
    observations: '',
    totalValue: '0.00'
  };

  openOutputModal(): void {
    this.showOutputModal = true;
    this.resetOutputForm();
    this.loadProductsForOutput();
  }

  closeOutputModal(): void {
    this.showOutputModal = false;
    setTimeout(() => {
      this.resetOutputForm();
    }, 300);
  }

  resetOutputForm(): void {
    this.outputForm = {
      productSearch: '',
      selectedProduct: null,
      quantity: 0,
      unitCost: 0,
      movementReason: 'USO_INTERNO',
      referenceDocument: '',
      observations: '',
      totalValue: '0.00'
    };
    this.quantityError = '';
    this.filteredProducts = [];
  }

  // Cargar productos para el buscador
  loadProductsForOutput(): void {
    const organizationId = this.authService.getCurrentUser()?.organizationId;
    if (!organizationId) {
      this.notificationService.error('Error', 'No se pudo obtener la organización actual');
      return;
    }

    // Obtenemos los productos únicos de los movimientos actuales
    const productMap = new Map();
    this.enrichedMovements.forEach(movement => {
      if (!productMap.has(movement.productInfo.productId)) {
        productMap.set(movement.productInfo.productId, {
          productId: movement.productInfo.productId,
          productName: movement.productInfo.productName,
          productCode: movement.productInfo.productCode,
          categoryName: movement.productInfo.categoryName,
          unitOfMeasure: movement.productInfo.unitOfMeasure,
          currentStock: movement.productInfo.currentStock,
          unitCost: movement.productInfo.unitCost
        });
      }
    });

    this.allProducts = Array.from(productMap.values());
  }

  // Buscar productos mientras escribe
  searchProducts(): void {
    const searchTerm = this.outputForm.productSearch.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredProducts = [];
      return;
    }

    this.filteredProducts = this.allProducts.filter(product =>
      product.productName.toLowerCase().includes(searchTerm) ||
      product.productCode.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limitar a 10 resultados
  }

  // Seleccionar producto del dropdown
  selectProduct(product: any): void {
    this.outputForm.selectedProduct = product;
    this.outputForm.productSearch = product.productName;
    this.outputForm.unitCost = product.unitCost || 0;
    this.filteredProducts = [];
    this.calculateTotal();
  }

  // Limpiar selección de producto
  clearProductSelection(): void {
    this.outputForm.selectedProduct = null;
    this.outputForm.productSearch = '';
    this.outputForm.quantity = 0;
    this.outputForm.unitCost = 0;
    this.quantityError = '';
    this.calculateTotal();
  }

  // Validar cantidad
  validateQuantity(): void {
    this.quantityError = '';

    if (!this.outputForm.selectedProduct) {
      this.quantityError = 'Primero selecciona un producto';
      return;
    }

    const quantity = Number(this.outputForm.quantity);
    const currentStock = this.outputForm.selectedProduct.currentStock;

    if (!quantity || quantity <= 0) {
      this.quantityError = 'La cantidad debe ser mayor a 0';
      return;
    }

    if (!Number.isInteger(quantity)) {
      this.quantityError = 'La cantidad debe ser un número entero';
      return;
    }

    if (quantity > currentStock) {
      this.quantityError = `Cantidad superior al stock disponible (${currentStock})`;
      return;
    }

    this.calculateTotal();
  }

  // Calcular total
  calculateTotal(): void {
    if (this.outputForm.quantity && this.outputForm.unitCost) {
      const total = this.outputForm.quantity * this.outputForm.unitCost;
      this.outputForm.totalValue = total.toFixed(2);
    } else {
      this.outputForm.totalValue = '0.00';
    }
  }

  // Calcular nuevo stock
  calculateNewStock(): number {
    if (!this.outputForm.selectedProduct) return 0;
    const currentStock = this.outputForm.selectedProduct.currentStock || 0;
    const quantity = this.outputForm.quantity || 0;
    return Math.max(0, currentStock - quantity);
  }

  // Validar formulario completo
  isOutputFormValid(): boolean {
    return !!(
      this.outputForm.selectedProduct &&
      this.outputForm.quantity > 0 &&
      this.outputForm.unitCost > 0 &&
      this.outputForm.movementReason &&
      !this.quantityError
    );
  }

  // Enviar formulario de salida
  submitOutput(): void {
    if (!this.isOutputFormValid() || this.isSubmitting) {
      return;
    }

    this.validateQuantity();
    if (this.quantityError) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId || !currentUser?.userId) {
      this.notificationService.error('Error', 'No se pudo obtener la información del usuario u organización');
      return;
    }

    const currentStock = this.outputForm.selectedProduct.currentStock;
    const newStock = this.calculateNewStock();

    const payload = {
      organizationId: currentUser.organizationId,
      productId: this.outputForm.selectedProduct.productId,
      quantity: this.outputForm.quantity,
      unitCost: this.outputForm.unitCost,
      movementReason: this.outputForm.movementReason,
      userId: currentUser.userId,
      referenceDocument: this.outputForm.referenceDocument || '',
      referenceId: '',
      observations: this.outputForm.observations || '',
      previousStock: currentStock,
      newStock: newStock
    };

    this.isSubmitting = true;

    this.movementsApi.registerConsumption(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Éxito', 'Salida registrada exitosamente');
          this.closeOutputModal();
          this.loadMovements(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error al registrar salida:', error);
          this.notificationService.error(
            'Error',
            error?.error?.message || 'Error al registrar la salida'
          );
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
  }

  // ==================== EXPORTACIÓN DE REPORTES ====================

  /**
   * Exporta los movimientos filtrados a formato Excel (XLSX)
   */
  exportToExcel(): void {
    // Mostrar notificación de inicio
    this.notificationService.success('Exportando', 'Generando archivo Excel...');

    // Importar librería dinámicamente
    import('xlsx').then(XLSX => {
      // Preparar datos para exportación
      const exportData = this.filteredMovements.map(movement => ({
        'Fecha': this.formatDateOnly(movement.movementDate),
        'Hora': this.formatDate(movement.movementDate).split(',')[1]?.trim() || '',
        'Tipo': this.getMovementTypeLabel(movement.movementType),
        'Razón': this.getMovementReasonLabel(movement.movementReason),
        'Código Producto': movement.productInfo.productCode,
        'Producto': movement.productInfo.productName,
        'Categoría': movement.productInfo.categoryName,
        'Cantidad': movement.quantity,
        'Unidad': movement.productInfo.unit,
        'Costo Unitario': movement.unitCost,
        'Valor Total': movement.quantity * movement.unitCost,
        'Stock Anterior': movement.previousStock,
        'Stock Nuevo': movement.newStock,
        'Referencia': movement.referenceDocument || '',
        'Usuario': movement.userInfo.fullName,
        'Código Usuario': movement.userInfo.userCode,
        'Email': movement.userInfo.email,
        'Observaciones': movement.observations || ''
      }));

      // Crear libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos Kardex');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 12 }, // Tipo
        { wch: 15 }, // Razón
        { wch: 15 }, // Código Producto
        { wch: 30 }, // Producto
        { wch: 20 }, // Categoría
        { wch: 10 }, // Cantidad
        { wch: 10 }, // Unidad
        { wch: 12 }, // Costo Unitario
        { wch: 12 }, // Valor Total
        { wch: 12 }, // Stock Anterior
        { wch: 12 }, // Stock Nuevo
        { wch: 15 }, // Referencia
        { wch: 25 }, // Usuario
        { wch: 15 }, // Código Usuario
        { wch: 30 }, // Email
        { wch: 40 }  // Observaciones
      ];
      worksheet['!cols'] = colWidths;

      // Generar nombre de archivo con fecha
      const fileName = `Kardex_Movimientos_${this.formatDateForFileName()}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(workbook, fileName);

      this.notificationService.success('Éxito', `Archivo ${fileName} descargado correctamente`);
    }).catch(error => {
      console.error('Error al exportar a Excel:', error);
      this.notificationService.error('Error', 'No se pudo generar el archivo Excel');
    });
  }

  /**
   * Exporta los movimientos filtrados a formato PDF
   */
  async exportToPDF(): Promise<void> {
    this.notificationService.success('Exportando', 'Generando archivo PDF...');

    try {
      // Importar jsPDF y autoTable
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      // Crear instancia del documento
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Título del documento
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55); // gray-800
      doc.text('Reporte de Movimientos de Kárdex', 14, 15);

      // Información adicional
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-PE')}`, 14, 22);
      doc.text(`Total de movimientos: ${this.filteredMovements.length}`, 14, 27);

      // Estadísticas resumidas
      doc.text(`Total Entradas: ${this.stats.totalEntries} | Total Salidas: ${this.stats.totalExits}`, 14, 32);

      // Preparar datos para la tabla
      const tableData = this.filteredMovements.map(movement => [
        this.formatDateOnly(movement.movementDate),
        this.getMovementTypeLabel(movement.movementType),
        this.getMovementReasonLabel(movement.movementReason),
        movement.productInfo.productCode,
        movement.productInfo.productName,
        movement.quantity,
        `S/ ${movement.unitCost.toFixed(2)}`,
        `S/ ${(movement.quantity * movement.unitCost).toFixed(2)}`,
        movement.previousStock,
        movement.newStock,
        movement.userInfo.fullName
      ]);

      // Generar tabla usando autoTable
      autoTable(doc, {
        startY: 38,
        head: [[
          'Fecha',
          'Tipo',
          'Razón',
          'Código',
          'Producto',
          'Cant.',
          'C. Unit.',
          'Total',
          'Stock Ant.',
          'Stock Nuevo',
          'Usuario'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235], // blue-600
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [31, 41, 55] // gray-800
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // gray-50
        },
        columnStyles: {
          0: { cellWidth: 22 }, // Fecha
          1: { cellWidth: 20 }, // Tipo
          2: { cellWidth: 25 }, // Razón
          3: { cellWidth: 20 }, // Código
          4: { cellWidth: 45 }, // Producto
          5: { cellWidth: 15, halign: 'center' }, // Cantidad
          6: { cellWidth: 20, halign: 'right' }, // C. Unit.
          7: { cellWidth: 20, halign: 'right' }, // Total
          8: { cellWidth: 18, halign: 'center' }, // Stock Ant.
          9: { cellWidth: 20, halign: 'center' }, // Stock Nuevo
          10: { cellWidth: 35 } // Usuario
        },
        margin: { top: 38, left: 14, right: 14 }
      });

      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(
          `Página ${i} de ${pageCount}`,
          (doc as any).internal.pageSize.getWidth() / 2,
          (doc as any).internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Generar nombre de archivo
      const fileName = `Kardex_Movimientos_${this.formatDateForFileName()}.pdf`;

      // Descargar PDF
      doc.save(fileName);

      this.notificationService.success('Éxito', `Archivo ${fileName} descargado correctamente`);
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      this.notificationService.error('Error', 'No se pudo generar el archivo PDF');
    }
  }

  /**
   * Formatea la fecha actual para nombres de archivo
   */
  private formatDateForFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  /**
   * 🆕 Genera un reporte PDF del Kardex usando el servicio optimizado
   */
  async generateKardexReport(): Promise<void> {
    // Obtener organización del usuario actual
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.organizationId) {
      this.notificationService.warning('Sin datos', 'No se pudo obtener la organización del usuario');
      return;
    }

    // Usar los movimientos filtrados actuales
    const movementsToReport = this.filteredMovements.length > 0 ? this.filteredMovements : this.enrichedMovements;

    if (movementsToReport.length === 0) {
      this.notificationService.warning('Sin datos', 'No hay movimientos para generar el reporte');
      return;
    }

    try {
      // Obtener información de la organización
      const orgResponse = await this.organizationApi.getOrganizationById(currentUser.organizationId).toPromise();

      const organizationName = orgResponse?.data?.organizationName || 'Sistema JASS';
      const organizationLogo = orgResponse?.data?.logo;
      const organizationPhone = orgResponse?.data?.phone;

      // Obtener información del primer movimiento para datos del producto
      const firstMovement = movementsToReport[0] as any;
      const productName = firstMovement.productInfo?.productName || firstMovement.productName || 'Producto';
      const productCode = firstMovement.productInfo?.productCode || firstMovement.productCode || 'N/A';

      console.log('📄 Generando reporte de Kardex...');
      console.log('   - Total de movimientos:', movementsToReport.length);
      console.log('   - Producto:', productName);
      console.log('   - Código:', productCode);
      console.log('   - Organización:', organizationName);

      // Generar el reporte usando el servicio optimizado
      await this.reportService.generateKardexReport(
        productName,
        productCode,
        movementsToReport,
        organizationName,
        organizationLogo,
        organizationPhone
      );

      this.notificationService.success(
        'Reporte generado',
        'El reporte de Kardex se ha descargado exitosamente'
      );
    } catch (error) {
      console.error('Error al generar reporte de Kardex:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'Ocurrió un error al generar el reporte de Kardex'
      );
    }
  }

  /**
   * 🆕 Genera un reporte PDF detallado de un movimiento individual
   */
  async generateMovementDetailReport(movement: any): Promise<void> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.organizationId) {
      this.notificationService.warning('Sin datos', 'No se pudo obtener la organización del usuario');
      return;
    }

    try {
      // Obtener información de la organización
      const orgResponse = await this.organizationApi.getOrganizationById(currentUser.organizationId).toPromise();

      const organizationName = orgResponse?.data?.organizationName || 'Sistema JASS';
      const organizationLogo = orgResponse?.data?.logo;
      const organizationPhone = orgResponse?.data?.phone;

      console.log('📄 Generando reporte de movimiento individual...');
      console.log('   - Código movimiento:', movement.movementCode);
      console.log('   - Producto:', movement.productInfo?.productName);
      console.log('   - Tipo:', movement.movementType);
      console.log('   - Cantidad:', movement.quantity);

      // Generar el reporte usando el servicio
      await this.reportService.generateMovementDetailReport(
        movement,
        organizationName,
        organizationLogo,
        organizationPhone
      );

      this.notificationService.success(
        'Reporte generado',
        'El detalle del movimiento se ha descargado exitosamente'
      );
    } catch (error) {
      console.error('Error al generar reporte de movimiento:', error);
      this.notificationService.error(
        'Error al generar reporte',
        'Ocurrió un error al generar el reporte del movimiento'
      );
    }
  }

  /**
   * Genera un reporte del movimiento sin datos de organización (fallback)
   */
  private async generateMovementReportWithoutOrganization(movement: any): Promise<void> {
    console.log('⚠️ Generando reporte sin datos de organización...');

    await this.reportService.generateMovementDetailReport(
      movement,
      'Sistema JASS',
      undefined,
      undefined
    );

    this.notificationService.success(
      'Reporte generado',
      'El detalle del movimiento se ha descargado exitosamente'
    );
  }
}
