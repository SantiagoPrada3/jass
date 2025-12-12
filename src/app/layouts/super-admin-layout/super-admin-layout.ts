import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth';
import { Sidebar } from '../../shared/components/ui/sidebar/sidebar';
import { Header } from '../../shared/components/ui/header/header';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar, Header],
  templateUrl: './super-admin-layout.html',
  styleUrl: './super-admin-layout.css'
})
export class SuperAdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  sidebarCollapsed: boolean = false;
  currentRole: string = 'SUPER_ADMIN';

  get userProfile() {
    const user = this.authService.getCurrentUser();
    return {
      name: user ? `${user.firstName} ${user.lastName}` : 'admin general',
      email: user?.email || 'admin.general@empresa.com',
      avatar: '',
      roles: ['ADMIN', 'SUPER_ADMIN'], // Esto debería venir del backend
      currentRole: this.currentRole
    };
  }

  onSidebarToggled(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onToggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onRoleChanged(newRole: string): void {
    this.currentRole = newRole;
    // Aquí puedes agregar lógica adicional para cambiar el contexto del usuario
    // Por ejemplo, actualizar permisos, redirigir a dashboard específico, etc.

    if (newRole === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/super-admin/dashboard']);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  // Ya no necesitamos alternar entre versiones de sidebar
}
