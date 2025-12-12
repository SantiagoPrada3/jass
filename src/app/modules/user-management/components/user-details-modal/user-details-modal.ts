import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersApi } from '../../services/users-api';
import { UserWithLocationResponse } from '../../models/user.model';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
     standalone: true,
     imports: [CommonModule, ReactiveFormsModule],
     selector: 'app-user-details-modal',
     templateUrl: './user-details-modal.html',
     styleUrl: './user-details-modal.css'
})
export class UserDetailsModal implements OnChanges {
     @Input() isOpen: boolean = false;
     @Input() userId: string | null = null;
     @Output() close = new EventEmitter<void>();
     @Output() editUser = new EventEmitter<UserWithLocationResponse>();

     userDetails: UserWithLocationResponse | null = null;
     isLoading: boolean = false;
     error: string | null = null;

     // Estados para funcionalidad de edición profesional
     isEditing: boolean = false;
     isSaving: boolean = false;
     editForm: FormGroup;
     validationErrors: { [key: string]: string } = {};

     constructor(
          private readonly usersApi: UsersApi,
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
          if (changes['isOpen'] && this.isOpen && this.userId) {
               this.loadUserDetails();
          }

          if (changes['userId'] && this.userId && this.isOpen) {
               this.loadUserDetails();
          }
     }

