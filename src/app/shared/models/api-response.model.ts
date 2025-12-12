/**
 * Modelo de respuesta estándar de la API
 * Corresponde al ApiResponse<T> del backend Java
 */
export interface ApiResponse<T = any> {
     success: boolean;
     status?: boolean;
     message: string;
     data?: T;
     error?: ErrorMessage;
}

/**
 * Modelo para mensajes de error
 * Corresponde al ErrorMessage del backend Java
 */
export interface ErrorMessage {
     code?: string;
     message: string;
     details?: string;
     timestamp?: string;
     field?: string;
}

/**
 * Clase utilitaria para crear respuestas API
 */
export class ApiResponseHelper {

     /**
      * Crea una respuesta exitosa con datos
      */
     static success<T>(data: T, message = 'Operación exitosa'): ApiResponse<T> {
          return {
               success: true,
               status: true,
               message,
               data,
               error: undefined
          };
     }

     /**
      * Crea una respuesta exitosa sin datos
      */
     static successMessage(message: string): ApiResponse<null> {
          return {
               success: true,
               status: true,
               message,
               data: null,
               error: undefined
          };
     }

     /**
      * Crea una respuesta de error
      */
     static error<T = null>(message: string, error?: ErrorMessage): ApiResponse<T> {
          return {
               success: false,
               status: false,
               message,
               data: undefined,
               error
          };
     }

     /**
      * Verifica si la respuesta es exitosa
      */
     static isSuccess<T>(response: ApiResponse<T>): boolean {
          return response.success === true || response.status === true;
     }

     /**
      * Verifica si la respuesta es de error
      */
     static isError<T>(response: ApiResponse<T>): boolean {
          return response.success === false && response.status !== true;
     }

     /**
      * Extrae los datos de una respuesta exitosa
      */
     static getData<T>(response: ApiResponse<T>): T | null {
          return this.isSuccess(response) ? response.data || null : null;
     }

     /**
      * Extrae el mensaje de error de una respuesta
      */
     static getErrorMessage<T>(response: ApiResponse<T>): string {
          return response.error?.message || response.message || 'Error desconocido';
     }
}
