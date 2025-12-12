import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

// Services
import { CategoryApiService, Category, CategoryRequest } from '../../services/category-api.service';
import { AuthService } from '../../../../core/auth/services/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';

@Component({
     selector: 'app-categories',
     standalone: true,
     imports: [CommonModule, FormsModule, Breadcrumb],
     templateUrl: './categories.component.html',
     styleUrls: ['./categories.component.css'],
     animations: [
          trigger('fadeIn', [
               transition(':enter', [
                    style({ opacity: 0 }),
                    animate('300ms ease-in', style({ opacity: 1 }))
               ])
          ]),
          trigger('slideIn', [
               transition(':enter', [
                    style({ transform: 'translateX(100%)' }),
                    animate('300ms ease-out', style({ transform: 'translateX(0%)' }))
               ]),
               transition(':leave', [
                    animate('300ms ease-out', style({ transform: 'translateX(100%)' }))
               ])
          ])
     ]
})
export class CategoriesComponent implements OnInit {
     breadcrumbItems: BreadcrumbItem[] = [
          {
               label: 'Panel de Control',
               url: '/admin/dashboard',
               icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
          },
          {
               label: 'Inventario y Compras',
               icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
          },
          {
               label: 'Categorías',
               icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
          }
     ];
     // Services
     private readonly categoryApi = inject(CategoryApiService);
     private readonly authService = inject(AuthService);
     private readonly notificationService = inject(NotificationService);

     // Data
     categories: Category[] = [];
     filteredCategories: Category[] = [];

     // Filters
     searchTerm: string = '';
     statusFilter: 'all' | 'ACTIVO' | 'INACTIVO' = 'all';

     // Modal states
     isFormModalOpen: boolean = false;
     isDeleteModalOpen: boolean = false;
     isRestoreModalOpen: boolean = false;

     // Form
     categoryForm: CategoryRequest = {
          organizationId: '',
          categoryCode: '',
          categoryName: '',
          description: '',
          status: 'ACTIVO'
     };

     // Form validation
     formErrors: { [key: string]: string } = {};

     // Edit mode
     isEditMode: boolean = false;
     currentCategoryId: string | null = null;

     // Delete/Restore
     categoryToDelete: Category | null = null;
     categoryToRestore: Category | null = null;

     // Loading
     isLoading: boolean = false;

     ngOnInit(): void {
          this.loadCategories();
     }

     /**
      * Cargar todas las categorías
      */
     loadCategories(): void {
          const currentUser = this.authService.getCurrentUser();
          if (!currentUser?.organizationId) {
               this.notificationService.error('Error', 'No se pudo obtener el ID de la organización');
               return;
          }

          this.isLoading = true;
          this.categoryApi.getAllCategories(currentUser.organizationId).subscribe({
               next: (response) => {
                    // Ordenar por código de forma ascendente
                    this.categories = response.data.sort((a, b) => {
                         const codeA = a.categoryCode || '';
                         const codeB = b.categoryCode || '';
                         return codeA.localeCompare(codeB, undefined, { numeric: true });
                    });
                    this.applyFilters();
                    this.isLoading = false;
                    console.log('✅ Categorías cargadas y ordenadas:', this.categories.length);
               },
               error: (error) => {
                    console.error('❌ Error al cargar categorías:', error);
                    this.notificationService.error('Error', 'No se pudieron cargar las categorías');
                    this.isLoading = false;
               }
          });
     }

     /**
      * Aplicar filtros de búsqueda y estado
      */
     applyFilters(): void {
          let filtered = [...this.categories];

          // Filtrar por estado
          if (this.statusFilter !== 'all') {
               filtered = filtered.filter(c => c.status === this.statusFilter);
          }

          // Filtrar por búsqueda
          if (this.searchTerm.trim()) {
               const term = this.searchTerm.toLowerCase().trim();
               filtered = filtered.filter(c =>
                    c.categoryCode.toLowerCase().includes(term) ||
                    c.categoryName.toLowerCase().includes(term) ||
                    c.description.toLowerCase().includes(term)
               );
          }

          // Ordenar por código de forma ascendente
          filtered.sort((a, b) => {
               const codeA = a.categoryCode || '';
               const codeB = b.categoryCode || '';
               return codeA.localeCompare(codeB, undefined, { numeric: true });
          });

          this.filteredCategories = filtered;
     }

     /**
      * Buscar categorías
      */
     onSearch(): void {
          this.applyFilters();
     }

     /**
      * Abrir modal para crear nueva categoría
      */
     openCreateModal(): void {
          this.isEditMode = false;
          this.currentCategoryId = null;
          this.resetForm();

          // Obtener organizationId del usuario actual
          const currentUser = this.authService.getCurrentUser();
          if (currentUser?.organizationId) {
               this.categoryForm.organizationId = currentUser.organizationId;
          }

          // Generar código automáticamente
          this.categoryForm.categoryCode = this.generateCategoryCode();

          this.isFormModalOpen = true;
     }

     /**
      * Abrir modal para editar categoría
      */
     openEditModal(category: Category): void {
          this.isEditMode = true;
          this.currentCategoryId = category.categoryId;

          this.categoryForm = {
               organizationId: category.organizationId,
               categoryCode: category.categoryCode,
               categoryName: category.categoryName,
               description: category.description,
               status: category.status
          };

          this.formErrors = {};
          this.isFormModalOpen = true;
     }

     /**
      * Cerrar modal de formulario
      */
     closeFormModal(): void {
          this.isFormModalOpen = false;
          this.resetForm();
     }

