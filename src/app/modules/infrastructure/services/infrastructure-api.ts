import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap, filter, take } from 'rxjs/operators';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { WaterBox, WaterBoxAssignment, WaterBoxTransfer } from '../models/maintenance.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/services/auth';

export interface UserClient {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BoxService {
  private infraBase = ((environment as any).services?.gateway || '').replace(/\/+$/, '') + '/admin';
  private waterBoxBaseUrl = `${this.infraBase}/water-boxes`;
  private waterBoxAssignmentBaseUrl = `${this.infraBase}/water-box-assignments`;
  private waterBoxTransferBaseUrl = `${this.infraBase}/water-box-transfers`;

  // Base URL for user microservice (use relative path so dev proxy can forward requests)
  private userBaseUrl = '/jass/ms-users/internal';

  constructor(private http: HttpClient, private authService?: AuthService | null) {
    // No construir la URL de clientes en el constructor porque el usuario puede no estar cargado aún.
  }

  getClients(): Observable<UserClient[]> {
    const buildAndCall = (orgId?: string) => {
      // Llamar directamente al gateway admin de ms-users para no depender de UsersApi
      const gateway = (environment as any).services?.gateway || '';
      const endpoint = `${gateway}/admin/clients/all`;
      const params = orgId ? new HttpParams().set('organizationId', orgId) : undefined;
      return this.http.get<any>(endpoint, params ? { params } : {}).pipe(
        map(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? res?.clients ?? res?.items ?? res?.content ?? []);
          return (list || []).map((u: any) => {
            const rawId = u.id ?? u.userId ?? u._id ?? u.clientId ?? u.userCode;
            const idStr = rawId != null ? String(rawId) : '';
            const firstName = u.firstName ?? u.givenName ?? u.first_name ?? u.fullName ?? u.name ?? u.username ?? '';
            const lastName = u.lastName ?? u.familyName ?? u.last_name ?? '';
            const username = u.username ?? u.userName ?? u.email ?? '';
            const display = firstName ? (firstName + (lastName ? (' ' + lastName) : '')) : (username || '');
            return {
              id: idStr,
              username,
              firstName,
              lastName,
              displayName: display
            } as UserClient;
          });
        }),
        catchError((err) => {
          console.error('Error fetching clients for org', orgId, err);
          return of([] as UserClient[]);
        })
      );
    };

    // Intentos para obtener organizationId en orden: getCurrentUser(), authState$, localStorage
    const quickOrg = this.authService?.getCurrentUser?.()?.organizationId ?? null;
    if (quickOrg) {
      return buildAndCall(quickOrg);
    }

    if (this.authService && (this.authService as any).authState$) {
      return (this.authService as any).authState$.pipe(
        filter((s: any) => !!s?.user && !!s.user.organizationId),
        take(1),
        switchMap((s: any) => buildAndCall(s.user.organizationId)
        )
      );
    }

