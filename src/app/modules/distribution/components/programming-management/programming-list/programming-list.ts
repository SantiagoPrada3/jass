import { ChangeDetectorRef, Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/components/ui/breadcrumb/breadcrumb';
import { DistributionApi } from '../../../services/distribution-api';
import { AuthService } from '../../../../../core/auth/services/auth';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Status, StatusLabels, ProgramStatus, ProgramStatusLabels } from '../../../models/api-response.model';
import { DistributionProgram, DistributionProgramCreateRequest } from '../../../models/distribution.model';
import { Fare, FareType, FareTypeLabels } from '../../../models/rates.model';
import { Schedule } from '../../../models/schedules.model';
import { Route } from '../../../models/routes.model';
// Importar los modales
import { CreateProgramModalV2Component } from '../create-program-modal-v2/create-program-modal-v2.component';
import { UpdateProgramModalComponent } from '../update-program-modal/update-program-modal.component';
import { ViewProgramModalComponent } from '../view-program-modal/view-program-modal.component';
import { ProgramConfirmationModal } from '../confirmation-modal/confirmation-modal';

// Importar OrganizationApi
import { DistributionOrganizationApi as OrganizationApi } from '../../../services/organization-api.service';
import { ConfirmationData } from '../confirmation-modal/confirmation-modal';
// Importar jsPDF y autotable para generar reportes
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces locales para evitar conflictos de tipos
interface LocalSchedule {
  id: string;
  scheduleCode: string;
  scheduleName: string;

}

interface LocalRoute {
  id: string;
  routeCode: string;
  routeName: string;

}

// Interfaces para datos adicionales
interface ZoneData {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
}

interface StreetData {
  streetId: string | number;
  streetType: string;
  streetName: string;
}

interface RouteData {
  id: string;
  routeCode: string;
  routeName: string;
}

interface OrganizationData {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  legalRepresentative?: string;
  address?: string;
  phone?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  zones?: any[];
}

@Component({
  selector: 'app-programming-list',
  standalone: true,
  // Añadir el nuevo modal a los imports
  imports: [Breadcrumb, FormsModule, CommonModule, CreateProgramModalV2Component, UpdateProgramModalComponent, ViewProgramModalComponent, ProgramConfirmationModal],
  templateUrl: './programming-list.html',
  styleUrl: './programming-list.css'
})
export class ProgrammingList implements OnInit, OnDestroy {
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
      label: 'Programación',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  // Datos
  programs: DistributionProgram[] = [];
  filteredPrograms: DistributionProgram[] = [];
  paginatedPrograms: DistributionProgram[] = [];

  // Filtros
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  startDate: string = '';
  endDate: string = '';
  // Nuevo filtro para mostrar programas eliminados
  showDeletedPrograms: boolean = false;

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Estados
  isLoading: boolean = false;
  // Bandera para evitar llamadas repetidas a la API
  private routesLoading: boolean = false;

  // Dropdowns custom
  isProgramTypeDropdownOpen: boolean = false;
  isStatusDropdownOpen: boolean = false;
  isFareTypeDropdownOpen: boolean = false;

  // Modal de detalles de programa
  isProgramDetailsModalOpen: boolean = false;
  selectedProgramId: string | null = null;

  // Modal de crear programa - ahora usamos el modal lateral
  isCreateProgramModalOpen: boolean = false;
  isCreateFareModalOpen: boolean = false;
  currentOrganizationId: string | null = null;

  // Modal de actualizar programa
  isUpdateProgramModalOpen: boolean = false;
  programToUpdate: DistributionProgram | null = null;

  // Modal de confirmación
  isConfirmationModalOpen: boolean = false;
  confirmationData: ConfirmationData = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  pendingActionProgram: DistributionProgram | null = null;
  pendingActionType: 'delete' | 'restore' | 'physicalDelete' | null = null;
  pendingActionFare: any = null;

  // Referencia a Math para usar en el template
  Math = Math;

  // Add enum values so they can be accessed in the template
  Status = Status;
  ProgramStatus = ProgramStatus;
  FareType = FareType;

  // Tipos de tarifa
  selectedFareType: FareType | '' = '';
  fares: Fare[] = [];
  filteredFares: Fare[] = [];
  paginatedFares: Fare[] = [];
  selectedFareId: string | null = null;
  isFareDetailsModalOpen: boolean = false; // Añadido para resolver el error

  // Datos para el formulario de creación
  schedules: LocalSchedule[] = [];
  routes: LocalRoute[] = [];

  // Modelo para el formulario de creación
  newProgram: DistributionProgramCreateRequest = {
    organizationId: '',
    programCode: '',
    scheduleId: '',
    routeId: '',
    zoneId: '',
    streetId: '', // Cambiado de 0 a '' para consistencia
    programDate: '',
    plannedStartTime: '',
    plannedEndTime: '',
    responsibleUserId: '',
    observations: ''
  };

  // Datos adicionales para mostrar nombres
  zonesData: Map<string, ZoneData> = new Map();
  streetsData: Map<string, StreetData> = new Map();
  routesData: Map<string, RouteData> = new Map();
  organizationData: OrganizationData | null = null;

  // Verificación periódica de horarios
  private checkInterval: any = null;
  private checkedPrograms: Set<string> = new Set(); // IDs de programas ya verificados

  // Propiedades para el modal de confirmación de agua
  isWaterConfirmationModalOpen: boolean = false;
  waterConfirmationProgramId: string = '';
  waterConfirmationProgramCode: string = '';
  waterConfirmationEndTime: string = '';
  localProgramStatus: Map<string, 'CON_AGUA' | 'SIN_AGUA'> = new Map();



  // Estadísticas calculadas
  get totalPrograms(): number {
    return this.programs.length;
  }

