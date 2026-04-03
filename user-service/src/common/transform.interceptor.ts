import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in the universal JSON schema:
 * { statusCode, intOpCode: "SxUS{code}", data }
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode: number = response.statusCode;

        return {
          statusCode,
          intOpCode: `SxUS${statusCode}`,
          data: data ?? null,
        };
      }),
    );
  }
}
