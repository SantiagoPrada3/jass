import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { ChlorineRecord, ChlorineRecordRequest } from '../../../models/chlorine-record.model';
import { WaterQualityApi } from '../../../services/water-quality-api';
import { ApiResponse } from '../../../../../shared/models/api-response.model';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-details-chlorine-modal',
  templateUrl: './details-chlorine.component.html',
  styleUrl: './details-chlorine.component.css'
})
export class DetailsChlorineComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() chlorineRecord: ChlorineRecord | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() recordUpdated = new EventEmitter<ChlorineRecord>(); // Emit the updated record

  isEditing: boolean = false;
  isSaving: boolean = false;
  editForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  constructor(
    private readonly fb: FormBuilder,
    private readonly notificationService: NotificationService,
    private readonly waterQualityApi: WaterQualityApi
  ) {
    this.editForm = this.fb.group({
      level: [null, [Validators.required, Validators.min(0)]],
      amount: [null, [Validators.required, Validators.min(0)]],
      acceptable: [false],
      actionRequired: [false],
      observations: ['', [Validators.maxLength(300)]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chlorineRecord'] && this.chlorineRecord) {
      this.loadRecordData();
    }
  }

  loadRecordData(): void {
    if (!this.chlorineRecord) return;

    this.editForm.patchValue({
      level: this.chlorineRecord.level || '',
      amount: this.chlorineRecord.amount || '',
      acceptable: this.chlorineRecord.acceptable || false,
      actionRequired: this.chlorineRecord.actionRequired || false,
      observations: this.chlorineRecord.observations || ''
    });
  }

  onEdit(): void {
    this.isEditing = true;
  }

  onCancelEdit(): void {
    this.isEditing = false;
    this.validationErrors = {};
    this.loadRecordData();
  }

  onSaveChanges(): void {
    if (!this.chlorineRecord) return;

    if (!this.editForm.valid) {
      this.validateForm();
      this.notificationService.error('Errores de validación', 'Corrige los errores antes de guardar');
      return;
    }

    const updatedData: ChlorineRecordRequest = {
      organizationId: this.chlorineRecord.organization.organizationId,
      recordedByUserId: this.chlorineRecord.recordedByUser.id,
      testingPointId: this.chlorineRecord.testingPoints[0]?.id || '', // Assuming single point for request
      recordDate: this.chlorineRecord.recordDate,
      level: this.editForm.value.level,
      acceptable: this.editForm.value.acceptable,
      actionRequired: this.editForm.value.actionRequired,
      observations: this.editForm.value.observations,
      amount: this.editForm.value.amount,
      recordType: this.chlorineRecord.recordType
    };

    this.isSaving = true;

    this.waterQualityApi.updateChlorineRecord(this.chlorineRecord.id, updatedData).pipe(
      catchError(error => {
        console.error('Error updating chlorine record:', error);
        this.notificationService.error('Error al actualizar', 'No se pudo guardar el registro');
        this.isSaving = false;
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.success) {
        this.notificationService.success('Registro actualizado', 'Los cambios se guardaron correctamente');
        this.isSaving = false;
        this.isEditing = false;
        // Emit the updated record to the parent component
        this.recordUpdated.emit(response.data);
      } else {
        this.notificationService.error('Error al actualizar', response?.message || 'Error desconocido');
        this.isSaving = false;
      }
    });
  }

  validateForm(): void {
    this.validationErrors = {};
    const level = this.editForm.get('level');
    const amount = this.editForm.get('amount');
    const observations = this.editForm.get('observations');

    if (level?.hasError('required')) this.validationErrors['level'] = 'El nivel es obligatorio';
    if (level?.hasError('min')) this.validationErrors['level'] = 'El nivel debe ser mayor o igual a 0';

    if (amount?.hasError('required')) this.validationErrors['amount'] = 'La cantidad es obligatoria';
    if (amount?.hasError('min')) this.validationErrors['amount'] = 'La cantidad debe ser mayor o igual a 0';

    if (observations?.hasError('maxlength')) this.validationErrors['observations'] = 'Máximo 300 caracteres permitidos';
  }

  onClose(): void {
    if (!this.isSaving) {
      this.close.emit();
      this.resetModal();
    }
  }

  resetModal(): void {
    this.isEditing = false;
    this.validationErrors = {};
    this.editForm.reset();
  }

  formatDate(date: string): string {
    if (!date) return 'No disponible';
    const d = new Date(date);
    return d.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  translateStatus(acceptable: boolean, actionRequired: boolean): string {
    if (actionRequired) {
      return 'Acción Requerida';
    } else if (acceptable) {
      return 'Aceptado'; // Cambiado de 'Aceptable' a 'Aceptado'
    } else {
      return 'No Aceptable';
    }
  }
}