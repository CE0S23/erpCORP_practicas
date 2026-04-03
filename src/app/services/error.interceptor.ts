import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403) {
        messageService.add({
          severity: 'error',
          summary:  'Acceso denegado',
          detail:   'No tienes los permisos o jerarquía suficientes para esta acción.',
          life: 4000,
        });
      } else if (error.status === 404) {
        messageService.add({
          severity: 'warn',
          summary:  'No encontrado',
          detail:   'El recurso solicitado no existe.',
          life: 3500,
        });
      } else if (error.status === 503 || error.status === 0) {
        messageService.add({
          severity: 'error',
          summary:  'Servicio no disponible',
          detail:   'Servicio no disponible, intenta más tarde.',
          life: 5000,
        });
      }

      return throwError(() => error);
    })
  );
};
