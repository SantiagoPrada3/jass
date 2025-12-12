import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/services/auth';
import { environment } from '../../../environments/environment';

export interface AuditEvent {
  action: string;
  resource: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Registra un evento de auditoría
   */
  logEvent(event: Omit<AuditEvent, 'timestamp' | 'userId' | 'organizationId'>): void {
    if (!environment.security.enableAuditLog) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
      userId: currentUser?.userId,
      organizationId: currentUser?.organizationId,
      ip: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Enviar al gateway para que lo procese
    this.http.post(`${environment.services.gateway}/audit/log`, auditEvent)
      .subscribe({
        error: (error) => {
          console.warn('Error al registrar evento de auditoría:', error);
        }
      });
  }

  /**
   * Registra un login exitoso
   */
  logLogin(): void {
    this.logEvent({
      action: 'LOGIN',
      resource: 'AUTHENTICATION',
      metadata: {
        loginMethod: 'keycloak'
      }
    });
  }

  /**
   * Registra un logout
   */
  logLogout(): void {
    this.logEvent({
      action: 'LOGOUT',
      resource: 'AUTHENTICATION'
    });
  }

  /**
   * Registra acceso a un recurso protegido
   */
  logResourceAccess(resource: string, metadata?: Record<string, any>): void {
    this.logEvent({
      action: 'ACCESS',
      resource,
      metadata
    });
  }

  /**
   * Registra una acción de modificación
   */
  logModification(resource: string, action: string, metadata?: Record<string, any>): void {
    this.logEvent({
      action,
      resource,
      metadata
    });
  }

  /**
   * Registra un intento de acceso no autorizado
   */
  logUnauthorizedAccess(resource: string): void {
    this.logEvent({
      action: 'UNAUTHORIZED_ACCESS',
      resource,
      metadata: {
        severity: 'HIGH'
      }
    });
  }

  /**
   * Obtiene la IP del cliente (simplificado para frontend)
   */
  private getClientIP(): string {
    // En el frontend no podemos obtener la IP real directamente
    // Esto se debe implementar en el backend
    return 'unknown';
  }
}
