import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaymentEnrichedResponse, CreatePaymentRequest } from '../models/payment.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentsApi {
  private readonly baseUrl = environment.services.gateway;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    // Por ahora, obtener el token del localStorage o sessionStorage
    // Más adelante puedes integrar con tu servicio de autenticación
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

    console.log('Token encontrado:', token ? 'Sí' : 'No');
    console.log('URL base:', this.baseUrl);

    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Obtener todos los pagos enriquecidos con información de usuario y organización
   */
  getEnrichedPayments(): Observable<PaymentEnrichedResponse[]> {
    const url = `${this.baseUrl}/admin/payments/enriched`;
    console.log('Haciendo petición a:', url);

    return this.http.get<PaymentEnrichedResponse[]>(url, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Crear un nuevo pago
   */
  createPayment(payment: CreatePaymentRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/payments`, payment, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Actualizar un pago existente
   */
  updatePayment(paymentId: string, payment: Partial<CreatePaymentRequest>): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/payments/${paymentId}`, payment, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtener un pago específico por ID
   */
  getPaymentById(paymentId: string): Observable<PaymentEnrichedResponse> {
    return this.http.get<PaymentEnrichedResponse>(`${this.baseUrl}/admin/payments/${paymentId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Eliminar un pago
   */
  deletePayment(paymentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/payments/${paymentId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtener pagos del usuario actual (cliente)
   */
  getMyPayments(): Observable<PaymentEnrichedResponse[]> {
    return this.http.get<PaymentEnrichedResponse[]>(`${this.baseUrl}/client/payments/my-payments`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtener un pago específico del usuario actual
   */
  getMyPaymentById(paymentId: string): Observable<PaymentEnrichedResponse> {
    return this.http.get<PaymentEnrichedResponse>(`${this.baseUrl}/client/payments/${paymentId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtener clientes por organización
   */
  getClientsByOrganization(organizationId: string): Observable<any[]> {
    // URL directa que funciona sin CORS
    const url = `http://lab.vallegrande.edu.pe/jass/ms-users/internal/organizations/${organizationId}/clients`;
    console.log('Obteniendo clientes de:', url);

    // Headers con autorización
    const headers = this.getHeaders();
    console.log('Headers enviados:', headers);

    return this.http.get<any[]>(url, { headers });
  }

  /**
   * Obtener logo de la organización en base64
   */
  getOrganizationLogo(organizationId: string): Observable<any> {
    // URL directa que funciona sin CORS
    const url = `http://lab.vallegrande.edu.pe/jass/ms-users/internal/organizations/${organizationId}/organizationLogo`;
    console.log('🖼️ Obteniendo logo de organización:', url);

    return this.http.get<any>(url, {
      headers: this.getHeaders(),
    });
  }
}
