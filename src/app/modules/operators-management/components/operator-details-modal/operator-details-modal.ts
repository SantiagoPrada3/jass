import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperatorsApi } from '../../services/operators-api';
import { User } from '../../models/operator.model';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
     standalone: true,
     imports: [CommonModule, ReactiveFormsModule],
     selector: 'app-operator-details-modal',
     templateUrl: './operator-details-modal.html',
     styleUrl: './operator-details-modal.css'
})
export class OperatorDetailsModal implements OnChanges {
     @Input() isOpen: boolean = false;
     @Input() operatorId: string | null = null;
     @Output() close = new EventEmitter<void>();
     @Output() editOperator = new EventEmitter<User>();

     operatorDetails: User | null = null;
     isLoading: boolean = false;
     error: string | null = null;

     // Estados para funcionalidad de edición profesional
     isEditing: boolean = false;
     isSaving: boolean = false;
     editForm: FormGroup;
     validationErrors: { [key: string]: string } = {};

     constructor(
          private readonly operatorsApi: OperatorsApi,
          private readonly formBuilder: FormBuilder,
          private readonly notificationService: NotificationService
     ) {
          // Inicializar formulario de edición con validaciones empresariales
          this.editForm = this.formBuilder.group({
               email: ['', [Validators.required, Validators.email]],
               phone: ['', [Validators.pattern(/^9\d{8}$/)]],
               address: ['', [Validators.maxLength(200)]]
          });

          // Suscribirse a cambios en el formulario para validación en tiempo real
          this.editForm.valueChanges.subscribe(() => {
               this.validateFormRealTime();
          });
     }

     ngOnChanges(changes: SimpleChanges): void {
          if (changes['isOpen'] && this.isOpen && this.operatorId) {
               this.loadOperatorDetails();
          }

          if (changes['operatorId'] && this.operatorId && this.isOpen) {
               this.loadOperatorDetails();
          }
     }

     loadOperatorDetails(): void {
          if (!this.operatorId) return;

          this.isLoading = true;
          this.error = null;

          this.operatorsApi.getOperator(this.operatorId).subscribe({
               next: (response: ApiResponse<User>) => {
                    if (response.success && response.data) {
                         this.operatorDetails = response.data;
                    } else {
                         this.error = response.message || 'Error al obtener los detalles del operador';
                    }
                    this.isLoading = false;
               },
               error: (error) => {
                    console.error('Error loading operator details:', error);
                    this.error = 'Error al cargar los detalles del operador';
                    this.isLoading = false;
               }
          });
     }

     onClose(): void {
          if (!this.isSaving) {
               this.close.emit();
               this.resetModal();
          }
     }

     /**
      * Fuerza el cierre del modal sin restricciones - Para el botón X
      */
     forceClose(): void {
          // RESETEO COMPLETO
          this.isEditing = false;
          this.isSaving = false;
          this.operatorDetails = null;
          this.error = null;
          this.isLoading = false;
          this.validationErrors = {};

          // Resetear formulario
          this.editForm.reset();

          // Emitir cierre
          this.close.emit();
          this.resetModal();
     }

     /**
      * Activa el modo de edición y prepara el formulario con los datos actuales
      */
     onEdit(): void {
          if (!this.operatorDetails) return;

          // VALIDACIÓN: No permitir editar operadores inactivos
          if (this.operatorDetails.status === 'INACTIVE') {
               this.notificationService.warning(
                    'Edición no permitida',
                    'No se pueden editar operadores con estado inactivo'
               );
               return;
          }

          this.isEditing = true;
          this.validationErrors = {};

          // Poblar formulario con datos actuales
          this.editForm.patchValue({
               email: this.operatorDetails.email || '',
               phone: this.operatorDetails.phone || '',
               address: this.operatorDetails.address || ''
          });

          // Activar validación inmediata
          setTimeout(() => {
               this.validateFormRealTime();
          });
     }

     /**
      * Cancela la edición y vuelve al modo de visualización
      */
     onCancelEdit(): void {
          this.isEditing = false;
          this.validationErrors = {};
          this.editForm.reset();
     }

     /**
      * Guarda los cambios realizados en el formulario de edición
      */
     onSaveChanges(): void {
          if (!this.operatorDetails) return;

          // Forzar validación personalizada
          this.validateFormRealTime();

          // Verificar si hay errores de validación
          if (Object.keys(this.validationErrors).length > 0) {
               console.log('Errores de validación encontrados:', this.validationErrors);
               this.notificationService.error(
                    'Errores de validación',
                    'Por favor corrija los errores antes de guardar'
               );
               return;
          }

          // Validación adicional del formulario de Angular
          if (!this.editForm.valid) {
               console.log('Formulario Angular inválido');
               this.validateForm();
               return;
          }

          this.isSaving = true;

          const updateData = {
               email: this.editForm.get('email')?.value?.trim(),
               phone: this.editForm.get('phone')?.value?.trim(),
               address: this.editForm.get('address')?.value?.trim()
          };

          this.operatorsApi.updateOperator(this.operatorDetails.id, updateData).subscribe({
               next: (response: ApiResponse<User>) => {
                    if (response.success && response.data) {
                         // Actualizar los detalles con la respuesta del servidor
                         this.operatorDetails = response.data;
                         this.isEditing = false;
                         this.isSaving = false;

                         // Notificación de éxito
                         this.notificationService.success(
                              '¡Operador actualizado!',
                              'Los datos del operador se han guardado correctamente'
                         );

                         // Emitir evento para actualizar la lista de operadores
                         this.editOperator.emit(response.data);
                    } else {
                         this.handleUpdateError(response.message || 'Error al actualizar el operador');
                    }
               },
               error: (error) => {
                    console.error('Error updating operator:', error);
                    this.handleUpdateError('Error de conexión al actualizar el operador');
               }
          });
     }

