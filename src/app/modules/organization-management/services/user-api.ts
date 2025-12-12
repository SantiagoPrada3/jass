import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { AdminCreationResponse, AdminStatus, CreateAdminRequest, UpdateAdminPatchRequest, UserWithLocationResponse } from '../models/organization.model';


@Injectable({
  providedIn: 'root'
})
export class UsersApi {
  private readonly baseUrl = `${environment.services.gateway}/management`;
  private readonly adminUrl = `${environment.services.gateway}/admin`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los clientes de la organización
   */
  getAllClients(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.adminUrl}/clients/all`, { params });
  }

  /**
   * Obtener todos los administradores de la organización (SIN paginación - funciona)
   */
  getAllAdmins(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/admins/all`, { params });
  }

  /**
   * Obtener administradores activos solamente
   */
  getActiveAdmins(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/admins/active`, { params });
  }

  /**
   * Obtener administradores inactivos solamente
   */
  getInactiveAdmins(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/admins/inactive`, { params });
  }

  /**
   * Obtener administrador específico por ID
   */
  getAdmin(id: string): Observable<ApiResponse<UserWithLocationResponse>> {
    return this.http.get<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/admins/${id}`);
  }

  /**
   * Crear nuevo administrador
   */
  createAdmin(request: CreateAdminRequest): Observable<ApiResponse<AdminCreationResponse>> {
    return this.http.post<ApiResponse<AdminCreationResponse>>(`${this.baseUrl}/admins`, request);
  }

  /**
   * Actualizar administrador (PATCH)
   */
  updateAdmin(id: string, request: UpdateAdminPatchRequest): Observable<ApiResponse<UserWithLocationResponse>> {
    console.log(`Enviando PATCH a: ${this.baseUrl}/admins/${id}`);
    console.log('Datos de la petición:', request);
    console.log('Headers que se envían automáticamente:', this.http);

    return this.http.patch<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/admins/${id}`, request);
  }

  /**
   * Cambiar estado del administrador
   */
  changeAdminStatus(id: string, status: AdminStatus): Observable<ApiResponse<UserWithLocationResponse>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/admins/${id}/status`, null, { params });
  }

  /**
   * Eliminar administrador
   */
  deleteAdmin(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/admins/${id}`);
  }

  /**
   * Restaurar administrador eliminado
   */
  restoreAdmin(id: string): Observable<ApiResponse<UserWithLocationResponse>> {
    return this.http.put<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/admins/${id}/restore`, null);
  }

  /**
   * Generar código de administrador
   */
  generateAdminCode(): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/admin-codes/generate`, null);
  }

  /**
   * Obtener próximo código de administrador
   */
  getNextAdminCode(): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/admin-codes/next`);
  }
}
