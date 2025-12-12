import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IncidentsService } from '../../services/incidents.service';
import { IncidentTypesService } from '../../services/incident-types.service';
import { IncidentResolutionsService } from '../../services/incident-resolutions.service';
import { IncidentReportService } from '../../services/incident-report.service';
import { Incident, CreateIncidentRequest, UpdateIncidentRequest, MaterialUsed } from '../../models/incident.model';
import { IncidentType } from '../../models/incident-type.model';
import { IncidentResolution, CreateIncidentResolutionRequest } from '../../models/incident-resolution.model';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { AuthService } from '../../../../core/auth/services/auth';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Breadcrumb],
  templateUrl: './incidents.component.html',
  styleUrls: ['./incidents.component.css']
})
export class IncidentsComponent implements OnInit {
  private readonly incidentsService = inject(IncidentsService);
  private readonly incidentTypesService = inject(IncidentTypesService);
  private readonly resolutionsService = inject(IncidentResolutionsService);
  private readonly reportService = inject(IncidentReportService);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  // Referencias para el template
  Math = Math;

  // Signals para el estado del componente
  incidents = signal<Incident[]>([]);
  incidentTypes = signal<IncidentType[]>([]);
  users = signal<any[]>([]);
  operators = signal<any[]>([]); // Operadores para asignación y resolución
  filteredIncidents = signal<Incident[]>([]);
  isLoading = signal(true);
  showModal = signal(false);
  selectedFilter = signal<'all' | 'active' | 'inactive'>('all');
  searchTerm = signal('');
  isDropdownOpen = signal(false);
  
  // Mapa de resoluciones por incidentId para acceso rápido
  resolutionsMap = signal<Map<string, any>>(new Map());
  
  // Productos del inventario para materiales usados
  products = signal<any[]>([]);
  
  // Tipo de cambio USD a PEN (Soles)
  exchangeRate = signal<number>(3.75); // Tipo de cambio aproximado USD a PEN
  
  // Total calculado en soles
  totalInSoles = signal<number>(0);

  // Advertencias de stock por material (índice del FormArray)
  stockWarnings = signal<Map<number, string>>(new Map());

  // Notificaciones
  showNotification = signal<boolean>(false);
  notificationMessage = signal<string>('');
  notificationTitle = signal<string>('');
  notificationType = signal<'success' | 'error' | 'info'>('success');

  // Nombre de la organización
  organizationName = signal<string>('');

  incidentForm!: FormGroup;
  resolutionForm!: FormGroup;
  generatedCode = signal<string>('');
  
  // Propiedades para el modo de edición
  editingIncident = signal<Incident | null>(null);
  isEditMode = signal<boolean>(false);
  
  // Guardar materiales originales para calcular diferencias en edición
  private originalMaterials: any[] = [];

  // Modal de resolución
  showResolutionModal = signal<boolean>(false);
  currentResolution = signal<IncidentResolution | null>(null);

  // Modal de confirmación de eliminación
  showDeleteModal = signal<boolean>(false);
  incidentToDelete: Incident | null = null;

  // Modal de confirmación de restauración
  showRestoreModal = signal<boolean>(false);
  incidentToRestore: Incident | null = null;

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Reclamos e Incidentes',
      icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Incidencias',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  ];

  ngOnInit() {
    this.initializeForm();
    this.initializeResolutionForm();
    this.setupResolutionValidations(); // Configurar validaciones dinámicas
    this.loadIncidents(); // Cargar incidencias al iniciar
    this.loadIncidentTypes();
    this.loadUsers();
    this.loadOperators(); // Cargar operadores al inicio
    this.loadProducts(); // Cargar productos del inventario
    this.loadOrganizationInfo(); // Cargar información de la organización
  }

