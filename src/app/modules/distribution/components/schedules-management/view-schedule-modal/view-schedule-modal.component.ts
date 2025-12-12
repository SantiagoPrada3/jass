import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Schedule } from '../../../models/schedules.model';
import { Status } from '../../../models/api-response.model';

@Component({
  selector: 'app-view-schedule-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-schedule-modal.component.html',
  styleUrls: ['./view-schedule-modal.component.css']
})
export class ViewScheduleModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() schedule: Schedule | null = null;
  @Output() close = new EventEmitter<void>();

  // Datos para mostrar nombres en lugar de IDs
  @Input() zonesData: Map<string, any> = new Map();
  @Input() streetsData: Map<string, any> = new Map();

  Status = Status;

  constructor() { }

  ngOnInit(): void {
    console.log('[ViewScheduleModal] Componente inicializado');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schedule'] && this.schedule) {
      console.log('[ViewScheduleModal] Schedule changed:', this.schedule);
    }
    if (changes['isOpen']) {
      console.log('[ViewScheduleModal] isOpen changed:', changes['isOpen'].currentValue);
    }
    if (changes['zonesData']) {
      console.log('[ViewScheduleModal] zonesData changed, size:', this.zonesData.size);
    }
    if (changes['streetsData']) {
      console.log('[ViewScheduleModal] streetsData changed, size:', this.streetsData.size);
    }
  }

  /**
   * Obtener el nombre descriptivo de la zona
   */
  getZoneName(zoneId: string): string {
    console.log('[ViewScheduleModal] getZoneName llamado con zoneId:', zoneId);
    if (!zoneId) return 'N/A';
    
    // Convertir el Map a un objeto para facilitar la depuración
    const zonesObj = Object.fromEntries(this.zonesData);
    console.log('[ViewScheduleModal] Zones data:', zonesObj);
    
    const zone = this.zonesData.get(zoneId);
    console.log('[ViewScheduleModal] Zone found:', zone);
    
    if (zone) {
      const result = `${zone.zoneCode} - ${zone.zoneName}`;
      console.log('[ViewScheduleModal] Zone name result:', result);
      return result;
    }
    return zoneId; // Devolver el ID si no se encuentra la zona
  }

  /**
   * Obtener el nombre descriptivo de la calle
   */
  getStreetName(streetId: string): string {
    console.log('[ViewScheduleModal] getStreetName llamado con streetId:', streetId);
    if (!streetId) return 'N/A';
    
    // Convertir el Map a un objeto para facilitar la depuración
    const streetsObj = Object.fromEntries(this.streetsData);
    console.log('[ViewScheduleModal] Streets data:', streetsObj);
    
    const street = this.streetsData.get(streetId);
    console.log('[ViewScheduleModal] Street found:', street);
    
    if (street) {
      const result = `${street.streetType} ${street.streetName}`;
      console.log('[ViewScheduleModal] Street name result:', result);
      return result;
    }
    return streetId; // Devolver el ID si no se encuentra la calle
  }

  /**
   * Obtener etiqueta del estado
   */
  getStatusLabel(status: string): string {
    console.log('[ViewScheduleModal] getStatusLabel llamado con status:', status);
    switch (status) {
      case Status.ACTIVE:
        return 'Activo';
      case Status.INACTIVE:
        return 'Inactivo';
      default:
        return status;
    }
  }

  /**
   * Obtener clases CSS para el badge de estado
   */
  getStatusBadgeClass(status: string): string {
    console.log('[ViewScheduleModal] getStatusBadgeClass llamado con status:', status);
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';

    switch (status) {
      case Status.ACTIVE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case Status.INACTIVE:
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Cerrar el modal
   */
  onClose(): void {
    console.log('[ViewScheduleModal] Cerrando modal');
    this.close.emit();
  }
}