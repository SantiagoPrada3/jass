import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SupplierApiService, Supplier, SupplierRequest } from '../../services/supplier-api.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class SuppliersComponent implements OnInit {
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
        label: 'Proveedores',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
      }
    ];
  private readonly supplierApi = inject(SupplierApiService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  // Lista de proveedores
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];

  // Estado de carga
  isLoading = false;

  // Filtros
  searchTerm = '';
  statusFilter: 'all' | 'ACTIVO' | 'INACTIVO' = 'all';

  // Modal de creación/edición
  isFormModalOpen = false;
  isEditMode = false;
  currentSupplierId: string | null = null;

  // Modal de confirmación de eliminación
  isDeleteModalOpen = false;
  supplierToDelete: Supplier | null = null;

  // Modal de confirmación de restauración
  isRestoreModalOpen = false;
  supplierToRestore: Supplier | null = null;

  // Formulario
  supplierForm: SupplierRequest = {
    organizationId: '',
    supplierCode: '',
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIVO'
  };

  // Validaciones
  formErrors: { [key: string]: string } = {};

  ngOnInit(): void {
    this.loadSuppliers();
  }

  /**
   * Cargar todos los proveedores
   */
  loadSuppliers(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      this.notificationService.error('Error', 'No se pudo obtener el ID de la organización');
      return;
    }

    this.isLoading = true;
    this.supplierApi.getAllSuppliers(currentUser.organizationId).subscribe({
      next: (response) => {
        // Ordenar por código de forma ascendente
        this.suppliers = response.data.sort((a, b) => {
          const codeA = a.supplierCode || '';
          const codeB = b.supplierCode || '';
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        });
        this.applyFilters();
        this.isLoading = false;
        console.log('✅ Proveedores cargados y ordenados:', this.suppliers.length);
        console.log('📦 Primer proveedor:', this.suppliers[0]);
      },
      error: (error) => {
        console.error('❌ Error al cargar proveedores:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los proveedores');
        this.isLoading = false;
      }
    });
  }

  /**
   * Aplicar filtros de búsqueda y estado
   */
  applyFilters(): void {
    let filtered = [...this.suppliers];

    // Filtrar por estado
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === this.statusFilter);
    }

    // Filtrar por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.supplierCode.toLowerCase().includes(term) ||
        s.supplierName.toLowerCase().includes(term) ||
        s.contactPerson.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.includes(term)
      );
    }

    // Ordenar por código de forma ascendente
    filtered.sort((a, b) => {
      const codeA = a.supplierCode || '';
      const codeB = b.supplierCode || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });

    this.filteredSuppliers = filtered;
  }

  /**
   * Cambiar filtro de estado
   */
  changeStatusFilter(status: 'all' | 'ACTIVO' | 'INACTIVO'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  /**
   * Buscar proveedores
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Abrir modal para crear nuevo proveedor
   */
  openCreateModal(): void {
    this.isEditMode = false;
    this.currentSupplierId = null;
    this.resetForm();

    // Obtener organizationId del usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.organizationId) {
      this.supplierForm.organizationId = currentUser.organizationId;
    }

    // Generar código automáticamente
    this.supplierForm.supplierCode = this.generateSupplierCode();

    this.isFormModalOpen = true;
  }

  /**
   * Abrir modal para editar proveedor
   */
  openEditModal(supplier: Supplier): void {
    this.isEditMode = true;
    this.currentSupplierId = supplier.supplierId;

    this.supplierForm = {
      organizationId: supplier.organizationId,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status
    };

    this.formErrors = {};
    this.isFormModalOpen = true;
  }

  /**
   * Cerrar modal de formulario
   */
  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.resetForm();
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    const currentUser = this.authService.getCurrentUser();
    this.supplierForm = {
      organizationId: currentUser?.organizationId || '',
      supplierCode: '',
      supplierName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'ACTIVO'
    };
    this.formErrors = {};
  }

  /**
   * Manejar entrada de teléfono (solo números)
   */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Solo permitir números
    input.value = input.value.replace(/[^\d]/g, '');
    this.supplierForm.phone = input.value;
  }

  /**
   * Generar código de proveedor automáticamente basado en el último código
   */
  generateSupplierCode(): string {
    if (this.suppliers.length === 0) {
      return 'PROV001';
    }

    // Extraer números de todos los códigos existentes
    const codes = this.suppliers
      .map(s => s.supplierCode)
      .filter(code => code && code.startsWith('PROV'))
      .map(code => {
        const match = code.match(/PROV(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    // Si no hay códigos válidos, empezar desde 1
    if (codes.length === 0) {
      return 'PROV001';
    }

    // Obtener el número más alto y sumar 1
    const maxNumber = Math.max(...codes);
    const nextNumber = maxNumber + 1;

    // Formatear con ceros a la izquierda (3 dígitos)
    return `PROV${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Validar formulario
   */
  validateForm(): boolean {
    this.formErrors = {};
    let isValid = true;

    // El código de proveedor NO se valida porque se genera automáticamente en el backend

    // Validar nombre del proveedor
    if (!this.supplierForm.supplierName.trim()) {
      this.formErrors['supplierName'] = 'El nombre del proveedor es requerido';
      isValid = false;
    }

    // Validar persona de contacto
    if (!this.supplierForm.contactPerson.trim()) {
      this.formErrors['contactPerson'] = 'La persona de contacto es requerida';
      isValid = false;
    }

    // Validar teléfono
    if (!this.supplierForm.phone.trim()) {
      this.formErrors['phone'] = 'El teléfono es requerido';
      isValid = false;
    } else {
      const phone = this.supplierForm.phone.trim();
      const isCellphone = /^9\d{8}$/.test(phone); // Celular: 9 dígitos comenzando con 9
      const isLandline = /^01\d{7,8}$/.test(phone); // Fijo: 01 + 7-8 dígitos

      if (!isCellphone && !isLandline) {
        this.formErrors['phone'] = 'Celular: 9 dígitos (inicia con 9) o Fijo: 9-10 dígitos (inicia con 01)';
        isValid = false;
      }
    }

    // Validar email
    if (!this.supplierForm.email.trim()) {
      this.formErrors['email'] = 'El correo electrónico es requerido';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.supplierForm.email)) {
      this.formErrors['email'] = 'El correo electrónico no es válido';
      isValid = false;
    }

    // Validar dirección
    if (!this.supplierForm.address.trim()) {
      this.formErrors['address'] = 'La dirección es requerida';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Guardar proveedor (crear o actualizar)
   */
  saveSupplier(): void {
    if (!this.validateForm()) {
      this.notificationService.error('Error', 'Por favor, corrija los errores en el formulario');
      return;
    }

    this.isLoading = true;

    if (this.isEditMode && this.currentSupplierId) {
      // Actualizar proveedor existente
      this.supplierApi.updateSupplier(this.currentSupplierId, this.supplierForm).subscribe({
        next: (response) => {
          this.notificationService.success('Éxito', 'Proveedor actualizado correctamente');
          this.closeFormModal();
          this.loadSuppliers();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error al actualizar proveedor:', error);
          this.notificationService.error('Error', 'No se pudo actualizar el proveedor');
          this.isLoading = false;
        }
      });
    } else {
      // Crear nuevo proveedor
      // Generar código automáticamente si está vacío
      const supplierData: any = { ...this.supplierForm };
      if (!supplierData.supplierCode?.trim()) {
        supplierData.supplierCode = this.generateSupplierCode();
      }

      this.supplierApi.createSupplier(supplierData).subscribe({
        next: (response) => {
          this.notificationService.success('Éxito', `Proveedor creado correctamente con código: ${supplierData.supplierCode}`);
          this.closeFormModal();
          this.loadSuppliers();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error al crear proveedor:', error);
          this.notificationService.error('Error', 'No se pudo crear el proveedor');
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Abrir modal de confirmación de eliminación
   */
  openDeleteModal(supplier: Supplier): void {
    console.log('🔍 Supplier para eliminar:', supplier);
    console.log('🔍 ID del supplier:', supplier.supplierId);
    this.supplierToDelete = supplier;
    this.isDeleteModalOpen = true;
  }

  /**
   * Cerrar modal de eliminación
   */
  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.supplierToDelete = null;
  }

  /**
   * Confirmar eliminación
   */
  confirmDelete(): void {
    if (!this.supplierToDelete) return;

    this.isLoading = true;
    this.supplierApi.deleteSupplier(this.supplierToDelete.supplierId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Proveedor eliminado correctamente');
        this.closeDeleteModal();
        this.loadSuppliers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al eliminar proveedor:', error);
        this.notificationService.error('Error', 'No se pudo eliminar el proveedor');
        this.isLoading = false;
      }
    });
  }

  /**
   * Abrir modal de confirmación de restauración
   */
  openRestoreModal(supplier: Supplier): void {
    this.supplierToRestore = supplier;
    this.isRestoreModalOpen = true;
  }

  /**
   * Cerrar modal de restauración
   */
  closeRestoreModal(): void {
    this.isRestoreModalOpen = false;
    this.supplierToRestore = null;
  }

  /**
   * Confirmar restauración
   */
  confirmRestore(): void {
    if (!this.supplierToRestore) return;

    this.isLoading = true;
    this.supplierApi.restoreSupplier(this.supplierToRestore.supplierId).subscribe({
      next: () => {
        this.notificationService.success('Éxito', 'Proveedor restaurado correctamente');
        this.closeRestoreModal();
        this.loadSuppliers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al restaurar proveedor:', error);
        this.notificationService.error('Error', 'No se pudo restaurar el proveedor');
        this.isLoading = false;
      }
    });
  }

  /**
   * Obtener clase de badge según estado
   */
  getStatusBadgeClass(status: string): string {
    return status === 'ACTIVO'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }
}