  async loadIncidents() {
    try {
      this.isLoading.set(true);
      this.incidentsService.getAllIncidents().subscribe({
        next: (incidents) => {
          // Validar que sea un array
          const incidentsArray = Array.isArray(incidents) ? incidents : [];
          this.incidents.set(incidentsArray);
          this.applyFilters();
          
          // Cargar las resoluciones para las incidencias resueltas
          this.loadResolutionsForIncidents(incidentsArray);
          
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error cargando incidencias:', error);
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Error cargando incidencias:', error);
      this.isLoading.set(false);
    }
  }

  private loadOrganizationInfo() {
    // Obtenemos la organización del usuario logueado
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.organizationId) {
      this.incidentsService.getOrganizationDetails(currentUser.organizationId).subscribe({
        next: (response) => {
          // La respuesta puede ser directamente la organización o estar en data
          if (response) {
            const organization = response.data || response;
            if (organization && organization.organizationName) {
              this.organizationName.set(organization.organizationName);
            }
          }
        },
        error: (error) => {
          console.error('Error cargando información de la organización:', error);
        }
      });
    }
  }

  private initializeForm() {
    this.incidentForm = this.fb.group({
      // Código generado automáticamente (incluido en el request)
      incidentCode: ['', [Validators.required]],
      
      // Campos básicos de la incidencia
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      incidentTypeId: ['', [Validators.required]],
      incidentCategory: ['INFRASTRUCTURE', [Validators.required]],
      zoneId: ['', [Validators.required]],
      severity: ['MEDIUM', [Validators.required]],
      affectedBoxesCount: [0, [Validators.required, Validators.min(0)]],
      
      // Campos de usuarios
      reportedByUserId: ['', [Validators.required]],
      assignedToUserId: [''],
      
      // Campos requeridos adicionales
      organizationId: ['', [Validators.required]],
      incidentDate: ['', [Validators.required]],
      status: ['REPORTED', [Validators.required]],
      resolved: [false, [Validators.required]],
      
      // Campos de resolución
      resolutionDate: [''],
      resolutionType: ['REPARACION_COMPLETA'],
      actionsTaken: [''],
      materialsUsed: this.fb.array([]),
      laborHours: [0, [Validators.min(0)]],
      totalCost: [0, [Validators.min(0)]],
      resolvedByUserId: [''],
      qualityCheck: [false],
      followUpRequired: [false],
      resolutionNotes: ['']
    });
  }

  private initializeResolutionForm() {
    this.resolutionForm = this.fb.group({
      resolutionDate: ['', [Validators.required]],
      resolutionType: ['REPARACION_COMPLETA', [Validators.required]],
      actionsTaken: ['', [Validators.required, Validators.minLength(10)]],
      materialsUsed: this.fb.array([]),
      laborHours: [0, [Validators.required, Validators.min(0)]],
      totalCost: [0, [Validators.required, Validators.min(0)]],
      resolvedByUserId: ['', [Validators.required]],
      qualityCheck: [false, [Validators.required]],
      followUpRequired: [false, [Validators.required]],
      resolutionNotes: ['']
    });
  }

  get materialsUsedArray(): FormArray {
    return this.incidentForm.get('materialsUsed') as FormArray;
  }

  addMaterial() {
    const materialGroup = this.fb.group({
      productId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['unidades', [Validators.required]],
      unitCost: [0, [Validators.required, Validators.min(0)]]
    });
    
    const currentIndex = this.materialsUsedArray.length;
    
    // Suscribirse a cambios en productId para autocompletar unitCost
    materialGroup.get('productId')?.valueChanges.subscribe(productId => {
      console.log('🔍 ProductId seleccionado:', productId);
      console.log('📦 Productos disponibles:', this.products());
      if (productId) {
        const product = this.products().find(p => p.productId === productId);
        console.log('🎯 Producto encontrado:', product);
        if (product) {
          console.log(`💰 Costo unitario del producto: ${product.unitCost}`);
          console.log(`📏 Unidad de medida: ${product.unitOfMeasure}`);
          
          // Actualizar los valores directamente
          materialGroup.get('unitCost')?.setValue(product.unitCost);
          materialGroup.get('unit')?.setValue(product.unitOfMeasure || 'unidades');
          
          console.log(`✅ Valores actualizados - Costo: ${materialGroup.get('unitCost')?.value}, Unidad: ${materialGroup.get('unit')?.value}`);
          console.log(`✅ Producto seleccionado: ${product.productName} - Costo: ${product.unitCost}`);
          
          // Recalcular total después de cambiar el producto
          this.calculateTotalCost();
          
          // Verificar stock cuando se selecciona un producto
          this.checkStockAvailability(currentIndex);
        } else {
          console.error('❌ No se encontró el producto con ID:', productId);
        }
      }
    });
    
    // Recalcular total cuando cambia la cantidad o costo unitario
    materialGroup.get('quantity')?.valueChanges.subscribe(() => {
      this.calculateTotalCost();
      // Verificar stock cuando cambia la cantidad
      this.checkStockAvailability(currentIndex);
    });
    materialGroup.get('unitCost')?.valueChanges.subscribe(() => this.calculateTotalCost());
    
    this.materialsUsedArray.push(materialGroup);
    this.calculateTotalCost();
  }

  removeMaterial(index: number) {
    this.materialsUsedArray.removeAt(index);
    // Limpiar advertencia de stock para este índice
    const warnings = new Map(this.stockWarnings());
    warnings.delete(index);
    this.stockWarnings.set(warnings);
    this.calculateTotalCost();
  }

  /**
   * Verifica si la cantidad seleccionada excede el stock disponible
   */
  checkStockAvailability(index: number): void {
    const materialGroup = this.materialsUsedArray.at(index) as FormGroup;
    const productId = materialGroup.get('productId')?.value;
    const quantity = materialGroup.get('quantity')?.value || 0;

    if (!productId || quantity <= 0) {
      // Limpiar advertencia si no hay producto o cantidad
      const warnings = new Map(this.stockWarnings());
      warnings.delete(index);
      this.stockWarnings.set(warnings);
      return;
    }

    // Buscar el producto en el array de productos
    const product = this.products().find(p => p.productId === productId);
    
    if (product && product.currentStock !== undefined) {
      const availableStock = product.currentStock || 0;
      const warnings = new Map(this.stockWarnings());

      if (quantity > availableStock) {
        warnings.set(index, `Stock insuficiente: solicitado ${quantity}, disponible ${availableStock}`);
      } else {
        warnings.delete(index);
      }
      
      this.stockWarnings.set(warnings);
    }
  }

  /**
   * Obtiene el mensaje de advertencia de stock para un material específico
   */
  getStockWarning(index: number): string | undefined {
    return this.stockWarnings().get(index);
  }

  /**
   * Obtiene el stock disponible de un producto en un material específico
   */
  getProductStock(index: number): number | null {
    const materialGroup = this.materialsUsedArray.at(index) as FormGroup;
    const productId = materialGroup?.get('productId')?.value;
    
    if (!productId) {
      return null;
    }
    
    const product = this.products().find(p => p.productId === productId);
    return product ? (product.currentStock || 0) : null;
  }

  /**
   * Actualiza el stock de los productos utilizados
   */
  private updateProductStocks(materials: any[]): void {
    if (!materials || materials.length === 0) {
      console.log('⚠️ No hay materiales para actualizar stock');
      return;
    }

    console.log('📦 Iniciando actualización de stock para materiales:', materials);

    materials.forEach(material => {
      if (material.productId && material.quantity > 0) {
        // Obtener el producto actual para conocer su stock
        const product = this.products().find(p => p.productId === material.productId);
        
        if (product) {
          const newStock = (product.currentStock || 0) - material.quantity;
          
          console.log(`\n📊 Actualizando producto: ${product.productName}`);
          console.log(`   Product ID: ${material.productId}`);
          console.log(`   Stock actual: ${product.currentStock}`);
          console.log(`   Cantidad usada: ${material.quantity}`);
          console.log(`   Nuevo stock calculado: ${newStock}`);
          
          this.updateProductStock(material.productId, newStock, product.productName);
        } else {
          console.warn(`⚠️ No se encontró el producto con ID: ${material.productId}`);
        }
      }
    });
  }

  /**
   * Ajusta el stock cuando se edita una incidencia
   * Devuelve los materiales antiguos y resta los nuevos
   */
  private adjustProductStocksOnEdit(oldMaterials: any[], newMaterials: any[]): void {
    console.log('🔄 Ajustando stock en edición...');
    console.log('   Materiales antiguos:', oldMaterials);
    console.log('   Materiales nuevos:', newMaterials);

    // Crear un mapa para rastrear los cambios por producto
    const stockChanges = new Map<string, { productName: string, change: number, currentStock: number }>();

    // Primero, devolver el stock de los materiales antiguos (sumar)
    oldMaterials.forEach(oldMaterial => {
      if (oldMaterial.productId && oldMaterial.quantity > 0) {
        const product = this.products().find(p => p.productId === oldMaterial.productId);
        if (product) {
          if (!stockChanges.has(oldMaterial.productId)) {
            stockChanges.set(oldMaterial.productId, {
              productName: product.productName,
              change: 0,
              currentStock: product.currentStock || 0
            });
          }
          const change = stockChanges.get(oldMaterial.productId)!;
          change.change += oldMaterial.quantity; // Sumar (devolver)
        }
      }
    });

    // Luego, restar el stock de los materiales nuevos
    newMaterials.forEach(newMaterial => {
      if (newMaterial.productId && newMaterial.quantity > 0) {
        const product = this.products().find(p => p.productId === newMaterial.productId);
        if (product) {
          if (!stockChanges.has(newMaterial.productId)) {
            stockChanges.set(newMaterial.productId, {
              productName: product.productName,
              change: 0,
              currentStock: product.currentStock || 0
            });
          }
          const change = stockChanges.get(newMaterial.productId)!;
          change.change -= newMaterial.quantity; // Restar (usar)
        }
      }
    });

    // Aplicar los cambios
    stockChanges.forEach((data, productId) => {
      const newStock = data.currentStock + data.change;
      
      console.log(`\n📊 Producto: ${data.productName}`);
      console.log(`   Stock actual: ${data.currentStock}`);
      console.log(`   Cambio neto: ${data.change > 0 ? '+' : ''}${data.change}`);
      console.log(`   Nuevo stock: ${newStock}`);
      
      this.updateProductStock(productId, newStock, data.productName);
    });
  }

  /**
   * Actualiza el stock de un producto específico en el backend
   */
  private updateProductStock(productId: string, newStock: number, productName: string): void {
    const url = `https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/materials/${productId}`;
    const updateData = {
      currentStock: newStock
    };
    
    console.log(`   🔄 Enviando PATCH a: ${url}`);
    console.log(`   📤 Datos enviados:`, updateData);
    
    this.http.patch(url, updateData).subscribe({
      next: (response: any) => {
        console.log(`   ✅ Stock actualizado exitosamente:`, response);
      },
      error: (error: any) => {
        console.error(`   ❌ Error con PATCH, intentando PUT completo:`, error);
        console.error(`   Error status:`, error.status);
        console.error(`   Error message:`, error.message);
        
        // Si PATCH falla, intentar con PUT enviando todo el objeto
        const product = this.products().find(p => p.productId === productId);
        if (product) {
          const fullUpdateData = {
            ...product,
            currentStock: newStock
          };
          
          console.log(`   🔄 Intentando PUT con datos completos:`, fullUpdateData);
          
          this.http.put(url, fullUpdateData).subscribe({
            next: (response: any) => {
              console.log(`   ✅ Stock actualizado con PUT:`, response);
            },
            error: (putError: any) => {
              console.error(`   ❌ Error también con PUT:`, putError);
              console.error(`   PUT Error status:`, putError.status);
              console.error(`   PUT Error message:`, putError.message);
              if (putError.error) {
                console.error(`   PUT Error details:`, putError.error);
              }
            }
          });
        }
      }
    });
  }

  /**
   * Calcula el costo total en soles
   * Los costos unitarios ya vienen en soles desde el API
   */
  calculateTotalCost(): void {
    let totalPEN = 0;
    
    // Sumar el costo de todos los materiales (cantidad × costo unitario en soles)
    this.materialsUsedArray.controls.forEach(control => {
      const quantity = control.get('quantity')?.value || 0;
      const unitCost = control.get('unitCost')?.value || 0;
      totalPEN += quantity * unitCost;
    });
    
    this.totalInSoles.set(totalPEN);
    
    // Actualizar el campo totalCost en el formulario (guardamos en soles)
    this.incidentForm.patchValue({
      totalCost: totalPEN
    }, { emitEvent: false });
    
    console.log(`💰 Total calculado: S/ ${totalPEN.toFixed(2)} PEN`);
  }

  // Método helper para cargar materiales en el FormArray
  private loadMaterialsToForm(materials: MaterialUsed[] | undefined) {
    // Limpiar el FormArray
    while (this.materialsUsedArray.length) {
      this.materialsUsedArray.removeAt(0);
    }
    
    // Limpiar advertencias de stock
    this.stockWarnings.set(new Map());
    
    // Agregar los materiales si existen
    if (materials && materials.length > 0) {
      materials.forEach((material, index) => {
        const materialGroup = this.fb.group({
          productId: [material.productId, [Validators.required]],
          quantity: [material.quantity, [Validators.required, Validators.min(1)]],
          unit: [material.unit, [Validators.required]],
          unitCost: [material.unitCost, [Validators.required, Validators.min(0)]]
        });
        
        // Agregar suscripciones para actualizar automáticamente cuando cambie el producto
        materialGroup.get('productId')?.valueChanges.subscribe(productId => {
          console.log('🔍 ProductId cambiado en edición:', productId);
          if (productId) {
            const product = this.products().find(p => p.productId === productId);
            console.log('🎯 Producto encontrado para edición:', product);
            if (product) {
              console.log(`💰 Actualizando costo unitario: ${product.unitCost}`);
              materialGroup.get('unitCost')?.setValue(product.unitCost);
              materialGroup.get('unit')?.setValue(product.unitOfMeasure || 'unidades');
              this.calculateTotalCost();
              // Verificar stock cuando cambia el producto
              this.checkStockAvailability(index);
            }
          }
        });
        
        // Recalcular total cuando cambia cantidad o costo
        materialGroup.get('quantity')?.valueChanges.subscribe(() => {
          this.calculateTotalCost();
          // Verificar stock cuando cambia la cantidad
          this.checkStockAvailability(index);
        });
        materialGroup.get('unitCost')?.valueChanges.subscribe(() => this.calculateTotalCost());
        
        this.materialsUsedArray.push(materialGroup);
        
        // Verificar stock inicial para este material
        this.checkStockAvailability(index);
      });
      
      // Recalcular el total inicial con los materiales cargados
      this.calculateTotalCost();
    }
  }

  /**
   * Método helper para cargar datos de resolución desde el backend
   */
  private loadResolutionData(incidentId: string) {
    console.log('🔍 Buscando resolución para incidentId:', incidentId);
    
    this.resolutionsService.getResolutionByIncidentId(incidentId).subscribe({
      next: (response) => {
        console.log('📥 Respuesta del backend:', response);
        
        // El backend puede devolver un array o un objeto directo
        let resolution: any;
        if (Array.isArray(response) && response.length > 0) {
          resolution = response[0];
          console.log('✅ Resolución extraída del array:', resolution);
        } else if (response && !Array.isArray(response)) {
          resolution = response;
          console.log('✅ Resolución obtenida directamente:', resolution);
        } else {
          console.warn('⚠️ No se encontró resolución en la respuesta:', response);
          // Si no hay resolución, limpiar los campos
          this.incidentForm.patchValue({
            resolved: false,
            resolutionDate: '',
            resolutionType: 'REPARACION_COMPLETA',
            actionsTaken: '',
            laborHours: 0,
            totalCost: 0,
            resolvedByUserId: '',
            qualityCheck: false,
            followUpRequired: false,
            resolutionNotes: ''
          });
          this.loadMaterialsToForm([]);
          return;
        }
        
        // Convertir la fecha de resolución a formato datetime-local
        const resolutionDate = resolution.resolutionDate 
          ? new Date(resolution.resolutionDate).toISOString().slice(0, 16) 
          : '';
        
        // Actualizar el formulario con los datos de resolución
        this.incidentForm.patchValue({
          resolved: true,
          resolutionDate: resolutionDate,
          resolutionType: resolution.resolutionType || 'REPARACION_COMPLETA',
          actionsTaken: resolution.actionsTaken || '',
          laborHours: resolution.laborHours || 0,
          totalCost: resolution.totalCost || 0,
          resolvedByUserId: resolution.resolvedByUserId || '',
          qualityCheck: resolution.qualityCheck || false,
          followUpRequired: resolution.followUpRequired || false,
          resolutionNotes: resolution.resolutionNotes || ''
        });
        
        // Cargar los materiales usados en la resolución
        this.loadMaterialsToForm(resolution.materialsUsed);
      },
      error: (error) => {
        console.warn('⚠️ No se encontró resolución para esta incidencia:', error);
        // Si no hay resolución, limpiar los campos de resolución
        this.incidentForm.patchValue({
          resolved: false,
          resolutionDate: '',
          resolutionType: 'REPARACION_COMPLETA',
          actionsTaken: '',
          laborHours: 0,
          totalCost: 0,
          resolvedByUserId: '',
          qualityCheck: false,
          followUpRequired: false,
          resolutionNotes: ''
        });
        this.loadMaterialsToForm([]);
      }
    });
  }

  // Configurar validaciones dinámicas para los campos de resolución
  private setupResolutionValidations() {
    this.incidentForm.get('resolved')?.valueChanges.subscribe(isResolved => {
      const resolutionFields = [
        'resolutionDate',
        'resolutionType',
        'actionsTaken',
        'laborHours',
        'totalCost'
      ];

      if (isResolved) {
        // Hacer los campos requeridos cuando resolved es true (excepto resolvedByUserId que es opcional)
        resolutionFields.forEach(field => {
          const control = this.incidentForm.get(field);
          if (field === 'actionsTaken') {
            control?.setValidators([Validators.required, Validators.minLength(10)]);
          } else if (field === 'laborHours' || field === 'totalCost') {
            control?.setValidators([Validators.required, Validators.min(0)]);
          } else {
            control?.setValidators([Validators.required]);
          }
          control?.updateValueAndValidity();
        });
        
        // resolvedByUserId es opcional, no requiere validación
        const resolvedByControl = this.incidentForm.get('resolvedByUserId');
        resolvedByControl?.clearValidators();
        resolvedByControl?.updateValueAndValidity();
      } else {
        // Remover validaciones cuando resolved es false pero mantener los valores
        resolutionFields.forEach(field => {
          const control = this.incidentForm.get(field);
          if (field === 'laborHours' || field === 'totalCost') {
            control?.setValidators([Validators.min(0)]);
          } else {
            control?.clearValidators();
          }
          control?.updateValueAndValidity();
        });
        
        // También limpiar validaciones de resolvedByUserId
        const resolvedByControl = this.incidentForm.get('resolvedByUserId');
        resolvedByControl?.clearValidators();
        resolvedByControl?.updateValueAndValidity();
      }
    });
  }

  /**
   * Carga las resoluciones para las incidencias que están marcadas como resueltas
   */
  private loadResolutionsForIncidents(incidents: Incident[]) {
    const resolvedIncidents = incidents.filter(inc => inc.resolved);
    
    if (resolvedIncidents.length === 0) {
      console.log('No hay incidencias resueltas para cargar resoluciones');
      return;
    }
    
    console.log(`📥 Cargando resoluciones para ${resolvedIncidents.length} incidencias resueltas`);
    
    // Cargar todas las resoluciones del backend
    this.resolutionsService.getAllResolutions().subscribe({
      next: (resolutions) => {
        console.log('✅ Resoluciones cargadas:', resolutions);
        
        // Crear un mapa de incidentId -> resolución para acceso rápido
        const resMap = new Map<string, any>();
        
        resolutions.forEach(resolution => {
          if (resolution.incidentId) {
            resMap.set(resolution.incidentId, resolution);
          }
        });
        
        this.resolutionsMap.set(resMap);
        console.log(`✅ Mapa de resoluciones creado con ${resMap.size} entradas`);
      },
      error: (error) => {
        console.error('❌ Error cargando resoluciones:', error);
      }
    });
  }

  private async loadIncidentTypes() {
    try {
      this.incidentTypesService.getAllIncidentTypes().subscribe({
        next: (types) => {
          this.incidentTypes.set(types.filter(t => t.status === 'ACTIVE'));
        },
        error: (error) => {
          console.error('Error cargando tipos de incidencia:', error);
          this.notificationMessage.set('Error al cargar tipos de incidencia');
        }
      });
    } catch (error) {
      console.error('Error cargando tipos de incidencia:', error);
    }
  }

  private async loadUsers() {
    try {
      this.incidentsService.getActiveUsers().subscribe({
        next: (response) => {
          // El API puede devolver diferentes estructuras
          const users = response?.data || response || [];
          this.users.set(users);
        },
        error: (error) => {
          console.error('Error cargando usuarios:', error);
          // Si falla, mantener array vacío
          this.users.set([]);
        }
      });
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.users.set([]);
    }
  }

  /**
   * Carga todos los operadores de la organización
   */
  private async loadOperators() {
    try {
      this.incidentsService.getAllOperators().subscribe({
        next: (response) => {
          console.log('✅ Operadores cargados:', response);
          // La respuesta tiene estructura: { success: true, message: "...", data: [...] }
          const operators = response?.data || [];
          this.operators.set(operators);
        },
        error: (error) => {
          console.error('❌ Error cargando operadores:', error);
          this.operators.set([]);
        }
      });
    } catch (error) {
      console.error('Error cargando operadores:', error);
      this.operators.set([]);
    }
  }

  /**
   * Carga todos los productos/materiales del inventario
   * URL: https://lab.vallegrande.edu.pe/jass/ms-inventory/api/admin/materials?organizationId={organizationId}
   */
  private async loadProducts() {
    try {
      // Obtenemos la organización del usuario logueado
      const currentUser = this.authService.getCurrentUser();
      const organizationId = currentUser?.organizationId || '6896b2ecf3e398570ffd99d3';
      
      this.incidentsService.getProducts(organizationId).subscribe({
        next: (response) => {
          console.log('📦 Productos recibidos (tipo):', typeof response, response);
          // El API puede retornar un objeto con una propiedad 'data' o directamente un array
          let productsArray = Array.isArray(response) ? response : ((response as any)?.data || []);
          console.log('📦 Array de productos:', productsArray);
          // Filtrar solo productos activos Y que tengan costo unitario definido
          const activeProducts = productsArray.filter((p: any) => 
            p.status === 'ACTIVO' && p.unitCost != null && p.unitCost > 0
          );
          this.products.set(activeProducts);
          console.log(`✅ ${activeProducts.length} productos activos con costo disponibles`);
        },
        error: (error) => {
          console.error('❌ Error cargando productos:', error);
          this.products.set([]);
        }
      });
    } catch (error) {
      console.error('Error cargando productos:', error);
      this.products.set([]);
    }
  }

  applyFilters() {
    const incidentsArray = this.incidents();
    
    // Validar que sea un array
    if (!Array.isArray(incidentsArray)) {
      this.filteredIncidents.set([]);
      return;
    }
    
    let filtered = [...incidentsArray];
    
    // Filtro por estado de registro (activo/inactivo)
    if (this.selectedFilter() !== 'all') {
      filtered = filtered.filter(incident => {
        if (this.selectedFilter() === 'active') {
          return incident.recordStatus === 'ACTIVE';
        } else if (this.selectedFilter() === 'inactive') {
          return incident.recordStatus === 'INACTIVE';
        }
        return true;
      });
    }
    
    // Filtro por término de búsqueda
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(incident => 
        incident.title.toLowerCase().includes(term) ||
        incident.description.toLowerCase().includes(term) ||
        incident.incidentCode.toLowerCase().includes(term)
      );
    }
    
    this.filteredIncidents.set(filtered);
  }

  onFilterChange(filter: 'all' | 'active' | 'inactive') {
    this.selectedFilter.set(filter);
    this.isDropdownOpen.set(false);
    this.applyFilters();
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.target.value);
    this.applyFilters();
  }

