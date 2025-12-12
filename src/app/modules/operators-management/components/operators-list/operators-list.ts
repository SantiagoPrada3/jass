import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Breadcrumb, BreadcrumbItem } from "../../../../shared/components/ui/breadcrumb/breadcrumb";
import { OperatorsApi } from '../../services/operators-api';
import { Operator, OperatorStatus, OperatorCreationResponse } from '../../models/operator.model';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CreateOperatorModal } from '../create-operator-modal/create-operator-modal';
import { OperatorDetailsModal } from '../operator-details-modal/operator-details-modal';
import { ConfirmationModal, ConfirmationData } from '../confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-operators-list',
  standalone: true,
  imports: [Breadcrumb, CommonModule, FormsModule, CreateOperatorModal, OperatorDetailsModal, ConfirmationModal],
  templateUrl: './operators-list.html',
  styleUrl: './operators-list.css'
})
export class OperatorsList implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Operadores',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    }
  ];

  // Datos
  operators: Operator[] = [];
  filteredOperators: Operator[] = [];
  paginatedOperators: Operator[] = [];

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

  // Modal de crear operador
  isCreateOperatorModalOpen: boolean = false;
  currentOrganizationId: string | null = null;

  // Modal de detalles de operador
  isOperatorDetailsModalOpen: boolean = false;
  selectedOperatorId: string | null = null;

  // Modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationData: ConfirmationData = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  pendingActionOperator: Operator | null = null;
  pendingActionType: 'delete' | 'restore' | null = null;

  // Referencia a Math para usar en el template
  Math = Math;

  // Estadísticas calculadas
  get totalOperators(): number {
    return this.operators.length;
  }

  get activeOperators(): number {
    return this.operators.filter(o => o.status === OperatorStatus.ACTIVE).length;
  }

  get inactiveOperators(): number {
    return this.operators.filter(o => o.status === OperatorStatus.INACTIVE).length;
  }

  constructor(
    private operatorsApi: OperatorsApi,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadOperators();
  }

  /**
   * Cargar todos los operadores
   */
  loadOperators(): void {
    this.isLoading = true;
    const organizationId = this.getCurrentOrganizationId();

    this.operatorsApi.getAllOperators(organizationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.operators = response.data || [];
          console.log('🔍 [OperatorsList] Operadores cargados:', this.operators.map(op => ({
            code: op.userCode,
            status: op.status,
            deletedAt: op.deletedAt
          })));
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading operators:', error);

        // Si el error es 404 (no hay operadores), inicializar con lista vacía
        if (error.status === 404 || error.error?.message?.includes('no encontrado')) {
          console.log('No hay operadores aún, inicializando lista vacía');
          this.operators = [];
          this.applyFilters();
        } else {
          // Otros errores sí mostrar notificación
          this.notificationService.error(
            'Error al cargar',
            'No se pudieron cargar los operadores'
          );
        }
        this.isLoading = false;
      }
    });
  }

  /**
   * Aplicar filtros de búsqueda y estado
   */
  applyFilters(): void {
    let filtered = [...this.operators];

    // Filtro de estado
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(op => op.status === OperatorStatus.ACTIVE);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(op => op.status === OperatorStatus.INACTIVE);
    }

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(op =>
        op.userCode.toLowerCase().includes(term) ||
        op.firstName.toLowerCase().includes(term) ||
        op.lastName.toLowerCase().includes(term) ||
        op.email.toLowerCase().includes(term) ||
        op.documentNumber.includes(term)
      );
    }

    this.filteredOperators = filtered;
    this.updatePagination();
  }

  /**
   * Evento de búsqueda
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Evento de cambio de filtro de estado
   */
  onStatusFilterChange(): void {
    this.applyFilters();
  }

  // Métodos para dropdown de estado
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
      case 'all': return 'Todos los operadores';
      case 'active': return 'Solo activos';
      case 'inactive': return 'Solo inactivos';
      default: return 'Todos los operadores';
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
  getStatusLabel(status: OperatorStatus): string {
    const statusMap: Record<OperatorStatus, string> = {
      [OperatorStatus.ACTIVE]: 'Activo',
      [OperatorStatus.INACTIVE]: 'Inactivo',
      [OperatorStatus.DELETED]: 'Eliminado'
    };
    return statusMap[status] || status;
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: OperatorStatus): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case OperatorStatus.ACTIVE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case OperatorStatus.INACTIVE:
        return `${baseClasses} bg-red-100 text-red-800`;
      case OperatorStatus.DELETED:
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Tracking function para ngFor
   */
  trackByOperatorId(index: number, operator: Operator): string {
    return operator.id;
  }

  /**
   * Editar operador (abre el modal de detalles en modo edición)
   */
  editOperator(operator: Operator): void {
    this.openOperatorDetails(operator);
    console.log('Abriendo edición de operador:', operator.userCode);
  }

  /**
   * Abrir modal de creación
   */
  openCreateModal(): void {
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isCreateOperatorModalOpen = true;
    console.log('🆕 [OperatorsList] Abriendo modal de crear operador para organización:', this.currentOrganizationId);
  }

  /**
   * Cerrar modal de creación
   */
  closeCreateOperatorModal(): void {
    this.isCreateOperatorModalOpen = false;
    this.currentOrganizationId = null;
    console.log('❌ [OperatorsList] Modal de crear operador cerrado');
  }

  /**
   * Maneja el evento cuando se crea un nuevo operador
   */
  onOperatorCreated(operatorCreationData: OperatorCreationResponse): void {
    console.log('🎉 [OperatorsList] Nuevo operador creado:', operatorCreationData);
    this.loadOperators();
    this.closeCreateOperatorModal();
  }

  /**
   * Preparar eliminación de operador (muestra modal de confirmación)
   */
  prepareDeleteOperator(operator: Operator): void {
    this.pendingActionOperator = operator;
    this.pendingActionType = 'delete';

    this.confirmationData = {
      title: '¿Eliminar operador?',
      message: 'Esta acción marcará al operador como eliminado. Podrá restaurarlo más tarde.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      operatorName: `${operator.firstName} ${operator.lastName}`,
      operatorDni: operator.documentNumber
    };

    this.isConfirmationModalOpen = true;
    console.log('🗑️ [OperatorsList] Preparando eliminación de operador:', operator.userCode);
  }

  /**
   * Preparar restauración de operador (muestra modal de confirmación)
   */
  prepareRestoreOperator(operator: Operator): void {
    this.pendingActionOperator = operator;
    this.pendingActionType = 'restore';

    this.confirmationData = {
      title: '¿Restaurar operador?',
      message: 'Esta acción restaurará al operador y podrá volver a usar el sistema.',
      confirmText: 'Sí, restaurar',
      cancelText: 'Cancelar',
      type: 'success',
      operatorName: `${operator.firstName} ${operator.lastName}`,
      operatorDni: operator.documentNumber
    };

    this.isConfirmationModalOpen = true;
    console.log('♻️ [OperatorsList] Preparando restauración de operador:', operator.userCode);
  }

  /**
   * Ejecutar la acción confirmada (eliminar o restaurar)
   */
  onConfirmAction(): void {
    if (!this.pendingActionOperator || !this.pendingActionType) {
      console.error('❌ [OperatorsList] No hay acción pendiente');
      return;
    }

    const operator = this.pendingActionOperator;
    const actionType = this.pendingActionType;

    console.log(`🔄 [OperatorsList] Ejecutando ${actionType} para operador:`, operator.userCode);

    if (actionType === 'delete') {
      this.executeDeleteOperator(operator);
    } else if (actionType === 'restore') {
      this.executeRestoreOperator(operator);
    }

    this.closeConfirmationModal();
  }

  /**
   * Cancelar la acción
   */
  onCancelAction(): void {
    console.log('❌ [OperatorsList] Acción cancelada por el usuario');
    this.closeConfirmationModal();
  }

  /**
   * Cerrar modal de confirmación y limpiar estado
   */
  private closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.pendingActionOperator = null;
    this.pendingActionType = null;
  }

  /**
   * Abrir modal de detalles del operador
   */
  openOperatorDetails(operator: Operator): void {
    this.selectedOperatorId = operator.id;
    this.isOperatorDetailsModalOpen = true;
    console.log('👁️ [OperatorsList] Abriendo detalles de operador:', operator.userCode);
  }

  /**
   * Cerrar modal de detalles del operador
   */
  closeOperatorDetailsModal(): void {
    this.isOperatorDetailsModalOpen = false;
    this.selectedOperatorId = null;
    console.log('✖️ [OperatorsList] Cerrando modal de detalles');
  }

  /**
   * Manejar actualización de operador desde el modal de detalles
   */
  onOperatorUpdated(updatedOperator: Operator): void {
    const index = this.operators.findIndex(op => op.id === updatedOperator.id);
    if (index !== -1) {
      this.operators[index] = updatedOperator;
      this.applyFilters();
      console.log('✅ [OperatorsList] Operador actualizado en la lista:', updatedOperator.userCode);
    }
  }

  /**
   * Ejecutar eliminación de operador
   */
  private executeDeleteOperator(operator: Operator): void {
    console.log('🗑️ [OperatorsList] Eliminando operador:', operator.userCode);

    this.operatorsApi.deleteOperator(operator.id).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ [OperatorsList] Operador eliminado exitosamente:', operator.userCode);
          this.notificationService.success(
            '¡Operador Eliminado!',
            `El operador ${operator.firstName} ${operator.lastName} ha sido eliminado exitosamente`
          );
          this.loadOperators();
        } else {
          console.error('❌ [OperatorsList] Error en la respuesta del servidor:', response.message);
          this.notificationService.error(
            'Error al eliminar',
            response.message || 'No se pudo eliminar el operador'
          );
        }
      },
      error: (error) => {
        console.error('❌ [OperatorsList] Error al eliminar operador:', error);
        this.notificationService.error(
          'Error al eliminar',
          'Ocurrió un error al eliminar el operador. Intente nuevamente.'
        );
      }
    });
  }

  /**
   * Ejecutar restauración de operador
   */
  private executeRestoreOperator(operator: Operator): void {
    console.log('♻️ [OperatorsList] Restaurando operador:', operator.userCode);

    // Si está eliminado (soft delete), usar endpoint de restaurar
    if (operator.deletedAt) {
      this.operatorsApi.restoreOperator(operator.id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            console.log('✅ [OperatorsList] Operador restaurado exitosamente:', operator.userCode);
            this.notificationService.success(
              '¡Operador Restaurado!',
              `El operador ${operator.firstName} ${operator.lastName} ha sido restaurado exitosamente`
            );
            this.loadOperators();
          } else {
            this.handleRestoreError(response.message);
          }
        },
        error: (error) => this.handleRestoreError(error)
      });
    }
    // Si está inactivo (pero no eliminado), cambiar estado a ACTIVO
    else if (operator.status === OperatorStatus.INACTIVE) {
      this.operatorsApi.changeOperatorStatus(operator.id, OperatorStatus.ACTIVE).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('✅ [OperatorsList] Operador activado exitosamente:', operator.userCode);
            this.notificationService.success(
              '¡Operador Activado!',
              `El operador ${operator.firstName} ${operator.lastName} ha sido activado exitosamente`
            );
            this.loadOperators();
          } else {
            this.handleRestoreError(response.message);
          }
        },
        error: (error) => this.handleRestoreError(error)
      });
    }
  }

  private handleRestoreError(error: any): void {
    console.error('❌ [OperatorsList] Error al restaurar/activar operador:', error);
    this.notificationService.error(
      'Error al restaurar',
      typeof error === 'string' ? error : 'Ocurrió un error al restaurar el operador. Intente nuevamente.'
    );
  }

  /**
   * Eliminar operador (versión antigua - mantenida para compatibilidad)
   */
  deleteOperator(operator: Operator): void {
    this.prepareDeleteOperator(operator);
  }

  /**
   * Restaurar operador (versión antigua - mantenida para compatibilidad)
   */
  restoreOperator(operator: Operator): void {
    this.prepareRestoreOperator(operator);
  }

  /**
   * Actualizar paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOperators.length / this.pageSize);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedOperators = this.filteredOperators.slice(startIndex, endIndex);
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

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Obtener ID de organización del usuario actual
   */
  private getCurrentOrganizationId(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.organizationId || 'default-org';
  }
}
