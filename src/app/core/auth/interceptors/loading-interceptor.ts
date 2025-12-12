import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingStateService } from '../../state/loading-state';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingStateService);

  const skipLoading = req.url.includes('/auth/refresh') ||
    req.url.includes('/audit/log') ||
    req.headers.get('skip-loading') === 'true';

  if (!skipLoading) {
    loadingService.setLoading(true);
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loadingService.setLoading(false);
      }
    })
  );
};
