import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export const ERR = {
  ERR_401_SESION:    'ERR_401_SESION',
  ERR_403_PERMISO:   'ERR_403_PERMISO',
  ERR_404_RECURSO:   'ERR_404_RECURSO',
  ERR_409_CONFLICTO: 'ERR_409_CONFLICTO',
  ERR_422_DATOS:     'ERR_422_DATOS',
  ERR_500_GENERIC:   'ERR_500_GENERIC',
} as const;

export type ErrorCode = typeof ERR[keyof typeof ERR];

interface ErrorEntry {
  summary: string;
  detail: string;
  severity: 'error' | 'warn' | 'info';
}

const ERROR_CATALOG: Record<ErrorCode, ErrorEntry> = {
  ERR_401_SESION: {
    summary: 'Sesión expirada',
    detail: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    severity: 'warn',
  },
  ERR_403_PERMISO: {
    summary: 'Acceso denegado',
    detail: 'No tienes permisos para realizar esta acción.',
    severity: 'error',
  },
  ERR_404_RECURSO: {
    summary: 'Recurso no encontrado',
    detail: 'El elemento que buscas ya no existe o fue eliminado.',
    severity: 'info',
  },
  ERR_409_CONFLICTO: {
    summary: 'Conflicto de datos',
    detail: 'Ya existe un registro con esa información. Verifica los datos e intenta de nuevo.',
    severity: 'warn',
  },
  ERR_422_DATOS: {
    summary: 'Datos inválidos',
    detail: 'Los datos ingresados no son válidos. Revisa el formulario.',
    severity: 'warn',
  },
  ERR_500_GENERIC: {
    summary: 'Error inesperado',
    detail: 'Ocurrió un error interno. Por favor, inténtalo de nuevo más tarde.',
    severity: 'error',
  },
};

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly messageService = inject(MessageService);

  dispatch(code: ErrorCode, detailOverride?: string): void {
    const entry = ERROR_CATALOG[code];
    this.messageService.add({
      severity: entry.severity,
      summary: entry.summary,
      detail: detailOverride ?? entry.detail,
      life: entry.severity === 'error' ? 5000 : 3500,
    });
  }

  dispatchPermissionError(): void {
    this.dispatch('ERR_403_PERMISO');
  }

  dispatchSessionError(): void {
    this.dispatch('ERR_401_SESION');
  }
}
