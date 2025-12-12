import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationModalData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  routeName?: string;
  routeCode?: string;
}

@Component({
  selector: 'app-route-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.css'
})
export class RouteConfirmationModal {
  @Input() isOpen: boolean = false;
  @Input() data!: ConfirmationModalData;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
