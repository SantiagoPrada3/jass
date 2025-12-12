import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-water-confirmation-modal',
  templateUrl: './water-confirmation-modal.component.html',
  styleUrl: './water-confirmation-modal.component.css'
})
export class WaterConfirmationModalComponent {
  @Input() isOpen: boolean = false;
  @Input() programCode: string = '';
  @Input() endTime: string = '';
  @Output() confirm = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  onConfirm(waterGiven: boolean): void {
    this.confirm.emit(waterGiven);
  }

  onClose(): void {
    this.close.emit();
  }
}
