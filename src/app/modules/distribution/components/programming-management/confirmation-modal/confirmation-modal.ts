import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationData {
     title: string;
     message: string;
     confirmText: string;
     cancelText: string;
     type: 'danger' | 'warning' | 'info' | 'success';
     programCode?: string;
     routeName?: string;
     programDate?: string;
     plannedStartTime?: string;
     plannedEndTime?: string;
     status?: string;
}

@Component({
     standalone: true,
     imports: [CommonModule],
     selector: 'app-program-confirmation-modal',
     templateUrl: './confirmation-modal.html',
     styleUrl: './confirmation-modal.css'
})
export class ProgramConfirmationModal {
     @Input() isOpen: boolean = false;
     @Input() data: ConfirmationData = {
          title: 'Confirmar acción',
          message: '¿Está seguro de que desea continuar?',
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          type: 'info'
     };
     @Output() confirm = new EventEmitter<void>();
     @Output() cancel = new EventEmitter<void>();

     onConfirm(): void {
          this.confirm.emit();
     }

     onCancel(): void {
          this.cancel.emit();
     }

     getIconClass(): string {
          switch (this.data.type) {
               case 'danger':
                    return 'text-red-600 bg-red-100';
               case 'warning':
                    return 'text-yellow-600 bg-yellow-100';
               case 'success':
                    return 'text-green-600 bg-green-100';
               default:
                    return 'text-blue-600 bg-blue-100';
          }
     }

     getIcon(): string {
          switch (this.data.type) {
               case 'danger':
                    return '⚠️';
               case 'warning':
                    return '⚠️';
               case 'success':
                    return '✅';
               default:
                    return 'ℹ️';
          }
     }

     getConfirmButtonClass(): string {
          switch (this.data.type) {
               case 'danger':
                    return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
               case 'warning':
                    return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
               case 'success':
                    return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
               default:
                    return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
          }
     }
}