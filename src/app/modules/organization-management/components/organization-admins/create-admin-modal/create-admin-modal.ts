import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminCredentialsModal } from '../admin-credentials-modal/admin-credentials-modal';
import { AdminCreationResponse, Organization, ReniecResponse, Street, Zone, CreateAdminRequest, Admin } from '../../../models/organization.model';
import { OrganizationApi } from '../../../services/organization-api';
import { ValidationApi } from '../../../services/validation-api';
import { UsersApi } from '../../../services/user-api';

interface NotificationService {
  error(message: string): void;
  warning(message: string): void;
  success(message: string): void;
}

// Implementación simple del servicio de notificación
class SimpleNotificationService implements NotificationService {
  error(message: string): void {
    console.error('❌ Error:', message);
    alert('Error: ' + message);
  }

  warning(message: string): void {
    console.warn('⚠️ Warning:', message);
    alert('Advertencia: ' + message);
  }

  success(message: string): void {
    console.log('✅ Success:', message);
    alert('Éxito: ' + message);
  }
}

@Component({
  selector: 'app-create-admin-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminCredentialsModal],
  templateUrl: './create-admin-modal.html',
  styleUrl: './create-admin-modal.css'
})
export class CreateAdminModal implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() organizationId: string | null = null;
  @Input() isEditMode: boolean = false;
  @Input() adminToEdit: Admin | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() adminCreated = new EventEmitter<AdminCreationResponse>();
  @Output() adminUpdated = new EventEmitter<any>();

  // Estados del modal
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Estados específicos para cada paso
  isValidatingDni: boolean = false;
  isLoadingZones: boolean = false;
  isLoadingStreets: boolean = false;

  // Datos del formulario
  createForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  // Estados de validación de duplicados
  duplicateCheckStatus = {
    dni: { checking: false, exists: false },
    email: { checking: false, exists: false },
    phone: { checking: false, exists: false }
  };

  // Timeout para debounce de validaciones
  private emailValidationTimeout: any;
  private phoneValidationTimeout: any;

  // Datos de RENIEC
  reniecData: ReniecResponse | null = null;
  suggestedEmail: string = '';

  // Datos de organización
  organizationData: Organization | null = null;
  availableOrganizations: Organization[] = [];
  availableZones: Zone[] = [];
  availableStreets: Street[] = [];

  // Estado para saber si se debe mostrar el selector de organización
  showOrganizationSelector: boolean = false;

  // Modal de credenciales
  showCredentialsModal: boolean = false;
  adminCreationResult: AdminCreationResponse | null = null;

  private notificationService: NotificationService = new SimpleNotificationService();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly usersApi: UsersApi,
    private readonly organizationApi: OrganizationApi,
    private readonly validationApi: ValidationApi
  ) {
    this.createForm = this.initializeForm();
    this.setupFormValidation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      if (this.isEditMode && this.adminToEdit) {
        // Modo edición: cargar datos del administrador
        this.loadAdminDataForEdit();
      } else if (this.organizationId) {
        // Si hay organizationId, cargar datos específicos
        this.showOrganizationSelector = false;
        this.loadOrganizationData();
      } else {
        // Si no hay organizationId, mostrar selector y cargar todas las organizaciones
        this.showOrganizationSelector = true;
        this.loadAllOrganizations();
      }
    }

    if (changes['organizationId'] && this.organizationId && this.isOpen) {
      this.showOrganizationSelector = false;
      this.loadOrganizationData();
    }

    if (changes['isEditMode'] || changes['adminToEdit']) {
      if (this.isEditMode && this.adminToEdit && this.isOpen) {
        this.loadAdminDataForEdit();
      }
    }
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      // Campo DNI para obtener datos automáticamente
      documentNumber: ['', [
        Validators.required,
        Validators.pattern(/^\d{8}$/),
        Validators.minLength(8),
        Validators.maxLength(8)
      ]],

      // Campos que se llenan automáticamente desde RENIEC
      firstName: [{ value: '', disabled: true }],
      lastName: [{ value: '', disabled: true }],

      // Campos editables
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^9\d{8}$/)]],
      address: ['', [Validators.maxLength(200)]],

      // Campo de organización (solo cuando no se pasa organizationId)
      selectedOrganizationId: [''],

      // Campos de ubicación
      zoneId: ['', Validators.required],
      streetId: ['', Validators.required],

      // Tipo de documento fijo
      documentType: [{ value: 'DNI', disabled: true }],

      // Rol fijo para administradores
      roles: [{ value: ['ADMIN'], disabled: true }]
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

    // Validación específica cuando cambia el DNI
    this.createForm.get('documentNumber')?.valueChanges.subscribe((dni) => {
      if (dni && dni.length === 8 && /^\d{8}$/.test(dni)) {
        this.validateAndLoadReniecData(dni);
      } else {
        this.clearReniecData();
      }
    });

    // Cargar zonas cuando cambia la organización seleccionada
    this.createForm.get('selectedOrganizationId')?.valueChanges.subscribe((orgId) => {
      if (orgId) {
        this.loadOrganizationDataById(orgId);
      } else {
        this.availableZones = [];
        this.availableStreets = [];
        this.organizationData = null;
        this.createForm.patchValue({ zoneId: '', streetId: '' });
      }
    });

    // Cargar calles cuando cambia la zona
    this.createForm.get('zoneId')?.valueChanges.subscribe((zoneId) => {
      const currentOrgId = this.organizationId || this.createForm.get('selectedOrganizationId')?.value;
      console.log('🔄 [CreateAdminModal] Zona cambiada:', zoneId, 'Organización actual:', currentOrgId);

      if (zoneId && currentOrgId) {
        console.log('✅ [CreateAdminModal] Cargando calles para zona:', zoneId);
        this.loadStreetsByZone(zoneId);
      } else {
        console.log('⚠️ [CreateAdminModal] Limpiando calles - zoneId:', zoneId, 'currentOrgId:', currentOrgId);
        this.availableStreets = [];
        this.createForm.patchValue({ streetId: '' });
      }
    });
  }




  /**
   * Carga todas las organizaciones para el selector
   */
  private loadAllOrganizations(): void {
    this.isLoading = true;
    console.log('🏢 [CreateAdminModal] Cargando todas las organizaciones');

    this.organizationApi.getOrganizations().subscribe({
      next: (organizations: Organization[]) => {
        this.availableOrganizations = organizations.filter(org => org.status === 'ACTIVE');
        console.log('✅ [CreateAdminModal] Organizaciones cargadas:', this.availableOrganizations.length);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ [CreateAdminModal] Error cargando organizaciones:', error);
        this.notificationService.error('Error al cargar las organizaciones');
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.organizationId) return;

    this.isLoading = true;
    console.log('🏢 [CreateAdminModal] Cargando datos de organización:', this.organizationId);

    this.organizationApi.getOrganizationById(this.organizationId).subscribe({
      next: (response: Organization | null) => {
        if (response) {
          this.organizationData = response;
          this.availableZones = response.zones?.filter((zone: Zone) => zone.status === 'ACTIVE') || [];
          // No cargar todas las calles aquí, solo cuando se seleccione una zona
          this.availableStreets = [];
          console.log('✅ [CreateAdminModal] Organización cargada:', response.organizationName);
          console.log('📍 [CreateAdminModal] Zonas disponibles:', this.availableZones.length);

          // Limpiar selecciones de zona y calle
          this.createForm.patchValue({ zoneId: '', streetId: '' });
        } else {
          this.notificationService.error('No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ [CreateAdminModal] Error cargando organización:', error);
        this.notificationService.error('Error al cargar los datos de la organización');
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga los datos de una organización específica por ID
   */
  private loadOrganizationDataById(organizationId: string): void {
    this.isLoading = true;
    console.log('🏢 [CreateAdminModal] Cargando datos de organización seleccionada:', organizationId);

    this.organizationApi.getOrganizationById(organizationId).subscribe({
      next: (response: Organization | null) => {
        if (response) {
          this.organizationData = response;
          this.availableZones = response.zones?.filter((zone: Zone) => zone.status === 'ACTIVE') || [];
          this.availableStreets = [];
          console.log('✅ [CreateAdminModal] Organización seleccionada cargada:', response.organizationName);
          console.log('📍 [CreateAdminModal] Zonas disponibles:', this.availableZones.length);

          // Limpiar selecciones anteriores
          this.createForm.patchValue({ zoneId: '', streetId: '' });
        } else {
          this.notificationService.error('No se pudo cargar la información de la organización seleccionada');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ [CreateAdminModal] Error cargando organización seleccionada:', error);
        this.notificationService.error('Error al cargar los datos de la organización seleccionada');
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga los datos del administrador para edición
   */
  private loadAdminDataForEdit(): void {
    if (!this.adminToEdit) {
      console.error('❌ [CreateAdminModal] No hay datos de administrador para editar');
      this.notificationService.error('Error: No se encontraron datos del administrador');
      return;
    }

    // Validar que el administrador tenga los datos mínimos necesarios
    if (!this.adminToEdit.organizationId || !this.adminToEdit.firstName || !this.adminToEdit.lastName || !this.adminToEdit.email) {
      console.error('❌ [CreateAdminModal] Datos del administrador incompletos:', this.adminToEdit);
      this.notificationService.error('Error: Los datos del administrador están incompletos');
      return;
    }

    this.isLoading = true;
    console.log('✏️ [CreateAdminModal] Cargando datos para editar administrador:', this.adminToEdit);

    // Primero llenar el formulario con los datos disponibles
    this.createForm.patchValue({
      documentNumber: this.adminToEdit.documentNumber || '',
      firstName: this.adminToEdit.firstName,
      lastName: this.adminToEdit.lastName,
      email: this.adminToEdit.email,
      phone: this.adminToEdit.phone || '',
      address: this.adminToEdit.address || '',
      zoneId: this.adminToEdit.zoneId || '',
      streetId: this.adminToEdit.streetId || '',
      documentType: 'DNI',
      roles: ['ADMIN']
    });

    // Simular datos de RENIEC para el modo edición
    this.reniecData = {
      first_name: this.adminToEdit.firstName,
      first_last_name: this.adminToEdit.lastName.split(' ')[0] || this.adminToEdit.lastName,
      second_last_name: this.adminToEdit.lastName.split(' ')[1] || '',
      full_name: `${this.adminToEdit.firstName} ${this.adminToEdit.lastName}`,
      document_number: this.adminToEdit.documentNumber || ''
    };

    // Cargar datos de la organización del administrador
    this.organizationApi.getOrganizationById(this.adminToEdit.organizationId).subscribe({
      next: (response: Organization | null) => {
        if (response) {
          this.organizationData = response;
          this.availableZones = response.zones?.filter((zone: Zone) => zone.status === 'ACTIVE') || [];

          // Cargar calles de la zona del administrador si tiene zona
          if (this.adminToEdit!.zoneId && this.availableZones.length > 0) {
            // Verificar que la zona existe en la organización
            const zoneExists = this.availableZones.some(zone => zone.zoneId === this.adminToEdit!.zoneId);
            if (zoneExists) {
              this.loadStreetsByZone(this.adminToEdit!.zoneId);
            } else {
              console.warn('⚠️ [CreateAdminModal] La zona del administrador no existe en la organización');
              this.createForm.patchValue({ zoneId: '', streetId: '' });
            }
          }

          console.log('✅ [CreateAdminModal] Datos del administrador cargados para edición');
        } else {
          console.error('❌ [CreateAdminModal] No se recibieron datos de la organización');
          this.notificationService.error('No se pudo cargar la información de la organización del administrador');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ [CreateAdminModal] Error cargando datos para edición:', error);
        this.notificationService.error('Error al cargar los datos para edición: ' + (error.message || 'Error desconocido'));
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga las calles de una zona específica
   */
  private loadStreetsByZone(zoneId: string): void {
    // Obtener la organización actual (puede ser la pasada como parámetro o la seleccionada)
    const currentOrgId = this.organizationId || this.createForm.get('selectedOrganizationId')?.value;

    if (!currentOrgId) {
      console.warn('⚠️ [CreateAdminModal] No hay organización disponible para cargar calles');
      return;
    }

    this.isLoadingStreets = true;
    console.log('🛣️ [CreateAdminModal] Cargando calles para zona:', zoneId, 'en organización:', currentOrgId);

    this.organizationApi.getStreetsByZone(zoneId).subscribe({
      next: (streets: Street[]) => {
        // Filtrar calles activas
        this.availableStreets = streets.filter(street => street.status === 'ACTIVE');
        console.log('✅ [CreateAdminModal] Calles cargadas:', this.availableStreets.length, 'de', streets.length, 'totales');

        // Limpiar selección de calle anterior
        this.createForm.patchValue({ streetId: '' });
        this.isLoadingStreets = false;
      },
      error: (error: any) => {
        console.error('❌ [CreateAdminModal] Error cargando calles:', error);
        this.availableStreets = [];
        this.isLoadingStreets = false;
      }
    });
  }

  /**
   * Valida el DNI y carga automáticamente los datos de RENIEC
   */
  private validateAndLoadReniecData(dni: string): void {
    this.isValidatingDni = true;
    console.log('🆔 [CreateAdminModal] Validando DNI y cargando datos RENIEC:', dni);

    this.organizationApi.getPersonDataByDni(dni).subscribe({
      next: (data: any) => {
        this.reniecData = data;
        this.suggestedEmail = this.organizationApi.generateSuggestedEmail(data);

        // Llenar automáticamente los campos (solo nombres, NO email)
        this.createForm.patchValue({
          firstName: data.first_name,
          lastName: `${data.first_last_name}${data.second_last_name ? ' ' + data.second_last_name : ''}`
          // email: NO se auto-completa, el usuario debe ingresarlo manualmente
        });

        console.log('✅ [CreateAdminModal] Datos RENIEC cargados:', data.full_name);
        console.log('📧 [CreateAdminModal] Email sugerido:', this.suggestedEmail);

        this.isValidatingDni = false;
      },
      error: (error) => {
        console.error('❌ [CreateAdminModal] Error consultando RENIEC:', error);
        this.notificationService.warning('DNI no encontrado: No se encontraron datos para este DNI en RENIEC');
        this.clearReniecData();
        this.isValidatingDni = false;
      }
    });
  }

  /**
   * Limpia los datos de RENIEC (pero mantiene email y validaciones)
   */
  private clearReniecData(): void {
    this.reniecData = null;
    this.suggestedEmail = '';

    // Solo limpiar nombres, NO el email para mantener validaciones
    this.createForm.patchValue({
      firstName: '',
      lastName: ''
      // email: '' <-- REMOVIDO para no borrar las validaciones
    });
  }

  /**
   * Validación en tiempo real del formulario
   */
  private validateFormRealTime(): void {
    this.validationErrors = {};

    // Validar DNI
    const dniControl = this.createForm.get('documentNumber');
    const dniValue = dniControl?.value || '';
    if (!dniValue) {
      this.validationErrors['documentNumber'] = 'El DNI es requerido';
    } else if (!/^\d{8}$/.test(dniValue)) {
      this.validationErrors['documentNumber'] = 'El DNI debe tener exactamente 8 dígitos';
    }

    // Validar email
    const emailControl = this.createForm.get('email');
    const emailValue = emailControl?.value || '';
    if (!emailValue) {
      this.validationErrors['email'] = 'El correo electrónico es requerido';
    } else if (!this.isValidEmail(emailValue)) {
      this.validationErrors['email'] = 'Ingrese un correo electrónico válido';
    }

    // Validar teléfono
    const phoneControl = this.createForm.get('phone');
    const phoneValue = phoneControl?.value || '';
    if (phoneValue && !/^9\d{8}$/.test(phoneValue)) {
      this.validationErrors['phone'] = 'El teléfono debe comenzar con 9 y tener exactamente 9 dígitos';
    }

    // Validar dirección
    const addressControl = this.createForm.get('address');
    const addressValue = addressControl?.value || '';
    if (addressValue && addressValue.length > 200) {
      this.validationErrors['address'] = 'La dirección no puede exceder 200 caracteres';
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

    // Validar organización (solo cuando se muestra el selector)
    if (this.showOrganizationSelector) {
      const orgControl = this.createForm.get('selectedOrganizationId');
      if (!orgControl?.value) {
        this.validationErrors['selectedOrganizationId'] = 'Seleccione una organización';
      }
    }
  }

  /**
   * Validar DNI en tiempo real para verificar si ya existe
   */
  validateDniUnique(dni: string): void {
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      return; // Solo validar si el DNI tiene el formato correcto
    }

    this.duplicateCheckStatus.dni.checking = true;

    this.validationApi.checkDniExists(dni).subscribe({
      next: (response) => {
        this.duplicateCheckStatus.dni.checking = false;

        if (response.success && response.data) {
          // El DNI YA EXISTE
          this.duplicateCheckStatus.dni.exists = true;
          this.validationErrors['documentNumber'] = `El DNI ${dni} ya está registrado en el sistema`;
          console.log(`❌ DNI ${dni} ya existe`);
        } else {
          // El DNI está disponible
          this.duplicateCheckStatus.dni.exists = false;
          delete this.validationErrors['documentNumber'];
          console.log(`✅ DNI ${dni} disponible`);
        }
      },
      error: (error) => {
        console.error('Error validating DNI:', error);
        this.duplicateCheckStatus.dni.checking = false;
        this.duplicateCheckStatus.dni.exists = false;
      }
    });
  }

  /**
   * Validar email en tiempo real para verificar si ya existe
   */
  validateEmailUnique(email: string): void {
    if (!email || !this.isValidEmail(email)) {
      return; // Solo validar si el email tiene formato válido
    }

    this.duplicateCheckStatus.email.checking = true;

    this.validationApi.checkEmailExists(email).subscribe({
      next: (response) => {
        this.duplicateCheckStatus.email.checking = false;

        if (response.success && response.data) {
          // El EMAIL YA EXISTE
          this.duplicateCheckStatus.email.exists = true;
          this.validationErrors['email'] = `El email ${email} ya está registrado en el sistema`;
          console.log(`❌ Email ${email} ya existe`);
        } else {
          // El EMAIL está disponible
          this.duplicateCheckStatus.email.exists = false;
          // No eliminar error si hay otros errores de validación
          if (this.validationErrors['email']?.includes('ya está registrado')) {
            delete this.validationErrors['email'];
          }
          console.log(`✅ Email ${email} disponible`);
        }
      },
      error: (error) => {
        console.error('Error validating email:', error);
        this.duplicateCheckStatus.email.checking = false;
        this.duplicateCheckStatus.email.exists = false;
      }
    });
  }

  /**
   * Validar teléfono en tiempo real para verificar si ya existe
   */
  validatePhoneUnique(phone: string): void {
    if (!phone || !/^9\d{8}$/.test(phone)) {
      return; // Solo validar si el teléfono tiene formato correcto
    }

    this.duplicateCheckStatus.phone.checking = true;

    this.validationApi.checkPhoneExists(phone).subscribe({
      next: (response) => {
        this.duplicateCheckStatus.phone.checking = false;

        if (response.success && response.data) {
          // El TELÉFONO YA EXISTE
          this.duplicateCheckStatus.phone.exists = true;
          this.validationErrors['phone'] = `El teléfono ${phone} ya está registrado en el sistema`;
          console.log(`❌ Teléfono ${phone} ya existe`);
        } else {
          // El TELÉFONO está disponible
          this.duplicateCheckStatus.phone.exists = false;
          // No eliminar error si hay otros errores de validación
          if (this.validationErrors['phone']?.includes('ya está registrado')) {
            delete this.validationErrors['phone'];
          }
          console.log(`✅ Teléfono ${phone} disponible`);
        }
      },
      error: (error) => {
        console.error('Error validating phone:', error);
        this.duplicateCheckStatus.phone.checking = false;
        this.duplicateCheckStatus.phone.exists = false;
      }
    });
  }

  /**
   * Validación de email simple y efectiva
   */
  private isValidEmail(email: string): boolean {
    // Regex más simple y confiable
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Maneja la entrada de solo números en el campo teléfono
   */
  onPhoneInput(event: any): void {
    const input = event.target;
    let value = input.value;

    // Remover cualquier carácter que no sea número
    value = value.replace(/[^0-9]/g, '');

    // Limitar a 9 dígitos
    if (value.length > 9) {
      value = value.substring(0, 9);
    }

    // Actualizar el control del formulario
    this.createForm.patchValue({ phone: value });

    // Validar si el teléfono ya existe (cuando tiene 9 dígitos y empieza con 9)
    if (value.length === 9 && value.startsWith('9')) {
      // Usar debounce para evitar muchas consultas
      clearTimeout(this.phoneValidationTimeout);
      this.phoneValidationTimeout = setTimeout(() => {
        this.validatePhoneUnique(value);
      }, 500); // Esperar 500ms después de que el usuario deje de escribir
    } else {
      // Limpiar estado de validación si el teléfono no es válido
      this.duplicateCheckStatus.phone.exists = false;
      this.duplicateCheckStatus.phone.checking = false;
      if (this.validationErrors['phone']?.includes('ya está registrado')) {
        delete this.validationErrors['phone'];
      }
    }
  }

  /**
   * Maneja el evento keydown para prevenir letras en teléfono
   */
  onPhoneKeyDown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];

    if (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) {
      return;
    }

    if (!allowedKeys.includes(event.key) && (event.key < '0' || event.key > '9')) {
      event.preventDefault();
    }
  }

  /**
   * Maneja la entrada solo de números en el DNI
   */
  onDniInput(event: any): void {
    const input = event.target;
    let value = input.value;

    // Remover cualquier carácter que no sea número
    value = value.replace(/[^0-9]/g, '');

    // Limitar a 8 dígitos
    if (value.length > 8) {
      value = value.substring(0, 8);
    }

    // Actualizar el control del formulario
    this.createForm.patchValue({ documentNumber: value });

    // Validar si el DNI ya existe (cuando tiene 8 dígitos)
    if (value.length === 8) {
      this.validateDniUnique(value);
    } else {
      // Limpiar estado de validación si no tiene 8 dígitos
      this.duplicateCheckStatus.dni.exists = false;
      this.duplicateCheckStatus.dni.checking = false;
      if (this.validationErrors['documentNumber']?.includes('ya está registrado')) {
        delete this.validationErrors['documentNumber'];
      }
    }
  }

  /**
   * Maneja la entrada de email y valida si ya existe
   */
  onEmailInput(event: any): void {
    const email = event.target.value.trim();

    // Actualizar el control del formulario
    this.createForm.patchValue({ email });

    // Validar si el email ya existe (cuando tiene formato válido)
    if (email && this.isValidEmail(email)) {
      // Usar debounce para evitar muchas consultas
      clearTimeout(this.emailValidationTimeout);
      this.emailValidationTimeout = setTimeout(() => {
        this.validateEmailUnique(email);
      }, 500); // Esperar 500ms después de que el usuario deje de escribir
    } else {
      // Limpiar estado de validación si el email no es válido
      this.duplicateCheckStatus.email.exists = false;
      this.duplicateCheckStatus.email.checking = false;
      if (this.validationErrors['email']?.includes('ya está registrado')) {
        delete this.validationErrors['email'];
      }
    }
  }

  /**
   * Crear nuevo administrador o actualizar existente
   */
  onCreateAdmin(): void {
    if (this.isEditMode) {
      this.onUpdateAdmin();
      return;
    }
    // Validar formulario
    this.validateFormRealTime();

    if (Object.keys(this.validationErrors).length > 0) {
      this.notificationService.error('Errores de validación: Por favor corrija los errores antes de continuar');
      return;
    }

    // Verificar si hay datos duplicados
    if (this.duplicateCheckStatus.dni.exists) {
      this.notificationService.error('DNI duplicado: El DNI ingresado ya está registrado en el sistema');
      return;
    }

    if (this.duplicateCheckStatus.email.exists) {
      this.notificationService.error('Email duplicado: El email ingresado ya está registrado en el sistema');
      return;
    }

    if (this.duplicateCheckStatus.phone.exists) {
      this.notificationService.error('Teléfono duplicado: El teléfono ingresado ya está registrado en el sistema');
      return;
    }

    // Verificar si aún está validando
    if (this.duplicateCheckStatus.dni.checking ||
      this.duplicateCheckStatus.email.checking ||
      this.duplicateCheckStatus.phone.checking) {
      this.notificationService.warning('Validación en proceso: Por favor espere a que termine la validación de datos');
      return;
    }

    if (!this.reniecData) {
      this.notificationService.error('Datos incompletos: Debe ingresar un DNI válido para obtener los nombres');
      return;
    }

    // Determinar la organización a usar
    const targetOrganizationId = this.organizationId || this.createForm.get('selectedOrganizationId')?.value;

    if (!targetOrganizationId) {
      this.notificationService.error('Error: No se ha especificado la organización');
      return;
    }

    this.isSaving = true;

    const formValues = this.createForm.getRawValue();

    const createRequest: CreateAdminRequest = {
      firstName: this.reniecData.first_name,
      lastName: `${this.reniecData.first_last_name}${this.reniecData.second_last_name ? ' ' + this.reniecData.second_last_name : ''}`,
      documentType: 'DNI',
      documentNumber: formValues.documentNumber,
      email: formValues.email,
      phone: formValues.phone || '',
      address: formValues.address || '',
      organizationId: targetOrganizationId,
      zoneId: formValues.zoneId,
      streetId: formValues.streetId,
      roles: ['ADMIN']
    };

    console.log('🚀 [CreateAdminModal] Creando administrador:', createRequest);

    this.usersApi.createAdmin(createRequest).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('✅ [CreateAdminModal] Administrador creado exitosamente:', response.data);

          // Guardar los datos de creación para mostrar en el modal de credenciales
          this.adminCreationResult = response.data;

          // Mostrar modal de credenciales EN LUGAR de cerrar directamente
          this.showCredentialsModal = true;

          // Emitir evento para actualizar la lista
          this.adminCreated.emit(response.data);
        } else {
          console.error('❌ [CreateAdminModal] Error en respuesta:', response.message);
          this.notificationService.error('Error: ' + (response.message || 'Error al crear el administrador'));
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('❌ [CreateAdminModal] Error creando administrador:', error);
        this.notificationService.error('Error: Error al crear el administrador. Intente nuevamente.');
        this.isSaving = false;
      }
    });
  }

  /**
   * Actualizar administrador existente
   */
  onUpdateAdmin(): void {
    // Validar formulario
    this.validateFormRealTime();

    if (Object.keys(this.validationErrors).length > 0) {
      this.notificationService.error('Errores de validación: Por favor corrija los errores antes de continuar');
      return;
    }

    if (!this.adminToEdit || !this.adminToEdit.adminId) {
      this.notificationService.error('Error: No se encontraron datos del administrador a editar');
      return;
    }

    // Validar que los campos requeridos estén presentes
    const formValues = this.createForm.getRawValue();
    if (!formValues.email) {
      this.notificationService.error('Error: El email es requerido');
      return;
    }

    if (!formValues.zoneId) {
      this.notificationService.error('Error: Debe seleccionar una zona');
      return;
    }

    if (!formValues.streetId) {
      this.notificationService.error('Error: Debe seleccionar una calle');
      return;
    }

    this.isSaving = true;

    // Crear objeto de actualización solo con campos editables
    const updateRequest = {
      email: formValues.email.trim(),
      phone: formValues.phone ? formValues.phone.trim() : '',
      address: formValues.address ? formValues.address.trim() : '',
      zoneId: formValues.zoneId,
      streetId: formValues.streetId
    };

    console.log('🔄 [CreateAdminModal] Actualizando administrador:', this.adminToEdit.adminId, updateRequest);

    this.usersApi.updateAdmin(this.adminToEdit.adminId, updateRequest).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('✅ [CreateAdminModal] Administrador actualizado exitosamente:', response.data);

          // Emitir evento para actualizar la lista
          this.adminUpdated.emit(response.data);
        } else {
          console.error('❌ [CreateAdminModal] Error en respuesta:', response.message);
          this.notificationService.error('Error: ' + (response.message || 'Error al actualizar el administrador'));
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('❌ [CreateAdminModal] Error actualizando administrador:', error);
        this.notificationService.error('Error: Error al actualizar el administrador. Intente nuevamente.');
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
      documentType: 'DNI',
      roles: ['ADMIN']
    });

    this.validationErrors = {};
    this.reniecData = null;
    this.suggestedEmail = '';
    this.organizationData = null;
    this.availableOrganizations = [];
    this.availableZones = [];
    this.availableStreets = [];
    this.showOrganizationSelector = false;

    this.isLoading = false;
    this.isSaving = false;
    this.isValidatingDni = false;
    this.isLoadingZones = false;
    this.isLoadingStreets = false;

    // Resetear modal de credenciales
    this.showCredentialsModal = false;
    this.adminCreationResult = null;

    // Limpiar estados de validación de duplicados
    this.duplicateCheckStatus = {
      dni: { checking: false, exists: false },
      email: { checking: false, exists: false },
      phone: { checking: false, exists: false }
    };

    // Limpiar timeouts de validación
    clearTimeout(this.emailValidationTimeout);
    clearTimeout(this.phoneValidationTimeout);
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
   * Obtiene el nombre de la zona seleccionada
   */
  getSelectedZoneName(): string {
    const zoneId = this.createForm.get('zoneId')?.value;
    if (!zoneId) return '';

    const zone = this.availableZones.find(z => z.zoneId === zoneId);
    return zone ? `${zone.zoneCode} - ${zone.zoneName}` : '';
  }

  /**
   * Obtiene el nombre de la calle seleccionada
   */
  getSelectedStreetName(): string {
    const streetId = this.createForm.get('streetId')?.value;
    if (!streetId) return '';

    const street = this.availableStreets.find(s => s.streetId === streetId);
    return street ? `${street.streetType} ${street.streetName}` : '';
  }

  /**
   * Verifica si hay errores de validación
   */
  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  /**
   * Maneja el cierre del modal de credenciales
   */
  onCredentialsModalClose(): void {
    this.showCredentialsModal = false;
    this.adminCreationResult = null;

    // Cerrar el modal de crear administrador también
    this.onClose();
  }
}
