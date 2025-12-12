import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces
export interface Category {
     categoryId: string;
     organizationId: string;
     categoryCode: string;
     categoryName: string;
     description: string;
     status: 'ACTIVO' | 'INACTIVO';
     createdAt: string;
}

export interface CategoryRequest {
     organizationId: string;
     categoryCode: string;
     categoryName: string;
     description: string;
     status: 'ACTIVO' | 'INACTIVO';
}

export interface ApiResponse<T> {
     status: boolean;
     data: T;
     error?: {
          message: string;
          errorCode: string;
          httpStatus: number;
     };
}

@Injectable({
     providedIn: 'root'
})
export class CategoryApiService {
     private readonly http = inject(HttpClient);
     private readonly baseUrl = `${environment.services.gateway}/admin/product-categories`;

     /**
      * Obtener todas las categorías por organización
      */
     getAllCategories(organizationId: string): Observable<ApiResponse<Category[]>> {
          const params = new HttpParams().set('organizationId', organizationId);
          return this.http.get<ApiResponse<Category[]>>(this.baseUrl, { params });
     }

     /**
      * Obtener categoría por ID
      */
     getCategoryById(id: string): Observable<ApiResponse<Category>> {
          return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/${id}`);
     }

     /**
      * Obtener categorías por estado
      */
     getCategoriesByStatus(organizationId: string, status: 'ACTIVO' | 'INACTIVO'): Observable<ApiResponse<Category[]>> {
          const params = new HttpParams().set('organizationId', organizationId);
          return this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/status/${status}`, { params });
     }

     /**
      * Crear nueva categoría
      */
     createCategory(categoryData: CategoryRequest): Observable<ApiResponse<Category>> {
          return this.http.post<ApiResponse<Category>>(this.baseUrl, categoryData);
     }

     /**
      * Actualizar categoría
      */
     updateCategory(id: string, categoryData: CategoryRequest): Observable<ApiResponse<Category>> {
          return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, categoryData);
     }

     /**
      * Eliminar categoría (soft delete)
      */
     deleteCategory(id: string): Observable<ApiResponse<void>> {
          return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
     }

     /**
      * Restaurar categoría
      */
     restoreCategory(id: string): Observable<ApiResponse<Category>> {
          return this.http.patch<ApiResponse<Category>>(`${this.baseUrl}/${id}/restore`, {});
     }
}
