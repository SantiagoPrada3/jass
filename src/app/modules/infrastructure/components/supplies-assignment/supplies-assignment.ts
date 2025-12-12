// ...imports y definición de la clase...
import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
// Se usa SweetAlert en la UI; algunos entornos no tienen el paquete instalado durante la edición.
// Declaramos temporalmente la variable para evitar errores de compilación. Reemplazar por
// `import Swal from 'sweetalert2';` tras instalar `sweetalert2` y sus types.
declare const Swal: any;
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BoxService, UserClient } from '../../services/infrastructure-api';
import { WaterBoxAssignment, Status, WaterBox } from '../../models/maintenance.model';
import { generateAssignmentsPdf } from './report-generator';
import { InfraConfirmationModal, InfraConfirmationData } from '../confirmation-modal/confirmation-modal';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-supplies-assignment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InfraConfirmationModal],
  templateUrl: './supplies-assignment.html',

})
export class SuppliesAssignmentComponent implements OnInit {
  assignments: WaterBoxAssignment[] = [];
  loading = false;
  // Client-side pagination
  page: number = 1;
  pageSize: number = 10;
  get totalItemsAssignments(): number { return this.assignments.length; }
  get totalPagesAssignments(): number { return Math.max(1, Math.ceil(this.totalItemsAssignments / this.pageSize)); }
  selectedStatus: 'all' | 'active' | 'inactive' = 'all';
  statusDropdownOpen = false;
  showModal = false;
  isEdit = false;
  form: FormGroup;
  currentId: number | null = null;
  statusOptions = Object.values(Status);
  waterBoxes: { id: number; boxCode: string }[] = [];
  showDetailsModal = false;
  selectedAssignment: WaterBoxAssignment | null = null;
  selectedWaterBox: WaterBox | null = null;
  clientUsers: UserClient[] = [];
  organizationName: string = '';
  organizationLogo?: string | undefined;
  // Lista separada para el dropdown del modal de creación (solo activos)
  modalClientUsers: UserClient[] = [];
  userNameMap: Map<string, string> = new Map();
  modalUserNameMap: Map<string, string> = new Map();
  // Evitar peticiones duplicadas cuando pedimos nombres individualmente
  pendingUserRequests: Set<string> = new Set();



  // Fecha mínima permitida (2 meses atrás)
  get minStartDate(): string {
    const today = new Date();
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
    return twoMonthsAgo.toISOString().split('T')[0];
  }

  // Confirmation modal (infrastructure) state
  confirmModalOpen = false;
  confirmModalData: InfraConfirmationData = {
    title: 'Confirmar acción',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  };
  // pendingAction will be a function executed when the modal confirm is accepted
  private pendingAction: (() => void) | null = null;

  private rebuildUserNameMap() {
    this.userNameMap.clear();
    this.clientUsers.forEach(u => {
      const id = String(u.id);
      const name = u.displayName || (u.firstName ? (u.firstName + (u.lastName ? (' ' + u.lastName) : '')) : (u.username || id));
      this.userNameMap.set(id, name);
    });
  }

  private rebuildModalUserNameMap() {
    this.modalUserNameMap.clear();
    this.modalClientUsers.forEach(u => {
      const id = String(u.id);
      const name = u.displayName || (u.firstName ? (u.firstName + (u.lastName ? (' ' + u.lastName) : '')) : (u.username || id));
      this.modalUserNameMap.set(id, name);
    });
  }

