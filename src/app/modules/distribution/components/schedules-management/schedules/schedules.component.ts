import { Component, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/components/ui/breadcrumb/breadcrumb';
import { DistributionApi } from '../../../services/distribution-api';
import { AuthService } from '../../../../../core/auth/services/auth';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Schedule } from '../../../models/schedules.model';
import { Status } from '../../../models/api-response.model';
import { ApiResponse } from '../../../../../shared/models/api-response.model';
// Importar DistributionOrganizationApi y sus interfaces
import { DistributionOrganizationApi, Zone, Street, OrganizationData } from '../../../services/organization-api.service';
// Importar los nuevos modales
import { CreateScheduleModalComponent } from '../create-schedule-modal/create-schedule-modal.component';
import { UpdateScheduleModalComponent } from '../update-schedule-modal/update-schedule-modal.component';
import { ViewScheduleModalComponent } from '../view-schedule-modal/view-schedule-modal.component';
// Importar el modal de confirmación
import { ScheduleConfirmationModal, ConfirmationData } from '../confirmation-modal/confirmation-modal';
// Importar jsPDF y autotable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces para datos adicionales
interface ZoneData {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
}

interface StreetData {
  streetId: string;
  streetType: string;
  streetName: string;
}

@Component({
  selector: 'app-schedules-management',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateScheduleModalComponent, UpdateScheduleModalComponent, ViewScheduleModalComponent, ScheduleConfirmationModal, Breadcrumb],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.css'
})
export class SchedulesManagement implements OnInit, OnChanges {
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
      label: 'Horarios',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ];

  schedules: Schedule[] = [];
  filteredSchedules: Schedule[] = [];
  paginatedSchedules: Schedule[] = [];

  // Datos de la organización
  organizationData: OrganizationData | null = null;

  // Filtros
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Estados
  isLoading: boolean = false;
  isCreateModalOpen: boolean = false;
  isUpdateModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  private _isConfirmationModalOpen: boolean = false;

  get isConfirmationModalOpen(): boolean {
    return this._isConfirmationModalOpen;
  }

  set isConfirmationModalOpen(value: boolean) {
    console.log('[SchedulesManagement] Setting isConfirmationModalOpen to', value);
    this._isConfirmationModalOpen = value;
    console.log('[SchedulesManagement] _isConfirmationModalOpen is now', this._isConfirmationModalOpen);
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // Datos para el modal de confirmación
  confirmationData: ConfirmationData = {
    title: 'Confirmar acción',
    message: '¿Está seguro de que desea continuar?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };

  // Horario pendiente de acción
  pendingScheduleAction: Schedule | null = null;

  // Dropdowns custom
  isStatusDropdownOpen: boolean = false;

  // Datos del formulario de edición
  editingSchedule: Schedule | null = null;
  viewingSchedule: Schedule | null = null;

  // Add enum values so they can be accessed in the template
  Status = Status;

  // Referencia a Math para usar en el template
  Math = Math;

  // Datos adicionales para mostrar nombres
  zonesData: Map<string, ZoneData> = new Map();
  streetsData: Map<string, StreetData> = new Map();

  // Datos para el formulario de edición
  availableZones: Zone[] = [];
  availableStreets: Street[] = [];
  isLoadingStreets: boolean = false;

  // Propiedades calculadas para las estadísticas
  get activeSchedulesCount(): number {
    return this.schedules.filter(s => s.status === Status.ACTIVE).length;
  }

  get inactiveSchedulesCount(): number {
    return this.schedules.filter(s => s.status === Status.INACTIVE).length;
  }

  // Propiedad para verificar si hay búsqueda o filtro aplicado
  get hasSearchOrFilter(): boolean {
    return this.searchTerm.trim() !== '' || this.statusFilter !== 'all';
  }

  constructor(
    private distributionApi: DistributionApi,
    private authService: AuthService,
    private notificationService: NotificationService,
    private organizationApi: DistributionOrganizationApi,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('[SchedulesManagement] ngOnInit called');
    this.loadSchedules();
    this.loadOrganizationData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[SchedulesManagement] ngOnChanges called', changes);
    if (changes['_isConfirmationModalOpen']) {
      console.log('[SchedulesManagement] _isConfirmationModalOpen changed to', changes['_isConfirmationModalOpen'].currentValue);
    }
  }

  /**
   * Cargar todos los horarios
   */
  loadSchedules(): void {
    this.isLoading = true;
    const organizationId = this.getCurrentOrganizationId();

    console.log('[SchedulesManagement] Loading schedules for organization:', organizationId);

    if (!organizationId || organizationId === 'default-org') {
      console.warn('[SchedulesManagement] No valid organization ID found');
      this.notificationService.error('Error', 'No se pudo identificar la organización');
      this.isLoading = false;
      return;
    }

    this.distributionApi.getAllSchedules(organizationId).subscribe({
      next: (response) => {
        console.log('[SchedulesManagement] Schedules API response:', response);
        // Verificar si la respuesta es exitosa (puede tener status o success)
        if (response && (response.success === true || response.status === true)) {
          console.log('[SchedulesManagement] API response is successful');
          // Obtener los datos de la respuesta
          const data = response.data;
          console.log('[SchedulesManagement] Raw data from API:', data);

          // Verificar si la respuesta contiene un array
          if (data && Array.isArray(data)) {
            console.log('[SchedulesManagement] Data is array with', data.length, 'items');
            // Verificar la estructura del primer elemento
            if (data.length > 0) {
              console.log('[SchedulesManagement] First item structure:', data[0]);
              console.log('[SchedulesManagement] First item zoneId:', data[0].zoneId);
              console.log('[SchedulesManagement] First item streetId:', data[0].streetId);
            }
            // Convertir los datos al tipo Schedule
            this.schedules = data as Schedule[];
          } else if (data) {
            // Si es un solo objeto, convertirlo a array
            console.log('[SchedulesManagement] Data is single object');
            console.log('[SchedulesManagement] Object zoneId:', (data as any).zoneId);
            console.log('[SchedulesManagement] Object streetId:', (data as any).streetId);
            this.schedules = [data as Schedule];
          } else {
            console.log('[SchedulesManagement] No data received');
            this.schedules = [];
          }

          console.log('[SchedulesManagement] Loaded schedules count:', this.schedules.length);
          this.applyFilters();
        } else {
          console.error('[SchedulesManagement] API returned error or invalid response:', response);
          // Extraer mensaje de error
          let errorMessage = 'No se pudieron cargar los horarios';
          if (response) {
            if (response.message) {
              errorMessage = response.message;
            } else if (response.error && response.error.message) {
              errorMessage = response.error.message;
            }
          }
          console.error('[SchedulesManagement] API error message:', errorMessage);
          this.notificationService.error('Error', errorMessage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[SchedulesManagement] Error loading schedules:', error);
        // Handle HTTP errors
        let errorMessage = 'No se pudieron cargar los horarios';
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
          // Mostrar detalles del error si están disponibles
          if (error.error && error.error.message) {
            errorMessage += ` Detalles: ${error.error.message}`;
          }
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
   * Cargar datos de la organización para obtener zonas y calles
   */
  loadOrganizationData(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      console.warn('[SchedulesManagement] No valid organization ID for loading organization data');
      return;
    }

    console.log('[SchedulesManagement] Loading organization data for ID:', organizationId);
    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        console.log('[SchedulesManagement] Organization API response:', response);
        if (response.status && response.data) {
          this.organizationData = response.data;
          // Cargar zonas
          if (response.data.zones) {
            console.log('[SchedulesManagement] Loading zones and streets for', response.data.zones.length, 'zones');
            response.data.zones.forEach((zone: any) => {
              this.zonesData.set(zone.zoneId, {
                zoneId: zone.zoneId,
                zoneCode: zone.zoneCode,
                zoneName: zone.zoneName
              });

              // Cargar calles para cada zona
              if (zone.streets) {
                console.log('[SchedulesManagement] Loading', zone.streets.length, 'streets for zone', zone.zoneCode);
                zone.streets.forEach((street: any) => {
                  console.log('[SchedulesManagement] Loading street:', street);
                  // Asegurarnos de que el streetId sea un string
                  const streetIdKey = street.streetId.toString();
                  console.log('[SchedulesManagement] Using streetId key:', streetIdKey);
                  this.streetsData.set(streetIdKey, {
                    streetId: street.streetId,
                    streetType: street.streetType,
                    streetName: street.streetName
                  });
                });
              }
            });
            console.log('[SchedulesManagement] Total streets loaded:', this.streetsData.size);
            console.log('[SchedulesManagement] All street keys:', Array.from(this.streetsData.keys()));
          }
          console.log('[SchedulesManagement] Organization data loaded successfully');
        } else {
          console.error('[SchedulesManagement] Invalid response from organization API:', response);
          let errorMessage = 'No se pudo cargar la información de la organización';
          if (response && typeof response === 'object' && 'message' in response && typeof (response as any).message === 'string') {
            errorMessage += ': ' + (response as any).message;
          } else {
            errorMessage += ': Respuesta inválida del servidor';
          }
          this.notificationService.error('Error', errorMessage);
        }
      },
      error: (error: any) => {
        console.error('[SchedulesManagement] Error loading organization data:', error);
        let errorMessage = 'Error al cargar los datos de la organización';

        // Manejo específico para diferentes códigos de error
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
        } else if (error.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado. No tiene permisos para acceder a los datos de esta organización.';
        } else if (error.status === 404) {
          errorMessage = 'No se encontró la organización especificada.';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor al cargar los datos de la organización. Por favor, intente nuevamente.';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status) {
          errorMessage += ` (Código de error: ${error.status})`;
        }

        this.notificationService.error('Error', errorMessage);
      }
    });
  }

  /**
   * Aplicar filtros de búsqueda y estado
   */
  applyFilters(): void {
    let filtered = [...this.schedules];

    // Filtro de estado
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(schedule => schedule.status === Status.ACTIVE);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(schedule => schedule.status === Status.INACTIVE);
    }

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(schedule =>
        schedule.scheduleCode.toLowerCase().includes(term) ||
        schedule.scheduleName.toLowerCase().includes(term)
      );
    }

    this.filteredSchedules = filtered;
    this.updatePagination();
  }

  /**
   * Actualizar paginación
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSchedules.length / this.pageSize);

    // Verificar si la página actual es válida
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }

    // Calcular índices para la página actual
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    // Obtener horarios para la página actual
    this.paginatedSchedules = this.filteredSchedules.slice(startIndex, endIndex);
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

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
    this.applyFilters();
  }

  /**
   * Obtener ID de organización del usuario actual
   */
  getCurrentOrganizationId(): string {
    const currentUser = this.authService.getCurrentUser();
    console.log('[SchedulesManagement] Current user:', currentUser);
    const orgId = currentUser?.organizationId;
    console.log('[SchedulesManagement] Organization ID:', orgId);
    return orgId || 'default-org';
  }

  /**
   * Obtener etiqueta del estado
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case Status.ACTIVE:
        return 'Activo';
      case Status.INACTIVE:
        return 'Inactivo';
      default:
        return status;
    }
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case Status.ACTIVE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case Status.INACTIVE:
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Abrir modal de creación
   */
  openCreateModal(): void {
    console.log('[SchedulesManagement] Opening create modal');
    this.isCreateModalOpen = true;
  }

  /**
   * Cerrar modal de creación
   */
  closeCreateModal(): void {
    console.log('[SchedulesManagement] Closing create modal');
    this.isCreateModalOpen = false;
  }

  /**
   * Manejar cambios en los días de la semana
   */
  onDayChange(event: any, day: string, daysArray: string[]): void {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Añadir el día si no está ya en el array
      if (!daysArray.includes(day)) {
        daysArray.push(day);
      }
    } else {
      // Remover el día si está en el array
      const index = daysArray.indexOf(day);
      if (index > -1) {
        daysArray.splice(index, 1);
      }
    }
  }

  /**
   * Manejar cambio de zona en el formulario de edición
   */
  onZoneChange(event: any): void {
    const zoneId = event.target.value;

    if (zoneId && this.editingSchedule) {
      this.isLoadingStreets = true;
      // Limpiar selección de calle anterior
      this.editingSchedule.streetId = '';

      // Cargar calles de la zona seleccionada
      const organizationId = this.getCurrentOrganizationId();
      this.organizationApi.getActiveStreetsByZone(organizationId, zoneId).subscribe({
        next: (streets) => {
          this.availableStreets = streets;
          this.isLoadingStreets = false;
        },
        error: (error) => {
          console.error('[SchedulesManagement] Error loading streets:', error);
          this.notificationService.error('Error', 'Error al cargar las calles de la zona seleccionada');
          this.isLoadingStreets = false;
        }
      });
    } else {
      this.availableStreets = [];
      if (this.editingSchedule) {
        this.editingSchedule.streetId = '';
      }
    }
  }

  /**
   * Cargar zonas disponibles cuando se abre el modal de edición
   */
  loadAvailableZones(): void {
    const organizationId = this.getCurrentOrganizationId();
    this.organizationApi.getActiveZonesByOrganization(organizationId).subscribe({
      next: (zones) => {
        this.availableZones = zones;
      },
      error: (error) => {
        console.error('[SchedulesManagement] Error loading zones:', error);
        this.notificationService.error('Error', 'Error al cargar las zonas disponibles');
      }
    });
  }

  /**
   * Abrir modal de actualización (nuevo componente)
   */
  openUpdateModal(schedule: Schedule): void {
    console.log('[SchedulesManagement] openUpdateModal llamado con schedule:', schedule);

    // Verificar que el horario tenga un ID válido
    if (!schedule || !schedule.id) {
      console.error('[SchedulesManagement] Horario inválido o sin ID');
      this.notificationService.error('Error', 'Horario no válido. Puede que ya haya sido eliminado.');
      return;
    }

    // Verificar que el horario aún exista en la lista
    const scheduleExists = this.schedules.some(s => s.id === schedule.id);
    if (!scheduleExists) {
      console.warn('[SchedulesManagement] Horario no encontrado en la lista local, pero procederemos con la operación');
      // No detenemos la operación, dejamos que el backend decida si el horario existe
    }

    this.editingSchedule = { ...schedule };
    this.isUpdateModalOpen = true;
    console.log('[SchedulesManagement] editingSchedule establecido a:', this.editingSchedule);
    console.log('[SchedulesManagement] isUpdateModalOpen establecido a:', this.isUpdateModalOpen);
  }

  /**
   * Cerrar modal de actualización
   */
  closeUpdateModal(): void {
    console.log('[SchedulesManagement] closeUpdateModal llamado');
    this.isUpdateModalOpen = false;
    this.editingSchedule = null;
    console.log('[SchedulesManagement] isUpdateModalOpen establecido a:', this.isUpdateModalOpen);
    console.log('[SchedulesManagement] editingSchedule establecido a:', this.editingSchedule);
  }

  /**
   * Manejar cuando se crea un nuevo horario desde el modal
   */
  onScheduleCreated(): void {
    console.log('[SchedulesManagement] Schedule created, reloading schedules');
    this.loadSchedules(); // Recargar la lista de horarios
    this.closeCreateModal(); // Cerrar el modal
    // Mostrar mensaje de éxito adicional
    this.notificationService.success('Éxito', 'Horario creado y registrado correctamente');
  }

  /**
   * Manejar cuando se actualiza un horario desde el modal
   */
  onScheduleUpdated(): void {
    console.log('[SchedulesManagement] onScheduleUpdated llamado');
    console.log('[SchedulesManagement] Schedule updated, reloading schedules');
    this.loadSchedules(); // Recargar la lista de horarios
    this.closeUpdateModal(); // Cerrar el modal de actualización
    // Mostrar mensaje de éxito adicional
    this.notificationService.success('Éxito', 'Horario actualizado correctamente');
  }

  /**
   * Actualizar horario
   */
  updateSchedule(): void {
    console.log('[SchedulesManagement] Iniciando actualización de horario');

    if (!this.editingSchedule) {
      console.error('[SchedulesManagement] No hay horario para actualizar');
      this.notificationService.error('Error', 'No hay horario para actualizar');
      return;
    }

    console.log('[SchedulesManagement] Horario a actualizar:', this.editingSchedule);

    // Verificar que el horario aún exista en la lista
    const scheduleExists = this.schedules.some(s => s.id === this.editingSchedule!.id);
    if (!scheduleExists) {
      console.warn('[SchedulesManagement] Horario no encontrado en la lista local, pero procederemos con la operación');
      // No detenemos la operación, dejamos que el backend decida si el horario existe
    }

    // Calcular la duración antes de enviar
    if (this.editingSchedule.startTime && this.editingSchedule.endTime) {
      const [startHours, startMinutes] = this.editingSchedule.startTime.split(':').map(Number);
      const [endHours, endMinutes] = this.editingSchedule.endTime.split(':').map(Number);

      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      // Si la hora de fin es menor (caso de horario nocturno que cruza la medianoche)
      const durationMinutes = endTotalMinutes > startTotalMinutes
        ? endTotalMinutes - startTotalMinutes
        : (24 * 60 - startTotalMinutes) + endTotalMinutes;

      // Convertir a horas con 2 decimales
      this.editingSchedule.durationHours = parseFloat((durationMinutes / 60).toFixed(2));
    }

    console.log('[SchedulesManagement] Duración calculada:', this.editingSchedule.durationHours);

    // Crear el objeto de solicitud
    const updateRequest: any = {
      organizationId: this.editingSchedule.organizationId,
      zoneId: this.editingSchedule.zoneId,
      streetId: this.editingSchedule.streetId,
      scheduleName: this.editingSchedule.scheduleName,
      daysOfWeek: this.editingSchedule.daysOfWeek,
      startTime: this.editingSchedule.startTime,
      endTime: this.editingSchedule.endTime,
      durationHours: this.editingSchedule.durationHours
    };

    // Incluir scheduleId y scheduleCode si existen
    if (this.editingSchedule.id) {
      updateRequest.scheduleId = this.editingSchedule.id;
    }

    if (this.editingSchedule.scheduleCode) {
      updateRequest.scheduleCode = this.editingSchedule.scheduleCode;
    }

    console.log('[SchedulesManagement] Solicitud de actualización preparada:', updateRequest);
    console.log('[SchedulesManagement] ID del horario:', this.editingSchedule.id);

    this.distributionApi.updateSchedule(this.editingSchedule.id, updateRequest).subscribe({
      next: (response: any) => {
        console.log('[SchedulesManagement] Respuesta de actualización de horario:', response);

        // Verificar si la respuesta tiene el formato esperado de ApiResponse
        const isApiResponseFormat = response && (typeof response === 'object') &&
          ('success' in response || 'status' in response || 'data' in response);

        console.log('[SchedulesManagement] ¿Formato ApiResponse?', isApiResponseFormat);

        if (isApiResponseFormat) {
          // Es una respuesta en formato ApiResponse
          const isSuccess = response.success === true || response.status === true;
          console.log('[SchedulesManagement] ¿Respuesta exitosa?', isSuccess);

          if (isSuccess) {
            console.log('[SchedulesManagement] Horario actualizado exitosamente');
            this.notificationService.success('Éxito', 'Horario actualizado correctamente');
            this.loadSchedules();
            this.closeUpdateModal();
          } else {
            // Manejar error estructurado del backend
            let errorMessage = 'No se pudo actualizar el horario';

            // Verificar si hay mensaje de error específico del backend
            if (response.error && response.error.message) {
              errorMessage = response.error.message;
            } else if (response.message) {
              errorMessage = response.message;
            }

            console.error('[SchedulesManagement] Error de la API:', errorMessage);
            console.log('[SchedulesManagement] Respuesta completa de error:', response);

            // Manejar específicamente el caso de horario no encontrado
            if (errorMessage.includes('not found') || errorMessage.includes('no encontrado')) {
              this.notificationService.error('Error', 'No se encontró el horario especificado. Puede que ya haya sido eliminado.');
              this.loadSchedules(); // Recargar la lista para actualizarla
            } else {
              this.notificationService.error('Error', errorMessage);
            }
          }
        } else {
          // No es una respuesta en formato ApiResponse, asumir éxito si hay datos
          console.log('[SchedulesManagement] Respuesta no estándar, verificando contenido...');

          // Si la respuesta contiene datos de horario, asumir éxito
          if (response && (response.id || response.scheduleCode || response.scheduleName)) {
            console.log('[SchedulesManagement] Horario actualizado exitosamente (respuesta no estándar)');
            this.notificationService.success('Éxito', 'Horario actualizado correctamente');
            this.loadSchedules();
            this.closeUpdateModal();
          } else {
            // Si no hay datos de horario, asumir error
            const errorMessage = response && typeof response === 'string' ? response : 'No se pudo actualizar el horario';
            console.error('[SchedulesManagement] Error de la API (respuesta no estándar):', errorMessage);
            console.log('[SchedulesManagement] Respuesta completa:', response);

            // Manejar específicamente el caso de horario no encontrado
            if (errorMessage.includes('not found') || errorMessage.includes('no encontrado')) {
              this.notificationService.error('Error', 'No se encontró el horario especificado. Puede que ya haya sido eliminado.');
              this.loadSchedules(); // Recargar la lista para actualizarla
            } else {
              this.notificationService.error('Error', errorMessage);
            }
          }
        }
      },
      error: (error) => {
        console.error('[SchedulesManagement] Error updating schedule:', error);
        // Mostrar más detalles del error
        let errorMsg = 'Error al actualizar el horario';

        // Manejo específico para diferentes códigos de error
        if (error.status === 500) {
          errorMsg = 'Error interno del servidor al actualizar el horario. Por favor, intente nuevamente o contacte al administrador del sistema.';
          // Registrar información adicional para debugging
          console.error('[SchedulesManagement] Detalles del error 500:', {
            url: error.url,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText
          });
        } else if (error.status === 400) {
          errorMsg = 'Datos inválidos para actualizar el horario. Verifique que todos los campos estén correctamente completados.';
        } else if (error.status === 404) {
          errorMsg = 'No se encontró el horario especificado. Puede que ya haya sido eliminado.';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para actualizar este horario.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (error.error && error.error.message) {
          // Si el backend devuelve un error estructurado, usar ese mensaje
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        } else if (error.status) {
          errorMsg += ' (Código de error: ' + error.status + ')';
        }

        console.log('[SchedulesManagement] Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });

        // Registrar error adicional para debugging
        if (error.error && typeof error.error === 'object') {
          console.log('[SchedulesManagement] Detalles del error del servidor:', JSON.stringify(error.error, null, 2));
        }

        this.notificationService.error('Error', errorMsg);
      }
    });
  }

  /**
   * Métodos para dropdowns custom
   */
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
      case 'all': return 'Todos los horarios';
      case 'active': return 'Solo activos';
      case 'inactive': return 'Solo inactivos';
      default: return 'Todos los horarios';
    }
  }

  /**
   * Tracking function para ngFor
   */
  trackByScheduleId(index: number, schedule: Schedule): string {
    return schedule.id;
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
   * Obtener el nombre descriptivo de la zona
   */
  getZoneName(zoneId: string): string {
    console.log('[SchedulesManagement] Getting zone name for ID:', zoneId);
    console.log('[SchedulesManagement] Available zones:', Array.from(this.zonesData.keys()));

    if (!zoneId) {
      console.log('[SchedulesManagement] No zone ID provided');
      return 'N/A';
    }

    const zone = this.zonesData.get(zoneId);
    console.log('[SchedulesManagement] Found zone:', zone);

    if (zone) {
      const result = `${zone.zoneName}`;
      console.log('[SchedulesManagement] Returning zone name:', result);
      return result;
    } else {
      console.log('[SchedulesManagement] Zone not found for ID:', zoneId);
      return 'N/A';
    }
  }

  /**
   * Obtener el nombre descriptivo de la calle
   */
  getStreetName(streetId: string): string {
    console.log('[SchedulesManagement] Getting street name for ID:', streetId);
    console.log('[SchedulesManagement] Available streets:', Array.from(this.streetsData.keys()));

    if (!streetId) {
      console.log('[SchedulesManagement] No street ID provided');
      return 'N/A';
    }

    const street = this.streetsData.get(streetId);
    console.log('[SchedulesManagement] Found street:', street);

    if (street) {
      const result = `${street.streetType} ${street.streetName}`;
      console.log('[SchedulesManagement] Returning street name:', result);
      return result;
    } else {
      console.log('[SchedulesManagement] Street not found for ID:', streetId);
      return 'N/A';
    }
  }

  /**
   * Verificar si la hora de fin es válida (mayor que la hora de inicio) para el formulario de edición
   */
  isEndTimeValidForEdit(): boolean {
    if (!this.editingSchedule || !this.editingSchedule.startTime || !this.editingSchedule.endTime) return true;

    // Convertir horas a minutos para comparar
    const [startHours, startMinutes] = this.editingSchedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.editingSchedule.endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes > startTotalMinutes;
  }

  /**
   * Método de prueba para abrir el modal de visualización
   */
  testViewModal(): void {
    console.log('[SchedulesManagement] testViewModal llamado');
    // Crear un horario de prueba
    const testSchedule: Schedule = {
      id: 'test-id',
      scheduleCode: 'TEST001',
      scheduleName: 'Horario de prueba',
      daysOfWeek: ['Lunes', 'Miércoles', 'Viernes'],
      startTime: '08:00',
      endTime: '12:00',
      durationHours: 4,
      organizationId: 'org-id',
      zoneId: 'zone-id',
      streetId: 'street-id',
      status: Status.ACTIVE
    };

    this.viewingSchedule = testSchedule;
    this.isViewModalOpen = true;

    console.log('[SchedulesManagement] Modal de prueba abierto');
  }

  /**
   * Ver detalles del horario
   */
  viewScheduleDetails(schedule: Schedule): void {
    console.log('[SchedulesManagement] viewScheduleDetails llamado con schedule:', schedule);

    // Verificar que el horario tenga un ID válido
    if (!schedule || !schedule.id) {
      console.error('[SchedulesManagement] Horario inválido o sin ID');
      this.notificationService.error('Error', 'Horario no válido.');
      return;
    }

    // Establecer el horario para visualizar
    this.viewingSchedule = { ...schedule };
    this.isViewModalOpen = true;

    console.log('[SchedulesManagement] Abriendo modal de visualización para horario:', this.viewingSchedule);
    console.log('[SchedulesManagement] Estado del modal:', this.isViewModalOpen);
    console.log('[SchedulesManagement] Zonas disponibles:', Array.from(this.zonesData.keys()));
    console.log('[SchedulesManagement] Calles disponibles:', Array.from(this.streetsData.keys()));

    // Forzar la detección de cambios
    setTimeout(() => {
      console.log('[SchedulesManagement] Verificación post-timeout - Modal abierto:', this.isViewModalOpen);
    }, 0);
  }

  /**
   * Cerrar modal de visualización
   */
  closeViewModal(): void {
    console.log('[SchedulesManagement] Cerrando modal de visualización');
    this.isViewModalOpen = false;
    this.viewingSchedule = null;
    console.log('[SchedulesManagement] Modal cerrado. Estado:', this.isViewModalOpen);

    // Forzar la detección de cambios
    setTimeout(() => {
      console.log('[SchedulesManagement] Verificación post-timeout - Modal cerrado:', !this.isViewModalOpen);
    }, 0);
  }

  /**
   * Generar reporte de horarios en PDF
   */
  generateReport(): void {
    console.log('Generando reporte de horarios en PDF');

    // Verificar que ya tengamos los datos de la organización
    if (!this.organizationData) {
      this.notificationService.error('Error', 'No se han cargado los datos de la organización');
      return;
    }

    // Generar el PDF con los datos de la organización y horarios
    this.generatePdfReport(this.organizationData, this.filteredSchedules);
  }

  /**
   * Generar PDF con los datos de la organización y horarios
   */
  private generatePdfReport(organizationData: any, schedules: Schedule[]): void {
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
      doc.text('REPORTE DE HORARIOS', pageWidth / 2, 55, { align: 'center' });

      // Agregar información del reporte
      const currentDate = new Date();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${currentDate.toLocaleDateString('es-ES')}`, 20, 65);
      doc.text(`Total de horarios: ${schedules.length}`, pageWidth - 20, 65, { align: 'right' });

      // Preparar datos para la tabla (sin la columna de estado)
      const tableData = schedules.map((schedule, index) => [
        (index + 1).toString(),
        schedule.scheduleCode || '',
        schedule.scheduleName || '',
        this.getZoneName(schedule.zoneId) || '',
        this.getStreetName(schedule.streetId) || '',
        schedule.daysOfWeek?.join(', ') || 'Todos los días',
        `${schedule.startTime || ''} - ${schedule.endTime || ''}`,
        `${schedule.durationHours || 0} horas`
      ]);

      // Agregar tabla de horarios usando autoTable correctamente (sin la columna de estado)
      autoTable(doc, {
        head: [['#', 'Código', 'Nombre', 'Zona', 'Calle', 'Días', 'Horario', 'Duración']],
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
        margin: { horizontal: 15 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // #
          1: { cellWidth: 18 }, // Código
          2: { cellWidth: 30 }, // Nombre
          3: { cellWidth: 25 }, // Zona
          4: { cellWidth: 25 }, // Calle
          5: { cellWidth: 25 }, // Días
          6: { cellWidth: 25, halign: 'center' }, // Horario
          7: { cellWidth: 25, halign: 'center' }  // Duración
        }
      });

      // Agregar pie de página (sin resumen)
      this.addFooterToPdf(doc, pageWidth, pageHeight);

      // Guardar el PDF
      const filename = `reporte-horarios-${organizationData.organizationCode}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  /**
   * Cambiar estado de horario (desactivar) con confirmación
   */
  toggleScheduleStatus(schedule: Schedule): void {
    console.log('[SchedulesManagement] toggleScheduleStatus llamado con schedule:', schedule);

    // Verificar que el horario tenga un ID válido
    if (!schedule || !schedule.id) {
      console.error('[SchedulesManagement] Horario inválido o sin ID');
      this.notificationService.error('Error', 'Horario no válido.');
      return;
    }

    // Preparar datos para el modal de confirmación
    this.pendingScheduleAction = schedule;
    this.confirmationData = {
      title: 'Desactivar Horario',
      message: `¿Está seguro de que desea desactivar el horario "${schedule.scheduleName}"?`,
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'warning',
      scheduleName: schedule.scheduleName,
      scheduleCode: schedule.scheduleCode
    };

    // Abrir modal de confirmación
    console.log('[SchedulesManagement] Setting isConfirmationModalOpen to true');
    this.isConfirmationModalOpen = true;
    console.log('[SchedulesManagement] isConfirmationModalOpen is now:', this.isConfirmationModalOpen);
    console.log('[SchedulesManagement] confirmationData is now:', this.confirmationData);

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  /**
   * Reactivar horario con confirmación
   */
  reactivateSchedule(schedule: Schedule): void {
    console.log('[SchedulesManagement] reactivateSchedule llamado con schedule:', schedule);

    // Verificar que el horario tenga un ID válido
    if (!schedule || !schedule.id) {
      console.error('[SchedulesManagement] Horario inválido o sin ID');
      this.notificationService.error('Error', 'Horario no válido.');
      return;
    }

    // Preparar datos para el modal de confirmación
    this.pendingScheduleAction = schedule;
    this.confirmationData = {
      title: 'Reactivar Horario',
      message: `¿Está seguro de que desea reactivar el horario "${schedule.scheduleName}"?`,
      confirmText: 'Reactivar',
      cancelText: 'Cancelar',
      type: 'success',
      scheduleName: schedule.scheduleName,
      scheduleCode: schedule.scheduleCode
    };

    // Abrir modal de confirmación
    console.log('[SchedulesManagement] Setting isConfirmationModalOpen to true');
    this.isConfirmationModalOpen = true;
    console.log('[SchedulesManagement] isConfirmationModalOpen is now:', this.isConfirmationModalOpen);
    console.log('[SchedulesManagement] confirmationData is now:', this.confirmationData);

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  /**
   * Eliminar horario directamente
   */
  deleteSchedule(schedule: Schedule): void {
    console.log('[SchedulesManagement] deleteSchedule llamado con schedule:', schedule);

    // Verificar que el horario tenga un ID válido
    if (!schedule || !schedule.id) {
      console.error('[SchedulesManagement] Horario inválido o sin ID');
      this.notificationService.error('Error', 'Horario no válido.');
      return;
    }

    // Eliminar directamente sin confirmación
    this.deleteScheduleById(schedule.id);
  }

  /**
   * Manejar confirmación de acción en el modal
   */
  onConfirmAction(): void {
    console.log('[SchedulesManagement] onConfirmAction called');
    console.log('[SchedulesManagement] pendingScheduleAction:', this.pendingScheduleAction);
    console.log('[SchedulesManagement] confirmationData:', this.confirmationData);

    if (this.pendingScheduleAction) {
      // Cerrar el modal de confirmación
      console.log('[SchedulesManagement] Closing confirmation modal');
      this.isConfirmationModalOpen = false;
      // Forzar detección de cambios
      this.cdr.detectChanges();

      // Ejecutar la acción pendiente
      if (this.confirmationData.title === 'Desactivar Horario') {
        console.log('[SchedulesManagement] Changing schedule status to INACTIVE');
        this.changeScheduleStatus(this.pendingScheduleAction.id, Status.INACTIVE);
      } else if (this.confirmationData.title === 'Reactivar Horario') {
        console.log('[SchedulesManagement] Changing schedule status to ACTIVE');
        this.changeScheduleStatus(this.pendingScheduleAction.id, Status.ACTIVE);
      }

      // Limpiar la acción pendiente
      this.pendingScheduleAction = null;
    }
  }

  /**
   * Manejar cancelación de acción en el modal
   */
  onCancelAction(): void {
    console.log('[SchedulesManagement] onCancelAction called');

    // Cerrar el modal de confirmación
    console.log('[SchedulesManagement] Closing confirmation modal');
    this.isConfirmationModalOpen = false;
    // Forzar detección de cambios
    this.cdr.detectChanges();

    // Limpiar la acción pendiente
    this.pendingScheduleAction = null;

    // Mostrar mensaje de cancelación
    this.notificationService.info('Cancelado', 'La acción ha sido cancelada');
  }

  /**
   * Cambiar el estado de un horario
   */
  private changeScheduleStatus(id: string, newStatus: Status): void {
    this.distributionApi.changeScheduleStatus(id, newStatus).subscribe({
      next: (response) => {
        console.log('[SchedulesManagement] changeScheduleStatus response:', response);
        if (response && (response.success === true || response.status === true)) {
          this.notificationService.success('Éxito',
            newStatus === Status.ACTIVE ? 'Horario reactivado correctamente' : 'Horario desactivado correctamente');
          this.loadSchedules(); // Recargar la lista de horarios
        } else {
          let errorMessage = 'No se pudo cambiar el estado del horario';
          if (response && response.message) {
            errorMessage = response.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      },
      error: (error) => {
        console.error('[SchedulesManagement] Error changing schedule status:', error);
        let errorMsg = 'Error al cambiar el estado del horario';

        if (error.status === 404) {
          errorMsg = 'No se encontró el horario especificado. Puede que ya haya sido eliminado.';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para cambiar el estado de este horario.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        }

        this.notificationService.error('Error', errorMsg);
      }
    });
  }

  /**
   * Eliminar un horario por ID
   */
  private deleteScheduleById(id: string): void {
    this.distributionApi.deleteSchedule(id).subscribe({
      next: (response) => {
        console.log('[SchedulesManagement] deleteSchedule response:', response);
        if (response && (response.success === true || response.status === true)) {
          this.notificationService.success('Éxito', 'Horario eliminado correctamente');
          this.loadSchedules(); // Recargar la lista de horarios
        } else {
          let errorMessage = 'No se pudo eliminar el horario';
          if (response && response.message) {
            errorMessage = response.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      },
      error: (error) => {
        console.error('[SchedulesManagement] Error deleting schedule:', error);
        let errorMsg = 'Error al eliminar el horario';

        if (error.status === 404) {
          errorMsg = 'No se encontró el horario especificado. Puede que ya haya sido eliminado.';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para eliminar este horario.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        }

        this.notificationService.error('Error', errorMsg);
      }
    });
  }
}