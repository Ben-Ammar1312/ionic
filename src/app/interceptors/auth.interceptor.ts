import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Appends the bearer token to outgoing HTTP requests so the backend can identify the user.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  return next(
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req
  );
};
