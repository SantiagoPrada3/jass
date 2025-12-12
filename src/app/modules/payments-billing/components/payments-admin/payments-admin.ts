import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
} from '@angular/forms';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { PaymentStats, Payment, PaymentEnrichedResponse, PaymentDetail, CreatePaymentRequest } from '../../models/payment.model';
import { ExportService } from '../../services/export.service';
import { PaymentsApi } from '../../services/payments-api';
import { UsersApi } from '../../../user-management/services/users-api';
import { UserWithLocationResponse } from '../../../user-management/models/user.model';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { OrganizationApi } from '../../../organization-management/services/organization-api';
import { parametersResponse } from '../../../organization-management/models/organization.model';

@Component({
  selector: 'app-payments-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Breadcrumb],
  templateUrl: './payments-admin.html',
  styleUrl: './payments-admin.css',
})
export class PaymentsAdmin implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      label: 'Pagos',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    },
  ];

  // Estados y datos
  stats: PaymentStats = {
    totalPayments: 0,
    activePayments: 0,
    showing: 0,
  };

  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  paginatedPayments: Payment[] = [];
  currentPage: number = 1;
  pageSize: number = 4;
  totalPages: number = 0;
  selectedPaymentStatus = 'Todos los pagos';
  searchTerm = '';
  isCreateModalOpen = false;
  isDetailsModalOpen = false;
  isLoading = false;
  selectedPayment: Payment | null = null;
  currentOrganizationName: string = '';
  isEditMode = false;

  // Opciones de filtros
  paymentStatusOptions = ['Todos los pagos', 'Pagado', 'Cancelado'];
  paymentTypeOptions: ('Servicio Agua' | 'Reposición Caja' | 'Mixto')[] = ['Servicio Agua', 'Reposición Caja', 'Mixto'];
  paymentMethodOptions: ('Efectivo' | 'Yape' )[] = [
    'Efectivo',
    'Yape',
  ];

  // Formulario para crear pago
  paymentForm: FormGroup;

  // Lista de usuarios con caja de agua asignada
  usersWithWaterBox: UserWithLocationResponse[] = [];
  isLoadingUsers: boolean = false;
  selectedUser: UserWithLocationResponse | null = null;

  // Variables para el buscador de usuarios
  userSearchTerm: string = '';
  filteredUsersForSearch: UserWithLocationResponse[] = [];
  showUserDropdown: boolean = false;

  // Montos predefinidos para cada tipo de pago
  private readonly PAYMENT_AMOUNTS = {
    'Servicio Agua': 0,
    'Reposición Caja': 0, // Este valor se actualizará con el parámetro
    'Mixto': 0
  };

  // Variable para almacenar el valor del parámetro de reposición de caja
  private boxReplacementParameterValue: number | null = null;

  // Variable para almacenar el valor del parámetro de reparación de fuga o caja
  private boxRepairFugaParameterValue: number | null = null;

  // Variables para el manejo de códigos correlativos
  existingPaymentCodes: string[] = [];
  private isGeneratingCode = false;

  constructor(
    private fb: FormBuilder,
    private exportService: ExportService,
    private paymentsApi: PaymentsApi,
    private usersApi: UsersApi,
    private authService: AuthService,
    private notificationService: NotificationService,
    private organizationApi: OrganizationApi
  ) {
    this.paymentForm = this.fb.group({
      organizationId: ['', Validators.required],
      paymentCode: ['', Validators.required],
      userId: ['', Validators.required],
      waterBoxId: ['', Validators.required],
      paymentType: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      totalAmount: [0, [Validators.required, Validators.min(0)]],
      paymentDate: ['', Validators.required],
      paymentStatus: ['Pagado', Validators.required],
      externalReference: [''],
      details: this.fb.array([]),
    });

    // Suscribirse a cambios en el tipo de pago
    this.paymentForm.get('paymentType')?.valueChanges.subscribe(paymentType => {
      this.onPaymentTypeChange(paymentType);
    });
  }

  ngOnInit() {
    this.loadPayments();
    this.loadUsersWithWaterBox();
    this.loadBoxReplacementParameter(); // Cargar el parámetro de reposición de caja
    this.loadBoxRepairFugaParameter(); // Cargar el parámetro de reparación de fuga o caja
  }

  /**
   * Cargar el parámetro de reposición de caja
   */
  private loadBoxReplacementParameter() {
    this.organizationApi.getParameterByName('Reposición Caja').subscribe({
      next: (parameter: parametersResponse | null) => {
        if (parameter) {
          const value = parseFloat(parameter.parameterValue);
          if (!isNaN(value)) {
            this.boxReplacementParameterValue = value;
            console.log('Valor del parámetro de reposición de caja:', value);
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el parámetro de reposición de caja:', error);
      }
    });
  }

  /**
   * Cargar el parámetro de reparación de caja
   */
  private loadBoxRepairFugaParameter() {
    // Buscar parámetros que contengan la palabra "Reparación" o "reparación" en su descripción
    this.organizationApi.getParameters().subscribe({
      next: (parameters: parametersResponse[]) => {
        const repairParameter = parameters.find(p =>
          p.parameterDescription &&
          (p.parameterDescription.includes('Reparación') || p.parameterDescription.includes('reparación')) &&
          (p.parameterDescription.includes('fuga') || p.parameterDescription.includes('fugas') || p.parameterDescription.includes('caja'))
        );

        if (repairParameter) {
          const value = parseFloat(repairParameter.parameterValue);
          if (!isNaN(value)) {
            this.boxRepairFugaParameterValue = value;
            console.log('Valor del parámetro de reparación de caja:', value);
          }
        } else {
          console.log('No se encontró parámetro de reparación de caja');
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el parámetro de reparación de caja:', error);
      }
    });
  }

  /**
   * Cerrar dropdown de usuarios cuando se hace clic fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Si el clic no es dentro del input o del dropdown, cerrar el dropdown
    if (!target.closest('.relative')) {
      this.showUserDropdown = false;
    }
  }

  /**
   * Cargar usuarios con caja de agua asignada
   */
  loadUsersWithWaterBox() {
    const user = this.authService.getCurrentUser();
    const organizationId = user?.organizationId;

    if (!organizationId) {
      return;
    }

    this.isLoadingUsers = true;
    console.log('🔄 Cargando usuarios con caja de agua...');

    this.usersApi.getClientsWithWaterBox(organizationId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Filtrar solo usuarios activos que tienen caja de agua asignada
          this.usersWithWaterBox = response.data.filter(user => user.status === 'ACTIVE');
          console.log(`✅ ${this.usersWithWaterBox.length} usuarios ACTIVOS con caja de agua cargados`);
          console.log('Usuarios:', this.usersWithWaterBox);
        }
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('❌ Error cargando usuarios con caja de agua:', error);
        this.isLoadingUsers = false;
      }
    });
  }

  get paymentDetails(): FormArray {
    return this.paymentForm.get('details') as FormArray;
  }

  loadPayments() {
    console.log('Iniciando carga de pagos...');
    this.isLoading = true;

    this.paymentsApi.getEnrichedPayments().subscribe({
      next: (response: any) => {
        console.log('Respuesta del backend:', response);

        // Verificar si la respuesta tiene la estructura esperada del backend
        let paymentsArray: any[] = [];

        if (Array.isArray(response)) {
          // Respuesta directa es un array
          paymentsArray = response;
        } else if (response && response.status === true && Array.isArray(response.data)) {
          // Respuesta con estructura {status: true, data: [...]}
          paymentsArray = response.data;
          console.log('Datos extraídos del backend:', paymentsArray);
        }

        // Mapear los datos del backend al formato esperado por el componente
        this.payments = paymentsArray.map((payment: PaymentEnrichedResponse) => ({
          ...payment,
          // Asegurar que details esté disponible usando PaymentDtail del backend
          details: (payment.PaymentDtail || []).map((detail: PaymentDetail) => ({
            ...detail,
            // Convertir campos numéricos si vienen como string
            year: typeof detail.year === 'string' ? parseInt(detail.year) : detail.year,
            month: typeof detail.month === 'string' ? parseInt(detail.month) : detail.month,
            amount: typeof detail.amount === 'string' ? parseFloat(detail.amount) : detail.amount
          })),
          // Convertir totalAmount a number si viene como string
          totalAmount: typeof payment.totalAmount === 'string'
            ? parseFloat(payment.totalAmount)
            : payment.totalAmount,
          // Asegurar que userEmail esté disponible
          userEmail: payment.email
        }));

        console.log('Pagos procesados:', this.payments);
        console.log('Total de pagos cargados:', this.payments.length);

        this.updateStats();
        this.applyFilters();

        console.log('Pagos filtrados:', this.filteredPayments);
        console.log('Total de pagos filtrados:', this.filteredPayments.length);

        this.isLoading = false;

        // Generar el siguiente código de pago después de cargar los datos
        this.generateNextPaymentCode();
      },
      error: (error) => {
        console.error('Error al cargar pagos:', error);
        this.isLoading = false;

        console.log('Error details:', {
          status: error.status,
          message: error.message,
          url: error.url
        });

      }
    });
  }

  // Método para extraer códigos de pago existentes y generar el siguiente
  private extractExistingPaymentCodes() {
    if (!this.payments || this.payments.length === 0) {
      this.existingPaymentCodes = [];
      console.log('No hay pagos cargados aún');
      return;
    }

    this.existingPaymentCodes = this.payments
      .map(payment => payment.paymentCode)
      .filter(code => code && code.trim() !== ''); // Filtrar códigos vacíos o nulos

    console.log('Códigos existentes:', this.existingPaymentCodes);
  }

  // Método para generar el siguiente código de pago correlativo
  generateNextPaymentCode() {
    if (this.isGeneratingCode) return;

    this.isGeneratingCode = true;

    try {
      // Extraer códigos existentes de los pagos cargados
      this.extractExistingPaymentCodes();

      // Encontrar el número más alto existente
      let maxNumber = 0;

      this.existingPaymentCodes.forEach(code => {
        // Buscar códigos que sigan el patrón PAGXXXX
        const match = code.match(/^PAG(\d{4})$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      // Generar el siguiente número
      const nextNumber = maxNumber + 1;
      const nextCode = `PAG${nextNumber.toString().padStart(4, '0')}`;

      // Verificar que no exista (doble verificación)
      if (this.existingPaymentCodes.includes(nextCode)) {
        console.warn(`Código ${nextCode} ya existe, generando siguiente...`);
        // Si por alguna razón ya existe, buscar el siguiente disponible
        this.generateNextAvailableCode(nextNumber + 1);
      } else {
        // Establecer el código en el formulario
        this.paymentForm.patchValue({
          paymentCode: nextCode
        });

        console.log(`Código generado: ${nextCode}`);
      }
    } catch (error) {
      console.error('Error al generar código de pago:', error);
      // En caso de error, generar un código por defecto
      this.paymentForm.patchValue({
        paymentCode: 'PAG0001'
      });
    }

    this.isGeneratingCode = false;
  }

  // Método auxiliar para generar el siguiente código disponible
  private generateNextAvailableCode(startNumber: number) {
    let currentNumber = startNumber;
    let code = `PAG${currentNumber.toString().padStart(4, '0')}`;

    // Buscar hasta encontrar un código disponible
    while (this.existingPaymentCodes.includes(code) && currentNumber < 9999) {
      currentNumber++;
      code = `PAG${currentNumber.toString().padStart(4, '0')}`;
    }

    if (currentNumber >= 9999) {
      alert('Error: Se ha alcanzado el límite máximo de códigos de pago (PAG9999)');
      return;
    }

    // Establecer el código en el formulario
    this.paymentForm.patchValue({
      paymentCode: code
    });

    console.log(`Código disponible generado: ${code}`);
  }

  // Método para validar que un código no esté duplicado
  validatePaymentCode(code: string): boolean {
    if (!code) return false;

    // Verificar formato
    const formatRegex = /^PAG\d{4}$/;
    if (!formatRegex.test(code)) {
      alert('Error: El código debe tener el formato PAGXXXX (ejemplo: PAG0001)');
      return false;
    }

    // Verificar duplicados
    if (this.existingPaymentCodes.includes(code)) {
      alert(`Error: El código ${code} ya existe. Por favor, use un código diferente.`);
      return false;
    }

    return true;
  }

  // Método para manejar cambios manuales en el código de pago
  onPaymentCodeChange() {
    const currentCode = this.paymentForm.get('paymentCode')?.value;
    if (currentCode && currentCode.length >= 8) { // PAGXXXX tiene 8 caracteres
      this.validatePaymentCode(currentCode);
    }
  }

  // Getter para obtener el código actual del formulario
  get currentPaymentCode(): string {
    return this.paymentForm.get('paymentCode')?.value || '';
  }

  // Método para obtener estadísticas de códigos
  getPaymentCodeStats(): { total: number, lastCode: string, nextCode: string } {
    try {
      if (!this.existingPaymentCodes || this.existingPaymentCodes.length === 0) {
        return {
          total: 0,
          lastCode: 'Ninguno',
          nextCode: 'PAG0001'
        };
      }

      const pagCodes = this.existingPaymentCodes.filter(code => code && code.startsWith('PAG'));
      let maxNumber = 0;
      let lastCode = 'Ninguno';

      pagCodes.forEach(code => {
        const match = code.match(/^PAG(\d{4})$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
            lastCode = code;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      const nextCode = `PAG${nextNumber.toString().padStart(4, '0')}`;

      return {
        total: pagCodes.length,
        lastCode: lastCode,
        nextCode: nextCode
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de códigos:', error);
      return {
        total: 0,
        lastCode: 'Error',
        nextCode: 'PAG0001'
      };
    }
  }

  updateStats() {
    this.stats.totalPayments = this.payments.reduce((sum, p) => sum + p.totalAmount, 0);
    this.stats.activePayments = this.payments.filter((p) => p.paymentStatus === 'Pagado').length;
    this.stats.showing = this.filteredPayments.length;
  }

  applyFilters() {
    this.filteredPayments = this.payments.filter((payment) => {
      const matchesStatus =
        this.selectedPaymentStatus === 'Todos los pagos' ||
        payment.paymentStatus === this.selectedPaymentStatus;
      const matchesSearch =
        (payment.userName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        payment.paymentCode.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (payment.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        (payment.userDocument?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        (payment.organizationName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false);

      return matchesStatus && matchesSearch;
    });

    // Ordenar por código de forma descendente (de mayor a menor)
    this.filteredPayments.sort((a, b) => b.paymentCode.localeCompare(a.paymentCode));

    // Actualizar estadísticas y paginación
    this.stats.showing = this.filteredPayments.length;
    this.updatePagination();
  }

  /**
   * Actualizar la paginación
   */
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredPayments.length / this.pageSize);
    this.currentPage = 1; // Resetear a la primera página cuando se aplican filtros
    this.updatePaginatedPayments();
  }

  /**
   * Actualizar los pagos paginados
   */
  updatePaginatedPayments() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPayments = this.filteredPayments.slice(startIndex, endIndex);
  }

  /**
   * Ir a una página específica
   */
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPayments();
    }
  }

  /**
   * Ir a la página anterior
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Ir a la página siguiente
   */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  onStatusFilterChange() {
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  openCreateModal() {
    this.isCreateModalOpen = true;
    this.resetForm();
    // Generar nuevo código correlativo al abrir el modal
    this.generateNextPaymentCode();
    // Auto-asignar organizationId y obtener el nombre de la organización
    const user = this.authService.getCurrentUser();
    const organizationId = user?.organizationId;
    if (organizationId) {
      this.paymentForm.patchValue({ organizationId });
      // Obtener el nombre de la organización desde el primer usuario con caja de agua
      if (this.usersWithWaterBox && this.usersWithWaterBox.length > 0) {
        const firstUser = this.usersWithWaterBox[0];
        if (firstUser.organization?.organizationName) {
          this.currentOrganizationName = firstUser.organization.organizationName;
        }
      }
    }
  }

  /**
   * Manejar selección de usuario y auto-completar datos
   */
  onUserSelect(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const userId = selectElement.value;

    if (!userId) {
      this.selectedUser = null;
      this.paymentForm.patchValue({ waterBoxId: '' });
      return;
    }

    // Encontrar el usuario seleccionado
    this.selectedUser = this.usersWithWaterBox.find(u => u.id === userId) || null;

    if (this.selectedUser && this.selectedUser.waterBoxAssignment) {
      // Auto-completar waterBoxId y monthlyFee
      this.paymentForm.patchValue({
        waterBoxId: this.selectedUser.waterBoxAssignment.waterBoxId?.toString() || ''
      });

      console.log('✅ Usuario seleccionado:', {
        nombre: `${this.selectedUser.firstName} ${this.selectedUser.lastName}`,
        userCode: this.selectedUser.userCode,
        boxCode: this.selectedUser.waterBoxAssignment.boxCode,
        monthlyFee: this.selectedUser.waterBoxAssignment.monthlyFee
      });
    }
  }

  /**
   * Filtrar usuarios mientras se escribe en el buscador
   */
  onUserSearchChange() {
    const searchTerm = this.userSearchTerm.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredUsersForSearch = [];
      this.showUserDropdown = false;
      return;
    }

    // Filtrar usuarios por código, nombre, apellido o DNI
    this.filteredUsersForSearch = this.usersWithWaterBox.filter(user => {
      const userCode = user.userCode?.toLowerCase() || '';
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const documentNumber = user.documentNumber?.toLowerCase() || '';
      const boxCode = user.waterBoxAssignment?.boxCode?.toLowerCase() || '';

      return userCode.includes(searchTerm) ||
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        documentNumber.includes(searchTerm) ||
        boxCode.includes(searchTerm);
    });

    this.showUserDropdown = this.filteredUsersForSearch.length > 0;
    console.log(`🔍 Búsqueda: "${searchTerm}" - ${this.filteredUsersForSearch.length} resultados`);
  }

  /**
   * Seleccionar un usuario desde los resultados de búsqueda
   */
  selectUserFromSearch(user: UserWithLocationResponse) {
    console.log('Usuario seleccionado:', user);
    this.selectedUser = user;
    this.userSearchTerm = `${user.userCode} - ${user.firstName} ${user.lastName}`;
    this.showUserDropdown = false;

    // Diagnóstico para verificar que el usuario y su organización se cargan correctamente
    console.log('selectedUser.organization:', user.organization);
    console.log('selectedUser.organization.organizationName:', user.organization?.organizationName);

    // Verificación adicional para asegurarnos de que todos los datos están presentes
    if (user.organization) {
      console.log('organizationId:', user.organization.organizationId);
      console.log('organizationName:', user.organization.organizationName);
    } else {
      console.log('No se encontró información de organización para el usuario');
    }

    // Actualizar el formulario con los datos del usuario seleccionado
    this.paymentForm.patchValue({
      userId: user.id,
      waterBoxId: user.waterBoxAssignment?.waterBoxId || '',
      organizationId: user.organization?.organizationId || '', // ID de la organización
      // organizationName se mostrará en el input readonly pero no se guardará en el formulario
    });

    // Limpiar detalles existentes cuando se selecciona un nuevo usuario
    while (this.paymentDetails.length > 0) {
      this.paymentDetails.removeAt(0);
    }
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.paymentForm.reset({
      paymentStatus: 'Pagado', // Estado por defecto: Pagado (pago inmediato)
    });
    this.paymentDetails.clear();

    // Resetear variables del buscador
    this.selectedUser = null;
    this.userSearchTerm = '';
    this.filteredUsersForSearch = [];
    this.showUserDropdown = false;
  }

  addPaymentDetail() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Calcular fechas automáticamente
    const { periodStart, periodEnd } = this.calculatePeriodDates(currentYear, currentMonth);

    const detailGroup = this.fb.group({
      concept: ['', Validators.required],
      year: [currentYear, Validators.required],
      month: [currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      periodStart: [periodStart, Validators.required],
      periodEnd: [periodEnd, Validators.required],
    });

    // Suscribirse a cambios en el monto
    this.subscribeToDetailAmountChanges(detailGroup);

    // Suscribirse a cambios en año y mes para actualizar fechas automáticamente
    this.subscribeToDateChanges(detailGroup);

    this.paymentDetails.push(detailGroup);
  }

  removePaymentDetail(index: number) {
    this.paymentDetails.removeAt(index);
    // Recalcular el monto total después de eliminar un detalle
    this.recalculateTotalAmount();
  }

  onPaymentTypeChange(paymentType: 'Servicio Agua' | 'Reposición Caja' | 'Mixto') {
    if (!paymentType) return;

    // Limpiar detalles existentes
    this.paymentDetails.clear();

    // Configurar según el tipo de pago seleccionado
    switch (paymentType) {
      case 'Servicio Agua':
        this.setServiceWaterPayment();
        break;
      case 'Reposición Caja':
        // Ya no se necesita una función específica, se usa el valor del parámetro en setBoxReplacementPayment
        this.setBoxReplacementPayment();
        break;
      case 'Mixto':
        this.setMixedPayment();
        break;
    }
  }

  private setServiceWaterPayment() {
    // Establecer monto total basado en la tarifa del usuario seleccionado
    const userMonthlyFee = this.selectedUser?.waterBoxAssignment?.monthlyFee || this.PAYMENT_AMOUNTS['Servicio Agua'];
    this.paymentForm.patchValue({
      totalAmount: userMonthlyFee
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Calcular fechas automáticamente
    const { periodStart, periodEnd } = this.calculatePeriodDates(currentYear, currentMonth);

    // Agregar detalle de servicio de agua
    const detailGroup = this.fb.group({
      concept: ['Servicio de Agua', Validators.required],
      year: [currentYear, Validators.required],
      month: [currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [userMonthlyFee, [Validators.required, Validators.min(0)]],
      description: [''],
      periodStart: [periodStart, Validators.required],
      periodEnd: [periodEnd, Validators.required],
    });

    // Suscribirse a cambios en el monto
    this.subscribeToDetailAmountChanges(detailGroup);

    // Suscribirse a cambios en año y mes para actualizar fechas automáticamente
    this.subscribeToDateChanges(detailGroup);

    this.paymentDetails.push(detailGroup);
  }

  private setBoxReplacementPayment() {
    // Usar el valor del parámetro de reparación si está disponible, de lo contrario usar el valor predeterminado
    const boxReplacementAmount = this.boxRepairFugaParameterValue !== null
      ? this.boxRepairFugaParameterValue
      : this.PAYMENT_AMOUNTS['Reposición Caja'];

    // Establecer monto total
    this.paymentForm.patchValue({
      totalAmount: boxReplacementAmount
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Calcular fechas automáticamente
    const { periodStart, periodEnd } = this.calculatePeriodDates(currentYear, currentMonth);

    // Agregar detalle de reposición de caja
    const detailGroup = this.fb.group({
      concept: ['Reposición de Caja', Validators.required],
      year: [currentYear, Validators.required],
      month: [currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [boxReplacementAmount, [Validators.required, Validators.min(0)]],
      description: [''],
      periodStart: [periodStart, Validators.required],
      periodEnd: [periodEnd, Validators.required],
      hidePeriodEnd: true // Marcar para ocultar el campo de fin de período
    });

    // Suscribirse a cambios en el monto
    this.subscribeToDetailAmountChanges(detailGroup);

    // Suscribirse a cambios en año y mes para actualizar fechas automáticamente
    this.subscribeToDateChanges(detailGroup);

    this.paymentDetails.push(detailGroup);
  }

  private setMixedPayment() {
    // Calcular el monto mixto basado en el servicio de agua del usuario y el valor del parámetro de reparación
    const serviceWaterAmount = this.selectedUser?.waterBoxAssignment?.monthlyFee || this.PAYMENT_AMOUNTS['Servicio Agua'];
    const boxReplacementAmount = this.boxRepairFugaParameterValue !== null
      ? this.boxRepairFugaParameterValue
      : this.PAYMENT_AMOUNTS['Reposición Caja'];
    const mixedAmount = serviceWaterAmount + boxReplacementAmount;

    // Establecer monto total (suma de ambos servicios)
    this.paymentForm.patchValue({
      totalAmount: mixedAmount
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Calcular fechas automáticamente
    const { periodStart, periodEnd } = this.calculatePeriodDates(currentYear, currentMonth);

    // Agregar detalle de servicio de agua
    const waterDetail = this.fb.group({
      concept: ['Servicio de Agua', Validators.required],
      year: [currentYear, Validators.required],
      month: [currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [serviceWaterAmount, [Validators.required, Validators.min(0)]],
      description: [''],
      periodStart: [periodStart, Validators.required],
      periodEnd: [periodEnd, Validators.required],
      isMixedDetail: true // Marcar como detalle de pago mixto
    });

    // Agregar detalle de reposición de caja
    const boxDetail = this.fb.group({
      concept: ['Reposición de Caja', Validators.required],
      year: [currentYear, Validators.required],
      month: [currentMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [boxReplacementAmount, [Validators.required, Validators.min(0)]],
      description: [''],
      periodStart: [periodStart, Validators.required],
      isMixedDetail: true // Marcar como detalle de pago mixto
    });

    // Suscribirse a cambios en los montos
    this.subscribeToDetailAmountChanges(waterDetail);
    this.subscribeToDetailAmountChanges(boxDetail);

    // Suscribirse a cambios en año y mes para actualizar fechas automáticamente
    this.subscribeToDateChanges(waterDetail);
    this.subscribeToDateChanges(boxDetail);

    // Agregar ambos detalles
    this.paymentDetails.push(waterDetail);
    this.paymentDetails.push(boxDetail);
  }

  // Método para recalcular el monto total basado en los detalles
  recalculateTotalAmount() {
    const totalAmount = this.paymentDetails.controls.reduce((sum, control) => {
      const amount = control.get('amount')?.value || 0;
      return sum + parseFloat(amount);
    }, 0);

    this.paymentForm.patchValue({
      totalAmount: totalAmount
    });
  }

  // Método para suscribirse a cambios en los montos de los detalles
  private subscribeToDetailAmountChanges(detailGroup: any) {
    detailGroup.get('amount')?.valueChanges.subscribe(() => {
      this.recalculateTotalAmount();
    });
  }

  // Método para calcular las fechas de período automáticamente
  private calculatePeriodDates(year: number, month: number): { periodStart: string, periodEnd: string } {
    // Fecha de inicio: primer día del mes
    const startDate = new Date(year, month - 1, 1);

    // Fecha de fin: primer día del mes siguiente
    const endDate = new Date(year, month, 1);

    // Formatear las fechas en formato YYYY-MM-DD para los inputs de tipo date
    const periodStart = startDate.toISOString().split('T')[0];
    const periodEnd = endDate.toISOString().split('T')[0];

    return { periodStart, periodEnd };
  }

  // Método para suscribirse a cambios en año y mes para actualizar fechas automáticamente
  private subscribeToDateChanges(detailGroup: any) {
    // Suscribirse a cambios en el año
    detailGroup.get('year')?.valueChanges.subscribe(() => {
      this.updatePeriodDates(detailGroup);
    });

    // Suscribirse a cambios en el mes
    detailGroup.get('month')?.valueChanges.subscribe(() => {
      this.updatePeriodDates(detailGroup);
    });
  }

  // Método para actualizar las fechas de período cuando cambian año o mes
  private updatePeriodDates(detailGroup: any) {
    const year = detailGroup.get('year')?.value;
    const month = detailGroup.get('month')?.value;

    if (year && month) {
      const { periodStart, periodEnd } = this.calculatePeriodDates(year, month);

      detailGroup.patchValue({
        periodStart: periodStart,
        periodEnd: periodEnd
      });
    }
  }

  // Método para obtener el tipo de pago seleccionado
  get selectedPaymentType(): string {
    return this.paymentForm.get('paymentType')?.value || '';
  }

  // Método para verificar si es pago mixto
  get isMixedPayment(): boolean {
    return this.selectedPaymentType === 'Mixto';
  }

  // Método para obtener el desglose del monto total
  getTotalAmountBreakdown(): string {
    const paymentType = this.selectedPaymentType;
    switch (paymentType) {
      case 'Servicio_Agua':
        if (this.selectedUser?.waterBoxAssignment?.monthlyFee) {
          return `Tarifa mensual: S/. ${this.selectedUser.waterBoxAssignment.monthlyFee.toFixed(2)}`;
        }
        return '';
      case 'Reposición Caja':
        if (this.boxRepairFugaParameterValue !== null) {
          return `Monto por reparación: S/. ${this.boxRepairFugaParameterValue.toFixed(2)}`;
        }
        return '';
      case 'Mixto':
        const serviceWaterAmount = this.selectedUser?.waterBoxAssignment?.monthlyFee || this.PAYMENT_AMOUNTS['Servicio Agua'];
        const boxReplacementAmount = this.boxRepairFugaParameterValue !== null
          ? this.boxRepairFugaParameterValue
          : this.PAYMENT_AMOUNTS['Reposición Caja'];
        return `Servicio de Agua: S/. ${serviceWaterAmount.toFixed(2)} + Reposición de Caja: S/. ${boxReplacementAmount.toFixed(2)}`;
      default:
        return '';
    }
  }

  // Método para validar que el monto total coincida con el tipo de pago
  validateTotalAmount(): boolean {
    const paymentType = this.selectedPaymentType as keyof typeof this.PAYMENT_AMOUNTS;
    const currentTotal = this.paymentForm.get('totalAmount')?.value || 0;

    if (!paymentType || !this.PAYMENT_AMOUNTS[paymentType]) {
      return true; // Si no hay tipo seleccionado, no validamos
    }

    const expectedAmount = this.PAYMENT_AMOUNTS[paymentType];
    return Math.abs(currentTotal - expectedAmount) < 0.01; // Tolerancia de 1 centavo
  }

  // Método para obtener el nombre del mes en español
  getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || 'Mes inválido';
  }

  // Método para formatear el período de manera legible
  formatPeriodDescription(year: number, month: number): string {
    const monthName = this.getMonthName(month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Último día del mes

    return `${monthName} ${year} (${startDate.getDate()}/${startDate.getMonth() + 1}/${year} - ${endDate.getDate()}/${endDate.getMonth() + 1}/${year})`;
  }

  onSubmit() {
    if (this.paymentForm.valid) {
      const formValue = this.paymentForm.value;

      // Validar que el código de pago no esté duplicado
      if (!this.validatePaymentCode(formValue.paymentCode)) {
        return; // Detener el envío si el código no es válido
      }

      // Mapear los datos del formulario al formato esperado por el backend
      const paymentRequest: CreatePaymentRequest = {
        organizationId: formValue.organizationId,
        paymentCode: formValue.paymentCode,
        userId: formValue.userId,
        waterBoxId: formValue.waterBoxId,
        paymentType: formValue.paymentType,
        paymentMethod: formValue.paymentMethod,
        totalAmount: formValue.totalAmount.toString(),
        paymentDate: formValue.paymentDate,
        paymentStatus: formValue.paymentStatus,
        externalReference: formValue.externalReference || '',
        PaymentDetail: formValue.details.map((detail: any) => ({
          concept: detail.concept,
          year: detail.year.toString(),
          month: detail.month.toString(),
          amount: detail.amount.toString(),
          description: detail.description || '',
          periodStart: detail.periodStart,
          periodEnd: detail.periodEnd
        }))
      };

      this.paymentsApi.createPayment(paymentRequest).subscribe({
        next: (response) => {
          console.log('Pago creado exitosamente:', response);
          this.closeCreateModal();
          this.loadPayments(); // Recargar la lista
          this.notificationService.success('Pago creado', 'El pago se ha registrado exitosamente en el sistema.');
        },
        error: (error) => {
          console.error('Error al crear pago:', error);
          this.notificationService.error('Error al crear pago', 'Ocurrió un error al registrar el pago. Por favor, inténtelo nuevamente.');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pagado':
        return 'bg-green-100 text-green-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Métodos para el modal de detalles
  openDetailsModal(payment: Payment) {
    this.selectedPayment = payment;
    this.isDetailsModalOpen = true;
    this.isEditMode = false;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedPayment = null;
    this.isEditMode = false;
  }

  enableEditMode() {
    this.isEditMode = true;
    if (this.selectedPayment) {
      // Llenar el formulario con los datos del pago seleccionado
      this.paymentForm.patchValue({
        organizationId: this.selectedPayment.organizationId,
        paymentCode: this.selectedPayment.paymentCode,
        userId: this.selectedPayment.userId,
        waterBoxId: this.selectedPayment.waterBoxId,
        paymentType: this.selectedPayment.paymentType,
        paymentMethod: this.selectedPayment.paymentMethod,
        totalAmount: this.selectedPayment.totalAmount,
        paymentDate: this.selectedPayment.paymentDate,
        paymentStatus: this.selectedPayment.paymentStatus,
        externalReference: this.selectedPayment.externalReference || '',
      });
    }
  }

  cancelEdit() {
    this.isEditMode = false;
  }

  savePayment() {
    if (this.paymentForm.valid && this.selectedPayment) {
      const formValue = this.paymentForm.value;

      // Mapear los datos del formulario al formato esperado por el backend
      const paymentUpdate: Partial<CreatePaymentRequest> = {
        organizationId: formValue.organizationId,
        paymentCode: formValue.paymentCode,
        userId: formValue.userId,
        waterBoxId: formValue.waterBoxId,
        paymentType: formValue.paymentType,
        paymentMethod: formValue.paymentMethod,
        totalAmount: formValue.totalAmount.toString(),
        paymentDate: formValue.paymentDate,
        paymentStatus: formValue.paymentStatus,
        externalReference: formValue.externalReference || ''
      };

      this.paymentsApi.updatePayment(this.selectedPayment.paymentId, paymentUpdate).subscribe({
        next: (response) => {
          console.log('Pago actualizado exitosamente:', response);
          this.isEditMode = false;
          this.loadPayments(); // Recargar la lista
          this.notificationService.success('Pago actualizado', 'El pago se ha actualizado exitosamente en el sistema.');
        },
        error: (error) => {
          console.error('Error al actualizar pago:', error);
          this.notificationService.error('Error al actualizar pago', 'Ocurrió un error al actualizar el pago. Por favor, inténtelo nuevamente.');
        }
      });
    }
  }

  /**
   * Refrescar la lista de pagos
   */
  refreshPayments() {
    this.loadPayments();
  }

  // Métodos de exportación
  async exportToPDF() {
    for (const payment of this.filteredPayments) {
      await this.exportService.generatePaymentPDF(payment);
      // Pequeña pausa entre generaciones para evitar sobrecargar el navegador
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  exportToExcel() {
    this.exportService.exportToExcel(this.filteredPayments);
  }

  exportToCSV() {
    this.exportService.exportToCSV(this.filteredPayments);
  }

  // Descargar PDF individual de un pago
  async downloadPaymentPDF(payment: Payment) {
    await this.exportService.generatePaymentPDF(payment);
  }

  // Calcular monto con recargo para mostrar en la interfaz
  calculateDisplayAmount(payment: Payment): number {
    // No aplicar recargo si el tipo de pago es Reposición Caja o Reposición Caja
    if (payment.paymentType === 'Reposición Caja' || payment.paymentType === 'Reposición Caja') {
      return payment.totalAmount;
    }

    // Para otros tipos de pago, aplicar el recargo si es necesario
    return this.exportService.calculateAmountWithSurcharge(payment);
  }

  // Verificar si un pago tiene recargo
  hasLatePaymentSurcharge(payment: Payment): boolean {
    const paymentYear = new Date(payment.paymentDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return paymentYear < currentYear;
  }

  // Calcular monto de detalle con recargo
  calculateDetailAmountWithSurcharge(detail: PaymentDetail, paymentDate: string): number {
    return this.exportService.calculateDetailAmountWithSurcharge(detail, paymentDate);
  }

  // Formatear fecha de manera robusta
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'No disponible';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';

      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Error en fecha';
    }
  }

  // Método para obtener solo el primer detalle cuando es un pago mixto
  getFirstDetailForMixedPayment(details: any[]): any[] {
    // Si hay detalles marcados como isMixedDetail, devolver solo el primero
    const mixedDetails = details.filter(detail => detail && detail.isMixedDetail);
    if (mixedDetails.length > 0) {
      // Devolver solo el primer detalle para mostrar en la tabla principal
      return [mixedDetails[0]];
    }
    // Si no hay detalles mixtos, devolver el primer detalle si existe
    return details && details.length > 0 ? [details[0]] : [];
  }

  // Método para verificar si un pago tiene detalles mixtos
  hasMixedPaymentDetails(details: any[]): boolean {
    return details && details.some(detail => detail && detail.isMixedDetail);
  }

  // Método Math.min para usar en el template
  Math = Math;

}
