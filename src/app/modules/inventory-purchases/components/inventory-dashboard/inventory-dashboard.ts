import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { InventoryApi } from '../../services/inventory-api';
import { AuthService } from '../../../../core/auth/services/auth';
import {
  DashboardStats,
  RecentActivity,
  TopProduct,
  ProductStats,
  PurchaseStats,
  MovementStats,
  SupplierStats
} from '../../models/dashboard-stats.model';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, Breadcrumb],
  templateUrl: './inventory-dashboard.html'
})
export class InventoryDashboard implements OnInit, OnDestroy {
  private readonly inventoryApi = inject(InventoryApi);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // Estados de carga
  loading = true;
  error: string | null = null;

  // Datos del dashboard
  dashboardStats: DashboardStats | null = null;
  productStats: ProductStats | null = null;
  purchaseStats: PurchaseStats | null = null;
  movementStats: MovementStats | null = null;
  supplierStats: SupplierStats | null = null;
  recentActivities: RecentActivity[] = [];
  lowStockProducts: TopProduct[] = [];

  // Breadcrumb
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Panel de Control',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Inventario y Compras',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      label: 'Dashboard',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    }
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    // Obtener organizationId del usuario actual
    const organizationId = this.authService.getCurrentUser()?.organizationId;
    if (!organizationId) {
      this.error = 'No se pudo obtener el ID de la organización';
      this.loading = false;
      return;
    }

    // Cargar todas las estadísticas en paralelo
    forkJoin({
      dashboard: this.inventoryApi.getDashboardStats(organizationId),
      products: this.inventoryApi.getProductStats(organizationId),
      purchases: this.inventoryApi.getPurchaseStats(organizationId),
      movements: this.inventoryApi.getMovementStats(organizationId),
      suppliers: this.inventoryApi.getSupplierStats(organizationId),
      activities: this.inventoryApi.getRecentActivities(organizationId, 8),
      lowStock: this.inventoryApi.getTopProducts(organizationId, 'low-stock', 5)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        // Debug: Ver qué datos están llegando
        console.log('=== DEBUG DASHBOARD DATA ===');
        console.log('Dashboard Stats:', data.dashboard);
        console.log('Product Stats:', data.products);
        console.log('Purchase Stats:', data.purchases);
        console.log('Movement Stats:', data.movements);
        console.log('Supplier Stats:', data.suppliers);

        this.dashboardStats = data.dashboard;
        this.productStats = data.products;
        this.purchaseStats = data.purchases;
        this.movementStats = data.movements;
        this.supplierStats = data.suppliers;
        this.recentActivities = data.activities;
        this.lowStockProducts = data.lowStock;
      },
      error: (error) => {
        console.error('Error cargando datos del dashboard:', error);
        this.error = 'Error al cargar los datos del dashboard. Por favor, inténtalo de nuevo.';
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'purchase':
        return 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z';
      case 'movement':
        return 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4';
      case 'adjustment':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      default:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getActivityStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);

    // Verificar si la fecha es válida
    if (isNaN(date.getTime()) || !dateString) {
      return 'Fecha inválida';
    }

    const diffInDays = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Verificar que el resultado sea un número finito
    if (!isFinite(diffInDays)) {
      return 'Fecha inválida';
    }

    return new Intl.RelativeTimeFormat('es-PE', { numeric: 'auto' })
      .format(diffInDays, 'day');
  }

  getStockStatusColor(product: TopProduct): string {
    const percentage = (product.currentStock / product.maxStock) * 100;
    if (percentage <= 10) return 'text-red-600 bg-red-50';
    if (percentage <= 25) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }

  getStockPercentage(product: TopProduct): number {
    return Math.round((product.currentStock / product.maxStock) * 100);
  }
}
