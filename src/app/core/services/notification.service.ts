import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhatsAppStatus {
    status: 'DISCONNECTED' | 'QR_READY' | 'READY' | 'AUTHENTICATED';
    qr?: string;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.services.notifications;

    getQrCode(): Observable<WhatsAppStatus> {
        return this.http.get<WhatsAppStatus>(`${this.apiUrl}/qr`);
    }

    getStatus(): Observable<WhatsAppStatus> {
        return this.http.get<WhatsAppStatus>(`${this.apiUrl}/status`);
    }

    logout(): Observable<any> {
        return this.http.post(`${this.apiUrl}/logout`, {});
    }
}
