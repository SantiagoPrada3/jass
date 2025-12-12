import { Injectable } from '@angular/core';
import {
     HttpEvent,
     HttpInterceptor,
     HttpHandler,
     HttpRequest,
     HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LoggingService } from '../../../core/config/logging.service';

@Injectable()
export class SecurityPayloadInterceptor implements HttpInterceptor {
     constructor(private logger: LoggingService) { }

     intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
          return next.handle(req).pipe(
               map((event: HttpEvent<any>) => {
                    // Solo procesamos respuestas HTTP
                    if (!(event instanceof HttpResponse)) {
                         return event;
                    }

                    const body = event.body;

                    // Solo procesamos si hay un cuerpo de respuesta
                    if (!body) {
                         return event;
                    }

                    // Procesamos las respuestas de autenticación
                    return this.processResponseBody(event, body);
               })
          );
     }

     private processResponseBody(event: HttpResponse<any>, body: any): HttpEvent<any> {
          // Procesamos respuestas con un formato específico
          if (!body.data || !body.success) {
               return event;
          }

          // Sanitizamos datos sensibles
          if (this.containsSensitiveData(body.data)) {
               const sanitizedBody = this.sanitizeResponseBody(body);
               this.logger.debug('Payload sanitizado para seguridad', { url: event.url });
               return event.clone({ body: sanitizedBody });
          }

          return event;
     }

     private containsSensitiveData(data: any): boolean {
          return data.accessToken ||
               data.refreshToken ||
               (data.userInfo && data.userInfo.email);
     }

     private sanitizeResponseBody(body: any): any {
          // Creamos una copia profunda para evitar modificar el objeto original
          const sanitizedBody = JSON.parse(JSON.stringify(body));

          if (sanitizedBody.data.accessToken) {
               sanitizedBody.data.accessToken = '[PROTECTED]';
          }

          if (sanitizedBody.data.refreshToken) {
               sanitizedBody.data.refreshToken = '[PROTECTED]';
          }

          // Procesar información de usuario
          this.sanitizeUserInfo(sanitizedBody.data);

          return sanitizedBody;
     }

     private sanitizeUserInfo(data: any): void {
          if (!data.userInfo) {
               return;
          }

          // Enmascarar email
          if (data.userInfo.email) {
               const email = data.userInfo.email;
               const [username, domain] = email.split('@');
               data.userInfo.email = username.substring(0, 3) + '***@' + domain;
          }

          // Otros campos sensibles que podrían necesitar protección
          if (data.userInfo.phoneNumber) {
               data.userInfo.phoneNumber = '***-***-' + data.userInfo.phoneNumber.slice(-4);
          }
     }
}
