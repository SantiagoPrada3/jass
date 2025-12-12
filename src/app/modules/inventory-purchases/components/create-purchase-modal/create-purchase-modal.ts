import { Component, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { PurchasesApiService } from '../../services/purchases-api.service';
import { InventoryApi } from '../../services/inventory-api';
import { CreatePurchaseRequest } from '../../models/purchase.model';
import { Product, Supplier } from '../../models/product.model';

@Component({
     selector: 'app-create-purchase-modal',
     standalone: true,
     imports: [CommonModule, FormsModule, ReactiveFormsModule],
     templateUrl: './create-purchase-modal.html',
     styleUrls: ['./create-purchase-modal.css']
})
export class CreatePurchaseModal implements OnInit, OnDestroy {
     @Output() closeModal = new EventEmitter<void>();
     @Output() purchaseCreated = new EventEmitter<void>();

     private readonly destroy$ = new Subject<void>();
     private readonly fb = inject(FormBuilder);
     private readonly purchasesApi = inject(PurchasesApiService);
     private readonly inventoryApi = inject(InventoryApi);
     private readonly notificationService = inject(NotificationService);
     private readonly authService = inject(AuthService);

     purchaseForm!: FormGroup;
     loading = false;
     loadingData = true;

     // Datos para los selects
     suppliers: Supplier[] = [];
     products: Product[] = [];

     // Usuario y organización actual
     currentUser = this.authService.getCurrentUser();
     organizationId = '';

     ngOnInit(): void {
          this.organizationId = this.currentUser?.organizationId || '';
          console.log('=== MODAL INIT ===');
          console.log('Current user:', this.currentUser);
          console.log('Organization ID:', this.organizationId);

          if (!this.organizationId) {
               console.error('❌ No organization ID available!');
               this.notificationService.error('Error', 'No se pudo obtener la información de la organización');
               return;
          }

          this.initializeForm();
          this.loadInitialData();
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
     }

     private initializeForm(): void {
          this.purchaseForm = this.fb.group({
               purchaseCode: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(3)]],
               supplierId: ['', Validators.required],
               purchaseDate: [this.getCurrentDate(), Validators.required],
               deliveryDate: ['', Validators.required],
               invoiceNumber: [''],
               observations: [''],
               status: ['PENDIENTE'],
               details: this.fb.array([])
          });

          // Agregar al menos un detalle inicial
          this.addDetail();
     }

     private getCurrentDate(): string {
          return new Date().toISOString().split('T')[0];
     }

     private loadInitialData(): void {
          this.loadingData = true;

          forkJoin({
               suppliers: this.inventoryApi.getSuppliers(this.organizationId),
               products: this.inventoryApi.getProducts(this.organizationId),
               purchases: this.purchasesApi.getPurchasesByOrganization(this.organizationId)
          }).pipe(
               takeUntil(this.destroy$)
          ).subscribe({
               next: (data) => {
                    console.log('=== DEBUG MODAL DATA ===');
                    console.log('OrganizationId:', this.organizationId);
                    console.log('Proveedores recibidos:', data.suppliers);
                    console.log('Productos recibidos:', data.products);

                    this.suppliers = data.suppliers.filter((s: Supplier) => s.status);
                    this.products = data.products.filter((p: Product) => p.status === 'ACTIVO');

                    console.log('Proveedores filtrados (activos):', this.suppliers);
                    console.log('Productos filtrados (activos):', this.products);

                    // Verificar si hay proveedores disponibles
                    if (this.suppliers.length === 0) {
                         console.log('⚠️ No hay proveedores disponibles para organizationId:', this.organizationId);
                         this.notificationService.error('Sin proveedores', 'No hay proveedores activos disponibles para esta organización. Debe crear proveedores antes de registrar compras.');

                         // Deshabilitar el control del proveedor si no hay proveedores
                         this.purchaseForm.get('supplierId')?.disable();
                    } else {
                         // Habilitar el control del proveedor si hay proveedores disponibles
                         this.purchaseForm.get('supplierId')?.enable();
                    }

                    // Generar código automáticamente
                    const generatedCode = this.generateNextPurchaseCode(data.purchases);
                    this.purchaseForm.patchValue({ purchaseCode: generatedCode });

                    this.loadingData = false;
               },
               error: (error) => {
                    console.error('Error loading data:', error);
                    this.notificationService.error('Error', 'Error al cargar los datos iniciales');
                    this.loadingData = false;
               }
          });
     }

     private generateNextPurchaseCode(purchases: any[]): string {
          if (!purchases || purchases.length === 0) {
               return 'PUR001';
          }

          // Extraer números de los códigos existentes
          const numbers = purchases
               .map(p => p.purchaseCode || p.codigo || '')
               .filter(code => code.match(/^PUR\d+$/)) // Solo códigos que sigan el patrón PUR###
               .map(code => parseInt(code.replace('PUR', ''), 10))
               .filter(num => !isNaN(num));

          if (numbers.length === 0) {
               return 'PUR001';
          }

          const maxNumber = Math.max(...numbers);
          const nextNumber = maxNumber + 1;
          return `PUR${nextNumber.toString().padStart(3, '0')}`;
     }

     get detailsArray(): FormArray {
          return this.purchaseForm.get('details') as FormArray;
     }

     createDetailGroup(): FormGroup {
          return this.fb.group({
               productId: ['', Validators.required],
               quantityOrdered: [1, [Validators.required, Validators.min(1)]],
               unitCost: [0, [Validators.required, Validators.min(0.01)]],
               observations: ['']
          });
     }

     addDetail(): void {
          this.detailsArray.push(this.createDetailGroup());
     }

     removeDetail(index: number): void {
          if (this.detailsArray.length > 1) {
               this.detailsArray.removeAt(index);
          }
     }

     getDetailSubtotal(index: number): number {
          const detail = this.detailsArray.at(index);
          const quantity = detail.get('quantityOrdered')?.value || 0;
          const unitCost = detail.get('unitCost')?.value || 0;
          return quantity * unitCost;
     }

     getTotalAmount(): number {
          let total = 0;
          for (let i = 0; i < this.detailsArray.length; i++) {
               total += this.getDetailSubtotal(i);
          }
          return total;
     }

     canCreatePurchase(): boolean {
          return this.suppliers.length > 0 && this.products.length > 0 && !this.loadingData;
     }

     getProductName(productId: string): string {
          const product = this.products.find(p => p.productId === productId);
          return product ? product.productName : 'Producto no encontrado';
     }

     onSubmit(): void {
          console.log('=== FORM SUBMIT ===');
          console.log('Form valid:', this.purchaseForm.valid);
          console.log('Can create purchase:', this.canCreatePurchase());
          console.log('Suppliers length:', this.suppliers.length);

          if (!this.canCreatePurchase()) {
               this.notificationService.error('Error', 'No se puede crear la compra. Verifique que hay proveedores disponibles.');
               return;
          }

          if (this.purchaseForm.valid) {
               this.createPurchase();
          } else {
               this.markFormGroupTouched();
               console.log('Form errors:', this.getFormErrors());
               this.notificationService.error('Validación', 'Por favor, complete todos los campos requeridos');
          }
     }

     private getFormErrors(): any {
          let errors: any = {};
          Object.keys(this.purchaseForm.controls).forEach(key => {
               const control = this.purchaseForm.get(key);
               if (control && !control.valid) {
                    errors[key] = control.errors;
               }
          });
          return errors;
     }

     private markFormGroupTouched(): void {
          Object.keys(this.purchaseForm.controls).forEach(key => {
               const control = this.purchaseForm.get(key);
               control?.markAsTouched();

               if (control instanceof FormArray) {
                    control.controls.forEach(item => {
                         if (item instanceof FormGroup) {
                              Object.keys(item.controls).forEach(itemKey => {
                                   item.get(itemKey)?.markAsTouched();
                              });
                         }
                    });
               }
          });
     }

     private createPurchase(): void {
          this.loading = true;

          const formValue = this.purchaseForm.value;

          console.log('=== DEBUG FORM SUBMISSION ===');
          console.log('Form valid:', this.purchaseForm.valid);
          console.log('Form value:', formValue);
          console.log('SupplierId raw:', formValue.supplierId);
          console.log('Suppliers available:', this.suppliers.map(s => ({ id: s.supplierId, name: s.supplierName })));

          // Validación extra para supplierId
          if (!formValue.supplierId || formValue.supplierId === 'undefined' || formValue.supplierId === '') {
               this.loading = false;
               this.notificationService.error('Error', 'Debe seleccionar un proveedor válido');
               return;
          }

          const purchaseRequest: CreatePurchaseRequest = {
               organizationId: this.organizationId,
               purchaseCode: formValue.purchaseCode,
               supplierId: formValue.supplierId,
               purchaseDate: formValue.purchaseDate,
               deliveryDate: formValue.deliveryDate,
               requestedByUserId: this.currentUser?.userId || '',
               invoiceNumber: formValue.invoiceNumber || '',
               observations: formValue.observations || '',
               status: 'PENDIENTE',
               details: formValue.details
          };

          console.log('Request to send:', purchaseRequest);

          this.purchasesApi.createPurchase(purchaseRequest)
               .pipe(takeUntil(this.destroy$))
               .subscribe({
                    next: (purchase) => {
                         this.loading = false;
                         this.notificationService.success('Éxito', 'Compra creada exitosamente');
                         this.purchaseCreated.emit();
                         this.onClose();
                    },
                    error: (error) => {
                         this.loading = false;
                         console.error('Error creating purchase:', error);
                         this.notificationService.error('Error', 'Error al crear la compra');
                    }
               });
     } onClose(): void {
          this.closeModal.emit();
     }

     // Validación de campos
     isFieldInvalid(fieldName: string): boolean {
          const field = this.purchaseForm.get(fieldName);
          return !!(field && field.invalid && (field.dirty || field.touched));
     }

     isDetailFieldInvalid(index: number, fieldName: string): boolean {
          const detail = this.detailsArray.at(index);
          const field = detail.get(fieldName);
          return !!(field && field.invalid && (field.dirty || field.touched));
     }

     getFieldError(fieldName: string): string {
          const field = this.purchaseForm.get(fieldName);
          if (field?.errors) {
               if (field.errors['required']) return `${fieldName} es requerido`;
               if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
          }
          return '';
     }

     getDetailFieldError(index: number, fieldName: string): string {
          const detail = this.detailsArray.at(index);
          const field = detail.get(fieldName);
          if (field?.errors) {
               if (field.errors['required']) return `Campo requerido`;
               if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
          }
          return '';
     }

     getStockClass(currentStock: number, minimumStock: number): string {
          if (currentStock === 0) {
               return 'text-red-600 font-medium'; // Sin stock
          } else if (currentStock <= minimumStock) {
               return 'text-orange-600 font-medium'; // Stock bajo
          } else if (currentStock <= minimumStock * 2) {
               return 'text-yellow-600'; // Stock medio
          } else {
               return 'text-green-600'; // Stock bueno
          }
     }

     getProductDisplayText(product: any): string {
          const stockStatus = this.getStockStatus(product.currentStock, product.minimumStock);
          return `${product.productName} | Stock: ${product.currentStock} ${product.unitOfMeasure} ${stockStatus}`;
     }

     private getStockStatus(currentStock: number, minimumStock: number): string {
          if (currentStock === 0) {
               return '[SIN STOCK]';
          } else if (currentStock <= minimumStock) {
               return '[STOCK BAJO]';
          } else {
               return '[DISPONIBLE]';
          }
     }
}
