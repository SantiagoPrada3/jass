import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth';
import { OrganizationApi } from '../../../modules/organization-management/services/organization-api';
import { UsersApi } from '../../../modules/organization-management/services/user-api';
import { Organization } from '../../../modules/organization-management/models/organization.model';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Breadcrumb],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly organizationApi = inject(OrganizationApi);
  private readonly usersApi = inject(UsersApi);
  private readonly router = inject(Router);

  organization: Organization | null = null;
  loading = true;
  currentDate = new Date();
  formattedDate: string = '';
  userName: string = '';

  // Stats
  stats = {
    zones: 0,
    streets: 0,
    users: 0
  };

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Dashboard'
    }
  ];

  ngOnInit(): void {
    this.formatDate();
    this.loadUserData();
    this.loadOrganizationData();
  }

  private formatDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    // Capitalize first letter
    const dateStr = this.currentDate.toLocaleDateString('es-PE', options);
    this.formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  private loadUserData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  private loadOrganizationData(): void {
    const user = this.authService.getCurrentUser();
    if (user?.organizationId) {
      this.organizationApi.getOrganizationById(user.organizationId).subscribe({
        next: (org) => {
          this.organization = org;
          this.calculateStats(org);
          this.loadUserStats(user.organizationId);
        },
        error: (err) => {
          console.error('Error loading organization', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  private loadUserStats(organizationId: string): void {
    this.usersApi.getAllClients(organizationId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.users = response.data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users stats', err);
        this.loading = false;
      }
    });
  }

  private calculateStats(org: Organization | null): void {
    if (!org) return;

    this.stats.zones = org.zones ? org.zones.length : 0;

    // Calculate total streets from zones
    let totalStreets = 0;
    if (org.zones) {
      org.zones.forEach(zone => {
        if (zone.streets) {
          totalStreets += zone.streets.length;
        }
      });
    }
    this.stats.streets = totalStreets;
  }

  // Navigation Methods
  navigateToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  navigateToPayments(): void {
    this.router.navigate(['/admin/payments']);
  }

  navigateToReports(): void {
    this.router.navigate(['/admin/reports']);
  }
}
