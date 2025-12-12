import { Component, Input, Output, EventEmitter, OnInit, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DistributionOrganizationApi as OrganizationApi, Zone, Street, OrganizationData } from '../../../services/organization-api.service';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionScheduleCreateRequest, Schedule } from '../../../models/schedules.model';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { Status } from '../../../models/api-response.model';
// Importar el componente de confirmación local


@Component({
  selector: 'app-update-schedule-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-schedule-modal.component.html',
  styleUrls: ['./update-schedule-modal.component.css']
})
export class UpdateScheduleModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() schedule: Schedule | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() scheduleUpdated = new EventEmitter<void>();

  isSaving: boolean = false;
  isLoading: boolean = false;
  isLoadingStreets: boolean = false;
  
  // Datos del formulario
  updatedSchedule: DistributionScheduleCreateRequest = {
    organizationId: '',
    zoneId: '',
    streetId: '',
    scheduleName: '',
    daysOfWeek: [],
    startTime: '',
    endTime: '',
    durationHours: 0
  } as DistributionScheduleCreateRequest;

  // Datos de organización
  organizationData: OrganizationData | null = null;
  availableZones: Zone[] = [];
  availableStreets: Street[] = [];

  constructor(
    private organizationApi: OrganizationApi,
    private distributionApi: DistributionApi,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    console.log('[UpdateScheduleModal] ngOnInit ejecutado');
    console.log('[UpdateScheduleModal] isOpen:', this.isOpen);
    console.log('[UpdateScheduleModal] schedule:', this.schedule);
    
    if (this.isOpen && this.schedule) {
      console.log('[UpdateScheduleModal] Inicializando formulario');
      this.loadOrganizationData();
      this.initializeForm();
    } else {
      console.log('[UpdateScheduleModal] No se inicializa el formulario porque isOpen es', this.isOpen, 'y schedule es', this.schedule);
    }
  }

  ngOnChanges(changes: any): void {
    console.log('[UpdateScheduleModal] ngOnChanges ejecutado');
    console.log('[UpdateScheduleModal] changes:', changes);
    console.log('[UpdateScheduleModal] isOpen:', this.isOpen);
    console.log('[UpdateScheduleModal] schedule:', this.schedule);
    
    if (this.isOpen && this.schedule) {
      console.log('[UpdateScheduleModal] Inicializando formulario en ngOnChanges');
      this.loadOrganizationData();
      // Usar setTimeout para asegurar que los datos de la organización se carguen primero
      setTimeout(() => {
        this.initializeForm();
      }, 0);
    } else {
      console.log('[UpdateScheduleModal] No se inicializa el formulario en ngOnChanges porque isOpen es', this.isOpen, 'y schedule es', this.schedule);
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
   * Inicializar el formulario con los datos del horario
   */
  private initializeForm(): void {
    console.log('[UpdateScheduleModal] initializeForm llamado con schedule:', this.schedule);
    
    // Verificar que el horario exista y tenga un ID válido
    if (!this.schedule || !this.schedule.id) {
      console.warn('[UpdateScheduleModal] Horario no válido o sin ID');
      this.notificationService.error('Error', 'Horario no válido. Puede que ya haya sido eliminado.');
      this.onClose(); // Cerrar el modal si el horario no es válido
      return;
    }
    
    // Verificar que el horario tenga los datos mínimos requeridos
    if (!this.schedule.organizationId) {
      console.warn('[UpdateScheduleModal] Horario sin organización');
      this.notificationService.error('Error', 'Horario sin datos de organización.');
      this.onClose();
      return;
    }
    
    this.updatedSchedule = {
      organizationId: this.schedule.organizationId,
      zoneId: this.schedule.zoneId,
      streetId: this.schedule.streetId,
      scheduleName: this.schedule.scheduleName,
      daysOfWeek: [...this.schedule.daysOfWeek],
      startTime: this.schedule.startTime,
      endTime: this.schedule.endTime,
      durationHours: this.schedule.durationHours,
      scheduleId: this.schedule.id,
      scheduleCode: this.schedule.scheduleCode
    };
    
    // Cargar calles de la zona seleccionada
    if (this.schedule.zoneId) {
      this.loadStreetsForZone(this.schedule.zoneId);
    }
    
    console.log('[UpdateScheduleModal] Formulario inicializado con:', this.updatedSchedule);
  }

  /**
   * Cargar datos de la organización para obtener zonas y calles
   */
  private loadOrganizationData(): void {
    const organizationId = this.schedule?.organizationId;
    console.log('[UpdateScheduleModal] loadOrganizationData llamado con organizationId:', organizationId);
    
    if (!organizationId) {
      console.warn('[UpdateScheduleModal] No organizationId provided');
      return;
    }

    this.isLoading = true;
    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response: { status: any; data: OrganizationData; }) => {
        console.log('[UpdateScheduleModal] Respuesta de getOrganizationById:', response);
        if (response && response.status && response.data) {
          this.organizationData = response.data;
          this.availableZones = response.data.zones?.filter((zone: { status: string; }) => zone.status === 'ACTIVE') || [];
          console.log('[UpdateScheduleModal] Zonas cargadas:', this.availableZones);
          
          // Si ya tenemos un schedule con zoneId, cargar las calles
          if (this.schedule?.zoneId) {
            console.log('[UpdateScheduleModal] Cargando calles para zoneId:', this.schedule.zoneId);
            this.loadStreetsForZone(this.schedule.zoneId);
          }
        } else {
          console.warn('[UpdateScheduleModal] Respuesta inválida de getOrganizationById');
          this.notificationService.error('Error', 'Datos de organización inválidos');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('[UpdateScheduleModal] Error loading organization data:', error);
        this.isLoading = false;
        
        // Mostrar más detalles del error
        let errorMsg = 'Error al cargar los datos de la organización';
        
        // Manejo específico para diferentes códigos de error
        if (error.status === 500) {
          errorMsg = 'Error interno del servidor al cargar los datos de la organización. Por favor, intente nuevamente o contacte al administrador del sistema.';
        } else if (error.status === 404) {
          errorMsg = 'No se encontró la organización especificada.';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para acceder a los datos de esta organización.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (error.error && error.error.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        } else if (error.status) {
          errorMsg += ' (Código de error: ' + error.status + ')';
        }
        
        console.log('[UpdateScheduleModal] Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        
        this.notificationService.error('Error', errorMsg);
      }
    });
  }

  /**
   * Cargar calles para una zona específica
   */
  private loadStreetsForZone(zoneId: string): void {
    const organizationId = this.schedule?.organizationId;
    console.log('[UpdateScheduleModal] loadStreetsForZone llamado con zoneId:', zoneId, 'organizationId:', organizationId);
    
    if (!zoneId || !organizationId) {
      console.warn('[UpdateScheduleModal] No zoneId o organizationId proporcionado');
      this.availableStreets = [];
      return;
    }

    this.isLoadingStreets = true;
    console.log('[UpdateScheduleModal] Cargando calles para zona:', zoneId);
    
    this.organizationApi.getActiveStreetsByZone(organizationId, zoneId).subscribe({
      next: (streets) => {
        console.log('[UpdateScheduleModal] Calles cargadas:', streets);
        this.availableStreets = streets;
        this.isLoadingStreets = false;
      },
      error: (error) => {
        console.error('[UpdateScheduleModal] Error cargando calles:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
        this.notificationService.error('Error', 'Error al cargar las calles de la zona seleccionada');
      }
    });
  }

  /**
   * Cargar calles cuando cambia la zona seleccionada
   */
  onZoneChange(event: any): void {
    const zoneId = event.target.value;
    console.log('[UpdateScheduleModal] onZoneChange llamado con zoneId:', zoneId);
    
    if (zoneId) {
      // Limpiar selección de calle anterior
      this.updatedSchedule.streetId = '';
      // Cargar calles de la nueva zona
      this.loadStreetsForZone(zoneId);
    } else {
      this.availableStreets = [];
      this.updatedSchedule.streetId = '';
    }
  }

  /**
   * Obtener el nombre de la zona seleccionada
   */
  getSelectedZoneName(): string {
    if (!this.updatedSchedule.zoneId) return '';
    const zone = this.availableZones.find(z => z.zoneId === this.updatedSchedule.zoneId);
    return zone ? `${zone.zoneCode} - ${zone.zoneName}` : '';
  }

  /**
   * Obtener el nombre de la calle seleccionada
   */
  getSelectedStreetName(): string {
    if (!this.updatedSchedule.streetId) return '';
    const street = this.availableStreets.find(s => s.streetId === this.updatedSchedule.streetId);
    return street ? `${street.streetType} ${street.streetName}` : '';
  }

  /**
   * Verificar si la hora de fin es válida (mayor que la hora de inicio)
   */
  isEndTimeValid(): boolean {
    if (!this.updatedSchedule.startTime || !this.updatedSchedule.endTime) return true;
    
    // Convertir horas a minutos para comparar
    const [startHours, startMinutes] = this.updatedSchedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.updatedSchedule.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return endTotalMinutes > startTotalMinutes;
  }

  /**
   * Calcular la duración en horas automáticamente
   */
  calculateDuration(): void {
    console.log('[UpdateScheduleModal] Calculando duración con startTime:', this.updatedSchedule.startTime, 'endTime:', this.updatedSchedule.endTime);
    
    if (this.updatedSchedule.startTime && this.updatedSchedule.endTime && this.isEndTimeValid()) {
      try {
        const [startHours, startMinutes] = this.updatedSchedule.startTime.split(':').map(Number);
        const [endHours, endMinutes] = this.updatedSchedule.endTime.split(':').map(Number);
        
        console.log('[UpdateScheduleModal] Valores parseados - Start:', startHours, startMinutes, 'End:', endHours, endMinutes);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        
        console.log('[UpdateScheduleModal] Minutos totales - Start:', startTotalMinutes, 'End:', endTotalMinutes);
        
        // Si la hora de fin es menor (caso de horario nocturno que cruza la medianoche)
        const durationMinutes = endTotalMinutes > startTotalMinutes 
          ? endTotalMinutes - startTotalMinutes 
          : (24 * 60 - startTotalMinutes) + endTotalMinutes;
        
        console.log('[UpdateScheduleModal] Minutos de duración:', durationMinutes);
        
        // Convertir a horas con 2 decimales
        this.updatedSchedule.durationHours = parseFloat((durationMinutes / 60).toFixed(2));
        console.log('[UpdateScheduleModal] Duración en horas:', this.updatedSchedule.durationHours);
      } catch (error) {
        console.error('[UpdateScheduleModal] Error al calcular duración:', error);
        this.updatedSchedule.durationHours = 0;
      }
    } else {
      console.log('[UpdateScheduleModal] No se puede calcular duración, estableciendo a 0');
      this.updatedSchedule.durationHours = 0;
    }
  }

  /**
   * Verificar si el formulario es válido
   */
  isFormValid(): boolean {
    console.log('[UpdateScheduleModal] Validando formulario:', this.updatedSchedule);
    
    // Verificar cada campo individualmente para mejor depuración
    const isNameValid = !!(this.updatedSchedule.scheduleName && this.updatedSchedule.scheduleName.trim() !== '' && 
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(this.updatedSchedule.scheduleName));
    console.log('[UpdateScheduleModal] Nombre válido:', isNameValid, 'Valor:', this.updatedSchedule.scheduleName);
    
    const isZoneValid = !!(this.updatedSchedule.zoneId && this.updatedSchedule.zoneId !== '');
    console.log('[UpdateScheduleModal] Zona válida:', isZoneValid, 'Valor:', this.updatedSchedule.zoneId);
    
    const isStreetValid = !!(this.updatedSchedule.streetId && this.updatedSchedule.streetId !== '');
    console.log('[UpdateScheduleModal] Calle válida:', isStreetValid, 'Valor:', this.updatedSchedule.streetId);
    
    const areDaysValid = !!(this.updatedSchedule.daysOfWeek && this.updatedSchedule.daysOfWeek.length > 0);
    console.log('[UpdateScheduleModal] Días válidos:', areDaysValid, 'Valor:', this.updatedSchedule.daysOfWeek);
    
    const isStartTimeValid = !!(this.updatedSchedule.startTime && this.updatedSchedule.startTime !== '');
    console.log('[UpdateScheduleModal] Hora inicio válida:', isStartTimeValid, 'Valor:', this.updatedSchedule.startTime);
    
    const isEndTimeValid = !!(this.updatedSchedule.endTime && this.updatedSchedule.endTime !== '');
    console.log('[UpdateScheduleModal] Hora fin válida:', isEndTimeValid, 'Valor:', this.updatedSchedule.endTime);
    
    const isTimeRelationValid = this.isEndTimeValid();
    console.log('[UpdateScheduleModal] Relación de horas válida:', isTimeRelationValid);
    
    // Validar que durationHours sea un número válido
    const isDurationValid = typeof this.updatedSchedule.durationHours === 'number' && !isNaN(this.updatedSchedule.durationHours);
    console.log('[UpdateScheduleModal] Duración válida:', isDurationValid, 'Valor:', this.updatedSchedule.durationHours);
    
    // Validar que organizationId sea válido
    const isOrganizationValid = !!(this.updatedSchedule.organizationId && this.updatedSchedule.organizationId !== '');
    console.log('[UpdateScheduleModal] Organización válida:', isOrganizationValid, 'Valor:', this.updatedSchedule.organizationId);
    
    // No validar durationHours ya que se calcula automáticamente
    const result = isNameValid && isZoneValid && isStreetValid && areDaysValid && 
      isStartTimeValid && isEndTimeValid && isTimeRelationValid && isDurationValid && isOrganizationValid;
    
    console.log('[UpdateScheduleModal] Resultado de validación:', result);
    if (!result) {
      console.log('[UpdateScheduleModal] Campos que fallaron la validación:');
      if (!isNameValid) console.log('[UpdateScheduleModal] - Nombre inválido');
      if (!isZoneValid) console.log('[UpdateScheduleModal] - Zona inválida');
      if (!isStreetValid) console.log('[UpdateScheduleModal] - Calle inválida');
      if (!areDaysValid) console.log('[UpdateScheduleModal] - Días inválidos');
      if (!isStartTimeValid) console.log('[UpdateScheduleModal] - Hora inicio inválida');
      if (!isEndTimeValid) console.log('[UpdateScheduleModal] - Hora fin inválida');
      if (!isTimeRelationValid) console.log('[UpdateScheduleModal] - Relación de horas inválida');
      if (!isDurationValid) console.log('[UpdateScheduleModal] - Duración inválida');
      if (!isOrganizationValid) console.log('[UpdateScheduleModal] - Organización inválida');
    }
    
    return result;
  }

  /**
   * Actualizar horario
   */
  updateSchedule(): void {
    console.log('[UpdateScheduleModal] Iniciando actualización de horario');
    console.log('[UpdateScheduleModal] Datos del formulario:', this.updatedSchedule);
    
    // Verificar que el formulario sea válido
    console.log('[UpdateScheduleModal] Validando formulario...');
    if (!this.isFormValid()) {
      console.log('[UpdateScheduleModal] Formulario inválido');
      this.notificationService.error('Error', 'Por favor complete todos los campos requeridos correctamente');
      return;
    }
    
    // Verificar que tengamos un ID de horario válido
    if (!this.schedule || !this.schedule.id) {
      console.error('[UpdateScheduleModal] ID de horario no disponible');
      this.notificationService.error('Error', 'ID de horario no disponible. Puede que el horario ya haya sido eliminado.');
      return;
    }
    
    console.log('[UpdateScheduleModal] Formulario válido, procediendo con la actualización');

    // Calcular la duración antes de enviar
    try {
      this.calculateDuration();
      console.log('[UpdateScheduleModal] Duración calculada:', this.updatedSchedule.durationHours);
    } catch (error) {
      console.error('[UpdateScheduleModal] Error al calcular duración:', error);
      this.notificationService.error('Error', 'Error al calcular la duración del horario');
      return;
    }

    // Crear el objeto de solicitud sin scheduleId y scheduleCode ya que el backend los genera
    const scheduleRequest: any = {
      organizationId: this.updatedSchedule.organizationId,
      zoneId: this.updatedSchedule.zoneId,
      streetId: this.updatedSchedule.streetId,
      scheduleName: this.updatedSchedule.scheduleName.trim(),
      daysOfWeek: [...this.updatedSchedule.daysOfWeek], // Crear una copia del array
      startTime: this.updatedSchedule.startTime,
      endTime: this.updatedSchedule.endTime,
      durationHours: this.updatedSchedule.durationHours
    };

    // Solo incluir scheduleId si tiene valor (no vacío)
    if (this.updatedSchedule.scheduleId && this.updatedSchedule.scheduleId.trim() !== '') {
      scheduleRequest.scheduleId = this.updatedSchedule.scheduleId.trim();
    }

    // Solo incluir scheduleCode si tiene valor (no vacío)
    if (this.updatedSchedule.scheduleCode && this.updatedSchedule.scheduleCode.trim() !== '') {
      scheduleRequest.scheduleCode = this.updatedSchedule.scheduleCode.trim();
    }

    // Registrar el objeto que se va a enviar para debugging
    console.log('[UpdateScheduleModal] Objeto de solicitud preparado:', scheduleRequest);
    console.log('[UpdateScheduleModal] Tipos de datos en el objeto de solicitud:');
    Object.keys(scheduleRequest).forEach(key => {
      console.log(`[UpdateScheduleModal]   ${key}: ${typeof scheduleRequest[key]} =`, scheduleRequest[key]);
    });
    
    // Verificar tipos de datos específicos
    console.log('[UpdateScheduleModal] Verificación de tipos específicos:');
    console.log('[UpdateScheduleModal]   organizationId tipo:', typeof scheduleRequest.organizationId, 'valor:', scheduleRequest.organizationId);
    console.log('[UpdateScheduleModal]   zoneId tipo:', typeof scheduleRequest.zoneId, 'valor:', scheduleRequest.zoneId);
    console.log('[UpdateScheduleModal]   streetId tipo:', typeof scheduleRequest.streetId, 'valor:', scheduleRequest.streetId);
    console.log('[UpdateScheduleModal]   scheduleName tipo:', typeof scheduleRequest.scheduleName, 'valor:', scheduleRequest.scheduleName);
    console.log('[UpdateScheduleModal]   daysOfWeek tipo:', typeof scheduleRequest.daysOfWeek, 'valor:', scheduleRequest.daysOfWeek);
    console.log('[UpdateScheduleModal]   startTime tipo:', typeof scheduleRequest.startTime, 'valor:', scheduleRequest.startTime);
    console.log('[UpdateScheduleModal]   endTime tipo:', typeof scheduleRequest.endTime, 'valor:', scheduleRequest.endTime);
    console.log('[UpdateScheduleModal]   durationHours tipo:', typeof scheduleRequest.durationHours, 'valor:', scheduleRequest.durationHours);
    
    // Verificar si daysOfWeek es un array válido
    if (Array.isArray(scheduleRequest.daysOfWeek)) {
      console.log('[UpdateScheduleModal]   daysOfWeek es un array con', scheduleRequest.daysOfWeek.length, 'elementos');
      scheduleRequest.daysOfWeek.forEach((day: any, index: any) => {
        console.log(`[UpdateScheduleModal]     daysOfWeek[${index}]: tipo=${typeof day}, valor=${day}`);
      });
    } else {
      console.error('[UpdateScheduleModal]   ERROR: daysOfWeek NO es un array válido');
    }
    
    // Ejecutar diagnóstico de datos
    if (!this.diagnoseScheduleData(scheduleRequest)) {
      console.error('[UpdateScheduleModal] Diagnóstico de datos fallido. Abortando actualización.');
      this.notificationService.error('Error', 'Datos inválidos detectados. Por favor verifique los campos e intente nuevamente.');
      this.isSaving = false;
      return;
    }
    
    this.isSaving = true;
    console.log('[UpdateScheduleModal] Llamando a la API con datos:', scheduleRequest);
    console.log('[UpdateScheduleModal] Schedule ID:', this.schedule?.id);
    
    if (!this.schedule?.id) {
      this.notificationService.error('Error', 'ID de horario no disponible. Puede que el horario ya haya sido eliminado.');
      this.isSaving = false;
      return;
    }

    this.distributionApi.updateSchedule(this.schedule.id, scheduleRequest).subscribe({
      next: (response: any) => {
        console.log('[UpdateScheduleModal] Respuesta de la API:', response);
        
        // Verificar si la respuesta tiene el formato esperado de ApiResponse
        const isApiResponseFormat = response && (typeof response === 'object') && 
          ('success' in response || 'status' in response || 'data' in response);
        
        console.log('[UpdateScheduleModal] ¿Formato ApiResponse?', isApiResponseFormat);
        
        if (isApiResponseFormat) {
          // Es una respuesta en formato ApiResponse
          const isSuccess = response.success === true || response.status === true;
          console.log('[UpdateScheduleModal] ¿Respuesta exitosa?', isSuccess);
          
          if (isSuccess) {
            console.log('[UpdateScheduleModal] Horario actualizado exitosamente');
            this.notificationService.success('Éxito', 'Horario actualizado correctamente');
            this.scheduleUpdated.emit();
            this.onClose();
          } else {
            const errorMessage = response.message || (response.error && response.error.message) || 'No se pudo actualizar el horario';
            console.error('[UpdateScheduleModal] Error de la API:', errorMessage);
            console.log('[UpdateScheduleModal] Respuesta completa de error:', response);
            
            // Manejar específicamente el caso de horario no encontrado
            if (errorMessage.includes('not found') || errorMessage.includes('no encontrado') || errorMessage.includes('not found')) {
              this.notificationService.error('Error', 'No se encontró el horario especificado. Puede que ya haya sido eliminado.');
              this.onClose(); // Cerrar el modal
            } else {
              this.notificationService.error('Error', errorMessage);
            }
          }
        } else {
          // No es una respuesta en formato ApiResponse, asumir éxito si hay datos
          console.log('[UpdateScheduleModal] Respuesta no estándar, verificando contenido...');
          
          // Si la respuesta contiene datos de horario, asumir éxito
          if (response && (response.id || response.scheduleCode || response.scheduleName)) {
            console.log('[UpdateScheduleModal] Horario actualizado exitosamente (respuesta no estándar)');
            this.notificationService.success('Éxito', 'Horario actualizado correctamente');
            this.scheduleUpdated.emit();
            this.onClose();
          } else {
            // Si no hay datos de horario, asumir error
            const errorMessage = response && typeof response === 'string' ? response : 'No se pudo actualizar el horario';
            console.error('[UpdateScheduleModal] Error de la API (respuesta no estándar):', errorMessage);
            console.log('[UpdateScheduleModal] Respuesta completa:', response);
            
            // Manejar específicamente el caso de horario no encontrado
            if (errorMessage.includes('not found') || errorMessage.includes('no encontrado')) {
              this.notificationService.error('Error', 'No se encontró el horario especificado. Puede que ya haya sido eliminado.');
              this.onClose(); // Cerrar el modal
            } else {
              this.notificationService.error('Error', errorMessage);
            }
          }
        }
        
        this.isSaving = false;
      },
      error: (error) => {
        console.error('[UpdateScheduleModal] Error HTTP al actualizar horario:', error);
        // Mostrar más detalles del error
        let errorMsg = 'Error al actualizar el horario';
        
        // Registrar todos los detalles del error para debugging
        console.log('[UpdateScheduleModal] Detalles completos del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error,
          headers: error.headers
        });
        
        // Manejo específico para diferentes códigos de error
        if (error.status === 500) {
          errorMsg = 'Error interno del servidor al actualizar el horario. Por favor, intente nuevamente o contacte al administrador del sistema.';
          // Registrar detalles adicionales del error 500
          if (error.error) {
            console.error('[UpdateScheduleModal] Detalles del error 500:', error.error);
            // Si el error tiene un mensaje específico, incluirlo
            if (error.error.message) {
              errorMsg += ' Detalles: ' + error.error.message;
            }
          }
          // Sugerir acciones específicas para el usuario
          errorMsg += ' Si el problema persiste, intente con diferentes valores o contacte al administrador.';
        } else if (error.status === 400) {
          errorMsg = 'Datos inválidos para actualizar el horario. Verifique que todos los campos estén correctamente completados.';
          // Registrar detalles del error 400
          if (error.error) {
            console.error('[UpdateScheduleModal] Detalles del error 400:', error.error);
            if (error.error.message) {
              errorMsg += ' Detalles: ' + error.error.message;
            }
          }
        } else if (error.status === 409) {
          errorMsg = 'Ya existe un horario con los mismos datos. Verifique los campos ingresados.';
        } else if (error.status === 403) {
          errorMsg = 'No tiene permisos para actualizar este horario.';
        } else if (error.status === 401) {
          errorMsg = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (error.status === 404) {
          errorMsg = 'No se encontró el horario especificado. Puede que ya haya sido eliminado.';
          this.onClose(); // Cerrar el modal cuando el horario no se encuentra
        } else if (error.error && error.error.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        } else if (error.status) {
          errorMsg += ' (Código de error: ' + error.status + ')';
        }
        
        console.log('[UpdateScheduleModal] Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        // Registrar error adicional para debugging
        if (error.error && typeof error.error === 'object') {
          console.log('[UpdateScheduleModal] Detalles del error del servidor:', JSON.stringify(error.error, null, 2));
        }
        
        // Mostrar notificación al usuario
        this.notificationService.error('Error', errorMsg);
        this.isSaving = false;
      }
    });
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
   * Diagnóstico de datos antes de enviar al backend
   */
  private diagnoseScheduleData(schedule: any): boolean {
    console.log('[UpdateScheduleModal] === DIAGNÓSTICO DE DATOS ===');
    let isValid = true;
    
    // Verificar organizationId
    if (!schedule.organizationId || typeof schedule.organizationId !== 'string') {
      console.error('[UpdateScheduleModal] ERROR: organizationId inválido', schedule.organizationId);
      isValid = false;
    }
    
    // Verificar zoneId
    if (!schedule.zoneId || typeof schedule.zoneId !== 'string') {
      console.error('[UpdateScheduleModal] ERROR: zoneId inválido', schedule.zoneId);
      isValid = false;
    }
    
    // Verificar streetId
    if (!schedule.streetId || typeof schedule.streetId !== 'string') {
      console.error('[UpdateScheduleModal] ERROR: streetId inválido', schedule.streetId);
      isValid = false;
    }
    
    // Verificar scheduleName
    if (!schedule.scheduleName || typeof schedule.scheduleName !== 'string') {
      console.error('[UpdateScheduleModal] ERROR: scheduleName inválido', schedule.scheduleName);
      isValid = false;
    }
    
    // Verificar daysOfWeek
    if (!Array.isArray(schedule.daysOfWeek)) {
      console.error('[UpdateScheduleModal] ERROR: daysOfWeek no es un array', schedule.daysOfWeek);
      isValid = false;
    } else {
      // Verificar que cada día sea un string válido
      for (let i = 0; i < schedule.daysOfWeek.length; i++) {
        if (typeof schedule.daysOfWeek[i] !== 'string') {
          console.error(`[UpdateScheduleModal] ERROR: daysOfWeek[${i}] no es un string`, schedule.daysOfWeek[i]);
          isValid = false;
        }
      }
    }
    
    // Verificar startTime
    if (!schedule.startTime || typeof schedule.startTime !== 'string' || !/^\d{2}:\d{2}$/.test(schedule.startTime)) {
      console.error('[UpdateScheduleModal] ERROR: startTime inválido', schedule.startTime);
      isValid = false;
    }
    
    // Verificar endTime
    if (!schedule.endTime || typeof schedule.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(schedule.endTime)) {
      console.error('[UpdateScheduleModal] ERROR: endTime inválido', schedule.endTime);
      isValid = false;
    }
    
    // Verificar durationHours
    if (typeof schedule.durationHours !== 'number' || isNaN(schedule.durationHours)) {
      console.error('[UpdateScheduleModal] ERROR: durationHours inválido', schedule.durationHours);
      isValid = false;
    }
    
    console.log('[UpdateScheduleModal] Resultado del diagnóstico:', isValid ? 'PASSED' : 'FAILED');
    return isValid;
  }

  /**
   * Cerrar el modal
   */
  onClose(): void {
    this.close.emit();
    // Resetear el formulario
    this.resetForm();
  }

  /**
   * Resetear el formulario a sus valores iniciales
   */
  private resetForm(): void {
    this.updatedSchedule = {
      organizationId: '',
      scheduleCode: '',
      zoneId: '',
      streetId: '',
      scheduleName: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      durationHours: 0
    };
    this.availableStreets = [];
    // Resetear también el estado de validación
    this.isSaving = false;
  }
}