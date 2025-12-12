import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  UserWithLocationResponse,
  CreateUserRequest,
  UpdateUserPatchRequest,
  UserCreationResponse
} from '../models/user.model';
import { UserStatus } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class UsersApi {
  private readonly baseUrl = `${environment.services.gateway}/admin`;
  // private readonly baseUrl = `http://localhost:8085/api/admin`;
  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los clientes de la organización (SIN paginación - funciona)
   */
  getAllClients(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/clients/all`, { params });
  }

  /**
   * Obtener clientes activos solamente
   */
  getActiveClients(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/clients/active`, { params });
  }

  /**
   * Obtener clientes inactivos solamente
   */
  getInactiveClients(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse[]>>(`${this.baseUrl}/clients/inactive`, { params });
  }

  /**
   * Obtener cliente específico por ID
   */
  getClient(id: string): Observable<ApiResponse<UserWithLocationResponse>> {
    return this.http.get<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/clients/${id}`);
  }

  /**
   * Crear nuevo cliente
   */
  createClient(request: CreateUserRequest): Observable<ApiResponse<UserCreationResponse>> {
    return this.http.post<ApiResponse<UserCreationResponse>>(`${this.baseUrl}/clients`, request);
  }

  /**
   * Actualizar cliente (PATCH)
   */
  updateClient(id: string, request: UpdateUserPatchRequest): Observable<ApiResponse<UserWithLocationResponse>> {
    console.log(`Enviando PATCH a: ${this.baseUrl}/clients/${id}`);
    console.log('Datos de la petición:', request);
    console.log('Headers que se envían automáticamente:', this.http);

    return this.http.patch<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/clients/${id}`, request);
  }

  /**
   * Cambiar estado del cliente
   */
  changeClientStatus(id: string, status: UserStatus): Observable<ApiResponse<UserWithLocationResponse>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/clients/${id}/status`, null, { params });
  }

  /**
   * Eliminar cliente
   */
  deleteClient(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/clients/${id}`);
  }

  /**
   * Restaurar cliente eliminado
   */
  restoreClient(id: string): Observable<ApiResponse<UserWithLocationResponse>> {
    return this.http.put<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/clients/${id}/restore`, null);
  }

  /**
   * Generar código de usuario
   */
  generateUserCode(): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/user-codes/generate`, null);
  }

  /**
   * Obtener próximo código de usuario
   */
  getNextUserCode(): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/user-codes/next`);
  }

  /**
   * Obtener cliente con información completa incluyendo asignación de caja de agua
   * Endpoint: /internal/clients/{id}?organizationId={organizationId}
   */
  getClientWithWaterBox(id: string, organizationId: string): Observable<ApiResponse<UserWithLocationResponse>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UserWithLocationResponse>>(
      `${environment.services.gateway}/internal/clients/${id}`,
      { params }
    );
  }

  /**
   * Obtener todos los clientes con caja de agua asignada
   * 1. Llama a /admin/clients/all?organizationId={orgId} para obtener lista de clientes
   * 2. Para cada cliente, llama a /internal/clients/{id}?organizationId={orgId} para obtener info completa con caja
   * 3. Filtra solo los que tienen waterBoxAssignment.status === "ACTIVE"
   */
  getClientsWithWaterBox(organizationId: string): Observable<ApiResponse<UserWithLocationResponse[]>> {
    return new Observable(observer => {
      // Paso 1: Obtener lista de todos los clientes usando endpoint admin
      this.getAllClients(organizationId).subscribe({
        next: async (response) => {
          if (response.success && response.data) {
            const clientsWithBoxes: UserWithLocationResponse[] = [];

            console.log(`📋 Total de clientes encontrados: ${response.data.length}`);

            // Paso 2: Para cada cliente, obtener su información completa con caja de agua
            for (const client of response.data) {
              try {
                const fullClientResponse = await this.getClientWithWaterBox(client.id, organizationId).toPromise();
                if (fullClientResponse?.success && fullClientResponse.data) {
                  const fullClient = fullClientResponse.data;
                  // Paso 3: Solo agregar si tiene caja de agua activa
                  if (fullClient.waterBoxAssignment && fullClient.waterBoxAssignment.status === 'ACTIVE') {
                    console.log(`✅ Cliente ${fullClient.userCode} tiene caja activa: ${fullClient.waterBoxAssignment.boxCode}`);
                    clientsWithBoxes.push(fullClient);
                  } else {
                    console.log(`⚠️ Cliente ${fullClient.userCode} sin caja de agua activa`);
                  }
                }
              } catch (error) {
                console.error(`❌ Error obteniendo info completa del cliente ${client.id}:`, error);
              }
            }

            console.log(`🎯 Total de clientes con caja de agua activa: ${clientsWithBoxes.length}`);

            observer.next({
              success: true,
              message: `${clientsWithBoxes.length} clientes con caja de agua encontrados`,
              data: clientsWithBoxes
            });
            observer.complete();
          } else {
            observer.error(new Error('No se pudieron obtener los clientes'));
          }
        },
        error: (error) => {
          console.error('❌ Error obteniendo lista de clientes:', error);
          observer.error(error);
        }
      });
    });
  }
}
