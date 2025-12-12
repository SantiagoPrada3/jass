import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Supplier {
  supplierId: string;
  organizationId: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'ACTIVO' | 'INACTIVO';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SupplierRequest {
  organizationId: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.services.gateway}/admin/suppliers`;

  /**
   * Listar todos los proveedores por organizationId
   */
  getAllSuppliers(organizationId: string): Observable<ApiResponse<Supplier[]>> {
    console.log('🔍 Obteniendo todos los proveedores para organizationId:', organizationId);
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<Supplier[]>>(this.baseUrl, { params });
  }

  /**
   * Obtener un proveedor por ID
   */
  getSupplierById(id: string): Observable<ApiResponse<Supplier>> {
    console.log('🔍 Obteniendo proveedor por ID:', id);
    return this.http.get<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Filtrar proveedores por estado y organizationId
   */
  getSuppliersByStatus(organizationId: string, status: 'ACTIVO' | 'INACTIVO'): Observable<ApiResponse<Supplier[]>> {
    console.log('🔍 Filtrando proveedores por estado:', status, 'organizationId:', organizationId);
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<Supplier[]>>(`${this.baseUrl}/status/${status}`, { params });
  }

  /**
   * Crear nuevo proveedor
   */
  createSupplier(supplier: SupplierRequest): Observable<ApiResponse<Supplier>> {
    console.log('✨ Creando nuevo proveedor:', supplier);
    return this.http.post<ApiResponse<Supplier>>(this.baseUrl, supplier);
  }

  /**
   * Actualizar proveedor
   */
  updateSupplier(id: string, supplier: SupplierRequest): Observable<ApiResponse<Supplier>> {
    console.log('✏️ Actualizando proveedor:', id, supplier);
    return this.http.put<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`, supplier);
  }

  /**
   * Eliminar proveedor (soft delete - cambia estado a INACTIVO)
   */
  deleteSupplier(id: string): Observable<ApiResponse<void>> {
    console.log('🗑️ Eliminando proveedor:', id);
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Restaurar proveedor (cambia estado a ACTIVO)
   */
  restoreSupplier(id: string): Observable<ApiResponse<Supplier>> {
    console.log('♻️ Restaurando proveedor:', id);
    return this.http.patch<ApiResponse<Supplier>>(`${this.baseUrl}/${id}/restore`, {});
  }
}
