import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionOrganizationApi as OrganizationApi } from '../../../services/organization-api.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DistributionProgram, DistributionProgramCreateRequest } from '../../../models/distribution.model';
import { AuthService } from '../../../../../core/auth/services/auth';

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

interface LocalZone {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
}

interface LocalStreet {
  streetId: string;
  streetType: string;
  streetName: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-update-program-modal',
  templateUrl: './update-program-modal.component.html',
  styleUrl: './update-program-modal.component.css'
})
export class UpdateProgramModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string | null = null;
  @Input() program: DistributionProgram | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() programUpdated = new EventEmitter<void>();

  // Estados del modal
  isLoading: boolean = false;
  isSaving: boolean = false;
  isLoadingStreets: boolean = false;
  // Bandera para evitar llamadas repetidas
  private routesLoading: boolean = false;

  // Datos del formulario
  updateForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  // Datos de organización
  organizationData: any = null;
  availableZones: LocalZone[] = [];
  availableStreets: LocalStreet[] = [];
  availableSchedules: LocalSchedule[] = [];
  availableRoutes: LocalRoute[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly distributionApi: DistributionApi,
    private readonly organizationApi: OrganizationApi,
    private readonly notificationService: NotificationService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly authService: AuthService
  ) {
    this.updateForm = this.initializeForm();
    this.setupFormValidation();
  }

  ngOnInit(): void {
    if (this.isOpen && this.organizationId && this.program) {
      console.log('[UpdateProgramModal] Modal opened with organizationId:', this.organizationId);
      console.log('[UpdateProgramModal] Program to update:', this.program);
      this.loadData();
      this.populateForm();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen && this.organizationId && this.program) {
      console.log('[UpdateProgramModal] Modal opened with organizationId:', this.organizationId);
      console.log('[UpdateProgramModal] Program to update:', this.program);
      this.loadData();
      this.populateForm();
    }
  }

  /**
   * Cargar todos los datos necesarios
   */
  private loadData(): void {
    if (!this.organizationId) {
      console.log('[UpdateProgramModal] No organizationId provided');
      return;
    }

    console.log('[UpdateProgramModal] Loading data for organization:', this.organizationId);
    console.log('[UpdateProgramModal] Program data:', this.program);
    
    // Reiniciar los datos para evitar conflictos
    this.availableSchedules = [];
    this.availableRoutes = [];
    this.availableZones = [];
    this.availableStreets = [];
    
    // Cargar datos en paralelo
    this.loadOrganizationData();
    this.loadSchedulesWithRetry();
    this.loadRoutesWithRetry();
    
    // Si ya hay un programa seleccionado y tiene zona, cargar las calles
    if (this.program?.zoneId) {
      // Esperar un poco para que se carguen las zonas primero
      setTimeout(() => {
        this.loadStreetsByZone(this.program!.zoneId!);
      }, 100);
    }
  }

  /**
   * Cargar horarios con reintentos en caso de fallo
   */
  private loadSchedulesWithRetry(retryCount: number = 0): void {
    if (!this.organizationId) return;

    console.log(`[UpdateProgramModal] Loading all schedules for organization (attempt ${retryCount + 1}):`, this.organizationId);
    
    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Complete schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mostrar información detallada de la respuesta
          console.log('[UpdateProgramModal] Schedules data:', response.data);
          console.log('[UpdateProgramModal] Data type:', typeof response.data);
          console.log('[UpdateProgramModal] Is array:', Array.isArray(response.data));
          
          // Verificar cada horario
          if (Array.isArray(response.data)) {
            response.data.forEach((schedule: any, index) => {
              console.log(`[UpdateProgramModal] Schedule ${index}:`, schedule);
              console.log(`[UpdateProgramModal] Schedule ${index} has zoneId:`, schedule.zoneId);
              console.log(`[UpdateProgramModal] ZoneId type:`, typeof schedule.zoneId);
            });
          }
          
          // Mapear los datos para evitar conflictos de tipos
          this.availableSchedules = (response.data || []).map((schedule: any) => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
          console.log('[UpdateProgramModal] All schedules loaded:', this.availableSchedules);
          console.log('[UpdateProgramModal] Total schedules count:', this.availableSchedules.length);
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[UpdateProgramModal] No schedules received or invalid response');
          // Reintentar si es la primera vez
          if (retryCount < 2) {
            console.log(`[UpdateProgramModal] Retrying schedules load (attempt ${retryCount + 2})`);
            setTimeout(() => this.loadSchedulesWithRetry(retryCount + 1), 1000);
          } else {
            this.availableSchedules = [];
          }
        }
      },
      error: (error) => {
        console.error('[UpdateProgramModal] Error loading schedules:', error);
        // Reintentar si es la primera vez
        if (retryCount < 2) {
          console.log(`[UpdateProgramModal] Retrying schedules load after error (attempt ${retryCount + 2})`);
          setTimeout(() => this.loadSchedulesWithRetry(retryCount + 1), 1000);
        } else {
          this.notificationService.error('Error', 'No se pudieron cargar los horarios');
          this.availableSchedules = [];
        }
      }
    });
  }

  /**
   * Cargar rutas con reintentos en caso de fallo
   */
  private loadRoutesWithRetry(retryCount: number = 0): void {
    // Si ya se están cargando las rutas, no cargarlas de nuevo
    if (this.routesLoading) {
      console.log('[UpdateProgramModal] Routes already loading, skipping');
      return;
    }

    if (!this.organizationId) {
      console.log('[UpdateProgramModal] No organizationId for routes loading');
      return;
    }

    // Marcar que las rutas se están cargando
    this.routesLoading = true;
    console.log(`[UpdateProgramModal] Loading routes for organization (attempt ${retryCount + 1}):`, this.organizationId);
    
    this.distributionApi.getAllRoutes(this.organizationId).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Routes API response:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.availableRoutes = (response.data || []).map((route: any) => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));
          
          console.log('[UpdateProgramModal] Routes loaded:', this.availableRoutes);
          console.log('[UpdateProgramModal] Routes count:', this.availableRoutes.length);
          
          // Verificar cada ruta cargada
          this.availableRoutes.forEach((route, index) => {
            console.log(`[UpdateProgramModal] Route ${index}:`, route);
          });
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[UpdateProgramModal] No routes received or invalid response');
          // Reintentar si es la primera vez
          if (retryCount < 2) {
            console.log(`[UpdateProgramModal] Retrying routes load (attempt ${retryCount + 2})`);
            setTimeout(() => this.loadRoutesWithRetry(retryCount + 1), 1000);
          } else {
            this.availableRoutes = [];
          }
        }
        
        // Marcar que las rutas ya no se están cargando
        this.routesLoading = false;
      },
      error: (error) => {
        console.error('[UpdateProgramModal] Error loading routes:', error);
        // Reintentar si es la primera vez
        if (retryCount < 2) {
          console.log(`[UpdateProgramModal] Retrying routes load after error (attempt ${retryCount + 2})`);
          setTimeout(() => this.loadRoutesWithRetry(retryCount + 1), 1000);
        } else {
          this.notificationService.error('Error', 'No se pudieron cargar las rutas');
          this.availableRoutes = [];
        }
        // Marcar que las rutas ya no se están cargando incluso en caso de error
        this.routesLoading = false;
      }
    });
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): FormGroup {
    const todayPeru = this.getTodayInPeru();
    
    return this.formBuilder.group({
      programDate: [todayPeru, [Validators.required, this.validateProgramDate.bind(this)]],
      scheduleId: ['', [Validators.required]],
      routeId: ['', [Validators.required]],
      zoneId: ['', [Validators.required]],
      streetId: ['', [Validators.required]],
      plannedStartTime: ['', [Validators.required]],
      plannedEndTime: ['', [Validators.required]],
      actualStartTime: ['', []],
      actualEndTime: ['', []],
      observations: ['', [Validators.maxLength(500), this.validateObservations.bind(this)]]
    });
  }

  /**
   * Obtiene la fecha actual en la zona horaria de Perú
   */
  private getTodayInPeru(): string {
    const now = new Date();
    // Perú está en UTC-5 (PET - Peru Time)
    const peruTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    return peruTime.toISOString().split('T')[0];
  }

  /**
   * Validador personalizado para la fecha del programa
   */
  private validateProgramDate(control: any): { [key: string]: any } | null {
    if (!control.value) {
      return null; // Si no hay valor, el validador required se encarga
    }

    const selectedDate = control.value;
    const todayPeru = this.getTodayInPeru();

    if (selectedDate !== todayPeru) {
      return { 
        invalidDate: { 
          message: `Solo se puede registrar para la fecha actual (${this.formatDateForDisplay(todayPeru)})` 
        } 
      };
    }

    return null;
  }

  /**
   * Formatea una fecha para mostrar en formato legible
   */
  private formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Validador personalizado para observaciones (solo letras y espacios)
   */
  private validateObservations(control: any): { [key: string]: any } | null {
    if (!control.value) {
      return null; // Si no hay valor, es válido (campo opcional)
    }

    const value = control.value.toString();
    // Expresión regular que permite solo letras (incluye acentos y ñ) y espacios
    const lettersAndSpacesRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;

    if (!lettersAndSpacesRegex.test(value)) {
      return { 
        invalidObservations: { 
          message: 'Las observaciones solo pueden contener letras y espacios' 
        } 
      };
    }

    return null;
  }

  /**
   * Configura la validación en tiempo real del formulario
   */
  private setupFormValidation(): void {
    // Validación en tiempo real del formulario completo
    this.updateForm.valueChanges.subscribe(() => {
      this.validateFormRealTime();
    });

    // Cargar calles y horarios cuando cambia la zona
    this.updateForm.get('zoneId')?.valueChanges.subscribe((zoneId) => {
      console.log('[UpdateProgramModal] Zone value changed to:', zoneId);
      console.log('[UpdateProgramModal] ZoneId type:', typeof zoneId);
      
      if (zoneId && this.organizationId) {
        // Verificar que zoneId sea un string válido
        const validZoneId = String(zoneId).trim();
        console.log('[UpdateProgramModal] Using valid zoneId:', validZoneId);
        
        this.loadStreetsByZone(validZoneId);
        this.loadSchedulesByZone(validZoneId);
      } else {
        console.log('[UpdateProgramModal] Clearing zone data');
        this.availableStreets = [];
        this.availableSchedules = [];
        this.updateForm.patchValue({ streetId: '', scheduleId: '' });
      }
    });
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    console.log('🏢 [UpdateProgramModal] Loading organization data:', this.organizationId);

    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = (response.data.zones?.filter((zone: any) => zone.status === 'ACTIVE') || []).map((zone: any) => ({
            zoneId: zone.zoneId,
            zoneCode: zone.zoneCode,
            zoneName: zone.zoneName
          }));
          
          // Mostrar información detallada de las zonas
          console.log('✅ [UpdateProgramModal] Organization loaded:', response.data.organizationName);
          console.log('📍 [UpdateProgramModal] All zones in organization:', response.data.zones);
          console.log('📍 [UpdateProgramModal] Active zones:', this.availableZones);
          
          // Verificar cada zona
          this.availableZones.forEach((zone, index) => {
            console.log(`[UpdateProgramModal] Zone ${index}:`, {
              zoneId: zone.zoneId,
              zoneCode: zone.zoneCode,
              zoneName: zone.zoneName,
              type: typeof zone.zoneId
            });
          });

          console.log('📍 [UpdateProgramModal] Available zones count:', this.availableZones.length);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ [UpdateProgramModal] Error loading organization:', error);
        this.notificationService.error('Error', 'Error al cargar los datos de la organización');
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga las calles de una zona específica
   */
  private loadStreetsByZone(zoneId: string, callback?: () => void): void {
    if (!this.organizationId) return;

    this.isLoadingStreets = true;
    console.log('🛣️ [UpdateProgramModal] Loading streets for zone:', zoneId);

    this.organizationApi.getActiveStreetsByZone(this.organizationId, zoneId).subscribe({
      next: (streets) => {
        this.availableStreets = streets.map(street => ({
          streetId: street.streetId,
          streetType: street.streetType,
          streetName: street.streetName
        }));
        console.log('✅ [UpdateProgramModal] Streets loaded:', streets.length);

        this.isLoadingStreets = false;
        
        // Ejecutar callback si se proporciona
        if (callback) {
          callback();
        }
        
        // Forzar actualización de la vista
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('❌ [UpdateProgramModal] Error loading streets:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
        
        // Ejecutar callback incluso en caso de error
        if (callback) {
          callback();
        }
      }
    });
  }

  /**
   * Cargar horarios por zona
   */
  private loadSchedulesByZone(zoneId: string): void {
    if (!this.organizationId) return;

    console.log('[UpdateProgramModal] Loading schedules for zone:', zoneId);
    
    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mostrar todos los horarios primero para depuración
          const allSchedules = response.data || [];
          console.log('[UpdateProgramModal] All schedules without filtering:', allSchedules);
          console.log('[UpdateProgramModal] Selected zone:', zoneId);
          
          // Verificar las propiedades de los horarios
          let hasZoneIdProperty = false;
          allSchedules.forEach((schedule: any, index) => {
            console.log(`[UpdateProgramModal] Schedule ${index}:`, {
              id: schedule.id,
              scheduleCode: schedule.scheduleCode,
              scheduleName: schedule.scheduleName,
              zoneId: schedule.zoneId,
              type: typeof schedule.zoneId
            });
            
            // Verificar si al menos un horario tiene zoneId
            if (schedule.zoneId !== undefined) {
              hasZoneIdProperty = true;
            }
          });
          
          // Filtrar horarios por zona (si los horarios tienen la propiedad zoneId)
          if (hasZoneIdProperty) {
            this.availableSchedules = allSchedules
              .filter((schedule: any) => {
                // Comparar como strings y manejar valores null/undefined
                const scheduleZoneId = schedule.zoneId ? String(schedule.zoneId).trim() : '';
                const selectedZoneId = String(zoneId).trim();
                const isMatch = scheduleZoneId === selectedZoneId;
                
                console.log(`[UpdateProgramModal] Comparing: "${scheduleZoneId}" === "${selectedZoneId}" = ${isMatch}`);
                return isMatch;
              })
              .map((schedule: any) => ({
                id: schedule.id,
                scheduleCode: schedule.scheduleCode,
                scheduleName: schedule.scheduleName
              }));
          } else {
            // Si no hay zoneId en los horarios, mostrar todos los horarios disponibles
            console.log('[UpdateProgramModal] Schedules do not have zoneId property, showing all');
            this.availableSchedules = allSchedules.map((schedule: any) => ({
              id: schedule.id,
              scheduleCode: schedule.scheduleCode,
              scheduleName: schedule.scheduleName
            }));
          }
          
          console.log('[UpdateProgramModal] Schedules filtered by zone:', this.availableSchedules);
          console.log('[UpdateProgramModal] Filtered schedules count:', this.availableSchedules.length);
          
          // Verificar si el horario seleccionado está disponible
          if (this.program && this.program.scheduleId) {
            const selectedSchedule = this.availableSchedules.find(s => s.id === this.program!.scheduleId);
            if (!selectedSchedule) {
              console.log('[UpdateProgramModal] Selected schedule not in filtered list, keeping it available');
              // Si el horario seleccionado no está en la lista filtrada, agregarlo
              const originalSchedule = allSchedules.find((s: any) => s.id === this.program!.scheduleId);
              if (originalSchedule) {
                this.availableSchedules.push({
                  id: originalSchedule.id,
                  scheduleCode: originalSchedule.scheduleCode,
                  scheduleName: originalSchedule.scheduleName
                });
              }
            }
          }
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[UpdateProgramModal] No schedules received or invalid response');
          this.availableSchedules = [];
        }
      },
      error: (error) => {
        console.error('[UpdateProgramModal] Error loading schedules:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los horarios');
        this.availableSchedules = [];
      }
    });
  }

  /**
   * Cargar horarios (sin filtro)
   */
  private loadSchedules(): void {
    if (!this.organizationId) return;

    console.log('[UpdateProgramModal] Loading all schedules for organization:', this.organizationId);
    
    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Complete schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mostrar información detallada de la respuesta
          console.log('[UpdateProgramModal] Schedules data:', response.data);
          console.log('[UpdateProgramModal] Data type:', typeof response.data);
          console.log('[UpdateProgramModal] Is array:', Array.isArray(response.data));
          
          // Verificar cada horario
          if (Array.isArray(response.data)) {
            response.data.forEach((schedule: any, index) => {
              console.log(`[UpdateProgramModal] Schedule ${index}:`, schedule);
              console.log(`[UpdateProgramModal] Schedule ${index} has zoneId:`, schedule.zoneId);
              console.log(`[UpdateProgramModal] ZoneId type:`, typeof schedule.zoneId);
            });
          }
          
          // Mapear los datos para evitar conflictos de tipos
          this.availableSchedules = (response.data || []).map((schedule: any) => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
          console.log('[UpdateProgramModal] All schedules loaded:', this.availableSchedules);
          console.log('[UpdateProgramModal] Total schedules count:', this.availableSchedules.length);
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[UpdateProgramModal] No schedules received or invalid response');
          this.availableSchedules = [];
        }
      },
      error: (error) => {
        console.error('[UpdateProgramModal] Error loading schedules:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los horarios');
        this.availableSchedules = [];
      }
    });
  }

  /**
   * Cargar rutas
   */
  private loadRoutes(): void {
    // Si ya se están cargando las rutas, no cargarlas de nuevo
    if (this.routesLoading) {
      console.log('[UpdateProgramModal] Routes already loading, skipping');
      return;
    }

    if (!this.organizationId) {
      console.log('[UpdateProgramModal] No organizationId for routes loading');
      return;
    }

    // Marcar que las rutas se están cargando
    this.routesLoading = true;
    console.log('[UpdateProgramModal] Loading routes for organization:', this.organizationId);
    
    this.distributionApi.getAllRoutes(this.organizationId).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Routes API response:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.availableRoutes = (response.data || []).map((route: any) => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));
          
          console.log('[UpdateProgramModal] Routes loaded:', this.availableRoutes);
          console.log('[UpdateProgramModal] Routes count:', this.availableRoutes.length);
          
          // Verificar cada ruta cargada
          this.availableRoutes.forEach((route, index) => {
            console.log(`[UpdateProgramModal] Route ${index}:`, route);
          });
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[UpdateProgramModal] No routes received or invalid response');
          this.availableRoutes = [];
        }
        
        // Marcar que las rutas ya no se están cargando
        this.routesLoading = false;
      },
      error: (error) => {
        console.error('[UpdateProgramModal] Error loading routes:', error);
        this.notificationService.error('Error', 'No se pudieron cargar las rutas');
        this.availableRoutes = [];
        // Marcar que las rutas ya no se están cargando incluso en caso de error
        this.routesLoading = false;
      }
    });
  }

  /**
   * Validación en tiempo real del formulario
   */
  private validateFormRealTime(): void {
    this.validationErrors = {};

    // Validar fecha del programa
    const programDateControl = this.updateForm.get('programDate');
    if (!programDateControl?.value) {
      this.validationErrors['programDate'] = 'La fecha del programa es requerida';
    } else if (programDateControl.errors?.['invalidDate']) {
      this.validationErrors['programDate'] = programDateControl.errors['invalidDate'].message;
    }

    // Validar horario
    const scheduleControl = this.updateForm.get('scheduleId');
    if (!scheduleControl?.value) {
      this.validationErrors['scheduleId'] = 'Seleccione un horario';
    }

    // Validar ruta
    const routeControl = this.updateForm.get('routeId');
    if (!routeControl?.value) {
      this.validationErrors['routeId'] = 'Seleccione una ruta';
    }

    // Validar zona
    const zoneControl = this.updateForm.get('zoneId');
    if (!zoneControl?.value) {
      this.validationErrors['zoneId'] = 'Seleccione una zona';
    }

    // Validar calle
    const streetControl = this.updateForm.get('streetId');
    if (!streetControl?.value) {
      this.validationErrors['streetId'] = 'Seleccione una calle';
    }

    // Validar hora de inicio planificada
    const plannedStartTimeControl = this.updateForm.get('plannedStartTime');
    if (!plannedStartTimeControl?.value) {
      this.validationErrors['plannedStartTime'] = 'La hora de inicio planificada es requerida';
    }

    // Validar hora de fin planificada
    const plannedEndTimeControl = this.updateForm.get('plannedEndTime');
    if (!plannedEndTimeControl?.value) {
      this.validationErrors['plannedEndTime'] = 'La hora de fin planificada es requerida';
    }

    // Validar que la hora de fin planificada sea posterior a la de inicio planificada
    if (plannedStartTimeControl?.value && plannedEndTimeControl?.value) {
      const plannedStartTime = plannedStartTimeControl.value;
      const plannedEndTime = plannedEndTimeControl.value;
      
      if (plannedStartTime >= plannedEndTime) {
        this.validationErrors['plannedEndTime'] = 'La hora de fin planificada debe ser posterior a la hora de inicio planificada';
      }
    }

    // Validar que si se ingresa hora de inicio real, también se ingrese hora de fin real
    const actualStartTimeControl = this.updateForm.get('actualStartTime');
    const actualEndTimeControl = this.updateForm.get('actualEndTime');
    
    if (actualStartTimeControl?.value && !actualEndTimeControl?.value) {
      this.validationErrors['actualEndTime'] = 'Debe ingresar la hora de fin real';
    }
    
    if (!actualStartTimeControl?.value && actualEndTimeControl?.value) {
      this.validationErrors['actualStartTime'] = 'Debe ingresar la hora de inicio real';
    }

    // Validar que la hora de fin real sea posterior a la de inicio real (si ambas existen)
    if (actualStartTimeControl?.value && actualEndTimeControl?.value) {
      const actualStartTime = actualStartTimeControl.value;
      const actualEndTime = actualEndTimeControl.value;
      
      if (actualStartTime >= actualEndTime) {
        this.validationErrors['actualEndTime'] = 'La hora de fin real debe ser posterior a la hora de inicio real';
      }
    }

    // Validar observaciones
    const observationsControl = this.updateForm.get('observations');
    const observationsValue = observationsControl?.value || '';
    if (observationsValue && observationsValue.length > 500) {
      this.validationErrors['observations'] = 'Las observaciones no pueden exceder 500 caracteres';
    } else if (observationsControl?.errors?.['invalidObservations']) {
      this.validationErrors['observations'] = observationsControl.errors['invalidObservations'].message;
    }
  }

  /**
   * Poblar el formulario con los datos del programa
   */
  private populateForm(): void {
    if (!this.program) return;

    console.log('[UpdateProgramModal] Populating form with program:', this.program);
    console.log('[UpdateProgramModal] Available schedules:', this.availableSchedules);
    console.log('[UpdateProgramModal] Available routes:', this.availableRoutes);
    console.log('[UpdateProgramModal] Available zones:', this.availableZones);
    console.log('[UpdateProgramModal] Available streets:', this.availableStreets);

    // Rellenar primero los campos que no dependen de datos asíncronos
    this.updateForm.patchValue({
      programDate: this.program.programDate,
      scheduleId: this.program.scheduleId,
      routeId: this.program.routeId,
      zoneId: this.program.zoneId,
      plannedStartTime: this.program.plannedStartTime,
      plannedEndTime: this.program.plannedEndTime,
      actualStartTime: this.program.actualStartTime || '',
      actualEndTime: this.program.actualEndTime || '',
      observations: this.program.observations || ''
    });

    console.log('[UpdateProgramModal] Form values after patch:', this.updateForm.value);

    // Si hay una zona seleccionada, cargar las calles y luego establecer la calle
    if (this.program.zoneId) {
      console.log('[UpdateProgramModal] Loading streets for zone:', this.program.zoneId);
      this.loadStreetsByZone(this.program.zoneId, () => {
        // Después de cargar las calles, establecer la calle seleccionada
        console.log('[UpdateProgramModal] Setting streetId after loading streets:', this.program!.streetId);
        // Verificar que el formulario aún esté disponible
        if (this.updateForm) {
          this.updateForm.patchValue({
            streetId: this.program!.streetId
          });
        }
      });
      
      // Cargar los horarios para la zona
      console.log('[UpdateProgramModal] Loading schedules for zone:', this.program.zoneId);
      this.loadSchedulesByZone(this.program.zoneId);
    } else {
      // Si no hay zona, establecer la calle directamente
      console.log('[UpdateProgramModal] Setting streetId directly:', this.program.streetId);
      // Verificar que el formulario aún esté disponible
      if (this.updateForm) {
        this.updateForm.patchValue({
          streetId: this.program.streetId
        });
      }
    }
    
    // Verificar si el horario seleccionado está disponible y agregarlo si no lo está
    setTimeout(() => {
      const selectedSchedule = this.availableSchedules.find(s => s.id === this.program!.scheduleId);
      if (!selectedSchedule && this.program!.scheduleId) {
        console.warn('[UpdateProgramModal] Selected schedule not found in available schedules, checking if we need to reload');
        // Si el horario no está disponible, verificar si necesitamos recargar
        if (this.organizationId) {
          // Agregar el horario seleccionado a la lista si no está presente
          const scheduleToAdd = {
            id: this.program!.scheduleId,
            scheduleCode: `Horario ${this.program!.scheduleId.substring(0, 8)}`,
            scheduleName: 'Horario seleccionado'
          };
          
          // Verificar que no esté ya en la lista
          const alreadyExists = this.availableSchedules.some(s => s.id === scheduleToAdd.id);
          if (!alreadyExists) {
            this.availableSchedules.push(scheduleToAdd);
            console.log('[UpdateProgramModal] Added selected schedule to available schedules:', scheduleToAdd);
          }
        }
      }
    }, 1000);
  }

  /**
   * Actualizar programa
   */
  onUpdateProgram(): void {
    // Validar formulario
    this.validateFormRealTime();

    if (Object.keys(this.validationErrors).length > 0) {
      this.notificationService.error('Errores de validación', 'Por favor corrija los errores antes de continuar');
      return;
    }

    if (!this.organizationId) {
      this.notificationService.error('Error', 'No se ha especificado la organización');
      return;
    }

    if (!this.program) {
      this.notificationService.error('Error', 'No se ha especificado el programa a actualizar');
      return;
    }

    this.isSaving = true;

    // Obtener el ID del usuario autenticado
    const currentUser = this.authService.getCurrentUser();
    const responsibleUserId = currentUser?.userId || '';

    if (!responsibleUserId) {
      this.notificationService.error('Error', 'No se pudo obtener el usuario responsable');
      this.isSaving = false;
      return;
    }

    // Preparar datos para la actualización
    const updateData: DistributionProgramCreateRequest = {
      organizationId: this.organizationId,
      programCode: this.program.programCode, // Mantener el código original
      scheduleId: this.updateForm.get('scheduleId')?.value,
      routeId: this.updateForm.get('routeId')?.value,
      zoneId: this.updateForm.get('zoneId')?.value,
      streetId: this.updateForm.get('streetId')?.value,
      programDate: this.updateForm.get('programDate')?.value,
      plannedStartTime: this.updateForm.get('plannedStartTime')?.value,
      plannedEndTime: this.updateForm.get('plannedEndTime')?.value,
      responsibleUserId: responsibleUserId,
      observations: this.updateForm.get('observations')?.value || ''
    };

    // Siempre incluir las horas reales en la actualización, incluso si están vacías
    // Esto asegura que se puedan limpiar valores previos
    const actualStartTime = this.updateForm.get('actualStartTime')?.value;
    const actualEndTime = this.updateForm.get('actualEndTime')?.value;
    
    console.log('[UpdateProgramModal] Form actual times:', { actualStartTime, actualEndTime });
    
    // Manejar correctamente los valores vacíos/null
    // Siempre incluir las horas reales en el objeto de actualización
    updateData.actualStartTime = actualStartTime || null;
    updateData.actualEndTime = actualEndTime || null;

    console.log('[UpdateProgramModal] Updating program with data:', updateData);

    // Llamar al servicio para actualizar el programa
    this.distributionApi.updateDistributionProgram(this.program.id, updateData).subscribe({
      next: (response) => {
        console.log('[UpdateProgramModal] Response from update API:', response);
        
        // Verificar si la respuesta indica éxito (manejando diferentes formatos)
        const isSuccess = response && (response.success === true || response.status === true || response.data !== undefined);
        
        if (isSuccess) {
          this.notificationService.success(
            '¡Programa Actualizado!',
            `El programa ${this.program?.programCode} ha sido actualizado exitosamente`
          );
          
          // Mostrar los datos actualizados si están disponibles
          if (response.data) {
            console.log('[UpdateProgramModal] Updated program data:', response.data);
          }
          
          // Emitir evento para actualizar la lista
          this.programUpdated.emit();
          
          // Cerrar el modal después de una actualización exitosa
          this.onClose();
        } else {
          const errorMessage = response?.message || response?.error?.message || 'No se pudo actualizar el programa';
          this.notificationService.error(
            'Error al actualizar',
            errorMessage
          );
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error al actualizar programa:', error);
        
        // Extraer mensaje de error específico si está disponible
        let errorMessage = 'Ocurrió un error al actualizar el programa. Intente nuevamente.';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
        } else if (error?.status === 400) {
          errorMessage = 'Datos inválidos. Verifique que todos los campos estén correctamente completados.';
        } else if (error?.status === 401) {
          errorMessage = 'Sesión expirada. Por favor inicie sesión nuevamente.';
        } else if (error?.status === 403) {
          errorMessage = 'Acceso denegado. No tiene permisos para actualizar este programa.';
        } else if (error?.status === 404) {
          errorMessage = 'Programa no encontrado. Puede que ya haya sido eliminado.';
        } else if (error?.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
        }
        
        this.notificationService.error('Error al actualizar', errorMessage);
        this.isSaving = false;
      }
    });
  }

  /**
   * Cerrar modal
   */
  onClose(): void {
    // Resetear el modal antes de cerrarlo
    this.resetModal();
    this.close.emit();
  }

  /**
   * Validar si un campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  /**
   * Obtener mensaje de error de un campo
   */
  getFieldError(fieldName: string): string {
    return this.validationErrors[fieldName] || '';
  }

  /**
   * Verificar si hay errores de validación
   */
  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  /**
   * Resetear el modal
   */
  private resetModal(): void {
    // Resetear el formulario
    this.updateForm.reset();
    
    // Limpiar errores de validación
    this.validationErrors = {};
    
    // Limpiar datos de organización
    this.organizationData = null;
    
    // Limpiar listas disponibles
    this.availableZones = [];
    this.availableStreets = [];
    this.availableSchedules = [];
    this.availableRoutes = [];
    
    // Resetear estados de carga
    this.isLoading = false;
    this.isSaving = false;
    this.isLoadingStreets = false;
    this.routesLoading = false;
    
    // Limpiar el programa actual
    this.program = null;
    
    console.log('[UpdateProgramModal] Modal reset completed');
  }

  /**
   * Maneja la entrada de texto en observaciones para filtrar caracteres no válidos
   */
  onObservationsInput(event: any): void {
    const input = event.target;
    const value = input.value;
    
    // Filtrar solo letras (incluye acentos y ñ) y espacios
    const filteredValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    
    // Si el valor cambió, actualizar el campo
    if (filteredValue !== value) {
      this.updateForm.patchValue({ observations: filteredValue });
      // Mantener la posición del cursor
      const cursorPosition = input.selectionStart;
      setTimeout(() => {
        input.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
      }, 0);
    }
  }
}