     /**
      * Resetear formulario
      */
     resetForm(): void {
          const currentUser = this.authService.getCurrentUser();
          this.categoryForm = {
               organizationId: currentUser?.organizationId || '',
               categoryCode: '',
               categoryName: '',
               description: '',
               status: 'ACTIVO'
          };
          this.formErrors = {};
     }

     /**
      * Generar código de categoría automáticamente basado en el último código
      */
     generateCategoryCode(): string {
          if (this.categories.length === 0) {
               return 'CAT001';
          }

          // Extraer números de todos los códigos existentes
          const codes = this.categories
               .map(c => c.categoryCode)
               .filter(code => code && code.startsWith('CAT'))
               .map(code => {
                    const match = code.match(/CAT(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
               })
               .filter(num => num > 0);

          // Si no hay códigos válidos, empezar desde 1
          if (codes.length === 0) {
               return 'CAT001';
          }

          // Obtener el número más alto y sumar 1
          const maxNumber = Math.max(...codes);
          const nextNumber = maxNumber + 1;

          // Formatear con ceros a la izquierda (3 dígitos)
          return `CAT${nextNumber.toString().padStart(3, '0')}`;
     }

     /**
      * Validar formulario
      */
     validateForm(): boolean {
          this.formErrors = {};
          let isValid = true;

          // El código de categoría NO se valida porque se genera automáticamente

          // Validar nombre de la categoría
          if (!this.categoryForm.categoryName.trim()) {
               this.formErrors['categoryName'] = 'El nombre de la categoría es requerido';
               isValid = false;
          }

          // Validar descripción
          if (!this.categoryForm.description.trim()) {
               this.formErrors['description'] = 'La descripción es requerida';
               isValid = false;
          }

          return isValid;
     }

     /**
      * Guardar categoría (crear o actualizar)
      */
     saveCategory(): void {
          if (!this.validateForm()) {
               this.notificationService.error('Error', 'Por favor, corrija los errores en el formulario');
               return;
          }

          this.isLoading = true;

          if (this.isEditMode && this.currentCategoryId) {
               // Actualizar categoría existente
               this.categoryApi.updateCategory(this.currentCategoryId, this.categoryForm).subscribe({
                    next: (response) => {
                         this.notificationService.success('Éxito', 'Categoría actualizada correctamente');
                         this.closeFormModal();
                         this.loadCategories();
                         this.isLoading = false;
                    },
                    error: (error) => {
                         console.error('❌ Error al actualizar categoría:', error);
                         this.notificationService.error('Error', 'No se pudo actualizar la categoría');
                         this.isLoading = false;
                    }
               });
          } else {
               // Crear nueva categoría
               // Generar código automáticamente si está vacío
               const categoryData: any = { ...this.categoryForm };
               if (!categoryData.categoryCode?.trim()) {
                    categoryData.categoryCode = this.generateCategoryCode();
               }

               this.categoryApi.createCategory(categoryData).subscribe({
                    next: (response) => {
                         this.notificationService.success('Éxito', `Categoría creada correctamente con código: ${categoryData.categoryCode}`);
                         this.closeFormModal();
                         this.loadCategories();
                         this.isLoading = false;
                    },
                    error: (error) => {
                         console.error('❌ Error al crear categoría:', error);
                         this.notificationService.error('Error', 'No se pudo crear la categoría');
                         this.isLoading = false;
                    }
               });
          }
     }

     /**
      * Abrir modal de confirmación de eliminación
      */
     openDeleteModal(category: Category): void {
          console.log('🔍 Categoría para eliminar:', category);
          console.log('🔍 ID de la categoría:', category.categoryId);
          this.categoryToDelete = category;
          this.isDeleteModalOpen = true;
     }

     /**
      * Cerrar modal de eliminación
      */
     closeDeleteModal(): void {
          this.isDeleteModalOpen = false;
          this.categoryToDelete = null;
     }

     /**
      * Confirmar eliminación
      */
     confirmDelete(): void {
          if (!this.categoryToDelete) return;

          this.isLoading = true;
          this.categoryApi.deleteCategory(this.categoryToDelete.categoryId).subscribe({
               next: () => {
                    this.notificationService.success('Éxito', 'Categoría eliminada correctamente');
                    this.closeDeleteModal();
                    this.loadCategories();
                    this.isLoading = false;
               },
               error: (error) => {
                    console.error('❌ Error al eliminar categoría:', error);
                    this.notificationService.error('Error', 'No se pudo eliminar la categoría');
                    this.isLoading = false;
               }
          });
     }

     /**
      * Abrir modal de confirmación de restauración
      */
     openRestoreModal(category: Category): void {
          this.categoryToRestore = category;
          this.isRestoreModalOpen = true;
     }

     /**
      * Cerrar modal de restauración
      */
     closeRestoreModal(): void {
          this.isRestoreModalOpen = false;
          this.categoryToRestore = null;
     }

     /**
      * Confirmar restauración
      */
     confirmRestore(): void {
          if (!this.categoryToRestore) return;

          this.isLoading = true;
          this.categoryApi.restoreCategory(this.categoryToRestore.categoryId).subscribe({
               next: () => {
                    this.notificationService.success('Éxito', 'Categoría restaurada correctamente');
                    this.closeRestoreModal();
                    this.loadCategories();
                    this.isLoading = false;
               },
               error: (error) => {
                    console.error('❌ Error al restaurar categoría:', error);
                    this.notificationService.error('Error', 'No se pudo restaurar la categoría');
                    this.isLoading = false;
               }
          });
     }
}
