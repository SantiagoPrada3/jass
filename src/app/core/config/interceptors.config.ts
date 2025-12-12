import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Provider } from '@angular/core';
import { SecurityPayloadInterceptor } from '../auth/interceptors/security-payload.interceptor';

// Añadir aquí otros interceptores según sea necesario
// import { AuthInterceptor } from '../auth/interceptors/auth.interceptor';
// import { ErrorInterceptor } from '../shared/interceptors/error.interceptor';

export const HTTP_INTERCEPTOR_PROVIDERS: Provider[] = [
     // El orden importa! Los interceptores se ejecutan en el orden listado aquí

     // Interceptor para sanitizar las respuestas y proteger información sensible
     {
          provide: HTTP_INTERCEPTORS,
          useClass: SecurityPayloadInterceptor,
          multi: true
     },

     // Añadir otros interceptores según sea necesario
     /*
     {
       provide: HTTP_INTERCEPTORS,
       useClass: AuthInterceptor,
       multi: true
     },
     {
       provide: HTTP_INTERCEPTORS,
       useClass: ErrorInterceptor,
       multi: true
     }
     */
];
