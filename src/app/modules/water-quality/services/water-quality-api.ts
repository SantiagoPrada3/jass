import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { QualityTest, QualityTestRequest, QualityTestResponse, TestingPoints } from '../models/quality-test.model';
import { ChlorineRecord, ChlorineRecordRequest } from '../models/chlorine-record.model';

@Injectable({
  providedIn: 'root'
})
export class WaterQualityApi {
  private readonly baseUrl = `${environment.services.gateway}`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los registros de análisis
   */
  getAllTests(): Observable<ApiResponse<QualityTestResponse[]>> {
    return this.http.get<ApiResponse<QualityTestResponse[]>>(`${this.baseUrl}/tests`);
  }

  /**
   * Obtener registros activos
   */
  getActiveTests(): Observable<ApiResponse<QualityTestResponse[]>> {
    return this.http.get<ApiResponse<QualityTestResponse[]>>(`${this.baseUrl}/active`);
  }

  /**
   * Obtener registros completados
   */
  getCompletedTests(): Observable<ApiResponse<QualityTestResponse[]>> {
    return this.http.get<ApiResponse<QualityTestResponse[]>>(`${this.baseUrl}/completed`);
  }

  /**
   * Obtener registro de análisis por ID
   */
  getTestById(id: string): Observable<ApiResponse<QualityTest>> {
    return this.http.get<ApiResponse<QualityTest>>(`${this.baseUrl}/${id}`);
  }

  // Obtener el listado 
  getAllQualityTests(): Observable<ApiResponse<QualityTest[]>> {
    return this.http.get<ApiResponse<QualityTest[]>>(`${this.baseUrl}/admin/quality/tests`);
  }

  getQualityTestById(id: string): Observable<ApiResponse<QualityTest>> {
    return this.http.get<ApiResponse<QualityTest>>(`${this.baseUrl}/admin/quality/tests/${id}`);
  }

  createQualityTest(qualityTest: QualityTestRequest): Observable<ApiResponse<QualityTest>> {
    console.log('Sending create request with data:', qualityTest);
    return this.http.post<any>(`${this.baseUrl}/admin/quality/tests`, qualityTest).pipe(
      // Transformar la respuesta del backend al formato esperado por el frontend
      tap(response => {
        console.log('Raw create response:', response);
        if (response && response.status === true) {
          // Normalizar la respuesta
          response.success = true;
          response.message = response.message || 'Análisis creado exitosamente';
          console.log('Normalized create response:', response);
        }
      }),
      catchError(error => {
        console.error('Error in createQualityTest:', error);
        throw error;
      })
    );
  }

  updateQualityTest(id: string, qualityTest: QualityTestRequest): Observable<ApiResponse<QualityTest>> {
    console.log('Sending update request for test:', id, 'with data:', qualityTest);
    return this.http.put<any>(`${this.baseUrl}/admin/quality/tests/${id}`, qualityTest).pipe(
      // Transformar la respuesta del backend al formato esperado por el frontend
      tap(response => {
        console.log('Raw update response:', response);
        if (response && response.status === true) {
          // Normalizar la respuesta
          response.success = true;
          response.message = response.message || 'Análisis actualizado exitosamente';
          console.log('Normalized update response:', response);
        }
      }),
      catchError(error => {
        console.error('Error in updateQualityTest:', error);
        throw error;
      })
    );
  }

  getAllTestingPointsByOrganizationId(userOrganizationId: string): Observable<ApiResponse<TestingPoints[]>> {
    return this.http.get<ApiResponse<TestingPoints[]>>(`${this.baseUrl}/admin/quality/sampling-points`);
  }

  // Chlorine Records
  getAllChlorineRecords(): Observable<ApiResponse<ChlorineRecord[]>> {
    return this.http.get<ApiResponse<ChlorineRecord[]>>(`${this.baseUrl}/admin/quality/daily-records`);
  }

  getChlorineRecordById(id: string): Observable<ApiResponse<ChlorineRecord>> {
    return this.http.get<ApiResponse<ChlorineRecord>>(`${this.baseUrl}/admin/quality/daily-records/${id}`);
  }

  createChlorineRecord(record: ChlorineRecordRequest): Observable<ApiResponse<ChlorineRecord>> {
    return this.http.post<ApiResponse<ChlorineRecord>>(`${this.baseUrl}/admin/quality/daily-records`, record);
  }

  updateChlorineRecord(id: string, record: ChlorineRecordRequest): Observable<ApiResponse<ChlorineRecord>> {
    return this.http.put<ApiResponse<ChlorineRecord>>(`${this.baseUrl}/admin/quality/daily-records/${id}`, record);
  }

  deleteChlorineRecord(id: string): Observable<ApiResponse<ChlorineRecord>> {
    return this.http.delete<ApiResponse<ChlorineRecord>>(`${this.baseUrl}/admin/quality/daily-records/${id}`);
  }

  // Testing Points
  getTestingPointsByOrganizationId(organizationId: string): Observable<ApiResponse<TestingPoints[]>> {
    return this.http.get<ApiResponse<TestingPoints[]>>(`${this.baseUrl}/admin/quality/sampling-points`);
  }

  getTestingPointById(id: string): Observable<ApiResponse<TestingPoints>> {
    return this.http.get<ApiResponse<TestingPoints>>(`${this.baseUrl}/admin/quality/sampling-points/${id}`);
  }

  createTestingPoint(testingPoint: TestingPoints): Observable<ApiResponse<TestingPoints>> {
    console.log('Sending create request with data:', testingPoint);
    // Log the raw data being sent
    console.log('Raw data being sent:', JSON.stringify(testingPoint, null, 2));
    return this.http.post<ApiResponse<TestingPoints>>(`${this.baseUrl}/admin/quality/sampling-points`, testingPoint).pipe(
      catchError(error => {
        console.error('Error response from server:', error);
        console.error('Request URL:', `${this.baseUrl}/admin/quality/sampling-points`);
        console.error('Request data:', testingPoint);
        throw error;
      })
    );
  }
  updateTestingPoint(id: string, testingPoint: TestingPoints): Observable<ApiResponse<TestingPoints>> {
    console.log('Sending update request for point:', id, 'with data:', testingPoint);
    // Log the raw data being sent
    console.log('Raw data being sent:', JSON.stringify(testingPoint, null, 2));
    return this.http.put<ApiResponse<TestingPoints>>(`${this.baseUrl}/admin/quality/sampling-points/${id}`, testingPoint).pipe(
      catchError(error => {
        console.error('Error response from server:', error);
        console.error('Request URL:', `${this.baseUrl}/admin/quality/sampling-points/${id}`);
        console.error('Request data:', testingPoint);
        throw error;
      })
    );
  }

  deleteTestingPoint(id: string): Observable<ApiResponse<TestingPoints>> {
    return this.http.delete<ApiResponse<TestingPoints>>(`${this.baseUrl}/admin/quality/sampling-points/${id}`);
  }

  // Zones
  getZonesByOrganization(organizationId: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/admin/zones`, { params });
  }

  // Streets 
  getStreetsByZone(zoneId: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (zoneId) {
      params = params.set('zoneId', zoneId);
    }
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/admin/streets`, { params });
  }
}