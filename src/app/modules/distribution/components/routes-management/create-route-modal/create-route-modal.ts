import { Component, Input, Output, EventEmitter, OnInit, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DistributionApi } from '../../../services/distribution-api';
import { AuthService } from '../../../../../core/auth/services/auth';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DistributionOrganizationApi as OrganizationApi, OrganizationData, Zone } from '../../../services/organization-api.service';
import { DistributionRouteCreateRequest, RouteZoneCreateRequest } from '../../../models/routes.model';

interface ZoneSelection {
  zone: Zone;
  order: number;
  estimatedDuration: number;
  selected: boolean;
}

interface SelectedRouteZone {
  zone: Zone;
  estimatedDuration: number;
}

@Component({
  selector: 'app-create-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-route-modal.html',
  styleUrl: './create-route-modal.css'
})
export class CreateRouteModal implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() routeCreated = new EventEmitter<void>();

  isSaving: boolean = false;
  isLoading: boolean = false;
  
  // Form data
  routeName: string = '';
  selectedZones: SelectedRouteZone[] = [];
  totalEstimatedDuration: number = 0;
  validationErrors: { [key: string]: string } = {};

  // Available data
  organizationData: OrganizationData | null = null;
  availableZones: Zone[] = [];
  
  // Nueva propiedad para la zona seleccionada en el dropdown
  selectedZoneId: string = '';

  constructor(
    private distributionApi: DistributionApi,
    private organizationApi: OrganizationApi,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Inicializar el modal cuando se inicializa el componente
  }

  ngOnChanges(): void {
    if (this.isOpen && this.organizationId) {
      this.loadOrganizationData();
    }
  }

  // Escuchar la tecla Escape para cerrar el modal
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  // Método para trackBy en el ngFor
  trackByIndex(index: number, item: any): number {
    return index;
  }

  loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    console.log('🏢 [CreateRouteModal] Cargando datos de organización:', this.organizationId);

    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = response.data.zones?.filter(zone => zone.status === 'ACTIVE') || [];

          console.log('✅ [CreateRouteModal] Organización cargada:', response.data.organizationName);
          console.log('📍 [CreateRouteModal] Zonas disponibles:', this.availableZones.length);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ [CreateRouteModal] Error cargando organización:', error);
        this.notificationService.error('Error', 'Error al cargar los datos de la organización');
        this.isLoading = false;
      }
    });
  }

  // Método para agregar una zona seleccionada
  addZone(): void {
    if (!this.selectedZoneId) {
      this.notificationService.error('Error', 'Por favor seleccione una zona');
      return;
    }

    // Verificar si la zona ya está agregada
    const isAlreadyAdded = this.selectedZones.some(item => item.zone.zoneId === this.selectedZoneId);
    if (isAlreadyAdded) {
      this.notificationService.error('Error', 'Esta zona ya ha sido agregada');
      return;
    }

    // Encontrar la zona seleccionada
    const zone = this.availableZones.find(z => z.zoneId === this.selectedZoneId);
    if (!zone) {
      this.notificationService.error('Error', 'Zona no encontrada');
      return;
    }

    // Agregar la zona a la lista de seleccionadas
    this.selectedZones.push({
      zone: zone,
      estimatedDuration: 30 // Valor por defecto de 30 minutos
    });

    // Limpiar la selección
    this.selectedZoneId = '';

    // Actualizar el orden y duración total
    this.updateZoneOrder();
    this.calculateTotalDuration();
    
    // Validar zonas en tiempo real
    this.validateZonesRealTime();
  }

  // Método para remover una zona seleccionada
  removeZone(index: number): void {
    this.selectedZones.splice(index, 1);
    this.updateZoneOrder();
    this.calculateTotalDuration();
    
    // Validar zonas en tiempo real
    this.validateZonesRealTime();
  }

  // Método para manejar el cambio de duración estimada
  onDurationChange(index: number): void {
    // Validar que la duración no sea negativa
    if (this.selectedZones[index].estimatedDuration < 0) {
      this.selectedZones[index].estimatedDuration = 0;
    }
    
    // Calcular la duración total
    this.calculateTotalDuration();
    
    // Validar zonas en tiempo real
    this.validateZonesRealTime();
  }

  updateZoneOrder(): void {
    // Asignar orden secuencial a las zonas seleccionadas
    this.selectedZones.forEach((item, index) => {
      // No necesitamos asignar el orden al objeto zone, lo manejamos en el array
    });
  }

  calculateTotalDuration(): void {
    this.totalEstimatedDuration = this.selectedZones
      .reduce((total, item) => total + item.estimatedDuration, 0);
  }

  validateForm(): void {
    this.validationErrors = {};

    // Validar nombre de ruta
    if (!this.routeName || this.routeName.trim().length === 0) {
      this.validationErrors['routeName'] = 'El nombre de la ruta es requerido';
    } else if (this.routeName.trim().length < 3) {
      this.validationErrors['routeName'] = 'El nombre debe tener al menos 3 caracteres';
    } else if (this.routeName.trim().length > 100) {
      this.validationErrors['routeName'] = 'El nombre no puede exceder 100 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(this.routeName.trim())) {
      this.validationErrors['routeName'] = 'El nombre solo puede contener letras y espacios';
    }

    // Validar que haya al menos 2 zonas seleccionadas
    if (this.selectedZones.length === 0) {
      this.validationErrors['zones'] = 'Debe agregar al menos 2 zonas para crear una ruta';
    } else if (this.selectedZones.length === 1) {
      this.validationErrors['zones'] = 'Debe agregar al menos 2 zonas para crear una ruta válida';
    }

    // Validar que todas las zonas seleccionadas tengan duración válida
    const invalidZone = this.selectedZones.find(item => item.estimatedDuration <= 0);
    if (invalidZone && this.selectedZones.length >= 2) {
      this.validationErrors['zones'] = 'Todas las zonas agregadas deben tener una duración estimada mayor a 0 minutos';
    }
  }

  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  getFieldError(fieldName: string): string | null {
    return this.validationErrors[fieldName] || null;
  }

  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  onSubmit(): void {
    // Validar formulario
    this.validateForm();

    if (this.hasValidationErrors()) {
      this.notificationService.error('Errores de validación', 'Por favor corrija los errores antes de continuar');
      return;
    }

    // Obtener el ID del usuario responsable
    const currentUser = this.authService.getCurrentUser();
    const responsibleUserId = currentUser?.userId;

    // Crear objeto de solicitud
    const request: DistributionRouteCreateRequest = {
      organizationId: this.organizationId,
      routeName: this.routeName.trim(),
      zones: this.selectedZones.map((item, index) => ({
        zoneId: item.zone.zoneId,
        order: index + 1,
        estimatedDuration: item.estimatedDuration
      } as RouteZoneCreateRequest)),
      totalEstimatedDuration: this.totalEstimatedDuration,
      responsibleUserId: responsibleUserId // Agregar el ID del usuario responsable
    };

    console.log('🚀 [CreateRouteModal] Creando ruta:', request);

    this.isSaving = true;
    this.distributionApi.createRoute(request).subscribe({
      next: (response) => {
        if (response && (response.success === true || response.status === true)) {
          console.log('✅ [CreateRouteModal] Ruta creada exitosamente');
          this.notificationService.success('Éxito', 'Ruta creada correctamente');

          // Emitir evento para actualizar la lista
          this.routeCreated.emit();

          // Cerrar el modal
          this.onClose();
        } else {
          console.error('❌ [CreateRouteModal] Error en respuesta:', response.message);
          let errorMessage = 'Error al crear la ruta';
          if (response && response.message) {
            errorMessage = response.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('❌ [CreateRouteModal] Error creando ruta:', error);
        let errorMessage = 'Error al crear la ruta. Intente nuevamente.';
        
        // Manejo específico de errores HTTP
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos para crear la ruta. Verifique que todos los campos estén correctamente completados.';
        } else if (error.status === 401) {
          errorMessage = 'No autorizado. Por favor inicie sesión nuevamente.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado. No tiene permisos para crear rutas.';
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

  onClose(): void {
    this.resetModal();
    this.close.emit();
  }

  private resetModal(): void {
    this.routeName = '';
    this.totalEstimatedDuration = 0;
    this.validationErrors = {};
    
    // Reset zone selections
    this.selectedZones = [];
    this.selectedZoneId = '';

    this.isLoading = false;
    this.isSaving = false;
  }

  getSelectedZonesCount(): number {
    return this.selectedZones.length;
  }

  /**
   * Maneja la entrada de texto en el nombre de la ruta para filtrar caracteres no válidos
   */
  onRouteNameInput(event: any): void {
    const input = event.target;
    const originalValue = input.value;
    
    // Filtrar solo letras (incluye acentos y ñ) y espacios
    const filteredValue = originalValue.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    
    // Actualizar siempre el modelo
    this.routeName = filteredValue;
    
    // Si el valor cambió, actualizar el input y mantener cursor
    if (filteredValue !== originalValue) {
      const cursorPosition = input.selectionStart;
      input.value = filteredValue;
      
      // Ajustar posición del cursor
      const newCursorPosition = Math.max(0, cursorPosition - (originalValue.length - filteredValue.length));
      setTimeout(() => {
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
    
    // Validar en tiempo real
    this.validateRouteNameRealTime();
  }

  /**
   * Previene la entrada de caracteres no válidos en el nombre de la ruta
   */
  onRouteNameKeypress(event: KeyboardEvent): void {
    const char = event.key;
    
    // Permitir teclas de control (backspace, delete, arrow keys, etc.)
    if (event.ctrlKey || event.altKey || event.metaKey || 
        char === 'Backspace' || char === 'Delete' || char === 'Tab' || 
        char === 'ArrowLeft' || char === 'ArrowRight' || char === 'ArrowUp' || char === 'ArrowDown' ||
        char === 'Home' || char === 'End') {
      return;
    }
    
    // Verificar si el carácter es válido (letras con acentos, ñ, ü y espacios)
    const isValidChar = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/.test(char);
    
    if (!isValidChar) {
      event.preventDefault();
    }
  }

  /**
   * Validación en tiempo real del nombre de la ruta
   */
  validateRouteNameRealTime(): void {
    // Limpiar errores previos del nombre
    if (this.validationErrors['routeName']) {
      delete this.validationErrors['routeName'];
    }

    if (!this.routeName || this.routeName.trim().length === 0) {
      this.validationErrors['routeName'] = 'El nombre de la ruta es requerido';
    } else if (this.routeName.trim().length < 3) {
      this.validationErrors['routeName'] = 'El nombre debe tener al menos 3 caracteres';
    } else if (this.routeName.trim().length > 100) {
      this.validationErrors['routeName'] = 'El nombre no puede exceder 100 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(this.routeName.trim())) {
      this.validationErrors['routeName'] = 'El nombre solo puede contener letras y espacios';
    }
  }

  /**
   * Validación en tiempo real de las zonas
   */
  validateZonesRealTime(): void {
    // Limpiar errores previos de zonas
    if (this.validationErrors['zones']) {
      delete this.validationErrors['zones'];
    }

    if (this.selectedZones.length === 0) {
      this.validationErrors['zones'] = 'Debe agregar al menos 2 zonas para crear una ruta';
    } else if (this.selectedZones.length === 1) {
      this.validationErrors['zones'] = 'Debe agregar al menos 2 zonas para crear una ruta válida';
    } else {
      // Validar que todas las zonas tengan duración válida
      const invalidZone = this.selectedZones.find(item => item.estimatedDuration <= 0);
      if (invalidZone) {
        this.validationErrors['zones'] = 'Todas las zonas agregadas deben tener una duración estimada mayor a 0 minutos';
      }
    }
  }
}