import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DistributionOrganizationApi as OrganizationApi, OrganizationData, Zone, Street } from '../../../services/organization-api.service';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionScheduleCreateRequest } from '../../../models/schedules.model';
import { NotificationService } from '../../../../../shared/services/notification.service';
// Importar el componente de confirmación local


@Component({
  selector: 'app-create-schedule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-schedule-modal.component.html',
  styleUrl: './create-schedule-modal.component.css'
})
export class CreateScheduleModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() scheduleCreated = new EventEmitter<void>();

  isSaving: boolean = false;
  isLoading: boolean = false;
  isLoadingStreets: boolean = false;
  
  // Datos del formulario reactivo
  createForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  // Datos de organización
  organizationData: OrganizationData | null = null;
  availableZones: Zone[] = [];
  availableStreets: Street[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private organizationApi: OrganizationApi,
    private distributionApi: DistributionApi,
    private notificationService: NotificationService
  ) {
    this.createForm = this.initializeForm();
  }

  ngOnInit(): void {
    // Inicializar el formulario cuando el componente se inicializa
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.organizationId) {
      console.log('[CreateScheduleModal] Modal abierto con organizationId:', this.organizationId);
      this.loadOrganizationData();
      this.createForm.patchValue({ organizationId: this.organizationId });
      
      // Configurar validaciones
      this.setupFormValidation();
    }

    if (changes['organizationId'] && this.organizationId && this.isOpen) {
      console.log('[CreateScheduleModal] organizationId cambiado a:', this.organizationId);
      this.loadOrganizationData();
      this.createForm.patchValue({ organizationId: this.organizationId });
    }
  }

  // Escuchar la tecla Escape para cerrar el modal
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      scheduleName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)]],
      zoneId: ['', [Validators.required]],
      streetId: ['', [Validators.required]],
      daysOfWeek: [[], [Validators.required]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      durationHours: [{ value: 0, disabled: true }]
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

    // Calcular duración cuando cambian las horas
    this.createForm.get('startTime')?.valueChanges.subscribe(() => {
      this.calculateDuration();
    });

    this.createForm.get('endTime')?.valueChanges.subscribe(() => {
      this.calculateDuration();
    });
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    console.log('🏢 [CreateScheduleModal] Cargando datos de organización:', this.organizationId);

    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = response.data.zones?.filter(zone => zone.status === 'ACTIVE') || [];

          console.log('✅ [CreateScheduleModal] Organización cargada:', response.data.organizationName);
          console.log('📍 [CreateScheduleModal] Zonas disponibles:', this.availableZones.length);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ [CreateScheduleModal] Error cargando organización:', error);
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
    console.log('🛣️ [CreateScheduleModal] Cargando calles para zona:', zoneId);

    this.organizationApi.getActiveStreetsByZone(this.organizationId, zoneId).subscribe({
      next: (streets) => {
        this.availableStreets = streets;
        console.log('✅ [CreateScheduleModal] Calles cargadas:', streets.length);

        // Limpiar selección de calle anterior
        this.createForm.patchValue({ streetId: '' });
        this.isLoadingStreets = false;
      },
      error: (error) => {
        console.error('❌ [CreateScheduleModal] Error cargando calles:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
      }
    });
  }

  /**
   * Calcular la duración en horas automáticamente
   */
  private calculateDuration(): void {
    const startTime = this.createForm.get('startTime')?.value;
    const endTime = this.createForm.get('endTime')?.value;

    if (startTime && endTime && this.isEndTimeValid(startTime, endTime)) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      // Si la hora de fin es menor (caso de horario nocturno que cruza la medianoche)
      const durationMinutes = endTotalMinutes > startTotalMinutes
        ? endTotalMinutes - startTotalMinutes
        : (24 * 60 - startTotalMinutes) + endTotalMinutes;

      // Convertir a horas con 2 decimales
      const durationHours = parseFloat((durationMinutes / 60).toFixed(2));
      this.createForm.patchValue({ durationHours });
    } else {
      this.createForm.patchValue({ durationHours: 0 });
    }
  }

  /**
   * Verificar si la hora de fin es válida (mayor que la hora de inicio)
   */
  private isEndTimeValid(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return true;

    // Convertir horas a minutos para comparar
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes > startTotalMinutes;
  }

  /**
   * Validación en tiempo real del formulario
   */
  private validateFormRealTime(): void {
    this.validationErrors = {};

    // Validar nombre del horario
    const scheduleNameControl = this.createForm.get('scheduleName');
    const scheduleNameValue = scheduleNameControl?.value || '';
    if (!scheduleNameValue) {
      this.validationErrors['scheduleName'] = 'El nombre del horario es requerido';
    } else if (scheduleNameValue.length > 100) {
      this.validationErrors['scheduleName'] = 'El nombre del horario no puede exceder 100 caracteres';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(scheduleNameValue)) {
      this.validationErrors['scheduleName'] = 'El nombre solo puede contener letras y espacios';
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

    // Validar días de la semana
    const daysControl = this.createForm.get('daysOfWeek');
    if (!daysControl?.value || daysControl.value.length === 0) {
      this.validationErrors['daysOfWeek'] = 'Seleccione al menos un día de la semana';
    }

    // Validar hora de inicio
    const startTimeControl = this.createForm.get('startTime');
    if (!startTimeControl?.value) {
      this.validationErrors['startTime'] = 'La hora de inicio es requerida';
    }

    // Validar hora de fin
    const endTimeControl = this.createForm.get('endTime');
    if (!endTimeControl?.value) {
      this.validationErrors['endTime'] = 'La hora de fin es requerida';
    }

    // Validar que la hora de fin sea posterior a la de inicio
    if (startTimeControl?.value && endTimeControl?.value) {
      const startTime = startTimeControl.value;
      const endTime = endTimeControl.value;

      if (startTime >= endTime) {
        this.validationErrors['endTime'] = 'La hora de fin debe ser posterior a la hora de inicio';
      }
    }
  }

  /**
   * Manejar cambios en los días de la semana
   */
  onDayChange(event: any, day: string): void {
    const isChecked = event.target.checked;
    const daysArray = this.createForm.get('daysOfWeek')?.value || [];

    if (isChecked) {
      // Añadir el día si no está ya en el array
      if (!daysArray.includes(day)) {
        daysArray.push(day);
        this.createForm.patchValue({ daysOfWeek: daysArray });
      }
    } else {
      // Remover el día si está en el array
      const index = daysArray.indexOf(day);
      if (index > -1) {
        daysArray.splice(index, 1);
        this.createForm.patchValue({ daysOfWeek: daysArray });
      }
    }
  }

  /**
   * Verificar si un día está seleccionado
   */
  isDaySelected(day: string): boolean {
    const daysArray = this.createForm.get('daysOfWeek')?.value || [];
    return daysArray.includes(day);
  }

  /**
   * Crear nuevo horario
   */
  onCreateSchedule(): void {
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

    const createRequest: DistributionScheduleCreateRequest = {
      organizationId: this.organizationId,
      zoneId: formValues.zoneId,
      streetId: formValues.streetId,
      scheduleName: formValues.scheduleName.trim(),
      daysOfWeek: formValues.daysOfWeek,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      durationHours: formValues.durationHours
    };

    console.log('🚀 [CreateScheduleModal] Creando horario:', createRequest);

    this.distributionApi.createSchedule(createRequest).subscribe({
      next: (response) => {
        if (response && (response.success === true || response.status === true)) {
          console.log('✅ [CreateScheduleModal] Horario creado exitosamente');
          this.notificationService.success('Éxito', 'Horario creado correctamente');

          // Emitir evento para actualizar la lista
          this.scheduleCreated.emit();

          // Cerrar el modal
          this.onClose();
        } else {
          console.error('❌ [CreateScheduleModal] Error en respuesta:', response.message);
          let errorMessage = 'Error al crear el horario';
          if (response && response.message) {
            errorMessage = response.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('❌ [CreateScheduleModal] Error creando horario:', error);
        let errorMessage = 'Error al crear el horario. Intente nuevamente.';
        
        // Manejo específico de errores HTTP
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos para crear el horario. Verifique que todos los campos estén correctamente completados.';
        } else if (error.status === 401) {
          errorMessage = 'No autorizado. Por favor inicie sesión nuevamente.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado. No tiene permisos para crear horarios.';
        } else if (error.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique la configuración del sistema.';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente o contacte al administrador.';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.error('Error', errorMessage);
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
    this.createForm.reset({
      scheduleName: '',
      zoneId: '',
      streetId: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      durationHours: 0
    });

    this.validationErrors = {};
    this.organizationData = null;
    this.availableZones = [];
    this.availableStreets = [];

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
}