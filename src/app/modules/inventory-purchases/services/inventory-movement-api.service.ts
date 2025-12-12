import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
     InventoryMovement,
     InventoryMovementFilters,
     InventoryMovementApiResponse,
     InventoryMovementStats,
     EnrichedInventoryMovement,
     MovementType,
     MovementReason,
     ProductInfo,
     UserInfo
} from '../models/inventory-movement.model';

@Injectable({
     providedIn: 'root'
})
export class InventoryMovementApiService {
     private readonly baseUrl = `${environment.services.gateway}/admin`;

     constructor(private http: HttpClient) { }

     /**
      * Obtener movimientos de inventario por organización YA ENRIQUECIDOS desde el backend 🚀
      */
     getMovementsByOrganization(organizationId: string): Observable<InventoryMovement[]> {
          // ✨ NUEVO: Llamar al endpoint /enriched que trae todo enriquecido
          const url = `${this.baseUrl}/inventory-movements/organization/${organizationId}/enriched`;

          console.log('🚀 Llamando endpoint ENRIQUECIDO:', url);

          return this.http.get<any>(url).pipe(
               map(response => {
                    const movements = response.data || [];
                    console.log(`✅ ${movements.length} movimientos ENRIQUECIDOS recibidos`);
                    return this.sortMovementsByDate(movements);
               }),
               catchError(error => {
                    console.error('❌ Error obteniendo movimientos:', error);
                    return of([]);
               })
          );
     }

     /**
      * Obtener movimientos filtrados
      */
     getFilteredMovements(filters: InventoryMovementFilters): Observable<InventoryMovement[]> {
          return this.getMovementsByOrganization(filters.organizationId).pipe(
               map(movements => this.applyFilters(movements, filters))
          );
     }

     /**
      * Aplicar filtros a los movimientos
      */
     private applyFilters(movements: InventoryMovement[], filters: InventoryMovementFilters): InventoryMovement[] {
          let filtered = [...movements];

          // Filtro por término de búsqueda
          if (filters.searchTerm) {
               const searchTerm = filters.searchTerm.toLowerCase();
               filtered = filtered.filter(movement =>
                    movement.movementId.toLowerCase().includes(searchTerm) ||
                    movement.productId.toLowerCase().includes(searchTerm) ||
                    (movement.referenceDocument && movement.referenceDocument.toLowerCase().includes(searchTerm)) ||
                    (movement.observations && movement.observations.toLowerCase().includes(searchTerm))
               );
          }

          // Filtro por tipo de movimiento
          if (filters.movementType) {
               filtered = filtered.filter(movement => movement.movementType === filters.movementType);
          }

          // Filtro por razón de movimiento
          if (filters.movementReason) {
               filtered = filtered.filter(movement => movement.movementReason === filters.movementReason);
          }

          // Filtro por producto
          if (filters.productId) {
               filtered = filtered.filter(movement => movement.productId === filters.productId);
          }

          // Filtro por usuario
          if (filters.userId) {
               filtered = filtered.filter(movement => movement.userId === filters.userId);
          }

          // Filtro por fecha desde
          if (filters.dateFrom) {
               filtered = filtered.filter(movement =>
                    new Date(movement.movementDate) >= new Date(filters.dateFrom!)
               );
          }

          // Filtro por fecha hasta
          if (filters.dateTo) {
               filtered = filtered.filter(movement =>
                    new Date(movement.movementDate) <= new Date(filters.dateTo!)
               );
          }

          return this.sortMovementsByDate(filtered);
     }

     /**
      * Ordenar movimientos por fecha (más recientes primero)
      */
     private sortMovementsByDate(movements: InventoryMovement[]): InventoryMovement[] {
          return movements.sort((a, b) =>
               new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
          );
     }

     /**
      * Calcular estadísticas de movimientos
      */
     calculateStats(movements: InventoryMovement[]): InventoryMovementStats {
          const totalMovements = movements.length;
          const totalEntries = movements.filter(m => m.movementType === MovementType.ENTRADA).length;
          const totalExits = movements.filter(m => m.movementType === MovementType.SALIDA).length;

          const totalValue = movements.reduce((sum, movement) =>
               sum + (movement.quantity * movement.unitCost), 0
          );

          const averageValue = totalMovements > 0 ? totalValue / totalMovements : 0;

          // Movimientos recientes (últimos 7 días)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentMovements = movements.filter(m =>
               new Date(m.movementDate) >= sevenDaysAgo
          ).length;

