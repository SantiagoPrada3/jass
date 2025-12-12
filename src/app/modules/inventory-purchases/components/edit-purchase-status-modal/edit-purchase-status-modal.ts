import { Component, Output, EventEmitter, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { PurchasesApiService } from '../../services/purchases-api.service';
import { Purchase, PurchaseStatus, PurchaseStatusUpdateRequest, PurchaseStatusConfig } from '../../models/purchase.model';

@Component({
     selector: 'app-edit-purchase-status-modal',
     standalone: true,
     imports: [CommonModule, FormsModule, ReactiveFormsModule],
     templateUrl: './edit-purchase-status-modal.html',
     styleUrls: ['./edit-purchase-status-modal.css']
})
export class EditPurchaseStatusModal implements OnInit, OnDestroy {
     @Input() purchase!: Purchase;
     @Output() closeModal = new EventEmitter<void>();
     @Output() statusUpdated = new EventEmitter<void>();

     private readonly destroy$ = new Subject<void>();
     private readonly fb = inject(FormBuilder);
     private readonly purchasesApi = inject(PurchasesApiService);
     private readonly notificationService = inject(NotificationService);
     private readonly authService = inject(AuthService);

     statusForm!: FormGroup;
     loading = false;

     // Referencias para el template
     readonly PurchaseStatus = PurchaseStatus;
     readonly PurchaseStatusConfig = PurchaseStatusConfig;

     // Usuario actual
     currentUser = this.authService.getCurrentUser();

     // Estados disponibles según el estado actual
     availableStatuses: { value: PurchaseStatus; label: string; description: string }[] = [];

     ngOnInit(): void {
          this.initializeForm();
          this.setAvailableStatuses();
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
     }

     private initializeForm(): void {
          this.statusForm = this.fb.group({
               status: [this.purchase.status, Validators.required],
               observations: ['', [Validators.maxLength(500)]]
          });
     }

     private setAvailableStatuses(): void {
          const currentStatus = this.purchase.status;

          // Definir transiciones de estado permitidas
          switch (currentStatus) {
               case PurchaseStatus.PENDIENTE:
                    this.availableStatuses = [
                         {
                              value: PurchaseStatus.PENDIENTE,
                              label: 'Pendiente',
                              description: 'La compra está pendiente de autorización'
                         },
                         {
                              value: PurchaseStatus.AUTORIZADO,
                              label: 'Autorizado',
                              description: 'Autorizar la compra para procesamiento'
                         },
                         {
                              value: PurchaseStatus.COMPLETADO,
                              label: 'Completado',
                              description: 'Completar la compra directamente'
                         },
                         {
                              value: PurchaseStatus.CANCELADO,
                              label: 'Cancelado',
                              description: 'Cancelar la compra'
                         }
                    ];
                    break;

               case PurchaseStatus.AUTORIZADO:
                    this.availableStatuses = [
                         {
                              value: PurchaseStatus.AUTORIZADO,
                              label: 'Autorizado',
                              description: 'La compra está autorizada'
                         },
                         {
                              value: PurchaseStatus.COMPLETADO,
                              label: 'Completado',
                              description: 'Completar la compra'
                         },
                         {
                              value: PurchaseStatus.CANCELADO,
                              label: 'Cancelado',
                              description: 'Cancelar la compra'
                         }
                    ];
                    break;

               default:
                    // Para estados finales (COMPLETADO, CANCELADO) solo mostrar el actual
                    this.availableStatuses = [
                         {
                              value: currentStatus,
                              label: PurchaseStatusConfig[currentStatus]?.label || currentStatus,
                              description: `La compra está en estado ${currentStatus.toLowerCase()}`
                         }
                    ];
          }
     }

     onSubmit(): void {
          if (this.statusForm.valid) {
               this.updatePurchaseStatus();
          } else {
               this.notificationService.error('Validación', 'Por favor, complete todos los campos requeridos');
          }
     }

     private updatePurchaseStatus(): void {
          this.loading = true;

          const formValue = this.statusForm.value;
          const updateRequest: PurchaseStatusUpdateRequest = {
               status: formValue.status,
               observations: formValue.observations || undefined
          };

          // Agregar approvedByUserId si el estado es AUTORIZADO o COMPLETADO
          if (formValue.status === PurchaseStatus.AUTORIZADO || formValue.status === PurchaseStatus.COMPLETADO) {
               updateRequest.approvedByUserId = this.currentUser?.userId || '';
          }

          console.log('=== UPDATING PURCHASE STATUS ===');
          console.log('Purchase ID:', this.purchase.purchaseId);
          console.log('Update request:', updateRequest);

          this.purchasesApi.updatePurchaseStatus(this.purchase.purchaseId, updateRequest)
               .pipe(takeUntil(this.destroy$))
               .subscribe({
                    next: (updatedPurchase) => {
                         this.loading = false;
                         this.notificationService.success('Éxito', `Estado actualizado a ${formValue.status}`);
                         this.statusUpdated.emit();
                         this.onClose();
                    },
                    error: (error) => {
                         this.loading = false;
                         console.error('Error updating purchase status:', error);
                         this.notificationService.error('Error', 'Error al actualizar el estado de la compra');
                    }
               });
     }

     onClose(): void {
          this.closeModal.emit();
     }

     // Validación de campos
     isFieldInvalid(fieldName: string): boolean {
          const field = this.statusForm.get(fieldName);
          return !!(field && field.invalid && (field.dirty || field.touched));
     }

     getFieldError(fieldName: string): string {
          const field = this.statusForm.get(fieldName);
          if (field?.errors) {
               if (field.errors['required']) return `${fieldName} es requerido`;
               if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
          }
          return '';
     }

     getStatusColor(status: PurchaseStatus): string {
          return PurchaseStatusConfig[status]?.color || 'bg-gray-100 text-gray-800';
     }

     getStatusIcon(status: PurchaseStatus): string {
          return PurchaseStatusConfig[status]?.icon || 'question-mark-circle';
     }

     canChangeStatus(): boolean {
          const currentStatus = this.purchase.status;
          return ![PurchaseStatus.COMPLETADO, PurchaseStatus.CANCELADO].includes(currentStatus);
     }
}
