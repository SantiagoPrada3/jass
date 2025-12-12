import { Component, OnInit, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Breadcrumb, BreadcrumbItem } from "../../../../shared/components/ui/breadcrumb/breadcrumb";
import { CreateOrganizationRequest, Organization, ZoneCreateRequest, CreateStreetRequest } from "../../models/organization.model";
import { OrganizationApi } from "../../services/organization-api";
import { ImageUploadService } from "../../services/image-upload.service";
import { OrganizationReportService } from "../../services/organization-report.service";

@Component({
  selector: "app-organization-branches",
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb],
  templateUrl: "./organization-branches.html",
  styleUrl: "./organization-branches.css"
})
export class OrganizationBranches implements OnInit {
  // Breadcrumb configuration
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Inicio Global",
      url: "/super-admin/dashboard",
      icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    {
      label: "Organizaciones",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    }
  ];

  // Organization data
  organizations: Organization[] = [];
  filteredOrganizations: Organization[] = [];
  paginatedOrganizations: Organization[] = [];

  // Search and filter properties
  searchTerm: string = "";
  statusFilter: string = "all";

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Loading states
  isLoading: boolean = false;
  savingZone: boolean = false;
  savingStreet: boolean = false;

  // UI state
  expandedOrganizations: Set<string> = new Set();
  expandedZones: Set<string> = new Set();
  selectedOrganization: Organization | null = null;
  showDetailPanel: boolean = false;
  isEditMode: boolean = false;
  editableOrganization: Organization | null = null;

  // Logo management
  logoPreview: string | null = null;
  selectedFile: File | null = null;
  isUploading: boolean = false;

  // Validation
  organizationValidationErrors: any = {};

  // Logo management states
  showLogoUpload: boolean = false;
  originalImageSize: string = '';
  compressedImageSize: string = '';

  Math = Math;

  // Report menu state
  showReportMenu: boolean = false;

  // Helper functions for type safety
  getZoneValidationErrors(zone: any): any {
    return zone.validationErrors || {};
  }

  getStreetValidationErrors(street: any): any {
    return street.validationErrors || {};
  }

  hasZoneMenu(zone: any): boolean {
    return zone.showMenu || false;
  }

  hasStreetMenu(street: any): boolean {
    return street.showMenu || false;
  }

  constructor(
    private organizationApi: OrganizationApi,
    private imageUploadService: ImageUploadService,
    private reportService: OrganizationReportService
  ) { }

  ngOnInit() {
    this.loadOrganizations();
  }

  // ===============================
  // Organization Management
  // ===============================

  loadOrganizations() {
    this.isLoading = true;
    this.organizationApi.getOrganizations().subscribe(data => {
      this.organizations = data;
      this.applyFilters();
      this.isLoading = false;
    });
  }

  openCreateModal() {
    const newOrganization: Organization = {
      organizationId: 'temp-' + Date.now(),
      organizationCode: '',
      organizationName: '',
      legalRepresentative: '',
      address: '',
      phone: '',
      logo: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      zones: [],
      street: []
    };

    this.selectedOrganization = newOrganization;
    this.editableOrganization = { ...newOrganization };
    this.showDetailPanel = true;
    this.isEditMode = true;
    this.logoPreview = null;
  }

  saveChanges() {
    if (this.editableOrganization && this.selectedOrganization) {
      if (!this.validateOrganizationForm()) {
        return;
      }

      const isNewOrganization = this.selectedOrganization.organizationId.startsWith('temp-');

      if (isNewOrganization) {
        this.createOrganization();
      } else {
        this.updateOrganization();
      }
    }
  }

  private validateOrganizationForm(): boolean {
    if (!this.editableOrganization!.organizationName?.trim()) {
      alert('El nombre de la organización es requerido');
      return false;
    }

    if (!this.editableOrganization!.legalRepresentative?.trim()) {
      alert('El representante legal es requerido');
      return false;
    }

    if (!this.editableOrganization!.address?.trim()) {
      alert('La dirección es requerida');
      return false;
    }

    if (!this.editableOrganization!.phone?.trim()) {
      alert('El teléfono es requerido');
      return false;
    }

    const phonePattern = /^[0-9]{9}$/;
    if (!phonePattern.test(this.editableOrganization!.phone.trim())) {
      alert('El teléfono debe tener exactamente 9 dígitos');
      return false;
    }

    return true;
  }

  private createOrganization() {
    const organizationData: CreateOrganizationRequest = {
      organizationName: this.editableOrganization!.organizationName.trim(),
      legalRepresentative: this.editableOrganization!.legalRepresentative.trim(),
      address: this.editableOrganization!.address.trim(),
      phone: this.editableOrganization!.phone.trim(),
      logo: this.editableOrganization!.logo
    };

    this.organizationApi.createOrganization(organizationData).subscribe({
      next: (createdOrg) => {
        if (createdOrg) {
          this.selectedOrganization = createdOrg;
          this.loadOrganizations();
          this.resetEditMode();
          alert('¡Organización creada correctamente! Ahora puede gestionar las zonas.');
          console.log("Nueva organización creada:", createdOrg);
        } else {
          alert('Error al crear la organización');
        }
      },
      error: (error) => {
        console.error('Error creating organization:', error);
        const errorMessage = this.getOrganizationErrorMessage(error, 'crear');
        alert(errorMessage);
      }
    });
  }

  private updateOrganization() {
    // Solo enviar los campos que se pueden actualizar
    const organizationData: any = {
      organizationName: this.editableOrganization!.organizationName.trim(),
      legalRepresentative: this.editableOrganization!.legalRepresentative.trim(),
      address: this.editableOrganization!.address.trim(),
      phone: this.editableOrganization!.phone.trim(),
      logo: this.editableOrganization!.logo
    };

    this.organizationApi.updateOrganization(this.selectedOrganization!.organizationId, organizationData).subscribe({
      next: (updatedOrg) => {
        if (updatedOrg) {
          this.selectedOrganization = updatedOrg;
          this.loadOrganizations();
          this.resetEditMode();
          alert('¡Organización actualizada correctamente!');
          console.log("Organización actualizada:", updatedOrg);
        } else {
          alert('Error al actualizar la organización');
        }
      },
      error: (error) => {
        console.error('Error updating organization:', error);
        const errorMessage = this.getOrganizationErrorMessage(error, 'actualizar');
        alert(errorMessage);
      }
    });
  }

  private getOrganizationErrorMessage(error: any, action: string): string {
    if (error.status === 500) {
      return 'Error interno del servidor. Por favor, contacte al administrador.';
    } else if (error.status === 401) {
      return 'No tiene permisos para crear organizaciones.';
    } else if (error.status === 400) {
      return 'Datos inválidos. Verifique la información ingresada.';
    } else if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else if (error.error?.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else {
      return `Error desconocido al ${action} la organización. Por favor intente nuevamente.`;
    }
  }

  private resetEditMode() {
    this.isEditMode = false;
    this.editableOrganization = null;
    this.selectedFile = null;
    this.logoPreview = null;
  }

  viewDetails(organization: Organization) {
    this.selectedOrganization = organization;
    this.showDetailPanel = true;
    this.isEditMode = false;
    this.editableOrganization = null;
  }

  closeDetailPanel() {
    this.showDetailPanel = false;
    this.selectedOrganization = null;
    this.isEditMode = false;
    this.editableOrganization = null;
    this.selectedFile = null;
    this.logoPreview = null;
  }

  editItem(item: Organization) {
    this.isEditMode = true;
    this.editableOrganization = { ...item };
    // Limpiar errores de validación
    this.organizationValidationErrors = {};
    this.selectedFile = null;
    this.logoPreview = item.logo;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.editableOrganization = null;
    // Limpiar errores de validación
    this.organizationValidationErrors = {};
    this.selectedFile = null;
    this.logoPreview = null;
  }

  deleteItem(item: Organization) {
    if (confirm("¿Estás seguro de que quieres eliminar esta organización?")) {
      const index = this.organizations.findIndex(o => o.organizationId === item.organizationId);
      if (index > -1) {
        this.organizations.splice(index, 1);
        this.applyFilters();
        alert('¡Organización eliminada exitosamente!');
      } else {
        alert('Error al eliminar la organización');
      }
    }
  }

  toggleItemStatus(_item: Organization) {
    this.applyFilters();
  }

  // ===============================
  // Search and Filter
  // ===============================

  onSearch() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let data: Organization[] = [...this.organizations];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter((org: Organization) =>
        org.organizationName?.toLowerCase().includes(term) ||
        org.organizationCode?.toLowerCase().includes(term) ||
        org.address?.toLowerCase().includes(term) ||
        org.legalRepresentative?.toLowerCase().includes(term) ||
        org.phone?.toLowerCase().includes(term) ||
        org.zones?.some(zone =>
          zone.zoneName?.toLowerCase().includes(term) ||
          zone.zoneCode?.toLowerCase().includes(term) ||
          zone.description?.toLowerCase().includes(term) ||
          zone.streets?.some(street =>
            street.streetName?.toLowerCase().includes(term) ||
            street.streetCode?.toLowerCase().includes(term)
          )
        )
      );
    }

    if (this.statusFilter !== "all") {
      data = data.filter((org: Organization) => org.status === this.statusFilter);
    }

    this.filteredOrganizations = data;
    this.updatePagination();
  }

  // ===============================
  // Pagination
  // ===============================

  updatePagination() {
    const data = this.filteredOrganizations;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedOrganizations = data.slice(startIndex, endIndex);
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

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  // ===============================
  // UI Helpers
  // ===============================

  getStatusBadgeClass(status: string | undefined): string {
    if (!status) return "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800";
    return status === 'ACTIVE'
      ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
      : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800";
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return "Sin estado";
    return status === 'ACTIVE' ? "Activo" : "Inactivo";
  }

  trackByItemId(_index: number, item: Organization): string {
    return item.organizationId;
  }

  // ===============================
  // Expand/Collapse
  // ===============================

  toggleOrganization(organizationId: string) {
    if (this.expandedOrganizations.has(organizationId)) {
      this.expandedOrganizations.delete(organizationId);
      const org = this.organizations.find(org => org.organizationId === organizationId);
      if (org?.zones) {
        org.zones.forEach(zone => {
          this.expandedZones.delete(zone.zoneId);
        });
      }
    } else {
      this.expandedOrganizations.add(organizationId);
    }
  }

  toggleZone(zoneId: string) {
    if (this.expandedZones.has(zoneId)) {
      this.expandedZones.delete(zoneId);
    } else {
      this.expandedZones.add(zoneId);
    }
  }

  isOrganizationExpanded(organizationId: string): boolean {
    return this.expandedOrganizations.has(organizationId);
  }

  isZoneExpanded(zoneId: string): boolean {
    return this.expandedZones.has(zoneId);
  }

  getStreetTypeIcon(streetType: string): string {
    switch (streetType) {
      case 'Avenida': return '🛣️';
      case 'Jirón': return '🏘️';
      case 'Pasaje': return '🚶';
      case 'Calle':
      default: return '🏠';
    }
  }

  // ===============================
  // Zone Management
  // ===============================

  addNewZone() {
    if (!this.selectedOrganization) {
      console.warn('❌ No hay organización seleccionada');
      return;
    }

    if (this.selectedOrganization.organizationId.startsWith('temp-')) {
      alert('Debe guardar primero los datos básicos de la organización antes de poder agregar zonas.');
      return;
    }

    const existingEditingZone = this.selectedOrganization.zones?.find(z => z.isEditing);
    if (existingEditingZone) {
      alert('Ya hay una zona en modo edición. Complete o cancele la edición antes de agregar una nueva.');
      return;
    }

    const newZone: any = {
      zoneId: 'temp-zone-' + Date.now(),
      organizationId: this.selectedOrganization.organizationId,
      zoneName: '',
      description: '',
      status: 'ACTIVE' as const,
      streets: [],
      isEditing: true
    };

    if (!this.selectedOrganization.zones) {
      this.selectedOrganization.zones = [];
    }
    this.selectedOrganization.zones.push(newZone);

    console.log("✅ Nueva zona agregada:", newZone);
    console.log("📊 Total zonas en organización:", this.selectedOrganization.zones.length);

    setTimeout(() => {
      const zoneElements = document.querySelectorAll('[id^="zone-"]');
      if (zoneElements.length > 0) {
        const lastZoneElement = zoneElements[zoneElements.length - 1];
        lastZoneElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  editZone(zone: any) {
    zone.isEditing = true;
    zone.originalData = { ...zone };
    // Limpiar errores de validación
    zone.validationErrors = {};
  }

  saveZone(zone: any) {
    if (!zone.zoneName?.trim()) {
      alert('El nombre de la zona es requerido');
      return;
    }

    this.savingZone = true;
    const isNewZone = zone.zoneId.startsWith('temp-');

    if (isNewZone) {
      this.createZone(zone);
    } else {
      this.updateZone(zone);
    }
  }

  private createZone(zone: any) {
    const zoneRequest: ZoneCreateRequest = {
      organizationId: this.selectedOrganization?.organizationId || zone.organizationId,
      zoneName: zone.zoneName.trim(),
      description: zone.description?.trim() || ''
    };

    console.log('🔵 [CREATE ZONE] Enviando solicitud:', zoneRequest);

    this.organizationApi.createZone(zoneRequest).subscribe({
      next: (createdZone) => {
        this.savingZone = false;
        console.log('✅ [CREATE ZONE] Zona creada exitosamente:', createdZone);

        // Actualizar la zona con los datos reales del backend
        if (createdZone && createdZone.zoneId) {
          zone.zoneId = createdZone.zoneId;
          zone.zoneCode = createdZone.zoneCode;
        }

        zone.isEditing = false;
        delete zone.originalData;

        // Recargar la organización completa para obtener datos actualizados
        this.loadOrganizations();

        alert('¡Zona creada exitosamente!');
      },
      error: (error) => {
        this.savingZone = false;
        console.error('❌ [CREATE ZONE] Error:', error);
        const errorMessage = this.getZoneErrorMessage(error, 'crear');
        alert(errorMessage);
      }
    });
  }


  private updateZone(zone: any) {
    const zoneRequest = {
      organizationId: this.selectedOrganization?.organizationId || zone.organizationId,
      zoneName: zone.zoneName.trim(),
      description: zone.description?.trim() || ''
    };

    // Check for empty values
    if (!zone.zoneId) {
      console.warn('⚠️ [UPDATE ZONE] Warning: Zone ID is empty or undefined');
    }
    if (!zoneRequest.organizationId) {
      console.warn('⚠️ [UPDATE ZONE] Warning: Organization ID is empty or undefined');
    }
    if (!zoneRequest.zoneName) {
      console.warn('⚠️ [UPDATE ZONE] Warning: Zone name is empty');
    }

    this.organizationApi.updateZone(zone.zoneId, zoneRequest).subscribe({
      next: (updatedZone) => {
        this.savingZone = false;
        if (updatedZone) {
          console.log('✅ [UPDATE ZONE] Success response received:', updatedZone);
          console.log('📋 Updated zone data type:', typeof updatedZone);
          console.log('📄 Updated zone properties:', updatedZone ? Object.keys(updatedZone) : 'null');

          zone.isEditing = false;
          delete zone.originalData;
          console.log("Zona actualizada exitosamente:", updatedZone);
          alert('¡Zona actualizada exitosamente!');
        } else {
          console.warn('⚠️ [UPDATE ZONE] Server returned success but no zone data');
          alert('Error al actualizar la zona');
        }
      },
      error: (error) => {
        this.savingZone = false;
        console.error('❌ [UPDATE ZONE] Error occurred:', error);
        console.error('🔍 [UPDATE ZONE] Error details:');
        console.error('   - Status:', error?.status);
        console.error('   - Message:', error?.message);
        console.error('   - Error object:', error?.error);

        const errorMessage = this.getZoneErrorMessage(error, 'actualizar');
        alert(errorMessage);
      }
    });
  }

  private getZoneErrorMessage(error: any, action: string): string {
    if (error.status === 0) {
      return '🚫 Error CORS: Problema de configuración del servidor\n\n' +
        'El servidor tiene múltiples valores en Access-Control-Allow-Origin.\n' +
        'Contacte al administrador del sistema.\n\n' +
        'Detalles técnicos: ' + (error.message || 'Network error');
    } else if (error.status === 400) {
      return 'Error de validación: ' + (error.error?.message || error.error?.error || 'Verifique los datos ingresados');
    } else if (error.status === 409) {
      return 'Ya existe una zona con ese nombre en esta organización';
    } else if (error.status === 500) {
      return 'Error interno del servidor. Por favor intente nuevamente.';
    } else if (!error.status) {
      return 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else {
      return `Error al ${action} la zona: ` + (error.error?.message || error.message || 'Error desconocido');
    }
  }

  cancelZoneEdit(zone: any) {
    if (zone.originalData) {
      Object.assign(zone, zone.originalData);
      delete zone.originalData;
    }
    zone.isEditing = false;
  }

  deleteZone(zone: any) {
    if (confirm("¿Estás seguro de que quieres eliminar esta zona?")) {
      if (zone.zoneId.startsWith('temp-')) {
        this.removeZoneFromUI(zone);
        return;
      }

      this.organizationApi.deleteZone(zone.zoneId).subscribe({
        next: (success) => {
          if (success) {
            console.log("Zona eliminada exitosamente");
            this.removeZoneFromUI(zone);
            this.loadOrganizations();
            alert('¡Zona eliminada exitosamente!');
          } else {
            alert('Error al eliminar la zona. Es posible que tenga calles asociadas.');
          }
        },
        error: (error) => {
          console.error('Error deleting zone:', error);
          const errorMessage = this.getZoneErrorMessage(error, 'eliminar');
          alert(errorMessage);
        }
      });
    }
  }

  private removeZoneFromUI(zone: any) {
    if (this.selectedOrganization?.zones) {
      const index = this.selectedOrganization.zones.findIndex(z => z.zoneId === zone.zoneId);
      if (index > -1) {
        this.selectedOrganization.zones.splice(index, 1);
        console.log("✅ Zona removida de la UI");
        console.log("📊 Total zonas restantes:", this.selectedOrganization.zones.length);
      }
    }
  }

  // ===============================
  // Street Management
  // ===============================

  addNewStreet(zone: any) {
    if (!zone) {
      console.warn('❌ No hay zona especificada');
      return;
    }

    const existingEditingStreet = zone.streets?.find((s: any) => s.isEditing);
    if (existingEditingStreet) {
      alert('Ya hay una calle en modo edición en esta zona. Complete o cancele la edición antes de agregar una nueva.');
      return;
    }

    const newStreet: any = {
      streetId: 'temp-street-' + Date.now(),
      zoneId: zone.zoneId,
      streetName: '',
      streetType: 'Calle' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      isEditing: true
    };

    if (!zone.streets) {
      zone.streets = [];
    }
    zone.streets.push(newStreet);

    console.log("Nueva calle agregada con isEditing:", newStreet.isEditing, newStreet);
  }

  editStreet(street: any) {
    street.isEditing = true;
    street.originalData = { ...street };
    // Limpiar errores de validación
    street.validationErrors = {};
  }

  saveStreet(street: any) {
    if (!street.streetName?.trim()) {
      alert('El nombre de la calle es requerido');
      return;
    }

    this.savingStreet = true;
    const isNewStreet = street.streetId.startsWith('temp-');

    if (isNewStreet) {
      this.createStreet(street);
    } else {
      this.updateStreet(street);
    }
  }

  private createStreet(street: any) {
    // Validar que el zoneId no sea temporal
    if (street.zoneId.startsWith('temp-')) {
      alert('Debe guardar la zona primero antes de agregar calles.');
      this.savingStreet = false;
      return;
    }

    const streetRequest: CreateStreetRequest = {
      zoneId: street.zoneId,
      streetName: street.streetName.trim(),
      streetType: street.streetType
    };

    console.log('🔵 [CREATE STREET] Enviando solicitud:', streetRequest);

    this.organizationApi.createStreet(streetRequest).subscribe({
      next: (createdStreet) => {
        this.savingStreet = false;
        if (createdStreet) {
          console.log('✅ [CREATE STREET] Calle creada exitosamente:', createdStreet);

          // Actualizar la calle con los datos reales del backend
          street.streetId = createdStreet.streetId;
          street.streetCode = createdStreet.streetCode;
          street.createdAt = createdStreet.createdAt;
          street.isEditing = false;
          delete street.originalData;

          // Recargar la organización completa para obtener datos actualizados
          this.loadOrganizations();

          alert('¡Calle creada exitosamente!');
        } else {
          alert('Error al crear la calle');
        }
      },
      error: (error) => {
        this.savingStreet = false;
        console.error('❌ [CREATE STREET] Error:', error);
        const errorMessage = this.getStreetErrorMessage(error, 'crear');
        alert(errorMessage);
      }
    });
  }

  private updateStreet(street: any) {
    const streetRequest = {
      zoneId: street.zoneId,
      streetName: street.streetName,
      streetType: street.streetType
    };

    this.organizationApi.updateStreet(street.streetId, streetRequest).subscribe({
      next: (updatedStreet) => {
        this.savingStreet = false;
        if (updatedStreet) {
          street.isEditing = false;
          delete street.originalData;
          console.log("Calle actualizada exitosamente:", updatedStreet);
          alert('¡Calle actualizada exitosamente!');
        } else {
          alert('Error al actualizar la calle');
        }
      },
      error: (error) => {
        this.savingStreet = false;
        console.error('Error updating street:', error);
        const errorMessage = this.getStreetErrorMessage(error, 'actualizar');
        alert(errorMessage);
      }
    });
  }

  private getStreetErrorMessage(error: any, action: string): string {
    if (error.status === 0) {
      return '🚫 Error CORS: Problema de configuración del servidor\n\n' +
        'El servidor tiene múltiples valores en Access-Control-Allow-Origin.\n' +
        'Contacte al administrador del sistema.\n\n' +
        'Detalles técnicos: ' + (error.message || 'Network error');
    } else if (error.status === 400) {
      return 'Error de validación: ' + (error.error?.message || error.error?.error || 'Verifique los datos ingresados');
    } else if (error.status === 409) {
      return 'Ya existe una calle con ese nombre en esta zona';
    } else if (error.status === 500) {
      return 'Error interno del servidor. Por favor intente nuevamente.';
    } else if (!error.status) {
      return 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else {
      return `Error al ${action} la calle: ` + (error.error?.message || error.message || 'Error desconocido');
    }
  }

  cancelStreetEdit(street: any) {
    if (street.originalData) {
      Object.assign(street, street.originalData);
      delete street.originalData;
    }
    street.isEditing = false;
  }

  deleteStreet(street: any) {
    if (confirm("¿Estás seguro de que quieres eliminar esta calle?")) {
      if (street.streetId.startsWith('temp-')) {
        this.removeStreetFromUI(street);
        return;
      }

      this.organizationApi.deleteStreet(street.streetId).subscribe({
        next: (success) => {
          if (success) {
            console.log("Calle eliminada exitosamente");
            this.removeStreetFromUI(street);
            this.loadOrganizations();
            alert('¡Calle eliminada exitosamente!');
          } else {
            alert('Error al eliminar la calle. Es posible que tenga datos asociados.');
          }
        },
        error: (error) => {
          console.error('Error deleting street:', error);
          const errorMessage = this.getStreetErrorMessage(error, 'eliminar');
          alert(errorMessage);
        }
      });
    }
  }

  private removeStreetFromUI(street: any) {
    if (this.selectedOrganization?.zones) {
      for (const zone of this.selectedOrganization.zones) {
        if (zone.streets) {
          const index = zone.streets.findIndex(s => s.streetId === street.streetId);
          if (index > -1) {
            zone.streets.splice(index, 1);
            break;
          }
        }
      }
    }

    if (!this.selectedOrganization?.organizationId.startsWith('temp-')) {
      const orgIndex = this.organizations.findIndex(org => org.organizationId === this.selectedOrganization!.organizationId);
      if (orgIndex > -1 && this.organizations[orgIndex].zones) {
        for (const zone of this.organizations[orgIndex].zones) {
          if (zone.streets) {
            const streetIndex = zone.streets.findIndex(s => s.streetId === street.streetId);
            if (streetIndex > -1) {
              zone.streets.splice(streetIndex, 1);
              break;
            }
          }
        }
      }
    }
  }

  // ===============================
  // Statistics
  // ===============================

  getTotalZones(): number {
    return this.organizations.reduce((total, org) => total + (org.zones?.length || 0), 0);
  }

  getTotalStreets(org: Organization): number {
    if (!org.zones) return 0;
    return org.zones.reduce((total, zone) => total + (zone.streets?.length || 0), 0);
  }

  getActiveOrganizations(): number {
    return this.organizations.filter(org => org.status === 'ACTIVE').length;
  }

  getInactiveOrganizations(): number {
    return this.organizations.filter(org => org.status === 'INACTIVE').length;
  }

  // ===============================
  // Image Management
  // ===============================

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;
    this.isUploading = true;
    this.showLogoUpload = false;

    // Calcular tamaño original
    this.originalImageSize = this.formatFileSize(file.size);

    try {
      console.log('📁 Procesando imagen desde archivo local...');
      console.log(`📊 Tamaño original: ${this.originalImageSize}`);

      const result = await this.imageUploadService.processImageFile(file);

      if (result.success && result.imageData) {
        console.log('📤 Optimizando imagen para el backend...');

        // Calcular tamaño de la imagen procesada
        const processedSize = this.getImageSize(result.imageData);
        console.log(`📊 Tamaño después del procesamiento: ${processedSize}`);

        try {
          // Comprimir para backend manteniendo calidad decente
          const backendOptimized = await this.compressImageForBackend(result.imageData);

          // Calcular tamaño final optimizado
          this.compressedImageSize = this.getImageSize(backendOptimized);

          console.log('📊 Análisis de compresión:');
          console.log(`   • Original: ${this.originalImageSize}`);
          console.log(`   • Procesado: ${processedSize}`);
          console.log(`   • Comprimido final: ${this.compressedImageSize}`);

          // Crear vista previa de alta calidad para la UI
          this.logoPreview = await this.imageUploadService.createHighQualityPreview(file);

          if (this.editableOrganization) {
            this.editableOrganization.logo = backendOptimized;
          }

          console.log('✅ Imagen optimizada exitosamente');
          console.log(`📤 Enviando al backend: ${this.compressedImageSize}`);

          // Mostrar advertencia si es muy grande
          const compressedBytes = (backendOptimized.length * 3) / 4;
          if (compressedBytes > 200 * 1024) { // 200KB (más realista)
            console.warn(`⚠️ Imagen grande: ${this.compressedImageSize} - Podría afectar el rendimiento`);
          }

        } catch (error) {
          console.error('❌ Error en compresión:', error);
          if (this.editableOrganization) {
            this.editableOrganization.logo = result.imageData;
          }
          this.compressedImageSize = processedSize;
          console.log('🔄 Usando imagen sin compresión adicional');
        }

        const fileInfo = this.imageUploadService.getFileInfo(file);
        console.log('📊 Información del archivo:', fileInfo);

      } else {
        console.error('❌ Error procesando imagen:', result.error);
        alert(`❌ Error al procesar la imagen:

${result.error}

💡 Intenta con otra imagen o verifica el formato.`);
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      alert('❌ Error inesperado procesando la imagen');
    } finally {
      this.isUploading = false;
      event.target.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fakeEvent = {
      target: {
        files: [file],
        value: ''
      }
    };

    await this.onFileSelected(fakeEvent);
  }

  onLogoUrlChange(): void {
    if (this.editableOrganization?.logo) {
      const logoData = this.editableOrganization.logo.trim();

      if (logoData) {
        if (logoData.startsWith('data:image/')) {
          console.log('🖼️ Detectada imagen base64, estableciendo vista previa');
          this.logoPreview = logoData;

          this.imageUploadService.createPreviewFromBase64(logoData).then(result => {
            if (result.valid) {
              console.log('✅ Imagen base64 válida:', `${result.width}x${result.height}`);
            } else {
              console.warn('⚠️ Imagen base64 no válida');
              this.logoPreview = null;
            }
          });
        } else {
          console.log('🔗 Detectada URL, intentando vista previa:', logoData);
          this.logoPreview = logoData;
        }
      } else {
        this.logoPreview = null;
      }
    } else {
      this.logoPreview = null;
    }
  }

  getLogoRequirements() {
    return this.imageUploadService.getLogoRequirements();
  }

  clearLogo() {
    if (this.editableOrganization) {
      this.editableOrganization.logo = null;
    }
    this.selectedFile = null;
    this.logoPreview = null;
    console.log('🗑️ Logo limpiado');
  }

  forcePreview() {
    if (this.editableOrganization?.logo) {
      console.log('🔄 Forzando vista previa para:', this.editableOrganization.logo.substring(0, 50) + '...');
      this.logoPreview = this.editableOrganization.logo;
    }
  }



  getNextOrganizationCode(): string {
    if (this.organizations.length === 0) {
      return 'ORG001';
    }

    const codes = this.organizations
      .map((org: any) => org.organizationCode)
      .filter((code: any) => code && code.startsWith('ORG'))
      .map((code: any) => {
        const numPart = code.replace('ORG', '');
        return parseInt(numPart, 10);
      })
      .filter((num: any) => !isNaN(num))
      .sort((a: any, b: any) => b - a);

    const nextNumber = codes.length > 0 ? codes[0] + 1 : 1;
    return `ORG${nextNumber.toString().padStart(3, '0')}`;
  }

  async compressImageForBackend(base64Image: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(base64Image);
          return;
        }

        // Calcular dimensiones manteniendo proporción y calidad decente
        let { width, height } = img;
        const maxSize = 200; // Tamaño máximo más razonable

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Configurar para mejor calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar con mejor calidad
        ctx.drawImage(img, 0, 0, width, height);

        // Usar calidad decente para el backend
        const compressed = canvas.toDataURL('image/jpeg', 0.7);

        console.log('🔧 Imagen optimizada:', {
          originalSize: `${img.width}x${img.height}`,
          newSize: `${width}x${height}`,
          originalLength: base64Image.length,
          newLength: compressed.length,
          reduction: `${((1 - compressed.length / base64Image.length) * 100).toFixed(1)}%`
        });

        resolve(compressed);
      };

      img.onerror = () => {
        console.warn('⚠️ Error al procesar imagen, usando original');
        resolve(base64Image);
      };

      img.src = base64Image;
    });
  }

  // ===============================
  // Menu Management
  // ===============================

  toggleZoneMenu(zone: any) {
    // Cerrar todos los otros menús
    this.closeAllMenus();
    // Toggle del menú actual
    zone.showMenu = !zone.showMenu;
  }

  toggleStreetMenu(street: any) {
    // Cerrar todos los otros menús
    this.closeAllMenus();
    // Toggle del menú actual
    street.showMenu = !street.showMenu;
  }

  private closeAllMenus() {
    // Cerrar menús de zonas
    if (this.selectedOrganization?.zones) {
      this.selectedOrganization.zones.forEach((zone: any) => {
        zone.showMenu = false;
        // Cerrar menús de calles
        if (zone.streets) {
          zone.streets.forEach((street: any) => {
            street.showMenu = false;
          });
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Cerrar todos los menús cuando se hace clic fuera de ellos
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closeAllMenus();
    }
  }

  // ===============================
  // Validation Functions
  // ===============================

  validateOrganizationField(fieldName: string, value: any) {
    if (!this.organizationValidationErrors) {
      this.organizationValidationErrors = {};
    }

    switch (fieldName) {
      case 'organizationName':
        if (!value || value.trim().length === 0) {
          this.organizationValidationErrors.organizationName = 'El nombre de la organización es requerido';
        } else if (value.trim().length < 3) {
          this.organizationValidationErrors.organizationName = 'El nombre debe tener al menos 3 caracteres';
        } else if (value.trim().length > 100) {
          this.organizationValidationErrors.organizationName = 'El nombre no puede exceder 100 caracteres';
        } else {
          delete this.organizationValidationErrors.organizationName;
        }
        break;

      case 'legalRepresentative':
        if (!value || value.trim().length === 0) {
          this.organizationValidationErrors.legalRepresentative = 'El representante legal es requerido';
        } else if (value.trim().length < 3) {
          this.organizationValidationErrors.legalRepresentative = 'El nombre debe tener al menos 3 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) {
          this.organizationValidationErrors.legalRepresentative = 'Solo se permiten letras y espacios';
        } else {
          delete this.organizationValidationErrors.legalRepresentative;
        }
        break;

      case 'phone':
        if (!value || value.trim().length === 0) {
          this.organizationValidationErrors.phone = 'El teléfono es requerido';
        } else if (!/^[0-9]{9}$/.test(value.trim())) {
          this.organizationValidationErrors.phone = 'El teléfono debe tener exactamente 9 dígitos';
        } else {
          delete this.organizationValidationErrors.phone;
        }
        break;

      case 'address':
        if (!value || value.trim().length === 0) {
          this.organizationValidationErrors.address = 'La dirección es requerida';
        } else if (value.trim().length < 10) {
          this.organizationValidationErrors.address = 'La dirección debe tener al menos 10 caracteres';
        } else if (value.trim().length > 200) {
          this.organizationValidationErrors.address = 'La dirección no puede exceder 200 caracteres';
        } else {
          delete this.organizationValidationErrors.address;
        }
        break;
    }
  }

  validateZoneField(zone: any, fieldName: string, value: any) {
    if (!zone.validationErrors) {
      zone.validationErrors = {};
    }

    switch (fieldName) {
      case 'zoneName':
        if (!value || value.trim().length === 0) {
          zone.validationErrors.zoneName = 'El nombre de la zona es requerido';
        } else if (value.trim().length < 2) {
          zone.validationErrors.zoneName = 'El nombre debe tener al menos 2 caracteres';
        } else if (value.trim().length > 50) {
          zone.validationErrors.zoneName = 'El nombre no puede exceder 50 caracteres';
        } else {
          delete zone.validationErrors.zoneName;
        }
        break;

      case 'description':
        if (value && value.trim().length > 200) {
          zone.validationErrors.description = 'La descripción no puede exceder 200 caracteres';
        } else {
          delete zone.validationErrors.description;
        }
        break;
    }
  }

  validateStreetField(street: any, fieldName: string, value: any) {
    if (!street.validationErrors) {
      street.validationErrors = {};
    }

    switch (fieldName) {
      case 'streetType':
        if (!value || value.trim().length === 0) {
          street.validationErrors.streetType = 'El tipo de calle es requerido';
        } else {
          delete street.validationErrors.streetType;
        }
        break;

      case 'streetName':
        if (!value || value.trim().length === 0) {
          street.validationErrors.streetName = 'El nombre de la calle es requerido';
        } else if (value.trim().length < 2) {
          street.validationErrors.streetName = 'El nombre debe tener al menos 2 caracteres';
        } else if (value.trim().length > 100) {
          street.validationErrors.streetName = 'El nombre no puede exceder 100 caracteres';
        } else {
          delete street.validationErrors.streetName;
        }
        break;
    }
  }

  isOrganizationValid(): boolean {
    if (!this.editableOrganization) return false;

    // Validar todos los campos
    this.validateOrganizationField('organizationName', this.editableOrganization.organizationName);
    this.validateOrganizationField('legalRepresentative', this.editableOrganization.legalRepresentative);
    this.validateOrganizationField('phone', this.editableOrganization.phone);
    this.validateOrganizationField('address', this.editableOrganization.address);

    // Verificar si hay errores
    return Object.keys(this.organizationValidationErrors).length === 0;
  }

  isZoneValid(zone: any): boolean {
    if (!zone) return false;

    // Validar todos los campos
    this.validateZoneField(zone, 'zoneName', zone.zoneName);
    this.validateZoneField(zone, 'description', zone.description);

    // Verificar si hay errores
    return !zone.validationErrors || Object.keys(zone.validationErrors).length === 0;
  }

  isStreetValid(street: any): boolean {
    if (!street) return false;

    // Validar todos los campos
    this.validateStreetField(street, 'streetType', street.streetType);
    this.validateStreetField(street, 'streetName', street.streetName);

    // Verificar si hay errores
    return !street.validationErrors || Object.keys(street.validationErrors).length === 0;
  }

  getFieldValidationClass(fieldName: string, validationErrors: any): string {
    if (!validationErrors || !validationErrors[fieldName]) {
      return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    }
    return 'border-red-300 focus:border-red-500 focus:ring-red-500';
  }

  // ===============================
  // Street Type Helpers
  // ===============================

  getStreetTypeClass(streetType: string): string {
    const classes = {
      'Calle': 'bg-blue-500',
      'Avenida': 'bg-green-500',
      'Jirón': 'bg-purple-500',
      'Pasaje': 'bg-orange-500',
      'Alameda': 'bg-teal-500',
      'Boulevard': 'bg-indigo-500'
    };
    return classes[streetType as keyof typeof classes] || 'bg-gray-500';
  }

  getStreetTypeBadgeClass(streetType: string): string {
    const classes = {
      'Calle': 'bg-blue-100 text-blue-800',
      'Avenida': 'bg-green-100 text-green-800',
      'Jirón': 'bg-purple-100 text-purple-800',
      'Pasaje': 'bg-orange-100 text-orange-800',
      'Alameda': 'bg-teal-100 text-teal-800',
      'Boulevard': 'bg-indigo-100 text-indigo-800'
    };
    return classes[streetType as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStreetTypeIconPath(streetType: string): string {
    const paths = {
      'Calle': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7',
      'Avenida': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'Jirón': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      'Pasaje': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z',
      'Alameda': 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
      'Boulevard': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    };
    return paths[streetType as keyof typeof paths] || 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7';
  }

  // ===============================
  // Logo Management Functions
  // ===============================

  changeLogoMode() {
    this.showLogoUpload = true;
  }

  cancelLogoChange() {
    this.showLogoUpload = false;
  }

  removeLogo() {
    if (this.editableOrganization) {
      this.editableOrganization.logo = null;
    }
    this.logoPreview = null;
    this.selectedFile = null;
    this.showLogoUpload = false;
    console.log('🗑️ Logo eliminado');
  }

  getImageSize(base64String: string): string {
    if (!base64String) return '0 KB';

    // Calcular el tamaño aproximado del base64
    const sizeInBytes = (base64String.length * 3) / 4;

    if (sizeInBytes < 1024) {
      return `${Math.round(sizeInBytes)} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} KB`;
    } else {
      return `${Math.round(sizeInBytes / (1024 * 1024))} MB`;
    }
  }

  getTotalStreetsForOrg(org: any): number {
    if (!org.zones) return 0;
    return org.zones.reduce((total: number, zone: any) => total + (zone.streets?.length || 0), 0);
  }

  getFormattedDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // ===============================
  // Report Generation
  // ===============================

  /**
   * Genera reporte PDF de organizaciones
   */
  async generateOrganizationReport() {
    if (this.filteredOrganizations.length === 0) {
      alert('No hay organizaciones para generar el reporte');
      return;
    }

    try {
      // Obtener el logo de la primera organización o usar un logo por defecto
      const firstOrg = this.filteredOrganizations[0];
      await this.reportService.generateOrganizationReport(
        this.filteredOrganizations,
        'JASS - Sistema de Gestión',
        firstOrg?.logo || undefined,
        firstOrg?.phone || undefined
      );
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor intente nuevamente.');
    }
  }

  /**
   * Genera reporte rápido de zonas desde la tabla (sin abrir panel de detalles)
   */
  async generateQuickZonesReport(org: Organization) {
    if (!org.zones || org.zones.length === 0) {
      alert('Esta organización no tiene zonas registradas');
      return;
    }

    try {
      await this.reportService.generateZonesReport(
        org,
        'JASS - Sistema de Gestión',
        org.logo || undefined,
        org.phone || undefined
      );
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor intente nuevamente.');
    }
  }

  /**
   * Genera reporte rápido de administradores desde la tabla (sin abrir panel de detalles)
   */
  async generateQuickAdminsReport(org: Organization) {
    // Cargar administradores de esta organización
    this.isLoading = true;

    this.organizationApi.getOrganizationsWithAdmins().subscribe({
      next: async (orgsWithAdmins) => {
        this.isLoading = false;

        // Buscar la organización específica con sus administradores
        const orgWithAdmins = orgsWithAdmins.find(o => o.organizationId === org.organizationId);

        if (!orgWithAdmins || !orgWithAdmins.admins || orgWithAdmins.admins.length === 0) {
          alert('Esta organización no tiene administradores registrados');
          return;
        }

        try {
          await this.reportService.generateAdminsReport(
            orgWithAdmins,
            'JASS - Sistema de Gestión',
            orgWithAdmins.logo || undefined,
            orgWithAdmins.phone || undefined
          );
        } catch (error) {
          console.error('Error generando reporte:', error);
          alert('Error al generar el reporte. Por favor intente nuevamente.');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error cargando administradores:', error);
        alert('Error al cargar los datos de administradores');
      }
    });
  }

  /**
   * Genera reporte PDF de zonas y calles de la organización seleccionada
   */
  async generateZonesReportForOrganization() {
    if (!this.selectedOrganization) {
      alert('No hay organización seleccionada');
      return;
    }

    if (!this.selectedOrganization.zones || this.selectedOrganization.zones.length === 0) {
      alert('Esta organización no tiene zonas registradas');
      return;
    }

    try {
      await this.reportService.generateZonesReport(
        this.selectedOrganization,
        'JASS - Sistema de Gestión',
        this.selectedOrganization.logo || undefined,
        this.selectedOrganization.phone || undefined
      );
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor intente nuevamente.');
    }
  }

  /**
   * Genera reporte PDF de administradores de la organización seleccionada
   */
  async generateAdminsReportForOrganization() {
    if (!this.selectedOrganization) {
      alert('No hay organización seleccionada');
      return;
    }

    // Primero necesitamos cargar los administradores de esta organización
    this.isLoading = true;

    this.organizationApi.getOrganizationById(this.selectedOrganization.organizationId).subscribe({
      next: async (orgWithAdmins) => {
        this.isLoading = false;

        if (!orgWithAdmins || !orgWithAdmins.admins || orgWithAdmins.admins.length === 0) {
          alert('Esta organización no tiene administradores registrados');
          return;
        }

        try {
          await this.reportService.generateAdminsReport(
            orgWithAdmins,
            'JASS - Sistema de Gestión',
            orgWithAdmins.logo || undefined,
            orgWithAdmins.phone || undefined
          );
        } catch (error) {
          console.error('Error generando reporte:', error);
          alert('Error al generar el reporte. Por favor intente nuevamente.');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error cargando administradores:', error);
        alert('Error al cargar los datos de administradores');
      }
    });
  }
}
