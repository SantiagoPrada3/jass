import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, WhatsAppStatus } from '../../../../../core/services/notification.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-whatsapp-qr-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whatsapp-qr-modal.component.html',
    styleUrls: ['./whatsapp-qr-modal.component.css']
})
export class WhatsAppQrModalComponent implements OnInit, OnDestroy {
    @Input() isVisible = false;
    @Output() close = new EventEmitter<void>();
    @Output() connected = new EventEmitter<void>();

    private notificationService = inject(NotificationService);
    private statusSubscription?: Subscription;

    qrCodeData: string | null = null;
    qrCodeUrl: string | null = null;
    status: string = 'DISCONNECTED';
    loading = true;

    ngOnInit() {
        this.startStatusCheck();
    }

    ngOnDestroy() {
        this.stopStatusCheck();
    }

    startStatusCheck() {
        this.statusSubscription = interval(3000)
            .pipe(
                switchMap(() => this.notificationService.getQrCode())
            )
            .subscribe({
                next: async (response) => {
                    this.status = response.status;
                    this.loading = false;

                    if (response.qr && response.qr !== this.qrCodeData) {
                        this.qrCodeData = response.qr;
                        try {
                            this.qrCodeUrl = await QRCode.toDataURL(this.qrCodeData);
                        } catch (err) {
                            console.error('Error generating QR code image', err);
                        }
                    }

                    if (this.status === 'READY' || this.status === 'AUTHENTICATED') {
                        this.connected.emit();
                        this.onClose();
                    }
                },
                error: (err) => {
                    console.error('Error checking WhatsApp status', err);
                    this.loading = false;
                }
            });
    }

    stopStatusCheck() {
        if (this.statusSubscription) {
            this.statusSubscription.unsubscribe();
        }
    }

    onClose() {
        this.isVisible = false;
        this.close.emit();
    }
}
