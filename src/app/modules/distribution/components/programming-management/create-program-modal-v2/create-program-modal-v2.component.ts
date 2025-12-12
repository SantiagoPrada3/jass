import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionOrganizationApi as OrganizationApi, OrganizationData, Zone, Street } from '../../../services/organization-api.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DistributionProgramCreateRequest } from '../../../models/distribution.model';
import { AuthService } from '../../../../../core/auth/services/auth'; // Importar AuthService
import { ProgramStatus } from '../../../models/api-response.model'; // Importar ProgramStatus

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
  selector: 'app-create-program-modal-v2',
  templateUrl: './create-program-modal-v2.component.html',
  styleUrl: './create-program-modal-v2.component.css'
})
export class CreateProgramModalV2Component implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() programCreated = new EventEmitter<void>();

  // Estados del modal
  isLoading: boolean = false;
  isSaving: boolean = false;
  isLoadingStreets: boolean = false;
  // Bandera para evitar llamadas repetidas
  private routesLoading: boolean = false;

  // Datos del formulario
  createForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  // Datos de organización
  organizationData: OrganizationData | null = null;
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
    private readonly authService: AuthService // Inyectar AuthService
  ) {
    this.createForm = this.initializeForm();
    this.setupFormValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || (changes['organizationId'] && this.organizationId)) {
      if (this.isOpen && this.organizationId) {
        console.log('[CreateProgramModalV2] Modal opened with organizationId:', this.organizationId);
        this.loadData();
      }
    }
  }

  /**
   * Cargar todos los datos necesarios
   */
  private loadData(): void {
    if (!this.organizationId) {
      console.log('[CreateProgramModalV2] No organizationId provided');
      return;
    }

    console.log('[CreateProgramModalV2] Loading data for organization:', this.organizationId);

    // Cargar datos en paralelo
    this.loadOrganizationData();
    this.loadSchedules();
    this.loadRoutes();
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
      plannedStartTime: ['08:00', [Validators.required]],
      plannedEndTime: ['17:00', [Validators.required]],
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
   * Obtiene la hora actual en formato HH:mm en la zona horaria de Perú
   */
  private getCurrentTimeInPeru(): string {
    const now = new Date();
    // Obtener la hora local del navegador (que debería estar en hora de Perú)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    console.log('🕐 [CreateProgramModalV2] Current local time:', currentTime);
    return currentTime;
  }

  /**
   * Compara dos horas en formato HH:mm
   * Retorna true si time1 > time2
   */
  private isTimeGreaterThan(time1: string, time2: string): boolean {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);
    
    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;
    
    console.log('⏰ [CreateProgramModalV2] Comparing times:', {
      time1,
      time2,
      totalMinutes1,
      totalMinutes2,
      isGreater: totalMinutes1 > totalMinutes2
    });
    
    return totalMinutes1 > totalMinutes2;
  }

  /**
   * Muestra una confirmación preguntando si se dio agua
   */
  private showWaterConfirmation(programId: string): void {
    const userConfirmed = confirm('El horario planificado ya finalizó. ¿Se dio agua?');
    
    if (userConfirmed) {
      // Si se dio agua, el programa se mantiene como está (PLANNED o IN_PROGRESS)
      this.notificationService.success('Éxito', 'Programa creado correctamente');
      this.programCreated.emit();
      this.onClose();
    } else {
      // Si NO se dio agua, cambiar el estado a CANCELLED (Sin Agua)
      this.updateProgramStatusToCancelled(programId);
    }
  }

  /**
   * Actualiza el estado del programa a CANCELLED (Sin Agua)
   */
  private updateProgramStatusToCancelled(programId: string): void {
    console.log('🚫 [CreateProgramModalV2] Updating program status to CANCELLED:', programId);
    
    this.distributionApi.changeDistributionProgramStatus(programId, ProgramStatus.CANCELLED).subscribe({
      next: (response) => {
        if (response.success === true || response.status === true) {
          console.log('✅ [CreateProgramModalV2] Program status updated to CANCELLED');
          this.notificationService.info('Información', 'Programa marcado como "Sin Agua"');
          this.programCreated.emit();
          this.onClose();
        } else {
          console.error('❌ [CreateProgramModalV2] Error updating status:', response.message);
          this.notificationService.error('Error', 'No se pudo actualizar el estado del programa');
          // Aún así, emitir el evento y cerrar
          this.programCreated.emit();
          this.onClose();
        }
      },
      error: (error) => {
        console.error('❌ [CreateProgramModalV2] Error updating program status:', error);
        this.notificationService.error('Error', 'Error al actualizar el estado del programa');
        // Aún así, emitir el evento y cerrar
        this.programCreated.emit();
        this.onClose();
      }
    });
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
    this.createForm.valueChanges.subscribe(() => {
      this.validateFormRealTime();
    });

    // Cargar calles y horarios cuando cambia la zona
    this.createForm.get('zoneId')?.valueChanges.subscribe((zoneId) => {
      console.log('[CreateProgramModalV2] Zone value changed to:', zoneId);
      console.log('[CreateProgramModalV2] ZoneId type:', typeof zoneId);

      if (zoneId && this.organizationId) {
        // Verificar que zoneId sea un string válido
        const validZoneId = String(zoneId).trim();
        console.log('[CreateProgramModalV2] Using valid zoneId:', validZoneId);

        this.loadStreetsByZone(validZoneId);
        this.loadSchedulesByZone(validZoneId);
      } else {
        console.log('[CreateProgramModalV2] Clearing zone data');
        this.availableStreets = [];
        this.availableSchedules = [];
        this.createForm.patchValue({ streetId: '', scheduleId: '' });
      }
    });
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    console.log('🏢 [CreateProgramModalV2] Loading organization data:', this.organizationId);

    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = (response.data.zones?.filter(zone => zone.status === 'ACTIVE') || []).map(zone => ({
            zoneId: zone.zoneId,
            zoneCode: zone.zoneCode,
            zoneName: zone.zoneName
          }));

          // Mostrar información detallada de las zonas
          console.log('✅ [CreateProgramModalV2] Organization loaded:', response.data.organizationName);
          console.log('📍 [CreateProgramModalV2] All zones in organization:', response.data.zones);
          console.log('📍 [CreateProgramModalV2] Active zones:', this.availableZones);

          // Verificar cada zona
          this.availableZones.forEach((zone, index) => {
            console.log(`[CreateProgramModalV2] Zone ${index}:`, {
              zoneId: zone.zoneId,
              zoneCode: zone.zoneCode,
              zoneName: zone.zoneName,
              type: typeof zone.zoneId
            });
          });

          console.log('📍 [CreateProgramModalV2] Available zones count:', this.availableZones.length);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ [CreateProgramModalV2] Error loading organization:', error);
        this.notificationService.error('Error', 'Error al cargar los datos de la organización');
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga las calles de una zona específica
   */
  private loadStreetsByZone(zoneId: string): void {
    if (!this.organizationId) return;

    this.isLoadingStreets = true;
    console.log('🛣️ [CreateProgramModalV2] Loading streets for zone:', zoneId);

    this.organizationApi.getActiveStreetsByZone(this.organizationId, zoneId).subscribe({
      next: (streets) => {
        this.availableStreets = streets.map(street => ({
          streetId: street.streetId,
          streetType: street.streetType,
          streetName: street.streetName
        }));
        console.log('✅ [CreateProgramModalV2] Streets loaded:', streets.length);

        // Limpiar selección de calle anterior
        this.createForm.patchValue({ streetId: '' });
        this.isLoadingStreets = false;

        // Forzar actualización de la vista
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('❌ [CreateProgramModalV2] Error loading streets:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
      }
    });
  }

  /**
   * Cargar horarios por zona
   */
  private loadSchedulesByZone(zoneId: string): void {
    if (!this.organizationId) return;

    console.log('[CreateProgramModalV2] Loading schedules for zone:', zoneId);

    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        console.log('[CreateProgramModalV2] Schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mostrar todos los horarios primero para depuración
          const allSchedules = response.data || [];
          console.log('[CreateProgramModalV2] All schedules without filtering:', allSchedules);
          console.log('[CreateProgramModalV2] Selected zone:', zoneId);

          // Verificar las propiedades de los horarios
          let hasZoneIdProperty = true;
          allSchedules.forEach((schedule, index) => {
            console.log(`[CreateProgramModalV2] Schedule ${index}:`, {
              id: schedule.id,
              scheduleCode: schedule.scheduleCode,
              scheduleName: schedule.scheduleName,
              zoneId: schedule.zoneId,
              type: typeof schedule.zoneId
            });

            // Verificar si al menos un horario tiene zoneId
            if (schedule.zoneId === undefined) {
              hasZoneIdProperty = false;
            }
          });

          if (hasZoneIdProperty) {
            // Filtrar horarios por zona
            this.availableSchedules = allSchedules
              .filter(schedule => {
                // Comparar como strings
                const scheduleZoneId = String(schedule.zoneId).trim();
                const selectedZoneId = String(zoneId).trim();
                const isMatch = scheduleZoneId === selectedZoneId;

                console.log(`[CreateProgramModalV2] Comparing: "${scheduleZoneId}" === "${selectedZoneId}" = ${isMatch}`);
                return isMatch;
              })
              .map(schedule => ({
                id: schedule.id,
                scheduleCode: schedule.scheduleCode,
                scheduleName: schedule.scheduleName
              }));
          } else {
            // Si no hay zoneId, mostrar todos los horarios con un mensaje
            console.log('[CreateProgramModalV2] Schedules do not have zoneId property, showing all');
            this.availableSchedules = allSchedules.map(schedule => ({
              id: schedule.id,
              scheduleCode: schedule.scheduleCode,
              scheduleName: schedule.scheduleName
            }));
          }

          console.log('[CreateProgramModalV2] Schedules filtered by zone:', this.availableSchedules);
          console.log('[CreateProgramModalV2] Filtered schedules count:', this.availableSchedules.length);

          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[CreateProgramModalV2] No schedules received or invalid response');
          this.availableSchedules = [];
        }
      },
      error: (error) => {
        console.error('[CreateProgramModalV2] Error loading schedules:', error);
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

    console.log('[CreateProgramModalV2] Loading all schedules for organization:', this.organizationId);

    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        console.log('[CreateProgramModalV2] Complete schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mostrar información detallada de la respuesta
          console.log('[CreateProgramModalV2] Schedules data:', response.data);
          console.log('[CreateProgramModalV2] Data type:', typeof response.data);
          console.log('[CreateProgramModalV2] Is array:', Array.isArray(response.data));

          // Verificar cada horario
          if (Array.isArray(response.data)) {
            response.data.forEach((schedule, index) => {
              console.log(`[CreateProgramModalV2] Schedule ${index}:`, schedule);
              console.log(`[CreateProgramModalV2] Schedule ${index} has zoneId:`, schedule.zoneId);
              console.log(`[CreateProgramModalV2] ZoneId type:`, typeof schedule.zoneId);
            });
          }

          // Mapear los datos para evitar conflictos de tipos
          this.availableSchedules = (response.data || []).map(schedule => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
          console.log('[CreateProgramModalV2] All schedules loaded:', this.availableSchedules);
          console.log('[CreateProgramModalV2] Total schedules count:', this.availableSchedules.length);

          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[CreateProgramModalV2] No schedules received or invalid response');
          this.availableSchedules = [];
        }
      },
      error: (error) => {
        console.error('[CreateProgramModalV2] Error loading schedules:', error);
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
      console.log('[CreateProgramModalV2] Routes already loading, skipping');
      return;
    }

    if (!this.organizationId) {
      console.log('[CreateProgramModalV2] No organizationId for routes loading');
      return;
    }

    // Marcar que las rutas se están cargando
    this.routesLoading = true;
    console.log('[CreateProgramModalV2] Loading routes for organization:', this.organizationId);

    this.distributionApi.getAllRoutes(this.organizationId).subscribe({
      next: (response) => {
        console.log('[CreateProgramModalV2] Routes API response:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.availableRoutes = (response.data || []).map(route => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));

          console.log('[CreateProgramModalV2] Routes loaded:', this.availableRoutes);
          console.log('[CreateProgramModalV2] Routes count:', this.availableRoutes.length);

          // Verificar cada ruta cargada
          this.availableRoutes.forEach((route, index) => {
            console.log(`[CreateProgramModalV2] Route ${index}:`, route);
          });

          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[CreateProgramModalV2] No routes received or invalid response');
          this.availableRoutes = [];
        }

        // Marcar que las rutas ya no se están cargando
        this.routesLoading = false;
      },
      error: (error) => {
        console.error('[CreateProgramModalV2] Error loading routes:', error);
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
    const programDateControl = this.createForm.get('programDate');
    if (!programDateControl?.value) {
      this.validationErrors['programDate'] = 'La fecha del programa es requerida';
    } else if (programDateControl.errors?.['invalidDate']) {
      this.validationErrors['programDate'] = programDateControl.errors['invalidDate'].message;
    }

    // Validar horario
    const scheduleControl = this.createForm.get('scheduleId');
    if (!scheduleControl?.value) {
      this.validationErrors['scheduleId'] = 'Seleccione un horario';
    }

    // Validar ruta
    const routeControl = this.createForm.get('routeId');
    if (!routeControl?.value) {
      this.validationErrors['routeId'] = 'Seleccione una ruta';
    }

    // Validar zona
    const zoneControl = this.createForm.get('zoneId');
    if (!zoneControl?.value) {
      this.validationErrors['zoneId'] = 'Seleccione una zona';
    }

    // Validar calle
    const streetControl = this.createForm.get('streetId');
    if (!streetControl?.value) {
      this.validationErrors['streetId'] = 'Seleccione una calle';
    }

    // Validar hora de inicio planificada
    const plannedStartTimeControl = this.createForm.get('plannedStartTime');
    if (!plannedStartTimeControl?.value) {
      this.validationErrors['plannedStartTime'] = 'La hora de inicio planificada es requerida';
    }

    // Validar hora de fin planificada
    const plannedEndTimeControl = this.createForm.get('plannedEndTime');
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
    const actualStartTimeControl = this.createForm.get('actualStartTime');
    const actualEndTimeControl = this.createForm.get('actualEndTime');

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
    const observationsControl = this.createForm.get('observations');
    const observationsValue = observationsControl?.value || '';
    if (observationsValue && observationsValue.length > 500) {
      this.validationErrors['observations'] = 'Las observaciones no pueden exceder 500 caracteres';
    } else if (observationsControl?.errors?.['invalidObservations']) {
      this.validationErrors['observations'] = observationsControl.errors['invalidObservations'].message;
    }
  }

  /**
   * Crear nuevo programa
   */
  onCreateProgram(): void {
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

    this.isSaving = true;

    // Obtener el ID del usuario autenticado
    const currentUser = this.authService.getCurrentUser();
    const responsibleUserId = currentUser?.userId || '';

    if (!responsibleUserId) {
      this.notificationService.error('Error', 'No se pudo obtener el usuario responsable');
      this.isSaving = false;
      return;
    }

    const formValues = this.createForm.getRawValue();

    const createRequest: DistributionProgramCreateRequest = {
      organizationId: this.organizationId,
      // programCode NO se envía - el backend lo genera automáticamente
      scheduleId: formValues.scheduleId,
      routeId: formValues.routeId,
      zoneId: formValues.zoneId,
      streetId: formValues.streetId,
      programDate: formValues.programDate,
      plannedStartTime: formValues.plannedStartTime,
      plannedEndTime: formValues.plannedEndTime,
      actualStartTime: formValues.actualStartTime || undefined,
      actualEndTime: formValues.actualEndTime || undefined,
      responsibleUserId: responsibleUserId, // Usar el ID del usuario autenticado
      observations: formValues.observations || ''
    };

    console.log('🚀 [CreateProgramModalV2] Creating program:', createRequest);

    this.distributionApi.createDistributionProgram(createRequest).subscribe({
      next: (response) => {
        console.log('🚀 [CreateProgramModalV2] Full response from backend:', response);
        console.log('🚀 [CreateProgramModalV2] Response success property:', response.success);
        console.log('🚀 [CreateProgramModalV2] Response status property:', response.status);
        console.log('🚀 [CreateProgramModalV2] Response message:', response.message);
        console.log('🚀 [CreateProgramModalV2] Response data:', response.data);

        // Verificar tanto success como status ya que el backend puede usar cualquiera de los dos
        if (response.success === true || response.status === true) {
          console.log('✅ [CreateProgramModalV2] Program created successfully');
          
          // Verificar que response.data existe y tiene un id
          if (!response.data || !response.data.id) {
            console.error('❌ [CreateProgramModalV2] No program ID in response');
            this.notificationService.error('Error', 'No se pudo obtener el ID del programa creado');
            this.isSaving = false;
            return;
          }
          
          // Verificar si la hora actual supera el horario planificado de finalización
          const currentTime = this.getCurrentTimeInPeru();
          const plannedEndTime = formValues.plannedEndTime;
          
          console.log('⏰ [CreateProgramModalV2] Current time:', currentTime);
          console.log('⏰ [CreateProgramModalV2] Planned end time:', plannedEndTime);
          console.log('⏰ [CreateProgramModalV2] Checking if current time exceeds planned end time...');
          
          if (this.isTimeGreaterThan(currentTime, plannedEndTime)) {
            console.log('⚠️ [CreateProgramModalV2] Current time exceeds planned end time, showing water confirmation');
            // Mostrar notificación preguntando si se dio agua
            this.showWaterConfirmation(response.data.id);
          } else {
            console.log('✅ [CreateProgramModalV2] Current time is within planned time, no confirmation needed');
            this.notificationService.success('Éxito', 'Programa creado correctamente');
            // Emitir evento para actualizar la lista
            this.programCreated.emit();
            // Cerrar el modal
            this.onClose();
          }
        } else {
          console.error('❌ [CreateProgramModalV2] Error in response:', response.message);
          this.notificationService.error('Error', response.message || 'Error al crear el programa');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('❌ [CreateProgramModalV2] Error creating program:', error);
        console.error('❌ [CreateProgramModalV2] Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.notificationService.error('Error', 'Error al crear el programa. Intente nuevamente.');
        this.isSaving = false;
      }
    });
  }

  /**
   * Cancela y cierra el modal
   */
  onClose(): void {
    this.resetModal();
    this.close.emit();
  }

  /**
   * Resetea el modal a su estado inicial
   */
  private resetModal(): void {
    const todayPeru = this.getTodayInPeru();

    this.createForm.reset({
      programDate: todayPeru,
      scheduleId: '',
      routeId: '',
      zoneId: '',
      streetId: '',
      plannedStartTime: '08:00',
      plannedEndTime: '17:00',
      observations: ''
    });

    this.validationErrors = {};
    this.organizationData = null;
    this.availableZones = [];
    this.availableStreets = [];
    this.availableSchedules = [];
    this.availableRoutes = [];

    this.isLoading = false;
    this.isSaving = false;
    this.isLoadingStreets = false;
    this.routesLoading = false;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string | null {
    return this.validationErrors[fieldName] || null;
  }

  /**
   * Verifica si un campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  /**
   * Verifica si hay errores de validación
   */
  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  /**
   * Obtener el nombre de la zona seleccionada
   */
  getSelectedZoneName(): string {
    const zoneId = this.createForm.get('zoneId')?.value;
    if (!zoneId) return '';
    const zone = this.availableZones.find(z => z.zoneId === zoneId);
    return zone ? `${zone.zoneCode} - ${zone.zoneName}` : '';
  }

  /**
   * Obtener el nombre de la calle seleccionada
   */
  getSelectedStreetName(): string {
    const streetId = this.createForm.get('streetId')?.value;
    if (!streetId) return '';
    const street = this.availableStreets.find(s => s.streetId === streetId);
    return street ? `${street.streetType} ${street.streetName}` : '';
  }

  /**
   * Obtener el nombre del horario seleccionado
   */
  getSelectedScheduleName(): string {
    const scheduleId = this.createForm.get('scheduleId')?.value;
    if (!scheduleId) return '';
    const schedule = this.availableSchedules.find(s => s.id === scheduleId);
    // Solo devolver el nombre del horario, no el código
    return schedule ? schedule.scheduleName : '';
  }

  /**
   * Obtener el nombre de la ruta seleccionada
   */
  getSelectedRouteName(): string {
    const routeId = this.createForm.get('routeId')?.value;
    if (!routeId) return '';
    const route = this.availableRoutes.find(r => r.id === routeId);
    return route ? route.routeName : '';
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
      this.createForm.patchValue({ observations: filteredValue });
      // Mantener la posición del cursor
      const cursorPosition = input.selectionStart;
      setTimeout(() => {
        input.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
      }, 0);
    }
  }
}
