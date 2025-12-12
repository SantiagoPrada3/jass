import { CommonModule } from '@angular/common';
// Nota: usamos wrappers alertBox/confirmDialog para tolerar ausencia de SweetAlert
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { BoxService } from '../../services/infrastructure-api';
import { WaterBoxTransfer } from '../../models/maintenance.model';
import { NotificationService } from '../../../../shared/services/notification.service';

  type DocumentKind = 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx' | 'other';

  @Component({
    selector: 'app-supplies-transfer',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './supplies-transfer.html'
  })
    export class SuppliesTransferComponent implements OnInit {
    waterBoxes: { id: number; boxCode: string }[] = [];
  assignmentUsers: { id: number; userId: string, displayName: string }[] = [];
  transfers: WaterBoxTransfer[] = [];

  // Client-side pagination
  page: number = 1;
  pageSize: number = 10;
  get totalItemsTransfers(): number { return this.transfers.length; }
  get totalPagesTransfers(): number { return Math.max(1, Math.ceil(this.totalItemsTransfers / this.pageSize)); }
    loading = false;
    loadingAssignments = false;
  submitting = false;
    showModal = false;
    isEdit = false;
    currentId: number | null = null;
    form: FormGroup;
    availableAssignments: { id: number; label: string; tooltip?: string }[] = [];
    errorMessages = {
      waterBoxes: '',
      assignments: '',
      general: ''
    };

    // Validadores personalizados
    static urlValidator(control: AbstractControl) {
      const value = control.value?.trim();
      if (!value) return null; // URLs vacías son opcionales
      const urlPattern = /^https?:\/\/.+/;
      return urlPattern.test(value) ? null : { invalidUrl: true };
    }

    static transferReasonValidator(control: AbstractControl) {
      const value = control.value?.trim();
      if (!value) return { required: true };
      if (value.length < 10) return { minLength: { actualLength: value.length, requiredLength: 10 } };
      if (value.length > 500) return { maxLength: { actualLength: value.length, requiredLength: 500 } };
      return null;
    }

    constructor(
      private boxService: BoxService,
      private fb: FormBuilder,
      private notificationService: NotificationService
    ) {
      this.form = this.fb.group({
        waterBoxId: ['', Validators.required],
        oldAssignmentId: ['', Validators.required],
        newAssignmentId: ['', Validators.required],
          transferReason: ['', SuppliesTransferComponent.transferReasonValidator],
        documents: this.fb.array([]),
        createdAt: ['']
      });
      
      // Validador personalizado para evitar asignaciones iguales
      this.form.addValidators(() => {
        const oldId = this.form.get('oldAssignmentId')?.value;
        const newId = this.form.get('newAssignmentId')?.value;
        if (oldId && newId && Number(oldId) === Number(newId)) {
          return { sameAssignment: true };
        }
        return null;
      });
      
      this.addDocument();
    }

    // Envoltorios ligeros para SweetAlert2 con fallback a confirm/alert si no está disponible
    private async confirmDialog(options: { title: string; text?: string; icon?: string; confirmButtonText?: string; cancelButtonText?: string; confirmButtonColor?: string; cancelButtonColor?: string; showCancelButton?: boolean; }): Promise<boolean> {
      const win = window as any;
      if (win && win.Swal && typeof win.Swal.fire === 'function') {
        const result = await win.Swal.fire(options as any);
        return !!result.isConfirmed;
      }
      const message = options.title + (options.text ? '\n' + options.text : '');
      return Promise.resolve(window.confirm(message));
    }

    private alertBox(title: string, text?: string, icon?: string) {
      const win = window as any;
      if (win && win.Swal && typeof win.Swal.fire === 'function') {
        win.Swal.fire(title, text, icon);
        return;
      }
      window.alert(title + (text ? '\n' + text : ''));
    }

    ngOnInit() {
      this.fetchTransfers();
      this.fetchWaterBoxes();
      this.form.get('waterBoxId')?.valueChanges.subscribe((val) => {
        const id = Number(val);
        if (!isNaN(id) && id > 0) {
          this.onWaterBoxIdChange(id);
        } else {
          this.availableAssignments = [];
          this.form.patchValue({ oldAssignmentId: '', newAssignmentId: '' });
        }
      });
    }

    fetchWaterBoxes() {
      this.boxService.getAllWaterBoxes().subscribe({
        next: (boxes) => {
          this.waterBoxes = boxes.map(box => ({ id: box.id, boxCode: box.boxCode }));
          if (this.waterBoxes.length === 0) {
            this.errorMessages.waterBoxes = 'No hay cajas de agua disponibles. Debe crear al menos una caja de agua antes de realizar transferencias.';
          } else {
            this.errorMessages.waterBoxes = '';
          }
        },
        error: (err) => {
          console.error('Error loading water boxes:', err);
          this.errorMessages.waterBoxes = 'Error al cargar las cajas de agua. Por favor, intente nuevamente.';
          this.notificationService.error('Error', 'No se pudieron cargar las cajas de agua.');
        }
      });
    }

    private onWaterBoxIdChange(waterBoxId: number) {
      this.loadingAssignments = true;
      this.errorMessages.assignments = '';
      this.availableAssignments = [];
      
      this.boxService.getWaterBoxAssignmentsByBoxId(waterBoxId).subscribe({
        next: (list) => {
          // Filtrar solo asignaciones activas
          const activeAssignments = list.filter(assignment => assignment.status === 'ACTIVE');
          
          if (activeAssignments.length === 0) {
            this.errorMessages.assignments = 'Esta caja de agua no tiene asignaciones activas. Debe tener al menos una asignación activa antes de realizar transferencias.';
            this.loadingAssignments = false;
            return;
          }

          if (activeAssignments.length < 2) {
            this.errorMessages.assignments = 'Se necesitan al menos 2 asignaciones activas para realizar una transferencia.';
            this.loadingAssignments = false;
            return;
          }

          const userIds = activeAssignments.map(a => a.userId);
          this.boxService.getClients().subscribe({
            next: (users) => {
              // Construir mapa id -> displayName (firstName + lastName) o username como fallback
              const userMap = new Map<string, string>(users.map(u => {
                const nameParts = [(u.firstName || '').trim(), (u.lastName || '').trim()].filter(p => p && p.length > 0);
                const display = nameParts.length > 0 ? nameParts.join(' ') : (u.username || 'Usuario desconocido');
                return [u.id, display] as [string, string];
              }));
              this.assignmentUsers = activeAssignments.map(a => ({
                id: a.id,
                userId: a.userId,
                displayName: userMap.get(a.userId) || 'Usuario desconocido'
              }));
              this.availableAssignments = activeAssignments
                .sort((a, b) => a.id - b.id)
                .map(a => {
                  const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '';
                  const end = a.endDate ? new Date(a.endDate).toLocaleDateString() : '';
                  const tooltip = `Período: ${start}${end ? ' - ' + end : ' - Actual'}`;
                  return {
                    id: a.id,
                    label: userMap.get(a.userId) || 'Usuario desconocido',
                    tooltip
                  };
                });
              this.loadingAssignments = false;
            },
            error: (err) => {
              console.error('Error loading clients', err);
              this.errorMessages.assignments = 'Error al cargar los usuarios. Por favor, intente nuevamente.';
              this.loadingAssignments = false;
            }
          });
        },
        error: (err) => {
          console.error('Error loading assignments by waterBoxId', err);
          this.errorMessages.assignments = 'Error al cargar las asignaciones de esta caja de agua.';
          this.availableAssignments = [];
          this.loadingAssignments = false;
        }
      });
    }

    getBoxCodeById(id: number): string {
      const box = this.waterBoxes.find(b => b.id === id);
      return box ? box.boxCode : id.toString();
    }

    getUsernameByAssignmentId(id: number): string {
      const assign = this.assignmentUsers.find(a => a.id === id);
      return assign && assign.displayName ? assign.displayName : 'Usuario desconocido';
    }

    addDocument(): void {
      this.documents.push(this.newDocument());
    }

    get documents(): FormArray {
      return this.form.get('documents') as FormArray;
    }

    newDocument(url: string = ''): FormGroup {
      return this.fb.group({ 
        url: [url, SuppliesTransferComponent.urlValidator] 
      });
    }

    removeDocument(i: number): void {
      this.documents.removeAt(i);
    }

    setDocuments(documents: string[] | { url: string }[]): void {
      this.documents.clear();
      documents.forEach((doc) => {
        const url = typeof doc === 'string' ? doc : doc.url;
        this.documents.push(this.newDocument(url));
      });
    }

    detectDocumentType(fileNameOrUrl: string): DocumentKind {
      const extension = fileNameOrUrl.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'pdf': return 'pdf';
        case 'jpg':
        case 'jpeg': return 'jpg';
        case 'png': return 'png';
        case 'docx': return 'docx';
        case 'xlsx': return 'xlsx';
        default: return 'other';
      }
    }

    async deleteTransfer(id: number) {
      const confirmed = await this.confirmDialog({
        title: '¿Estás seguro?',
        text: 'No podrás revertir esto.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (confirmed) {
        this.boxService.deleteWaterBoxTransfer(id).subscribe(() => {
          this.fetchTransfers();
          this.notificationService.success('¡Eliminado!', 'La transferencia ha sido eliminada.');
        });
      }
    }

    async restoreTransfer(id: number) {
      const confirmed = await this.confirmDialog({
        title: '¿Estás seguro de restaurar?',
        text: 'Esta acción restaurará la transferencia.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Sí, restaurar',
        cancelButtonText: 'Cancelar'
      });
      if (confirmed) {
        this.boxService.restoreWaterBoxTransfer(id).subscribe(() => {
          this.fetchTransfers();
          this.notificationService.success('¡Restaurado!', 'La transferencia ha sido restaurada.');
        });
      }
    }

    private statusToLabel(status?: string): string {
      switch ((status || '').toUpperCase()) {
        case 'ACTIVE': return 'Activo';
        case 'INACTIVE': return 'Inactivo';
        case 'COMPLETED': return 'Completado';
        case 'CANCELLED': return 'Cancelado';
        default: return (status || '').toString();
      }
    }

    fetchTransfers() {
      this.loading = true;
      this.errorMessages.general = '';
      
      this.boxService.getAllWaterBoxTransfers().subscribe({
        next: (data) => {
          if (data.length === 0) {
            this.transfers = [];
            this.loading = false;
            return;
          }

          // 1) Tomamos todos los IDs de asignación de las transferencias
          const assignIds = data.flatMap(t => [t.oldAssignmentId, t.newAssignmentId]).filter(id => id != null) as number[];
          // 2) Obtenemos las asignaciones por esos IDs -> Map id -> asignación
          this.boxService.getAssignmentsByIds(assignIds).subscribe({
            next: (assignMap) => {
              // 3) Con las asignaciones, recogemos sus userIds únicos
              const userIds = Array.from(assignMap.values()).map(a => a.userId);
              // 4) Obtener los clientes completos y construir nombres para mostrar
              this.boxService.getClients().subscribe({
                next: (users) => {
                  const filtered = users.filter(u => userIds.includes(u.id));
                  const userMap = new Map<string, string>(filtered.map(u => {
                    const nameParts = [(u.firstName || '').trim(), (u.lastName || '').trim()].filter(p => p && p.length > 0);
                    const display = nameParts.length > 0 ? nameParts.join(' ') : (u.username || 'Usuario desconocido');
                    return [u.id, display] as [string, string];
                  }));
                  this.transfers = data.map(t => {
                    const oldAssign = assignMap.get(t.oldAssignmentId);
                    const newAssign = assignMap.get(t.newAssignmentId);
                    const oldUserDisplay = oldAssign ? (userMap.get(oldAssign.userId) || 'Usuario desconocido') : 'Usuario desconocido';
                    const newUserDisplay = newAssign ? (userMap.get(newAssign.userId) || 'Usuario desconocido') : 'Usuario desconocido';
                    return {
                      ...t,
                      oldAssignmentUsername: oldUserDisplay,
                      newAssignmentUsername: newUserDisplay
                    };
                  }).sort((a, b) => a.id - b.id);
                  this.loading = false;
                },
                error: (err) => {
                  console.error('Error loading users:', err);
                  this.errorMessages.general = 'Error al cargar la información de usuarios.';
                  this.loading = false;
                }
              });
            },
            error: (err) => {
              console.error('Error loading assignments:', err);
              this.errorMessages.general = 'Error al cargar la información de asignaciones.';
              this.loading = false;
            }
          });
        },
        error: (err) => {
          console.error('Error loading transfers:', err);
          this.errorMessages.general = 'Error al cargar las transferencias. Por favor, intente nuevamente.';
          this.loading = false;
        }
      });
    }

    // Pagination helpers
    get pagedTransfers(): WaterBoxTransfer[] {
      const start = (this.page - 1) * this.pageSize;
      return this.transfers.slice(start, start + this.pageSize);
    }

    // Devuelve una lista de páginas a mostrar (ventana centrada, máximo 5)
    getPagesTransfers(): number[] {
      const total = this.totalPagesTransfers;
      const current = this.page;
      const maxButtons = 5;
      let start = Math.max(1, current - Math.floor(maxButtons / 2));
      let end = start + maxButtons - 1;
      if (end > total) { end = total; start = Math.max(1, end - maxButtons + 1); }
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    }

    prevPageTransfers() { if (this.page > 1) this.page--; }
    nextPageTransfers() { if (this.page < this.totalPagesTransfers) this.page++; }
    goToPageTransfers(n: number) { if (n >= 1 && n <= this.totalPagesTransfers) this.page = n; }

    // Resetear página al cambiar filtros/datos
    private resetPageTransfers() { this.page = 1; }

    // Rangos mostrados en el footer
    get rangeStartTransfers(): number { return this.totalItemsTransfers ? ((this.page - 1) * this.pageSize + 1) : 0; }
    get rangeEndTransfers(): number { return Math.min(this.page * this.pageSize, this.totalItemsTransfers); }

    openModal(edit: boolean = false, transfer?: WaterBoxTransfer) {
      this.showModal = true;
      this.isEdit = edit;
      if (this.isEdit && transfer) {
        this.currentId = transfer.id;
        this.form.patchValue({ ...transfer, documents: null });
        this.setDocuments(transfer.documents || []);
        if (transfer.waterBoxId) {
          this.onWaterBoxIdChange(transfer.waterBoxId);
        }
      } else {
        this.currentId = null;
        this.form.reset();
        this.documents.clear();
        this.addDocument();
      }
    }

    closeModal() {
      this.showModal = false;
      this.form.reset();
      this.currentId = null;
    }

    submit() {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.showValidationErrors();
        return;
      }

      // Validar que haya al menos un documento válido si se proporcionaron URLs
      const documentUrls: string[] = this.documents.controls
        .map(control => (control.value?.url || '').trim())
        .filter(url => url.length > 0);

      // Validar URLs si existen
      const invalidUrls = this.documents.controls.some(control => 
        control.get('url')?.invalid && control.get('url')?.value?.trim()
      );

      if (invalidUrls) {
        this.alertBox('Error', 'Por favor, corrija las URLs inválidas antes de continuar.', 'error');
        return;
      }

      this.proceedSave(documentUrls);
    }

    private showValidationErrors() {
      let errorMessage = 'Por favor, corrija los siguientes errores:\n';
      
      if (this.form.get('waterBoxId')?.invalid) {
        errorMessage += '• Seleccione una caja de agua\n';
      }
      
      if (this.form.get('oldAssignmentId')?.invalid) {
        errorMessage += '• Seleccione la asignación anterior\n';
      }
      
      if (this.form.get('newAssignmentId')?.invalid) {
        errorMessage += '• Seleccione la nueva asignación\n';
      }
      
      if (this.form.errors?.['sameAssignment']) {
        errorMessage += '• Las asignaciones antigua y nueva no pueden ser iguales\n';
      }
      
      const reasonControl = this.form.get('transferReason');
      if (reasonControl?.invalid) {
        if (reasonControl.errors?.['required']) {
          errorMessage += '• El motivo de transferencia es requerido\n';
        } else if (reasonControl.errors?.['minLength']) {
          errorMessage += '• El motivo debe tener al menos 10 caracteres\n';
        } else if (reasonControl.errors?.['maxLength']) {
          errorMessage += '• El motivo no puede exceder 500 caracteres\n';
        }
      }

  // Usar el envoltorio que permite fallback si SweetAlert no está presente
  this.notificationService.error('Formulario incompleto', errorMessage);
    }

    private proceedSave(documentUrls: string[]) {
      const raw = this.form.value as any;
      const value = {
        ...raw,
        waterBoxId: Number(raw.waterBoxId),
        oldAssignmentId: Number(raw.oldAssignmentId),
        newAssignmentId: Number(raw.newAssignmentId),
        documents: documentUrls
      };

      // Mostrar feedback local y usar bandera submitting para bloquear el botón
      this.submitting = true;
      if (this.isEdit && this.currentId !== null) {
        this.boxService.updateWaterBoxTransfer(this.currentId, value).subscribe({
            next: () => {
            this.submitting = false;
            this.fetchTransfers();
            this.closeModal();
            this.notificationService.success('¡Actualizada!', 'La transferencia se actualizó correctamente.');
          },
          error: (err: any) => {
            this.submitting = false;
            console.error('Error updating transfer:', err);
            const errorMsg = this.getErrorMessage(err);
            this.notificationService.error('Error al actualizar', errorMsg);
          }
        });
      } else {
        this.boxService.createWaterBoxTransfer(value).subscribe({
          next: () => {
            this.submitting = false;
            this.fetchTransfers();
            this.closeModal();
            this.notificationService.success('¡Creada!', 'La transferencia se creó correctamente.');
          },
          error: (err: any) => {
            this.submitting = false;
            console.error('Error creating transfer:', err);
            const errorMsg = this.getErrorMessage(err);
            this.notificationService.error('Error al crear', errorMsg);
          }
        });
      }
    }

    private getErrorMessage(error: any): string {
      if (error?.error?.message) {
        return error.error.message;
      } else if (error?.message) {
        return error.message;
      } else if (error?.status === 400) {
        return 'Los datos enviados no son válidos. Verifique la información.';
      } else if (error?.status === 403) {
        return 'No tiene permisos para realizar esta acción.';
      } else if (error?.status === 404) {
        return 'No se encontró el recurso solicitado.';
      } else if (error?.status === 500) {
        return 'Error interno del servidor. Intente nuevamente más tarde.';
      } else {
        return 'Ocurrió un error inesperado. Por favor, intente nuevamente.';
      }
    }
  }
