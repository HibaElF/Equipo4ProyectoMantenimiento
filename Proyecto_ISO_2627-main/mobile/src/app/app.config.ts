import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { sesionInterceptor } from './core/auth/sesion.interceptor';

// Precios y fechas con formato español, igual que en la web.
registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([sesionInterceptor])),
    provideRouter(routes),
    provideIonicAngular({}),
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ]
};
