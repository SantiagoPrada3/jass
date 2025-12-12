import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
  currentRole: string;
}

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  providers: [DatePipe]
})
export class Header implements OnInit, OnDestroy {
  @Input() userProfile: UserProfile = {
    name: 'admin general',
    email: 'admin.general@empresa.com',
    avatar: '',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    currentRole: 'ADMIN'
  };

  @Input() sidebarCollapsed: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() roleChanged = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);

  isProfileMenuOpen: boolean = false;
  isNotificationsOpen: boolean = false;
  currentTime: Date = new Date();
  currentDateTime: string = '';
  private timeSubscription: Subscription | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const userMenuButton = document.querySelector('[data-user-menu-button]');
    const userMenuDropdown = document.querySelector('[data-user-menu-dropdown]');

    if (this.isProfileMenuOpen &&
      !userMenuButton?.contains(target) &&
      !userMenuDropdown?.contains(target)) {
      this.isProfileMenuOpen = false;
    }
  }

  ngOnInit(): void {
    this.startClock();
    this.updateDateTime();
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
  }



  startClock(): void {
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    this.currentDateTime = now.toLocaleDateString('es-ES', options);
  }

  getFormattedDate(): string {
    const date = this.currentTime;
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${dayName}, ${monthName} ${day}, ${year}`;
  }

  getFormattedTime(): string | null {
    return this.datePipe.transform(this.currentTime, 'h:mm:ss a');
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isNotificationsOpen = false;
    }
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }



  switchRole(): void {
    this.closeProfileMenu();

    // Primero navegar al role-selector SIN hacer logout
    this.router.navigate(['/role-selector']).then(() => {
      // Solo después de estar en role-selector, hacer logout
      this.logout.emit();

      // Limpiar storage como medida adicional
      setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.clear();
      }, 50);
    });
  }

  switchRoleToAdmin(): void {
    if (this.userProfile.roles.includes('ADMIN') && 'ADMIN' !== this.userProfile.currentRole) {
      this.closeProfileMenu();
      this.logout.emit();
      this.router.navigate(['/role-selector'], {
        queryParams: { preselectedRole: 'ADMIN' }
      });
    }
  }

  switchRoleToSuperAdmin(): void {
    if (this.userProfile.roles.includes('SUPER_ADMIN') && 'SUPER_ADMIN' !== this.userProfile.currentRole) {
      this.closeProfileMenu();
      this.logout.emit();
      this.router.navigate(['/role-selector'], {
        queryParams: { preselectedRole: 'SUPER_ADMIN' }
      });
    }
  }

  onLogout(): void {
    this.closeProfileMenu();
    this.logout.emit();
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  navigateToProfile(): void {
    // Navegar al perfil dentro del layout correspondiente según el rol
    const role = this.userProfile.currentRole;

    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin/my-profile']);
        break;
      case 'SUPER_ADMIN':
        this.router.navigate(['/super-admin/my-profile']);
        break;
      case 'CLIENT':
        this.router.navigate(['/client/profile']);
        break;
      default:
        this.router.navigate(['/profile']); // Fallback a la ruta general
    }
  }

  navigateToSettings(): void {
    // Navegar a configuración dentro del layout correspondiente según el rol
    const role = this.userProfile.currentRole;

    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin/profile-settings']);
        break;
      case 'SUPER_ADMIN':
        this.router.navigate(['/super-admin/settings']);
        break;
      case 'CLIENT':
        this.router.navigate(['/client/account-settings']);
        break;
      default:
        this.router.navigate(['/profile']); // Fallback a la ruta general
    }
  }

  hasMultipleRoles(): boolean {
    return this.userProfile.roles && this.userProfile.roles.length > 1;
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'SUPER_ADMIN': 'Super Administrador',
      'ADMIN': 'Administrador',
      'CLIENT': 'Cliente'
    };
    return roleNames[role] || role;
  }

  getInitials(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  // Mock notifications - en producción vendría de un servicio
  notifications = [
    {
      id: 1,
      title: 'Nueva incidencia reportada',
      message: 'Se ha reportado un problema en la zona norte',
      time: 'Hace 5 min',
      type: 'warning',
      read: false
    },
    {
      id: 2,
      title: 'Mantenimiento programado',
      message: 'Mantenimiento del sistema mañana a las 2:00 AM',
      time: 'Hace 2 horas',
      type: 'info',
      read: false
    },
    {
      id: 3,
      title: 'Pago procesado',
      message: 'El pago del usuario #1234 fue procesado exitosamente',
      time: 'Hace 1 día',
      type: 'success',
      read: true
    }
  ];

  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markNotificationAsRead(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }
}
