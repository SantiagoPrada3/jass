import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';
import { OrganizationApi } from '../../../modules/organization-management/services/organization-api';
import { Organization, Zone } from '../../../modules/organization-management/models/organization.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Breadcrumb, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly organizationApi = inject(OrganizationApi);

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio Global',
      icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Dashboard Global'
    }
  ];

  // Metrics
  totalOrganizations = 0;
  activeOrganizations = 0;
  inactiveOrganizations = 0;
  totalAdmins = 0;
  activeAdmins = 0;
  inactiveAdmins = 0;
  totalZones = 0;
  activeZones = 0;
  inactiveZones = 0;

  currentDate = new Date();

  // Data
  recentOrganizations: Organization[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load Organizations
    this.organizationApi.getOrganizations().subscribe({
      next: (orgs) => {
        console.log('Dashboard Organizations Loaded:', orgs);
        this.totalOrganizations = orgs.length;
        this.activeOrganizations = orgs.filter(o => o.status === 'ACTIVE').length;
        this.inactiveOrganizations = orgs.filter(o => o.status !== 'ACTIVE').length;

        // Get recent organizations (last 4)
        this.recentOrganizations = [...orgs]
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 4);
      },
      error: (err) => console.error('Error loading organizations', err)
    });

    // Load Admins
    this.organizationApi.getAllAdmins().subscribe({
      next: (admins) => {
        console.log('Admins loaded:', admins);
        this.totalAdmins = admins.length;
        this.activeAdmins = admins.filter(a => a.status === 'ACTIVE').length;
        this.inactiveAdmins = admins.filter(a => a.status !== 'ACTIVE').length;
      },
      error: (err) => console.error('Error loading admins', err)
    });

    // Load Zones
    this.organizationApi.getAllZones().subscribe({
      next: (zones) => {
        this.totalZones = zones.length;
        this.activeZones = zones.filter(z => z.status === 'ACTIVE').length;
        this.inactiveZones = zones.filter(z => z.status !== 'ACTIVE').length;
      },
      error: (err) => console.error('Error loading zones', err),
      complete: () => this.loading = false
    });
  }
}
