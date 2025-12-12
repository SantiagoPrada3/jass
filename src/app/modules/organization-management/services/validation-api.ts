import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';

@Injectable({
     providedIn: 'root'
})
export class ValidationApi {

     private readonly baseUrl = `${environment.services.gateway}/common/user`;

     constructor(private http: HttpClient) { }

     /**
      * Verificar si un DNI ya está registrado
      * @param dni - Número de DNI a verificar
      * @returns Observable<boolean> - true si el DNI YA EXISTE, false si está disponible
      */
     checkDniExists(dni: string): Observable<ApiResponse<boolean>> {
          console.log(`🔍 Verificando DNI: ${dni}`);
          return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/dni/${dni}/exists`);
     }

     /**
      * Verificar si un email ya está registrado
      * @param email - Email a verificar
      * @returns Observable<boolean> - true si el email YA EXISTE, false si está disponible
      */
     checkEmailExists(email: string): Observable<ApiResponse<boolean>> {
          console.log(`📧 Verificando email: ${email}`);
          return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/email/${encodeURIComponent(email)}/exists`);
     }

     /**
      * Verificar si un teléfono ya está registrado
      * @param phone - Teléfono a verificar
      * @returns Observable<boolean> - true si el teléfono YA EXISTE, false si está disponible
      */
     checkPhoneExists(phone: string): Observable<ApiResponse<boolean>> {
          console.log(`📱 Verificando teléfono: ${phone}`);
          return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/phone/${phone}/exists`);
     }
}
