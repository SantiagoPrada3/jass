import { CanActivateFn } from '@angular/router';

export const sessionTimeoutGuard: CanActivateFn = (route, state) => {
  return true;
};
