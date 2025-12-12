import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  IncidentResolution, 
  CreateIncidentResolutionRequest, 
  UpdateIncidentResolutionRequest 
} from '../models/incident-resolution.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentResolutionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/incident-resolutions';
  

  /**
   * Obtener todas las resoluciones
   */
  getAllResolutions(): Observable<IncidentResolution[]> {
    return this.http.get<IncidentResolution[]>(this.apiUrl);
  }

  /**
   * Obtener resolución por ID
   */
  getResolutionById(id: string): Observable<IncidentResolution> {
    return this.http.get<IncidentResolution>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener resolución por ID de incidencia
   */
  getResolutionByIncidentId(incidentId: string): Observable<IncidentResolution> {
    return this.http.get<IncidentResolution>(`${this.apiUrl}/incident/${incidentId}`);
  }

  /**
   * Crear una nueva resolución
   */
  createResolution(resolution: CreateIncidentResolutionRequest): Observable<IncidentResolution> {
    return this.http.post<IncidentResolution>(this.apiUrl, resolution);
  }

  /**
   * Actualizar una resolución existente
   */
  updateResolution(id: string, resolution: UpdateIncidentResolutionRequest): Observable<IncidentResolution> {
    return this.http.put<IncidentResolution>(`${this.apiUrl}/${id}`, resolution);
  }

  /**
   * Eliminar una resolución
   */
  deleteResolution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