  onStatusChange(event: any) {
    const status = event.target.value;
    
    // Si el estado es RESOLVED, marcar automáticamente el checkbox de "resolved"
    if (status === 'RESOLVED') {
      this.incidentForm.patchValue({
        resolved: true
      });
    } else {
      // Si cambia a otro estado, desmarcar el checkbox
      this.incidentForm.patchValue({
        resolved: false
      });
    }
  }

  getFilterLabel(): string {
    switch (this.selectedFilter()) {
      case 'all': return 'Todas las incidencias';
      case 'active': return 'Solo activos';
      case 'inactive': return 'Solo inactivos';
      default: return 'Todas las incidencias';
    }
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.editingIncident.set(null);
    
    // Limpiar materiales originales (modo creación)
    this.originalMaterials = [];
    
    const newCode = this.generateIncidentCode();
    this.generatedCode.set(newCode);
    
    this.incidentForm.reset();
    
    // Obtenemos la organización del usuario logueado
    const currentUser = this.authService.getCurrentUser();
    const userOrganizationId = currentUser?.organizationId || '';
    
    this.incidentForm.patchValue({
      incidentCode: newCode,
      severity: 'MEDIUM', // Valor por defecto necesario
      incidentCategory: '', // Vacío para que el usuario seleccione
      affectedBoxesCount: 0,
      incidentDate: new Date().toISOString().slice(0, 16), // Formato para datetime-local (YYYY-MM-DDTHH:MM)
      status: 'REPORTED', // Valor por defecto
      resolved: false,
      // Campos vacíos para que el usuario complete
      zoneId: '',
      reportedByUserId: '',
      organizationId: userOrganizationId, // ID de la organización del usuario logueado
      incidentTypeId: '', // Vacío para que el usuario seleccione
      assignedToUserId: '',
      // Campos de resolución vacíos
      resolutionDate: '',
      resolutionType: 'REPARACION_COMPLETA',
      actionsTaken: '',
      laborHours: 0,
      totalCost: 0,
      resolvedByUserId: '',
      qualityCheck: false,
      followUpRequired: false,
      resolutionNotes: ''
    });
    
    // Limpiar el array de materiales
    this.loadMaterialsToForm([]);
    
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.incidentForm.reset();
    this.isEditMode.set(false);
    this.editingIncident.set(null);
    
    // Limpiar materiales originales al cerrar
    this.originalMaterials = [];
  }

