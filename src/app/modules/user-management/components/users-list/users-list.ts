import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Breadcrumb, BreadcrumbItem } from "../../../../shared/components/ui/breadcrumb/breadcrumb";
import { UsersApi } from '../../services/users-api';
import { UserWithLocationResponse, CreateUserRequest, UpdateUserPatchRequest } from '../../models/user.model';
import { UserStatus, UserStatusLabels } from '../../models/role.model';
import { AuthService } from '../../../../core/auth/services/auth';
import { UserDetailsModal } from '../user-details-modal/user-details-modal';
import { CreateUserModal } from '../create-user-modal/create-user-modal';
import { ConfirmationModal, ConfirmationData } from '../confirmation-modal/confirmation-modal';
import { UserCreationResponse } from '../../models/user.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [Breadcrumb, CommonModule, FormsModule, UserDetailsModal, CreateUserModal, ConfirmationModal],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css'
})
export class UsersList implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Usuarios',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
    }
  ];

  // Datos
  users: UserWithLocationResponse[] = [];
  filteredUsers: UserWithLocationResponse[] = [];
  paginatedUsers: UserWithLocationResponse[] = [];
  availableZones: string[] = [];

  // Filtros
  searchTerm: string = '';
  selectedZone: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Estados
  isLoading: boolean = false;

  // Dropdowns custom
  isZoneDropdownOpen: boolean = false;
  isStatusDropdownOpen: boolean = false;

  // Modal de detalles de usuario
  isUserDetailsModalOpen: boolean = false;
  selectedUserId: string | null = null;

  // Modal de crear usuario
  isCreateUserModalOpen: boolean = false;
  currentOrganizationId: string | null = null;

  // Modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationData: ConfirmationData = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  pendingActionUser: UserWithLocationResponse | null = null;
  pendingActionType: 'delete' | 'restore' | null = null;

  // Referencia a Math para usar en el template
  Math = Math;

  // Estadísticas calculadas
  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter(u => u.status === 'ACTIVE').length;
  }

  get inactiveUsers(): number {
    return this.users.filter(u => u.status === 'INACTIVE').length;
  }

  constructor(
    private usersApi: UsersApi,
    private authService: AuthService,
    private notificationService: NotificationService,
    private reportService: ReportService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Cargar todos los usuarios (optimizado - solo una petición)
   */
  loadUsers(): void {
    this.isLoading = true;
    const organizationId = this.getCurrentOrganizationId();

    // Siempre usar getAllClients y filtrar localmente
    this.usersApi.getAllClients(organizationId).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data || [];
          this.extractAvailableZones();
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Extraer zonas disponibles de los usuarios
   */
  extractAvailableZones(): void {
    const zones = new Set(this.users
      .map(user => user.zone?.zoneName)
      .filter((zone): zone is string => zone != null && zone.trim() !== '')
    );
    this.availableZones = Array.from(zones).sort();
  }

  /**
   * Aplicar filtros de búsqueda, zona y estado (optimizado - todo local)
   */
  applyFilters(): void {
    let filtered = [...this.users];

    // Filtro de estado (local)
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(user => user.status === 'ACTIVE');
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(user => user.status === 'INACTIVE');
    }
    // Si es 'all', no filtramos por estado

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.userCode.toLowerCase().includes(term) ||
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.documentNumber.includes(term)
      );
    }

    // Filtro de zona
    if (this.selectedZone) {
      filtered = filtered.filter(user => user.zone?.zoneName === this.selectedZone);
    }

    this.filteredUsers = filtered;
    this.updatePagination();
  }

  /**
   * Evento de búsqueda
   */
  onSearch(): void {
    this.applyFilters();
  }

  /**
   * Evento de cambio de filtro de zona
   */
  onFilterChange(): void {
    this.applyFilters();
  }

  /**
   * Evento de cambio de filtro de estado (optimizado - sin recarga)
   */
  onStatusFilterChange(): void {
    this.applyFilters(); // Solo reaplicar filtros localmente
  }

  // Métodos para dropdowns custom
  toggleZoneDropdown(): void {
    this.isZoneDropdownOpen = !this.isZoneDropdownOpen;
    if (this.isZoneDropdownOpen) {
      this.isStatusDropdownOpen = false;
    }
  }

  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    if (this.isStatusDropdownOpen) {
      this.isZoneDropdownOpen = false;
    }
  }

  selectZone(zone: string): void {
    this.selectedZone = zone;
    this.isZoneDropdownOpen = false;
    this.onFilterChange();
  }

  selectStatus(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.isStatusDropdownOpen = false;
    this.onStatusFilterChange();
  }

  getZoneDisplayText(): string {
    return this.selectedZone || 'Todas las zonas';
  }

  getStatusDisplayText(): string {
    switch (this.statusFilter) {
      case 'all': return 'Todos los usuarios';
      case 'active': return 'Solo activos';
      case 'inactive': return 'Solo inactivos';
      default: return 'Todos los usuarios';
    }
  }

  closeDropdowns(): void {
    this.isZoneDropdownOpen = false;
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
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'Activo',
      'INACTIVE': 'Inactivo',
      'PENDING': 'Pendiente',
      'SUSPENDED': 'Suspendido'
    };
    return statusMap[status] || status;
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case 'ACTIVE':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'INACTIVE':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'SUSPENDED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Tracking function para ngFor
   */
  trackByUserId(index: number, user: UserWithLocationResponse): string {
    return user.id;
  }

  /**
   * Abrir modal de creación
   */
  openCreateModal(): void {
    // TODO: Implementar modal de creación
    console.log('Abrir modal de creación');
  }

  /**
   * Ver detalles del usuario (abrir modal lateral)
   */
  viewUserDetails(user: UserWithLocationResponse): void {
    this.selectedUserId = user.id;
    this.isUserDetailsModalOpen = true;
  }

  /**
   * Cerrar modal de detalles
   */
  closeUserDetailsModal(): void {
    this.isUserDetailsModalOpen = false;
    this.selectedUserId = null;
  }

  /**
   * Editar usuario desde el modal - Actualizar la lista con los datos actualizados
   */
  editUserFromModal(user: UserWithLocationResponse): void {
    // Encontrar y actualizar el usuario en la lista local
    const index = this.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.users[index] = user;

      // Recargar los filtros y paginación para reflejar los cambios
      this.applyFilters();

      console.log('✅ Usuario actualizado en la lista:', user);
    }

    // Cerrar el modal
    this.closeUserDetailsModal();
  }  /**
   * Actualizar paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);

    // Verificar si la página actual es válida
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }

    // Calcular índices para la página actual
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    // Obtener usuarios para la página actual
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
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
   * Eliminar usuario
   */
  deleteUser(user: UserWithLocationResponse): void {
    if (confirm(`¿Está seguro de eliminar al usuario ${user.firstName} ${user.lastName}?`)) {
      this.usersApi.deleteClient(user.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUsers(); // Recargar lista
          }
        },
        error: (error) => {
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  /**
   * Restaurar usuario
   */
  restoreUser(user: UserWithLocationResponse): void {
    this.usersApi.restoreClient(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadUsers(); // Recargar lista
        }
      },
      error: (error) => {
        console.error('Error restoring user:', error);
      }
    });
  }

  /**
   * Obtener ID de organización del usuario actual
   */
  private getCurrentOrganizationId(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.organizationId || 'default-org';
  }

  // ===== MÉTODOS PARA EL MODAL DE CREAR USUARIO =====

  /**
   * Abre el modal para crear un nuevo usuario
   */
  openCreateUserModal(): void {
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isCreateUserModalOpen = true;
    console.log('🆕 [UsersList] Abriendo modal de crear usuario para organización:', this.currentOrganizationId);
  }

  /**
   * Cierra el modal de crear usuario
   */
  closeCreateUserModal(): void {
    this.isCreateUserModalOpen = false;
    this.currentOrganizationId = null;
    console.log('❌ [UsersList] Modal de crear usuario cerrado');
  }

  /**
   * Maneja el evento cuando se crea un nuevo usuario
   */
  onUserCreated(userCreationData: UserCreationResponse): void {
    console.log('🎉 [UsersList] Nuevo usuario creado:', userCreationData);

    // Mostrar información de las credenciales generadas
    this.notificationService.success(
      '¡Usuario creado exitosamente!',
      `Se han generado las credenciales para ${userCreationData.userInfo.userCode}`
    );

    // Mostrar detalles de las credenciales en la consola para el administrador
    console.log('🔐 [UsersList] Credenciales generadas:');
    console.log('   - Usuario:', userCreationData.username);
    console.log('   - Contraseña temporal:', userCreationData.temporaryPassword);
    console.log('   - Código de usuario:', userCreationData.userInfo.userCode);

    // Recargar la lista de usuarios para mostrar el nuevo usuario
    this.loadUsers();

    // Cerrar el modal
    this.closeCreateUserModal();

    // Opcional: Mostrar un modal con las credenciales para que el admin las copie
    // (Podrías implementar un modal adicional aquí para mostrar las credenciales)
  }

  // ==================== MÉTODOS DE ELIMINACIÓN Y RESTAURACIÓN ====================

  /**
   * Preparar eliminación de usuario (muestra modal de confirmación)
   */
  prepareDeleteUser(user: UserWithLocationResponse): void {
    this.pendingActionUser = user;
    this.pendingActionType = 'delete';

    this.confirmationData = {
      title: 'Eliminar Usuario',
      message: '¿Está seguro de que desea eliminar este usuario? Esta acción marcará el usuario como inactivo y no podrá acceder al sistema.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      userName: `${user.firstName} ${user.lastName}`,
      userDni: user.documentNumber
    };

    this.isConfirmationModalOpen = true;
    console.log('🗑️ [UsersList] Preparando eliminación de usuario:', user.userCode);
  }

  /**
   * Preparar restauración de usuario (muestra modal de confirmación)
   */
  prepareRestoreUser(user: UserWithLocationResponse): void {
    this.pendingActionUser = user;
    this.pendingActionType = 'restore';

    this.confirmationData = {
      title: 'Restaurar Usuario',
      message: '¿Está seguro de que desea restaurar este usuario? El usuario volverá a estar activo y podrá acceder al sistema.',
      confirmText: 'Sí, Restaurar',
      cancelText: 'Cancelar',
      type: 'success',
      userName: `${user.firstName} ${user.lastName}`,
      userDni: user.documentNumber
    };

    this.isConfirmationModalOpen = true;
    console.log('♻️ [UsersList] Preparando restauración de usuario:', user.userCode);
  }

  /**
   * Ejecutar la acción confirmada (eliminar o restaurar)
   */
  onConfirmAction(): void {
    if (!this.pendingActionUser || !this.pendingActionType) {
      console.error('❌ [UsersList] No hay acción pendiente');
      return;
    }

    const user = this.pendingActionUser;
    const actionType = this.pendingActionType;

    console.log(`🔄 [UsersList] Ejecutando ${actionType} para usuario:`, user.userCode);

    if (actionType === 'delete') {
      this.executeDeleteUser(user);
    } else if (actionType === 'restore') {
      this.executeRestoreUser(user);
    }

    // Cerrar modal y limpiar estado
    this.closeConfirmationModal();
  }

  /**
   * Cancelar la acción
   */
  onCancelAction(): void {
    console.log('❌ [UsersList] Acción cancelada por el usuario');
    this.closeConfirmationModal();
  }

  /**
   * Cerrar modal de confirmación y limpiar estado
   */
  private closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.pendingActionUser = null;
    this.pendingActionType = null;
  }

  /**
   * Ejecutar eliminación de usuario
   */
  private executeDeleteUser(user: UserWithLocationResponse): void {
    console.log('🗑️ [UsersList] Eliminando usuario:', user.userCode);

    this.usersApi.deleteClient(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ [UsersList] Usuario eliminado exitosamente:', user.userCode);

          this.notificationService.success(
            '¡Usuario Eliminado!',
            `El usuario ${user.firstName} ${user.lastName} ha sido eliminado exitosamente`
          );

          // Recargar página completa
          setTimeout(() => {
            window.location.reload();
          }, 1000); // Dar tiempo para mostrar la notificación
        } else {
          console.error('❌ [UsersList] Error en la respuesta del servidor:', response.message);
          this.notificationService.error(
            'Error al eliminar',
            response.message || 'No se pudo eliminar el usuario'
          );
        }
      },
      error: (error) => {
        console.error('❌ [UsersList] Error al eliminar usuario:', error);
        this.notificationService.error(
          'Error al eliminar',
          'Ocurrió un error al eliminar el usuario. Intente nuevamente.'
        );
      }
    });
  }

  /**
   * Ejecutar restauración de usuario
   */
  private executeRestoreUser(user: UserWithLocationResponse): void {
    console.log('♻️ [UsersList] Restaurando usuario:', user.userCode);

    this.usersApi.restoreClient(user.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('✅ [UsersList] Usuario restaurado exitosamente:', user.userCode);

          this.notificationService.success(
            '¡Usuario Restaurado!',
            `El usuario ${user.firstName} ${user.lastName} ha sido restaurado exitosamente`
          );

          // Recargar página completa
          setTimeout(() => {
            window.location.reload();
          }, 1000); // Dar tiempo para mostrar la notificación
          this.loadUsers();
        } else {
          console.error('❌ [UsersList] Error en la respuesta del servidor:', response.message);
          this.notificationService.error(
            'Error al restaurar',
            response.message || 'No se pudo restaurar el usuario'
          );
        }
      },
      error: (error) => {
        console.error('❌ [UsersList] Error al restaurar usuario:', error);
        this.notificationService.error(
          'Error al restaurar',
          'Ocurrió un error al restaurar el usuario. Intente nuevamente.'
        );
      }
    });
  }

  // ==================== GENERACIÓN DE REPORTES ====================

  /**
   * Genera un reporte PDF de los usuarios filtrados
   */
  generateUserReport(): void {
    // Obtener la organización actual del usuario
    const currentUser = this.authService.getCurrentUser();

    // Usar los usuarios filtrados actuales
    const usersToReport = this.filteredUsers.length > 0 ? this.filteredUsers : this.users;

    if (usersToReport.length === 0) {
      this.notificationService.warning(
        'Sin datos',
        'No hay usuarios para generar el reporte'
      );
      return;
    }

    // Obtener información de la organización del primer usuario
    const firstUser = usersToReport[0];
    const organization = firstUser.organization;

    const organizationName = organization?.organizationName || 'Sistema JASS';
    const organizationLogo = organization?.logo;
    const organizationPhone = organization?.phone;

    console.log('📄 Generando reporte de usuarios...');
    console.log('   - Total de usuarios:', usersToReport.length);
    console.log('   - Organización:', organizationName);
    console.log('   - Organization Object:', organization);
    console.log('   - Logo:', organizationLogo);
    console.log('   - Logo disponible:', organizationLogo ? 'Disponible' : 'No disponible');

    // Generar el reporte
    this.reportService.generateUserReport(
      usersToReport,
      organizationName,
      organizationLogo,
      organizationPhone
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
