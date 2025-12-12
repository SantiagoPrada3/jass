import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth';

@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-selector.html',
  styleUrl: './role-selector.css'
})
export class RoleSelector implements OnInit {
  roles: string[] = [];
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user?.roles) {
      this.roles = user.roles;
    } else {
      // Si no hay usuario o roles, redirigir al login
      this.router.navigate(['/']);
    }
  }

  selectRole(role: string) {
    // Navegar al dashboard correspondiente según el rol seleccionado
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'CLIENT') {
      this.router.navigate(['/client/dashboard']);
    } else if (role === 'SUPER_ADMIN') {
      this.router.navigate(['/super-admin/dashboard']);
    }
  }
}
