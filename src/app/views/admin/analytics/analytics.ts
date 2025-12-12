import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AuthService } from '../../../core/auth/services/auth';
import { UsersApi } from '../../../modules/user-management/services/users-api';
import { PaymentsApi } from '../../../modules/payments-billing/services/payments-api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, Breadcrumb, BaseChartDirective],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class Analytics implements OnInit {
  private authService = inject(AuthService);
  private usersApi = inject(UsersApi);
  private paymentsApi = inject(PaymentsApi);

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Analytics'
    }
  ];

  // Chart Options
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      }
    }
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4, // Smooth curves
        fill: 'origin'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: { display: true }
    }
  };

  // User Status Chart (Pie)
  public userStatusChartType: ChartType = 'pie';
  public userStatusChartData: ChartData<'pie'> = {
    labels: ['Activos', 'Inactivos'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      hoverBackgroundColor: ['#16a34a', '#dc2626']
    }]
  };

  // Payment Status Chart (Doughnut)
  public paymentStatusChartType: ChartType = 'doughnut';
  public paymentStatusChartData: ChartData<'doughnut'> = {
    labels: ['Pagados', 'Pendientes/Otros'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#3b82f6', '#f59e0b'],
      hoverBackgroundColor: ['#2563eb', '#d97706']
    }]
  };

  // Income Chart (Line Area)
  public incomeChartType: ChartType = 'line';
  public incomeChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        data: [],
        label: 'Ingresos Mensuales (S/)',
        backgroundColor: 'rgba(139, 92, 246, 0.2)', // Purple with opacity
        borderColor: '#8b5cf6',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#8b5cf6',
        pointHoverBackgroundColor: '#8b5cf6',
        pointHoverBorderColor: '#fff',
        fill: 'origin',
      }
    ]
  };

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  async loadAnalyticsData() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.organizationId) {
      console.error('No organization ID found for current user');
      return;
    }

    const orgId = user.organizationId;

    try {
      // 1. Load User Data
      const usersResponse = await firstValueFrom(this.usersApi.getAllClients(orgId));
      if (usersResponse.success && usersResponse.data) {
        const activeUsers = usersResponse.data.filter(u => u.status === 'ACTIVE').length;
        const inactiveUsers = usersResponse.data.filter(u => u.status !== 'ACTIVE').length;

        this.userStatusChartData = {
          ...this.userStatusChartData,
          datasets: [{
            ...this.userStatusChartData.datasets[0],
            data: [activeUsers, inactiveUsers]
          }]
        };
      }

      // 2. Load Payment Data
      // Note: Assuming getEnrichedPayments returns all payments, we might need to filter by orgId if the backend doesn't.
      // Ideally, the backend should filter for the logged-in admin.
      const paymentsResponse: any = await firstValueFrom(this.paymentsApi.getEnrichedPayments());
      console.log('Payments Response:', paymentsResponse);

      let paymentsData: any[] = [];
      if (Array.isArray(paymentsResponse)) {
        paymentsData = paymentsResponse;
      } else if (paymentsResponse && paymentsResponse.data && Array.isArray(paymentsResponse.data)) {
        paymentsData = paymentsResponse.data;
      } else {
        console.warn('Unexpected payments response structure:', paymentsResponse);
      }

      if (paymentsData.length > 0) {
        // Filter by organization just in case
        const orgPayments = paymentsData.filter(p => p.organizationId === orgId);

        // Payment Status
        const paidCount = orgPayments.filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'COMPLETED').length; // Adjust status codes as needed
        const otherCount = orgPayments.length - paidCount;

        this.paymentStatusChartData = {
          ...this.paymentStatusChartData,
          datasets: [{
            ...this.paymentStatusChartData.datasets[0],
            data: [paidCount, otherCount]
          }]
        };

        // Monthly Income
        const currentYear = new Date().getFullYear();
        const monthlyIncome = new Array(12).fill(0);

        orgPayments.forEach(p => {
          const date = new Date(p.paymentDate || p.createdAt);
          if (date.getFullYear() === currentYear) {
            monthlyIncome[date.getMonth()] += Number(p.totalAmount || 0);
          }
        });

        this.incomeChartData = {
          ...this.incomeChartData,
          datasets: [{
            ...this.incomeChartData.datasets[0],
            data: monthlyIncome,
            label: `Ingresos Mensuales (${currentYear})`
          }]
        };
      }

    } catch (error) {
      console.error('Error loading analytics data', error);
    }
  }
}
