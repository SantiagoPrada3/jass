import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface UserProfile {
  name: string;
  roles?: string[];
  avatar?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  @Input() currentRole: string = 'ADMIN';
  @Input() isCollapsed: boolean = false;
  @Input() userProfile?: UserProfile;
  @Output() sidebarToggled = new EventEmitter<boolean>();

  openDropdowns: { [key: string]: boolean } = {
    personas: false,
    suministros: false,
    inventario: false,
    distribucion: false,
    calidadAgua: false,
    incidencias: false,
    organizaciones: false
  };

  isMobile: boolean = false;

  constructor(public router: Router) { }

  ngOnInit(): void {
    this.checkScreenSize();
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  @HostListener('window:resize')
  onResize() {
    const wasMobile = this.isMobile;
    this.checkScreenSize();

    if (wasMobile && !this.isMobile) {
      this.isCollapsed = false;
      this.sidebarToggled.emit(this.isCollapsed);
    } else if (!wasMobile && this.isMobile) {
      this.isCollapsed = true;
      this.sidebarToggled.emit(this.isCollapsed);
    }
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 1024;
  }

  toggleDropdown(dropdownKey: string) {
    if (this.isCollapsed) return;

    this.openDropdowns[dropdownKey] = !this.openDropdowns[dropdownKey];
  }

  openDropdownIfDesktop(dropdownKey: string): void {
    if (!this.isMobile && this.isCollapsed) {
      this.isCollapsed = false;
      this.sidebarToggled.emit(this.isCollapsed);

      // Esperar a que el sidebar se abra y luego abrir el dropdown
      setTimeout(() => {
        this.openDropdowns[dropdownKey] = true;
      }, 300); // 300ms es la duración de la transición del sidebar
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    if (this.isMobile) {
      this.toggleSidebar();
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'SUPER_ADMIN': 'Super Administrador',
      'ADMIN': 'Administrador',
      'CLIENT': 'Cliente'
    };
    return roleNames[role] || role;
  }
}
