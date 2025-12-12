import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestingPoints } from '../../../models/quality-test.model';
import { WaterQualityApi } from '../../../services/water-quality-api';
import { AuthService } from '../../../../../core/auth/services/auth';

@Component({
  selector: 'app-details-points',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details-points.component.html',
  styleUrls: ['./details-points.component.css']
})
export class DetailsPointsComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() pointId: string | null = null;
  @Input() pointData: any = null; // Cambiado a any para incluir datos enriquecidos
  @Output() close = new EventEmitter<void>();

  zoneName: string = '';
  streetName: string = '';
  organizationName: string = '';

  constructor(
    private waterQualityApi: WaterQualityApi,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.processPointData();
  }

  ngOnChanges(): void {
    if (this.pointData && this.isOpen) {
      this.processPointData();
    }
  }

  private processPointData(): void {
    console.log('Processing point data in details:', this.pointData?.pointName); // Log para ver el punto que se está procesando
    if (!this.pointData) return;

    // Si los datos ya vienen enriquecidos, usarlos directamente
    if (this.pointData.organizationName) {
      this.organizationName = this.pointData.organizationName;
      console.log('Using enriched organization name:', this.organizationName);
    }
    if (this.pointData.zoneName) {
      this.zoneName = this.pointData.zoneName;
      console.log('Using enriched zone name:', this.zoneName);
    }
    
    // Cargar información de la calle
    if (this.pointData.street) {
      this.loadStreetInfo();
    }
    
    // Solo cargar información adicional si no está disponible
    if (!this.organizationName || !this.zoneName) {
      console.log('Loading additional info - org:', this.organizationName, 'zone:', this.zoneName);
      this.loadZoneInfo();
    }
  }

  private loadZoneInfo(): void {
    if (!this.pointData?.zoneId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) return;

    // Cargar información de la zona usando la API real
    this.waterQualityApi.getZonesByOrganization(currentUser.organizationId).subscribe({
      next: (response: any) => {
        if (response && response.data && Array.isArray(response.data)) {
          const zone = response.data.find((z: any) => z.zoneId === this.pointData?.zoneId);
          this.zoneName = zone?.zoneName || 'Zona no encontrada';
          console.log('Loaded zone info - ID:', this.pointData?.zoneId, 'Name:', this.zoneName);
        } else {
          console.warn('No zones data received in details modal');
          this.zoneName = 'Error al cargar zona';
        }
      },
      error: (error) => {
        console.error('Error loading zones in details:', error);
        this.zoneName = 'Error al cargar zona';
      }
    });

    // Cargar información de la calle si existe
    if (this.pointData.street) {
      this.loadStreetInfo();
    }
  }

  private loadStreetInfo(): void {
    // Cargar calles desde la API real
    this.waterQualityApi.getStreetsByZone('').subscribe({
      next: (response: any) => {
        if (response && response.data && Array.isArray(response.data)) {
          const street = response.data.find((s: any) => s.streetId === this.pointData?.street);
          this.streetName = street?.streetName || 'Calle no encontrada';
          console.log('Loaded street info - ID:', this.pointData?.street, 'Name:', this.streetName);
        } else {
          console.warn('No streets data received in details modal');
          this.streetName = 'Calle no encontrada';
        }
      },
      error: (error: any) => {
        console.error('Error loading street info:', error);
        this.streetName = 'Error al cargar calle';
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  getStatusText(status: string): string {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  getStatusClass(status: string): string {
    return status === 'ACTIVE' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  getPointTypeText(type: string): string {
    switch (type) {
      case 'DOMICILIO': return 'Punto en Domicilio';
      case 'RESERVOIR': return 'Reservorio';
      case 'RED_DISTRIBUCION': return 'Red de Distribución';
      default: return type;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }
}