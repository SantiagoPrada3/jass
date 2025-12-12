import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth';
import { Sidebar } from '../../shared/components/ui/sidebar/sidebar';
import { Header } from '../../shared/components/ui/header/header';
import { Toast } from '../../shared/components/ui/notifications/toast/toast';
import { WhatsAppQrModalComponent } from '../../shared/components/ui/modals/whatsapp-qr-modal/whatsapp-qr-modal.component';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar, Header, Toast, WhatsAppQrModalComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  sidebarCollapsed: boolean = false;
  currentRole: string = 'ADMIN';
  showWhatsAppModal = false;

  ngOnInit() {
    this.checkWhatsAppStatus();
  }

  checkWhatsAppStatus() {
    // Only check if user is ADMIN
    if (this.currentRole === 'ADMIN') {
      this.notificationService.getStatus().subscribe({
        next: (response) => {
          if (response.status === 'DISCONNECTED' || response.status === 'QR_READY') {
            this.showWhatsAppModal = true;
          }
        },
        error: (err) => {
          console.error('Error checking WhatsApp status', err);
        }
      });
    }
  }

  get userProfile() {
    const user = this.authService.getCurrentUser();
    return {
      name: user ? `${user.firstName} ${user.lastName}` : 'admin general',
      email: user?.email || 'admin.general@empresa.com',
      avatar: '',
      roles: ['ADMIN', 'SUPER_ADMIN'],
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

    if (newRole === 'SUPER_ADMIN') {
      this.router.navigate(['/super-admin/dashboard']);
    } else {
      this.router.navigate(['/admin/dashboard']);
      this.checkWhatsAppStatus();
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  onWhatsAppModalClose() {
    this.showWhatsAppModal = false;
  }

  onWhatsAppConnected() {
    this.showWhatsAppModal = false;
    // Optional: Show success toast
  }

}
