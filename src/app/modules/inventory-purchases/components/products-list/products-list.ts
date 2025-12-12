import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';

import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { InventoryApi } from '../../services/inventory-api';
import { AuthService } from '../../../../core/auth/services/auth';
import { Product, ProductStatus, ProductFilters, ProductRequest } from '../../models/product.model';
import { ConfirmationModal, ConfirmationData } from '../confirmation-modal/confirmation-modal';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CategoryApiService, Category } from '../../services/category-api.service';
import { InventoryReportService } from '../../services/report.service';
import { OrganizationApiService } from '../../services/organization-api.service';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Breadcrumb, ConfirmationModal],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ],
  templateUrl: './products-list.html',
  styleUrl: './products-list.css'
})
export class ProductsList implements OnInit, OnDestroy {

  private readonly inventoryApi = inject(InventoryApi);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly categoryApiService = inject(CategoryApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly reportService = inject(InventoryReportService);
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly destroy$ = new Subject<void>();

  // Para acceso desde template
  protected readonly Math = Math;

  // Estados
  loading = true;
  error: string | null = null;

  // Datos
  products: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];

  // Filtros
  filters: ProductFilters = {
    organizationId: '',
    searchTerm: '',
    status: undefined,
    categoryId: undefined
  };

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalItems = 0;

  // UI State
  statusDropdownOpen = false;

  // Modal de crear producto
  isCreateModalOpen = false;
  isSaving = false;
  isLoadingCategories = false;
  availableCategories: Category[] = [];

  // Formulario de creación
  createForm!: FormGroup;

  // Modal de editar producto
  isEditModalOpen = false;
  isUpdating = false;
  selectedProductForEdit: Product | null = null;

  // Formulario de edición
  editForm!: FormGroup;

  // Unidades de medida disponibles
  unitOfMeasureOptions = [
    { value: 'UNIDAD', label: 'Unidad' },
    { value: 'KILOGRAMO', label: 'Kilogramo' },
    { value: 'GRAMO', label: 'Gramo' },
    { value: 'LITRO', label: 'Litro' },
    { value: 'MILILITRO', label: 'Mililitro' },
    { value: 'METRO', label: 'Metro' },
    { value: 'CENTIMETRO', label: 'Centímetro' },
    { value: 'CAJA', label: 'Caja' },
    { value: 'PAQUETE', label: 'Paquete' },
    { value: 'ROLLO', label: 'Rollo' }
  ];

  // Enums para el template
  ProductStatus = ProductStatus;

