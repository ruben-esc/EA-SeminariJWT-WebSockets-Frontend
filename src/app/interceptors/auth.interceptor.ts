import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// Mensaje con el que la API responde 401 cuando el access token ha caducado
const TOKEN_EXPIRED = 'El token ha caducado';

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Las rutas de /auth no llevan el access token (se manejan con sus credenciales o cookies)
  if (request.url.startsWith(`${environment.apiUrl}/auth/`)) {
    return next(request);
  }

  const auth = inject(AuthService);
  
  // Ahora leemos el token de la signal en memoria en lugar de localStorage
  const token = auth.accessToken();

  return next(token ? withToken(request, token) : request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // 401 porque el token ha caducado: lo renuevo y repito la petición original una vez
      if (error.error?.message === TOKEN_EXPIRED) {
        return auth.refresh().pipe(
          catchError((refreshError) => {
            auth.logout();
            return throwError(() => refreshError);
          }),
          // Cuando llega el token nuevo, lanzamos otra vez la petición con él
          switchMap((newToken) => next(withToken(request, newToken))),
        );
      }

      // Cualquier otro 401 quiere decir que no hay sesión válida
      auth.logout();
      return throwError(() => error);
    }),
  );
};