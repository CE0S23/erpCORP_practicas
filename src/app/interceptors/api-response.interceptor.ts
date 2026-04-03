import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Unwraps the universal JSON response schema { statusCode, intOpCode, data }
 * so that service methods receive the `data` payload directly.
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (
        event instanceof HttpResponse &&
        event.body != null &&
        typeof event.body === 'object' &&
        !Array.isArray(event.body)
      ) {
        const body = event.body as Record<string, unknown>;
        if ('intOpCode' in body && 'data' in body) {
          return event.clone({ body: body['data'] });
        }
      }
      return event;
    })
  );
};
