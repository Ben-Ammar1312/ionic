import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Verifies that the user is authenticated before allowing access to a route.
 * It falls back to loading the user profile if only the token is available.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (!auth.token()) {
    return router.createUrlTree(['/auth/login']);
  }

  const user = await auth.ensureUserLoaded();
  if (user) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