     loadUserDetails(): void {
          if (!this.userId) return;

          this.isLoading = true;
          this.error = null;

          this.usersApi.getClient(this.userId).subscribe({
               next: (response: ApiResponse<UserWithLocationResponse>) => {
                    if (response.success && response.data) {
                         this.userDetails = response.data;
                    } else {
                         this.error = response.message || 'Error al obtener los detalles del usuario';
                    }
                    this.isLoading = false;
               },
               error: (error) => {
                    console.error('Error loading user details:', error);
                    this.error = 'Error al cargar los detalles del usuario';
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
          this.userDetails = null;
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
          if (!this.userDetails) return;

          // VALIDACIÓN: No permitir editar usuarios inactivos
          if (this.userDetails.status === 'INACTIVE') {
               this.notificationService.warning(
                    'Edición no permitida',
                    'No se pueden editar usuarios con estado inactivo'
               );
               return;
          }

          this.isEditing = true;
          this.validationErrors = {};

          // Poblar formulario con datos actuales
          this.editForm.patchValue({
               email: this.userDetails.email || '',
               phone: this.userDetails.phone || '',
               address: this.userDetails.address || ''
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
          if (!this.userDetails) return;

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

          this.usersApi.updateClient(this.userDetails.id, updateData).subscribe({
               next: (response: ApiResponse<UserWithLocationResponse>) => {
                    if (response.success && response.data) {
                         // Actualizar los detalles con la respuesta del servidor
                         this.userDetails = response.data;
                         this.isEditing = false;
                         this.isSaving = false;

                         // Notificación de éxito
                         this.notificationService.success(
                              '¡Usuario actualizado!',
                              'Los datos del usuario se han guardado correctamente'
                         );

                         // Emitir evento para actualizar la lista de usuarios
                         this.editUser.emit(response.data);
                    } else {
                         this.handleUpdateError(response.message || 'Error al actualizar el usuario');
                    }
               },
               error: (error) => {
                    console.error('Error updating user:', error);
                    this.handleUpdateError('Error de conexión al actualizar el usuario');
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
          console.log('🔍 validateFormRealTime ejecutándose, isEditing:', this.isEditing);
          if (!this.isEditing) return;

          this.validationErrors = {};

          // Validar email en tiempo real (sin esperar touched/dirty)
          const emailControl = this.editForm.get('email');
          const emailValue = emailControl?.value || '';
          console.log('📧 Email value:', emailValue);

          if (!emailValue) {
               this.validationErrors['email'] = 'El correo electrónico es requerido';
               console.log('❌ Email vacío');
          } else if (!this.isValidEmail(emailValue)) {
               this.validationErrors['email'] = 'Ingrese un correo electrónico válido';
               console.log('❌ Email inválido:', emailValue);
          }

          // Validar teléfono en tiempo real (sin esperar touched/dirty)
          const phoneControl = this.editForm.get('phone');
          const phoneValue = phoneControl?.value || '';
          console.log('📱 Phone value:', phoneValue);

          if (phoneValue && !phoneValue.match(/^9\d{8}$/)) {
               this.validationErrors['phone'] = 'El teléfono debe comenzar con 9 y tener exactamente 9 dígitos';
               console.log('❌ Teléfono inválido:', phoneValue);
          }

          // Validar dirección en tiempo real (sin esperar touched/dirty)
          const addressControl = this.editForm.get('address');
          const addressValue = addressControl?.value || '';
          console.log('🏠 Address value:', addressValue);

          if (addressValue && addressValue.length > 200) {
               this.validationErrors['address'] = 'La dirección no puede exceder 200 caracteres';
               console.log('❌ Dirección muy larga:', addressValue.length);
          }

          console.log('🔍 Errores de validación finales:', this.validationErrors);
     }

     /**
      * Validar formato de email - MÁS ESTRICTO
      */
     private isValidEmail(email: string): boolean {
          // Regex más estricto para validar emails
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

          console.log(`📧 Validando email "${email}":`, emailRegex.test(email));

          // Verificaciones adicionales
          if (!emailRegex.test(email)) {
               return false;
          }

          // Verificar que tenga al menos un punto después del @
          const parts = email.split('@');
          if (parts.length !== 2) return false;

          const domain = parts[1];
          if (!domain.includes('.')) return false;

          // Verificar que no termine en punto
          if (domain.endsWith('.')) return false;

          return true;
     }

     /**
      * Maneja errores en la actualización
      */
     private handleUpdateError(message: string): void {
          this.isSaving = false;

          // Mostrar notificación de error
          this.notificationService.error(
               'Error al actualizar',
               message
          );
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
          this.editForm.patchValue({ phone: value });
     }

     /**
      * Maneja el evento keydown para prevenir letras en teléfono
      */
     onPhoneKeyDown(event: KeyboardEvent): void {
          // Permitir teclas especiales: backspace, delete, tab, escape, enter, home, end, left, right
          const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];

          // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
          if (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) {
               return;
          }

          // Si no es una tecla permitida y no es un número, prevenir la entrada
          if (!allowedKeys.includes(event.key) && (event.key < '0' || event.key > '9')) {
               event.preventDefault();
          }
     }

     /**
      * Obtiene el mensaje de error para un campo específico
      */
     getFieldError(fieldName: string): string | null {
          const error = this.validationErrors[fieldName] || null;
          console.log(`🔍 getFieldError('${fieldName}'):`, error);
          return error;
     }

     /**
      * Verifica si un campo tiene errores
      */
     hasFieldError(fieldName: string): boolean {
          const hasError = !!this.validationErrors[fieldName];
          console.log(`🔍 hasFieldError('${fieldName}'):`, hasError, 'validationErrors:', this.validationErrors);
          return hasError;
     }

     /**
      * Verifica si el usuario puede ser editado
      * Solo usuarios activos pueden ser editados
      */
     canEdit(): boolean {
          return this.userDetails?.status === 'ACTIVE';
     }



     /**
      * Verifica si el usuario puede ser editado (debe estar activo)
      */
     canEditUser(): boolean {
          return this.userDetails?.status === 'ACTIVE';
     }

     private resetModal(): void {
          this.userDetails = null;
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

     /**
      * Traduce los roles del inglés al español para mostrar en la interfaz administrativa
      * @param role - Rol en inglés desde la API
      * @returns Rol traducido al español
      */
     getRoleLabel(role: string): string {
          switch (role) {
               case 'CLIENT': return 'Cliente';
               case 'ADMIN': return 'Administrador';
               case 'SUPER_ADMIN': return 'Super Administrador';
               default: return role; // Si no coincide, mostrar el rol original
          }
     }

     /**
      * Obtiene el estilo CSS apropiado para cada tipo de rol
      * @param role - Rol del usuario
      * @returns Clases CSS para el badge del rol
      */
     getRoleBadgeClass(role: string): string {
          switch (role) {
               case 'CLIENT':
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
