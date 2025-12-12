import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
     providedIn: 'root'
})
export class AuthGuard implements CanActivate {
     private readonly authService = inject(AuthService);
     private readonly router = inject(Router);

     canActivate(
          route: ActivatedRouteSnapshot,
          state: RouterStateSnapshot
     ): boolean {
          // Si está intentando ir a role-selector, permitir siempre (no necesita AuthGuard)
          if (state.url.includes('/role-selector')) {
               return true;
          }

          if (this.authService.isAuthenticated()) {
               // Usuario autenticado, verificar roles si se requieren
               const requiredRoles = route.data['roles'] as Array<string>;

               if (!requiredRoles || requiredRoles.length === 0) {
                    return true; // No se requieren roles específicos
               }

               // Verificar si el usuario tiene al menos uno de los roles requeridos
               const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);

               if (!hasRequiredRole) {
                    // Redirigir al role selector para cambiar rol o al login
                    const currentUser = this.authService.getCurrentUser();

                    // Si tiene usuario pero no el rol correcto, redirigir al selector de rol
                    if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
                         this.router.navigate(['/role-selector']);
                    } else {
                         // Si no tiene usuario o roles, hacer logout completo
                         this.authService.logout();
                         this.router.navigate(['/auth/login']);
                    }
                    return false;
               }

               return true;
          }

          // Usuario no autenticado, redirigir a login
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
          return false;
     }
}
