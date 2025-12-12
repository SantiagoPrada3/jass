import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, pipe, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Organization, SingleOrganizationApiResponse, Zone, Street, CreateOrganizationRequest, UpdateOrganizationRequest, ReniecResponse, ZoneCreateRequest, CreateStreetRequest, Admin, parametersResponse, createRequestParameter, updateRequestParameter, tarifaResponse, updateRequestTarifa, createRequestTarifa, } from '../models/organization.model';
import { ApiResponse } from '../models/api-response-model';

@Injectable({
  providedIn: 'root'
})
export class OrganizationApi {
  private readonly apiUrl = environment.services.gateway;

  constructor(
    private http: HttpClient,
  ) { }


  getOrganizations(): Observable<Organization[]> {
    return this.http.get<{ success: boolean; data: Organization[] }>(`${this.apiUrl}/management/organizations`)
      .pipe(map(response => response.data));
  }

  getOrganizationsWithAdmins(): Observable<Organization[]> {
    return this.http.get<{ status: boolean; data: Organization[] }>(`${this.apiUrl}/management/organizations/admins`)
      .pipe(
        map(response => {
          // Mapear y agregar campos faltantes a los administradores
          if (response.data) {
            return response.data.map(org => ({
              ...org,
              admins: org.admins?.map(admin => ({
                ...admin,
                adminId: admin.userId || '',
                status: 'ACTIVE' as const, // Por defecto ACTIVE ya que el backend filtra solo activos
                organizationId: org.organizationId,
                role: 'ADMIN'
              }))
            }));
          }
          return [];
        })
      );
  }

