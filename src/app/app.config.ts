import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/interceptors/auth-interceptor';
import { errorInterceptor } from './core/auth/interceptors/error-interceptor';
import { loadingInterceptor } from './core/auth/interceptors/loading-interceptor';
import { organizationInterceptor } from './core/auth/interceptors/organization-interceptor';
import { securityPayloadInterceptor } from './core/auth/interceptors/security-payload-interceptor';

import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(), // ✅ Habilita las animaciones de Angular
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        authInterceptor,
        organizationInterceptor,
        securityPayloadInterceptor,
        errorInterceptor
      ])
    ),
    provideCharts(withDefaultRegisterables()),
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};