  openEditModal(incident: Incident) {
    this.isEditMode.set(true);
    this.editingIncident.set(incident);
    this.generatedCode.set(incident.incidentCode);
    
    // IMPORTANTE: Guardar una copia profunda de los materiales originales
    this.originalMaterials = JSON.parse(JSON.stringify(incident.materialsUsed || []));
    console.log('💾 Materiales originales guardados:', this.originalMaterials);
    
    // Convertir la fecha ISO a formato datetime-local
    const incidentDate = incident.incidentDate ? new Date(incident.incidentDate).toISOString().slice(0, 16) : '';
    
    this.incidentForm.reset();
    this.incidentForm.patchValue({
      incidentCode: incident.incidentCode,
      title: incident.title,
      description: incident.description,
      incidentTypeId: incident.incidentTypeId,
      incidentCategory: incident.incidentCategory,
      zoneId: incident.zoneId,
      severity: incident.severity,
      affectedBoxesCount: incident.affectedBoxesCount,
      reportedByUserId: incident.reportedByUserId,
      assignedToUserId: incident.assignedToUserId || '',
      organizationId: incident.organizationId,
      incidentDate: incidentDate,
      status: incident.status
    });
    
    // Cargar la resolución desde el backend si la incidencia está resuelta
    if (incident.resolved) {
      this.loadResolutionData(incident.id);
    } else {
      // Si no está resuelta, limpiar campos de resolución
      this.incidentForm.patchValue({
        resolved: false,
        resolutionDate: '',
        resolutionType: 'REPARACION_COMPLETA',
        actionsTaken: '',
        laborHours: 0,
        totalCost: 0,
        resolvedByUserId: '',
        qualityCheck: false,
        followUpRequired: false,
        resolutionNotes: ''
      });
      this.loadMaterialsToForm([]);
    }
    
    this.showModal.set(true);
  }

