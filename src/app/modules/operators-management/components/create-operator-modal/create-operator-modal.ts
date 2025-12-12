import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperatorsApi } from '../../services/operators-api';
import { ReniecApi } from '../../../user-management/services/reniec-api';
import { ValidationApi } from '../../../user-management/services/validation-api';
import { CreateOperatorRequest, OperatorCreationResponse, ReniecResponse } from '../../models/operator.model';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
     standalone: true,
     imports: [CommonModule, ReactiveFormsModule],
     selector: 'app-create-operator-modal',
     templateUrl: './create-operator-modal.html',
     styleUrl: './create-operator-modal.css'
})
export class CreateOperatorModal implements OnChanges {
     @Input() isOpen: boolean = false;
     @Input() organizationId: string | null = null;
     @Output() close = new EventEmitter<void>();
     @Output() operatorCreated = new EventEmitter<OperatorCreationResponse>();

     // Estados del modal
     isLoading: boolean = false;
     isSaving: boolean = false;
     isValidatingDni: boolean = false;

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

     // Modal de credenciales
     showCredentialsModal: boolean = false;
     operatorCreationResult: OperatorCreationResponse | null = null;

     constructor(
          private readonly formBuilder: FormBuilder,
          private readonly operatorsApi: OperatorsApi,
          private readonly reniecApi: ReniecApi,
          private readonly validationApi: ValidationApi,
          private readonly notificationService: NotificationService
     ) {
          this.createForm = this.initializeForm();
          this.setupFormValidation();
     }