  // Opciones de filtro
  statusOptions = [
    { value: undefined, label: 'Todos los productos' },
    { value: ProductStatus.ACTIVO, label: 'Solo activos' },
    { value: ProductStatus.INACTIVO, label: 'Solo inactivos' },
    { value: ProductStatus.DESCONTINUADO, label: 'Solo descontinuados' }
  ];

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Inventario y Compras',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      label: 'Productos',
      icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2'
    }
  ];

  ngOnInit(): void {
    this.initializeCreateForm();
    this.initializeEditForm();
    this.initializeFilters();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilters(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('=== DEBUG AUTH ===');
    console.log('Current user:', currentUser);

    const organizationId = currentUser?.organizationId;
    if (!organizationId) {
      console.error('No organization ID found');
      this.error = 'No se pudo obtener el ID de la organización';
      this.loading = false;
      return;
    }

    console.log('Organization ID:', organizationId);
    this.filters.organizationId = organizationId;
  }

  loadProducts(): void {
    this.loading = true;
    this.error = null;

    this.inventoryApi.getProducts(this.filters.organizationId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (products) => {
          console.log('=== DEBUG PRODUCTS LIST ===');
          console.log('Products received:', products);
          console.log('Organization ID:', this.filters.organizationId);

          this.products = products;
          this.products.sort((a, b) => a.productCode.localeCompare(b.productCode));
          this.applyFilters();

          console.log('Filtered products:', this.filteredProducts);
        },
        error: (error) => {
          console.error('Error cargando productos:', error);
          this.error = 'Error al cargar los productos. Por favor, inténtalo de nuevo.';
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.products];

    // Filtro por término de búsqueda
    if (this.filters.searchTerm) {
      const term = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.productName.toLowerCase().includes(term) ||
        p.productCode.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (this.filters.status) {
      filtered = filtered.filter(p => p.status === this.filters.status);
    }

    // Ordenar por código de producto de forma ascendente
    filtered.sort((a, b) => a.productCode.localeCompare(b.productCode));

    this.filteredProducts = filtered;
    this.currentPage = 1; // Reset a primera página cuando se aplican filtros
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalItems = this.filteredProducts.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

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

  getPaginationArray(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(status: ProductStatus | undefined): void {
    this.filters.status = status;
    this.statusDropdownOpen = false;
    this.applyFilters();
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen = !this.statusDropdownOpen;
  }

  clearFilters(): void {
    this.filters.searchTerm = '';
    this.filters.status = undefined;
    this.statusDropdownOpen = false;
    this.applyFilters();
  }

  getCurrentStatusLabel(): string {
    const option = this.statusOptions.find(opt => opt.value === this.filters.status);
    return option ? option.label : 'Todos los productos';
  }



  deleteProduct(product: Product): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto "${product.productName}"?`)) {
      this.inventoryApi.deleteProduct(product.productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
          }
        });
    }
  }

  getStockStatusClass(product: Product): string {
    const percentage = (product.currentStock / product.maximumStock) * 100;
    if (product.currentStock === 0) return 'text-red-600 bg-red-50';
    if (product.currentStock <= product.minimumStock) return 'text-orange-600 bg-orange-50';
    if (percentage <= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }

  getStockStatusText(product: Product): string {
    if (product.currentStock === 0) return 'Sin Stock';
    if (product.currentStock <= product.minimumStock) return 'Stock Bajo';
    return 'Stock Normal';
  }

  getStatusClass(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.ACTIVO:
        return 'text-green-600 bg-green-50';
      case ProductStatus.INACTIVO:
        return 'text-gray-600 bg-gray-50';
      case ProductStatus.DESCONTINUADO:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  }

  trackByProductId(index: number, product: Product): string {
    return product.productId;
  }

  get activeProductsCount(): number {
    return this.products.filter(p => p.status === ProductStatus.ACTIVO).length;
  }

  get lowStockCount(): number {
    return this.products.filter(p => p.currentStock <= p.minimumStock).length;
  }

  // Modal state
  showProductModal = false;
  selectedProduct: Product | null = null;

  // Confirmation modal state
  isConfirmationModalOpen: boolean = false;
  confirmationData: ConfirmationData = {
    title: 'Confirmar acción',
    message: '¿Está seguro de que desea continuar?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  pendingActionProduct: Product | null = null;
  pendingActionType: 'delete' | 'restore' | null = null;

  viewProductDetails(product: Product): void {
    this.selectedProduct = product;
    this.showProductModal = true;
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  /**
   * Preparar eliminación de producto (muestra modal de confirmación)
   */
  prepareDeleteProduct(product: Product): void {
    this.pendingActionProduct = product;
    this.pendingActionType = 'delete';

    this.confirmationData = {
      title: 'Eliminar Producto',
      message: '¿Está seguro de que desea eliminar este producto? Esta acción marcará el producto como inactivo.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      productName: product.productName,
      productCode: product.productCode
    };

    this.isConfirmationModalOpen = true;
    console.log('🗑️ [ProductsList] Preparando eliminación de producto:', product.productCode);
  }

  /**
   * Preparar restauración de producto (muestra modal de confirmación)
   */
  prepareRestoreProduct(product: Product): void {
    this.pendingActionProduct = product;
    this.pendingActionType = 'restore';

    this.confirmationData = {
      title: 'Restaurar Producto',
      message: '¿Está seguro de que desea restaurar este producto? El producto volverá a estar activo.',
      confirmText: 'Sí, Restaurar',
      cancelText: 'Cancelar',
      type: 'success',
      productName: product.productName,
      productCode: product.productCode
    };

    this.isConfirmationModalOpen = true;
    console.log('♻️ [ProductsList] Preparando restauración de producto:', product.productCode);
  }

  /**
   * Ejecutar la acción confirmada (eliminar o restaurar)
   */
  onConfirmAction(): void {
    if (!this.pendingActionProduct || !this.pendingActionType) {
      console.error('❌ [ProductsList] No hay acción pendiente');
      return;
    }

    const product = this.pendingActionProduct;
    const actionType = this.pendingActionType;

    // Limpiar estado del modal
    this.resetConfirmationModal();

    // Ejecutar la acción
    if (actionType === 'delete') {
      this.executeDeleteProduct(product);
    } else if (actionType === 'restore') {
      this.executeRestoreProduct(product);
    }
  }

  /**
   * Cancelar la acción de confirmación
   */
  onCancelAction(): void {
    console.log('🚫 [ProductsList] Acción cancelada por el usuario');
    this.resetConfirmationModal();
  }

  /**
   * Resetear el estado del modal de confirmación
   */
  private resetConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.pendingActionProduct = null;
    this.pendingActionType = null;
  }

  /**
   * Ejecutar eliminación del producto
   */
  private executeDeleteProduct(product: Product): void {
    this.loading = true;

    this.inventoryApi.deleteProduct(product.productId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          console.log('✅ [ProductsList] Producto eliminado exitosamente');

          this.notificationService.success(
            '¡Producto Eliminado!',
            `El producto ${product.productName} ha sido eliminado exitosamente`
          );

          this.loadProducts(); // Recargar la lista
        },
        error: (error) => {
          console.error('❌ [ProductsList] Error al eliminar producto:', error);

          this.notificationService.error(
            'Error al eliminar',
            'No se pudo eliminar el producto. Verifica tu conexión e inténtalo nuevamente.'
          );

          this.error = 'Error al eliminar el producto. Inténtalo de nuevo.';
        }
      });
  }

  /**
   * Ejecutar restauración del producto
   */
  private executeRestoreProduct(product: Product): void {
    this.loading = true;

    this.inventoryApi.restoreProduct(product.productId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (restoredProduct) => {
          console.log('✅ [ProductsList] Producto restaurado exitosamente:', restoredProduct);

          this.notificationService.success(
            '¡Producto Restaurado!',
            `El producto ${product.productName} ha sido restaurado exitosamente`
          );

          this.loadProducts(); // Recargar la lista
        },
        error: (error) => {
          console.error('❌ [ProductsList] Error al restaurar producto:', error);

          this.notificationService.error(
            'Error al restaurar',
            'No se pudo restaurar el producto. Verifica tu conexión e inténtalo nuevamente.'
          );

          this.error = 'Error al restaurar el producto. Inténtalo de nuevo.';
        }
      });
  }
  // =======================================
  // MÉTODOS DEL MODAL DE CREAR PRODUCTO
  // =======================================

  private initializeCreateForm(): void {
    this.createForm = this.formBuilder.group({
      productCode: ['', [Validators.required, Validators.minLength(3)]],
      productName: ['', [Validators.required, Validators.minLength(2)]],
      categoryId: ['', [Validators.required]],
      unitOfMeasure: ['UNIDAD', [Validators.required]],
      minimumStock: [0, [Validators.required, Validators.min(0)]],
      maximumStock: [0, [Validators.required, Validators.min(0)]],
      currentStock: [0, [Validators.required, Validators.min(0)]],
      unitCost: [0, [Validators.required, Validators.min(0.01)]]
    });

    // Validación personalizada para stock máximo
    this.createForm.get('maximumStock')?.valueChanges.subscribe(() => {
      this.validateStockRelationship();
    });

    this.createForm.get('minimumStock')?.valueChanges.subscribe(() => {
      this.validateStockRelationship();
    });

    this.createForm.get('currentStock')?.valueChanges.subscribe(() => {
      this.validateStockRelationship();
    });
  }

  private validateStockRelationship(): void {
    const minStock = this.createForm.get('minimumStock')?.value || 0;
    const maxStock = this.createForm.get('maximumStock')?.value || 0;
    const currentStock = this.createForm.get('currentStock')?.value || 0;

    // Validar que stock actual >= stock mínimo
    if (currentStock < minStock) {
      this.createForm.get('currentStock')?.setErrors({
        ...this.createForm.get('currentStock')?.errors,
        stockBelowMinimum: true
      });
    } else {
      const errors = this.createForm.get('currentStock')?.errors;
      if (errors) {
        delete errors['stockBelowMinimum'];
        if (Object.keys(errors).length === 0) {
          this.createForm.get('currentStock')?.setErrors(null);
        }
      }
    }

    // Validar que stock máximo >= stock mínimo
    if (maxStock > 0 && maxStock < minStock) {
      this.createForm.get('maximumStock')?.setErrors({
        ...this.createForm.get('maximumStock')?.errors,
        maxBelowMin: true
      });
    } else {
      const errors = this.createForm.get('maximumStock')?.errors;
      if (errors) {
        delete errors['maxBelowMin'];
        if (Object.keys(errors).length === 0) {
          this.createForm.get('maximumStock')?.setErrors(null);
        }
      }
    }
  }

  createNewProduct(): void {
    this.loadCategories();
    this.generateProductCode();
    this.openCreateModal();
  }

  private openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.createForm.reset({
      productCode: '',
      productName: '',
      categoryId: '',
      unitOfMeasure: 'UNIDAD',
      minimumStock: 0,
      maximumStock: 0,
      currentStock: 0,
      unitCost: 0
    });
    this.generateProductCode();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.createForm.reset();
  }

  private loadCategories(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      this.notificationService.error('Error', 'No se pudo obtener la organización');
      return;
    }

    this.isLoadingCategories = true;
    this.categoryApiService.getCategoriesByStatus(currentUser.organizationId, 'ACTIVO')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingCategories = false)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.availableCategories = response.data;
          } else {
            this.notificationService.error('Error', 'Error al cargar categorías');
          }
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.notificationService.error('Error', 'Error al cargar categorías');
        }
      });
  }

  private generateProductCode(): void {
    if (this.products.length === 0) {
      this.createForm.patchValue({ productCode: 'PROD001' });
      return;
    }

    // Buscar códigos que empiecen con PROD
    const productCodes = this.products
      .map(p => p.productCode)
      .filter(code => code.startsWith('PROD'))
      .map(code => {
        const match = code.match(/PROD(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    const nextNumber = productCodes.length > 0 ? Math.max(...productCodes) + 1 : 1;
    const newCode = `PROD${nextNumber.toString().padStart(3, '0')}`;

    this.createForm.patchValue({ productCode: newCode });
  }

  onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched(this.createForm);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      this.notificationService.error('Error', 'No se pudo obtener la organización');
      return;
    }

    this.isSaving = true;

    const formData = this.createForm.value;
    const productRequest: ProductRequest = {
      organizationId: currentUser.organizationId,
      productCode: formData.productCode,
      productName: formData.productName,
      categoryId: formData.categoryId,
      unitOfMeasure: formData.unitOfMeasure,
      minimumStock: formData.minimumStock,
      maximumStock: formData.maximumStock,
      currentStock: formData.currentStock,
      unitCost: formData.unitCost
    };

    this.inventoryApi.createProduct(productRequest)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving = false)
      )
      .subscribe({
        next: (product) => {
          this.notificationService.success('Éxito', 'Producto creado exitosamente');
          this.closeCreateModal();
          this.loadProducts(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error creating product:', error);
          if (error.error?.message) {
            this.notificationService.error('Error', error.error.message);
          } else {
            this.notificationService.error('Error', 'Error al crear el producto');
          }
        }
      });
  }

  // Validación de campos
  hasFieldError(fieldName: string): boolean {
    const field = this.createForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.createForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
      if (field.errors['stockBelowMinimum']) return 'El stock actual debe ser mayor o igual al stock mínimo';
      if (field.errors['maxBelowMin']) return 'El stock máximo debe ser mayor o igual al stock mínimo';
      if (field.errors['nameExists']) return 'Ya existe un producto con este nombre';
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Validación en tiempo real para nombres únicos
  async checkProductNameUnique(): Promise<void> {
    const name = this.createForm.get('productName')?.value;
    if (!name || name.length < 2) return;

    const existingProduct = this.products.find(p =>
      p.productName.toLowerCase() === name.toLowerCase()
    );

    if (existingProduct) {
      this.createForm.get('productName')?.setErrors({
        ...this.createForm.get('productName')?.errors,
        nameExists: true
      });
    } else {
      const errors = this.createForm.get('productName')?.errors;
      if (errors) {
        delete errors['nameExists'];
        if (Object.keys(errors).length === 0) {
          this.createForm.get('productName')?.setErrors(null);
        }
      }
    }
  }

  // Manejo de entrada numérica
  onNumericInput(event: any, fieldName: string): void {
    const value = event.target.value.replace(/[^0-9.]/g, '');
    this.createForm.patchValue({ [fieldName]: parseFloat(value) || 0 });
  }

  // =======================================
  // MÉTODOS DEL MODAL DE EDITAR PRODUCTO
  // =======================================

  private initializeEditForm(): void {
    this.editForm = this.formBuilder.group({
      productCode: [{ value: '', disabled: true }], // Campo disabled - no editable
      productName: ['', [Validators.required, Validators.minLength(2)]],
      categoryId: ['', [Validators.required]],
      unitOfMeasure: ['UNIDAD', [Validators.required]],
      minimumStock: [0, [Validators.required, Validators.min(0)]],
      maximumStock: [0, [Validators.required, Validators.min(0)]],
      currentStock: [0, [Validators.required, Validators.min(0)]],
      unitCost: [0, [Validators.required, Validators.min(0.01)]]
    });

    // Validaciones relacionales para el formulario de edición
    this.editForm.get('maximumStock')?.valueChanges.subscribe(() => {
      this.validateEditStockRelationship();
    });

    this.editForm.get('minimumStock')?.valueChanges.subscribe(() => {
      this.validateEditStockRelationship();
    });

    this.editForm.get('currentStock')?.valueChanges.subscribe(() => {
      this.validateEditStockRelationship();
    });
  }

  private validateEditStockRelationship(): void {
    const minStock = this.editForm.get('minimumStock')?.value || 0;
    const maxStock = this.editForm.get('maximumStock')?.value || 0;
    const currentStock = this.editForm.get('currentStock')?.value || 0;

    // Validar que stock actual >= stock mínimo
    if (currentStock < minStock) {
      this.editForm.get('currentStock')?.setErrors({
        ...this.editForm.get('currentStock')?.errors,
        stockBelowMinimum: true
      });
    } else {
      const errors = this.editForm.get('currentStock')?.errors;
      if (errors) {
        delete errors['stockBelowMinimum'];
        if (Object.keys(errors).length === 0) {
          this.editForm.get('currentStock')?.setErrors(null);
        }
      }
    }

    // Validar que stock máximo >= stock mínimo
    if (maxStock > 0 && maxStock < minStock) {
      this.editForm.get('maximumStock')?.setErrors({
        ...this.editForm.get('maximumStock')?.errors,
        maxBelowMin: true
      });
    } else {
      const errors = this.editForm.get('maximumStock')?.errors;
      if (errors) {
        delete errors['maxBelowMin'];
        if (Object.keys(errors).length === 0) {
          this.editForm.get('maximumStock')?.setErrors(null);
        }
      }
    }
  }

  editProduct(product: Product): void {
    // Cerrar modal de detalles si está abierto
    this.closeProductModal();

    this.selectedProductForEdit = product;
    this.loadCategories();
    this.openEditModal(product);
  } private openEditModal(product: Product): void {
    this.isEditModalOpen = true;

    // Rellenar el formulario con los datos del producto
    if (this.editForm) {
      this.editForm.patchValue({
        productCode: product.productCode,
        productName: product.productName,
        categoryId: product.categoryId,
        unitOfMeasure: product.unitOfMeasure,
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock,
        currentStock: product.currentStock,
        unitCost: product.unitCost
      });
    }
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedProductForEdit = null;
    this.editForm.reset();
  }

  onEditSubmit(): void {
    if (this.editForm.invalid || !this.selectedProductForEdit) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      this.notificationService.error('Error', 'No se pudo obtener la organización');
      return;
    }

    this.isUpdating = true;

    const formData = this.editForm.getRawValue(); // getRawValue() incluye campos disabled
    const productRequest: ProductRequest = {
      organizationId: currentUser.organizationId,
      productCode: formData.productCode,
      productName: formData.productName,
      categoryId: formData.categoryId,
      unitOfMeasure: formData.unitOfMeasure,
      minimumStock: formData.minimumStock,
      maximumStock: formData.maximumStock,
      currentStock: formData.currentStock,
      unitCost: formData.unitCost
    };

    this.inventoryApi.updateProduct(this.selectedProductForEdit.productId, productRequest)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isUpdating = false)
      )
      .subscribe({
        next: (updatedProduct) => {
          this.notificationService.success('Éxito', 'Producto actualizado exitosamente');
          this.closeEditModal();
          this.loadProducts(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error updating product:', error);
          if (error.error?.message) {
            this.notificationService.error('Error', error.error.message);
          } else {
            this.notificationService.error('Error', 'Error al actualizar el producto');
          }
        }
      });
  }

  // Validación de campos para formulario de edición
  hasEditFieldError(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getEditFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
      if (field.errors['stockBelowMinimum']) return 'El stock actual debe ser mayor o igual al stock mínimo';
      if (field.errors['maxBelowMin']) return 'El stock máximo debe ser mayor o igual al stock mínimo';
      if (field.errors['nameExists']) return 'Ya existe un producto con este nombre';
    }
    return '';
  }

  // Validación en tiempo real para nombres únicos en edición
  async checkEditProductNameUnique(): Promise<void> {
    const name = this.editForm.get('productName')?.value;
    if (!name || name.length < 2 || !this.selectedProductForEdit) return;

    // Excluir el producto actual de la validación
    const existingProduct = this.products.find(p =>
      p.productName.toLowerCase() === name.toLowerCase() &&
      p.productId !== this.selectedProductForEdit!.productId
    );

    if (existingProduct) {
      this.editForm.get('productName')?.setErrors({
        ...this.editForm.get('productName')?.errors,
        nameExists: true
      });
    } else {
      const errors = this.editForm.get('productName')?.errors;
      if (errors) {
        delete errors['nameExists'];
        if (Object.keys(errors).length === 0) {
          this.editForm.get('productName')?.setErrors(null);
        }
      }
    }
  }

  // Manejo de entrada numérica para formulario de edición
  onEditNumericInput(event: any, fieldName: string): void {
    const value = event.target.value.replace(/[^0-9.]/g, '');
    this.editForm.patchValue({ [fieldName]: parseFloat(value) || 0 });
  }

  // ==================== GENERACIÓN DE REPORTES ====================

  /**
   * Genera un reporte PDF de los productos filtrados
   */
  generateProductReport(): void {
    const productsToReport = this.filteredProducts.length > 0 ? this.filteredProducts : this.products;

    if (productsToReport.length === 0) {
      this.notificationService.warning(
        'Sin datos',
        'No hay productos para generar el reporte'
      );
      return;
    }

    // Obtener organizationId del usuario actual
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      console.warn('⚠️ No se encontró organizationId, generando reporte sin logo');
      this.generateReportWithoutOrganization(productsToReport);
      return;
    }

    // Obtener información de la organización incluyendo el logo
    console.log('🏢 Obteniendo información de la organización:', organizationId);
    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const orgData = response.data;
          console.log('📄 Generando reporte de productos con logo...');
          console.log('   - Total de productos:', productsToReport.length);
          console.log('   - Organización:', orgData.organizationName);
          console.log('   - Logo:', orgData.logo ? 'Disponible' : 'No disponible');

          this.reportService.generateProductReport(
            productsToReport,
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
          this.generateReportWithoutOrganization(productsToReport);
        }
      },
      error: (error) => {
        console.error('❌ Error obteniendo información de la organización:', error);
        this.generateReportWithoutOrganization(productsToReport);
      }
    });
  }

  /**
   * Genera reporte sin información de organización (fallback)
   */
  private generateReportWithoutOrganization(products: Product[]): void {
    console.log('📄 Generando reporte de productos sin logo...');

    this.reportService.generateProductReport(
      products,
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

}
