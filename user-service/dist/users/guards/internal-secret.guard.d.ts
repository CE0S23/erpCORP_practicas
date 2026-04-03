import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class InternalSecretGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