  onSubmit() {
    if (this.incidentForm.valid) {
      // Usar getRawValue() para incluir campos disabled
      const formValues = this.incidentForm.getRawValue();
      
      // Convert datetime-local to ISO format for the API
      let formData: any = {
        ...formValues,
        incidentDate: formValues.incidentDate ? new Date(formValues.incidentDate).toISOString() : new Date().toISOString(),
        resolutionDate: formValues.resolutionDate ? new Date(formValues.resolutionDate).toISOString() : undefined
      };
      
      // Separar los datos de resolución si existe
      let resolutionData: CreateIncidentResolutionRequest | null = null;
      
      // IMPORTANTE: Guardar los materiales ANTES de eliminarlos del formData
      const materialsUsedForStock = [...(formValues.materialsUsed || [])];
      console.log('📦 Materiales guardados para actualizar stock:', materialsUsedForStock);
      
      // Si está resuelto, preparar los datos de resolución como entidad separada
      if (formValues.resolved) {
        resolutionData = {
          incidentId: '', // Se asignará después de crear/actualizar la incidencia
          resolutionDate: formData.resolutionDate || new Date().toISOString(),
          resolutionType: formData.resolutionType || 'REPARACION_COMPLETA',
          actionsTaken: formData.actionsTaken || '',
          materialsUsed: formData.materialsUsed || [],
          laborHours: formData.laborHours || 0,
          totalCost: formData.totalCost || 0,
          resolvedByUserId: formData.resolvedByUserId || this.authService.getCurrentUser()?.userId || '',
          qualityCheck: formData.qualityCheck || false,
          followUpRequired: formData.followUpRequired || false,
          resolutionNotes: formData.resolutionNotes || ''
        };
        
        console.log('📋 Datos de resolución preparados:', resolutionData);
      }
      
      // Eliminar los campos de resolución del formData de la incidencia
      // para evitar enviarlos en el request de incidencias
      delete formData.resolutionDate;
      delete formData.resolutionType;
      delete formData.actionsTaken;
      delete formData.materialsUsed;
      delete formData.laborHours;
      delete formData.totalCost;
      delete formData.resolvedByUserId;
      delete formData.qualityCheck;
      delete formData.followUpRequired;
      delete formData.resolutionNotes;
      
      // Log detallado para debugging
      console.log('📋 Form Data de incidencia (sin resolución):', formData);
      console.log('✅ Resolved:', formValues.resolved);
      
      if (this.isEditMode()) {
        // Modo edición
        const editingIncident = this.editingIncident();
        if (editingIncident) {
          const updateData: UpdateIncidentRequest = {
            id: editingIncident.id, // Requerido por el tipo pero no se envía en el body
            incidentCode: formData.incidentCode,
            title: formData.title,
            description: formData.description,
            incidentTypeId: formData.incidentTypeId,
            incidentCategory: formData.incidentCategory,
            severity: formData.severity,
            status: formData.status,
            reportedByUserId: formData.reportedByUserId,
            assignedToUserId: formData.assignedToUserId || undefined,
            organizationId: formData.organizationId,
            zoneId: formData.zoneId,
            incidentDate: formData.incidentDate,
            affectedBoxesCount: formData.affectedBoxesCount,
            resolved: formData.resolved,
            recordStatus: editingIncident.recordStatus // Preservar el recordStatus original
          };
          
          // Remover el campo id del body antes de enviarlo
          const { id, ...updatePayload } = updateData;
          
          console.log('Actualizando incidencia con payload:', updatePayload);
          
          // Mostrar loading mientras se actualiza
          this.isLoading.set(true);
          
          this.incidentsService.updateIncident(editingIncident.id, updatePayload as any).subscribe({
            next: (updatedIncident) => {
              console.log('🎉 Incidencia actualizada:', updatedIncident);
              console.log('📋 Estructura de updatedIncident:', JSON.stringify(updatedIncident, null, 2));
              
              // Ajustar el stock: devolver materiales antiguos y restar materiales nuevos
              this.adjustProductStocksOnEdit(
                this.originalMaterials,
                materialsUsedForStock
              );
              
              // Si está marcado como resuelto, guardar la resolución separadamente
              if (formValues.resolved && resolutionData) {
                // Extraer el ID correcto del objeto de respuesta
                const incidentId = updatedIncident.id 
                  || (updatedIncident as any)._id 
                  || (updatedIncident as any).incidentId
                  || this.editingIncident()?.id; // Fallback al ID original
                
                console.log('🔑 ID extraído de updatedIncident:', incidentId);
                
                if (!incidentId || incidentId === '') {
                  console.error('❌ No se pudo obtener el ID de la incidencia actualizada');
                  console.error('📦 updatedIncident completo:', updatedIncident);
                  console.error('🔍 Claves de updatedIncident:', Object.keys(updatedIncident));
                  this.isLoading.set(false);
                  this.showToast('Error', 'No se pudo obtener el ID de la incidencia para guardar la resolución', 'error');
                  this.closeModal();
                  this.loadIncidents();
                  return;
                }
                
                resolutionData.incidentId = incidentId;
                
                console.log('💾 Guardando resolución separada:', resolutionData);
                
                // Intentar obtener resolución existente primero
                this.resolutionsService.getResolutionByIncidentId(updatedIncident.id).subscribe({
                  next: (response) => {
                    console.log('📋 Respuesta del backend:', response);
                    
                    // El backend puede devolver un array o un objeto directo
                    let existingResolution: any = null;
                    
                    if (Array.isArray(response)) {
                      if (response.length > 0) {
                        existingResolution = response[0];
                        console.log('✅ Resolución extraída del array:', existingResolution);
                      } else {
                        console.log('📭 Array vacío - No existe resolución previa, creando nueva...');
                        console.log('📝 resolutionData antes de enviar:', JSON.stringify(resolutionData, null, 2));
                        console.log('🔑 incidentId que se va a enviar:', resolutionData!.incidentId);
                        
                        // Validar que el incidentId no esté vacío antes de crear
                        if (!resolutionData!.incidentId || resolutionData!.incidentId === '') {
                          console.error('❌ El incidentId está vacío en resolutionData');
                          this.isLoading.set(false);
                          this.showToast('Error', 'No se puede crear la resolución sin un ID de incidencia válido', 'error');
                          return;
                        }
                        
                        // Validar y asignar resolvedByUserId si está vacío
                        if (!resolutionData!.resolvedByUserId || resolutionData!.resolvedByUserId === '') {
                          resolutionData!.resolvedByUserId = this.authService.getCurrentUser()?.userId || '';
                          console.log('👤 Asignando usuario logueado como resolutor:', resolutionData!.resolvedByUserId);
                        }
                        
                        // Si aún está vacío, mostrar error
                        if (!resolutionData!.resolvedByUserId) {
                          console.error('❌ No se pudo obtener un usuario válido para resolvedByUserId');
                          this.isLoading.set(false);
                          this.showToast('Error', 'No se puede crear la resolución sin un usuario asignado', 'error');
                          return;
                        }
                        
                        // Array vacío = no hay resolución, crear una nueva
                        this.resolutionsService.createResolution(resolutionData!).subscribe({
                          next: (savedResolution) => {
                            console.log('✅ Resolución creada exitosamente:', savedResolution);
                            this.closeModal();
                            this.loadIncidents();
                            this.loadProducts(); // Recargar productos
                            this.showToast('¡Incidencia actualizada y resolución creada!', 'La incidencia se ha actualizado y se creó la resolución correctamente', 'success');
                          },
                          error: (resError) => {
                            console.error('❌ Error creando resolución:', resError);
                            console.error('Detalles del error:', resError.error);
                            this.isLoading.set(false);
                            this.showToast('Advertencia', 'La incidencia se actualizó pero hubo un error al crear la resolución', 'info');
                          }
                        });
                        return;
                      }
                    } else if (response && !Array.isArray(response)) {
                      existingResolution = response;
                      console.log('✅ Resolución obtenida directamente:', existingResolution);
                    }
                    
                    // Si llegamos aquí, hay una resolución existente
                    if (existingResolution) {
                      // Verificar que la resolución tenga un ID válido
                      const resolutionId = existingResolution?.id || (existingResolution as any)?._id;
                      
                      if (!resolutionId) {
                        console.error('❌ La resolución no tiene un ID válido:', existingResolution);
                        this.isLoading.set(false);
                        this.showToast('Error', 'No se pudo obtener el ID de la resolución existente', 'error');
                        return;
                      }
                      
                      // Si existe, actualizar
                      console.log('✏️ Actualizando resolución existente con ID:', resolutionId);
                      this.resolutionsService.updateResolution(resolutionId, resolutionData!).subscribe({
                        next: (savedResolution) => {
                          console.log('✅ Resolución actualizada exitosamente:', savedResolution);
                          this.closeModal();
                          this.loadIncidents();
                          this.loadProducts(); // Recargar productos
                          this.showToast('¡Incidencia y resolución actualizadas!', 'La incidencia y su resolución se han actualizado correctamente', 'success');
                        },
                        error: (resError) => {
                          console.error('❌ Error actualizando resolución:', resError);
                          this.isLoading.set(false);
                          this.showToast('Advertencia', 'La incidencia se actualizó pero hubo un error al actualizar la resolución', 'info');
                        }
                      });
                    }
                  },
                  error: (getError) => {
                    // Si no existe, crear nueva resolución
                    console.log('➕ Creando nueva resolución (no se encontró existente)');
                    this.resolutionsService.createResolution(resolutionData!).subscribe({
                      next: (savedResolution) => {
                        console.log('✅ Resolución creada exitosamente:', savedResolution);
                        this.closeModal();
                        this.loadIncidents();
                        this.showToast('¡Incidencia actualizada y resolución creada!', 'La incidencia se ha actualizado y se creó la resolución correctamente', 'success');
                      },
                      error: (resError) => {
                        console.error('❌ Error creando resolución:', resError);
                        console.error('Detalles del error:', resError.error);
                        this.isLoading.set(false);
                        this.showToast('Advertencia', 'La incidencia se actualizó pero hubo un error al crear la resolución', 'info');
                      }
                    });
                  }
                });
              } else {
                // No está resuelto, solo actualizar incidencia
                // Pero si tenía una resolución previa, mantenerla en el backend
                // Verificar si la incidencia tenía resolución antes
                const editingIncident = this.editingIncident();
                if (editingIncident && editingIncident.resolved && !formValues.resolved) {
                  // La incidencia pasó de resuelta a no resuelta
                  // Mostrar mensaje informativo
                  this.closeModal();
                  this.loadIncidents();
                  this.loadProducts(); // Recargar productos
                  
                  const incidentCode = updatedIncident?.incidentCode || editingIncident.incidentCode || 'Incidencia';
                  const incidentTitle = updatedIncident?.title || editingIncident.title || '';
                  this.showToast('¡Incidencia actualizada!', `${incidentCode} - ${incidentTitle} actualizado correctamente. La resolución previa se mantiene en el sistema.`, 'success');
                } else {
                  // Caso normal
                  this.closeModal();
                  this.loadIncidents();
                  this.loadProducts(); // Recargar productos
                  
                  const incidentCode = updatedIncident?.incidentCode || formValues.incidentCode || 'Incidencia';
                  const incidentTitle = updatedIncident?.title || formValues.title || '';
                  this.showToast('¡Incidencia actualizada!', `${incidentCode} - ${incidentTitle} actualizado correctamente`, 'success');
                }
                console.log('Incidencia actualizada exitosamente');
              }
            },
            error: (error) => {
              console.error('Error actualizando incidencia:', error);
              this.isLoading.set(false);
              this.showToast('Error al actualizar', 'No se pudo actualizar la incidencia. Por favor, intente nuevamente.', 'error');
            }
          });
        }
      } else {
        // Modo creación
        console.log('Creando nueva incidencia:', formData);
        
        // Mostrar loading mientras se crea
        this.isLoading.set(true);
        
        this.incidentsService.createIncident(formData as CreateIncidentRequest).subscribe({
          next: (newIncident) => {
            console.log('🎉 Incidencia creada:', newIncident);
            console.log('📋 Estructura completa del objeto recibido:', JSON.stringify(newIncident, null, 2));
            
            // Reducir el stock de los materiales utilizados
            this.updateProductStocks(materialsUsedForStock);
            
            // Si está marcado como resuelto, guardar la resolución separadamente
            if (formValues.resolved && resolutionData) {
              // Extraer el ID correcto del objeto de respuesta
              // Intentar múltiples posibles ubicaciones del ID
              let incidentId = newIncident.id 
                || (newIncident as any)._id 
                || (newIncident as any).incidentId
                || (newIncident as any).data?.id
                || (newIncident as any).data?._id;
              
              // Si el ID es un string vacío, tratarlo como undefined
              if (incidentId === '' || incidentId === null || incidentId === undefined) {
                incidentId = undefined;
              }
              
              if (!incidentId) {
                console.error('❌ No se pudo obtener el ID de la incidencia creada.');
                console.error('📦 Objeto completo recibido:', newIncident);
                console.error('🔍 Claves del objeto:', Object.keys(newIncident));
                this.isLoading.set(false);
                this.showToast('Error', 'La incidencia se creó pero no se pudo obtener su ID para guardar la resolución', 'error');
                this.closeModal();
                this.loadIncidents();
                return;
              }
              
              resolutionData.incidentId = incidentId;
              
              console.log('💾 Guardando resolución separada para nueva incidencia. ID:', incidentId);
              console.log('📝 Datos de resolución a enviar:', JSON.stringify(resolutionData, null, 2));
              
              this.resolutionsService.createResolution(resolutionData).subscribe({
                next: (savedResolution) => {
                  console.log('✅ Resolución creada exitosamente:', savedResolution);
                  this.closeModal();
                  this.loadIncidents();
                  this.loadProducts(); // Recargar productos para actualizar stock en la UI
                  this.showToast('¡Incidencia y resolución creadas!', 'La nueva incidencia y su resolución se han creado correctamente', 'success');
                },
                error: (resError) => {
                  console.error('❌ Error guardando resolución:', resError);
                  console.error('Detalles del error:', resError.error);
                  this.isLoading.set(false);
                  this.showToast('Advertencia', 'La incidencia se creó pero hubo un error al guardar la resolución', 'info');
                }
              });
            } else {
              // No está resuelto, solo crear incidencia
              this.closeModal();
              this.loadIncidents();
              this.loadProducts(); // Recargar productos para actualizar stock en la UI
              
              const incidentCode = newIncident?.incidentCode || formValues.incidentCode || 'Incidencia';
              const incidentTitle = newIncident?.title || formValues.title || '';
              this.showToast('¡Incidencia creada!', `${incidentCode} - ${incidentTitle} creado correctamente`, 'success');
              console.log('Incidencia creada exitosamente');
            }
          },
          error: (error) => {
            console.error('Error creando incidencia:', error);
            console.error('Status:', error.status);
            console.error('Message:', error.message);
            if (error.error) {
              console.error('Server error details:', error.error);
            }
            this.isLoading.set(false);
            this.showToast('Error al crear', 'No se pudo crear la incidencia. Por favor, intente nuevamente.', 'error');
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.incidentForm.controls).forEach(key => {
      const control = this.incidentForm.get(key);
      control?.markAsTouched();
    });
  }

  getPriorityLabel(severity: string): string {
    switch (severity) {
      case 'LOW': return 'Baja';
      case 'MEDIUM': return 'Media';
      case 'HIGH': return 'Alta';
      case 'CRITICAL': return 'Crítica';
      default: return severity;
    }
  }

  getPriorityClass(severity: string): string {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-700 border border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'REPORTED': return 'Reportada';
      case 'ASSIGNED': return 'Asignada';
      case 'IN_PROGRESS': return 'En progreso';
      case 'RESOLVED': return 'Resuelta';
      case 'CLOSED': return 'Cerrada';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'REPORTED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  onIncidentTypeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedTypeId = selectElement.value;
    
    if (selectedTypeId) {
      // Buscar el tipo de incidencia seleccionado
      const selectedType = this.incidentTypes().find(type => type.id === selectedTypeId);
      
      if (selectedType) {
        // Actualizar automáticamente la prioridad/severidad
        this.incidentForm.patchValue({
          severity: selectedType.priorityLevel
        });
        
        // Log para debug
        console.log(`Tipo seleccionado: ${selectedType.typeName}, Prioridad asignada: ${selectedType.priorityLevel}`);
      }
    } else {
      // Si no hay tipo seleccionado, resetear a prioridad por defecto
      this.incidentForm.patchValue({
        severity: 'MEDIUM'
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getIncidentTypeName(typeId: string): string {
    const type = this.incidentTypes().find(t => t.id === typeId);
    return type?.typeName || 'N/A';
  }

  toggleDropdown() {
    this.isDropdownOpen.update(current => !current);
  }

  trackByIncident(index: number, incident: Incident): string {
    return incident.id;
  }

  private generateIncidentCode(): string {
    const incidents = this.incidents();
    if (incidents.length === 0) {
      return 'INC001';
    }
    
    // Extraer números de los códigos existentes
    const existingNumbers = incidents
      .map(incident => {
        const match = incident.incidentCode.match(/INC(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    // Obtener el siguiente número
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Formatear con ceros a la izquierda
    return `INC${nextNumber.toString().padStart(3, '0')}`;
  }

  // Método helper para obtener nombre de usuario
  getUserName(userId: string): string {
    const user = this.users().find(u => u.id === userId);
    if (!user) return userId;
    
    // Flexibilidad para diferentes estructuras de datos del API
    return user.fullName || 
           user.name || 
           `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
           user.username ||
           userId;
  }

  // Método helper para obtener nombre de operador
  getOperatorName(operatorId: string): string {
    const operator = this.operators().find(o => o.id === operatorId);
    if (!operator) return operatorId;
    
    // Estructura del API: firstName + lastName
    return `${operator.firstName || ''} ${operator.lastName || ''}`.trim() || operator.userCode || operator.username || operatorId;
  }
  
  /**
   * Obtiene el nombre del operador que resolvió una incidencia
   * Busca en el mapa de resoluciones el resolvedByUserId
   */
  getResolvedByOperatorName(incidentId: string): string {
    const resolution = this.resolutionsMap().get(incidentId);
    
    if (!resolution || !resolution.resolvedByUserId) {
      return '-';
    }
    
    return this.getOperatorName(resolution.resolvedByUserId);
  }

  /**
   * Obtiene el nombre del producto por su ID
   */
  getProductName(productId: string): string {
    const product = this.products().find(p => p.productId === productId);
    if (!product) return productId;
    
    return `${product.productCode} - ${product.productName}`;
  }

  // Métodos para las estadísticas
  getTotalCount(): number {
    const incidents = this.incidents();
    return Array.isArray(incidents) ? incidents.length : 0;
  }

  getOpenCount(): number {
    const incidents = this.incidents();
    return Array.isArray(incidents) ? incidents.filter(incident => incident.recordStatus === 'ACTIVE').length : 0;
  }

  getResolvedCount(): number {
    const incidents = this.incidents();
    return Array.isArray(incidents) ? incidents.filter(incident => incident.recordStatus === 'INACTIVE').length : 0;
  }

  getCriticalCount(): number {
    const incidents = this.filteredIncidents();
    return Array.isArray(incidents) ? incidents.length : 0;
  }

  // Método para mostrar notificaciones
  showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.notificationTitle.set(title);
    this.notificationMessage.set(message);
    this.notificationType.set(type);
    this.showNotification.set(true);
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
      this.showNotification.set(false);
    }, 4000);
  }

  // Cerrar notificación manualmente
  closeNotification(): void {
    this.showNotification.set(false);
  }

  // Método para ver detalles (modo visualización)
  openViewDetailsModal(incident: Incident): void {
    this.isEditMode.set(false);
    this.editingIncident.set(incident);
    this.generatedCode.set(incident.incidentCode);
    
    // Convertir la fecha ISO a formato datetime-local
    const incidentDate = incident.incidentDate ? new Date(incident.incidentDate).toISOString().slice(0, 16) : '';
    
    this.incidentForm.reset();
    this.incidentForm.patchValue({
      incidentCode: incident.incidentCode,
      title: incident.title,
      description: incident.description,
      incidentTypeId: incident.incidentTypeId,
      incidentCategory: incident.incidentCategory,
      zoneId: incident.zoneId,
      severity: incident.severity,
      affectedBoxesCount: incident.affectedBoxesCount,
      reportedByUserId: incident.reportedByUserId,
      assignedToUserId: incident.assignedToUserId || '',
      organizationId: incident.organizationId,
      incidentDate: incidentDate,
      status: incident.status
    });
    
    // Cargar la resolución desde el backend si la incidencia está resuelta
    if (incident.resolved) {
      this.loadResolutionData(incident.id);
    } else {
      // Si no está resuelta, limpiar campos de resolución
      this.incidentForm.patchValue({
        resolved: false,
        resolutionDate: '',
        resolutionType: 'REPARACION_COMPLETA',
        actionsTaken: '',
        laborHours: 0,
        totalCost: 0,
        resolvedByUserId: '',
        qualityCheck: false,
        followUpRequired: false,
        resolutionNotes: ''
      });
      this.loadMaterialsToForm([]);
    }
    
    this.showModal.set(true);
  }

  // Método para activar el modo edición desde el modal de visualización
  enableEditMode(): void {
    this.isEditMode.set(true);
  }

  // Método para cancelar la edición y volver al modo visualización
  cancelEdit(): void {
    if (this.editingIncident()) {
      this.isEditMode.set(false);
      // Restaurar los datos originales
      const incident = this.editingIncident()!;
      const incidentDate = incident.incidentDate ? new Date(incident.incidentDate).toISOString().slice(0, 16) : '';
      
      this.incidentForm.patchValue({
        incidentCode: incident.incidentCode,
        title: incident.title,
        description: incident.description,
        incidentTypeId: incident.incidentTypeId,
        incidentCategory: incident.incidentCategory,
        zoneId: incident.zoneId,
        severity: incident.severity,
        affectedBoxesCount: incident.affectedBoxesCount,
        reportedByUserId: incident.reportedByUserId,
        assignedToUserId: incident.assignedToUserId || '',
        organizationId: incident.organizationId,
        incidentDate: incidentDate,
        status: incident.status
      });
      
      // Cargar la resolución desde el backend si la incidencia está resuelta
      if (incident.resolved) {
        this.loadResolutionData(incident.id);
      } else {
        // Si no está resuelta, limpiar campos de resolución
        this.incidentForm.patchValue({
          resolved: false,
          resolutionDate: '',
          resolutionType: 'REPARACION_COMPLETA',
          actionsTaken: '',
          laborHours: 0,
          totalCost: 0,
          resolvedByUserId: '',
          qualityCheck: false,
          followUpRequired: false,
          resolutionNotes: ''
        });
        this.loadMaterialsToForm([]);
      }
    }
  }

  // Método para eliminar (cambiar a inactivo)
  onDelete(incident: Incident): void {
    this.incidentToDelete = incident;
    this.showDeleteModal.set(true);
  }

  // Confirmar eliminación
  confirmDelete(): void {
    if (!this.incidentToDelete) return;
    
    const incident = this.incidentToDelete;
    const incidentCode = incident?.incidentCode || 'Incidencia';
    const title = incident?.title || '';
    
    this.showDeleteModal.set(false);
    this.incidentToDelete = null;
    this.isLoading.set(true);
    
    // Eliminar usando DELETE (soft delete en el backend)
    this.incidentsService.deleteIncident(incident.id).subscribe({
      next: () => {
        this.loadIncidents(); // Recargar la tabla desde el servidor
        this.showToast('¡Incidencia eliminada!', `${incidentCode} - ${title} eliminado correctamente`, 'success');
        console.log('Incidencia eliminada exitosamente (soft delete)');
      },
      error: (err) => {
        console.error('Error al eliminar incidencia:', err);
        this.isLoading.set(false);
        this.showToast('Error al eliminar', 'No se pudo eliminar la incidencia. Por favor, intente nuevamente.', 'error');
      }
    });
  }

  // Cancelar eliminación
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.incidentToDelete = null;
  }

  // Método para restaurar una incidencia inactiva
  onRestore(incident: Incident): void {
    this.incidentToRestore = incident;
    this.showRestoreModal.set(true);
  }

  // Confirmar restauración
  confirmRestore(): void {
    if (!this.incidentToRestore) return;
    
    const incident = this.incidentToRestore;
    this.showRestoreModal.set(false);
    this.incidentToRestore = null;
    this.isLoading.set(true);
    
    // Restaurar usando PATCH
    this.incidentsService.restoreIncident(incident.id).subscribe({
      next: (restoredIncident) => {
        this.loadIncidents(); // Recargar la tabla desde el servidor
        const incidentCode = restoredIncident?.incidentCode || incident?.incidentCode || 'Incidencia';
        const title = restoredIncident?.title || incident?.title || '';
        this.showToast('¡Incidencia restaurada!', `${incidentCode} - ${title} restaurado correctamente`, 'success');
        console.log('Incidencia restaurada exitosamente:', restoredIncident);
      },
      error: (err) => {
        console.error('Error al restaurar incidencia:', err);
        this.isLoading.set(false);
        this.showToast('Error al restaurar', 'No se pudo restaurar la incidencia. Por favor, intente nuevamente.', 'error');
      }
    });
  }

  // Cancelar restauración
  cancelRestore(): void {
    this.showRestoreModal.set(false);
    this.incidentToRestore = null;
  }

  /**
   * Descarga el reporte PDF de una incidencia
   */
  async downloadIncidentReport(incident: Incident): Promise<void> {
    try {
      console.log('📥 Descargando reporte para incidencia:', incident.id);
      
      // REPORTADO POR: Es un CLIENTE (buscar en users)
      let reportedByName = 'Usuario Desconocido';
      if (incident.reportedByUserId) {
        const user = this.users().find(u => u.id === incident.reportedByUserId);
        if (user) {
          reportedByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Cliente';
          console.log('👤 Cliente que reportó:', reportedByName);
        } else {
          console.log('⚠️ Cliente no encontrado en users, usando ID');
        }
      }
      
      // ASIGNADO A: Es un OPERADOR (buscar en operators)
      const assignedToName = incident.assignedToUserId ? this.getOperatorName(incident.assignedToUserId) : null;
      console.log('👤 Operador asignado:', assignedToName);
      
      // Obtener la resolución si existe
      let resolution = null;
      if (incident.resolved) {
        const resolutionData = this.resolutionsMap().get(incident.id);
        if (resolutionData) {
          resolution = resolutionData;
          
          // Enriquecer los materiales con los nombres de productos
          if (resolution.materialsUsed && resolution.materialsUsed.length > 0) {
            resolution.materialsUsed = resolution.materialsUsed.map((material: any) => ({
              ...material,
              productName: this.getProductName(material.productId)
            }));
          }
          
          // RESUELTO POR: Es un OPERADOR (buscar en operators)
          const resolvedByName = this.getResolvedByOperatorName(incident.id);
          if (resolvedByName && resolvedByName !== '-' && resolvedByName !== 'N/A') {
            resolution.resolvedBy = {
              fullName: resolvedByName
            };
            console.log('👤 Operador que resolvió:', resolvedByName);
          }
        }
      }
      
      // Enriquecer incident con información adicional
      const enrichedIncident = {
        ...incident,
        code: incident.incidentCode,
        type: incident.incidentCategory,
        priority: incident.severity,
        location: `Zona ${incident.zoneId}`,
        reportedAt: incident.incidentDate,
        reportedBy: {
          fullName: reportedByName
        },
        assignedTo: assignedToName ? {
          fullName: assignedToName
        } : null
      };
      
      // Obtener el organizationId del usuario logueado (igual que en el reporte general)
      const currentUser = this.authService.getCurrentUser();
      const organizationId = currentUser?.organizationId || incident.organizationId;
      
      console.log('🏢 Organization ID para reporte:', organizationId);
      
      // Generar el reporte con el ID de la organización
      await this.reportService.generateIncidentReport(
        enrichedIncident, 
        resolution,
        organizationId
      );
      
      console.log('✅ Reporte generado exitosamente');
      this.showToast('Reporte generado', 'El reporte PDF ha sido descargado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error al generar reporte:', error);
      this.showToast('Error al generar reporte', 'No se pudo generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  /**
   * Descarga el reporte PDF de todas las incidencias (consolidado)
   */
  async downloadAllIncidentsReport(): Promise<void> {
    try {
      console.log('📥 Generando reporte consolidado de todas las incidencias');
      
      // Obtener todas las incidencias filtradas
      const allIncidents = this.filteredIncidents();
      
      if (allIncidents.length === 0) {
        this.showToast('Sin datos', 'No hay incidencias para generar el reporte', 'info');
        return;
      }
      
      // Obtener el organizationId del usuario logueado
      const currentUser = this.authService.getCurrentUser();
      const organizationId = currentUser?.organizationId;
      
      // Enriquecer incidencias con información adicional
      const enrichedIncidents = allIncidents.map(incident => {
        // REPORTADO POR: Es un CLIENTE (buscar en users)
        let reportedByName = 'Usuario Desconocido';
        if (incident.reportedByUserId) {
          const user = this.users().find(u => u.id === incident.reportedByUserId);
          if (user) {
            reportedByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Cliente';
          }
        }
        
        // ASIGNADO A: Es un OPERADOR (buscar en operators)
        const assignedToName = incident.assignedToUserId ? this.getOperatorName(incident.assignedToUserId) : null;
        
        return {
          ...incident,
          code: incident.incidentCode,
          type: incident.incidentCategory,
          priority: incident.severity,
          location: `Zona ${incident.zoneId}`,
          reportedAt: incident.incidentDate,
          reportedBy: {
            fullName: reportedByName
          },
          assignedTo: assignedToName ? {
            fullName: assignedToName
          } : null
        };
      });
      
      // Preparar el mapa de resoluciones con información enriquecida
      const enrichedResolutionsMap = new Map<string, any>();
      
      for (const incident of allIncidents) {
        if (incident.resolved) {
          const resolutionData = this.resolutionsMap().get(incident.id);
          if (resolutionData) {
            // Enriquecer los materiales con los nombres de productos
            let enrichedResolution = { ...resolutionData };
            
            if (resolutionData.materialsUsed && resolutionData.materialsUsed.length > 0) {
              enrichedResolution.materialsUsed = resolutionData.materialsUsed.map((material: any) => ({
                ...material,
                productName: this.getProductName(material.productId)
              }));
            }
            
            // RESUELTO POR: Es un OPERADOR (buscar en operators)
            const resolvedByName = this.getResolvedByOperatorName(incident.id);
            if (resolvedByName && resolvedByName !== '-' && resolvedByName !== 'N/A') {
              enrichedResolution.resolvedBy = {
                fullName: resolvedByName
              };
            }
            
            enrichedResolutionsMap.set(incident.id, enrichedResolution);
          }
        }
      }
      
      // Generar el reporte consolidado
      await this.reportService.generateConsolidatedReport(
        enrichedIncidents,
        enrichedResolutionsMap,
        organizationId
      );
      
      console.log('✅ Reporte consolidado generado exitosamente');
      this.showToast('Reporte generado', 'El reporte consolidado ha sido descargado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error al generar reporte consolidado:', error);
      this.showToast('Error al generar reporte', 'No se pudo generar el PDF consolidado. Por favor, intente nuevamente.', 'error');
    }
  }
}