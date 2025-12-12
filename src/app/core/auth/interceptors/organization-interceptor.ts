import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const organizationInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const currentUser = authService.getCurrentUser();

  if (req.url.includes('/auth/')) {
    return next(req);
  }

  if (currentUser?.organizationId) {
    const orgReq = req.clone({
      setHeaders: {
        'X-Organization-Id': currentUser.organizationId
      }
    });
    return next(orgReq);
  }

  return next(req);
};
