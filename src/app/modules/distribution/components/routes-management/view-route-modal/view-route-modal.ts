import { Component, Input, Output, EventEmitter, OnInit, OnChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DistributionApi } from '../../../services/distribution-api';
import { AuthService } from '../../../../../core/auth/services/auth';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DistributionOrganizationApi as OrganizationApi, OrganizationData, Zone } from '../../../services/organization-api.service';
import { DistributionRouteCreateRequest, Route, RouteZoneCreateRequest } from '../../../models/routes.model';

interface SelectedRouteZone {
  zone: Zone;
  estimatedDuration: number;
  order: number;
}

@Component({
  selector: 'app-view-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-route-modal.html',
  styleUrl: './view-route-modal.css'
})
export class ViewRouteModal implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() route: Route | null = null;
  @Output() close = new EventEmitter<void>();

  isLoading: boolean = false;
  
  // Form data
  routeName: string = '';
  selectedZones: SelectedRouteZone[] = [];
  totalEstimatedDuration: number = 0;
  validationErrors: { [key: string]: string } = {};

  // Available data
  organizationData: OrganizationData | null = null;
  availableZones: Zone[] = [];
  
  // Nueva propiedad para la zona seleccionada en el dropdown
  selectedZoneId: string = '';

  constructor(
    private distributionApi: DistributionApi,
    private organizationApi: OrganizationApi,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Inicializar el modal cuando se inicializa el componente
  }

  ngOnChanges(): void {
    if (this.isOpen && this.route) {
      this.initializeForm();
      this.loadOrganizationData();
    }
  }

  // Escuchar la tecla Escape para cerrar el modal
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  // Método para trackBy en el ngFor
  trackByIndex(index: number, item: any): number {
    return index;
  }

  initializeForm(): void {
    if (!this.route) return;
    
    this.routeName = this.route.routeName;
    this.totalEstimatedDuration = this.route.totalEstimatedDuration;
    
    // Cargar las zonas seleccionadas desde la ruta existente
    this.selectedZones = this.route.zones
      .sort((a, b) => a.order - b.order)
      .map(routeZone => {
        // Encontrar la zona correspondiente en las zonas disponibles
        const zone = this.availableZones.find(z => z.zoneId === routeZone.zoneId);
        
        return {
          zone: zone || { 
            zoneId: routeZone.zoneId, 
            zoneCode: 'N/A', 
            zoneName: 'Zona no encontrada', 
            status: 'ACTIVE',
            organizationId: this.route?.organizationId || '',
            description: '',
            streets: []
          },
          estimatedDuration: routeZone.estimatedDuration,
          order: routeZone.order
        };
      });
  }

  loadOrganizationData(): void {
    if (!this.route) return;

    this.isLoading = true;
    console.log('🏢 [ViewRouteModal] Cargando datos de organización:', this.route.organizationId);

    this.organizationApi.getOrganizationById(this.route.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = response.data;
          this.availableZones = response.data.zones?.filter(zone => zone.status === 'ACTIVE') || [];

          // Inicializar el formulario ahora que tenemos las zonas disponibles
          this.initializeForm();

          console.log('✅ [ViewRouteModal] Organización cargada:', response.data.organizationName);
          console.log('📍 [ViewRouteModal] Zonas disponibles:', this.availableZones.length);
        } else {
          this.notificationService.error('Error', 'No se pudo cargar la información de la organización');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ [ViewRouteModal] Error cargando organización:', error);
        this.notificationService.error('Error', 'Error al cargar los datos de la organización');
        this.isLoading = false;
      }
    });
  }

  // Método para agregar una zona seleccionada
  addZone(): void {
    // En modo de solo lectura, este método no hace nada
  }

  // Método para remover una zona seleccionada
  removeZone(index: number): void {
    // En modo de solo lectura, este método no hace nada
  }

  // Método para manejar el cambio de duración estimada
  onDurationChange(index: number): void {
    // En modo de solo lectura, este método no hace nada
  }

  updateZoneOrder(): void {
    // En modo de solo lectura, este método no hace nada
  }

  calculateTotalDuration(): void {
    // En modo de solo lectura, este método no hace nada
  }

  validateForm(): void {
    // En modo de solo lectura, este método no hace nada
  }

  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  getFieldError(fieldName: string): string | null {
    return this.validationErrors[fieldName] || null;
  }

  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  onClose(): void {
    this.resetModal();
    this.close.emit();
  }

  private resetModal(): void {
    this.routeName = '';
    this.totalEstimatedDuration = 0;
    this.validationErrors = {};
    
    // Reset zone selections
    this.selectedZones = [];
    this.selectedZoneId = '';

    this.isLoading = false;
  }

  getSelectedZonesCount(): number {
    return this.selectedZones.length;
  }
}