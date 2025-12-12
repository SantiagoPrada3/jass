import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth';
import { LoggingService } from '../../../core/config/logging.service';

@Component({
  selector: 'app-welcome-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome-animation.html',
  styleUrls: ['./welcome-animation.css'],
})
export class WelcomeAnimation implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggingService);

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    let redirectPath = '/admin/dashboard';

    this.logger.debug('Usuario actual recuperado', user ? { id: user.userId } : null);

    if (user?.roles) {
      this.logger.debug('Roles detectados', { roles: user.roles, count: user.roles.length });

      // Verificar si el usuario tiene más de un rol
      if (user.roles.length > 1) {
        this.logger.info('Usuario tiene múltiples roles, redirigiendo a selector de roles');
        // Si tiene más de un rol, redirigir al selector de roles
        redirectPath = '/role-selector';
      } else if (user.roles.length === 1) {
        // Si solo tiene un rol, redirigir al dashboard correspondiente
        const role = user.roles[0];
        this.logger.info('Usuario tiene un solo rol', { role });
        if (role === 'ADMIN') {
          redirectPath = '/admin/dashboard';
        } else if (role === 'CLIENT') {
          redirectPath = '/client/dashboard';
        } else if (role === 'SUPER_ADMIN') {
          redirectPath = '/super-admin/dashboard';
        }
      }
    } else {
      this.logger.warn('No se detectaron roles para el usuario');
    }

    this.logger.debug('Ruta de redirección final', { path: redirectPath });

    setTimeout(() => {
      this.logger.info('Redirigiendo usuario después de animación', { path: redirectPath });
      this.router.navigate([redirectPath]);
    }, 3000);
  }
}