  getOrganizationById(organizationId: string): Observable<Organization | null> {
    return this.http.get<SingleOrganizationApiResponse>(`${this.apiUrl}/admin/organization/${organizationId}`)
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          }
          return null;
        }),
        catchError(error => {
          console.error('Error obteniendo organización por ID:', error);
          return of(null);
        })
      );
  }

  createOrganization(organization: Partial<CreateOrganizationRequest>): Observable<Organization> {
    return this.http.post<{ success: boolean; data: Organization }>(`${this.apiUrl}/management/organizations`, organization)
      .pipe(map(response => response.data));
  }

  updateOrganization(id: string, organization: Partial<Organization>): Observable<Organization> {
    const url = `${this.apiUrl}/management/organizations/${id}`;
    return this.http.put<{ success: boolean; data: Organization }>(url, organization)
      .pipe(
        map(response => {
          console.log('✅ [OrganizationApi] Organización actualizada:', response);
          return response.data;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  deleteOrganization(id: string): Observable<Organization> {
    return this.http.delete<{ success: boolean, data: Organization }>(`${this.apiUrl}/management/organizations/${id}/delete`)
      .pipe(map(response => response.data));
  }

  restoreOrganization(id: string): Observable<Organization> {
    return this.http.delete<{ success: boolean, data: Organization }>(`${this.apiUrl}/management/organizations/${id}/restore`)
      .pipe(map(response => response.data));
  }


  // ===============================
  // GESTIÓN DE ZONAS
  // ===============================

  createZone(zone: Partial<ZoneCreateRequest>): Observable<Zone> {
    return this.http.post<{ status: boolean, data: Zone }>(`${this.apiUrl}/admin/zones`, zone)
      .pipe(map(response => response.data));
  }

  getAllZones(): Observable<Zone[]> {
    return this.http.get<{ status: boolean, data: Zone[] }>(`${this.apiUrl}/admin/zones`)
      .pipe(map(response => response.data));
  }

  getZonesByOrganizationId(organizationId: string): Observable<Zone[]> {
    return this.http.get<{ status: boolean, data: Zone[] }>(`${this.apiUrl}/admin/zones/organization/${organizationId}`)
      .pipe(map(response => response.data));
  }

  getZoneById(id: string): Observable<Zone> {
    return this.http.get<{ status: boolean, data: Zone }>(`${this.apiUrl}/admin/zones/${id}`)
      .pipe(map(response => response.data));
  }

  updateZone(id: string, zoneData: Partial<Zone>): Observable<Zone | null> {
    return this.http.put<{ status: boolean, data: Zone }>(`${this.apiUrl}/admin/zones/${id}`, zoneData)
      .pipe(map(response => response.data));
  }

  deleteZone(id: string): Observable<Zone> {
    return this.http.delete<{ success: boolean, data: Zone }>(`${this.apiUrl}/admin/zones/${id}`)
      .pipe(map(response => response.data));
  }

  restoreZone(id: string): Observable<Zone> {
    return this.http.patch<{ success: boolean, data: Zone }>(`${this.apiUrl}/admin/zones/${id}/restore`, {})
      .pipe(map(response => response.data));
  }

  // ===============================
  // GESTIÓN DE CALLES
  // ===============================

  createStreet(streetData: Partial<CreateStreetRequest>): Observable<Street> {
    return this.http.post<{ status: boolean, data: Street }>(`${this.apiUrl}/admin/streets`, streetData)
      .pipe(map(response => response.data));
  }

  getAllStreets(): Observable<Street[]> {
    return this.http.get<{ status: boolean, data: Street[] }>(`${this.apiUrl}/admin/streets`)
      .pipe(map(response => response.data));
  }

  getStreetById(id: string): Observable<Street | null> {
    return this.http.get<{ status: boolean, data: Street }>(`${this.apiUrl}/admin/streets/${id}`)
      .pipe(map(response => response.data));
  }

  updateStreet(id: string, streetData: any): Observable<Street | null> {
    return this.http.put<{ status: boolean, data: Street }>(`${this.apiUrl}/admin/streets/${id}`, streetData)
      .pipe(map(response => response.data));
  }

  deleteStreet(id: string): Observable<Street> {
    return this.http.delete<{ status: boolean, data: Street }>(`${this.apiUrl}/admin/streets/${id}`)
      .pipe(map(response => response.data));
  }

  restoreStreet(id: string): Observable<Street> {
    return this.http.patch<{ status: boolean, data: Street }>(`${this.apiUrl}/admin/streets/${id}/restore`, {})
      .pipe(map(response => response.data));
  }

  getStreetsByZone(zoneId: string): Observable<Street[]> {
    console.log('🛣️ [OrganizationApi] Obteniendo calles para zona:', zoneId);
    return this.http.get<{ status: boolean, data: Street[] }>(`${this.apiUrl}/admin/streets/zone/${zoneId}`)
      .pipe(
        map(response => {
          console.log('✅ [OrganizationApi] Respuesta de calles:', response);
          return response.data || [];
        }),
        catchError(error => {
          console.error('❌ [OrganizationApi] Error obteniendo calles:', error);
          return of([]);
        })
      );
  }

  // ===============================
  // GESTIÓN DE PARAMETROS
  // ===============================

  getParameters(): Observable<parametersResponse[]> {
    return this.http.get<{ status: boolean, data: parametersResponse[] }>(`${this.apiUrl}/admin/parameters`)
      .pipe(map(response => response.data));
  }

  // Método para obtener un parámetro específico por nombre
  getParameterByName(parameterName: string): Observable<parametersResponse | null> {
    return this.getParameters().pipe(
      map((parameters: parametersResponse[]) => {
        const parameter = parameters.find(p => p.parameterName === parameterName);
        return parameter || null;
      })
    );
  }

  createParameters(parameterData: Partial<createRequestParameter>): Observable<parametersResponse> {
    return this.http.post<{ status: boolean, data: parametersResponse }>(`${this.apiUrl}/admin/parameters`, parameterData)
      .pipe(map(response => response.data));
  }

  updateParameter(id: string, parameterData: any): Observable<updateRequestParameter | null> {
    return this.http.put<{ status: boolean, data: parametersResponse }>(`${this.apiUrl}/admin/parameters/${id}`, parameterData)
      .pipe(map(response => response.data));
  }

  deleteParameter(id: string): Observable<parametersResponse> {
    const url = `${this.apiUrl}/admin/parameters/${id}`;
    return this.http.delete<{ status: boolean, data: parametersResponse }>(url)
      .pipe(
        map(response => {
          return response.data;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  restoreParameter(id: string): Observable<parametersResponse> {
    return this.http.patch<{ status: boolean, data: parametersResponse }>(`${this.apiUrl}/admin/parameters/restore/${id}`, {})
      .pipe(map(response => response.data));
  }

  /** GESTIÓN DE TARIFAS */
  getTarifas(): Observable<tarifaResponse[]> {
    return this.http.get<{ status: boolean, data: tarifaResponse[] }>(`${this.apiUrl}/admin/fare`)
      .pipe(map(response => response.data));
  }

  createTarifa(tarifaData: Partial<createRequestTarifa>): Observable<tarifaResponse> {
    return this.http.post<{ status: boolean, data: tarifaResponse }>(`${this.apiUrl}/admin/fare`, tarifaData)
      .pipe(map(response => response.data));
  }

  updateTarifa(id: string, tarifaData: Partial<updateRequestTarifa>): Observable<tarifaResponse | null> {
    return this.http.put<{ status: boolean, data: tarifaResponse }>(`${this.apiUrl}/admin/fare/${id}`, tarifaData)
      .pipe(map(response => response.data));
  }

  deleteTarifa(id: string): Observable<tarifaResponse> {
    return this.http.delete<{ status: boolean, data: tarifaResponse }>(`${this.apiUrl}/admin/fare/${id}`)
      .pipe(map(response => response.data));
  }

  restoreTarifa(id: string): Observable<tarifaResponse> {
    return this.http.patch<{ status: boolean, data: tarifaResponse }>(`${this.apiUrl}/admin/fare/restore/${id}`, {})
      .pipe(map(response => response.data));
  }

  getTarifaById(id: string): Observable<tarifaResponse | null> {
    return this.http.get<{ status: boolean, data: tarifaResponse }>(`${this.apiUrl}/admin/fare/${id}`)
      .pipe(map(response => response.data));
  }

  getFareHistoryByZone(zoneId: string): Observable<tarifaResponse[]> {
    return this.getTarifas().pipe(
      map(fares => fares.filter(fare => fare.zoneId === zoneId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    );
  }

  // ===============================
  // GESTIÓN DE ADMINISTRADORES
  // ===============================

  createAdmin(adminData: Partial<Admin>): Observable<Admin> {
    return this.http.post<{ success: boolean, data: Admin }>(`${this.apiUrl}/management/admins`, adminData)
      .pipe(map(response => response.data));
  }

  getAllAdmins(): Observable<any[]> {
    // Usar el endpoint de management que soporta listado global
    // Se añade size=1000 para asegurar que traiga todos los registros si hay paginación por defecto
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/management/admins?size=1000`)
      .pipe(map(response => {
        // El backend devuelve un Page<UserResponse>, así que extraemos el contenido
        if (response.data && response.data.content) {
          return response.data.content;
        }
        // Si por alguna razón devuelve una lista directa
        return response.data || [];
      }));
  }

  getAdminById(id: string): Observable<any> {
    return this.http.get<{ success: boolean; data: Admin }>(`${this.apiUrl}/admin/admins/${id}`)
      .pipe(map(response => response.data));
  }

  updateAdmin(id: string, adminData: Partial<Admin>): Observable<Admin> {
    return this.http.put<{ success: boolean; data: Admin }>(`${this.apiUrl}/admin/admins/${id}`, adminData)
      .pipe(map(response => response.data));
  }

  deleteAdmin(id: string): Observable<Admin> {
    return this.http.delete<{ success: boolean, data: Admin }>(`${this.apiUrl}/admin/admins/${id}`)
      .pipe(map(response => response.data));
  }

  getAdminsByOrganization(organizationId: string): Observable<Admin> {
    return this.http.get<{ success: boolean, data: Admin }>(`${this.apiUrl}/admin/admins/organization/${organizationId}`)
      .pipe(map(response => response.data));
  }

  getPersonDataByDni(dni: string): Observable<ReniecResponse> {
    console.log(`🆔 [ReniecApi] Consultando datos RENIEC para DNI: ${dni}`);

    // Validar formato de DNI
    if (!this.isValidDni(dni)) {
      console.error('❌ [ReniecApi] DNI inválido:', dni);
      return throwError(() => new Error('El DNI debe tener exactamente 8 dígitos'));
    }

    // Usar el endpoint público real a través del Gateway
    const url = `${this.apiUrl}/common/users/reniec/dni/${dni}`;
    console.log(`🌐 [ReniecApi] URL de consulta: ${url}`);

    return this.http.get<ApiResponse<ReniecResponse>>(url).pipe(
      map((response: ApiResponse<ReniecResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'No se encontraron datos en RENIEC');
        }

        console.log(`✅ [ReniecApi] Datos RENIEC obtenidos:`, response.data);
        return response.data;
      }),
      catchError(error => {
        console.error(`❌ [ReniecApi] Error consultando RENIEC:`, error);
        const message = error.error?.message || error.message || 'Error al consultar datos de RENIEC';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Valida el formato del DNI (8 dígitos)
   */
  private isValidDni(dni: string): boolean {
    const dniPattern = /^\d{8}$/;
    return dniPattern.test(dni);
  }

  /**
   * Formatea el nombre completo desde los datos de RENIEC
   * Usa la respuesta real: first_name, first_last_name, second_last_name
   */
  formatFullName(data: ReniecResponse): string {
    const { first_name, first_last_name, second_last_name } = data;
    let fullName = `${first_name} ${first_last_name}`;

    if (second_last_name && second_last_name.trim()) {
      fullName += ` ${second_last_name}`;
    }

    return fullName;
  }

  /**
   * Genera un email sugerido basado en los nombres de RENIEC
   * Usa la misma lógica que tu backend para generar nombres de administrador
   */
  generateSuggestedEmail(data: ReniecResponse): string {
    const primaryFirstName = this.cleanAndNormalize(data.first_name.trim().split(' ')[0]).toLowerCase();
    const processedFirstLastName = this.processLastNameIntelligently(data.first_last_name);

    let secondLastNameInitial = '';
    if (data.second_last_name && data.second_last_name.trim()) {
      const secondWords = data.second_last_name.trim().split(' ');
      for (const word of secondWords) {
        if (!this.isShortWord(word)) {
          secondLastNameInitial = '.' + this.cleanAndNormalize(word).toLowerCase().charAt(0);
          break;
        }
      }

      if (!secondLastNameInitial && secondWords.length > 0) {
        secondLastNameInitial = '.' + this.cleanAndNormalize(secondWords[secondWords.length - 1]).toLowerCase().charAt(0);
      }
    }

    const suggestedEmail = `${primaryFirstName}.${processedFirstLastName}${secondLastNameInitial}@jass.gob.pe`;
    console.log(`📧 [ReniecApi] Email sugerido generado: ${suggestedEmail}`);

    return suggestedEmail;
  }

  /**
   * Procesa apellido de forma inteligente (misma lógica que el backend)
   */
  private processLastNameIntelligently(lastName: string): string {
    if (!lastName || !lastName.trim()) {
      return 'apellido';
    }

    const words = lastName.trim().split(' ');

    // Buscar la primera palabra significativa (más de 2 letras)
    for (const word of words) {
      if (!this.isShortWord(word)) {
        return this.cleanAndNormalize(word).toLowerCase();
      }
    }

    // Si todas son palabras cortas, usar la última
    if (words.length > 0) {
      return this.cleanAndNormalize(words[words.length - 1]).toLowerCase();
    }

    return 'apellido';
  }

  /**
   * Verifica si una palabra es "corta" (artículos, preposiciones, etc.)
   */
  private isShortWord(word: string): boolean {
    if (!word || word.length <= 2) {
      return true;
    }

    const upperWord = word.toUpperCase();
    return ['DE', 'LA', 'EL', 'DEL', 'LAS', 'LOS', 'VON', 'VAN', 'MAC', 'DI'].includes(upperWord);
  }

  /**
   * Limpia y normaliza texto removiendo tildes y caracteres especiales
   */
  private cleanAndNormalize(text: string): string {
    if (!text) {
      return '';
    }

    return text.trim()
      .replaceAll('Á', 'A').replaceAll('É', 'E').replaceAll('Í', 'I')
      .replaceAll('Ó', 'O').replaceAll('Ú', 'U').replaceAll('Ñ', 'N')
      .replaceAll('á', 'a').replaceAll('é', 'e').replaceAll('í', 'i')
      .replaceAll('ó', 'o').replaceAll('ú', 'u').replaceAll('ñ', 'n')
      .replace(/[^A-Za-z0-9\s]/g, ''); // Remover caracteres especiales
  }


}
