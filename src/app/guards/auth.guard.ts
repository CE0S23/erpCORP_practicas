import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_KEY = 'erp_token';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (!localStorage.getItem(TOKEN_KEY)) {
    return router.createUrlTree(['/login']);
  }
  return true;
};
