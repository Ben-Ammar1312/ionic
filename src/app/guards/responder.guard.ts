import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const responderGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isResponder()) {
    return true;
  }

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/alerts']);
  }

  return router.createUrlTree(['/auth/login']);
};
