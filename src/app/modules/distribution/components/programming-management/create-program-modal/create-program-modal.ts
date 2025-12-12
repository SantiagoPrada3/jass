import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionOrganizationApi as OrganizationApi } from '../../../services/organization-api.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DistributionProgramCreateRequest } from '../../../models/distribution.model';

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
  selector: 'app-create-program-modal',
  templateUrl: './create-program-modal.html',
  styleUrl: './create-program-modal.css'
})
export class CreateProgramModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() programCreated = new EventEmitter<void>();

  // Estados del modal
  isLoading: boolean = false;
  isSaving: boolean = false;
  isLoadingStreets: boolean = false;

  // Datos del formulario
  createForm: FormGroup;
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
    private readonly notificationService: NotificationService
  ) {
    this.createForm = this.initializeForm();
    this.setupFormValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.organizationId) {
      this.loadOrganizationData();
      this.loadSchedules();
      this.loadRoutes();
    }

    if (changes['organizationId'] && this.organizationId && this.isOpen) {
      this.loadOrganizationData();
      this.loadSchedules();
      this.loadRoutes();
    }
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
      observations: ['', [Validators.maxLength(500)]]
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
   * Configura la validación en tiempo real del formulario
   */
  private setupFormValidation(): void {
    // Validación en tiempo real del formulario completo
    this.createForm.valueChanges.subscribe(() => {
      this.validateFormRealTime();
    });

    // Cargar calles cuando cambia la zona
    this.createForm.get('zoneId')?.valueChanges.subscribe((zoneId) => {
      if (zoneId && this.organizationId) {
        this.loadStreetsByZone(zoneId);
      } else {
        this.availableStreets = [];
        this.createForm.patchValue({ streetId: '' });
      }
    });
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = (response.data.zones || []).map((zone: any) => ({
            zoneId: zone.zoneId,
            zoneCode: zone.zoneCode,
            zoneName: zone.zoneName
          }));
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando organización:', error);
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
    this.organizationApi.getActiveStreetsByZone(this.organizationId, zoneId).subscribe({
      next: (streets) => {
        this.availableStreets = streets.map(street => ({
          streetId: street.streetId,
          streetType: street.streetType,
          streetName: street.streetName
        }));
        this.createForm.patchValue({ streetId: '' });
        this.isLoadingStreets = false;
      },
      error: (error) => {
        console.error('Error cargando calles:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
      }
    });
  }

  /**
   * Cargar horarios
   */
  private loadSchedules(): void {
    if (!this.organizationId) return;

    this.distributionApi.getAllSchedules(this.organizationId).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.availableSchedules = (response.data || []).map(schedule => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
        }
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.notificationService.error('Error', 'No se pudieron cargar los horarios');
      }
    });
  }

  /**
   * Cargar rutas
   */
  private loadRoutes(): void {
    if (!this.organizationId) return;

    this.distributionApi.getAllRoutes(this.organizationId).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.availableRoutes = (response.data || []).map(route => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));
        }
      },
      error: (error) => {
        console.error('Error loading routes:', error);
        this.notificationService.error('Error', 'No se pudieron cargar las rutas');
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

    // Validar hora de inicio
    const startTimeControl = this.createForm.get('plannedStartTime');
    if (!startTimeControl?.value) {
      this.validationErrors['plannedStartTime'] = 'La hora de inicio es requerida';
    }

    // Validar hora de fin
    const endTimeControl = this.createForm.get('plannedEndTime');
    if (!endTimeControl?.value) {
      this.validationErrors['plannedEndTime'] = 'La hora de fin es requerida';
    }

    // Validar que la hora de fin sea posterior a la de inicio
    if (startTimeControl?.value && endTimeControl?.value) {
      const startTime = startTimeControl.value;
      const endTime = endTimeControl.value;
      
      if (startTime >= endTime) {
        this.validationErrors['plannedEndTime'] = 'La hora de fin debe ser posterior a la hora de inicio';
      }
    }

    // Validar observaciones
    const observationsControl = this.createForm.get('observations');
    const observationsValue = observationsControl?.value || '';
    if (observationsValue && observationsValue.length > 500) {
      this.validationErrors['observations'] = 'Las observaciones no pueden exceder 500 caracteres';
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

    const formValues = this.createForm.getRawValue();

    const createRequest: DistributionProgramCreateRequest = {
      organizationId: this.organizationId,
      programCode: '', // Será generado por el backend
      scheduleId: formValues.scheduleId,
      routeId: formValues.routeId,
      zoneId: formValues.zoneId,
      streetId: formValues.streetId, // Corregido: usar el valor directamente como string
      programDate: formValues.programDate,
      plannedStartTime: formValues.plannedStartTime,
      plannedEndTime: formValues.plannedEndTime,
      responsibleUserId: '', // Se puede obtener del usuario actual si es necesario
      observations: formValues.observations || ''
    };

    this.distributionApi.createDistributionProgram(createRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Éxito', 'Programa creado correctamente');
          
          // Emitir evento para actualizar la lista
          this.programCreated.emit();
          
          // Cerrar el modal
          this.onClose();
        } else {
          this.notificationService.error('Error', response.message || 'Error al crear el programa');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error creando programa:', error);
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
}