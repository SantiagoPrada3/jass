import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Purchase, PurchaseStatusConfig } from '../../models/purchase.model';

@Component({
     selector: 'app-purchase-details-modal',
     standalone: true,
     imports: [CommonModule],
     templateUrl: './purchase-details-modal.html',
     styleUrls: ['./purchase-details-modal.css']
})
export class PurchaseDetailsModal implements OnInit, OnDestroy {
     @Input() purchase!: Purchase;
     @Input() isOpen = false;
     @Output() closeModal = new EventEmitter<void>();

     private readonly destroy$ = new Subject<void>();

     // Referencias para el template
     readonly PurchaseStatusConfig = PurchaseStatusConfig;

     ngOnInit(): void {
          console.log('Purchase details modal opened with:', this.purchase);
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
     }

     onClose(): void {
          this.closeModal.emit();
     }

     getStatusColor(status: string): string {
          return PurchaseStatusConfig[status as keyof typeof PurchaseStatusConfig]?.color || 'bg-gray-100 text-gray-800';
     }

     getStatusIcon(status: string): string {
          return PurchaseStatusConfig[status as keyof typeof PurchaseStatusConfig]?.icon || 'question-mark-circle';
     }

     formatCurrency(amount: number): string {
          return new Intl.NumberFormat('es-PE', {
               style: 'currency',
               currency: 'PEN'
          }).format(amount);
     }

     formatDate(date: string): string {
          return new Date(date).toLocaleDateString('es-PE', {
               year: 'numeric',
               month: 'long',
               day: 'numeric'
          });
     }

     formatDateTime(dateTime: string): string {
          return new Date(dateTime).toLocaleString('es-PE', {
               year: 'numeric',
               month: 'short',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
          });
     }

     calculateTotalQuantityOrdered(): number {
          return this.purchase.details?.reduce((total, detail) => total + detail.quantityOrdered, 0) || 0;
     }

     calculateTotalQuantityReceived(): number {
          return this.purchase.details?.reduce((total, detail) => total + (detail.quantityReceived || 0), 0) || 0;
     }

     getCompletionPercentage(): number {
          const ordered = this.calculateTotalQuantityOrdered();
          const received = this.calculateTotalQuantityReceived();
          return ordered > 0 ? Math.round((received / ordered) * 100) : 0;
     }

     getProgressBarColor(): string {
          const percentage = this.getCompletionPercentage();
          if (percentage === 100) return 'bg-green-500';
          if (percentage >= 50) return 'bg-blue-500';
          if (percentage > 0) return 'bg-yellow-500';
          return 'bg-gray-300';
     }
}
