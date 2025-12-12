import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Incident, CreateIncidentRequest, UpdateIncidentRequest, IncidentResponse, User } from '../models/incident.model';
import { AuthService } from '../../../core/auth/services/auth';

@Injectable({
  providedIn: 'root'
})
export class IncidentsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = 'https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/incidents';
  private readonly usersBaseUrl = `${environment.services.gateway}/admin`;

  /**
   * Obtiene todas las incidencias
   */
  getAllIncidents(): Observable<Incident[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map(response => {
        // Si la respuesta es un array, devolverlo directamente
        if (Array.isArray(response)) {
          return response;
        }
        // Si la respuesta tiene una propiedad 'data' que es un array, devolverla
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Si no hay datos válidos, devolver un array vacío
        console.warn('Respuesta inesperada de la API de incidencias:', response);
        return [];
      })
    );
  }

  /**
   * Obtiene incidencias con paginación
   */
  getIncidents(page: number = 0, size: number = 10, search?: string): Observable<IncidentResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<IncidentResponse>(this.baseUrl + '/paginated', { params });
  }

  /**
   * Obtiene una incidencia por ID
   */
  getIncidentById(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea una nueva incidencia
   */
  createIncident(incident: CreateIncidentRequest): Observable<Incident> {
    return this.http.post<Incident>(this.baseUrl, incident);
  }

  /**
   * Actualiza una incidencia existente
   */
  updateIncident(id: string, incident: UpdateIncidentRequest): Observable<Incident> {
    return this.http.put<Incident>(`${this.baseUrl}/${id}`, incident);
  }

  /**
   * Elimina una incidencia (soft delete - cambia recordStatus a INACTIVE)
   */
  deleteIncident(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Restaura una incidencia (cambia recordStatus a ACTIVE)
   */
  restoreIncident(id: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/restore`, {});
  }

  /**
   * Cambia el estado de una incidencia
   */
  updateIncidentStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/status`, { status });
  }

  /**
   * Asigna una incidencia a un usuario
   */
  assignIncident(id: string, assignedToUserId: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/assign`, { assignedToUserId });
  }

  /**
   * Resuelve una incidencia
   */
  resolveIncident(id: string, resolvedByUserId: string, resolutionNotes?: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/resolve`, {
      resolvedByUserId,
      resolutionNotes
    });
  }

  // === MÉTODOS DE USUARIOS ===

  /**
   * Obtiene todos los clientes de la organización
   */
  getUsers(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      throw new Error('No se encontró el ID de organización del usuario');
    }
    const params = new HttpParams().set('organizationId', currentUser.organizationId);
    return this.http.get<any>(`${this.usersBaseUrl}/clients/all`, { params });
  }

  /**
   * Obtiene clientes activos (para asignar a incidencias)
   */
  getActiveUsers(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      throw new Error('No se encontró el ID de organización del usuario');
    }
    const params = new HttpParams().set('organizationId', currentUser.organizationId);
    return this.http.get<any>(`${this.usersBaseUrl}/clients/active`, { params });
  }

  /**
   * Obtiene un cliente específico por ID
   */
  getUserById(id: string): Observable<any> {
    return this.http.get<any>(`${this.usersBaseUrl}/clients/${id}`);
  }

  /**
   * Busca clientes por término
   */
  searchUsers(term: string): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      throw new Error('No se encontró el ID de organización del usuario');
    }
    const params = new HttpParams()
      .set('organizationId', currentUser.organizationId)
      .set('search', term);
    return this.http.get<any>(`${this.usersBaseUrl}/clients/all`, { params });
  }

  // === MÉTODOS PARA OPERADORES (USUARIOS INTERNOS) ===

  /**
   * Obtiene todos los operadores de la organización
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/operators?organizationId={organizationId}
   */
  getAllOperators(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      throw new Error('No se encontró el ID de organización del usuario');
    }
    const params = new HttpParams().set('organizationId', currentUser.organizationId);
    return this.http.get<any>(`${this.usersBaseUrl}/operators`, { params });
  }

  /**
   * Obtiene información de un operador específico por ID
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/operators/{id}
   */
  getOperatorById(id: string): Observable<any> {
    return this.http.get<any>(`${this.usersBaseUrl}/operators/${id}`);
  }

  // === MÉTODOS PARA PRODUCTOS/MATERIALES ===

  /**
   * Obtiene todos los productos/materiales del inventario
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/materials?organizationId={organizationId}
   */
  getProducts(organizationId?: string): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const orgId = organizationId || currentUser?.organizationId;
    
    if (!orgId) {
      throw new Error('No se encontró el ID de organización');
    }
    
    const params = new HttpParams().set('organizationId', orgId);
    return this.http.get<any>(`${this.usersBaseUrl}/materials`, { params });
  }

  /**
   * Obtiene un producto específico por ID
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/materials/{id}
   */
  getProductById(productId: string): Observable<any> {
    return this.http.get<any>(`${this.usersBaseUrl}/materials/${productId}`);
  }

  /**
   * Obtiene productos activos del inventario
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/materials/status/ACTIVO?organizationId={organizationId}
   */
  getActiveProducts(organizationId?: string): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const orgId = organizationId || currentUser?.organizationId;
    
    if (!orgId) {
      throw new Error('No se encontró el ID de organización');
    }
    
    const params = new HttpParams().set('organizationId', orgId);
    return this.http.get<any>(`${this.usersBaseUrl}/materials/status/ACTIVO`, { params });
  }

  /**
   * Obtiene la información de la organización incluyendo el nombre
   * URL: https://lab.vallegrande.edu.pe/jass/ms-users/internal/organizations/{organizationId}/admins
   */
  getOrganizationInfo(organizationId: string): Observable<any> {
    const url = `${environment.services.gateway}/internal/organizations/${organizationId}/admins`;
    return this.http.get<any>(url);
  }

  /**
   * Obtiene la información detallada de la organización incluyendo el logo
   * URL: https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/{organizationId}
   */
  getOrganizationDetails(organizationId: string): Observable<any> {
    const url = `${environment.services.gateway}/admin/organization/${organizationId}`;
    return this.http.get<any>(url);
  }
}