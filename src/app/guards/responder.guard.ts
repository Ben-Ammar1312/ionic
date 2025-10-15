import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks access to responder-only areas unless the authenticated user has the responder role.
 * Authenticated non-responders are redirected to the alert giver dashboard.
 */
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
