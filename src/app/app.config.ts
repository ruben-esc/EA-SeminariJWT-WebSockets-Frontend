import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los parámetros de la ruta (como :id) y los de la URL (?returnUrl=)
    // llegan a los componentes como inputs
    provideRouter(routes, withComponentInputBinding()),
    // withInterceptors: todas las peticiones de HttpClient pasan por authInterceptor,
    // que les añade el token (ver interceptors/auth.interceptor.ts)
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};