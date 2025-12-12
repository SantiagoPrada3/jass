import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IncidentType, CreateIncidentTypeRequest, UpdateIncidentTypeRequest, IncidentTypeResponse } from '../models/incident-type.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentTypesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/incident-types';

  /**
   * Obtiene todos los tipos de incidencias
   */
  getAllIncidentTypes(): Observable<IncidentType[]> {
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
        console.warn('Respuesta inesperada de la API:', response);
        return [];
      })
    );
  }

  /**
   * Obtiene tipos de incidencias con paginación
   */
  getIncidentTypes(page: number = 0, size: number = 10, search?: string): Observable<IncidentTypeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<IncidentTypeResponse>(this.baseUrl + '/paginated', { params });
  }

  /**
   * Obtiene un tipo de incidencia por ID
   */
  getIncidentTypeById(id: string): Observable<IncidentType> {
    return this.http.get<IncidentType>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un nuevo tipo de incidencia
   */
  createIncidentType(incidentType: CreateIncidentTypeRequest): Observable<IncidentType> {
    return this.http.post<IncidentType>(this.baseUrl, incidentType);
  }

  /**
   * Actualiza un tipo de incidencia existente
   */
  updateIncidentType(id: string, incidentType: UpdateIncidentTypeRequest): Observable<IncidentType> {
    return this.http.put<IncidentType>(`${this.baseUrl}/${id}`, incidentType);
  }

  /**
   * Elimina un tipo de incidencia (soft delete - cambia estado a INACTIVE)
   */
  deleteIncidentType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Restaura un tipo de incidencia (cambia estado a ACTIVE)
   */
  restoreIncidentType(id: string): Observable<IncidentType> {
    return this.http.patch<IncidentType>(`${this.baseUrl}/${id}/restore`, {});
  }

  /**
   * Cambia el estado de un tipo de incidencia (ACTIVE/INACTIVE)
   */
  toggleIncidentTypeStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<IncidentType> {
    return this.http.patch<IncidentType>(`${this.baseUrl}/${id}/status`, { status });
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