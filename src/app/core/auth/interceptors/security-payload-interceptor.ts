import { HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { inject } from '@angular/core';
import { LoggingService } from '../../../core/config/logging.service';
import { map } from 'rxjs';

/**
 * Interceptor que sanitiza las respuestas HTTP para ocultar información sensible en producción.
 * Este interceptor solo actúa en modo producción y se asegura de que datos sensibles como tokens
 * e información personal no sean fácilmente visibles en las herramientas de desarrollo.
 */
export const securityPayloadInterceptor: HttpInterceptorFn = (
     req: HttpRequest<unknown>,
     next: HttpHandlerFn
) => {
     const logger = inject(LoggingService);

     // Función para sanitizar la respuesta HTTP
     const sanitizeResponse = (response: HttpResponse<any>): HttpResponse<any> => {
          if (!environment.production) {
               return response; // No sanitizamos en desarrollo
          }

          const body = response.body;
          if (!body || !body.data || !body.success) {
               return response; // No es el formato esperado
          }

          // Verificamos si hay datos sensibles
          const data = body.data;
          if (!data.accessToken && !data.refreshToken && !data.userInfo) {
               return response; // No hay datos sensibles
          }

          // Creamos una copia para evitar modificar el objeto original
          const sanitizedBody = structuredClone(body);

          // Sanitizamos tokens
          if ('accessToken' in data) {
               sanitizedBody.data.accessToken = '[PROTECTED]';
          }

          if ('refreshToken' in data) {
               sanitizedBody.data.refreshToken = '[PROTECTED]';
          }

          // Sanitizamos datos de usuario
          if (data.userInfo) {
               sanitizeUserInfo(sanitizedBody.data.userInfo);
          }

          logger.debug('Payload sanitizado para proteger datos sensibles', { url: response.url });
          return response.clone({ body: sanitizedBody });
     };

     // Función para sanitizar información del usuario
     const sanitizeUserInfo = (userInfo: any): void => {
          if ('email' in userInfo) {
               const email = userInfo.email as string;
               const parts = email.split('@');
               if (parts.length === 2) {
                    userInfo.email = parts[0].substring(0, 3) + '***@' + parts[1];
               }
          }

          if ('phoneNumber' in userInfo) {
               userInfo.phoneNumber = '***-***-' + userInfo.phoneNumber.slice(-4);
          }
     };

     return next(req).pipe(
          map(event => {
               if (event instanceof HttpResponse) {
                    return sanitizeResponse(event);
               }
               return event;
          })
     );
};
