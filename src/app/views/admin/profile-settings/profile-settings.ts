import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';
import { AuthService } from '../../../core/auth/services/auth';
import { OrganizationApi } from '../../../modules/organization-management/services/organization-api';
import { Zone, Street, ZoneCreateRequest, CreateStreetRequest } from '../../../modules/organization-management/models/organization.model';
import { Toast } from '../../../shared/components/ui/notifications/toast/toast';
import { NotificationService } from '../../../shared/services/notification.service';
import { ReportGeneratorService, ReportData } from '../../../shared/services/report-generator.service';
import jsPDF from 'jspdf';

// Extended interfaces for UI
interface StreetWithUI extends Street {
  isEditing?: boolean;
  originalData?: any;
  validationErrors?: any;
  availableZones?: Zone[];
}

interface ZoneWithUI extends Zone {
  isEditing?: boolean;
  originalData?: any;
  validationErrors?: any;
}

// Interfaces para parámetros (basado en el modelo real)
interface Parameter {
  id?: string;
  organizationId: string;
  parameterCode?: string;
  parameterName: string;
  parameterValue: string;
  parameterDescription: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
  // UI properties
  isEditing?: boolean;
  originalData?: any;
  validationErrors?: any;
}

// Interface for Tarifas
interface Tarifa {
  fareCode: string;
  zoneId: string;
  zoneName: string;
  fareName: string;
  fareDescription: string;
  fareAmount: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  // UI properties
  isEditing?: boolean;
  originalData?: any;
  validationErrors?: any;
}

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb, Toast],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.css'
})
export class ProfileSettings implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio',
      url: '/admin/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Configuración',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    }
  ];

  // Active tab management
  activeTab: 'zones' | 'streets' | 'parameters' | 'tarifas' = 'zones';

  // User and organization data
  currentUser: any = null;
  organizationId: string = '';

  // Zones data
  zones: ZoneWithUI[] = [];
  filteredZones: ZoneWithUI[] = [];
  paginatedZones: ZoneWithUI[] = [];

  // Streets data
  streets: StreetWithUI[] = [];
  filteredStreets: StreetWithUI[] = [];
  paginatedStreets: StreetWithUI[] = [];

  // Parameters data
  parameters: Parameter[] = [];
  filteredParameters: Parameter[] = [];
  paginatedParameters: Parameter[] = [];

  // Tarifas data
  tarifas: Tarifa[] = [];
  filteredTarifas: Tarifa[] = [];
  paginatedTarifas: Tarifa[] = [];

  // Fare history data
  fareHistory: Tarifa[] = [];
  selectedZoneForHistory: string = '';
  loadingHistory: boolean = false;

  // Search and filter
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'active';
  categoryFilter: string = 'all';
  zoneFilter: string = 'all'; // New zone filter for streets
  tarifaZoneFilter: string = 'all'; // Zone filter for tarifas

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Loading states
  isLoading: boolean = false;
  savingZone: boolean = false;
  savingStreet: boolean = false;
  savingParameter: boolean = false;
  savingTarifa: boolean = false;

  // UI states
  expandedZones: Set<string> = new Set();
  showCreateModal: boolean = false;
  editingItem: any = null;

  // Modal states
  showZoneModal: boolean = false;
  showStreetModal: boolean = false;
  showTarifaModal: boolean = false;
  showFareHistoryModal: boolean = false;

  // Injected services
  private notificationService = inject(NotificationService);
  private reportGenerator = inject(ReportGeneratorService);
  showParameterModal: boolean = false;
  editingZone: ZoneWithUI | null = null;
  editingStreet: StreetWithUI | null = null;
  editingParameter: Parameter | null = null;
  editingTarifa: Tarifa | null = null;
  isEditMode: boolean = false;

  // Custom dropdown states
  isZoneDropdownOpen: boolean = false;
  selectedZoneName: string = 'Todas las zonas';



  // Available categories for parameters
  parameterCategories = [
    'SYSTEM',
    'WATER_QUALITY',
    'NOTIFICATIONS',
    'REPORTS',
    'SECURITY',
    'UI_SETTINGS'
  ];

  // Street types
  streetTypes = ['Calle', 'Avenida', 'Jirón', 'Pasaje'];

  // Parameter types
  parameterTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'JSON'];

  Math = Math;

  constructor(
    private authService: AuthService,
    private organizationApi: OrganizationApi
  ) { }

  ngOnInit(): void {
    this.loadUserData();
    this.loadData();
    // Mostrar notificación de bienvenida
    this.notificationService.info(
      'Sistema Actualizado',
      'Nuevas funcionalidades implementadas: reportes con logo, notificaciones toast y modales mejorados'
    );
  }

  // ===============================
  // Report Generation
  // ===============================

  generateReport(): void {
    const reportData: ReportData = {
      title: this.getReportTitle(),
      subtitle: 'Sistema de Gestión JASS - Configuración de Perfil',
      data: this.getReportData(),
      columns: this.getReportColumns(),
      filters: this.getAppliedFilters()
    };

    this.reportGenerator.generateZoneReport(reportData);
  }

  private getReportTitle(): string {
    switch (this.activeTab) {
      case 'zones': return 'Reporte de Zonas';
      case 'streets': return 'Reporte de Calles';
      case 'parameters': return 'Reporte de Parámetros del Sistema';
      case 'tarifas': return 'Reporte de Tarifas';
      default: return 'Reporte General';
    }
  }

  private getReportData(): any[] {
    switch (this.activeTab) {
      case 'zones':
        return this.filteredZones.map(zone => ({
          name: zone.zoneName,
          description: zone.description || 'Sin descripción',
          status: zone.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
        }));

      case 'streets':
        return this.filteredStreets.map(street => ({
          name: street.streetName,
          type: street.streetType,
          zone: this.getZoneName(street.zoneId),
          status: street.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
        }));

      case 'parameters':
        return this.filteredParameters.map(param => ({
          name: param.parameterName,
          value: param.parameterValue,
          code: param.parameterCode || 'N/A',
          description: param.parameterDescription,
          status: param.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
        }));

      case 'tarifas':
        return this.filteredTarifas.map(tarifa => ({
          name: tarifa.fareName,
          value: 'S/ ' + tarifa.fareAmount,
          zone: tarifa.zoneName || this.getZoneName(tarifa.zoneId),
          code: tarifa.fareCode,
          description: tarifa.fareDescription,
          status: tarifa.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
        }));

      default:
        return [];
    }
  }

  private getReportColumns(): any[] {
    switch (this.activeTab) {
      case 'zones':
        return [
          { key: 'name', label: 'Nombre', align: 'left' },
          { key: 'description', label: 'Descripción', align: 'left' },
          { key: 'status', label: 'Estado', align: 'center' }
        ];

      case 'streets':
        return [
          { key: 'name', label: 'Nombre', align: 'left' },
          { key: 'type', label: 'Tipo', align: 'center' },
          { key: 'zone', label: 'Zona', align: 'left' },
          { key: 'status', label: 'Estado', align: 'center' }
        ];

      case 'parameters':
        return [
          { key: 'name', label: 'Parámetro', align: 'left' },
          { key: 'value', label: 'Valor', align: 'left' },
          { key: 'type', label: 'Tipo', align: 'center' },
          { key: 'category', label: 'Categoría', align: 'center' },
          { key: 'status', label: 'Estado', align: 'center' },
          { key: 'editable', label: 'Editable', align: 'center' }
        ];

      case 'tarifas':
        return [
          { key: 'name', label: 'Nombre', align: 'left' },
          { key: 'value', label: 'Valor', align: 'left' },
          { key: 'zone', label: 'Zona', align: 'left' },
          { key: 'code', label: 'Código', align: 'center' },
          { key: 'status', label: 'Estado', align: 'center' }
        ];

      default:
        return [];
    }
  }

  private getAppliedFilters(): string {
    const filters = [];

    if (this.searchTerm) {
      filters.push(`Búsqueda: "${this.searchTerm}"`);
    }

    if (this.statusFilter !== 'all') {
      const statusLabel = this.statusFilter === 'active' ? 'Activos' : 'Inactivos';
      filters.push(`Estado: ${statusLabel}`);
    }

    if (this.activeTab === 'streets' && this.zoneFilter !== 'all') {
      const zoneName = this.getZoneName(this.zoneFilter);
      filters.push(`Zona: ${zoneName}`);
    }

    if (this.activeTab === 'parameters' && this.categoryFilter !== 'all') {
      filters.push(`Categoría: ${this.categoryFilter}`);
    }

    return filters.length > 0 ? filters.join(', ') : 'Ninguno';
  }

  // ===============================
  // User and Organization Management
  // ===============================

  loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.organizationId = this.currentUser?.organizationId || '';

    if (!this.organizationId) {
      console.error('No organization ID found for current user');
      return;
    }
  }

  loadData(): void {
    switch (this.activeTab) {
      case 'zones':
        this.loadZones();
        break;
      case 'streets':
        this.loadStreets();
        break;
      case 'parameters':
        this.loadParameters();
        break;
      case 'tarifas':
        this.loadTarifas();
        break;
    }
  }

  // ===============================
  // Tab Management
  // ===============================

  setActiveTab(tab: 'zones' | 'streets' | 'parameters' | 'tarifas'): void {
    this.activeTab = tab;
    this.resetFilters();
    this.loadData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.zoneFilter = 'all';
    this.currentPage = 1;
  }

  // ===============================
  // Zone Management
  // ===============================

  loadZones(): void {
    this.isLoading = true;
    this.organizationApi.getZonesByOrganizationId(this.organizationId).subscribe({
      next: (zones) => {
        this.zones = zones || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading zones:', error);
        this.zones = [];
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }

  addNewZone(): void {
    this.editingZone = {
      zoneId: 'temp-zone-' + Date.now(),
      organizationId: this.organizationId,
      zoneCode: '',
      zoneName: '',
      description: '',
      status: 'ACTIVE',
      streets: []
    };
    this.isEditMode = false;
    this.showZoneModal = true;
  }

  editZone(zone: ZoneWithUI): void {
    this.editingZone = { ...zone };
    this.isEditMode = true;
    this.showZoneModal = true;
  }

  saveZone(): void {
    if (!this.editingZone || !this.validateZone(this.editingZone)) {
      return;
    }

    this.savingZone = true;
    const isNewZone = this.editingZone.zoneId.startsWith('temp-');

    if (isNewZone) {
      this.createZone(this.editingZone);
    } else {
      this.updateZone(this.editingZone);
    }
  }

  private createZone(zone: ZoneWithUI): void {
    const zoneRequest: ZoneCreateRequest = {
      organizationId: this.organizationId,
      zoneName: zone.zoneName.trim(),
      description: zone.description?.trim() || ''
    };

    this.organizationApi.createZone(zoneRequest).subscribe({
      next: (createdZone) => {
        this.savingZone = false;
        if (createdZone) {
          this.zones.unshift(createdZone);
          this.applyFilters();
          this.closeZoneModal();
          this.notificationService.success('¡Zona Creada!', `La zona "${zone.zoneName}" se ha creado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingZone = false;
        console.error('Error creating zone:', error);
        this.notificationService.error('Error al Crear Zona', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }

  private updateZone(zone: ZoneWithUI): void {
    const zoneRequest = {
      organizationId: this.organizationId,
      zoneName: zone.zoneName.trim(),
      description: zone.description?.trim() || ''
    };

    this.organizationApi.updateZone(zone.zoneId, zoneRequest).subscribe({
      next: (updatedZone) => {
        this.savingZone = false;
        if (updatedZone) {
          // Update the zone in the list
          const index = this.zones.findIndex(z => z.zoneId === zone.zoneId);
          if (index > -1) {
            this.zones[index] = { ...this.zones[index], ...updatedZone };
          }
          this.applyFilters();
          this.closeZoneModal();
          this.notificationService.success('¡Zona Actualizada!', `La zona "${zone.zoneName}" se ha actualizado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingZone = false;
        console.error('Error updating zone:', error);
        this.notificationService.error('Error al Actualizar Zona', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }

  closeZoneModal(): void {
    this.showZoneModal = false;
    this.editingZone = null;
    this.isEditMode = false;
  }

  closeStreetModal(): void {
    this.showStreetModal = false;
    this.editingStreet = null;
    this.isEditMode = false;
  }

  closeParameterModal(): void {
    this.showParameterModal = false;
    this.editingParameter = null;
    this.isEditMode = false;
  }

  deleteZone(zone: any): void {
    if (confirm('¿Está seguro de que desea eliminar esta zona?')) {
      if (zone.zoneId.startsWith('temp-')) {
        this.removeZoneFromUI(zone);
        return;
      }

      this.organizationApi.deleteZone(zone.zoneId).subscribe({
        next: (success) => {
          if (success) {
            const index = this.zones.findIndex(z => z.zoneId === zone.zoneId);
            if (index > -1) {
              this.zones[index].status = 'INACTIVE';
              this.applyFilters();
            }
            this.notificationService.success(
              'Zona eliminada',
              `La zona "${zone.zoneName}" ha sido eliminada exitosamente`
            );
          }
        },
        error: (error) => {
          console.error('Error deleting zone:', error);
          this.notificationService.error(
            'Error al eliminar zona',
            error.error?.message || 'No se pudo eliminar la zona'
          );
        }
      });
    }
  }

  restoreZone(zone: any): void {
    if (confirm('¿Está seguro de que desea restaurar esta zona?')) {
      this.organizationApi.restoreZone(zone.zoneId).subscribe({
        next: () => {
          const index = this.zones.findIndex(z => z.zoneId === zone.zoneId);
          if (index > -1) {
            this.zones[index].status = 'ACTIVE';
            this.applyFilters();
          }
          this.notificationService.success(
            'Zona restaurada',
            `La zona "${zone.zoneName}" ha sido restaurada exitosamente`
          );
        },
        error: (error) => {
          console.error('Error restoring zone:', error);
          this.notificationService.error(
            'Error al restaurar zona',
            error.error?.message || 'No se pudo restaurar la zona'
          );
        }
      });
    }
  }

  private removeZoneFromUI(zone: any): void {
    const index = this.zones.findIndex(z => z.zoneId === zone.zoneId);
    if (index > -1) {
      this.zones.splice(index, 1);
      this.applyFilters();
    }
  }

  private validateZone(zone: any): boolean {
    zone.validationErrors = {};

    if (!zone.zoneName?.trim()) {
      zone.validationErrors.zoneName = 'El nombre de la zona es requerido';
      return false;
    }

    if (zone.zoneName.trim().length < 2) {
      zone.validationErrors.zoneName = 'El nombre debe tener al menos 2 caracteres';
      return false;
    }

    if (zone.zoneName.trim().length > 50) {
      zone.validationErrors.zoneName = 'El nombre no puede exceder 50 caracteres';
      return false;
    }

    // Validar caracteres especiales
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/.test(zone.zoneName.trim())) {
      zone.validationErrors.zoneName = 'Solo se permiten letras, números, espacios, guiones y puntos';
      return false;
    }

    if (zone.description && zone.description.trim().length > 200) {
      zone.validationErrors.description = 'La descripción no puede exceder 200 caracteres';
      return false;
    }

    return true;
  }

  // Validación en tiempo real para zonas
  validateZoneField(fieldName: string, value: any): void {
    if (!this.editingZone) return;

    if (!this.editingZone.validationErrors) {
      this.editingZone.validationErrors = {};
    }

    switch (fieldName) {
      case 'zoneName':
        if (!value || !value.trim()) {
          this.editingZone.validationErrors.zoneName = 'El nombre de la zona es requerido';
        } else if (value.trim().length < 2) {
          this.editingZone.validationErrors.zoneName = 'Mínimo 2 caracteres';
        } else if (value.trim().length > 50) {
          this.editingZone.validationErrors.zoneName = 'Máximo 50 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/.test(value.trim())) {
          this.editingZone.validationErrors.zoneName = 'Solo letras, números, espacios, guiones y puntos';
        } else {
          delete this.editingZone.validationErrors.zoneName;
        }
        break;

      case 'description':
        if (value && value.trim().length > 200) {
          this.editingZone.validationErrors.description = 'Máximo 200 caracteres';
        } else {
          delete this.editingZone.validationErrors.description;
        }
        break;
    }
  }

  // ===============================
  // Street Management
  // ===============================

  loadStreets(): void {
    this.isLoading = true;
    this.organizationApi.getAllStreets().subscribe({
      next: (streets) => {
        // Filter streets by organization (through zones)
        this.organizationApi.getZonesByOrganizationId(this.organizationId).subscribe({
          next: (zones) => {
            const zoneIds = zones.map(z => z.zoneId);
            this.streets = streets.filter(s => zoneIds.includes(s.zoneId));
            this.applyFilters();
            this.isLoading = false;
          },
          error: () => {
            this.streets = [];
            this.applyFilters();
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading streets:', error);
        this.streets = [];
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }

  addNewStreet(): void {
    if (this.zones.length === 0) {
      alert('Debe crear al menos una zona antes de agregar calles');
      return;
    }

    this.editingStreet = {
      streetId: 'temp-street-' + Date.now(),
      zoneId: this.zones[0].zoneId,
      streetCode: '',
      streetName: '',
      streetType: 'Calle',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      availableZones: [...this.zones]
    };
    this.isEditMode = false;
    this.showStreetModal = true;
  }

  editStreet(street: StreetWithUI): void {
    this.editingStreet = {
      ...street,
      availableZones: [...this.zones]
    };
    this.isEditMode = true;
    this.showStreetModal = true;
  }

  saveStreet(): void {
    if (!this.editingStreet || !this.validateStreet(this.editingStreet)) {
      return;
    }

    this.savingStreet = true;
    const isNewStreet = this.editingStreet.streetId.startsWith('temp-');

    if (isNewStreet) {
      this.createStreet(this.editingStreet);
    } else {
      this.updateStreet(this.editingStreet);
    }
  }

  private createStreet(street: StreetWithUI): void {
    const streetRequest: CreateStreetRequest = {
      zoneId: street.zoneId,
      streetName: street.streetName.trim(),
      streetType: street.streetType
    };

    this.organizationApi.createStreet(streetRequest).subscribe({
      next: (createdStreet) => {
        this.savingStreet = false;
        if (createdStreet) {
          this.streets.unshift(createdStreet);
          this.applyFilters();
          this.closeStreetModal();
          this.notificationService.success('¡Calle Creada!', `La calle "${street.streetName}" se ha creado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingStreet = false;
        console.error('Error creating street:', error);
        this.notificationService.error('Error al Crear Calle', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }

  private updateStreet(street: StreetWithUI): void {
    const streetRequest = {
      zoneId: street.zoneId,
      streetName: street.streetName.trim(),
      streetType: street.streetType
    };

    this.organizationApi.updateStreet(street.streetId, streetRequest).subscribe({
      next: (updatedStreet) => {
        this.savingStreet = false;
        if (updatedStreet) {
          // Update the street in the list
          const index = this.streets.findIndex(s => s.streetId === street.streetId);
          if (index > -1) {
            this.streets[index] = { ...this.streets[index], ...updatedStreet };
          }
          this.applyFilters();
          this.closeStreetModal();
          this.notificationService.success('¡Calle Actualizada!', `La calle "${street.streetName}" se ha actualizado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingStreet = false;
        console.error('Error updating street:', error);
        this.notificationService.error('Error al Actualizar Calle', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }



  deleteStreet(street: any): void {
    if (confirm('¿Está seguro de que desea eliminar esta calle?')) {
      if (street.streetId.startsWith('temp-')) {
        this.removeStreetFromUI(street);
        return;
      }

      this.organizationApi.deleteStreet(street.streetId).subscribe({
        next: (success) => {
          if (success) {
            const index = this.streets.findIndex(s => s.streetId === street.streetId);
            if (index > -1) {
              this.streets[index].status = 'INACTIVE';
              this.applyFilters();
            }
            this.notificationService.success(
              'Calle eliminada',
              `La calle "${street.streetName}" ha sido eliminada exitosamente`
            );
          }
        },
        error: (error) => {
          console.error('Error deleting street:', error);
          this.notificationService.error(
            'Error al eliminar calle',
            error.error?.message || 'No se pudo eliminar la calle'
          );
        }
      });
    }
  }

  restoreStreet(street: any): void {
    if (confirm('¿Está seguro de que desea restaurar esta calle?')) {
      this.organizationApi.restoreStreet(street.streetId).subscribe({
        next: () => {
          const index = this.streets.findIndex(s => s.streetId === street.streetId);
          if (index > -1) {
            this.streets[index].status = 'ACTIVE';
            this.applyFilters();
          }
          this.notificationService.success(
            'Calle restaurada',
            `La calle "${street.streetName}" ha sido restaurada exitosamente`
          );
        },
        error: (error) => {
          console.error('Error restoring street:', error);
          this.notificationService.error(
            'Error al restaurar calle',
            error.error?.message || 'No se pudo restaurar la calle'
          );
        }
      });
    }
  }

  private removeStreetFromUI(street: any): void {
    const index = this.streets.findIndex(s => s.streetId === street.streetId);
    if (index > -1) {
      this.streets.splice(index, 1);
      this.applyFilters();
    }
  }

  private validateStreet(street: any): boolean {
    street.validationErrors = {};

    if (!street.streetName?.trim()) {
      street.validationErrors.streetName = 'El nombre de la calle es requerido';
      return false;
    }

    if (street.streetName.trim().length < 2) {
      street.validationErrors.streetName = 'El nombre debe tener al menos 2 caracteres';
      return false;
    }

    if (street.streetName.trim().length > 100) {
      street.validationErrors.streetName = 'El nombre no puede exceder 100 caracteres';
      return false;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/.test(street.streetName.trim())) {
      street.validationErrors.streetName = 'Solo se permiten letras, números, espacios, guiones y puntos';
      return false;
    }

    if (!street.zoneId) {
      street.validationErrors.zoneId = 'Debe seleccionar una zona';
      return false;
    }

    return true;
  }

  // Validación en tiempo real para calles
  validateStreetField(fieldName: string, value: any): void {
    if (!this.editingStreet) return;

    if (!this.editingStreet.validationErrors) {
      this.editingStreet.validationErrors = {};
    }

    switch (fieldName) {
      case 'streetName':
        if (!value || !value.trim()) {
          this.editingStreet.validationErrors.streetName = 'El nombre de la calle es requerido';
        } else if (value.trim().length < 2) {
          this.editingStreet.validationErrors.streetName = 'Mínimo 2 caracteres';
        } else if (value.trim().length > 100) {
          this.editingStreet.validationErrors.streetName = 'Máximo 100 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/.test(value.trim())) {
          this.editingStreet.validationErrors.streetName = 'Solo letras, números, espacios, guiones y puntos';
        } else {
          delete this.editingStreet.validationErrors.streetName;
        }
        break;

      case 'zoneId':
        if (!value) {
          this.editingStreet.validationErrors.zoneId = 'Debe seleccionar una zona';
        } else {
          delete this.editingStreet.validationErrors.zoneId;
        }
        break;
    }
  }

  getZoneName(zoneId: string): string {
    const zone = this.zones.find(z => z.zoneId === zoneId);
    return zone?.zoneName || 'Zona no encontrada';
  }

  // ===============================
  // Parameter Management
  // ===============================

  loadParameters(): void {
    this.isLoading = true;
    this.organizationApi.getParameters().subscribe({
      next: (parameters) => {
        this.parameters = parameters.map(param => ({
          id: param.id,
          organizationId: param.organizationId,
          parameterCode: param.parameterCode,
          parameterName: param.parameterName,
          parameterValue: param.parameterValue,
          parameterDescription: param.parameterDescription,
          status: param.status,
          createdAt: param.createdAt,
          updatedAt: param.updatedAt
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parameters:', error);
        this.notificationService.error(
          'Error al cargar parámetros',
          'No se pudieron cargar los parámetros del sistema'
        );
        this.isLoading = false;
      }
    });
  }

  addNewParameter(): void {
    this.editingParameter = {
      organizationId: this.organizationId,
      parameterName: '',
      parameterValue: '',
      parameterDescription: '',
      status: 'ACTIVE',
      validationErrors: {}
    };
    this.isEditMode = false;
    this.showParameterModal = true;
  }

  editParameter(parameter: Parameter): void {
    this.editingParameter = { ...parameter };
    this.isEditMode = true;
    this.showParameterModal = true;
  }

  saveParameter(): void {
    if (!this.editingParameter || !this.validateParameter(this.editingParameter)) {
      return;
    }

    this.savingParameter = true;
    const isNewParameter = !this.editingParameter.id;

    // Simulate API call
    if (isNewParameter) {
      // Crear nuevo parámetro
      const parameterData = {
        organizationId: this.organizationId,
        parameterName: this.editingParameter!.parameterName.trim(),
        parameterValue: this.editingParameter!.parameterValue.trim(),
        parameterDescription: this.editingParameter!.parameterDescription?.trim() || ''
      };

      this.organizationApi.createParameters(parameterData).subscribe({
        next: (createdParameter) => {
          this.parameters.unshift({
            id: createdParameter.id,
            organizationId: createdParameter.organizationId,
            parameterCode: createdParameter.parameterCode,
            parameterName: createdParameter.parameterName,
            parameterValue: createdParameter.parameterValue,
            parameterDescription: createdParameter.parameterDescription,
            status: createdParameter.status,
            createdAt: createdParameter.createdAt,
            updatedAt: createdParameter.updatedAt
          });
          this.applyFilters();
          this.closeParameterModal();
          this.savingParameter = false;
          this.notificationService.success(
            '¡Parámetro Creado!',
            `El parámetro "${createdParameter.parameterName}" se ha creado exitosamente.`
          );
        },
        error: (error) => {
          console.error('Error creating parameter:', error);
          this.savingParameter = false;
          this.notificationService.error(
            'Error al crear parámetro',
            error.error?.message || 'No se pudo crear el parámetro'
          );
        }
      });
    } else {
      // Actualizar parámetro existente
      const parameterData = {
        organizationId: this.organizationId,
        parameterName: this.editingParameter!.parameterName.trim(),
        parameterValue: this.editingParameter!.parameterValue.trim(),
        parameterDescription: this.editingParameter!.parameterDescription?.trim() || ''
      };

      this.organizationApi.updateParameter(this.editingParameter!.id!, parameterData).subscribe({
        next: () => {
          const index = this.parameters.findIndex(p => p.id === this.editingParameter!.id);
          if (index > -1) {
            this.parameters[index] = {
              ...this.parameters[index],
              parameterName: this.editingParameter!.parameterName.trim(),
              parameterValue: this.editingParameter!.parameterValue.trim(),
              parameterDescription: this.editingParameter!.parameterDescription?.trim() || '',
              updatedAt: new Date().toISOString()
            };
          }
          this.applyFilters();
          this.closeParameterModal();
          this.savingParameter = false;
          this.notificationService.success(
            '¡Parámetro Actualizado!',
            `El parámetro "${this.editingParameter!.parameterName}" se ha actualizado exitosamente.`
          );
        },
        error: (error) => {
          console.error('Error updating parameter:', error);
          this.savingParameter = false;
          this.notificationService.error(
            'Error al actualizar parámetro',
            error.error?.message || 'No se pudo actualizar el parámetro'
          );
        }
      });
    }
  }



  deleteParameter(parameter: any): void {
    if (confirm('¿Está seguro de que desea eliminar este parámetro?')) {
      this.organizationApi.deleteParameter(parameter.id).subscribe({
        next: () => {
          const index = this.parameters.findIndex(p => p.id === parameter.id);
          if (index > -1) {
            this.parameters[index].status = 'INACTIVE';
            this.applyFilters();
          }
          this.notificationService.success(
            'Parámetro eliminado',
            `El parámetro "${parameter.parameterName}" ha sido eliminado exitosamente`
          );
        },
        error: (error) => {
          console.error('Error deleting parameter:', error);
          this.notificationService.error(
            'Error al eliminar parámetro',
            error.error?.message || 'No se pudo eliminar el parámetro'
          );
        }
      });
    }
  }

  restoreParameter(parameter: any): void {
    if (confirm('¿Está seguro de que desea restaurar este parámetro?')) {
      this.organizationApi.restoreParameter(parameter.id).subscribe({
        next: () => {
          const index = this.parameters.findIndex(p => p.id === parameter.id);
          if (index > -1) {
            this.parameters[index].status = 'ACTIVE';
            this.applyFilters();
          }
          this.notificationService.success(
            'Parámetro restaurado',
            `El parámetro "${parameter.parameterName}" ha sido restaurado exitosamente`
          );
        },
        error: (error) => {
          console.error('Error restoring parameter:', error);
          this.notificationService.error(
            'Error al restaurar parámetro',
            error.error?.message || 'No se pudo restaurar el parámetro'
          );
        }
      });
    }
  }

  private validateParameter(parameter: any): boolean {
    parameter.validationErrors = {};

    if (!parameter.parameterName?.trim()) {
      parameter.validationErrors.parameterName = 'El nombre del parámetro es requerido';
      return false;
    }

    if (parameter.parameterName.trim().length < 3) {
      parameter.validationErrors.parameterName = 'El nombre debe tener al menos 3 caracteres';
      return false;
    }

    if (parameter.parameterName.trim().length > 100) {
      parameter.validationErrors.parameterName = 'El nombre no puede exceder 100 caracteres';
      return false;
    }

    if (!parameter.parameterValue?.trim()) {
      parameter.validationErrors.parameterValue = 'El valor del parámetro es requerido';
      return false;
    }

    if (parameter.parameterValue.trim().length > 500) {
      parameter.validationErrors.parameterValue = 'El valor no puede exceder 500 caracteres';
      return false;
    }

    if (!parameter.parameterDescription?.trim()) {
      parameter.validationErrors.parameterDescription = 'La descripción es requerida';
      return false;
    }

    if (parameter.parameterDescription.trim().length > 500) {
      parameter.validationErrors.parameterDescription = 'La descripción no puede exceder 500 caracteres';
      return false;
    }

    return true;
  }

  // Validación en tiempo real para parámetros
  validateParameterField(fieldName: string, value: any): void {
    if (!this.editingParameter) return;

    if (!this.editingParameter.validationErrors) {
      this.editingParameter.validationErrors = {};
    }

    switch (fieldName) {
      case 'parameterName':
        if (!value || !value.trim()) {
          this.editingParameter.validationErrors.parameterName = 'El nombre del parámetro es requerido';
        } else if (value.trim().length < 3) {
          this.editingParameter.validationErrors.parameterName = 'Mínimo 3 caracteres';
        } else if (value.trim().length > 100) {
          this.editingParameter.validationErrors.parameterName = 'Máximo 100 caracteres';
        } else {
          delete this.editingParameter.validationErrors.parameterName;
        }
        break;

      case 'parameterValue':
        if (!value || !value.trim()) {
          this.editingParameter.validationErrors.parameterValue = 'El valor es requerido';
        } else if (value.trim().length > 500) {
          this.editingParameter.validationErrors.parameterValue = 'Máximo 500 caracteres';
        } else {
          delete this.editingParameter.validationErrors.parameterValue;
        }
        break;

      case 'parameterDescription':
        if (!value || !value.trim()) {
          this.editingParameter.validationErrors.parameterDescription = 'La descripción es requerida';
        } else if (value.trim().length > 500) {
          this.editingParameter.validationErrors.parameterDescription = 'Máximo 500 caracteres';
        } else {
          delete this.editingParameter.validationErrors.parameterDescription;
        }
        break;
    }
  }

  // ===============================
  // Tarifa Management
  // ===============================

  loadTarifas(): void {
    this.isLoading = true;
    this.organizationApi.getTarifas().subscribe({
      next: (tarifas) => {
        this.tarifas = tarifas || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tarifas:', error);
        this.tarifas = [];
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }

  addNewTarifa(): void {
    if (this.zones.length === 0) {
      alert('Debe crear al menos una zona antes de agregar tarifas');
      return;
    }

    this.editingTarifa = {
      fareCode: 'temp-tarifa-' + Date.now(),
      zoneId: this.zones[0].zoneId,
      zoneName: this.zones[0].zoneName,
      fareName: '',
      fareAmount: '',
      fareDescription: '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.isEditMode = false;
    this.showTarifaModal = true;
  }

  editTarifa(tarifa: Tarifa): void {
    this.editingTarifa = { ...tarifa };
    this.isEditMode = true;
    this.showTarifaModal = true;
  }

  saveTarifa(): void {
    if (!this.editingTarifa || !this.validateTarifa(this.editingTarifa)) {
      return;
    }

    this.savingTarifa = true;
    const isNewTarifa = this.editingTarifa.fareCode.startsWith('temp-');

    if (isNewTarifa) {
      this.createTarifa(this.editingTarifa);
    } else {
      this.updateTarifa(this.editingTarifa);
    }
  }

  private createTarifa(tarifa: Tarifa): void {
    const tarifaRequest = {
      zoneId: tarifa.zoneId,
      fareName: tarifa.fareName.trim(),
      fareAmount: tarifa.fareAmount,
      fareDescription: tarifa.fareDescription.trim(),
    };

    this.organizationApi.createTarifa(tarifaRequest).subscribe({
      next: (createdTarifa) => {
        this.savingTarifa = false;
        if (createdTarifa) {
          this.tarifas.unshift(createdTarifa);
          this.applyFilters();
          this.closeTarifaModal();
          this.notificationService.success('¡Tarifa Creada!', `La tarifa "${tarifa.fareName}" se ha creado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingTarifa = false;
        console.error('Error creating tarifa:', error);
        this.notificationService.error('Error al Crear Tarifa', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }

  private updateTarifa(tarifa: Tarifa): void {
    const tarifaRequest = {
      zoneId: tarifa.zoneId,
      fareName: tarifa.fareName.trim(),
      fareAmount: tarifa.fareAmount,
      fareDescription: tarifa.fareDescription.trim(),
    };

    this.organizationApi.updateTarifa(tarifa.fareCode, tarifaRequest).subscribe({
      next: (updatedTarifa) => {
        this.savingTarifa = false;
        if (updatedTarifa) {
          const index = this.tarifas.findIndex(t => t.fareCode === tarifa.fareCode);
          if (index > -1) {
            this.tarifas[index] = { ...this.tarifas[index], ...updatedTarifa };
          }
          this.applyFilters();
          this.closeTarifaModal();
          this.notificationService.success('¡Tarifa Actualizada!', `La tarifa "${tarifa.fareName}" se ha actualizado exitosamente.`);
        }
      },
      error: (error) => {
        this.savingTarifa = false;
        console.error('Error updating tarifa:', error);
        this.notificationService.error('Error al Actualizar Tarifa', error.error?.message || error.message || 'Error desconocido');
      }
    });
  }

  closeTarifaModal(): void {
    this.showTarifaModal = false;
    this.editingTarifa = null;
    this.isEditMode = false;
  }

  deleteTarifa(tarifa: Tarifa): void {
    if (confirm('¿Está seguro de que desea eliminar esta tarifa?')) {
      if (tarifa.fareCode.startsWith('temp-')) {
        this.removeTarifaFromUI(tarifa);
        return;
      }

      this.organizationApi.deleteTarifa(tarifa.fareCode).subscribe({
        next: (success) => {
          if (success) {
            const index = this.tarifas.findIndex(t => t.fareCode === tarifa.fareCode);
            if (index > -1) {
              this.tarifas[index].status = 'INACTIVE';
              this.applyFilters();
            }
            this.notificationService.success('Tarifa eliminada', `La tarifa "${tarifa.fareName}" ha sido eliminada exitosamente`);
          }
        },
        error: (error) => {
          console.error('Error deleting tarifa:', error);
          this.notificationService.error('Error al eliminar tarifa', error.error?.message || 'No se pudo eliminar la tarifa');
        }
      });
    }
  }

  restoreTarifa(tarifa: Tarifa): void {
    if (confirm('¿Está seguro de que desea restaurar esta tarifa?')) {
      this.organizationApi.restoreTarifa(tarifa.fareCode).subscribe({
        next: () => {
          const index = this.tarifas.findIndex(t => t.fareCode === tarifa.fareCode);
          if (index > -1) {
            this.tarifas[index].status = 'ACTIVE';
            this.applyFilters();
          }
          this.notificationService.success('Tarifa restaurada', `La tarifa "${tarifa.fareName}" ha sido restaurada exitosamente`);
        },
        error: (error) => {
          console.error('Error restoring tarifa:', error);
          this.notificationService.error('Error al restaurar tarifa', error.error?.message || 'No se pudo restaurar la tarifa');
        }
      });
    }
  }

  // ===============================
  // FARE HISTORY METHODS
  // ===============================

  viewFareHistory(tarifa: Tarifa): void {
    this.selectedZoneForHistory = tarifa.zoneId;
    this.showFareHistoryModal = true;
    this.loadFareHistory(tarifa.zoneId);
  }

  loadFareHistory(zoneId: string): void {
    this.loadingHistory = true;
    this.organizationApi.getFareHistoryByZone(zoneId).subscribe({
      next: (history) => {
        this.fareHistory = history;
        this.loadingHistory = false;
      },
      error: (error) => {
        console.error('Error loading fare history:', error);
        this.loadingHistory = false;
        this.notificationService.error('Error al cargar historial', 'No se pudo cargar el historial de tarifas');
      }
    });
  }

  closeFareHistoryModal(): void {
    this.showFareHistoryModal = false;
    this.fareHistory = [];
    this.selectedZoneForHistory = '';
  }

  getValidityPeriod(tarifa: Tarifa): string {
    const startDate = new Date(tarifa.createdAt);
    const endDate = tarifa.status === 'INACTIVE' ? new Date(tarifa.updatedAt) : null;

    if (endDate) {
      return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    }
    return `Desde ${this.formatDate(startDate)} (Vigente)`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private removeTarifaFromUI(tarifa: Tarifa): void {
    const index = this.tarifas.findIndex(t => t.fareCode === tarifa.fareCode);
    if (index > -1) {
      this.tarifas.splice(index, 1);
      this.applyFilters();
    }
  }

  private validateTarifa(tarifa: Tarifa): boolean {
    tarifa.validationErrors = {};

    if (!tarifa.fareName?.trim()) {
      tarifa.validationErrors.fareName = 'El nombre de la tarifa es requerido';
      return false;
    }

    if (tarifa.fareName.trim().length < 3) {
      tarifa.validationErrors.fareName = 'El nombre debe tener al menos 3 caracteres';
      return false;
    }

    if (!tarifa.fareAmount) {
      tarifa.validationErrors.fareAmount = 'El valor de la tarifa es requerido';
      return false;
    }

    if (!tarifa.zoneId) {
      tarifa.validationErrors.zoneId = 'Debe seleccionar una zona';
      return false;
    }

    if (!tarifa.fareDescription?.trim()) {
      tarifa.validationErrors.fareDescription = 'La descripción es requerida';
      return false;
    }

    if (tarifa.fareDescription.trim().length > 500) {
      tarifa.validationErrors.fareDescription = 'La descripción no puede exceder 500 caracteres';
      return false;
    }

    return true;
  }

  validateTarifaField(fieldName: string, value: any): void {
    if (!this.editingTarifa) return;

    if (!this.editingTarifa.validationErrors) {
      this.editingTarifa.validationErrors = {};
    }

    switch (fieldName) {
      case 'fareName':
        if (!value || !value.trim()) {
          this.editingTarifa.validationErrors.fareName = 'El nombre de la tarifa es requerido';
        } else if (value.trim().length < 3) {
          this.editingTarifa.validationErrors.fareName = 'Mínimo 3 caracteres';
        } else {
          delete this.editingTarifa.validationErrors.fareName;
        }
        break;

      case 'fareAmount':
        if (!value) {
          this.editingTarifa.validationErrors.fareAmount = 'El valor es requerido';
        } else {
          delete this.editingTarifa.validationErrors.fareAmount;
        }
        break;

      case 'zoneId':
        if (!value) {
          this.editingTarifa.validationErrors.zoneId = 'Debe seleccionar una zona';
        } else {
          delete this.editingTarifa.validationErrors.zoneId;
        }
        break;

      case 'fareDescription':
        if (!value || !value.trim()) {
          this.editingTarifa.validationErrors.fareDescription = 'La descripción es requerida';
        } else if (value.trim().length > 500) {
          this.editingTarifa.validationErrors.fareDescription = 'Máximo 500 caracteres';
        } else {
          delete this.editingTarifa.validationErrors.fareDescription;
        }
        break;
    }
  }

  onTarifaZoneFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // ===============================
  // Search and Filter
  // ===============================

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onCategoryFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onZoneFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Custom dropdown methods
  toggleZoneDropdown(): void {
    this.isZoneDropdownOpen = !this.isZoneDropdownOpen;
  }

  selectZone(zoneId: string, zoneName: string): void {
    this.zoneFilter = zoneId;
    this.selectedZoneName = zoneName;
    this.isZoneDropdownOpen = false;
    this.onZoneFilterChange();
  }

  selectAllZones(): void {
    this.zoneFilter = 'all';
    this.selectedZoneName = 'Todas las zonas';
    this.isZoneDropdownOpen = false;
    this.onZoneFilterChange();
  }

  // ===============================
  // Filters and Search
  // ===============================

  applyFilters(): void {
    let data: any[] = [];

    switch (this.activeTab) {
      case 'zones':
        data = [...this.zones];
        break;
      case 'streets':
        data = [...this.streets];
        break;
      case 'parameters':
        data = [...this.parameters];
        break;
      case 'tarifas':
        data = [...this.tarifas];
        break;
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(item => {
        switch (this.activeTab) {
          case 'zones':
            return item.zoneName?.toLowerCase().includes(term) ||
              item.description?.toLowerCase().includes(term);
          case 'streets':
            return item.streetName?.toLowerCase().includes(term) ||
              item.streetType?.toLowerCase().includes(term);
          case 'parameters':
            return item.parameterName?.toLowerCase().includes(term) ||
              item.parameterValue?.toLowerCase().includes(term) ||
              item.description?.toLowerCase().includes(term);
          case 'tarifas':
            return item.tarifaName?.toLowerCase().includes(term) ||
              item.tarifaValue?.toLowerCase().includes(term) ||
              item.tarifaDescription?.toLowerCase().includes(term);
          default:
            return false;
        }
      });
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      const status = this.statusFilter === 'active' ? 'ACTIVE' : 'INACTIVE';
      data = data.filter(item => item.status === status);
    }

    // Apply category filter for parameters
    if (this.activeTab === 'parameters' && this.categoryFilter !== 'all') {
      data = data.filter(item => item.category === this.categoryFilter);
    }

    // Apply zone filter for streets
    if (this.activeTab === 'streets' && this.zoneFilter !== 'all') {
      data = data.filter(item => item.zoneId === this.zoneFilter);
    }

    // Apply zone filter for tarifas
    if (this.activeTab === 'tarifas' && this.tarifaZoneFilter !== 'all') {
      data = data.filter(item => item.zoneId === this.tarifaZoneFilter);
    }

    // Update filtered data
    switch (this.activeTab) {
      case 'zones':
        this.filteredZones = data;
        break;
      case 'streets':
        this.filteredStreets = data;
        break;
      case 'parameters':
        this.filteredParameters = data;
        break;
      case 'tarifas':
        this.filteredTarifas = data;
        break;
    }

    this.updatePagination();
  }

  // ===============================
  // Pagination
  // ===============================

  updatePagination(): void {
    let data: any[] = [];

    switch (this.activeTab) {
      case 'zones':
        data = this.filteredZones;
        break;
      case 'streets':
        data = this.filteredStreets;
        break;
      case 'parameters':
        data = this.filteredParameters;
        break;
      case 'tarifas':
        data = this.filteredTarifas;
        break;
    }

    this.totalPages = Math.ceil(data.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    switch (this.activeTab) {
      case 'zones':
        this.paginatedZones = data.slice(startIndex, endIndex);
        break;
      case 'streets':
        this.paginatedStreets = data.slice(startIndex, endIndex);
        break;
      case 'parameters':
        this.paginatedParameters = data.slice(startIndex, endIndex);
        break;
      case 'tarifas':
        this.paginatedTarifas = data.slice(startIndex, endIndex);
        break;
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // ===============================
  // UI Helpers
  // ===============================

  getStatusBadgeClass(status: string): string {
    return status === 'ACTIVE'
      ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
      : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }



  getStreetTypeIcon(streetType: string): string {
    const icons: { [key: string]: string } = {
      'Calle': '🏠',
      'Avenida': '🛣️',
      'Jirón': '🏘️',
      'Pasaje': '🚶'
    };
    return icons[streetType] || '🏠';
  }

  trackById(index: number, item: any): string {
    return item.zoneId || item.streetId || item.parameterId || index.toString();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdown when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isZoneDropdownOpen = false;
    }
  }

  // Helper methods for parameter validation hints
  getParameterValuePlaceholder(type: string): string {
    switch (type) {
      case 'TEXT':
        return 'Ej: admin@jass.gob.pe, Sistema JASS';
      case 'NUMBER':
        return 'Ej: 2.5, 100, 0.75';
      case 'BOOLEAN':
        return 'true o false';
      case 'JSON':
        return 'Ej: {"key": "value", "number": 123}';
      default:
        return 'Ingrese el valor del parámetro';
    }
  }

  getParameterValueHint(type: string): string {
    switch (type) {
      case 'TEXT':
        return 'Cualquier texto o cadena de caracteres.';
      case 'NUMBER':
        return 'Solo números enteros o decimales (use punto para decimales).';
      case 'BOOLEAN':
        return 'Solo "true" o "false" (sin comillas).';
      case 'JSON':
        return 'Formato JSON válido con comillas dobles para las claves.';
      default:
        return 'Ingrese un valor válido según el tipo seleccionado.';
    }
  }

  // ===============================
  // Report Generation Methods
  // ===============================

  async generateZonesReport(): Promise<void> {
    try {
      const organization = await this.getOrganizationData();
      await this.createZonesReportPDF(organization);
    } catch (error) {
      console.error('Error generating zones report:', error);
      this.notificationService.error('Error al Generar Reporte', 'No se pudo generar el reporte de zonas');
    }
  }

  async generateStreetsReport(): Promise<void> {
    try {
      const organization = await this.getOrganizationData();
      await this.createStreetsReportPDF(organization);
    } catch (error) {
      console.error('Error generating streets report:', error);
      this.notificationService.error('Error al Generar Reporte', 'No se pudo generar el reporte de calles');
    }
  }

  async generateParametersReport(): Promise<void> {
    try {
      const organization = await this.getOrganizationData();
      await this.createParametersReportPDF(organization);
    } catch (error) {
      console.error('Error generating parameters report:', error);
      this.notificationService.error('Error al Generar Reporte', 'No se pudo generar el reporte de parámetros');
    }
  }

  private async getOrganizationData(): Promise<any> {
    return new Promise((resolve) => {
      this.organizationApi.getOrganizationById(this.organizationId).subscribe({
        next: (org) => resolve(org),
        error: () => resolve(null)
      });
    });
  }

  private async createZonesReportPDF(organization: any): Promise<void> {
    const doc = new jsPDF();
    const currentDate = new Date();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';

    // Configuración de colores
    const primaryColor: [number, number, number] = [55, 65, 81];
    const secondaryColor: [number, number, number] = [107, 114, 128];
    const lightGray: [number, number, number] = [249, 250, 251];
    const borderColor: [number, number, number] = [209, 213, 219];

    // Header profesional
    await this.addReportHeader(doc, organization, 'REPORTE DE ZONAS', primaryColor, secondaryColor, lightGray, borderColor);

    // Información del reporte
    let yPos = 82;
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Zonas: ${this.zones.length}`, 20, yPos);

    yPos += 15;

    // Tabla de zonas
    doc.setFontSize(14);
    doc.text('Detalle de Zonas', 20, yPos);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(20, yPos + 3, 190, yPos + 3);

    yPos += 15;

    // Headers de tabla
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Código', 25, yPos + 5);
    doc.text('Nombre', 60, yPos + 5);
    doc.text('Descripción', 120, yPos + 5);
    doc.text('Estado', 165, yPos + 5);

    yPos += 12;

    // Contenido de la tabla
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.zones.forEach((zone, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(zone.zoneCode || `Z${index + 1}`, 25, yPos);
      doc.text(zone.zoneName.substring(0, 25), 60, yPos);
      doc.text((zone.description || 'Sin descripción').substring(0, 20), 120, yPos);

      // Estado con color
      if (zone.status === 'ACTIVE') {
        doc.setTextColor(34, 197, 94);
        doc.text('Activo', 165, yPos);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('Inactivo', 165, yPos);
      }

      yPos += 8;
    });

    const fileName = `reporte-zonas-${currentDate.toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    this.notificationService.success('Reporte Generado', 'El reporte de zonas se ha descargado exitosamente.');
  }

  private async createStreetsReportPDF(organization: any): Promise<void> {
    const doc = new jsPDF();
    const currentDate = new Date();

    // Configuración de colores
    const primaryColor: [number, number, number] = [55, 65, 81];
    const secondaryColor: [number, number, number] = [107, 114, 128];
    const lightGray: [number, number, number] = [249, 250, 251];
    const borderColor: [number, number, number] = [209, 213, 219];

    // Header profesional
    await this.addReportHeader(doc, organization, 'REPORTE DE CALLES', primaryColor, secondaryColor, lightGray, borderColor);

    // Información del reporte
    let yPos = 82;
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Calles: ${this.streets.length}`, 20, yPos);

    yPos += 15;

    // Tabla de calles
    doc.setFontSize(14);
    doc.text('Detalle de Calles', 20, yPos);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(20, yPos + 3, 190, yPos + 3);

    yPos += 15;

    // Headers de tabla
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Nombre', 25, yPos + 5);
    doc.text('Tipo', 80, yPos + 5);
    doc.text('Zona', 120, yPos + 5);
    doc.text('Estado', 165, yPos + 5);

    yPos += 12;

    // Contenido de la tabla
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    this.streets.forEach((street) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(street.streetName.substring(0, 30), 25, yPos);
      doc.text(street.streetType, 80, yPos);
      doc.text(this.getZoneName(street.zoneId).substring(0, 20), 120, yPos);

      // Estado con color
      if (street.status === 'ACTIVE') {
        doc.setTextColor(34, 197, 94);
        doc.text('Activo', 165, yPos);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('Inactivo', 165, yPos);
      }

      yPos += 8;
    });

    const fileName = `reporte-calles-${currentDate.toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    this.notificationService.success('Reporte Generado', 'El reporte de calles se ha descargado exitosamente.');
  }

  private async createParametersReportPDF(organization: any): Promise<void> {
    const doc = new jsPDF();
    const currentDate = new Date();

    // Configuración de colores
    const primaryColor: [number, number, number] = [55, 65, 81];
    const secondaryColor: [number, number, number] = [107, 114, 128];
    const lightGray: [number, number, number] = [249, 250, 251];
    const borderColor: [number, number, number] = [209, 213, 219];
    const accentBlue: [number, number, number] = [59, 130, 246];

    // Header profesional
    await this.addReportHeader(doc, organization, 'REPORTE DE PARÁMETROS DEL SISTEMA', primaryColor, secondaryColor, lightGray, borderColor);

    // Información del reporte con estadísticas
    let yPos = 82;
    const activeParams = this.parameters.filter(p => p.status === 'ACTIVE').length;
    const inactiveParams = this.parameters.filter(p => p.status === 'INACTIVE').length;

    // Caja de estadísticas
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.rect(20, yPos, 170, 20, 'F');

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE PARÁMETROS', 25, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${this.parameters.length}`, 25, yPos + 14);
    doc.text(`Activos: ${activeParams}`, 80, yPos + 14);
    doc.text(`Inactivos: ${inactiveParams}`, 135, yPos + 14);

    yPos += 28;

    // Título de la tabla
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado Detallado de Parámetros', 20, yPos);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(20, yPos + 2, 190, yPos + 2);

    yPos += 10;

    // Iterar por cada parámetro con formato de tarjeta
    this.parameters.forEach((param, index) => {
      // Verificar si necesitamos una nueva página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Fondo alternado para cada parámetro
      if (index % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(20, yPos - 3, 170, 28, 'F');
      }

      // Borde del parámetro
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.rect(20, yPos - 3, 170, 28, 'S');

      // Nombre del parámetro (destacado)
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${param.parameterName}`, 25, yPos + 2);

      // Código del parámetro
      if (param.parameterCode) {
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont('helvetica', 'italic');
        doc.text(`[${param.parameterCode}]`, 25, yPos + 7);
      }

      // Valor del parámetro
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Valor:', 25, yPos + 13);
      doc.setFont('helvetica', 'bold');
      const paramValue = param.parameterValue.length > 60 ? param.parameterValue.substring(0, 60) + '...' : param.parameterValue;
      doc.text(paramValue, 40, yPos + 13);

      // Descripción del parámetro
      if (param.parameterDescription) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        const description = param.parameterDescription.length > 80 ? param.parameterDescription.substring(0, 80) + '...' : param.parameterDescription;
        doc.text(description, 25, yPos + 19);
      }

      // Estado con badge
      const statusX = 165;
      const statusY = yPos + 2;
      if (param.status === 'ACTIVE') {
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(statusX, statusY - 3, 20, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTIVO', statusX + 2, statusY + 1);
      } else {
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(statusX, statusY - 3, 22, 6, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('INACTIVO', statusX + 1, statusY + 1);
      }

      yPos += 32;
    });

    // Footer con información adicional
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${pageCount}`, 180, 285, { align: 'right' });
      doc.text('Sistema JASS - Gestión de Parámetros', 20, 285);
    }

    const fileName = `reporte-parametros-${currentDate.toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    this.notificationService.success('Reporte Generado', 'El reporte de parámetros se ha descargado exitosamente.');
  }

  private async addReportHeader(doc: any, organization: any, title: string, primaryColor: [number, number, number], secondaryColor: [number, number, number], lightGray: [number, number, number], borderColor: [number, number, number]): Promise<void> {
    const currentDate = new Date();
    const currentUser = this.authService.getCurrentUser();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';

    // Header profesional
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');

    // Línea superior
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(3);
    doc.line(0, 0, 210, 0);
    doc.setLineWidth(0.5);

    // Logo de la organización
    await this.addOrganizationLogoAsync(doc, organization, 20, 15, 25, 20);

    // Información de la organización
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(organizationName, 55, 22);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión de Agua Potable y Saneamiento', 55, 30);

    doc.setFontSize(10);
    doc.text(title, 55, 37);

    // Información adicional de la organización
    if (organization) {
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      if (organization.address) {
        doc.text(`Dirección: ${organization.address}`, 55, 43);
      }
      if (organization.phone) {
        doc.text(`Teléfono: ${organization.phone}`, 140, 43);
      }
    }

    // Línea inferior del header
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(15, 48, 195, 48);
    doc.setLineWidth(0.5);

    // Información de generación
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, 55, 180, 18, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(15, 55, 180, 18, 'S');

    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${currentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} - ${currentDate.toLocaleTimeString('es-ES')}`, 20, 62);

    // Información del usuario que genera el reporte
    if (currentUser) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (userName) {
        doc.text(`Generado por: ${userName}`, 20, 68);
      }
      if (currentUser.email) {
        doc.text(`Email: ${currentUser.email}`, 120, 68);
      }
    }
  }

  private async addOrganizationLogoAsync(doc: any, organization: any, x: number, y: number, maxWidth: number, maxHeight: number): Promise<void> {
    // Intentar obtener el logo de diferentes campos posibles
    let logoUrl = null;

    if (organization) {
      logoUrl = organization.logoUrl ||
        organization.logo ||
        organization.image ||
        organization.organizationLogo ||
        organization.profileImage ||
        organization.logoPath ||
        organization.imagePath;
    }

    if (logoUrl) {
      try {
        const imageResult = await this.loadImageAsync(logoUrl);

        // Calcular dimensiones finales manteniendo aspect ratio dentro del espacio disponible
        const aspectRatio = imageResult.width / imageResult.height;
        let finalWidth = maxWidth;
        let finalHeight = maxHeight;

        if (aspectRatio > 1) {
          // Imagen más ancha que alta
          finalHeight = maxWidth / aspectRatio;
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspectRatio;
          }
        } else {
          // Imagen más alta que ancha
          finalWidth = maxHeight * aspectRatio;
          if (finalWidth > maxWidth) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / aspectRatio;
          }
        }

        // Centrar la imagen en el espacio disponible
        const offsetX = (maxWidth - finalWidth) / 2;
        const offsetY = (maxHeight - finalHeight) / 2;

        doc.addImage(imageResult.dataURL, 'PNG', x + offsetX, y + offsetY, finalWidth, finalHeight);
      } catch (error) {
        console.log('Error al cargar logo, usando logo por defecto:', error);
        this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
      }
    } else {
      console.log('No se encontró URL de logo, usando logo por defecto');
      this.addDefaultLogo(doc, x, y, maxWidth, maxHeight);
    }
  }

  private loadImageAsync(imageUrl: string): Promise<{ dataURL: string, width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject('No se pudo crear el contexto del canvas');
            return;
          }

          // Obtener dimensiones originales
          const originalWidth = img.naturalWidth;
          const originalHeight = img.naturalHeight;

          // Calcular dimensiones manteniendo aspect ratio
          const maxWidth = 200;
          const maxHeight = 200;

          let newWidth = originalWidth;
          let newHeight = originalHeight;

          // Redimensionar solo si es necesario
          if (originalWidth > maxWidth || originalHeight > maxHeight) {
            const aspectRatio = originalWidth / originalHeight;

            if (originalWidth > originalHeight) {
              newWidth = maxWidth;
              newHeight = maxWidth / aspectRatio;
            } else {
              newHeight = maxHeight;
              newWidth = maxHeight * aspectRatio;
            }
          }

          canvas.width = newWidth;
          canvas.height = newHeight;

          // Limpiar el canvas con fondo blanco
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, newWidth, newHeight);

          // Dibujar la imagen manteniendo proporciones
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convertir a base64
          const dataURL = canvas.toDataURL('image/png', 0.9);
          resolve({
            dataURL,
            width: newWidth,
            height: newHeight
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject('Error al cargar la imagen');
      };

      // Construir la URL completa con diferentes variaciones
      const possibleUrls = [];

      if (imageUrl.startsWith('http')) {
        possibleUrls.push(imageUrl);
      } else {
        possibleUrls.push(`https://lab.vallegrande.edu.pe${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
        possibleUrls.push(`https://lab.vallegrande.edu.pe/jass${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
        possibleUrls.push(`https://lab.vallegrande.edu.pe/uploads${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`);
      }

      // Intentar cargar desde la primera URL
      this.tryLoadFromUrls(img, possibleUrls, 0, reject);
    });
  }

  private tryLoadFromUrls(img: HTMLImageElement, urls: string[], index: number, reject: (reason?: any) => void): void {
    if (index >= urls.length) {
      reject('No se pudo cargar la imagen desde ninguna URL');
      return;
    }

    const currentUrl = urls[index];
    console.log(`Intentando cargar logo desde: ${currentUrl}`);

    img.onerror = () => {
      console.log(`Falló la carga desde: ${currentUrl}`);
      this.tryLoadFromUrls(img, urls, index + 1, reject);
    };

    img.src = currentUrl;
  }

  private addDefaultLogo(doc: any, x: number, y: number, width: number, height: number): void {
    // Logo por defecto profesional con mejor proporción
    const logoWidth = Math.min(width, height * 1.2); // Mantener proporción rectangular
    const logoHeight = Math.min(height, width / 1.2);

    // Centrar el logo en el espacio disponible
    const offsetX = (width - logoWidth) / 2;
    const offsetY = (height - logoHeight) / 2;

    const finalX = x + offsetX;
    const finalY = y + offsetY;

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(finalX, finalY, logoWidth, logoHeight, 'F');

    // Borde azul
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    doc.rect(finalX, finalY, logoWidth, logoHeight, 'S');

    // Diseño interno
    doc.setFillColor(59, 130, 246);

    // Círculo central proporcional
    const circleRadius = Math.min(logoWidth, logoHeight) * 0.15;
    doc.circle(finalX + logoWidth / 2, finalY + logoHeight / 2 - circleRadius / 2, circleRadius, 'F');

    // Texto JASS proporcional
    const fontSize = Math.min(logoWidth, logoHeight) * 0.25;
    doc.setFontSize(fontSize);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');

    // Centrar el texto
    const textWidth = fontSize * 2; // Aproximación del ancho del texto "JASS"
    doc.text('JASS', finalX + (logoWidth - textWidth) / 2, finalY + logoHeight - fontSize / 2);

    doc.setLineWidth(0.5);
  }
}