          // Producto más activo
          const productCounts: { [key: string]: number } = {};
          movements.forEach(movement => {
               productCounts[movement.productId] = (productCounts[movement.productId] || 0) + 1;
          });

          const mostActiveProduct = Object.keys(productCounts).reduce((a, b) =>
               productCounts[a] > productCounts[b] ? a : b, ''
          );

          return {
               totalMovements,
               totalEntries,
               totalExits,
               totalValue,
               averageValue,
               mostActiveProduct,
               recentMovements
          };
     }

     /**
      * Formatear moneda peruana
      */
     formatCurrency(amount: number): string {
          return new Intl.NumberFormat('es-PE', {
               style: 'currency',
               currency: 'PEN',
               minimumFractionDigits: 2,
               maximumFractionDigits: 2
          }).format(amount);
     }

     /**
      * Formatear fecha en español
      */
     formatDate(dateString: string): string {
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('es-PE', {
               year: 'numeric',
               month: 'short',
               day: '2-digit',
               hour: '2-digit',
               minute: '2-digit',
               hour12: true
          }).format(date);
     }

     /**
      * Formatear fecha solo (sin hora)
      */
     formatDateOnly(dateString: string): string {
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('es-PE', {
               year: 'numeric',
               month: 'short',
               day: '2-digit'
          }).format(date);
     }

     /**
      * ✨ YA NO SE NECESITA - El backend devuelve movimientos enriquecidos
      * Mantenido solo para compatibilidad con exportToCSV
      */
     enrichMovements(movements: InventoryMovement[]): EnrichedInventoryMovement[] {
          // Los movimientos ya vienen enriquecidos del backend, solo agregamos formato
          return movements.map(movement => ({
               ...movement,
               productInfo: (movement as any).productInfo || {
                    productId: movement.productId,
                    productCode: 'PROD???',
                    productName: 'Producto desconocido',
                    category: 'General',
                    unit: 'unidades'
               },
               userInfo: (movement as any).userInfo || {
                    id: movement.userId,
                    userCode: 'USR???',
                    firstName: 'Usuario',
                    lastName: 'Desconocido',
                    fullName: 'Usuario Desconocido',
                    email: 'desconocido@jass.gob.pe'
               },
               formattedDate: (movement as any).formattedDate || this.formatDate(movement.movementDate),
               formattedCost: (movement as any).formattedCost || this.formatCurrency(movement.unitCost),
               formattedValue: (movement as any).formattedValue || this.formatCurrency(movement.quantity * movement.unitCost)
          }));
     }

     /**
      * Registrar consumo/salida de inventario
      */
     registerConsumption(payload: any): Observable<any> {
          const url = `${this.baseUrl}/inventory-movements/consumption`;
          console.log('🚀 Registrando salida de inventario:', url, payload);

          return this.http.post<any>(url, payload).pipe(
               map(response => {
                    console.log('✅ Salida registrada exitosamente:', response);
                    return response;
               }),
               catchError(error => {
                    console.error('❌ Error al registrar salida:', error);
                    throw error;
               })
          );
     }

     /**
      * Exportar movimientos a CSV
      */
     exportToCSV(movements: InventoryMovement[], filename: string = 'movimientos-inventario'): void {
          const enrichedMovements = this.enrichMovements(movements);

          const headers = [
               'Fecha',
               'Tipo',
               'Razón',
               'Código Producto',
               'Producto',
               'Cantidad',
               'Costo Unitario',
               'Valor Total',
               'Stock Anterior',
               'Stock Nuevo',
               'Documento Referencia',
               'Usuario',
               'Observaciones'
          ];

          const csvContent = [
               headers.join(','),
               ...enrichedMovements.map(movement => [
                    movement.formattedDate,
                    movement.movementType,
                    movement.movementReason,
                    movement.productInfo.productCode,
                    `"${movement.productInfo.productName}"`,
                    movement.quantity,
                    movement.unitCost,
                    movement.quantity * movement.unitCost,
                    movement.previousStock,
                    movement.newStock,
                    `"${movement.referenceDocument || 'N/A'}"`,
                    movement.userInfo.fullName,
                    `"${movement.observations || 'N/A'}"`
               ].join(','))
          ].join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');

          if (link.download !== undefined) {
               const url = URL.createObjectURL(blob);
               link.setAttribute('href', url);
               link.setAttribute('download', `${filename}-${new Date().getTime()}.csv`);
               link.style.visibility = 'hidden';
               document.body.appendChild(link);
               link.click();
               document.body.removeChild(link);
          }
     }
}
