import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../shared/components/ui/header/header';
import { Sidebar } from '../../shared/components/ui/sidebar/sidebar';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, Header, Sidebar],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.css'
})
export class ClientLayout {

  sidebarCollapsed = false;

  userProfile = {
    name: 'Usuario Cliente',
    email: 'cliente@jass.com',
    avatar: 'assets/images/Gotita.png',
    roles: ['CLIENT'],
    currentRole: 'CLIENT'
  };

  constructor(private readonly router: Router) { }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarToggled(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  onRoleChanged(newRole: string): void {
    // Manejar cambio de rol si es necesario
    console.log('Cambio de rol solicitado:', newRole);
  }

  onLogout(): void {
    // Lógica de logout
    console.log('Cerrando sesión...');
    this.router.navigate(['/auth/login']);
  }
}
