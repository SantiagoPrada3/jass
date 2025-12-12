import { Component, OnInit, inject } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';
import { OrganizationApi } from '../../../modules/organization-management/services/organization-api';
import { Organization } from '../../../modules/organization-management/models/organization.model';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-global-analytics',
  standalone: true,
  imports: [Breadcrumb, BaseChartDirective],
  templateUrl: './global-analytics.html',
  styleUrl: './global-analytics.css'
})
export class GlobalAnalytics implements OnInit {
  private readonly organizationApi = inject(OrganizationApi);

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio Global',
      url: '/super-admin/dashboard',
      icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Analytics Global',
      icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  // Charts
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4 // Smooth curves
      }
    },
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Tendencia de Crecimiento (2025)' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };
  public lineChartType: ChartType = 'line';
  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Nuevas Organizaciones',
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue with opacity
        borderColor: '#3b82f6',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#fff',
        fill: 'origin',
      }
    ]
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
    }
  };
  public pieChartType: ChartType = 'doughnut';
  public pieChartData: ChartData<'doughnut'> = {
    labels: ['Activas', 'Inactivas'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      hoverBackgroundColor: ['#16a34a', '#dc2626']
    }]
  };

  public pieChartAdminsData: ChartData<'doughnut'> = {
    labels: ['Activos', 'Inactivos'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#8b5cf6', '#9ca3af'],
      hoverBackgroundColor: ['#7c3aed', '#6b7280']
    }]
  };

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  loadAnalyticsData(): void {
    // Load Organizations
    this.organizationApi.getOrganizations().subscribe({
      next: (orgs) => {
        const activeOrgs = orgs.filter(o => o.status === 'ACTIVE').length;
        const inactiveOrgs = orgs.filter(o => o.status !== 'ACTIVE').length;

        // Update Pie Chart Data
        this.pieChartData = {
          ...this.pieChartData,
          datasets: [{
            ...this.pieChartData.datasets[0],
            data: [activeOrgs, inactiveOrgs]
          }]
        };

        // Process Bar Chart Data (Organizations by Month)
        this.processOrganizationGrowth(orgs);
      },
      error: (err) => console.error('Error loading organizations', err)
    });

    // Load Admins
    this.organizationApi.getAllAdmins().subscribe({
      next: (admins) => {
        const activeAdmins = admins.filter(a => a.status === 'ACTIVE').length;
        const inactiveAdmins = admins.filter(a => a.status !== 'ACTIVE').length;

        // Update Admin Pie Chart
        this.pieChartAdminsData = {
          ...this.pieChartAdminsData,
          datasets: [{
            ...this.pieChartAdminsData.datasets[0],
            data: [activeAdmins, inactiveAdmins]
          }]
        };
      },
      error: (err) => console.error('Error loading admins', err)
    });
  }

  private processOrganizationGrowth(orgs: Organization[]): void {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();
    const monthlyCounts = new Array(12).fill(0);

    console.log('Processing Organization Growth for year:', currentYear);

    orgs.forEach(org => {
      console.log('Org:', org.organizationName, 'CreatedAt:', org.createdAt);
      const date = new Date(org.createdAt);
      console.log('Parsed Date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth());

      if (date.getFullYear() === currentYear) {
        monthlyCounts[date.getMonth()]++;
      }
    });

    this.lineChartData = {
      labels: months,
      datasets: [
        {
          data: monthlyCounts,
          label: `Nuevas Organizaciones (${currentYear})`,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3b82f6',
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: '#fff',
          fill: 'origin',
        }
      ]
    };
  }
}
