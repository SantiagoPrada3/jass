import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UsersApi } from '../../user-management/services/users-api';

import { environment } from '../../../../environments/environment';
import {
  DashboardStats,
  DashboardResponse,
  RecentActivity,
  TopProduct,
  ProductStats,
  PurchaseStats,
  MovementStats,
  SupplierStats
} from '../models/dashboard-stats.model';
import {
  Product,
  ProductStatus,
  ProductRequest,
  ProductResponse,
  ProductFilters,
  ProductCategory,
  Supplier
} from '../models/product.model';
import {
  PurchaseOrder,
  InventoryMovement,
  PurchaseStatus,
  MovementType
} from '../models/purchase-order.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryApi {
  private readonly http = inject(HttpClient);
  private readonly usersApi = inject(UsersApi);
  private readonly baseUrl = environment.services.gateway;

  // Dashboard endpoints - USANDO APIs REALES QUE EXISTEN
  getDashboardStats(organizationId: string): Observable<DashboardStats> {
    // Calculamos estadísticas usando las APIs reales que sí existen
    return forkJoin({
      products: this.getProducts(organizationId),
      purchases: this.getPurchaseOrders(organizationId),
      movements: this.getInventoryMovements(organizationId),
      suppliers: this.getSuppliers(organizationId)
    }).pipe(
      map(({ products, purchases, movements, suppliers }) => {
        // Debug: Ver estructura completa de los datos
        console.log('=== DEBUG DASHBOARD STATS ===');
        console.log('Compras:', purchases.length);
        if (purchases.length > 0) {
          console.log('Primera compra:', purchases[0]);
        }
        console.log('Movimientos:', movements.length);
        if (movements.length > 0) {
          console.log('Primer movimiento completo:', JSON.stringify(movements[0], null, 2));
          console.log('Campos del movimiento:', Object.keys(movements[0]));
        }

        // CORREGIDO: Usar totalAmount que es el campo real de la API
        const totalValue = purchases.reduce((sum, p: any) => {
          const value = p.totalAmount || p.total || 0;
          return sum + value;
        }, 0);
        console.log('Valor total calculado:', totalValue);

        // CORREGIDO: Los estados reales son COMPLETADO, PENDIENTE, etc.
        const pendingPurchases = purchases.filter((p: any) => {
          const status = String(p.status).toUpperCase();
          return status === 'PENDIENTE' || status === 'PENDING' || status === 'ORDENADO';
        }).length;
        console.log('Compras pendientes:', pendingPurchases);

        // Movimientos recientes (últimos 7 días)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentMovements = movements.filter((m: any) => {
          const moveDate = new Date(m.performedAt || m.createdAt || m.movementDate);
          return moveDate >= weekAgo;
        }).length;
        console.log('Movimientos recientes:', recentMovements);

        return {
          totalProducts: products.length,
          totalPurchases: purchases.length,
          totalMovements: movements.length,
          totalSuppliers: suppliers.length,
          totalValue: totalValue,
          lowStockProducts: products.filter(p => p.currentStock <= p.minimumStock).length,
          pendingPurchases: pendingPurchases,
          recentMovements: recentMovements
        };
      })
    );
  }

  getProductStats(organizationId: string): Observable<ProductStats> {
    return this.getProducts(organizationId).pipe(
      map(products => {
        // Debug: Ver los datos de productos
        console.log('=== DEBUG PRODUCTS ===');
        console.log('Total productos:', products.length);
        console.log('Categorías únicas:', new Set(products.map(p => p.categoryName)));
        console.log('Sample product:', products[0]);

        return {
          totalProducts: products.length,
          lowStockProducts: products.filter(p => p.currentStock <= p.minimumStock).length,
          outOfStockProducts: products.filter(p => p.currentStock === 0).length,
          activeProducts: products.filter(p => p.status === ProductStatus.ACTIVO).length,
          totalCategories: new Set(products.map(p => p.categoryName)).size
        };
      })
    );
  }

  getPurchaseStats(organizationId: string): Observable<PurchaseStats> {
    return this.getPurchaseOrders(organizationId).pipe(
      map(purchases => {
        // CORREGIDO: Usar totalAmount que es el campo real
        const totalValue = purchases.reduce((sum, p: any) => sum + (p.totalAmount || p.total || 0), 0);

        // CORREGIDO: Los estados reales son COMPLETADO, PENDIENTE, etc.
        const completed = purchases.filter((p: any) => {
          const status = String(p.status).toUpperCase();
          return status === 'COMPLETADO' || status === 'RECIBIDO' || status === 'RECEIVED';
        });
        const pending = purchases.filter((p: any) => {
          const status = String(p.status).toUpperCase();
          return status === 'PENDIENTE' || status === 'PENDING' || status === 'ORDENADO';
        });

        console.log('=== PURCHASE STATS ===');
        console.log('Total:', purchases.length, 'Valor:', totalValue, 'Pendientes:', pending.length, 'Completadas:', completed.length);

        return {
          totalPurchases: purchases.length,
          totalValue,
          pendingPurchases: pending.length,
          completedPurchases: completed.length,
          averagePurchaseValue: purchases.length > 0 ? totalValue / purchases.length : 0
        };
      })
    );
  }

  getMovementStats(organizationId: string): Observable<MovementStats> {
    return this.getInventoryMovements(organizationId).pipe(
      map(movements => {
        // Detectar diferentes variaciones de tipos
        const incoming = movements.filter((m: any) => {
          const type = String(m.type || m.movementType || '').toUpperCase();
          return type === 'INCOMING' || type === 'ENTRADA' || type === 'ENTRY';
        });
        const outgoing = movements.filter((m: any) => {
          const type = String(m.type || m.movementType || '').toUpperCase();
          return type === 'OUTGOING' || type === 'SALIDA' || type === 'EXIT';
        });
        const consumption = movements.filter((m: any) => {
          const type = String(m.type || m.movementType || '').toUpperCase();
          return type === 'CONSUMPTION' || type === 'CONSUMO' || type === 'CONSUME';
        });
        const adjustment = movements.filter((m: any) => {
          const type = String(m.type || m.movementType || '').toUpperCase();
          return type === 'ADJUSTMENT' || type === 'AJUSTE' || type === 'ADJUST';
        });

        console.log('=== MOVEMENT STATS ===');
        console.log('Total:', movements.length, 'Entradas:', incoming.length, 'Salidas:', outgoing.length, 'Consumos:', consumption.length, 'Ajustes:', adjustment.length);
        if (movements.length > 0) {
          console.log('Tipos únicos:', new Set(movements.map((m: any) => m.type || m.movementType)));
        }

        return {
          totalMovements: movements.length,
          incomingMovements: incoming.length,
          outgoingMovements: outgoing.length,
          consumptionMovements: consumption.length,
          adjustmentMovements: adjustment.length
        };
      })
    );
  }

  getSupplierStats(organizationId: string): Observable<SupplierStats> {
    return this.getSuppliers(organizationId).pipe(
      map(suppliers => ({
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.status).length,
        inactiveSuppliers: suppliers.filter(s => !s.status).length
      }))
    );
  }

  getRecentActivities(organizationId: string, limit: number = 10): Observable<RecentActivity[]> {
    // Combinamos movimientos y compras para crear actividades recientes
    return forkJoin({
      movements: this.getInventoryMovements(organizationId),
      purchases: this.getPurchaseOrders(organizationId)
    }).pipe(
      map(({ movements, purchases }) => {
        const activities: RecentActivity[] = [];

        // Agregar movimientos como actividades
        movements.slice(-limit / 2).forEach(movement => {
          activities.push({
            id: movement.id,
            type: 'movement',
            description: `Movimiento de ${movement.type}: ${movement.productName}`,
            date: movement.performedAt,
            value: movement.quantity,
            status: 'completed'
          });
        });

        // Agregar compras como actividades
        purchases.slice(-limit / 2).forEach(purchase => {
          activities.push({
            id: purchase.id,
            type: 'purchase',
            description: `Compra: ${purchase.notes || purchase.code || 'Nueva compra'}`,
            date: purchase.purchaseDate,
            value: purchase.total,
            status: purchase.status.toLowerCase() as any
          });
        });

        return activities
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit);
      })
    );
  }

  getTopProducts(organizationId: string, type: 'low-stock' | 'most-moved' | 'high-value' = 'low-stock', limit: number = 5): Observable<TopProduct[]> {
    return this.getProducts(organizationId).pipe(
      map(products => {
        let filtered: TopProduct[];

        switch (type) {
          case 'low-stock':
            filtered = products
              .filter(p => p.currentStock <= p.minimumStock)
              .map(p => ({
                id: p.productId,
                name: p.productName,
                currentStock: p.currentStock,
                minStock: p.minimumStock,
                maxStock: p.maximumStock || p.minimumStock * 3,
                totalMovements: 0, // Se podría calcular con los movimientos
                category: p.categoryName || 'Sin categoría'
              }));
            break;
          case 'high-value':
            filtered = products
              .filter(p => p.unitCost > 0)
              .sort((a, b) => (b.unitCost * b.currentStock) - (a.unitCost * a.currentStock))
              .map(p => ({
                id: p.productId,
                name: p.productName,
                currentStock: p.currentStock,
                minStock: p.minimumStock,
                maxStock: p.maximumStock || p.minimumStock * 3,
                totalMovements: 0,
                category: p.categoryName || 'Sin categoría'
              }));
            break;
          default:
            filtered = products.map(p => ({
              id: p.productId,
              name: p.productName,
              currentStock: p.currentStock,
              minStock: p.minimumStock,
              maxStock: p.maximumStock || p.minimumStock * 3,
              totalMovements: 0,
              category: p.categoryName || 'Sin categoría'
            }));
        }

        return filtered.slice(0, limit);
      })
    );
  }

  // Material/Product endpoints - USANDO TUS APIs REALES
  getProducts(organizationId?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    return this.http.get<{ status: boolean; data: Product[] }>(`${this.baseUrl}/admin/materials`, { params })
      .pipe(map(response => response.data));
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<{ status: boolean; data: Product }>(`${this.baseUrl}/admin/materials/${id}`)
      .pipe(map(response => response.data));
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<{ status: boolean; data: Product }>(`${this.baseUrl}/admin/materials`, product)
      .pipe(map(response => response.data));
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<{ status: boolean; data: Product }>(`${this.baseUrl}/admin/materials/${id}`, product)
      .pipe(map(response => response.data));
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/materials/${id}`);
  }

  restoreProduct(id: string): Observable<Product> {
    return this.http.patch<{ status: boolean; data: Product }>(`${this.baseUrl}/admin/materials/${id}/restore`, {})
      .pipe(map(response => response.data));
  }

  getProductsByStatus(organizationId: string, status: string): Observable<Product[]> {
    let params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<{ status: boolean; data: Product[] }>(`${this.baseUrl}/admin/materials/status/${status}`, { params })
      .pipe(map(response => response.data));
  }

  getProductsByCategory(organizationId: string, categoryId: string): Observable<Product[]> {
    let params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<{ status: boolean; data: Product[] }>(`${this.baseUrl}/admin/materials/category/${categoryId}`, { params })
      .pipe(map(response => response.data));
  }

  // Purchase Order endpoints
  getPurchaseOrders(organizationId?: string): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    return this.http.get<{ success: boolean; data: PurchaseOrder[] }>(`${this.baseUrl}/admin/purchases`, { params })
      .pipe(map(response => response.data));
  }

  getPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.http.get<{ success: boolean; data: PurchaseOrder }>(`${this.baseUrl}/admin/purchases/${id}`)
      .pipe(map(response => response.data));
  }

  createPurchaseOrder(purchase: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.post<{ success: boolean; data: PurchaseOrder }>(`${this.baseUrl}/admin/purchases`, purchase)
      .pipe(map(response => response.data));
  }

  updatePurchaseOrder(id: string, purchase: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.put<{ success: boolean; data: PurchaseOrder }>(`${this.baseUrl}/admin/purchases/${id}`, purchase)
      .pipe(map(response => response.data));
  }

  // Inventory Movement endpoints - ENRIQUECIDO DESDE EL BACKEND 🚀
  getInventoryMovements(organizationId?: string): Observable<InventoryMovement[]> {
    console.log('🚀🚀🚀 USANDO ENDPOINT ENRIQUECIDO DEL BACKEND 🚀🚀🚀');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('� Organization ID:', organizationId);

    if (!organizationId) {
      console.warn('⚠️ No se proporcionó organizationId, devolviendo array vacío');
      return of([]);
    }

    // ✨ NUEVA VERSIÓN: Una sola petición al backend que ya trae TODO enriquecido
    const enrichedUrl = `${this.baseUrl}/admin/inventory-movements/organization/${organizationId}/enriched`;
    console.log('📞 Llamando al endpoint enriquecido:', enrichedUrl);

    return this.http.get<any>(enrichedUrl).pipe(
      map(response => {
        const movements = response.data || [];
        console.log(`✅ Recibidos ${movements.length} movimientos ENRIQUECIDOS desde el backend`);
        if (movements.length > 0) {
          console.log('📦 Muestra de datos recibidos:', movements[0]);
        }
        return movements;
      }),
      catchError(error => {
        console.error('❌ ERROR al obtener movimientos enriquecidos:', error);
        console.error('   Status:', error.status);
        console.error('   URL:', enrichedUrl);
        return of([]);
      })
    );
  }

  getInventoryMovementsByProduct(organizationId: string, productId: string): Observable<InventoryMovement[]> {
    return this.getInventoryMovements(organizationId).pipe(
      map(movements => movements.filter(movement => movement.productId === productId))
    );
  }

  getInventoryMovement(movementId: string): Observable<InventoryMovement> {
    return this.http.get<InventoryMovement>(`${this.baseUrl}/admin/inventory-movements/${movementId}`);
  }

  createInventoryMovement(movement: Partial<InventoryMovement>): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/admin/inventory-movements`, movement);
  }

  getCurrentStock(organizationId: string, productId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/admin/inventory-movements/stock/${organizationId}/${productId}`);
  }

  getMovementsCount(organizationId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/admin/inventory-movements/count/${organizationId}`);
  }

  registerConsumption(consumption: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/inventory-movements/consumption`, consumption);
  }

  getLastMovement(organizationId: string, productId: string): Observable<InventoryMovement> {
    return this.http.get<{ success: boolean; data: InventoryMovement }>(`${this.baseUrl}/admin/inventory-movements/last-movement/${organizationId}/${productId}`)
      .pipe(map(response => response.data));
  }

  // Categories endpoints - USANDO TUS APIs REALES
  getCategories(organizationId?: string): Observable<ProductCategory[]> {
    let params = new HttpParams();
    if (organizationId) {
      params = params.set('organizationId', organizationId);
    }
    return this.http.get<{ success: boolean; data: ProductCategory[] }>(`${this.baseUrl}/admin/product-categories`, { params })
      .pipe(map(response => response.data));
  }

  getCategory(id: string): Observable<ProductCategory> {
    return this.http.get<{ success: boolean; data: ProductCategory }>(`${this.baseUrl}/admin/product-categories/${id}`)
      .pipe(map(response => response.data));
  }

  createCategory(category: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.post<{ success: boolean; data: ProductCategory }>(`${this.baseUrl}/admin/product-categories`, category)
      .pipe(map(response => response.data));
  }

  updateCategory(id: string, category: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.put<{ success: boolean; data: ProductCategory }>(`${this.baseUrl}/admin/product-categories/${id}`, category)
      .pipe(map(response => response.data));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/product-categories/${id}`);
  }

  getCategoriesByStatus(organizationId: string, status: string): Observable<ProductCategory[]> {
    let params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<{ success: boolean; data: ProductCategory[] }>(`${this.baseUrl}/admin/product-categories/status/${status}`, { params })
      .pipe(map(response => response.data));
  }

  restoreCategory(id: string): Observable<ProductCategory> {
    return this.http.patch<{ success: boolean; data: ProductCategory }>(`${this.baseUrl}/admin/product-categories/${id}/restore`, {})
      .pipe(map(response => response.data));
  }

  // Suppliers endpoints - USANDO TUS APIs REALES
  getSuppliers(organizationId: string): Observable<Supplier[]> {
    let params = new HttpParams();
    params = params.set('organizationId', organizationId);
    return this.http.get<{ success: boolean; data: Supplier[] }>(`${this.baseUrl}/admin/suppliers`, { params })
      .pipe(map(response => response.data));
  }

  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<{ success: boolean; data: Supplier }>(`${this.baseUrl}/admin/suppliers/${id}`)
      .pipe(map(response => response.data));
  }

  createSupplier(supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<{ success: boolean; data: Supplier }>(`${this.baseUrl}/admin/suppliers`, supplier)
      .pipe(map(response => response.data));
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<{ success: boolean; data: Supplier }>(`${this.baseUrl}/admin/suppliers/${id}`, supplier)
      .pipe(map(response => response.data));
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/suppliers/${id}`);
  }

  getSuppliersByStatus(organizationId: string, status: string): Observable<Supplier[]> {
    let params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<{ success: boolean; data: Supplier[] }>(`${this.baseUrl}/admin/suppliers/status/${status}`, { params })
      .pipe(map(response => response.data));
  }

  restoreSupplier(id: string): Observable<Supplier> {
    return this.http.patch<{ success: boolean; data: Supplier }>(`${this.baseUrl}/admin/suppliers/${id}/restore`, {})
      .pipe(map(response => response.data));
  }
}
