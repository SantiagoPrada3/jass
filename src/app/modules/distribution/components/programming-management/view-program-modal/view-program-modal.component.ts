import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DistributionApi } from '../../../services/distribution-api';
import { DistributionOrganizationApi as OrganizationApi } from '../../../services/organization-api.service';
import { DistributionProgram } from '../../../models/distribution.model';
import { ProgramStatus, ProgramStatusLabels } from '../../../models/api-response.model';

// Interfaces locales para evitar conflictos de tipos
interface LocalSchedule {
  id: string;
  scheduleCode: string;
  scheduleName: string;
}

interface LocalRoute {
  id: string;
  routeCode: string;
  routeName: string;
}

interface LocalZone {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
}

interface LocalStreet {
  streetId: string;
  streetType: string;
  streetName: string;
}

interface OrganizationData {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-view-program-modal',
  templateUrl: './view-program-modal.component.html',
  styleUrl: './view-program-modal.component.css'
})
export class ViewProgramModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() program: DistributionProgram | null = null;
  @Output() close = new EventEmitter<void>();

  // Datos de organización
  organizationData: OrganizationData | null = null;
  availableZones: LocalZone[] = [];
  availableStreets: LocalStreet[] = [];
  availableSchedules: LocalSchedule[] = [];
  availableRoutes: LocalRoute[] = [];

  constructor(
    private readonly distributionApi: DistributionApi,
    private readonly organizationApi: OrganizationApi,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.isOpen && this.program) {
      console.log('[ViewProgramModal] Modal opened with program:', this.program);
      this.loadData();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen && this.program) {
      console.log('[ViewProgramModal] Modal opened with program:', this.program);
      this.loadData();
    }
  }

  /**
   * Cargar todos los datos necesarios
   */
  private loadData(): void {
    if (!this.program?.organizationId) {
      console.log('[ViewProgramModal] No organizationId provided');
      return;
    }

    console.log('[ViewProgramModal] Loading data for organization:', this.program.organizationId);
    console.log('[ViewProgramModal] Program data:', this.program);
    
    // Cargar datos en paralelo
    this.loadOrganizationData();
    this.loadSchedules();
    this.loadRoutes();
    this.loadStreetsByZone();
  }

  /**
   * Carga los datos de la organización y sus zonas
   */
  private loadOrganizationData(): void {
    if (!this.program?.organizationId) return;

    console.log('🏢 [ViewProgramModal] Loading organization data:', this.program.organizationId);

    this.organizationApi.getOrganizationById(this.program.organizationId).subscribe({
      next: (response) => {
        if (response.status) {
          this.organizationData = {
            organizationId: response.data.organizationId,
            organizationCode: response.data.organizationCode,
            organizationName: response.data.organizationName
          };
          
          this.availableZones = (response.data.zones?.filter((zone: any) => zone.status === 'ACTIVE') || []).map((zone: any) => ({
            zoneId: zone.zoneId,
            zoneCode: zone.zoneCode,
            zoneName: zone.zoneName
          }));
          
          console.log('✅ [ViewProgramModal] Organization loaded:', response.data.organizationName);
          console.log('📍 [ViewProgramModal] Active zones:', this.availableZones);
        }
      },
      error: (error) => {
        console.error('❌ [ViewProgramModal] Error loading organization:', error);
      }
    });
  }

  /**
   * Cargar horarios
   */
  private loadSchedules(): void {
    if (!this.program?.organizationId) return;

    console.log('[ViewProgramModal] Loading all schedules for organization:', this.program.organizationId);
    
    this.distributionApi.getAllSchedules(this.program.organizationId).subscribe({
      next: (response) => {
        console.log('[ViewProgramModal] Complete schedules API response:', response);
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.availableSchedules = (response.data || []).map((schedule: any) => ({
            id: schedule.id,
            scheduleCode: schedule.scheduleCode,
            scheduleName: schedule.scheduleName
          }));
          console.log('[ViewProgramModal] All schedules loaded:', this.availableSchedules);
          console.log('[ViewProgramModal] Total schedules count:', this.availableSchedules.length);
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[ViewProgramModal] No schedules received or invalid response');
          this.availableSchedules = [];
        }
      },
      error: (error) => {
        console.error('[ViewProgramModal] Error loading schedules:', error);
        this.availableSchedules = [];
      }
    });
  }

  /**
   * Cargar rutas
   */
  private loadRoutes(): void {
    if (!this.program?.organizationId) return;

    console.log('[ViewProgramModal] Loading routes for organization:', this.program.organizationId);
    
    this.distributionApi.getAllRoutes(this.program.organizationId).subscribe({
      next: (response) => {
        console.log('[ViewProgramModal] Routes API response:', response);
        // Corregir la condición para aceptar diferentes formatos de respuesta
        if (response && (response.success || response.status) && response.data) {
          // Mapear los datos para evitar conflictos de tipos
          this.availableRoutes = (response.data || []).map((route: any) => ({
            id: route.id,
            routeCode: route.routeCode,
            routeName: route.routeName
          }));
          
          console.log('[ViewProgramModal] Routes loaded:', this.availableRoutes);
          console.log('[ViewProgramModal] Routes count:', this.availableRoutes.length);
          
          // Forzar actualización de la vista
          this.changeDetectorRef.markForCheck();
        } else {
          console.warn('[ViewProgramModal] No routes received or invalid response');
          this.availableRoutes = [];
        }
      },
      error: (error) => {
        console.error('[ViewProgramModal] Error loading routes:', error);
        this.availableRoutes = [];
      }
    });
  }

  /**
   * Carga las calles de la zona del programa
   */
  private loadStreetsByZone(): void {
    if (!this.program?.organizationId || !this.program?.zoneId) return;

    console.log('🛣️ [ViewProgramModal] Loading streets for zone:', this.program.zoneId);

    this.organizationApi.getActiveStreetsByZone(this.program.organizationId, this.program.zoneId).subscribe({
      next: (streets) => {
        this.availableStreets = streets.map(street => ({
          streetId: street.streetId,
          streetType: street.streetType,
          streetName: street.streetName
        }));
        console.log('✅ [ViewProgramModal] Streets loaded:', streets.length);

        // Forzar actualización de la vista
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('❌ [ViewProgramModal] Error loading streets:', error);
        this.availableStreets = [];
      }
    });
  }

  /**
   * Cerrar modal
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Obtener etiqueta de estado
   */
  getStatusLabel(status: string): string {
    return ProgramStatusLabels[status as ProgramStatus] || status;
  }

  /**
   * Obtener clase para badge de estado
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
      default:
        return 'bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
    }
  }

  /**
   * Obtener nombre del horario
   */
  getScheduleName(): string {
    // Si no hay programa, mostrar mensaje
    if (!this.program) {
      return 'No hay programa seleccionado';
    }
    
    // Si no hay horarios cargados, mostrar cargando
    if (!this.availableSchedules.length) {
      return 'Cargando horarios...';
    }
    
    // Buscar el horario
    const schedule = this.availableSchedules.find(s => s.id === this.program!.scheduleId);
    
    // Si no se encuentra, mostrar el ID
    if (!schedule) {
      return `Horario ID: ${this.program.scheduleId}`;
    }
    
    // Mostrar el nombre del horario
    return `${schedule.scheduleCode} - ${schedule.scheduleName}`;
  }

  /**
   * Obtener nombre de la ruta
   */
  getRouteName(): string {
    // Si no hay programa, mostrar mensaje
    if (!this.program) {
      return 'No hay programa seleccionado';
    }
    
    // Si no hay rutas cargadas, mostrar cargando
    if (!this.availableRoutes.length) {
      return 'Cargando rutas...';
    }
    
    // Buscar la ruta
    const route = this.availableRoutes.find(r => r.id === this.program!.routeId);
    
    // Si no se encuentra, mostrar el ID
    if (!route) {
      return `Ruta ID: ${this.program.routeId}`;
    }
    
    // Mostrar el nombre de la ruta
    return `${route.routeCode} - ${route.routeName}`;
  }

  /**
   * Obtener nombre de la zona
   */
  getZoneName(): string {
    // Si no hay programa, mostrar mensaje
    if (!this.program) {
      return 'No hay programa seleccionado';
    }
    
    // Si no hay zonas cargadas, mostrar cargando
    if (!this.availableZones.length) {
      return 'Cargando zonas...';
    }
    
    // Buscar la zona
    const zone = this.availableZones.find(z => z.zoneId === this.program!.zoneId);
    
    // Si no se encuentra, mostrar el ID
    if (!zone) {
      return `Zona ID: ${this.program.zoneId}`;
    }
    
    // Mostrar el nombre de la zona
    return `${zone.zoneCode} - ${zone.zoneName}`;
  }

  /**
   * Obtener nombre de la calle
   */
  getStreetName(): string {
    // Si no hay programa, mostrar mensaje
    if (!this.program) {
      return 'No hay programa seleccionado';
    }
    
    // Si no hay calles cargadas, mostrar cargando
    if (!this.availableStreets.length) {
      return 'Cargando calles...';
    }
    
    // Buscar la calle
    const street = this.availableStreets.find(s => s.streetId === this.program!.streetId);
    
    // Si no se encuentra, mostrar el ID
    if (!street) {
      return `Calle ID: ${this.program.streetId}`;
    }
    
    // Mostrar el nombre de la calle
    return `${street.streetType} ${street.streetName}`;
  }
}