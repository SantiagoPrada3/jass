import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { IncidentTypesService } from '../../services/incident-types.service';
import { IncidentTypesReportService } from '../../services/incident-types-report.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { IncidentType, CreateIncidentTypeRequest, UpdateIncidentTypeRequest } from '../../models/incident-type.model';

@Component({
  selector: 'app-incident-types',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, Breadcrumb],
  templateUrl: './incident-types.html',
  styleUrl: './incident-types.css'
})
export class IncidentTypes implements OnInit {
  private readonly incidentTypesService = inject(IncidentTypesService);
  private readonly incidentTypesReportService = inject(IncidentTypesReportService);
  private readonly authService = inject(AuthService);
  
  // Referencias para el template
  Math = Math;
  
  // Señales para el estado reactivo
  incidentTypes = signal<IncidentType[]>([]);
  filteredIncidentTypes = signal<IncidentType[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Notificaciones
  showNotification = signal<boolean>(false);
  notificationMessage = signal<string>('');
  notificationTitle = signal<string>('');
  notificationType = signal<'success' | 'error' | 'info'>('success');
  
  // Filtro de estado
  selectedStatus: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  dropdownOpen = false;
  
  statusOptions = [
    { value: 'ALL' as const, label: 'Todos los tipos' },
    { value: 'ACTIVE' as const, label: 'Solo activos' },
    { value: 'INACTIVE' as const, label: 'Solo inactivos' }
  ];

  // Modal de creación y edición
  showCreateModal = false;
  isEditMode = false;
  editingIncidentType: IncidentType | null = null;
  newIncidentType: CreateIncidentTypeRequest = {
    typeCode: '',
    typeName: '',
    description: '',
    priorityLevel: 'MEDIUM',
    estimatedResolutionTime: 24,
    requiresExternalService: false
  };

  // Modal de confirmación de eliminación
  showDeleteModal = signal<boolean>(false);
  typeToDelete: IncidentType | null = null;

  // Modal de confirmación de restauración
  showRestoreModal = signal<boolean>(false);
  typeToRestore: IncidentType | null = null;

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Reclamos e Incidentes',
      icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Tipos de Incidentes',
      icon: 'M7 7h.01M7 3h5c.512 0 .853.265 1.14.559l1.44 1.44c.293.293.559.634.559 1.14v6.862c0 .506-.266.847-.559 1.14l-1.44 1.44A1.5 1.5 0 0112 16H7c-.512 0-.853-.265-1.14-.559l-1.44-1.44A1.5 1.5 0 014 12.86V6c0-.506.266-.847.559-1.14l1.44-1.44A1.5 1.5 0 017 3z'
    }
  ];

  ngOnInit(): void {
    this.loadIncidentTypes();
  }

  loadIncidentTypes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.incidentTypesService.getAllIncidentTypes().subscribe({
      next: (types) => {
        console.log('Datos recibidos del servicio:', types);
        console.log('Es array?:', Array.isArray(types));
        // Asegurarse de que types sea un array
        const typesArray = Array.isArray(types) ? types : [];
        console.log('Array final:', typesArray);
        this.incidentTypes.set(typesArray);
        this.applyStatusFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar tipos de incidencias:', err);
        this.error.set('Error al cargar los tipos de incidencias. Por favor, intente nuevamente.');
        this.loading.set(false);
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'Baja';
      case 'MEDIUM':
        return 'Media';
      case 'HIGH':
        return 'Alta';
      case 'CRITICAL':
        return 'Crítica';
      default:
        return priority;
    }
  }

  getStatusColor(status: string): string {
    return status === 'ACTIVE' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-red-100 text-red-700 border-red-200';
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  onRefresh(): void {
    this.loadIncidentTypes();
  }

  trackByIncidentType(index: number, item: IncidentType): string {
    return item.id;
  }

  onStatusFilterChange(): void {
    this.applyStatusFilter();
  }

  private applyStatusFilter(): void {
    const allTypes = this.incidentTypes();
    
    // Asegurarse de que allTypes sea un array
    if (!Array.isArray(allTypes)) {
      this.filteredIncidentTypes.set([]);
      return;
    }
    
    if (this.selectedStatus === 'ALL') {
      this.filteredIncidentTypes.set(allTypes);
    } else {
      const filtered = allTypes.filter(type => type.status === this.selectedStatus);
      this.filteredIncidentTypes.set(filtered);
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectStatus(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.selectedStatus = status;
    this.dropdownOpen = false;
    this.applyStatusFilter();
  }

  getStatusDisplayText(): string {
    const option = this.statusOptions.find(opt => opt.value === this.selectedStatus);
    return option?.label || 'Todos los tipos';
  }

  // Métodos para las estadísticas
  getActiveCount(): number {
    const types = this.incidentTypes();
    return Array.isArray(types) ? types.filter(type => type.status === 'ACTIVE').length : 0;
  }

  getInactiveCount(): number {
    const types = this.incidentTypes();
    return Array.isArray(types) ? types.filter(type => type.status === 'INACTIVE').length : 0;
  }

  getCriticalCount(): number {
    const types = this.filteredIncidentTypes();
    return Array.isArray(types) ? types.length : 0;
  }

  // Método para mostrar notificaciones
  showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.notificationTitle.set(title);
    this.notificationMessage.set(message);
    this.notificationType.set(type);
    this.showNotification.set(true);
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
      this.showNotification.set(false);
    }, 4000);
  }

  // Cerrar notificación manualmente
  closeNotification(): void {
    this.showNotification.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.relative');
    if (!dropdown) {
      this.dropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showCreateModal) {
      this.closeCreateModal();
    }
  }

  // Métodos del modal de creación y edición
  openCreateModal(): void {
    this.isEditMode = false;
    this.editingIncidentType = null;
    this.showCreateModal = true;
    this.resetForm();
    this.generateNextCode();
  }

  openEditModal(incidentType: IncidentType): void {
    this.isEditMode = true;
    this.editingIncidentType = incidentType;
    this.showCreateModal = true;
    this.populateFormWithData(incidentType);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.isEditMode = false;
    this.editingIncidentType = null;
    this.resetForm();
  }

  resetForm(): void {
    const currentCode = this.newIncidentType.typeCode; // Preservar el código generado
    this.newIncidentType = {
      typeCode: currentCode || '',
      typeName: '',
      description: '',
      priorityLevel: 'MEDIUM',
      estimatedResolutionTime: 48, // Tiempo por defecto para MEDIUM
      requiresExternalService: false
    };
  }

  populateFormWithData(incidentType: IncidentType): void {
    this.newIncidentType = {
      typeCode: incidentType.typeCode,
      typeName: incidentType.typeName,
      description: incidentType.description,
      priorityLevel: incidentType.priorityLevel,
      estimatedResolutionTime: incidentType.estimatedResolutionTime,
      requiresExternalService: incidentType.requiresExternalService
    };
  }

  onSubmitCreate(): void {
    if (this.isFormValid()) {
      this.loading.set(true);
      
      if (this.isEditMode && this.editingIncidentType) {
        // Actualizar tipo existente
        const updateRequest: UpdateIncidentTypeRequest = {
          id: this.editingIncidentType.id!,
          typeCode: this.newIncidentType.typeCode,
          typeName: this.newIncidentType.typeName,
          description: this.newIncidentType.description,
          priorityLevel: this.newIncidentType.priorityLevel,
          estimatedResolutionTime: this.newIncidentType.estimatedResolutionTime,
          requiresExternalService: this.newIncidentType.requiresExternalService,
          status: this.editingIncidentType.status // Preservar el estado actual
        };

        this.incidentTypesService.updateIncidentType(this.editingIncidentType.id!, updateRequest).subscribe({
          next: (updatedIncidentType) => {
            this.closeCreateModal();
            this.loading.set(false);
            
            const typeCode = updatedIncidentType?.typeCode || this.newIncidentType.typeCode;
            const typeName = updatedIncidentType?.typeName || this.newIncidentType.typeName;
            this.showToast('¡Tipo actualizado!', `${typeCode} - ${typeName} actualizado correctamente`, 'success');
            
            // Recargar la lista completa desde el servidor
            this.loadIncidentTypes();
          },
          error: (err) => {
            console.error('Error al actualizar tipo de incidente:', err);
            this.loading.set(false);
            this.showToast('Error al actualizar', 'No se pudo actualizar el tipo. Por favor, intente nuevamente.', 'error');
          }
        });
      } else {
        // Crear nuevo tipo
        this.incidentTypesService.createIncidentType(this.newIncidentType).subscribe({
          next: (newType) => {
            this.closeCreateModal();
            this.loading.set(false);
            
            const typeCode = newType?.typeCode || this.newIncidentType.typeCode;
            const typeName = newType?.typeName || this.newIncidentType.typeName;
            this.showToast('¡Tipo creado!', `${typeCode} - ${typeName} creado correctamente`, 'success');
            
            // Recargar la lista completa desde el servidor
            this.loadIncidentTypes();
          },
          error: (err) => {
            console.error('Error al crear tipo de incidente:', err);
            this.loading.set(false);
            this.showToast('Error al crear', 'No se pudo crear el tipo. Por favor, intente nuevamente.', 'error');
          }
        });
      }
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.newIncidentType.typeCode.trim() &&
      this.newIncidentType.typeName.trim() &&
      this.newIncidentType.description.trim() &&
      this.newIncidentType.priorityLevel &&
      this.newIncidentType.estimatedResolutionTime > 0
    );
  }

  generateNextCode(): void {
    const currentTypes = this.incidentTypes();
    
    if (currentTypes.length === 0) {
      // Si no hay tipos, empezar con INC001
      this.newIncidentType.typeCode = 'INC001';
      return;
    }

    // Extraer todos los números de los códigos existentes
    const existingNumbers = currentTypes
      .map(type => {
        const match = type.typeCode.match(/^INC(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b);

    // Encontrar el próximo número disponible
    let nextNumber = 1;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    // Formatear el código con ceros a la izquierda (3 dígitos)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    this.newIncidentType.typeCode = `INC${formattedNumber}`;
  }

  onPriorityChange(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | ''): void {
    // Asignar horas automáticamente según la prioridad
    switch (priority) {
      case 'LOW':
        this.newIncidentType.estimatedResolutionTime = 72;
        break;
      case 'MEDIUM':
        this.newIncidentType.estimatedResolutionTime = 48;
        break;
      case 'HIGH':
        this.newIncidentType.estimatedResolutionTime = 24;
        break;
      case 'CRITICAL':
        this.newIncidentType.estimatedResolutionTime = 6;
        break;
      default:
        this.newIncidentType.estimatedResolutionTime = 24; // Valor por defecto
        break;
    }
  }

  // Método para ver detalles
  openViewDetailsModal(incidentType: IncidentType): void {
    // Aquí abrirías un modal de detalles (por ahora usamos el modal de edición en modo lectura)
    this.isEditMode = false;
    this.editingIncidentType = incidentType;
    this.showCreateModal = true;
    this.populateFormWithData(incidentType);
  }

  // Método para activar el modo edición desde el modal de visualización
  enableEditMode(): void {
    this.isEditMode = true;
  }

  // Método para cancelar la edición y volver al modo visualización
  cancelEdit(): void {
    if (this.editingIncidentType) {
      this.isEditMode = false;
      // Restaurar los datos originales
      this.populateFormWithData(this.editingIncidentType);
    }
  }

  // Método para restaurar un tipo inactivo
  onRestore(incidentType: IncidentType): void {
    this.typeToRestore = incidentType;
    this.showRestoreModal.set(true);
  }

  // Confirmar restauración
  confirmRestore(): void {
    if (!this.typeToRestore) return;
    
    const incidentType = this.typeToRestore;
    this.showRestoreModal.set(false);
    this.typeToRestore = null;
    this.loading.set(true);
    
    // Restaurar usando PATCH
    this.incidentTypesService.restoreIncidentType(incidentType.id).subscribe({
      next: (restoredType) => {
        const typeCode = restoredType?.typeCode || incidentType?.typeCode || 'Tipo';
        const typeName = restoredType?.typeName || incidentType?.typeName || '';
        this.showToast('¡Tipo restaurado!', `${typeCode} - ${typeName} restaurado correctamente`, 'success');
        
        // Recargar toda la tabla desde el servidor
        this.loadIncidentTypes();
        console.log('Tipo restaurado exitosamente:', restoredType);
      },
      error: (err) => {
        console.error('Error al restaurar tipo:', err);
        this.loading.set(false);
        this.showToast('Error al restaurar', 'No se pudo restaurar el tipo. Por favor, intente nuevamente.', 'error');
      }
    });
  }

  // Cancelar restauración
  cancelRestore(): void {
    this.showRestoreModal.set(false);
    this.typeToRestore = null;
  }

  /**
   * Descarga el reporte PDF de un tipo de incidencia individual
   */
  async downloadIncidentTypeReport(incidentType: IncidentType): Promise<void> {
    try {
      console.log('📥 Descargando reporte para tipo de incidencia:', incidentType.id);
      
      // Obtener el nombre de la organización
      let organizationName = 'JASS RINCONADA DE CONTA';
      let organizationId: string | undefined;
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser?.organizationId) {
        organizationId = currentUser.organizationId;
        try {
          const orgData = await firstValueFrom(this.incidentTypesService.getOrganizationDetails(currentUser.organizationId));
          if (orgData && (orgData.organizationName || orgData.data?.organizationName)) {
            organizationName = orgData.organizationName || orgData.data?.organizationName || organizationName;
          }
        } catch (error) {
          console.log('No se pudo obtener el nombre de la organización, usando nombre por defecto');
        }
      }
      
      // Generar el reporte para un solo tipo de incidencia
      await this.incidentTypesReportService.generateIncidentTypesReport(
        [incidentType],
        organizationName,
        organizationId
      );
      
      console.log('✅ Reporte generado exitosamente');
      this.showToast('Reporte generado', 'El reporte PDF ha sido descargado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error al generar reporte:', error);
      this.showToast('Error al generar reporte', 'No se pudo generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  /**
   * Descarga el reporte PDF de tipos de incidencias
   */
  async downloadIncidentTypesReport(): Promise<void> {
    try {
      console.log('📥 Descargando reporte de tipos de incidencias');
      
      // Obtener el nombre de la organización
      let organizationName = 'JASS RINCONADA DE CONTA';
      let organizationId: string | undefined;
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser?.organizationId) {
        organizationId = currentUser.organizationId;
        try {
          const orgData = await firstValueFrom(this.incidentTypesService.getOrganizationDetails(currentUser.organizationId));
          if (orgData && (orgData.organizationName || orgData.data?.organizationName)) {
            organizationName = orgData.organizationName || orgData.data?.organizationName || organizationName;
          }
        } catch (error) {
          console.log('No se pudo obtener el nombre de la organización, usando nombre por defecto');
        }
      }
      
      // Generar el reporte con todos los tipos de incidencias
      await this.incidentTypesReportService.generateIncidentTypesReport(
        this.incidentTypes(),
        organizationName,
        organizationId
      );
      
      console.log('✅ Reporte generado exitosamente');
      this.showToast('Reporte generado', 'El reporte PDF ha sido descargado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error al generar reporte:', error);
      this.showToast('Error al generar reporte', 'No se pudo generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  // Método para eliminar (cambiar a inactivo)
  onDelete(incidentType: IncidentType): void {
    this.typeToDelete = incidentType;
    this.showDeleteModal.set(true);
  }

  // Confirmar eliminación
  confirmDelete(): void {
    if (!this.typeToDelete) return;
    
    const incidentType = this.typeToDelete;
    const typeCode = incidentType?.typeCode || 'Tipo';
    const typeName = incidentType?.typeName || '';
    
    this.showDeleteModal.set(false);
    this.typeToDelete = null;
    this.loading.set(true);
    
    // Eliminar usando DELETE (soft delete en el backend)
    this.incidentTypesService.deleteIncidentType(incidentType.id).subscribe({
      next: () => {
        this.showToast('¡Tipo eliminado!', `${typeCode} - ${typeName} eliminado correctamente`, 'success');
        
        // Recargar toda la tabla desde el servidor
        this.loadIncidentTypes();
        console.log('Tipo eliminado exitosamente (soft delete)');
      },
      error: (err) => {
        console.error('Error al eliminar tipo:', err);
        this.loading.set(false);
        this.showToast('Error al eliminar', 'No se pudo eliminar el tipo. Por favor, intente nuevamente.', 'error');
      }
    });
  }

  // Cancelar eliminación
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.typeToDelete = null;
  }
}
