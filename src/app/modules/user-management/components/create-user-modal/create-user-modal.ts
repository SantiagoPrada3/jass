import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersApi } from '../../services/users-api';
import { OrganizationApi, OrganizationData, Zone, Street } from '../../services/organization-api';
import { ReniecApi } from '../../services/reniec-api';
import { ValidationApi } from '../../services/validation-api';
import { CreateUserRequest, UserCreationResponse, ReniecResponse } from '../../models/user.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UserCredentialsModal } from '../user-credentials-modal/user-credentials-modal';

@Component({
     standalone: true,
     imports: [CommonModule, ReactiveFormsModule, UserCredentialsModal],
     selector: 'app-create-user-modal',
     templateUrl: './create-user-modal.html',
     styleUrl: './create-user-modal.css'
})
export class CreateUserModal implements OnChanges {
     @Input() isOpen: boolean = false;
     @Input() organizationId: string | null = null;
     @Output() close = new EventEmitter<void>();
     @Output() userCreated = new EventEmitter<UserCreationResponse>();

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
     organizationData: OrganizationData | null = null;
     availableZones: Zone[] = [];
     availableStreets: Street[] = [];

     // Modal de credenciales
     showCredentialsModal: boolean = false;
     userCreationResult: UserCreationResponse | null = null;

     constructor(
          private readonly formBuilder: FormBuilder,
          private readonly usersApi: UsersApi,
          private readonly organizationApi: OrganizationApi,
          private readonly reniecApi: ReniecApi,
          private readonly validationApi: ValidationApi,
          private readonly notificationService: NotificationService
     ) {
          this.createForm = this.initializeForm();
          this.setupFormValidation();
     }