  get activePrograms(): number {
    return this.programs.filter(p =>
      p.status === ProgramStatus.ACTIVE ||
      p.status === ProgramStatus.PLANNED ||
      p.status === ProgramStatus.IN_PROGRESS
    ).length;
  }

  get inactivePrograms(): number {
    return this.programs.filter(p => p.status === ProgramStatus.COMPLETED || p.status === ProgramStatus.CANCELLED).length;
  }

  constructor(
    private distributionApi: DistributionApi,
    private organizationApi: OrganizationApi,
    private authService: AuthService,
    private notificationService: NotificationService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('[ProgrammingList] Component initializing');

    // Cargar estados locales desde localStorage
    // this.loadLocalStatesFromStorage(); // DESHABILITADO - Modal de confirmación de agua eliminado

    this.loadPrograms();
    this.loadSchedules();
    this.loadRoutes();
    this.loadOrganizationData();

    // Iniciar verificación periódica cada 30 segundos
    // this.startPeriodicCheck(); // DESHABILITADO - Modal de confirmación de agua eliminado

    console.log('[ProgrammingList] Component initialization completed');
  }

  ngOnDestroy(): void {
    // Limpiar el intervalo cuando se destruya el componente
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('[ProgrammingList] Periodic check stopped');
    }
  }

  /**
   * Inicia la verificación periódica de programas
   */
  private startPeriodicCheck(): void {
    // Verificar inmediatamente
    this.checkProgramsEndTime();

    // Luego verificar cada 30 segundos
    this.checkInterval = setInterval(() => {
      this.checkProgramsEndTime();
    }, 30000); // 30 segundos

    console.log('[ProgrammingList] Periodic check started (every 30 seconds)');
  }

  /**
   * Verifica si algún programa ha superado su hora de finalización
   */
  private checkProgramsEndTime(): void {
    const currentTime = this.getCurrentTime();
    const today = this.getTodayDate();

    console.log('[ProgrammingList] Checking programs at:', currentTime, 'Date:', today);

    // Filtrar programas que están planificados O en progreso para hoy y aún no han sido verificados
    const programsToCheck = this.programs.filter(program => {
      // Verificar programas PLANNED o IN_PROGRESS del día de hoy que tienen hora real de finalización y no han sido verificados
      const isValidStatus = program.status === ProgramStatus.PLANNED || program.status === ProgramStatus.IN_PROGRESS;
      const isToday = program.programDate === today;
      const hasActualEndTime = program.actualEndTime && program.actualEndTime.trim() !== '';
      const notChecked = !this.checkedPrograms.has(program.id);
      const noWaterStatus = !this.localProgramStatus.has(program.id); // No preguntar si ya tiene estado de agua

      console.log(`[ProgrammingList] Program ${program.programCode}:`, {
        status: program.status,
        isValidStatus,
        isToday,
        hasActualEndTime,
        actualEndTime: program.actualEndTime,
        notChecked,
        noWaterStatus
      });

      return isValidStatus && isToday && hasActualEndTime && notChecked && noWaterStatus;
    });

    console.log('[ProgrammingList] Programs to check:', programsToCheck.length);

    programsToCheck.forEach(program => {
      // Verificar contra la hora REAL de finalización (actualEndTime)
      if (program.actualEndTime && this.isTimeGreaterThan(currentTime, program.actualEndTime)) {
        console.log('[ProgrammingList] Program exceeded actual end time:', program.programCode, 'End time:', program.actualEndTime, 'Current:', currentTime);
        // Marcar como verificado para no preguntar de nuevo
        this.checkedPrograms.add(program.id);
        // Mostrar confirmación
        this.showWaterConfirmation(program);
      } else {
        console.log('[ProgrammingList] Program not yet exceeded:', program.programCode, 'End time:', program.actualEndTime, 'Current:', currentTime);
      }
    });
  }

  /**
   * Obtiene la hora actual en formato HH:mm
   */
  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   */
  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Compara dos horas en formato HH:mm
   */
  private isTimeGreaterThan(time1: string, time2: string): boolean {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);

    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;

    return totalMinutes1 > totalMinutes2;
  }

  /**
   * Muestra confirmación para un programa que superó su hora de finalización
   */
  private showWaterConfirmation(program: DistributionProgram): void {
    const endTime = program.actualEndTime || program.plannedEndTime;

    // Guardar datos del programa para el modal
    this.waterConfirmationProgramId = program.id;
    this.waterConfirmationProgramCode = program.programCode;
    this.waterConfirmationEndTime = endTime;

    // Abrir el modal
    this.isWaterConfirmationModalOpen = true;
  }

  /**
   * Maneja la respuesta del modal de confirmación de agua
   */
  onWaterConfirmation(waterGiven: boolean): void {
    console.log('[ProgrammingList] Water confirmation:', waterGiven, 'for program:', this.waterConfirmationProgramId);

    if (waterGiven) {
      // Si se dio agua, marcar como "Con Agua" solo en el frontend
      this.localProgramStatus.set(this.waterConfirmationProgramId, 'CON_AGUA');
    } else {
      // Si NO se dio agua, marcar como "Sin Agua" solo en el frontend
      this.localProgramStatus.set(this.waterConfirmationProgramId, 'SIN_AGUA');
    }

    // Guardar en localStorage para persistencia
    this.saveLocalStatesToStorage();

    // Forzar actualización de la vista
    this.changeDetectorRef.detectChanges();

    // Cerrar el modal
    this.closeWaterConfirmationModal();
  }

  /**
   * Guarda los estados locales en localStorage
   */
  private saveLocalStatesToStorage(): void {
    try {
      const statesObject: { [key: string]: 'CON_AGUA' | 'SIN_AGUA' } = {};
      this.localProgramStatus.forEach((value, key) => {
        statesObject[key] = value;
      });
      localStorage.setItem('programWaterStatus', JSON.stringify(statesObject));
      console.log('[ProgrammingList] Local states saved to localStorage:', statesObject);
    } catch (error) {
      console.error('[ProgrammingList] Error saving to localStorage:', error);
    }
  }

  /**
   * Carga los estados locales desde localStorage
   */
  private loadLocalStatesFromStorage(): void {
    try {
      const stored = localStorage.getItem('programWaterStatus');
      if (stored) {
        const statesObject: { [key: string]: 'CON_AGUA' | 'SIN_AGUA' } = JSON.parse(stored);
        this.localProgramStatus.clear();
        Object.entries(statesObject).forEach(([key, value]) => {
          this.localProgramStatus.set(key, value);
        });
        console.log('[ProgrammingList] Local states loaded from localStorage:', statesObject);
      }
    } catch (error) {
      console.error('[ProgrammingList] Error loading from localStorage:', error);
    }
  }

  /**
   * Cierra el modal de confirmación de agua
   */
  closeWaterConfirmationModal(): void {
    this.isWaterConfirmationModalOpen = false;
    this.waterConfirmationProgramId = '';
    this.waterConfirmationProgramCode = '';
    this.waterConfirmationEndTime = '';
  }



  /**
   * Cargar todas los programas
   */
  loadPrograms(): void {
    this.isLoading = true;
    const organizationId = this.getCurrentOrganizationId();

    // Add debugging
    console.log('[ProgrammingList] Loading programs for organization:', organizationId);

    // Check if we have a valid organization ID
    if (!organizationId || organizationId === 'default-org') {
      console.warn('[ProgrammingList] No valid organization ID found');
      this.notificationService.error('Error', 'No se pudo identificar la organización');
      this.isLoading = false;
      return;
    }

    console.log('[ProgrammingList] Calling API with includeDeleted:', this.showDeletedPrograms);

    // Resetear la bandera de carga de rutas para permitir recarga
    this.routesLoading = false;

    // Usar el nuevo parámetro para incluir programas eliminados si es necesario
    this.distributionApi.getAllDistributionPrograms(organizationId, this.showDeletedPrograms).subscribe({
      next: (response) => {
        console.log('[ProgrammingList] Programs API response:', response);
        if (response && (response.success || response.status)) {
          this.programs = response.data || [];
          console.log('[ProgrammingList] Loaded programs count:', this.programs.length);
          console.log('[ProgrammingList] Loaded programs:', this.programs);

          // Agregar registro de depuración para ver las horas reales
          this.programs.forEach(program => {
            console.log(`[ProgrammingList] Program ${program.programCode} actual times:`, {
              actualStartTime: program.actualStartTime,
              actualEndTime: program.actualEndTime,
              hasActualTimes: this.hasActualTimes(program)
            });
          });

          // Cargar datos adicionales para mostrar nombres
          this.loadAdditionalData();

          // Aplicar filtros después de un pequeño delay para asegurar que los datos adicionales se carguen
          setTimeout(() => {
            this.applyFilters();
            this.changeDetectorRef.detectChanges();
          }, 500);
        } else {
          // Better error handling using ApiResponseHelper
          const errorMessage = (response && (response.message || response.error?.message)) || 'No se pudieron cargar los programas';
          console.error('[ProgrammingList] API returned error:', errorMessage);
          this.notificationService.error('Error', errorMessage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[ProgrammingList] Error loading programs:', error);
        // Handle HTTP errors
        let errorMessage = 'No se pudieron cargar los programas';
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
   * Cargar datos adicionales para mostrar nombres en lugar de IDs
   */
  loadAdditionalData(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      return;
    }

    console.log('[ProgrammingList] Loading additional data for organization:', organizationId);

    // Cargar zonas y calles
    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          // Usar el objeto de datos completo para preservar todas las propiedades incluyendo el logo
          this.organizationData = response.data as OrganizationData;

          // Limpiar mapas antes de cargar nuevos datos
          this.zonesData.clear();
          this.streetsData.clear();

          // Cargar zonas
          if (response.data.zones) {
            response.data.zones.forEach((zone: any) => {
              this.zonesData.set(zone.zoneId, {
                zoneId: zone.zoneId,
                zoneCode: zone.zoneCode,
                zoneName: zone.zoneName
              });

              // Cargar calles para cada zona
              if (zone.streets) {
                zone.streets.forEach((street: any) => {
                  // Usar streetId como string como clave
                  this.streetsData.set(street.streetId.toString(), {
                    streetId: street.streetId,
                    streetType: street.streetType,
                    streetName: street.streetName
                  });
                });
              }
            });
          }

          console.log('[ProgrammingList] Zones loaded:', this.zonesData.size);
          console.log('[ProgrammingList] Streets loaded:', this.streetsData.size);

          // Forzar actualización de la vista
          this.changeDetectorRef.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('[ProgrammingList] Error loading organization data:', error);
      }
    });

    // Cargar rutas en el mapa para getRouteName
    this.loadRoutesForMap();
  }

  /**
   * Cargar rutas específicamente para el mapa
   */
  loadRoutesForMap(): void {
    // Resetear la bandera si ha pasado un tiempo razonable
    if (this.routesLoading) {
      console.log('[ProgrammingList] Routes already loading, skipping...');
      return;
    }

    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      console.log('[ProgrammingList] No valid organization ID for routes loading');
      return;
    }

    // Marcar que las rutas se están cargando
    this.routesLoading = true;
    console.log('[ProgrammingList] Loading routes for map, organization:', organizationId);

    this.distributionApi.getAllRoutes(organizationId).subscribe({
      next: (response) => {
        console.log('[ProgrammingList] Routes API response for map:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Limpiar el mapa antes de cargar nuevas rutas
          this.routesData.clear();

          response.data.forEach((route: any) => {
            this.routesData.set(route.id, {
              id: route.id,
              routeCode: route.routeCode,
              routeName: route.routeName
            });
          });

          console.log('[ProgrammingList] Routes data loaded in map:', Array.from(this.routesData.entries()));
          console.log('[ProgrammingList] Routes count in map:', this.routesData.size);

          // Verificar cada ruta cargada
          Array.from(this.routesData.entries()).forEach(([id, route], index) => {
            console.log(`[ProgrammingList] Map route ${index}: ID=${id}, Data=`, route);
          });

          // Forzar actualización de la vista
          this.changeDetectorRef.detectChanges();
        } else {
          console.warn('[ProgrammingList] No routes data received or invalid response for map');
          console.log('[ProgrammingList] Response for map:', response);
        }

        // Marcar que las rutas ya no se están cargando
        this.routesLoading = false;
      },
      error: (error: any) => {
        console.error('[ProgrammingList] Error loading routes data for map:', error);
        // Marcar que las rutas ya no se están cargando incluso en caso de error
        this.routesLoading = false;
      }
    });
  }

  /**
   * Obtener el nombre de la zona por ID
   */
  getZoneName(zoneId: string | undefined): string {
    if (!zoneId) {
      console.log('[ProgrammingList] getZoneName - No zoneId provided');
      return 'N/A';
    }
    console.log('[ProgrammingList] getZoneName - Looking for zoneId:', zoneId);
    console.log('[ProgrammingList] getZoneName - Zones map size:', this.zonesData.size);
    const zone = this.zonesData.get(zoneId);
    if (!zone) {
      console.log('[ProgrammingList] getZoneName - Zone not found for ID:', zoneId);
      return 'N/A';
    }
    // Solo devolver el nombre de la zona, no el código
    return zone.zoneName;
  }

  /**
   * Obtener el nombre de la calle por ID
   */
  getStreetName(streetId: string | number | undefined): string {
    if (streetId === undefined || streetId === null) {
      console.log('[ProgrammingList] getStreetName - No streetId provided');
      return 'N/A';
    }

    // Convertir a string si es número
    const id = typeof streetId === 'number' ? streetId.toString() : streetId;
    console.log('[ProgrammingList] getStreetName - Looking for streetId:', id);
    console.log('[ProgrammingList] getStreetName - Streets map size:', this.streetsData.size);

    const street = this.streetsData.get(id);
    if (!street) {
      console.log('[ProgrammingList] getStreetName - Street not found for ID:', id);
      return 'N/A';
    }
    // Solo devolver el nombre de la calle, no el tipo
    return street.streetName;
  }

  /**
   * Obtener el nombre de la ruta por ID
   */
  getRouteName(routeId: string | undefined): string {
    if (!routeId) {
      console.log('[ProgrammingList] getRouteName - No routeId provided');
      return 'N/A';
    }

    console.log('[ProgrammingList] getRouteName - Looking for routeId:', routeId);
    console.log('[ProgrammingList] getRouteName - Routes map size:', this.routesData.size);
    console.log('[ProgrammingList] getRouteName - Routes map keys:', Array.from(this.routesData.keys()));

    // Verificar si el mapa tiene datos
    if (this.routesData.size === 0) {
      console.log('[ProgrammingList] getRouteName - Routes map is empty, loading...');
      // Intentar cargar las rutas una vez si el mapa está vacío
      this.loadRoutesForMap();
      return 'Cargando...';
    }

    const route = this.routesData.get(routeId);

    if (!route) {
      console.log('[ProgrammingList] getRouteName - Route not found for ID:', routeId);
      return 'No encontrada';
    }

    console.log('[ProgrammingList] getRouteName - Found route:', route);
    // Solo devolver el nombre de la ruta
    return route.routeName;
  }

  /**
   * Cargar datos de la organización
   */
  loadOrganizationData(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      return;
    }

    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          // Crear un objeto con todos los datos de la organización
          const orgData: OrganizationData = {
            organizationId: response.data.organizationId,
            organizationCode: response.data.organizationCode,
            organizationName: response.data.organizationName,
            legalRepresentative: response.data.legalRepresentative,
            address: response.data.address,
            phone: response.data.phone,
            status: response.data.status,
            zones: response.data.zones
          };

          this.organizationData = orgData;
          console.log('[ProgrammingList] Organization data loaded:', this.organizationData);
        }
      },
      error: (error: any) => {
        console.error('[ProgrammingList] Error loading organization data:', error);
      }
    });
  }

  /**
   * Cargar horarios
   */
  loadSchedules(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      return;
    }

    this.distributionApi.getAllSchedules(organizationId).subscribe({
      next: (response) => {
        if (response && response.success) {
          // Mapear los datos para evitar conflictos de tipos
          this.schedules = (response.data || []).map(schedule => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
        }
      },
      error: (error) => {
        console.error('[ProgrammingList] Error loading schedules:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los horarios');
      }
    });
  }

  /**
   * Cargar rutas
   */
  loadRoutes(): void {
    const organizationId = this.getCurrentOrganizationId();
    if (!organizationId || organizationId === 'default-org') {
      console.log('[ProgrammingList] No valid organization ID for routes loading in loadRoutes');
      return;
    }

    console.log('[ProgrammingList] Loading routes for dropdown, organization:', organizationId);

    this.distributionApi.getAllRoutes(organizationId).subscribe({
      next: (response) => {
        console.log('[ProgrammingList] Routes API response for dropdown:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.routes = (response.data || []).map(route => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));

          // También actualizar el mapa de rutas para el método getRouteName
          this.routesData.clear();
          (response.data || []).forEach(route => {
            this.routesData.set(route.id, {
              id: route.id,
              routeCode: route.routeCode,
              routeName: route.routeName
            });
          });

          console.log('[ProgrammingList] Routes loaded for dropdown and map:', this.routes);
          console.log('[ProgrammingList] Routes data map updated:', Array.from(this.routesData.entries()));
          console.log('[ProgrammingList] Routes count in dropdown:', this.routes.length);
          console.log('[ProgrammingList] Routes count in map:', this.routesData.size);

          // Verificar cada ruta cargada
          this.routes.forEach((route, index) => {
            console.log(`[ProgrammingList] Dropdown route ${index}:`, route);
          });

          Array.from(this.routesData.entries()).forEach(([id, route], index) => {
            console.log(`[ProgrammingList] Map route ${index}: ID=${id}, Data=`, route);
          });
        } else {
          console.warn('[ProgrammingList] No routes received or invalid response for dropdown');
          console.log('[ProgrammingList] Response for dropdown:', response);
        }
      },
      error: (error) => {
        console.error('[ProgrammingList] Error loading routes:', error);
        this.notificationService.error('Error', 'No se pudieron cargar las rutas');
      }
    });
  }

  /**
   * Aplicar filtros de búsqueda, tipo de tarifa y estado
   */
  applyFilters(): void {
    console.log('[ProgrammingList] Applying filters. Programs count before filtering:', this.programs.length);
    console.log('[ProgrammingList] Filter params - statusFilter:', this.statusFilter, 'searchTerm:', this.searchTerm, 'showDeletedPrograms:', this.showDeletedPrograms);

    let filtered = [...this.programs];
    console.log('[ProgrammingList] Initial filtered programs count:', filtered.length);

    // Filtro de estado
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(program =>
        program.status === ProgramStatus.ACTIVE ||
        program.status === ProgramStatus.PLANNED ||
        program.status === ProgramStatus.IN_PROGRESS
      );
      console.log('[ProgrammingList] After status active filter:', filtered.length);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(program => program.status === ProgramStatus.COMPLETED || program.status === ProgramStatus.CANCELLED);
      console.log('[ProgrammingList] After status inactive filter:', filtered.length);
    }

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(program =>
        program.programCode.toLowerCase().includes(term) ||
        program.programDate.toLowerCase().includes(term)
      );
      console.log('[ProgrammingList] After search filter:', filtered.length);
    }

    // Filtro de rango de fechas
    if (this.startDate) {
      filtered = filtered.filter(program => program.programDate >= this.startDate);
      console.log('[ProgrammingList] After start date filter:', filtered.length);
    }

    if (this.endDate) {
      filtered = filtered.filter(program => program.programDate <= this.endDate);
      console.log('[ProgrammingList] After end date filter:', filtered.length);
    }

    // Si no se quieren mostrar programas eliminados, filtrarlos
    if (!this.showDeletedPrograms) {
      filtered = filtered.filter(program => !program.deleted);
      console.log('[ProgrammingList] After deleted filter:', filtered.length);
    }

    this.filteredPrograms = filtered;
    console.log('[ProgrammingList] Final filtered programs count:', this.filteredPrograms.length);
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
   * Evento de cambio de rango de fechas
   */
  onDateRangeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  /**
   * Evento de cambio de filtro de tipo de tarifa
   */
  onFilterChange(): void {
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
   * Evento de cambio de filtro de programas eliminados
   */
  onShowDeletedProgramsChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Métodos para dropdowns custom
  toggleFareTypeDropdown(): void {
    this.isFareTypeDropdownOpen = !this.isFareTypeDropdownOpen;
    if (this.isFareTypeDropdownOpen) {
      this.isStatusDropdownOpen = false;
    }
  }

  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    if (this.isStatusDropdownOpen) {
      this.isFareTypeDropdownOpen = false;
    }
  }

  selectFareType(type: FareType | ''): void {
    this.selectedFareType = type;
    this.isFareTypeDropdownOpen = false;
    this.onFilterChange();
  }

  selectStatus(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.isStatusDropdownOpen = false;
    this.onStatusFilterChange();
  }

  getFareTypeDisplayText(): string {
    if (!this.selectedFareType) return 'Todos los tipos';
    return FareTypeLabels[this.selectedFareType] || 'Todos los tipos';
  }

  getStatusDisplayText(): string {
    switch (this.statusFilter) {
      case 'all': return 'Todos los programas';
      case 'active': return 'Solo activos';
      case 'inactive': return 'Solo inactivos';
      default: return 'Todos los programas';
    }
  }

  closeDropdowns(): void {
    this.isFareTypeDropdownOpen = false;
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
  getStatusLabel(status: string, programId?: string): string {
    // Si hay un estado local de agua para este programa, mostrarlo
    if (programId && this.localProgramStatus.has(programId)) {
      const waterStatus = this.localProgramStatus.get(programId);
      return waterStatus === 'CON_AGUA' ? 'Con Agua' : 'Sin Agua';
    }
    return ProgramStatusLabels[status as ProgramStatus] || status;
  }

  /**
   * Obtener etiqueta del tipo de tarifa
   */
  getFareTypeLabel(type: string): string {
    return FareTypeLabels[type as FareType] || type;
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: string, programId?: string): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    // Si hay un estado local de agua para este programa, usar colores especiales
    if (programId && this.localProgramStatus.has(programId)) {
      const waterStatus = this.localProgramStatus.get(programId);
      if (waterStatus === 'CON_AGUA') {
        return `${baseClasses} bg-cyan-100 text-cyan-800`;
      } else {
        return `${baseClasses} bg-orange-100 text-orange-800`;
      }
    }

    switch (status) {
      case ProgramStatus.ACTIVE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case ProgramStatus.PLANNED:
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case ProgramStatus.IN_PROGRESS:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case ProgramStatus.COMPLETED:
        return `${baseClasses} bg-green-100 text-green-800`;
      case ProgramStatus.CANCELLED:
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Obtener clases CSS para filas de programas eliminados
   */
  getDeletedProgramRowClass(program: DistributionProgram): string {
    // Si el programa tiene el campo deleted como true, aplicar estilo especial
    if (program.deleted) {
      return 'bg-red-50 opacity-75 border-l-4 border-red-500';
    }
    return '';
  }

  /**
   * Verificar si un programa está eliminado
   */
  isProgramDeleted(program: DistributionProgram): boolean {
    return program.deleted === true;
  }

  /**
   * Tracking function para ngFor
   */
  trackByProgramId(index: number, program: DistributionProgram): string {
    return program.id;
  }

  /**
   * Ver detalles del programa (abrir modal lateral)
   */
  viewProgramDetails(program: DistributionProgram): void {
    this.selectedProgramId = program.id;
    this.isProgramDetailsModalOpen = true;
  }

  /**
   * Cerrar modal de detalles
   */
  closeProgramDetailsModal(): void {
    this.isProgramDetailsModalOpen = false;
    this.selectedProgramId = null;
  }

  /**
   * Tracking function para ngFor de tarifas
   */
  trackByFareId(index: number, fare: Fare): string {
    return fare.id;
  }

  /**
   * Editar programa (abrir modal de edición)
   */
  editProgram(program: DistributionProgram): void {
    console.log('Editar programa:', program);
    this.programToUpdate = program;
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isUpdateProgramModalOpen = true;
  }

  /**
   * Cerrar modal de actualización
   */
  closeUpdateProgramModal(): void {
    this.isUpdateProgramModalOpen = false;
    this.programToUpdate = null;
    this.currentOrganizationId = null;
  }

  /**
   * Abrir modal de creación de tarifa
   */
  openCreateFareModal(): void {
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isCreateFareModalOpen = true;
  }

  /**
   * Cerrar modal de creación de tarifa
   */
  closeCreateFareModal(): void {
    this.isCreateFareModalOpen = false;
    this.currentOrganizationId = null;
  }

  /**
   * Ver detalles de la tarifa (abrir modal lateral)
   */
  viewFareDetails(fare: Fare): void {
    this.selectedFareId = fare.id;
    this.isFareDetailsModalOpen = true;
  }

  /**
   * Cerrar modal de detalles de tarifa
   */
  closeFareDetailsModal(): void {
    this.isFareDetailsModalOpen = false;
    this.selectedFareId = null;
  }

  /**
   * Editar tarifa desde el modal - Actualizar la lista con los datos actualizados
   */
  editFareFromModal(fare: Fare): void {
    // Encontrar y actualizar la tarifa en la lista local
    const index = this.fares.findIndex(f => f.id === fare.id);
    if (index !== -1) {
      this.fares[index] = fare;

      // Recargar los filtros y paginación para reflejar los cambios
      this.applyFilters();

      console.log('✅ Tarifa actualizada en la lista:', fare);
    }

    // Cerrar el modal
    this.closeFareDetailsModal();
  }

  /**
   * Generar reporte de programas
   */
  generateReport(): void {
    console.log('[ProgrammingList] Generando reporte de programas en PDF');

    // Verificar que ya tengamos los datos de la organización
    if (!this.organizationData) {
      this.notificationService.error('Error', 'No se han cargado los datos de la organización');
      return;
    }

    // Verificar que tengamos programas para reportar
    if (!this.filteredPrograms || this.filteredPrograms.length === 0) {
      this.notificationService.warning('Advertencia', 'No hay programas para generar el reporte');
      return;
    }

    // Generar el PDF con los datos de la organización y programas
    this.generatePdfReport(this.organizationData, this.filteredPrograms);
  }

  /**
   * Generar PDF con los datos de la organización y programas
   */
  private generatePdfReport(organizationData: OrganizationData, programs: DistributionProgram[]): void {
    try {
      // Crear una nueva instancia de jsPDF con orientación vertical
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
      doc.text('REPORTE DE PROGRAMACIÓN DE DISTRIBUCIÓN', pageWidth / 2, 55, { align: 'center' });

      // Agregar información del reporte
      const currentDate = new Date();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${currentDate.toLocaleDateString('es-ES')}`, 20, 65);
      doc.text(`Total de programas: ${programs.length}`, pageWidth - 20, 65, { align: 'right' });

      // Preparar datos para la tabla
      const tableData = programs.map((program, index) => [
        (index + 1).toString(),
        program.programCode || '',
        program.programDate ? new Date(program.programDate).toLocaleDateString('es-ES') : '',
        `${program.plannedStartTime || ''} - ${program.plannedEndTime || ''}`,
        this.getRouteName(program.routeId) || '',
        this.getZoneName(program.zoneId) || '',
        this.getStreetName(program.streetId) || '',
        this.getStatusLabel(program.status, program.id) || '', // Usar getStatusLabel para incluir estados locales
        program.observations || ''
      ]);

      // Agregar tabla de programas usando autoTable
      autoTable(doc, {
        head: [['#', 'Código', 'Fecha', 'Horario', 'Ruta', 'Zona', 'Calle', 'Estado', 'Observaciones']],
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
          0: { cellWidth: 10, halign: 'center' },   // #
          1: { cellWidth: 20 },                     // Código
          2: { cellWidth: 20, halign: 'center' },   // Fecha
          3: { cellWidth: 25, halign: 'center' },   // Horario
          4: { cellWidth: 20 },                     // Ruta
          5: { cellWidth: 15 },                     // Zona
          6: { cellWidth: 25 },                     // Calle
          7: { cellWidth: 20, halign: 'center' },   // Estado
          8: { cellWidth: 30 }                      // Observaciones
        }
      });

      // Agregar pie de página
      this.addFooterToPdf(doc, pageWidth, pageHeight);

      // Guardar el PDF
      const filename = `reporte-programacion-${organizationData.organizationCode}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      this.notificationService.success('Éxito', 'Reporte PDF generado correctamente');
    } catch (error) {
      console.error('[ProgrammingList] Error generating PDF report:', error);
      this.notificationService.error('Error', 'Error al generar el reporte PDF');
    }
  }

  /**
   * Agregar encabezado al PDF con datos de la organización
   */
  private addHeaderToPdf(doc: jsPDF, organizationData: OrganizationData, pageWidth: number): void {
    // Fondo azul para el encabezado (simulando un membrete profesional)
    doc.setFillColor(25, 118, 210); // Azul JASS
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Si hay un logo, intentar agregarlo
    const orgDataWithLogo = organizationData as any;
    if (orgDataWithLogo && orgDataWithLogo.logo) {
      try {
        // Agregar logo (se ajustará al tamaño disponible)
        doc.addImage(orgDataWithLogo.logo, 'PNG', 15, 8, 25, 25);
      } catch (error) {
        console.warn('[ProgrammingList] No se pudo cargar el logo de la organización:', error);
      }
    }

    // Título de la organización en blanco
    const titleX = (orgDataWithLogo && orgDataWithLogo.logo) ? 45 : 20;

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // Blanco
    doc.setFont('helvetica', 'bold');
    doc.text(organizationData?.organizationName || 'JUNTA ADMINISTRADORA DE AGUA POTABLE', titleX, 18);

    // Subtítulo "Sistema de Agua Potable y Alcantarillado"
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Agua Potable y Alcantarillado', titleX, 25);

    // Dirección y teléfono en blanco
    doc.setFontSize(9);
    doc.text(organizationData?.address || '', titleX, 32);
    doc.text(`Tel: ${organizationData?.phone || ''}`, titleX, 38);

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
   * Ejecutar cancelación de programa
   */
  private executeDeleteProgram(program: DistributionProgram): void {
    this.distributionApi.changeDistributionProgramStatus(program.id, ProgramStatus.CANCELLED).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            '¡Programa Cancelado!',
            `El programa ${program.programCode} ha sido cancelado exitosamente`
          );

          // Recargar lista
          this.loadPrograms();
        } else {
          this.notificationService.error(
            'Error al cancelar',
            response.message || 'No se pudo cancelar el programa'
          );
        }
      },
      error: (error) => {
        console.error('Error al cancelar programa:', error);
        this.notificationService.error(
          'Error al cancelar',
          'Ocurrió un error al cancelar el programa. Intente nuevamente.'
        );
      }
    });
  }

  /**
   * Ejecutar eliminación física de programa
   */
  private executePhysicalDeleteProgram(program: DistributionProgram): void {
    this.distributionApi.deleteDistributionProgramPhysically(program.id).subscribe({
      next: (response) => {
        // Para una eliminación exitosa, el backend normalmente devuelve un 204 No Content
        // En ese caso, response será null o undefined, pero la operación fue exitosa
        this.notificationService.success(
          '¡Programa Eliminado!',
          `El programa ${program.programCode} ha sido eliminado permanentemente`
        );

        // Recargar lista
        this.loadPrograms();
      },
      error: (error) => {
        console.error('Error al eliminar físicamente el programa:', error);
        this.notificationService.error(
          'Error al eliminar',
          'Ocurrió un error al eliminar el programa. Intente nuevamente.'
        );
      }
    });
  }

  /**
   * Ejecutar activación del programa
   */
  private executeRestoreProgram(program: DistributionProgram): void {
    this.distributionApi.changeDistributionProgramStatus(program.id, ProgramStatus.PLANNED).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            '¡Programa Activado!',
            `El programa ${program.programCode} ha sido activado exitosamente`
          );

          // Recargar lista
          this.loadPrograms();
        } else {
          this.notificationService.error(
            'Error al activar',
            response.message || 'No se pudo activar el programa'
          );
        }
      },
      error: (error) => {
        console.error('Error al activar el programa:', error);
        this.notificationService.error(
          'Error al activar',
          'Ocurrió un error al activar el programa. Intente nuevamente.'
        );
      }
    });
  }

  /**
   * Cerrar modal de confirmación y limpiar estado
   */
  private closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.pendingActionProgram = null;
    this.pendingActionType = null;
  }

  // ==================== MÉTODOS DE PAGINACIÓN ====================

  /**
   * Actualizar la paginación
   */
  private updatePagination(): void {
    // Calcular el total de páginas
    this.totalPages = Math.ceil(this.filteredPrograms.length / this.pageSize);

    // Asegurarse de que la página actual esté dentro del rango válido
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Calcular los programas paginados
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPrograms = this.filteredPrograms.slice(startIndex, endIndex);
  }

  /**
   * Ir a la página anterior
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  /**
   * Ir a la página siguiente
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  /**
   * Ir a una página específica
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Obtener las páginas a mostrar en la paginación
   */
  getPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con puntos suspensivos
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

      // Ajustar si estamos cerca del final
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // ==================== MÉTODOS DE MANEJO DE PROGRAMAS ====================

  /**
   * Manejar cuando se crea un nuevo programa desde el modal lateral
   */
  onProgramCreated(): void {
    this.loadPrograms(); // Recargar la lista de programas
    this.closeCreateProgramModal(); // Cerrar el modal
  }

  /**
   * Manejar cuando se actualiza un programa
   */
  onProgramUpdated(): void {
    console.log('[ProgrammingList] Program updated, reloading programs');
    this.loadPrograms(); // Recargar la lista de programas
    this.closeUpdateProgramModal(); // Cerrar el modal

    // Forzar la detección de cambios
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Obtener ID de organización del usuario actual
   */
  private getCurrentOrganizationId(): string {
    const currentUser = this.authService.getCurrentUser();
    console.log('[ProgrammmingList] Current user:', currentUser); // Debug log
    const orgId = currentUser?.organizationId;
    console.log('[ProgrammmingList] Organization ID:', orgId); // Debug log
    return orgId || 'default-org';
  }

  /**
   * Obtener un programa por su ID
   */
  getProgramById(programId: string | null): DistributionProgram | null {
    if (!programId) return null;
    return this.programs.find(program => program.id === programId) || null;
  }

  /**
   * Abrir modal de creación - ahora usamos el modal lateral
   */
  openCreateProgramModal(): void {
    this.currentOrganizationId = this.getCurrentOrganizationId();
    this.isCreateProgramModalOpen = true;
  }

  /**
   * Cerrar modal de creación
   */
  closeCreateProgramModal(): void {
    this.isCreateProgramModalOpen = false;
    this.currentOrganizationId = null;
  }

  /**
   * ==================== MÉTODOS DE ELIMINACIÓN Y RESTAURACIÓN ====================

  /**
   * Preparar eliminación de programa (muestra modal de confirmación)
  */
  prepareDeleteProgram(program: DistributionProgram): void {
    this.pendingActionProgram = program;
    this.pendingActionType = 'delete';

    this.confirmationData = {
      title: 'Cancelar Programa',
      message: '¿Está seguro de que desea cancelar este programa? Esta acción marcará al programa como cancelado.',
      confirmText: 'Sí, Cancelar',
      cancelText: 'Cancelar',
      type: 'danger',
      programCode: program.programCode,
      routeName: this.getRouteName(program.routeId),
      programDate: program.programDate,
      plannedStartTime: program.plannedStartTime,
      plannedEndTime: program.plannedEndTime,
      status: ProgramStatusLabels[program.status as ProgramStatus] || program.status
    };

    this.isConfirmationModalOpen = true;
  }

  /**
   * Preparar eliminación física de programa (muestra modal de confirmación)
   */
  preparePhysicalDeleteProgram(program: DistributionProgram): void {
    this.pendingActionProgram = program;
    this.pendingActionType = 'physicalDelete';

    this.confirmationData = {
      title: 'Eliminar Programa Permanentemente',
      message: '¿Está seguro de que desea eliminar permanentemente este programa? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      programCode: program.programCode,
      routeName: this.getRouteName(program.routeId),
      programDate: program.programDate,
      plannedStartTime: program.plannedStartTime,
      plannedEndTime: program.plannedEndTime,
      status: ProgramStatusLabels[program.status as ProgramStatus] || program.status
    };

    this.isConfirmationModalOpen = true;
  }

  /**
   * Preparar restauración de programa (muestra modal de confirmación)
   */
  prepareRestoreProgram(program: DistributionProgram): void {
    this.pendingActionProgram = program;
    this.pendingActionType = 'restore';

    this.confirmationData = {
      title: 'Activar Programa',
      message: '¿Está seguro de que desea activar este programa? El programa volverá a estar planificado.',
      confirmText: 'Sí, Activar',
      cancelText: 'Cancelar',
      type: 'success',
      programCode: program.programCode,
      routeName: this.getRouteName(program.routeId),
      programDate: program.programDate,
      plannedStartTime: program.plannedStartTime,
      plannedEndTime: program.plannedEndTime,
      status: ProgramStatusLabels[program.status as ProgramStatus] || program.status
    };

    this.isConfirmationModalOpen = true;
  }

  /**
   * Ejecutar la acción confirmada (eliminar, eliminar físicamente o restaurar)
   */
  onConfirmAction(): void {
    if (!this.pendingActionProgram || !this.pendingActionType) {
      console.error('❌ No hay acción pendiente');
      return;
    }

    const program = this.pendingActionProgram;
    const actionType = this.pendingActionType;

    if (actionType === 'delete') {
      this.executeDeleteProgram(program);
    } else if (actionType === 'physicalDelete') {
      this.executePhysicalDeleteProgram(program);
    } else if (actionType === 'restore') {
      this.executeRestoreProgram(program);
    }

    // Cerrar modal y limpiar estado
    this.closeConfirmationModal();
  }

  /**
   * Cancelar la acción
   */
  onCancelAction(): void {
    this.closeConfirmationModal();
  }

  /**
   * Verificar si un programa tiene horas reales definidas
   */
  hasActualTimes(program: DistributionProgram): boolean {
    // Verificar que ambos valores existan y no sean nulos, undefined o cadenas vacías
    const hasStartTime = program.actualStartTime !== undefined &&
      program.actualStartTime !== null &&
      program.actualStartTime !== '' &&
      program.actualStartTime !== 'null' &&
      typeof program.actualStartTime === 'string' &&
      program.actualStartTime.trim().length > 0;

    const hasEndTime = program.actualEndTime !== undefined &&
      program.actualEndTime !== null &&
      program.actualEndTime !== '' &&
      program.actualEndTime !== 'null' &&
      typeof program.actualEndTime === 'string' &&
      program.actualEndTime.trim().length > 0;

    return hasStartTime && hasEndTime;
  }

}
