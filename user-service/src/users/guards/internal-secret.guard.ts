import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Validates that the request carries the shared X-Internal-Secret header.
 * This header is set by the API Gateway (and only by trusted internal callers)
 * for routes that must not be publicly reachable.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-secret'];
    const expected  = process.env.INTERNAL_SECRET;

    if (!expected) {
      throw new UnauthorizedException('INTERNAL_SECRET env var is not configured');
    }

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Internal-Secret header');
    }

    return true;
  }
}
