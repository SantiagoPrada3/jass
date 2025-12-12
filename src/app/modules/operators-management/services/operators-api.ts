import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  Operator,
  CreateOperatorRequest,
  UpdateOperatorPatchRequest,
  OperatorCreationResponse,
  OperatorStatus
} from '../models/operator.model';

@Injectable({
  providedIn: 'root'
})
export class OperatorsApi {
  private readonly baseUrl = `${environment.services.gateway}/admin`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los operadores de la organización
   */
  getAllOperators(organizationId: string): Observable<ApiResponse<Operator[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<Operator[]>>(`${this.baseUrl}/operators`, { params });
  }

  /**
   * Obtener operadores activos solamente
   */
  getActiveOperators(organizationId: string): Observable<ApiResponse<Operator[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<Operator[]>>(`${this.baseUrl}/operators/active`, { params });
  }

  /**
   * Obtener operadores inactivos solamente
   */
  getInactiveOperators(organizationId: string): Observable<ApiResponse<Operator[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<Operator[]>>(`${this.baseUrl}/operators/inactive`, { params });
  }

  /**
   * Obtener operador específico por ID
   */
  getOperator(id: string): Observable<ApiResponse<Operator>> {
    return this.http.get<ApiResponse<Operator>>(`${this.baseUrl}/operators/${id}`);
  }

  /**
   * Crear nuevo operador
   */
  createOperator(request: CreateOperatorRequest): Observable<ApiResponse<OperatorCreationResponse>> {
    return this.http.post<ApiResponse<OperatorCreationResponse>>(`${this.baseUrl}/operators`, request);
  }

  /**
   * Actualizar operador (PATCH)
   */
  updateOperator(id: string, request: UpdateOperatorPatchRequest): Observable<ApiResponse<Operator>> {
    return this.http.patch<ApiResponse<Operator>>(`${this.baseUrl}/operators/${id}`, request);
  }

  /**
   * Cambiar estado del operador
   */
  changeOperatorStatus(id: string, status: OperatorStatus): Observable<ApiResponse<Operator>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<Operator>>(`${this.baseUrl}/operators/${id}/status`, null, { params });
  }

  /**
   * Eliminar operador
   */
  deleteOperator(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/operators/${id}`);
  }

  /**
   * Restaurar operador eliminado
   */
  restoreOperator(id: string): Observable<ApiResponse<Operator>> {
    return this.http.put<ApiResponse<Operator>>(`${this.baseUrl}/operators/${id}/restore`, null);
  }
}