     /**
      * Valida el formulario y marca los errores
      */
     private validateForm(): void {
          this.validationErrors = {};

          if (this.editForm.get('email')?.hasError('required')) {
               this.validationErrors['email'] = 'El correo electrónico es requerido';
          } else if (this.editForm.get('email')?.hasError('email')) {
               this.validationErrors['email'] = 'Ingrese un correo electrónico válido';
          }

          if (this.editForm.get('phone')?.hasError('pattern')) {
               this.validationErrors['phone'] = 'El teléfono debe comenzar con 9 y tener 9 dígitos';
          }

          if (this.editForm.get('address')?.hasError('maxlength')) {
               this.validationErrors['address'] = 'La dirección no puede exceder 200 caracteres';
          }
     }

     /**
      * Validación en tiempo real del formulario
      */
     public validateFormRealTime(): void {
          if (!this.isEditing) return;

          this.validationErrors = {};

          // Validar email en tiempo real
          const emailControl = this.editForm.get('email');
          const emailValue = emailControl?.value || '';

          if (!emailValue) {
               this.validationErrors['email'] = 'El correo electrónico es requerido';
          } else if (!this.isValidEmail(emailValue)) {
               this.validationErrors['email'] = 'Ingrese un correo electrónico válido';
          }

          // Validar teléfono en tiempo real
          const phoneControl = this.editForm.get('phone');
          const phoneValue = phoneControl?.value || '';

          if (phoneValue && !phoneValue.match(/^9\d{8}$/)) {
               this.validationErrors['phone'] = 'El teléfono debe comenzar con 9 y tener exactamente 9 dígitos';
          }

          // Validar dirección en tiempo real
          const addressControl = this.editForm.get('address');
          const addressValue = addressControl?.value || '';

          if (addressValue && addressValue.length > 200) {
               this.validationErrors['address'] = 'La dirección no puede exceder 200 caracteres';
          }
     }

     /**
      * Validar formato de email - MÁS ESTRICTO
      */
     private isValidEmail(email: string): boolean {
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

          if (!emailRegex.test(email)) {
               return false;
          }

          const parts = email.split('@');
          if (parts.length !== 2) return false;

          const domain = parts[1];
          if (!domain.includes('.')) return false;
          if (domain.endsWith('.')) return false;

          return true;
     }

     /**
      * Maneja errores en la actualización
      */
     private handleUpdateError(message: string): void {
          this.isSaving = false;
          this.notificationService.error('Error al actualizar', message);
     }

     /**
      * Maneja la entrada de solo números en el campo teléfono
      */
     onPhoneInput(event: any): void {
          const input = event.target;
          let value = input.value;

          value = value.replace(/[^0-9]/g, '');

          if (value.length > 9) {
               value = value.substring(0, 9);
          }

          this.editForm.patchValue({ phone: value });
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
      * Verifica si el operador puede ser editado
      */
     canEdit(): boolean {
          return this.operatorDetails?.status === 'ACTIVE';
     }

     private resetModal(): void {
          this.operatorDetails = null;
          this.error = null;
          this.isLoading = false;
          this.isEditing = false;
          this.isSaving = false;
          this.validationErrors = {};
          this.editForm.reset();
     }

     formatDate(dateString: string): string {
          if (!dateString) return 'No disponible';

          const date = new Date(dateString);
          return date.toLocaleDateString('es-ES', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
          });
     }

     getStatusBadgeClass(status: string): string {
          switch (status) {
               case 'ACTIVE':
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
               case 'INACTIVE':
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
               default:
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800';
          }
     }

     getStatusLabel(status: string): string {
          switch (status) {
               case 'ACTIVE': return 'Activo';
               case 'INACTIVE': return 'Inactivo';
               default: return 'Desconocido';
          }
     }

     getRoleLabel(role: string): string {
          switch (role) {
               case 'OPERATOR': return 'Operador';
               case 'ADMIN': return 'Administrador';
               case 'SUPER_ADMIN': return 'Super Administrador';
               default: return role;
          }
     }

     getRoleBadgeClass(role: string): string {
          switch (role) {
               case 'OPERATOR':
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800';
               case 'ADMIN':
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800';
               case 'SUPER_ADMIN':
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
               default:
                    return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800';
          }
     }
}
