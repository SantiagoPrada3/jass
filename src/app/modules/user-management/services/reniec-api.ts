import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { ReniecResponse } from '../models/user.model';

@Injectable({
     providedIn: 'root'
})
export class ReniecApi {
     private readonly baseUrl = environment.services.gateway; // Usar Gateway en lugar de Users directo

     constructor(
          private http: HttpClient
     ) { }

     /**
      * Obtiene los datos personales desde RENIEC usando el DNI
      * Conecta con tu endpoint real a través del Gateway: /api/common/users/reniec/dni/{dni}
      */
     getPersonDataByDni(dni: string): Observable<ReniecResponse> {
          console.log(`🆔 [ReniecApi] Consultando datos RENIEC para DNI: ${dni}`);

          // Validar formato de DNI
          if (!this.isValidDni(dni)) {
               console.error('❌ [ReniecApi] DNI inválido:', dni);
               return throwError(() => new Error('El DNI debe tener exactamente 8 dígitos'));
          }

          // Usar el endpoint público real a través del Gateway
          const url = `${this.baseUrl}/common/users/reniec/dni/${dni}`;
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
      * Usa la misma lógica que tu backend para generar usernames
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
