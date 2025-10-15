import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (!auth.token()) {
    return router.createUrlTree(['/auth/login']);
  }

  return auth.ensureUserLoaded().pipe(
    map((user) => {
      if (user) {
        return true;
      }
      auth.logout();
      return router.createUrlTree(['/auth/login']);
    }),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/auth/login']));
    })
  );
};