     ngOnChanges(changes: SimpleChanges): void {
          if (changes['isOpen'] && !this.isOpen) {
               this.resetModal();
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

               // Tipo de documento fijo
               documentType: [{ value: 'DNI', disabled: true }],

               // Rol fijo para operadores
               roles: [{ value: ['OPERATOR'], disabled: true }]
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

          // Validación de email con debounce
          this.createForm.get('email')?.valueChanges.subscribe((email) => {
               if (this.emailValidationTimeout) {
                    clearTimeout(this.emailValidationTimeout);
               }
               if (email && this.createForm.get('email')?.valid) {
                    this.emailValidationTimeout = setTimeout(() => {
                         this.checkEmailAvailability(email);
                    }, 500);
               }
          });

          // Validación de teléfono con debounce
          this.createForm.get('phone')?.valueChanges.subscribe((phone) => {
               if (this.phoneValidationTimeout) {
                    clearTimeout(this.phoneValidationTimeout);
               }
               if (phone && this.createForm.get('phone')?.valid) {
                    this.phoneValidationTimeout = setTimeout(() => {
                         this.checkPhoneAvailability(phone);
                    }, 500);
               }
          });
     }

     /**
      * Validar DNI y cargar datos de RENIEC
      */
     private validateAndLoadReniecData(dni: string): void {
          this.isValidatingDni = true;
          this.duplicateCheckStatus.dni.checking = true;
          console.log('� [CreateOperatorModal] Validando DNI y consultando RENIEC:', dni);

          // Primero verificar si el DNI ya está registrado
          this.validationApi.checkDniExists(dni).subscribe({
               next: (response) => {
                    if (response.success && response.data === true) {
                         this.duplicateCheckStatus.dni.exists = true;
                         this.validationErrors['documentNumber'] = 'Este DNI ya está registrado';
                         this.isValidatingDni = false;
                         this.duplicateCheckStatus.dni.checking = false;
                         this.notificationService.warning('DNI duplicado', 'Este DNI ya está registrado en el sistema');
                         return;
                    }

                    this.duplicateCheckStatus.dni.exists = false;
                    delete this.validationErrors['documentNumber'];

                    // Si no está duplicado, consultar RENIEC
                    this.loadReniecData(dni);
               },
               error: (error) => {
                    console.error('❌ [CreateOperatorModal] Error validando DNI:', error);
                    this.isValidatingDni = false;
                    this.duplicateCheckStatus.dni.checking = false;
               }
          });
     }

     /**
      * Cargar datos de RENIEC
      */
     private loadReniecData(dni: string): void {
          this.reniecApi.getPersonDataByDni(dni).subscribe({
               next: (data: ReniecResponse) => {
                    console.log('✅ [CreateOperatorModal] Datos RENIEC obtenidos:', data);
                    this.reniecData = data;

                    // Llenar automáticamente los campos
                    const firstName = data.first_name || '';
                    const lastName = `${data.first_last_name || ''} ${data.second_last_name || ''}`.trim();

                    this.createForm.patchValue({
                         firstName: firstName,
                         lastName: lastName
                    });

                    // Sugerir email basado en el DNI
                    this.suggestedEmail = `${dni}@ejemplo.com`;

                    this.notificationService.success('Datos obtenidos', 'Información del DNI cargada correctamente');
                    this.isValidatingDni = false;
                    this.duplicateCheckStatus.dni.checking = false;
               },
               error: (error: any) => {
                    console.error('❌ [CreateOperatorModal] Error consultando RENIEC:', error);
                    this.notificationService.error('Error RENIEC', 'No se pudo consultar los datos del DNI');
                    this.isValidatingDni = false;
                    this.duplicateCheckStatus.dni.checking = false;
               }
          });
     }

     /**
      * Limpiar datos de RENIEC
      */
     private clearReniecData(): void {
          this.reniecData = null;
          this.suggestedEmail = '';
          this.createForm.patchValue({
               firstName: '',
               lastName: ''
          });
     }

     /**
      * Verificar disponibilidad de email
      */
     private checkEmailAvailability(email: string): void {
          this.duplicateCheckStatus.email.checking = true;

          this.validationApi.checkEmailExists(email).subscribe({
               next: (response) => {
                    if (response.success && response.data === true) {
                         this.duplicateCheckStatus.email.exists = true;
                         this.validationErrors['email'] = 'Este email ya está registrado';
                    } else {
                         this.duplicateCheckStatus.email.exists = false;
                         delete this.validationErrors['email'];
                    }
                    this.duplicateCheckStatus.email.checking = false;
               },
               error: (error) => {
                    console.error('Error checking email:', error);
                    this.duplicateCheckStatus.email.checking = false;
               }
          });
     }

     /**
      * Verificar disponibilidad de teléfono
      */
     private checkPhoneAvailability(phone: string): void {
          this.duplicateCheckStatus.phone.checking = true;

          this.validationApi.checkPhoneExists(phone).subscribe({
               next: (response) => {
                    if (response.success && response.data === true) {
                         this.duplicateCheckStatus.phone.exists = true;
                         this.validationErrors['phone'] = 'Este teléfono ya está registrado';
                    } else {
                         this.duplicateCheckStatus.phone.exists = false;
                         delete this.validationErrors['phone'];
                    }
                    this.duplicateCheckStatus.phone.checking = false;
               },
               error: (error) => {
                    console.error('Error checking phone:', error);
                    this.duplicateCheckStatus.phone.checking = false;
               }
          });
     }     /**
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
          } else if (this.duplicateCheckStatus.dni.exists) {
               this.validationErrors['documentNumber'] = 'Este DNI ya está registrado';
          }

          // Validar nombre (desde RENIEC, disabled)
          const nameControl = this.createForm.get('firstName');
          const nameValue = nameControl?.value || '';
          if (!nameValue) {
               this.validationErrors['firstName'] = 'El nombre es requerido (obtenido de RENIEC)';
          }

          // Validar apellido (desde RENIEC, disabled)
          const lastNameControl = this.createForm.get('lastName');
          const lastNameValue = lastNameControl?.value || '';
          if (!lastNameValue) {
               this.validationErrors['lastName'] = 'El apellido es requerido (obtenido de RENIEC)';
          }

          // Validar email
          const emailControl = this.createForm.get('email');
          const emailValue = emailControl?.value || '';
          if (!emailValue) {
               this.validationErrors['email'] = 'El email es requerido';
          } else if (emailControl?.invalid) {
               this.validationErrors['email'] = 'El formato del email no es válido';
          } else if (this.duplicateCheckStatus.email.exists) {
               this.validationErrors['email'] = 'Este email ya está registrado';
          }

          // Validar teléfono (opcional)
          const phoneControl = this.createForm.get('phone');
          const phoneValue = phoneControl?.value || '';
          if (phoneValue && phoneControl?.invalid) {
               this.validationErrors['phone'] = 'El teléfono debe tener 9 dígitos y comenzar con 9';
          } else if (phoneValue && this.duplicateCheckStatus.phone.exists) {
               this.validationErrors['phone'] = 'Este teléfono ya está registrado';
          }
     }

     /**
      * Aplicar email sugerido
      */
     applySuggestedEmail(): void {
          if (this.suggestedEmail) {
               this.createForm.patchValue({ email: this.suggestedEmail });
          }
     }

     /**
      * Permitir solo números en DNI
      */
     onDniKeyPress(event: KeyboardEvent): void {
          const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'];
          if (!allowedKeys.includes(event.key) && (event.key < '0' || event.key > '9')) {
               event.preventDefault();
          }
     }

     /**
      * Permitir solo números en teléfono
      */
     onPhoneKeyPress(event: KeyboardEvent): void {
          const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'];
          if (!allowedKeys.includes(event.key) && (event.key < '0' || event.key > '9')) {
               event.preventDefault();
          }
     }

     /**
      * Crear nuevo operador
      */
     onCreateOperator(): void {
          this.validateFormRealTime();

          // Verificar si hay errores de validación
          if (Object.keys(this.validationErrors).length > 0) {
               this.notificationService.error('Errores de validación', 'Por favor corrija los errores antes de continuar');
               return;
          }

          // Verificar si hay duplicados pendientes de verificar
          if (this.duplicateCheckStatus.dni.checking ||
               this.duplicateCheckStatus.email.checking ||
               this.duplicateCheckStatus.phone.checking) {
               this.notificationService.warning('Validación en curso', 'Por favor espere a que termine la validación de datos');
               return;
          }

          // Verificar que existe organizationId
          if (!this.organizationId) {
               this.notificationService.error('Error', 'No se ha especificado la organización');
               return;
          }

          this.isSaving = true;
          const formValues = this.createForm.getRawValue();

          const createRequest: CreateOperatorRequest = {
               firstName: formValues.firstName,
               lastName: formValues.lastName,
               documentType: formValues.documentType,
               documentNumber: formValues.documentNumber,
               email: formValues.email,
               phone: formValues.phone || undefined,
               address: formValues.address || undefined,
               organizationId: this.organizationId!,
               roles: formValues.roles
          };

          console.log('🚀 [CreateOperatorModal] Creando operador:', createRequest);

          this.operatorsApi.createOperator(createRequest).subscribe({
               next: (response) => {
                    if (response.success && response.data) {
                         console.log('✅ [CreateOperatorModal] Operador creado exitosamente:', response.data);

                         this.operatorCreationResult = response.data;
                         this.showCredentialsModal = true;

                         this.operatorCreated.emit(response.data);
                         this.notificationService.success('¡Operador creado!', 'El operador ha sido creado exitosamente');
                    } else {
                         this.notificationService.error('Error', response.message || 'Error al crear el operador');
                    }
                    this.isSaving = false;
               },
               error: (error) => {
                    console.error('❌ [CreateOperatorModal] Error creando operador:', error);

                    let errorMessage = 'Error al crear el operador. Intente nuevamente.';

                    // Manejar diferentes tipos de errores
                    if (error.status === 404) {
                         errorMessage = 'El endpoint de creación de operadores no está disponible. Contacte al administrador.';
                    } else if (error.status === 500) {
                         errorMessage = 'Error en el servidor. Verifique que el backend esté funcionando correctamente.';
                    } else if (error.error?.message) {
                         errorMessage = error.error.message;
                    }

                    this.notificationService.error('Error al crear operador', errorMessage);
                    this.isSaving = false;
               }
          });
     }

     /**
      * Cerrar modal de credenciales y el modal principal
      */
     onCloseCredentialsModal(): void {
          this.showCredentialsModal = false;
          this.operatorCreationResult = null;
          this.onClose();
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
          this.createForm.reset();
          this.createForm.patchValue({
               documentType: 'DNI',
               roles: ['OPERATOR']
          });
          this.validationErrors = {};
          this.reniecData = null;
          this.suggestedEmail = '';
          this.isLoading = false;
          this.isSaving = false;
          this.isValidatingDni = false;
          this.showCredentialsModal = false;
          this.operatorCreationResult = null;
          this.duplicateCheckStatus = {
               dni: { checking: false, exists: false },
               email: { checking: false, exists: false },
               phone: { checking: false, exists: false }
          };
     }

     /**
      * Copiar texto al portapapeles
      */
     async copyToClipboard(text: string, field: string): Promise<void> {
          try {
               await navigator.clipboard.writeText(text);
               this.notificationService.success('Copiado', `${field} copiado al portapapeles`);
          } catch (err) {
               console.error('Error al copiar:', err);
               this.notificationService.error('Error', 'No se pudo copiar al portapapeles');
          }
     }
}