     ngOnChanges(changes: SimpleChanges): void {
          if (changes['isOpen'] && this.isOpen && this.organizationId) {
               this.loadOrganizationData();
          }

          if (changes['organizationId'] && this.organizationId && this.isOpen) {
               this.loadOrganizationData();
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

               // Campos de ubicación
               zoneId: ['', Validators.required],
               streetId: ['', Validators.required],

               // Tipo de documento fijo
               documentType: [{ value: 'DNI', disabled: true }],

               // Rol fijo para clientes
               roles: [{ value: ['CLIENT'], disabled: true }]
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
          console.log('🏢 [CreateUserModal] Cargando datos de organización:', this.organizationId);

          this.organizationApi.getOrganizationById(this.organizationId).subscribe({
               next: (response) => {
                    if (response.status) {
                         this.organizationData = response.data;
                         this.availableZones = response.data.zones?.filter(zone => zone.status === 'ACTIVE') || [];

                         console.log('✅ [CreateUserModal] Organización cargada:', response.data.organizationName);
                         console.log('📍 [CreateUserModal] Zonas disponibles:', this.availableZones.length);
                    } else {
                         this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
                    }
                    this.isLoading = false;
               },
               error: (error) => {
                    console.error('❌ [CreateUserModal] Error cargando organización:', error);
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
          console.log('🛣️ [CreateUserModal] Cargando calles para zona:', zoneId);

          this.organizationApi.getActiveStreetsByZone(this.organizationId, zoneId).subscribe({
               next: (streets) => {
                    this.availableStreets = streets;
                    console.log('✅ [CreateUserModal] Calles cargadas:', streets.length);

                    // Limpiar selección de calle anterior
                    this.createForm.patchValue({ streetId: '' });
                    this.isLoadingStreets = false;
               },
               error: (error) => {
                    console.error('❌ [CreateUserModal] Error cargando calles:', error);
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
          console.log('🆔 [CreateUserModal] Validando DNI y cargando datos RENIEC:', dni);

          this.reniecApi.getPersonDataByDni(dni).subscribe({
               next: (data) => {
                    this.reniecData = data;
                    this.suggestedEmail = this.reniecApi.generateSuggestedEmail(data);

                    // Llenar automáticamente los campos (solo nombres, NO email)
                    this.createForm.patchValue({
                         firstName: data.first_name,
                         lastName: `${data.first_last_name}${data.second_last_name ? ' ' + data.second_last_name : ''}`
                         // email: NO se auto-completa, el usuario debe ingresarlo manualmente
                    });

                    console.log('✅ [CreateUserModal] Datos RENIEC cargados:', data.full_name);
                    console.log('📧 [CreateUserModal] Email sugerido:', this.suggestedEmail);

                    this.isValidatingDni = false;
               },
               error: (error) => {
                    console.error('❌ [CreateUserModal] Error consultando RENIEC:', error);
                    this.notificationService.warning('DNI no encontrado', 'No se encontraron datos para este DNI en RENIEC');
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
      * Crear nuevo usuario
      */
     onCreateUser(): void {
          // Validar formulario
          this.validateFormRealTime();

          if (Object.keys(this.validationErrors).length > 0) {
               this.notificationService.error('Errores de validación', 'Por favor corrija los errores antes de continuar');
               return;
          }

          // Verificar si hay datos duplicados
          if (this.duplicateCheckStatus.dni.exists) {
               this.notificationService.error('DNI duplicado', 'El DNI ingresado ya está registrado en el sistema');
               return;
          }

          if (this.duplicateCheckStatus.email.exists) {
               this.notificationService.error('Email duplicado', 'El email ingresado ya está registrado en el sistema');
               return;
          }

          if (this.duplicateCheckStatus.phone.exists) {
               this.notificationService.error('Teléfono duplicado', 'El teléfono ingresado ya está registrado en el sistema');
               return;
          }

          // Verificar si aún está validando
          if (this.duplicateCheckStatus.dni.checking ||
               this.duplicateCheckStatus.email.checking ||
               this.duplicateCheckStatus.phone.checking) {
               this.notificationService.warning('Validación en proceso', 'Por favor espere a que termine la validación de datos');
               return;
          }

          if (!this.reniecData) {
               this.notificationService.error('Datos incompletos', 'Debe ingresar un DNI válido para obtener los nombres');
               return;
          }

          if (!this.organizationId) {
               this.notificationService.error('Error', 'No se ha especificado la organización');
               return;
          }

          this.isSaving = true;

          const formValues = this.createForm.getRawValue();

          const createRequest: CreateUserRequest = {
               firstName: this.reniecData.first_name,
               lastName: `${this.reniecData.first_last_name}${this.reniecData.second_last_name ? ' ' + this.reniecData.second_last_name : ''}`,
               documentType: 'DNI',
               documentNumber: formValues.documentNumber,
               email: formValues.email,
               phone: formValues.phone || '',
               address: formValues.address || '',
               organizationId: this.organizationId!,
               zoneId: formValues.zoneId,
               streetId: formValues.streetId,
               roles: ['CLIENT']
          };

          console.log('🚀 [CreateUserModal] Creando usuario:', createRequest);

          this.usersApi.createClient(createRequest).subscribe({
               next: (response) => {
                    if (response.success && response.data) {
                         console.log('✅ [CreateUserModal] Usuario creado exitosamente:', response.data);

                         // Guardar los datos de creación para mostrar en el modal de credenciales
                         this.userCreationResult = response.data;

                         // Mostrar modal de credenciales EN LUGAR de cerrar directamente
                         this.showCredentialsModal = true;

                         // Emitir evento para actualizar la lista
                         this.userCreated.emit(response.data);
                    } else {
                         console.error('❌ [CreateUserModal] Error en respuesta:', response.message);
                         this.notificationService.error('Error', response.message || 'Error al crear el usuario');
                    }
                    this.isSaving = false;
               },
               error: (error) => {
                    console.error('❌ [CreateUserModal] Error creando usuario:', error);
                    this.notificationService.error('Error', 'Error al crear el usuario. Intente nuevamente.');
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
               roles: ['CLIENT']
          });

          this.validationErrors = {};
          this.reniecData = null;
          this.suggestedEmail = '';
          this.organizationData = null;
          this.availableZones = [];
          this.availableStreets = [];

          this.isLoading = false;
          this.isSaving = false;
          this.isValidatingDni = false;
          this.isLoadingZones = false;
          this.isLoadingStreets = false;

          // Resetear modal de credenciales
          this.showCredentialsModal = false;
          this.userCreationResult = null;

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
          this.userCreationResult = null;

          // Cerrar el modal de crear usuario también
          this.onClose();
     }
}
