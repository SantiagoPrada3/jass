import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { Fare, FareCreateRequest } from '../models/rates.model';
import { DistributionScheduleCreateRequest, Schedule } from '../models/schedules.model';
import { ProgramStatus, Status } from '../models/api-response.model';
import { DistributionRouteCreateRequest, Route } from '../models/routes.model';
import { DistributionProgram, DistributionProgramCreateRequest } from '../models/distribution.model';

@Injectable({
  providedIn: 'root'
})
export class DistributionApi {
  saveF(createRequest: FareCreateRequest) {
    throw new Error('Method not implemented.');
  }
  private readonly baseUrl = `${environment.services.gateway}/internal`;

  constructor(private http: HttpClient) { }

  // DASHBOARD API
  getDashboardStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/dashboard/stats`);
  }

  getDashboardSummary(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/dashboard/summary`);
  }

  // SCHEDULES API
  getAllSchedules(organizationId?: string): Observable<ApiResponse<Schedule[]>> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    console.log(`[DistributionApi] getAllSchedules - organizationId: ${organizationId}`);
    return this.http.get<ApiResponse<Schedule[]>>(`${this.baseUrl}/schedule`, { params }).pipe(
      tap({
        next: (response: ApiResponse<Schedule[]>) => console.log(`[DistributionApi] getAllSchedules - response:`, response),
        error: (error: any) => console.error(`[DistributionApi] getAllSchedules - error:`, error)
      })
    );
  }

  getActiveSchedules(organizationId?: string): Observable<ApiResponse<Schedule[]>> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    console.log('[DistributionApi] getActiveSchedules - URL:', `${this.baseUrl}/schedule/active`);
    console.log('[DistributionApi] getActiveSchedules - params:', params.toString());
    return this.http.get<ApiResponse<Schedule[]>>(`${this.baseUrl}/schedule/active`, { params }).pipe(
      tap({
        next: (response: ApiResponse<Schedule[]>) => {
          console.log('[DistributionApi] getActiveSchedules - response:', response);
          console.log('[DistributionApi] getActiveSchedules - data length:', response.data?.length);
        },
        error: (error: any) => {
          console.error('[DistributionApi] getActiveSchedules - error:', error);
        }
      })
    );
  }

  getScheduleById(id: string): Observable<ApiResponse<Schedule>> {
    return this.http.get<ApiResponse<Schedule>>(`${this.baseUrl}/schedule/${id}`);
  }

  createSchedule(schedule: DistributionScheduleCreateRequest): Observable<ApiResponse<Schedule>> {
    console.log('[DistributionApi] === INICIANDO CREACIÓN DE HORARIO ===');
    console.log('[DistributionApi] Datos de creación:', schedule);
    console.log('[DistributionApi] URL completa:', `${this.baseUrl}/schedule`);

    // Verificar que el objeto schedule no sea null o undefined
    if (!schedule) {
      console.error('[DistributionApi] ERROR: Objeto de horario es null o undefined');
      throw new Error('Datos de horario son requeridos para la creación');
    }

    console.log('[DistributionApi] Realizando llamada POST...');

    return this.http.post<ApiResponse<Schedule>>(`${this.baseUrl}/schedule`, schedule).pipe(
      tap({
        next: (response: ApiResponse<Schedule>) => {
          console.log('[DistributionApi] === RESPUESTA DE CREACIÓN RECIBIDA ===');
          console.log('[DistributionApi] Respuesta exitosa:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] === ERROR EN LA CREACIÓN ===');
          console.error('[DistributionApi] Error completo:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  updateSchedule(id: string, schedule: DistributionScheduleCreateRequest): Observable<ApiResponse<Schedule>> {
    console.log('[DistributionApi] === INICIANDO ACTUALIZACIÓN DE HORARIO ===');
    console.log('[DistributionApi] ID del horario:', id);
    console.log('[DistributionApi] Datos de actualización:', schedule);
    console.log('[DistributionApi] URL completa:', `${this.baseUrl}/schedule/${id}`);

    // Verificar que el ID no sea null o undefined
    if (!id) {
      console.error('[DistributionApi] ERROR: ID de horario es null o undefined');
      throw new Error('ID de horario es requerido para la actualización');
    }

    // Verificar que el objeto schedule no sea null o undefined
    if (!schedule) {
      console.error('[DistributionApi] ERROR: Objeto de horario es null o undefined');
      throw new Error('Datos de horario son requeridos para la actualización');
    }

    // Verificar tipos de datos en el objeto schedule
    console.log('[DistributionApi] Verificando tipos de datos en schedule:');
    console.log('[DistributionApi]   organizationId:', typeof schedule.organizationId, schedule.organizationId);
    console.log('[DistributionApi]   zoneId:', typeof schedule.zoneId, schedule.zoneId);
    console.log('[DistributionApi]   streetId:', typeof schedule.streetId, schedule.streetId);
    console.log('[DistributionApi]   scheduleName:', typeof schedule.scheduleName, schedule.scheduleName);
    console.log('[DistributionApi]   daysOfWeek:', typeof schedule.daysOfWeek, schedule.daysOfWeek);
    console.log('[DistributionApi]   startTime:', typeof schedule.startTime, schedule.startTime);
    console.log('[DistributionApi]   endTime:', typeof schedule.endTime, schedule.endTime);
    console.log('[DistributionApi]   durationHours:', typeof schedule.durationHours, schedule.durationHours);

    // Verificar si daysOfWeek es un array
    if (!Array.isArray(schedule.daysOfWeek)) {
      console.error('[DistributionApi] ERROR: daysOfWeek no es un array válido');
      throw new Error('daysOfWeek debe ser un array de strings');
    }

    console.log('[DistributionApi] Realizando llamada PUT...');

    return this.http.put<ApiResponse<Schedule>>(`${this.baseUrl}/schedule/${id}`, schedule).pipe(
      tap({
        next: (response: ApiResponse<Schedule>) => {
          console.log('[DistributionApi] === RESPUESTA DE ACTUALIZACIÓN RECIBIDA ===');
          console.log('[DistributionApi] Respuesta exitosa:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] === ERROR EN LA ACTUALIZACIÓN ===');
          console.error('[DistributionApi] Error completo:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] Mensaje de error:', error.message);
          }

          // Registrar el cuerpo de la solicitud que causó el error
          console.error('[DistributionApi] Cuerpo de la solicitud que causó error:', schedule);

          // Manejo específico para errores 500
          if (error.status === 500) {
            console.error('[DistributionApi] ERROR 500: Error interno del servidor');
            console.error('[DistributionApi] Posibles causas:');
            console.error('[DistributionApi] 1. Formato de datos incorrecto');
            console.error('[DistributionApi] 2. Validación fallida en el backend');
            console.error('[DistributionApi] 3. Problemas de conexión a la base de datos');
            console.error('[DistributionApi] 4. Excepción no controlada en el servidor');
          }
        }
      })
    );
  }

  changeScheduleStatus(id: string, status: Status): Observable<ApiResponse<Schedule>> {
    console.log('[DistributionApi] changeScheduleStatus - id:', id, 'status:', status);

    // Determinar el endpoint correcto según el estado
    let endpoint = '';
    if (status === Status.ACTIVE) {
      endpoint = `${this.baseUrl}/schedule/activate/${id}`;
      console.log('[DistributionApi] changeScheduleStatus - URL (activar):', endpoint);
    } else if (status === Status.INACTIVE) {
      endpoint = `${this.baseUrl}/schedule/deactivate/${id}`;
      console.log('[DistributionApi] changeScheduleStatus - URL (desactivar):', endpoint);
    } else {
      // Para otros estados, usar el endpoint original
      const params = new HttpParams().set('status', status);
      endpoint = `${this.baseUrl}/schedule/${id}/status`;
      console.log('[DistributionApi] changeScheduleStatus - URL (otro):', endpoint);
      return this.http.patch<ApiResponse<Schedule>>(endpoint, null, { params }).pipe(
        tap({
          next: (response: ApiResponse<Schedule>) => {
            console.log('[DistributionApi] changeScheduleStatus - response:', response);
          },
          error: (error: any) => {
            console.error('[DistributionApi] changeScheduleStatus - error:', error);

            // Registrar detalles específicos del error
            if (error.status) {
              console.error('[DistributionApi] changeScheduleStatus - Código de estado:', error.status);
            }
            if (error.statusText) {
              console.error('[DistributionApi] changeScheduleStatus - Texto de estado:', error.statusText);
            }
            if (error.url) {
              console.error('[DistributionApi] changeScheduleStatus - URL de la solicitud:', error.url);
            }
            if (error.error) {
              console.error('[DistributionApi] changeScheduleStatus - Cuerpo del error:', error.error);
            }
            if (error.message) {
              console.error('[DistributionApi] changeScheduleStatus - Mensaje de error:', error.message);
            }
          }
        })
      );
    }

    // Para activar/desactivar, usar método PATCH sin parámetros
    return this.http.patch<ApiResponse<Schedule>>(endpoint, null).pipe(
      tap({
        next: (response: ApiResponse<Schedule>) => {
          console.log('[DistributionApi] changeScheduleStatus - response:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] changeScheduleStatus - error:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] changeScheduleStatus - Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] changeScheduleStatus - Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] changeScheduleStatus - URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] changeScheduleStatus - Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] changeScheduleStatus - Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  deleteSchedule(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/schedule/${id}`);
  }

  // ROUTES API
  getAllRoutes(organizationId?: string): Observable<ApiResponse<Route[]>> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    return this.http.get<ApiResponse<Route[]>>(`${this.baseUrl}/route`, { params });
  }

  getActiveRoutes(organizationId?: string): Observable<ApiResponse<Route[]>> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    console.log('[DistributionApi] getActiveRoutes - URL:', `${this.baseUrl}/route/active`);
    console.log('[DistributionApi] getActiveRoutes - params:', params.toString());
    return this.http.get<ApiResponse<Route[]>>(`${this.baseUrl}/route/active`, { params }).pipe(
      tap({
        next: (response: ApiResponse<Route[]>) => {
          console.log('[DistributionApi] getActiveRoutes - response:', response);
          console.log('[DistributionApi] getActiveRoutes - data length:', response.data?.length);
        },
        error: (error: any) => {
          console.error('[DistributionApi] getActiveRoutes - error:', error);
        }
      })
    );
  }

  getRouteById(id: string): Observable<ApiResponse<Route>> {
    return this.http.get<ApiResponse<Route>>(`${this.baseUrl}/route/${id}`);
  }

  createRoute(route: DistributionRouteCreateRequest): Observable<ApiResponse<Route>> {
    return this.http.post<ApiResponse<Route>>(`${this.baseUrl}/route`, route);
  }

  updateRoute(id: string, route: DistributionRouteCreateRequest): Observable<ApiResponse<Route>> {
    return this.http.put<ApiResponse<Route>>(`${this.baseUrl}/route/${id}`, route);
  }

  changeRouteStatus(id: string, status: Status): Observable<ApiResponse<Route>> {
    console.log('[DistributionApi] changeRouteStatus - id:', id, 'status:', status);

    // Determinar el endpoint correcto según el estado
    let endpoint = '';
    if (status === Status.ACTIVE) {
      endpoint = `${this.baseUrl}/route/activate/${id}`;
      console.log('[DistributionApi] changeRouteStatus - URL (activar):', endpoint);
    } else if (status === Status.INACTIVE) {
      endpoint = `${this.baseUrl}/route/deactivate/${id}`;
      console.log('[DistributionApi] changeRouteStatus - URL (desactivar):', endpoint);
    } else {
      // Para otros estados, usar el endpoint original
      const params = new HttpParams().set('status', status);
      endpoint = `${this.baseUrl}/route/${id}/status`;
      console.log('[DistributionApi] changeRouteStatus - URL (otro):', endpoint);
      return this.http.patch<ApiResponse<Route>>(endpoint, null, { params }).pipe(
        tap({
          next: (response: ApiResponse<Route>) => {
            console.log('[DistributionApi] changeRouteStatus - response:', response);
          },
          error: (error: any) => {
            console.error('[DistributionApi] changeRouteStatus - error:', error);

            // Registrar detalles específicos del error
            if (error.status) {
              console.error('[DistributionApi] changeRouteStatus - Código de estado:', error.status);
            }
            if (error.statusText) {
              console.error('[DistributionApi] changeRouteStatus - Texto de estado:', error.statusText);
            }
            if (error.url) {
              console.error('[DistributionApi] changeRouteStatus - URL de la solicitud:', error.url);
            }
            if (error.error) {
              console.error('[DistributionApi] changeRouteStatus - Cuerpo del error:', error.error);
            }
            if (error.message) {
              console.error('[DistributionApi] changeRouteStatus - Mensaje de error:', error.message);
            }
          }
        })
      );
    }

    // Para activar/desactivar, usar método PATCH sin parámetros
    return this.http.patch<ApiResponse<Route>>(endpoint, null).pipe(
      tap({
        next: (response: ApiResponse<Route>) => {
          console.log('[DistributionApi] changeRouteStatus - response:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] changeRouteStatus - error:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] changeRouteStatus - Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] changeRouteStatus - Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] changeRouteStatus - URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] changeRouteStatus - Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] changeRouteStatus - Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  deleteRoute(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/route/${id}`);
  }

  // DISTRIBUTION PROGRAMS API
  getAllDistributionPrograms(organizationId?: string, includeDeleted: boolean = false): Observable<ApiResponse<DistributionProgram[]>> {
    let params = new HttpParams();

    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }

    // Si se solicita incluir programas eliminados, añadir el parámetro
    if (includeDeleted) {
      params = params.set('includeDeleted', 'true');
    }

    console.log('[DistributionApi] getAllDistributionPrograms - URL:', `${this.baseUrl}/program`);
    console.log('[DistributionApi] getAllDistributionPrograms - params:', params.toString());

    return this.http.get<ApiResponse<DistributionProgram[]>>(`${this.baseUrl}/program`, { params }).pipe(
      tap({
        next: (response: ApiResponse<DistributionProgram[]>) => {
          console.log('[DistributionApi] getAllDistributionPrograms - response:', response);
          console.log('[DistributionApi] getAllDistributionPrograms - success:', response.success);
          console.log('[DistributionApi] getAllDistributionPrograms - status:', response.status);
          console.log('[DistributionApi] getAllDistributionPrograms - data length:', response.data?.length);
        },
        error: (error: any) => {
          console.error('[DistributionApi] getAllDistributionPrograms - error:', error);
          if (error.status) {
            console.error('[DistributionApi] getAllDistributionPrograms - Código de estado:', error.status);
          }
          if (error.error) {
            console.error('[DistributionApi] getAllDistributionPrograms - Cuerpo del error:', error.error);
          }
        }
      })
    );
  }

  getEnrichedDistributionPrograms(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/program/enriched`);
  }

  getDistributionProgramById(id: string): Observable<ApiResponse<DistributionProgram>> {
    return this.http.get<ApiResponse<DistributionProgram>>(`${this.baseUrl}/program/${id}`);
  }

  createDistributionProgram(program: DistributionProgramCreateRequest): Observable<ApiResponse<DistributionProgram>> {
    console.log('[DistributionApi] === INICIANDO CREACIÓN DE PROGRAMA ===');
    console.log('[DistributionApi] Datos de creación:', program);
    console.log('[DistributionApi] URL completa:', `${this.baseUrl}/program`);

    return this.http.post<ApiResponse<DistributionProgram>>(`${this.baseUrl}/program`, program).pipe(
      tap({
        next: (response: ApiResponse<DistributionProgram>) => {
          console.log('[DistributionApi] === RESPUESTA DE CREACIÓN RECIBIDA ===');
          console.log('[DistributionApi] Respuesta completa:', response);
          console.log('[DistributionApi] Success:', response.success);
          console.log('[DistributionApi] Status:', response.status);
          console.log('[DistributionApi] Message:', response.message);
          console.log('[DistributionApi] Data:', response.data);
        },
        error: (error: any) => {
          console.error('[DistributionApi] === ERROR EN LA CREACIÓN ===');
          console.error('[DistributionApi] Error completo:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  updateDistributionProgram(id: string, program: DistributionProgramCreateRequest): Observable<ApiResponse<DistributionProgram>> {
    console.log('[DistributionApi] updateDistributionProgram - id:', id);
    console.log('[DistributionApi] updateDistributionProgram - data:', program);
    console.log('[DistributionApi] updateDistributionProgram - actualStartTime type:', typeof program.actualStartTime);
    console.log('[DistributionApi] updateDistributionProgram - actualEndTime type:', typeof program.actualEndTime);

    const request$ = this.http.put<ApiResponse<DistributionProgram>>(`${this.baseUrl}/program/${id}`, program);

    return request$.pipe(
      tap({
        next: (response: ApiResponse<DistributionProgram>) => {
          console.log('[DistributionApi] updateDistributionProgram - response:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] updateDistributionProgram - error:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] updateDistributionProgram - Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] updateDistributionProgram - Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] updateDistributionProgram - URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] updateDistributionProgram - Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] updateDistributionProgram - Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  changeDistributionProgramStatus(id: string, status: ProgramStatus): Observable<ApiResponse<DistributionProgram>> {
    console.log('[DistributionApi] changeDistributionProgramStatus - id:', id, 'status:', status);

    // Determinar el endpoint correcto según el estado
    let endpoint = '';
    if (status === ProgramStatus.CANCELLED) {
      endpoint = `${this.baseUrl}/program/deactivate/${id}`;
      console.log('[DistributionApi] changeDistributionProgramStatus - URL (desactivar):', endpoint);
    } else if (status === ProgramStatus.PLANNED) {
      endpoint = `${this.baseUrl}/program/activate/${id}`;
      console.log('[DistributionApi] changeDistributionProgramStatus - URL (activar):', endpoint);
    } else {
      // Para otros estados, usar el endpoint original con parámetros
      const params = new HttpParams().set('status', status);
      endpoint = `${this.baseUrl}/program/${id}/status`;
      console.log('[DistributionApi] changeDistributionProgramStatus - URL (otro):', endpoint);
      return this.http.patch<ApiResponse<DistributionProgram>>(endpoint, null, { params }).pipe(
        tap({
          next: (response: ApiResponse<DistributionProgram>) => {
            console.log('[DistributionApi] changeDistributionProgramStatus - response:', response);
          },
          error: (error: any) => {
            console.error('[DistributionApi] changeDistributionProgramStatus - error:', error);

            // Registrar detalles específicos del error
            if (error.status) {
              console.error('[DistributionApi] changeDistributionProgramStatus - Código de estado:', error.status);
            }
            if (error.statusText) {
              console.error('[DistributionApi] changeDistributionProgramStatus - Texto de estado:', error.statusText);
            }
            if (error.url) {
              console.error('[DistributionApi] changeDistributionProgramStatus - URL de la solicitud:', error.url);
            }
            if (error.error) {
              console.error('[DistributionApi] changeDistributionProgramStatus - Cuerpo del error:', error.error);
            }
            if (error.message) {
              console.error('[DistributionApi] changeDistributionProgramStatus - Mensaje de error:', error.message);
            }
          }
        })
      );
    }

    // Para cancelar/activar, usar método PATCH sin parámetros
    return this.http.patch<ApiResponse<DistributionProgram>>(endpoint, null).pipe(
      tap({
        next: (response: ApiResponse<DistributionProgram>) => {
          console.log('[DistributionApi] changeDistributionProgramStatus - response:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] changeDistributionProgramStatus - error:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] changeDistributionProgramStatus - Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] changeDistributionProgramStatus - Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] changeDistributionProgramStatus - URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] changeDistributionProgramStatus - Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] changeDistributionProgramStatus - Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  // Método para eliminación física de programas
  deleteDistributionProgramPhysically(id: string): Observable<ApiResponse<void>> {
    // Usar el endpoint proporcionado: /admin/program/physical/*
    const endpoint = `${this.baseUrl}/program/physical/${id}`;
    console.log('[DistributionApi] deleteDistributionProgramPhysically - URL:', endpoint);
    return this.http.delete<ApiResponse<void>>(endpoint).pipe(
      tap({
        next: (response: ApiResponse<void>) => {
          console.log('[DistributionApi] deleteDistributionProgramPhysically - response:', response);
        },
        error: (error: any) => {
          console.error('[DistributionApi] deleteDistributionProgramPhysically - error:', error);

          // Registrar detalles específicos del error
          if (error.status) {
            console.error('[DistributionApi] deleteDistributionProgramPhysically - Código de estado:', error.status);
          }
          if (error.statusText) {
            console.error('[DistributionApi] deleteDistributionProgramPhysically - Texto de estado:', error.statusText);
          }
          if (error.url) {
            console.error('[DistributionApi] deleteDistributionProgramPhysically - URL de la solicitud:', error.url);
          }
          if (error.error) {
            console.error('[DistributionApi] deleteDistributionProgramPhysically - Cuerpo del error:', error.error);
          }
          if (error.message) {
            console.error('[DistributionApi] deleteDistributionProgramPhysically - Mensaje de error:', error.message);
          }
        }
      })
    );
  }

  deleteDistributionProgram(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/program/${id}`);
  }

}