  constructor(
    private boxService: BoxService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      waterBoxId: ['', Validators.required],
      userId: ['', [Validators.required]],
      startDate: ['', Validators.required],
      endDate: [''],
      monthlyFee: ['', [Validators.required, Validators.pattern('^[0-9]+(\\.[0-9]+)?$'), Validators.min(0)]],
      status: [Status.ACTIVE, Validators.required]
    });
  }

  // Getters used by the summary cards in the template
  get totalAssignmentsCount(): number {
    return Array.isArray(this.assignments) ? this.assignments.length : 0;
  }

  get activeAssignmentsCount(): number {
    return Array.isArray(this.assignments) ? this.assignments.filter(a => a.status === 'ACTIVE').length : 0;
  }

  get inactiveAssignmentsCount(): number {
    return Array.isArray(this.assignments) ? this.assignments.filter(a => a.status === 'INACTIVE').length : 0;
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
    this.fetchAssignments();
    this.fetchWaterBoxIds();
    this.resolveOrganizationName();
    this.boxService.getClients().subscribe({
      next: (users) => {
        console.debug('initial getClients result:', users);
        this.clientUsers = users || [];
        this.rebuildUserNameMap();
        console.debug('clientUsers after initial load:', this.clientUsers.length, this.clientUsers.slice(0,5));
      },
      error: (err) => {
        console.error('Error fetching client users', err);
      }
    });

    // Listener para cambios en el campo userId - obtener automáticamente el fareAmount
    this.form.get('userId')?.valueChanges.subscribe(userId => {
      if (userId && userId.trim() !== '') {
        console.debug('Usuario seleccionado:', userId);
        this.boxService.getClientFareAmount(userId).subscribe({
          next: (fareAmount) => {
            console.debug('FareAmount obtenido para usuario', userId, ':', fareAmount);
            this.form.patchValue({ monthlyFee: fareAmount }, { emitEvent: false });
          },
          error: (err) => {
            console.error('Error obteniendo fareAmount para usuario', userId, err);
            // En caso de error, mantener el valor actual o usar 0
            this.form.patchValue({ monthlyFee: 0 }, { emitEvent: false });
          }
        });
      } else {
        // Si se limpia la selección de usuario, limpiar también la cuota
        this.form.patchValue({ monthlyFee: '' }, { emitEvent: false });
      }
    });
  }

  private resolveOrganizationName() {
    try {
      const currentUser: any = (this.boxService as any).authService?.getCurrentUser ? (this.boxService as any).authService.getCurrentUser() : null;
      const orgId = currentUser?.organizationId || currentUser?.orgId || null;
      if (orgId) {
        // Obtener objeto completo de organización para extraer logo además del nombre
        this.boxService.getOrganizationById(String(orgId)).pipe(catchError(() => of(null))).subscribe(org => {
          if (org) {
            this.organizationName = org.organizationName || org.organizationName || '';
            // El campo 'logo' puede venir como data URL (base64) o ruta; guardarlo para usar en el PDF
            if (org.logo) {
              this.organizationLogo = org.logo; // agregar propiedad dinámicamente
            }
          } else {
            this.organizationName = '';
          }
        });
      }
    } catch (e) {
      console.debug('resolveOrganizationName failed', e);
    }
  }

  toggleStatusDropdown() {
    this.statusDropdownOpen = !this.statusDropdownOpen;
  }

  setAssignmentsFilter(filter: 'all' | 'active' | 'inactive') {
    this.selectedStatus = filter;
    this.statusDropdownOpen = false;
    if (filter === 'active') {
      this.fetchAssignments(true);
    } else if (filter === 'inactive') {
      this.fetchAssignments(false);
    } else {
      // Cargar ambos y combinarlos
      this.loading = true;
      forkJoin({
        active: this.boxService.getAllActiveWaterBoxAssignments().pipe(catchError(() => of([]))),
        inactive: this.boxService.getAllInactiveWaterBoxAssignments().pipe(catchError(() => of([])))
      }).subscribe({
        next: ({ active, inactive }) => {
          this.assignments = ([...(active || []), ...(inactive || [])] as WaterBoxAssignment[]).sort((a, b) => a.id - b.id);
          this.page = 1;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading all assignments', err);
          this.loading = false;
        }
      });
    }
  }
  
  getUsernameById(id: string): string {
    const idStr = String(id);
    const user = this.clientUsers.find(u => String(u.id) === idStr);
    const mapped = this.userNameMap.get(idStr);
    if (mapped && mapped !== '') return mapped;

    if (user) {
      const name = user.displayName || (user.firstName ? (user.firstName + (user.lastName ? (' ' + user.lastName) : '')) : (user.username || idStr));
      this.userNameMap.set(idStr, name);
      return name;
    }

    // Si no tenemos el usuario, devolver el id por ahora y lanzar una petición on-demand
    if (!this.pendingUserRequests.has(idStr)) {
      this.pendingUserRequests.add(idStr);
      this.boxService.getUserBasicById(idStr).pipe(catchError(() => of({ id: idStr, username: 'Usuario desconocido', displayName: 'Usuario desconocido' } as UserClient))).subscribe((u: UserClient) => {
        const name = u.displayName || (u.firstName ? (u.firstName + (u.lastName ? (' ' + u.lastName) : '')) : (u.username || idStr));
        this.userNameMap.set(idStr, name);
        if (!this.clientUsers.some(x => String(x.id) === idStr)) {
          this.clientUsers.push({ id: idStr, username: u.username, firstName: u.firstName, lastName: u.lastName, displayName: name });
        }
        this.pendingUserRequests.delete(idStr);
      }, err => {
        console.error('Error fetching user on-demand', idStr, err);
        this.pendingUserRequests.delete(idStr);
      });
    }

    return idStr;
  }

  fetchAssignments(activeOnly: boolean = true) {
    this.loading = true;
    const fetchObservable = activeOnly ? this.boxService.getAllActiveWaterBoxAssignments() : this.boxService.getAllInactiveWaterBoxAssignments();

    fetchObservable.subscribe({
      next: (assignments) => {
        this.assignments = (assignments || []).sort((a, b) => a.id - b.id);
        this.page = 1;
        console.debug('fetchAssignments loaded', this.assignments.length, 'assignments');
        // Asegurar que clientUsers tenga los usuarios referenciados en las asignaciones (normalizar a string)
        const userIds = Array.from(new Set(this.assignments.map(a => String(a.userId)).filter(u => !!u)));
        console.debug('assignment userIds found:', userIds);
        const missingIds = userIds.filter((id: string) => !this.clientUsers.some(u => String(u.id) === String(id)));
        console.debug('missing userIds not in clientUsers:', missingIds);
        if (missingIds.length > 0) {
          this.boxService.getUsersByIds(missingIds).subscribe({
            next: (map) => {
              console.debug('getUsersByIds result map size:', map.size);
              console.debug('getUsersByIds map entries:', Array.from(map.entries()).slice(0,20));
              const users: UserClient[] = Array.from(map.entries()).map(([id, display]) => ({ id: String(id), username: display, firstName: display, lastName: '', displayName: display }));
              // Fusionar sin duplicados
              const merged = [...this.clientUsers];
              users.forEach(u => {
                if (!merged.some(x => String(x.id) === String(u.id))) {
                  merged.push(u);
                }
              });
              this.clientUsers = merged;
              this.rebuildUserNameMap();
                  // Si aún existen userIds sin nombre, intentar obtener individualmente
                  const stillMissing = userIds.filter(uid => !this.userNameMap.has(String(uid)));
                  if (stillMissing.length > 0) {
                    console.debug('stillMissing after getUsersByIds:', stillMissing);
                    // Hacer llamadas individuales en forkJoin
                    const calls = stillMissing.map(id => this.boxService.getUserBasicById(String(id)).pipe(catchError(() => of({ id: String(id), displayName: 'Usuario desconocido' } as UserClient))));
                    forkJoin(calls).subscribe((arr: UserClient[]) => {
                      arr.forEach(u => {
                        const idStr = String(u.id);
                        const name = u.displayName || (u.firstName ? (u.firstName + (u.lastName ? (' ' + u.lastName) : '')) : (u.username || idStr));
                        this.userNameMap.set(idStr, name);
                        if (!this.clientUsers.some(x => String(x.id) === idStr)) {
                          this.clientUsers.push({ id: idStr, username: u.username, firstName: u.firstName, lastName: u.lastName, displayName: name });
                        }
                      });
                      console.debug('userNameMap after individual fetches:', Array.from(this.userNameMap.entries()).slice(0,20));
                    }, err => { console.error('Error fetching individual users', err); });
                  }
              console.debug('clientUsers merged size:', this.clientUsers.length);
              console.debug('clientUsers sample after merge:', this.clientUsers.slice(0,10));
            },
            error: (err) => { console.error('Error fetching users by ids', err); }
          });
        }
        // Reintentar obtener clients vía endpoint general en caso la API por organization responda tarde
        if (this.clientUsers.length === 0) {
          this.boxService.getClients().subscribe({ next: (users) => { console.debug('retry getClients result:', users); if (users && users.length) this.clientUsers = users; }, error: () => {} });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  fetchInactiveAssignments() {
    this.fetchAssignments(false);
  }

  openModal(edit: boolean = false, assignment?: WaterBoxAssignment) {
    this.showModal = true;
    this.isEdit = edit;
    if (edit && assignment) {
      this.currentId = assignment.id;
      this.form.patchValue({
        ...assignment,
        startDate: assignment.startDate ? new Date(assignment.startDate).toISOString().slice(0, 10) : '',
        endDate: assignment.endDate ? new Date(assignment.endDate).toISOString().slice(0, 10) : ''
      });
    } else {
      this.currentId = null;
      this.form.reset({ status: Status.ACTIVE });
    }
    this.fetchWaterBoxIds();
    // Si estamos abriendo el modal de creación, cargar SOLO clientes activos para el dropdown de 'Usuario'
    if (!this.isEdit) {
      // Cargar solo clientes activos para el dropdown del modal y mantenerlos separados
      this.boxService.getActiveClients().subscribe({
        next: (users) => {
          console.debug('getActiveClients for modal result:', users?.length);
          this.modalClientUsers = users || [];
          this.rebuildModalUserNameMap();
        },
        error: (err) => { console.error('Error fetching active clients for modal', err); }
      });
    }
  }

  // Devuelve el texto a mostrar en el dropdown: usa el mapa del modal si está abierto en modo creación, sino el mapa general
  getDropdownDisplay(user: UserClient): string {
    const idStr = String(user.id);
    const map = (this.showModal && !this.isEdit) ? this.modalUserNameMap : this.userNameMap;
    const fallback = user.displayName || (user.firstName ? (user.firstName + (user.lastName ? (' ' + user.lastName) : '')) : (user.username || idStr));
    return map.get(idStr) || fallback;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset({ status: Status.ACTIVE });
    this.currentId = null;
  }

  viewDetails(assignment: WaterBoxAssignment) {
    this.selectedAssignment = assignment;
    this.showDetailsModal = true;
    if (this.selectedAssignment) {
      this.boxService.getWaterBoxById(this.selectedAssignment.waterBoxId).subscribe({
        next: (waterBox) => {
          this.selectedWaterBox = { ...waterBox, organizationName: 'JASS Rinconada de Cona' };
        },
        error: (err) => {
          console.error('Error fetching water box details:', err);
          this.selectedWaterBox = null;
        }
      });
    }
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedAssignment = null;
  }

  submit() {
    if (this.form.invalid) {
      this.showValidationErrors();
      return;
    }
    const value = { ...this.form.value };
    if (value.startDate) {
      value.startDate = new Date(value.startDate).toISOString();
    }
    if (value.endDate) {
      value.endDate = new Date(value.endDate).toISOString();
    }
    if (this.isEdit && this.currentId) {
      this.boxService.updateWaterBoxAssignment(this.currentId, value).subscribe(() => {
  this.fetchAssignments();
  this.closeModal();
  this.notificationService.success('¡Actualizado!', 'La asignación ha sido actualizada.');
      });
    } else {
      this.boxService.createWaterBoxAssignment(value).subscribe(() => {
  this.fetchAssignments();
  this.closeModal();
  this.notificationService.success('¡Creado!', 'La asignación ha sido creada.');
      });
    }
  }

  deleteAssignment(id: number) {
    // Open infra confirmation modal instead of SweetAlert
    this.openConfirmModal({
      title: '¿Estás seguro?',
      message: 'deseas eliminar esta asignación.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }, () => {
      this.boxService.deleteWaterBoxAssignment(id).subscribe({
        next: () => {
          this.fetchAssignments();
          this.notificationService.success('¡Eliminado!', 'La asignación ha sido eliminada.');
        },
        error: (err) => {
          this.notificationService.error('Error', err?.error?.message || 'No se pudo eliminar la asignación.');
        }
      });
    });
  }

  restoreAssignment(id: number) {
    // Use infra confirmation modal for restore
    this.openConfirmModal({
      title: '¿Estás seguro de restaurar?',
      message: 'Esta acción restaurará la asignación.',
      confirmText: 'Sí, restaurar',
      cancelText: 'Cancelar',
      type: 'info'
    }, () => {
      this.boxService.restoreWaterBoxAssignment(id).subscribe(() => {
  this.fetchAssignments();
  this.notificationService.success('¡Restaurado!', 'La asignación ha sido restaurada.');
      });
    });
  }

  // Open the infra confirmation modal with data and action
  private openConfirmModal(data: InfraConfirmationData, action: () => void) {
    this.confirmModalData = data;
    this.pendingAction = action;
    this.confirmModalOpen = true;
  }

  // Called when the modal confirm button is pressed
  onConfirmModal() {
    this.confirmModalOpen = false;
    const action = this.pendingAction;
    this.pendingAction = null;
    this.confirmModalData = { title: 'Confirmar acción', message: '', confirmText: 'Confirmar', cancelText: 'Cancelar', type: 'info' };
    if (action) action();
  }

  // Called when the modal cancel button is pressed
  onCancelModal() {
    this.confirmModalOpen = false;
    this.pendingAction = null;
    this.confirmModalData = { title: 'Confirmar acción', message: '', confirmText: 'Confirmar', cancelText: 'Cancelar', type: 'info' };
  }

  private showValidationErrors() {
    const errors: string[] = [];
    
    if (this.form.get('waterBoxId')?.invalid) {
      errors.push('• N° de suministro es requerido');
    }
    
    if (this.form.get('userId')?.invalid) {
      errors.push('• Usuario es requerido');
    }
    
    if (this.form.get('startDate')?.invalid) {
      errors.push('• Fecha de inicio es requerida');
    }
    
    if (this.form.get('monthlyFee')?.invalid) {
      errors.push('• Cuota mensual es requerida');
    }

    const errorMessage = errors.length > 0 
      ? `Complete todos los campos requeridos para continuar.`
      : 'Por favor, complete todos los campos requeridos.';

    this.notificationService.error('Error', errorMessage);
  }

  fetchWaterBoxIds() {
    this.boxService.getAllActiveWaterBoxes().subscribe({
      next: (boxes) => {
        this.waterBoxes = boxes.map(box => ({ id: box.id, boxCode: box.boxCode })).sort((a, b) => a.id - b.id);
      },
      error: (err) => {
        console.error('Error fetching active water box IDs', err);
      }
    });
  }
  getBoxCodeById(id: number): string {
    const box = this.waterBoxes.find(b => b.id === id);
    return box ? box.boxCode : id.toString();
  }

  async downloadReport(): Promise<void> {
    try {
      await generateAssignmentsPdf(this.assignments || [], {
        getBoxCodeById: (id: number) => this.getBoxCodeById(id),
        getUsernameById: (uid: string) => this.getUsernameById(uid),
        organizationName: this.organizationName || '',
        organizationLogo: (this as any).organizationLogo || undefined,
        title: 'Reporte de Asignaciones de Cajas de Agua',
        filename: `reporte-asignaciones-${new Date().toISOString().slice(0,10)}.pdf`
      });
    } catch (err) {
      console.error('Error generating PDF report', err);
      this.alertBox('Error', 'No se pudo generar el PDF. Intente nuevamente.', 'error');
    }
  }

  filterAssignmentsByStatus(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue === 'active') {
      this.assignments = this.assignments.filter(assignment => assignment.status === 'ACTIVE');
    } else if (selectedValue === 'inactive') {
      this.assignments = this.assignments.filter(assignment => assignment.status === 'INACTIVE');
    } else {
      this.assignments = [...this.assignments];
    }
  }

  // Pagination helpers
  get pagedAssignments(): WaterBoxAssignment[] {
    const start = (this.page - 1) * this.pageSize;
    return this.assignments.slice(start, start + this.pageSize);
  }

  // Devuelve una lista de páginas a mostrar (ventana centrada, máximo 5)
  getPagesAssignments(): number[] {
    const total = this.totalPagesAssignments;
    const current = this.page;
    const maxButtons = 5;
    let start = Math.max(1, current - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > total) { end = total; start = Math.max(1, end - maxButtons + 1); }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  prevPageAssignments() { if (this.page > 1) this.page--; }
  nextPageAssignments() { if (this.page < this.totalPagesAssignments) this.page++; }
  goToPageAssignments(n: number) { if (n >= 1 && n <= this.totalPagesAssignments) this.page = n; }

  // Rangos mostrados en el footer
  get rangeStartAssignments(): number { return this.totalItemsAssignments ? ((this.page - 1) * this.pageSize + 1) : 0; }
  get rangeEndAssignments(): number { return Math.min(this.page * this.pageSize, this.totalItemsAssignments); }
}