    // Intentar leer del localStorage (clave usada por AuthService)
    try {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedOrg = parsed?.organizationId ?? parsed?.orgId ?? parsed?.organization?.id ?? null;
        if (storedOrg) {
          console.debug('getClients: using organizationId from localStorage', storedOrg);
          return buildAndCall(storedOrg);
        }
      }
    } catch (e) {
      console.debug('getClients: error parsing localStorage user_info', e);
    }

    // Como último recurso, intentar la ruta pública /clients sin organizationId
    console.debug('getClients: no organizationId available — calling generic /clients endpoint as fallback');
    return buildAndCall();
  }

  /** Obtener solo clientes activos (preferir UsersApi.getActiveClients, fallback a endpoint /clients/active o filtrado) */
  getActiveClients(): Observable<UserClient[]> {
    const orgId = this.authService?.getCurrentUser?.()?.organizationId ?? null;
    // Llamar directamente al gateway admin de ms-users para clientes activos
    const gateway = (environment as any).services?.gateway || '';
    const endpoint = `${gateway}/admin/clients/active`;
    const params = orgId ? new HttpParams().set('organizationId', orgId) : undefined;
    return this.http.get<any>(endpoint, params ? { params } : {}).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.clients ?? res?.items ?? res?.content ?? []);
        return (list || []).map((u: any) => {
          const rawId = u.id ?? u.userId ?? u._id ?? u.clientId ?? u.userCode;
          const idStr = rawId != null ? String(rawId) : '';
          const firstName = u.firstName ?? u.givenName ?? u.first_name ?? u.fullName ?? u.name ?? '';
          const lastName = u.lastName ?? u.familyName ?? u.last_name ?? '';
          const username = u.username ?? u.userName ?? u.email ?? u.userCode ?? '';
          const display = firstName ? (firstName + (lastName ? (' ' + lastName) : '')) : (username || '');
          return { id: idStr, username, firstName, lastName, displayName: display } as UserClient;
        });
      }),
      catchError(() => {
        // Como último recurso, pedir getClients() y confiar en su filtrado
        return this.getClients();
      })
    );

    // Intentar endpoint interno /clients/active (con org si aplica)
    const url = orgId ? `${this.userBaseUrl}/organizations/${orgId}/clients/active` : `${this.userBaseUrl}/clients/active`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.clients ?? res?.items ?? res?.content ?? []);
        return (list || []).map((u: any) => {
          const rawId = u.id ?? u.userId ?? u._id ?? u.clientId ?? u.userCode;
          const idStr = rawId != null ? String(rawId) : '';
          const firstName = u.firstName ?? u.givenName ?? u.first_name ?? u.fullName ?? u.name ?? '';
          const lastName = u.lastName ?? u.familyName ?? u.last_name ?? '';
          const username = u.username ?? u.userName ?? u.email ?? u.userCode ?? '';
          const display = firstName ? (firstName + (lastName ? (' ' + lastName) : '')) : (username || '');
          return { id: idStr, username, firstName, lastName, displayName: display } as UserClient;
        });
      }),
      catchError(() => {
        // Como último recurso, pedir getClients() y confiar en su filtrado (getClients puede devolver activos si UsersApi usado)
        return this.getClients();
      })
    );
  }

  /**
   * Obtener el fareAmount de un cliente específico desde la API externa
   * @param userId ID del usuario/cliente
   * @returns Observable con el fareAmount como number
   */
  getClientFareAmount(userId: string): Observable<number> {
    const orgId = this.authService?.getCurrentUser?.()?.organizationId ?? null;
    if (!orgId) {
      console.warn('No organizationId available for fareAmount lookup');
      return of(0);
    }
    
    // Obtener el token de acceso manualmente
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token available for fareAmount API');
      return of(0);
    }
    
    const apiUrl = `https://lab.vallegrande.edu.pe/jass/ms-gateway/internal/clients/${userId}`;
    const params = new HttpParams().set('organizationId', orgId);
    
    // Crear headers con el token de autorización
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.get<any>(apiUrl, { params, headers }).pipe(
      map(response => {
        console.debug('Respuesta completa de API externa:', response);
        if (response?.success && response?.data?.fareAmount) {
          const fareAmount = parseFloat(response.data.fareAmount);
          console.debug('FareAmount parseado:', fareAmount);
          return isNaN(fareAmount) ? 0 : fareAmount;
        }
        console.debug('No se encontró fareAmount válido en respuesta:', response);
        return 0;
      }),
      catchError(error => {
        console.error('Error obteniendo fareAmount para usuario', userId, error);
        console.error('Status:', error.status, 'Message:', error.message);
        return of(0);
      })
    );
  }

  // WaterBoxService methods
  getAllWaterBoxes(): Observable<WaterBox[]> {
    // Combinar las listas activas e inactivas filtradas por organización.
    // Hacemos el forkJoin dentro del switchMap para asegurarnos de que las
    // llamadas HTTP (que sí completan) se combinen y no quedemos esperando
    // observables ligados a currentUser$ que no completan.
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBox[]);
    return forkJoin([
      this.http.get<WaterBox[]>(`${this.waterBoxBaseUrl}/active`).pipe(catchError(() => of([] as WaterBox[]))),
      this.http.get<WaterBox[]>(`${this.waterBoxBaseUrl}/inactive`).pipe(catchError(() => of([] as WaterBox[])))
    ]).pipe(
      map(([active, inactive]) => ([...(active || []), ...(inactive || [])] as WaterBox[]).filter(box => box.organizationId === organizationId)),
      catchError(() => of([] as WaterBox[]))
    );
  }

  getAllActiveWaterBoxes(): Observable<WaterBox[]> {
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBox[]);
    return this.http.get<WaterBox[]>(`${this.waterBoxBaseUrl}/active`).pipe(
      map(list => (list || []).filter(box => box.organizationId === organizationId)),
      catchError(() => of([] as WaterBox[]))
    );
  }

  getAllInactiveWaterBoxes(): Observable<WaterBox[]> {
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBox[]);
    return this.http.get<WaterBox[]>(`${this.waterBoxBaseUrl}/inactive`).pipe(
      map(list => (list || []).filter(box => box.organizationId === organizationId)),
      catchError(() => of([] as WaterBox[]))
    );
  }

  getWaterBoxById(id: number): Observable<WaterBox> {
    return this.http.get<WaterBox>(`${this.waterBoxBaseUrl}/${id}`);
  }

  createWaterBox(box: Partial<WaterBox>): Observable<WaterBox> {
    return this.http.post<WaterBox>(this.waterBoxBaseUrl, box);
  }

  updateWaterBox(id: number, box: Partial<WaterBox>): Observable<WaterBox> {
    return this.http.put<WaterBox>(`${this.waterBoxBaseUrl}/${id}`, box);
  }

  deleteWaterBox(id: number): Observable<void> {
    return this.http.delete<void>(`${this.waterBoxBaseUrl}/${id}`);
  }

  restoreWaterBox(id: number): Observable<WaterBox> {
    return this.http.patch<WaterBox>(`${this.waterBoxBaseUrl}/${id}/restore`, {});
  }

  // WaterBoxAssignmentService methods
  getAllActiveWaterBoxAssignments(): Observable<WaterBoxAssignment[]> {
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBoxAssignment[]);
    return this.http.get<WaterBoxAssignment[]>(`${this.waterBoxAssignmentBaseUrl}/active`).pipe(
      switchMap((assignments: WaterBoxAssignment[] | any) => {
        const ids = Array.from(new Set((assignments || []).map((a: any) => a.waterBoxId).filter((id: any) => id != null)));
        if (ids.length === 0) return of([] as WaterBoxAssignment[]);
        return forkJoin(ids.map((id: any) => this.getWaterBoxById(Number(id)).pipe(catchError(() => of(null as unknown as WaterBox))))).pipe(
          map((waterBoxes) => {
            const validBoxIds = (waterBoxes || []).filter((b: any) => !!b && b.organizationId === organizationId).map((b: any) => b.id);
            return (assignments || []).filter((a: any) => validBoxIds.includes(a.waterBoxId));
          })
        );
      }),
      catchError(() => of([] as WaterBoxAssignment[]))
    );
  }

  getAllInactiveWaterBoxAssignments(): Observable<WaterBoxAssignment[]> {
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBoxAssignment[]);
    return this.http.get<WaterBoxAssignment[]>(`${this.waterBoxAssignmentBaseUrl}/inactive`).pipe(
      switchMap((assignments: WaterBoxAssignment[] | any) => {
        const ids = Array.from(new Set((assignments || []).map((a: any) => a.waterBoxId).filter((id: any) => id != null)));
        if (ids.length === 0) return of([] as WaterBoxAssignment[]);
        return forkJoin(ids.map((id: any) => this.getWaterBoxById(Number(id)).pipe(catchError(() => of(null as unknown as WaterBox))))).pipe(
          map((waterBoxes) => {
            const validBoxIds = (waterBoxes || []).filter((b: any) => !!b && b.organizationId === organizationId).map((b: any) => b.id);
            return (assignments || []).filter((a: any) => validBoxIds.includes(a.waterBoxId));
          })
        );
      }),
      catchError(() => of([] as WaterBoxAssignment[]))
    );
  }

  getWaterBoxAssignmentById(id: number): Observable<WaterBoxAssignment> {
    return this.http.get<WaterBoxAssignment>(`${this.waterBoxAssignmentBaseUrl}/${id}`);
  }

  createWaterBoxAssignment(data: Partial<WaterBoxAssignment>): Observable<WaterBoxAssignment> {
    return this.http.post<WaterBoxAssignment>(this.waterBoxAssignmentBaseUrl, data);
  }

  updateWaterBoxAssignment(id: number, data: Partial<WaterBoxAssignment>): Observable<WaterBoxAssignment> {
    return this.http.put<WaterBoxAssignment>(`${this.waterBoxAssignmentBaseUrl}/${id}`, data);
  }

  deleteWaterBoxAssignment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.waterBoxAssignmentBaseUrl}/${id}`);
  }

  restoreWaterBoxAssignment(id: number): Observable<WaterBoxAssignment> {
    return this.http.patch<WaterBoxAssignment>(`${this.waterBoxAssignmentBaseUrl}/${id}/restore`, {});
  }

  // Obtener asignaciones por ID de caja (combina activas e inactivas y filtra por waterBoxId)
  getWaterBoxAssignmentsByBoxId(waterBoxId: number): Observable<WaterBoxAssignment[]> {
    // Llamamos directamente a los endpoints "active"/"inactive" para obtener observables que completan
    // (las versiones que usan currentUser$ devuelven observables ligados a currentUser$ y pueden no completar,
    // lo que hacía que forkJoin nunca emitiera).
    return forkJoin([
      this.http.get<WaterBoxAssignment[]>(`${this.waterBoxAssignmentBaseUrl}/active`).pipe(catchError(() => of([] as WaterBoxAssignment[]))),
      this.http.get<WaterBoxAssignment[]>(`${this.waterBoxAssignmentBaseUrl}/inactive`).pipe(catchError(() => of([] as WaterBoxAssignment[])))
    ]).pipe(
      map(([active, inactive]) => ([...(active || []), ...(inactive || [])] as WaterBoxAssignment[]).filter(a => a.waterBoxId === waterBoxId)),
      catchError(() => of([] as WaterBoxAssignment[]))
    );
  }

  // WaterBoxTransferService methods
  getAllWaterBoxTransfers(): Observable<WaterBoxTransfer[]> {
    const organizationId = this.authService?.getCurrentUser?.() ? this.authService.getCurrentUser()?.organizationId : null;
    if (!organizationId) return of([] as WaterBoxTransfer[]);
    return this.http.get<WaterBoxTransfer[]>(this.waterBoxTransferBaseUrl).pipe(
      switchMap((transfers: WaterBoxTransfer[] | any) => {
        const uniqueIds = Array.from(new Set((transfers || []).map((t: any) => t.waterBoxId).filter((id: any) => id != null)));
        if (uniqueIds.length === 0) return of([] as WaterBoxTransfer[]);
        return forkJoin(uniqueIds.map((id: any) => this.getWaterBoxById(Number(id)).pipe(catchError(() => of(null as unknown as WaterBox))))).pipe(
          map(waterBoxes => {
            const validBoxIds = (waterBoxes || []).filter((b: any) => !!b && b.organizationId === organizationId).map((b: any) => b.id);
            return (transfers || []).filter((t: any) => validBoxIds.includes(t.waterBoxId));
          })
        );
      }),
      catchError(() => of([] as WaterBoxTransfer[]))
    );
  }

  getWaterBoxTransferById(id: number): Observable<WaterBoxTransfer> {
    return this.http.get<WaterBoxTransfer>(`${this.waterBoxTransferBaseUrl}/${id}`);
  }

  createWaterBoxTransfer(data: Partial<WaterBoxTransfer>): Observable<WaterBoxTransfer> {
    return this.http.post<WaterBoxTransfer>(this.waterBoxTransferBaseUrl, data);
  }

  updateWaterBoxTransfer(id: number, data: Partial<WaterBoxTransfer>): Observable<WaterBoxTransfer> {
    return this.http.put<WaterBoxTransfer>(`${this.waterBoxTransferBaseUrl}/${id}`, data);
  }

  deleteWaterBoxTransfer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.waterBoxTransferBaseUrl}/${id}`);
  }

  restoreWaterBoxTransfer(id: number): Observable<WaterBoxTransfer> {
    return this.http.patch<WaterBoxTransfer>(`${this.waterBoxTransferBaseUrl}/${id}/restore`, {});
  }

  // --- Helpers para enriquecer transferencias ---
  /**
   * Obtener usuario básico por ID desde ms-user (usa llamada directa con token)
   */
  getUserBasicById(userId: string): Observable<UserClient> {
    const url = `${this.userBaseUrl}/auth/token/user/${userId}`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        const d = (res && (res.data ?? res)) || {};
        const username = d.username || d.fullName || d.name || undefined;
        const firstName = d.firstName || d.givenName || undefined;
        const lastName = d.lastName || d.familyName || undefined;
        const display = firstName ? (firstName + (lastName ? (' ' + lastName) : '')) : (username || '');
        return { id: d.id || userId, username, firstName, lastName, displayName: display } as UserClient;
      }),
      catchError((err) => {
        console.debug('getUserBasicById error for', userId, err);
        return of({ id: userId, username: 'Usuario desconocido', displayName: 'Usuario desconocido' } as UserClient);
      })
    );
  }

  /** Obtener asignaciones por IDs y devolver un Map id -> asignación */
  getAssignmentsByIds(ids: number[]): Observable<Map<number, WaterBoxAssignment>> {
    const unique = Array.from(new Set(ids.filter((v) => v != null)));
    if (unique.length === 0) {
      return new Observable<Map<number, WaterBoxAssignment>>((obs) => { obs.next(new Map()); obs.complete(); });
    }
    return forkJoin(unique.map((id) => this.getWaterBoxAssignmentById(id).pipe(catchError(() => of(null as unknown as WaterBoxAssignment))))).pipe(
      map((assignments: Array<WaterBoxAssignment | null>) => new Map(assignments.filter((a): a is WaterBoxAssignment => !!a).map((a) => [a.id, a])))
    );
  }

  /** Obtener usuarios por IDs y devolver un Map userId -> username */
  getUsersByIds(userIds: string[]): Observable<Map<string, string>> {
    const unique = Array.from(new Set(userIds.filter((v) => !!v)));
    if (unique.length === 0) {
      return new Observable<Map<string, string>>((obs) => { obs.next(new Map()); obs.complete(); });
    }
    // Primero intentar obtener la lista completa de clientes para la organización y filtrar
    return this.getClients().pipe(
      switchMap((clients: UserClient[]) => {
        const resultMap = new Map<string, string>();
        // Mapear los que encontramos en clients usando displayName cuando esté
        unique.forEach(id => {
          const c = clients.find(cl => cl.id === id);
          if (c) {
            const name = c.displayName || (c.firstName ? (c.firstName + (c.lastName ? (' ' + c.lastName) : '')) : (c.username || 'Usuario desconocido'));
            resultMap.set(id, name);
          }
        });
        const missing = unique.filter(id => !resultMap.has(id));
        if (missing.length === 0) {
          return of(resultMap as Map<string, string>);
        }
        // Para los faltantes, intentar obtener vía endpoint individual
        return forkJoin(missing.map(id => this.getUserBasicById(id).pipe(catchError(() => of({ id, username: 'Usuario desconocido', displayName: 'Usuario desconocido' } as UserClient))))).pipe(
          map((arr: UserClient[]) => {
            arr.forEach(u => {
              const display = u.displayName || (u.firstName ? (u.firstName + (u.lastName ? (' ' + u.lastName) : '')) : (u.username || 'Usuario desconocido'));
              resultMap.set(u.id, display);
            });
            return resultMap as Map<string, string>;
          }),
          catchError(err => {
            console.debug('getUsersByIds forkJoin error', err);
            return of(resultMap as Map<string, string>);
          })
        );
      }),
      catchError(err => {
        console.debug('getUsersByIds error', err);
        return of(new Map<string, string>());
      })
    );
  }

  getOrganizationNameById(organizationId: string): Observable<string> {
    const url = `https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        // la API puede devolver { organizationName: '...' } o { data: { organizationName: '...' } }
        return response?.organizationName ?? response?.data?.organizationName ?? 'Organización no encontrada';
      }),
      catchError(() => of('Organización no encontrada'))
    );
  }

  /** Obtener toda la información de la organización (incluye logo en base64 cuando esté disponible) */
  getOrganizationById(organizationId: string): Observable<any> {
    const url = `https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        // la API puede devolver un objeto con { status, data: { ... } } o directamente el objeto
        return response?.data ? response.data : response;
      }),
      catchError((err) => {
        console.debug('getOrganizationById error', organizationId, err);
        return of(null);
      })
    );
  }
}
