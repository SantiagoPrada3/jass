import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
     Purchase,
     PurchaseApiResponse,
     PurchaseRequest,
     CreatePurchaseRequest,
     PurchaseStatusUpdateRequest,
     PurchaseFilters,
     PurchaseStatus
} from '../models/purchase.model';

@Injectable({
     providedIn: 'root'
})
export class PurchasesApiService {
     private readonly baseUrl = `${environment.services.gateway}/admin/purchases`;

     constructor(private readonly http: HttpClient) { }

     /**
      * Obtener todas las compras con información enriquecida
      */
     getAllPurchases(): Observable<Purchase[]> {
          return this.http.get<PurchaseApiResponse<Purchase[]>>(this.baseUrl)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              // Ordenar por código de compra de forma ascendente
                              return response.data.sort((a, b) => a.purchaseCode.localeCompare(b.purchaseCode));
                         }
                         throw new Error(response.error || 'Error al cargar las compras');
                    })
               );
     }

     /**
      * Obtener compras por organización con información enriquecida
      */
     getPurchasesByOrganization(organizationId: string): Observable<Purchase[]> {
          return this.http.get<PurchaseApiResponse<Purchase[]>>(`${this.baseUrl}/organization/${organizationId}`)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              // Ordenar por código de compra de forma ascendente
                              return response.data.sort((a, b) => a.purchaseCode.localeCompare(b.purchaseCode));
                         }
                         throw new Error(response.error || 'Error al cargar las compras de la organización');
                    })
               );
     }

     /**
      * Obtener compras por estado con información enriquecida
      */
     getPurchasesByStatus(status: PurchaseStatus): Observable<Purchase[]> {
          return this.http.get<PurchaseApiResponse<Purchase[]>>(`${this.baseUrl}/status/${status}`)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              // Ordenar por código de compra de forma ascendente
                              return response.data.sort((a, b) => a.purchaseCode.localeCompare(b.purchaseCode));
                         }
                         throw new Error(response.error || 'Error al cargar las compras por estado');
                    })
               );
     }

     /**
      * Obtener compra por ID con información enriquecida
      */
     getPurchaseById(id: string): Observable<Purchase> {
          return this.http.get<PurchaseApiResponse<Purchase>>(`${this.baseUrl}/${id}`)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              return response.data;
                         }
                         throw new Error(response.error || 'Error al cargar la compra');
                    })
               );
     }

     /**
      * Crear nueva compra
      */
     createPurchase(purchase: PurchaseRequest | CreatePurchaseRequest): Observable<Purchase> {
          return this.http.post<PurchaseApiResponse<Purchase>>(this.baseUrl, purchase)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              return response.data;
                         }
                         throw new Error(response.error || 'Error al crear la compra');
                    })
               );
     }

     /**
      * Actualizar compra existente
      */
     updatePurchase(id: string, purchase: PurchaseRequest): Observable<Purchase> {
          return this.http.put<PurchaseApiResponse<Purchase>>(`${this.baseUrl}/${id}`, purchase)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              return response.data;
                         }
                         throw new Error(response.error || 'Error al actualizar la compra');
                    })
               );
     }

     /**
      * Actualizar estado de compra
      */
     updatePurchaseStatus(id: string, statusUpdate: PurchaseStatusUpdateRequest): Observable<Purchase> {
          return this.http.patch<PurchaseApiResponse<Purchase>>(`${this.baseUrl}/${id}/status`, statusUpdate)
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              return response.data;
                         }
                         throw new Error(response.error || 'Error al actualizar el estado de la compra');
                    })
               );
     }

     /**
      * Eliminar compra lógicamente
      */
     deletePurchase(id: string): Observable<boolean> {
          return this.http.delete<PurchaseApiResponse<any>>(`${this.baseUrl}/${id}`)
               .pipe(
                    map(response => {
                         if (response.status) {
                              return true;
                         }
                         throw new Error(response.error || 'Error al eliminar la compra');
                    })
               );
     }

     /**
      * Restaurar compra eliminada lógicamente
      */
     restorePurchase(id: string): Observable<Purchase> {
          return this.http.post<PurchaseApiResponse<Purchase>>(`${this.baseUrl}/${id}/restore`, {})
               .pipe(
                    map(response => {
                         if (response.status && response.data) {
                              return response.data;
                         }
                         throw new Error(response.error || 'Error al restaurar la compra');
                    })
               );
     }

     /**
      * Formatear moneda en soles peruanos
      */
     formatCurrency(amount: number): string {
          return new Intl.NumberFormat('es-PE', {
               style: 'currency',
               currency: 'PEN',
               minimumFractionDigits: 2
          }).format(amount);
     }

     /**
      * Formatear fecha para mostrar
      */
     formatDate(dateString: string): string {
          if (!dateString) return '-';

          const date = new Date(dateString);
          return new Intl.DateTimeFormat('es-PE', {
               year: 'numeric',
               month: 'short',
               day: '2-digit'
          }).format(date);
     }

     /**
      * Calcular estadísticas de compras
      */
     calculatePurchaseStats(purchases: Purchase[]) {
          const totalPurchases = purchases.length;
          const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

          const pendingPurchases = purchases.filter(p => p.status === PurchaseStatus.PENDIENTE).length;
          const approvedPurchases = purchases.filter(p => p.status === PurchaseStatus.AUTORIZADO).length;
          const completedPurchases = purchases.filter(p => p.status === PurchaseStatus.COMPLETADO).length;
          const cancelledPurchases = purchases.filter(p => p.status === PurchaseStatus.CANCELADO).length;

          const averageAmount = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

          return {
               totalPurchases,
               totalAmount,
               pendingPurchases,
               approvedPurchases,
               completedPurchases,
               cancelledPurchases,
               averageAmount
          };
     }
}
