import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.html',
  styleUrl: './base-modal.css'
})
export class BaseModal implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() showCloseButton: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() closeOnOverlayClick: boolean = true;
  @Input() closeOnEscape: boolean = true;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  @Output() modalClose = new EventEmitter<void>();

  ngOnInit(): void {
    if (this.isOpen) {
      this.disableBodyScroll();
    }
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.closeOnEscape && this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.enableBodyScroll();
    this.modalClose.emit();
  }

  onOverlayClick(event: Event): void {
    if (this.closeOnOverlayClick) {
      this.close();
    }
  }

  private disableBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private enableBodyScroll(): void {
    document.body.style.overflow = '';
  }

  getSizeClass(): string {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl'
    };
    return sizeClasses[this.size];
  }
}
