import { Component, OnInit, OnDestroy } from '@angular/core'; // <-- MODIFICADO
import { forkJoin, Subject, of } from 'rxjs'; // <-- MODIFICADO
import { debounceTime, distinctUntilChanged, takeUntil, map, catchError } from 'rxjs/operators'; // <-- AÑADIDO
declare const Swal: any;
import { CommonModule } from '@angular/common';
import { Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { BoxService } from '../../services/infrastructure-api';
import { WaterBox, BoxType, Status } from '../../models/maintenance.model';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
// NotificationService removed: not present in project. Use alertBox/confirmDialog wrappers instead.
import { InfraConfirmationModal, InfraConfirmationData } from '../confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-supplies-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InfraConfirmationModal],
  templateUrl: './supplies-management.html',
})
export class SuppliesManagementComponent implements OnInit, OnDestroy {
  boxes: WaterBox[] = [];
  allBoxes: WaterBox[] = [];

  // Client-side pagination
  page: number = 1;
  pageSize: number = 10;
  get totalItems(): number { return this.boxes.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalItems / this.pageSize)); }

  loading = false;
  showModal = false;
  isEdit = false;
  form: FormGroup;
  currentId: number | null = null;

  statusOptions = [Status.ACTIVE, Status.INACTIVE];
  boxTypes = Object.values(BoxType);
  showDetailsModal = false;
  selectedBox: WaterBox | null = null;

  // --- INICIO: CÓDIGO AÑADIDO PARA EL BUSCADOR ---
  searchControl = new FormControl('');
  private selectedTypeFilter: string = '';
  private unsubscribe$ = new Subject<void>();
  // --- FIN: CÓDIGO AÑADIDO PARA EL BUSCADOR ---


  organizationName: string = '';

  // Confirmation modal (infrastructure) state
  confirmModalOpen = false;
  confirmModalData: InfraConfirmationData = {
    title: 'Confirmar acción',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  private pendingAction: (() => void) | null = null;

  constructor(
  private boxService: BoxService,
  private fb: FormBuilder,
  @Optional() private authService: AuthService | null,
  private notificationService: NotificationService
  ) {
      this.form = this.fb.group({
        organizationId: ['', [Validators.required]],
        boxCode: [{value: '', disabled: true}, [Validators.required]],
        boxType: ['', Validators.required],
        installationDate: ['', Validators.required],
        status: [Status.ACTIVE, Validators.required],
        currentAssignmentId: [null]
      });
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
    // Obtener primero el nombre de la organización del usuario logueado para evitar sobrescrituras
  const orgId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (orgId) {
      this.boxService.getOrganizationNameById(orgId).subscribe({
        next: (name) => {
          this.organizationName = name;
          // Cargar según filtro seleccionado (por defecto 'all' o 'active')
          if (this.selectedStatus === 'all') this.fetchAllBoxes();
          else if (this.selectedStatus === 'active') this.fetchBoxes(true);
          else this.fetchBoxes(false);
        },
        error: () => {
          this.organizationName = 'Organización no encontrada';
          if (this.selectedStatus === 'all') this.fetchAllBoxes();
          else if (this.selectedStatus === 'active') this.fetchBoxes(true);
          else this.fetchBoxes(false);
        }
      });
    } else {
      this.organizationName = '';
      if (this.selectedStatus === 'all') this.fetchAllBoxes();
      else if (this.selectedStatus === 'active') this.fetchBoxes(true);
      else this.fetchBoxes(false);
    }

    this.setupSearchListener(); // <-- AÑADIDO
  }

  // Llama al servicio que obtiene todos (activos + inactivos) para la organización
  fetchAllBoxes() {
    this.loading = true;
    this.boxService.getAllWaterBoxes().subscribe({
      next: (boxes) => {
        const orgDisplay = this.organizationName || '';
        const updated = boxes.map(box => ({ ...box, organizationName: orgDisplay || box.organizationName || box.organizationId }));
        this.allBoxes = updated.sort((a, b) => a.id - b.id);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // --- INICIO: CÓDIGO AÑADIDO PARA EL BUSCADOR ---
  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private setupSearchListener(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.unsubscribe$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    let filteredData = [...this.allBoxes];

    if (this.selectedTypeFilter) {
      filteredData = filteredData.filter(box => box.boxType === this.selectedTypeFilter);
    }

    if (searchTerm) {
      filteredData = filteredData.filter(box => 
        box.boxCode.toLowerCase().includes(searchTerm)
      );
    }
    
    this.boxes = filteredData;
    // Resetear la página al aplicar filtros para que el usuario vea la primera página
    this.page = 1;
  }
  // --- FIN: CÓDIGO AÑADIDO PARA EL BUSCADOR ---

  fetchBoxes(activeOnly: boolean = true) {
    this.loading = true;
    const fetchObservable = activeOnly ? this.boxService.getAllActiveWaterBoxes() : this.boxService.getAllInactiveWaterBoxes();

    fetchObservable.subscribe({
      next: (boxes) => {
        // Usar el nombre ya resuelto en this.organizationName o el nombre que venga en la caja
        const orgDisplay = this.organizationName || '';
        const updated = boxes.map(box => ({ ...box, organizationName: orgDisplay || box.organizationName || box.organizationId }));
        this.allBoxes = updated.sort((a, b) => a.id - b.id);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  fetchInactiveBoxes() {
    this.fetchBoxes(false);
  }

  filterBoxesByType(event: Event) {
    this.selectedTypeFilter = (event.target as HTMLSelectElement).value; // <-- MODIFICADO
    this.applyFilters(); // <-- MODIFICADO
  }

  // --- INICIO: CÓDIGO AÑADIDO PARA FILTRAR POR ESTADO ---
  filterBoxesByStatus(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue === 'active') {
      this.boxes = this.allBoxes.filter(box => box.status === 'ACTIVE');
    } else if (selectedValue === 'inactive') {
      this.boxes = this.allBoxes.filter(box => box.status === 'INACTIVE');
    } else {
      this.boxes = [...this.allBoxes];
    }
  }
  // --- FIN: CÓDIGO AÑADIDO PARA FILTRAR POR ESTADO ---

  openModal(edit: boolean = false, box?: WaterBox) {
    this.showModal = true;
    this.isEdit = edit;
    if (edit && box) {
      this.currentId = box.id;
      this.form.patchValue({ ...box });
      this.form.get('organizationId')?.disable({ emitEvent: false });
      this.form.get('boxCode')?.disable({ emitEvent: false });
      // Ensure status control is enabled when editing so user can change it
      this.form.get('status')?.enable({ emitEvent: false });
      // Obtener nombre de la organización para mostrarlo
      const orgId = box.organizationId;
      if (orgId) {
        this.boxService.getOrganizationNameById(orgId).subscribe({
          next: (name) => {
            console.log('Organización obtenida:', name);
            this.organizationName = name;
          },
          error: (err) => {
            console.error('Error al obtener la organización:', err);
            if (!this.organizationName) this.organizationName = 'Organización no encontrada';
          }
        });
      } else {
        this.organizationName = 'Sin organización asignada';
      }
    } else {
      this.currentId = null;
      this.form.reset({ status: Status.ACTIVE });
      const orgId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
      if (!orgId) {
        this.showModal = false;
        this.alertBox('Error de organización', 'Tu usuario no tiene una organización asignada. No es posible crear una caja de agua. Contacta con el administrador del sistema.', 'error');
        return;
      }
      this.form.get('organizationId')?.setValue(orgId, { emitEvent: false });
      this.form.get('organizationId')?.disable({ emitEvent: false });
      // Obtener nombre de la organización para mostrarlo desde la URL proporcionada
      this.boxService.getOrganizationNameById(orgId).subscribe({
        next: (name) => {
          console.log('Organización obtenida:', name);
          this.organizationName = name;
        },
        error: (err) => {
          console.error('Error al obtener la organización:', err);
          if (!this.organizationName) this.organizationName = 'Organización no encontrada';
          this.alertBox('Advertencia', 'No se pudo cargar el nombre de la organización, pero puedes continuar creando el suministro.', 'warning');
        }
      });
      // Generar número único de suministro
      const uniqueNumber = this.generateSupplyNumber();
      this.form.get('boxCode')?.setValue(uniqueNumber, { emitEvent: false });
      this.form.get('boxCode')?.disable({ emitEvent: false });
      // Keep the status field disabled on creation so new supplies are always ACTIVE
      this.form.get('status')?.disable({ emitEvent: false });
    }
  }

  // Generador simple: timestamp + random
  private generateSupplyNumber(): string {
    const base = Math.floor(Date.now() / 1000); // segundos
    const rand = Math.floor(Math.random() * 100);
    return `${base}-${rand}`;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset({ status: Status.ACTIVE });
    this.currentId = null;
    // Ensure status is disabled by default after closing (creation state)
    this.form.get('status')?.disable({ emitEvent: false });
  }

  viewDetails(box: WaterBox) {
    this.selectedBox = box;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedBox = null;
  }

  submit() {
    if (this.form.invalid) {
      this.showValidationErrors();
      return;
    }
    const raw = this.form.getRawValue();
    const value = { ...raw };
    if (this.isEdit && this.currentId) {
      this.boxService.updateWaterBox(this.currentId, value).subscribe({
        next: () => {
          this.refreshBoxes();
          this.closeModal();
          this.notificationService.success('¡Actualizado!', 'El suministro ha sido actualizado.');
        },
        error: (err) => {
          let errorMessage = 'No se pudo actualizar el suministro.';
          if (err.error && err.error.message) {
            errorMessage = err.error.message;
          } else if (err.message) {
            errorMessage = err.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      });
    } else {
      this.boxService.createWaterBox(value).subscribe({
        next: () => {
          this.refreshBoxes();
          this.closeModal();
          this.notificationService.success('¡Creado!', 'El suministro ha sido creado.');
        },
        error: (err) => {
          let errorMessage = 'No se pudo crear el suministro.';
          if (err.error && err.error.message) {
            if (err.error.message.includes('duplicate') || err.error.message.includes('duplicado')) {
              errorMessage = 'Ya existe un suministro con ese código. Por favor, use otro código.';
            } else {
              errorMessage = err.error.message;
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      });
    }
  }

  private showValidationErrors() {
    const errors: string[] = [];
    
    if (this.form.get('organizationId')?.invalid) {
      errors.push('• Organización es requerida');
    }
    
    if (this.form.get('boxCode')?.invalid) {
      errors.push('• Número de suministro es requerido');
    }
    
    if (this.form.get('boxType')?.invalid) {
      errors.push('• Tipo de caja es requerido');
    }
    
    if (this.form.get('installationDate')?.invalid) {
      errors.push('• Fecha de instalación es requerida');
    }
    
    if (this.form.get('status')?.invalid) {
      errors.push('• Estado es requerido');
    }

    const errorMessage = errors.length > 0 
      ? `Complete todos los campos requeridos para continuar.`
      : 'Por favor, complete todos los campos requeridos.';

    this.notificationService.error('Error', errorMessage);
  }

  deleteBox(id: number) {
    this.openConfirmModal({
      title: '¿Estás seguro?',
      message: 'Deseas eliminar este suministro.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }, () => {
      this.boxService.deleteWaterBox(id).subscribe({
        next: () => {
          this.refreshBoxes();
          this.notificationService.success('¡Eliminado!', 'El suministro ha sido eliminado.');
        },
        error: (err) => {
          let errorMessage = 'No se pudo eliminar el suministro.';
          if (err.error && err.error.message && err.error.message.includes('asignación')) {
            errorMessage = 'No se puede eliminar el suministro porque tiene asignaciones activas.';
          } else if (err.error && err.error.message) {
            errorMessage = err.error.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      });
    });
  }

  restoreBox(id: number) {
    this.openConfirmModal({
      title: '¿Estás seguro de restaurar?',
      message: 'Esta acción restaurará el suministro.',
      confirmText: 'Sí, restaurar',
      cancelText: 'Cancelar',
      type: 'info'
    }, () => {
      this.boxService.restoreWaterBox(id).subscribe({
        next: () => {
          this.refreshBoxes();
          this.notificationService.success('¡Restaurado!', 'El suministro ha sido restaurado.');
        },
        error: (err) => {
          let errorMessage = 'No se pudo restaurar el suministro.';
          if (err.error && err.error.message) {
            errorMessage = err.error.message;
          } else if (err.message) {
            errorMessage = err.message;
          }
          this.notificationService.error('Error', errorMessage);
        }
      });
    });
  }

  // Helper to refresh the current list according to the selected status filter
  private refreshBoxes(): void {
    if (this.selectedStatus === 'all') {
      this.fetchAllBoxes();
    } else if (this.selectedStatus === 'active') {
      this.fetchBoxes(true);
    } else {
      this.fetchBoxes(false);
    }
  }

  // Small getters used by the summary cards in the template (keeps template simple)
  get totalAllBoxesCount(): number {
    return Array.isArray(this.allBoxes) ? this.allBoxes.length : 0;
  }

  get activeBoxesCount(): number {
    return Array.isArray(this.allBoxes) ? this.allBoxes.filter(b => b.status === 'ACTIVE').length : 0;
  }

  get inactiveBoxesCount(): number {
    return Array.isArray(this.allBoxes) ? this.allBoxes.filter(b => b.status === 'INACTIVE').length : 0;
  }

  get showingBoxesCount(): number {
    return Array.isArray(this.boxes) ? this.boxes.length : 0;
  }

  // Estado del dropdown de filtros
  selectedStatus: 'all' | 'active' | 'inactive' = 'all';
  statusDropdownOpen = false;

  toggleStatusDropdown() {
    this.statusDropdownOpen = !this.statusDropdownOpen;
  }

  setBoxesFilter(filter: 'all' | 'active' | 'inactive') {
    this.selectedStatus = filter;
    this.statusDropdownOpen = false;
    if (filter === 'all') {
      this.fetchAllBoxes();
    } else if (filter === 'active') {
      this.fetchBoxes(true);
    } else {
      this.fetchBoxes(false);
    }
  }

  // Pagination helpers
  get pagedBoxes(): WaterBox[] {
    const start = (this.page - 1) * this.pageSize;
    return this.boxes.slice(start, start + this.pageSize);
  }

  // Devuelve una lista de páginas a mostrar (ventana centrada, máximo 5)
  getPages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const maxButtons = 5;
    let start = Math.max(1, current - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > total) { end = total; start = Math.max(1, end - maxButtons + 1); }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // Rangos mostrados en el footer
  get rangeStart(): number {
    return this.totalItems ? ((this.page - 1) * this.pageSize + 1) : 0;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }
  goToPage(n: number) { if (n >= 1 && n <= this.totalPages) this.page = n; }

  // Methods to control the infra confirmation modal (same pattern used in supplies-assignment)
  openConfirmModal(data: InfraConfirmationData, action: () => void) {
    this.confirmModalData = { ...this.confirmModalData, ...data };
    this.pendingAction = action;
    this.confirmModalOpen = true;
  }

  onConfirmModal() {
    this.confirmModalOpen = false;
    const action = this.pendingAction;
    this.pendingAction = null;
    if (action) {
      action();
    }
  }

  onCancelModal() {
    this.confirmModalOpen = false;
    this.pendingAction = null;
  }

}