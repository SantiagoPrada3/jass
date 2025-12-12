import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Breadcrumb, BreadcrumbItem } from "../../../../shared/components/ui/breadcrumb/breadcrumb";
import { Organization, Admin, AdminCreationResponse } from "../../models/organization.model";
import { OrganizationApi } from "../../services/organization-api";
import { OrganizationReportService } from "../../services/organization-report.service";
import { CreateAdminModal } from "./create-admin-modal/create-admin-modal";

@Component({
  selector: "app-organization-admins",
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb, CreateAdminModal],
  templateUrl: "./organization-admins.html",
  styleUrl: "./organization-admins.css"
})
export class OrganizationAdmins implements OnInit {

  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Inicio Global",
      url: "/super-admin/dashboard",
      icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    {
      label: "Administradores",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    }
  ];

  organizations: Organization[] = [];
  filteredOrganizations: Organization[] = [];
  paginatedOrganizations: Organization[] = [];

  searchTerm: string = "";
  statusFilter: string = "all";

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  isLoading: boolean = false;

  // State for expanded items
  expandedOrganizations: Set<string> = new Set();

  // Modal states
  showCreateAdminModal: boolean = false;
  selectedOrganizationId: string | null = null;

  // Edit admin states
  isEditMode: boolean = false;
  adminToEdit: Admin | null = null;

  // Admin Management Modal properties
  showAdminManagementModal: boolean = false;
  selectedOrganizationForManagement: Organization | null = null;
  filteredAdmins: Admin[] = [];
  adminSearchTerm: string = '';
  adminStatusFilter: string = 'all';

  // Admin management states
  savingAdmin: boolean = false;

  Math = Math;

  constructor(
    private organizationApi: OrganizationApi,
    private reportService: OrganizationReportService
  ) { }

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.isLoading = true;
    this.organizationApi.getOrganizationsWithAdmins().subscribe(data => {
      this.organizations = data;
      this.applyFilters();
      this.isLoading = false;
    });
  }

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
        // Search in admins
        org.admins?.some(admin =>
          admin.firstName?.toLowerCase().includes(term) ||
          admin.lastName?.toLowerCase().includes(term) ||
          admin.email?.toLowerCase().includes(term) ||
          admin.documentNumber?.toLowerCase().includes(term)
        )
      );
    }

    if (this.statusFilter !== "all") {
      const status = this.statusFilter;
      data = data.filter((org: Organization) => org.status === status);
    }

    this.filteredOrganizations = data;
    this.updatePagination();
  }

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

  // Helper methods for calculations
  getTotalAdmins(): number {
    return this.organizations.reduce((total, org) => total + (org.admins?.length || 0), 0);
  }

  getActiveOrganizations(): number {
    return this.organizations.filter(org => org.status === 'ACTIVE').length;
  }

  getInactiveOrganizations(): number {
    return this.organizations.filter(org => org.status === 'INACTIVE').length;
  }

  getActiveAdmins(): number {
    return this.organizations.reduce((total, org) =>
      total + (org.admins?.filter(admin => admin.status === 'ACTIVE').length || 0), 0);
  }

  // Organization expansion methods
  toggleOrganization(organizationId: string) {
    if (this.expandedOrganizations.has(organizationId)) {
      this.expandedOrganizations.delete(organizationId);
    } else {
      this.expandedOrganizations.add(organizationId);
    }
  }

  isOrganizationExpanded(organizationId: string): boolean {
    return this.expandedOrganizations.has(organizationId);
  }

  // Admin helper methods
  getTotalAdminsByOrg(org: Organization): number {
    return org.admins?.length || 0;
  }

  getAdminInitials(admin: Admin): string {
    const firstName = admin.firstName?.charAt(0) || '';
    const lastName = admin.lastName?.charAt(0) || '';
    return (firstName + lastName).toUpperCase();
  }

  trackByAdminId(_index: number, admin: Admin): string {
    return admin.adminId;
  }

  // Admin status methods
  getAdminStatusBadgeClass(status: string | undefined): string {
    if (!status) return "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800";
    return status === 'ACTIVE'
      ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
      : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800";
  }

  getAdminStatusLabel(status: string | undefined): string {
    if (!status) return "Sin estado";
    return status === 'ACTIVE' ? "Activo" : "Inactivo";
  }

  toggleAdminStatus(admin: Admin) {
    const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Here you would call the API to update the admin status
    // For now, just update locally
    admin.status = newStatus;

    console.log(`Admin ${admin.firstName} ${admin.lastName} status changed to ${newStatus}`);
  }

  // Admin management methods
  editAdmin(admin: Admin) {
    console.log('Edit admin:', admin);
    // Implement edit functionality
  }

  deleteAdmin(admin: Admin) {
    if (confirm(`¿Estás seguro de que quieres eliminar al administrador ${admin.firstName} ${admin.lastName}?`)) {
      console.log('Delete admin:', admin);
      // Implement delete functionality
    }
  }

  // Modal methods
  openCreateAdminModal(organizationId?: string) {
    this.selectedOrganizationId = organizationId || null;

    // Clear edit mode when opening for creation
    this.isEditMode = false;
    this.adminToEdit = null;

    this.showCreateAdminModal = true;
  }

  onCloseCreateAdminModal() {
    this.showCreateAdminModal = false;
    this.selectedOrganizationId = null;

    // Clear edit mode state
    this.isEditMode = false;
    this.adminToEdit = null;
  }

  onAdminCreated(adminCreationResponse: AdminCreationResponse) {
    console.log('Admin created successfully:', adminCreationResponse);

    // Reload organizations to get updated data
    this.loadOrganizations();

    // If the management modal is open, refresh the selected organization
    if (this.showAdminManagementModal && this.selectedOrganizationForManagement) {
      // Find the updated organization
      setTimeout(() => {
        const updatedOrg = this.organizations.find(org =>
          org.organizationId === this.selectedOrganizationForManagement!.organizationId
        );
        if (updatedOrg) {
          this.selectedOrganizationForManagement = updatedOrg;
          this.filterAdmins();
        }
      }, 100);
    }

    // Close create modal
    this.onCloseCreateAdminModal();

    // Show success message
    alert(`Administrador ${adminCreationResponse.userInfo.firstName} ${adminCreationResponse.userInfo.lastName} creado exitosamente`);
  }

  onAdminUpdated(adminUpdateResponse: any) {
    console.log('Admin updated successfully:', adminUpdateResponse);

    // Reload organizations to get updated data
    this.loadOrganizations();

    // If the management modal is open, refresh the selected organization
    if (this.showAdminManagementModal && this.selectedOrganizationForManagement) {
      // Find the updated organization
      setTimeout(() => {
        const updatedOrg = this.organizations.find(org =>
          org.organizationId === this.selectedOrganizationForManagement!.organizationId
        );
        if (updatedOrg) {
          this.selectedOrganizationForManagement = updatedOrg;
          this.filterAdmins();
        }
      }, 100);
    }

    // Close edit modal
    this.onCloseCreateAdminModal();

    // Show success message
    alert(`Administrador actualizado exitosamente`);
  }

  // Open admin management modal
  openAdminManagementModal(organization: Organization) {
    this.selectedOrganizationForManagement = organization;
    this.showAdminManagementModal = true;
    this.adminSearchTerm = '';
    this.adminStatusFilter = 'all';
    this.filterAdmins();
  }

  // Close admin management modal
  closeAdminManagementModal() {
    this.showAdminManagementModal = false;
    this.selectedOrganizationForManagement = null;
    this.filteredAdmins = [];
    this.adminSearchTerm = '';
    this.adminStatusFilter = 'all';
  }

  // Filter admins in the modal
  filterAdmins() {
    if (!this.selectedOrganizationForManagement?.admins) {
      this.filteredAdmins = [];
      return;
    }

    let admins = [...this.selectedOrganizationForManagement.admins];

    // Apply search filter
    if (this.adminSearchTerm) {
      const term = this.adminSearchTerm.toLowerCase();
      admins = admins.filter(admin =>
        admin.firstName?.toLowerCase().includes(term) ||
        admin.lastName?.toLowerCase().includes(term) ||
        admin.email?.toLowerCase().includes(term) ||
        admin.documentNumber?.toLowerCase().includes(term) ||
        admin.phone?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.adminStatusFilter !== 'all') {
      admins = admins.filter(admin => admin.status === this.adminStatusFilter);
    }

    this.filteredAdmins = admins;
  }

  // Open create admin modal from management modal
  openCreateAdminFromManagement() {
    if (this.selectedOrganizationForManagement) {
      this.openCreateAdminModal(this.selectedOrganizationForManagement.organizationId);
    }
  }

  // Admin actions in modal
  editAdminInModal(admin: Admin) {
    console.log('Edit admin in modal:', admin);

    // Set edit mode and admin data
    this.isEditMode = true;
    this.adminToEdit = admin;
    this.selectedOrganizationId = admin.organizationId;

    // Open the create/edit modal
    this.showCreateAdminModal = true;
  }

  toggleAdminStatusInModal(admin: Admin) {
    const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    admin.status = newStatus;

    // Update the filtered list
    this.filterAdmins();

    console.log(`Admin ${admin.firstName} ${admin.lastName} status changed to ${newStatus} in modal`);
    alert(`Estado del administrador ${admin.firstName} ${admin.lastName} cambiado a ${newStatus}`);
  }

  deleteAdminInModal(admin: Admin) {
    if (confirm(`¿Estás seguro de que quieres eliminar al administrador ${admin.firstName} ${admin.lastName}?`)) {
      // Remove from the organization's admin list
      if (this.selectedOrganizationForManagement?.admins) {
        const index = this.selectedOrganizationForManagement.admins.findIndex(a => a.adminId === admin.adminId);
        if (index > -1) {
          this.selectedOrganizationForManagement.admins.splice(index, 1);
        }
      }

      // Update the filtered list
      this.filterAdmins();

      console.log('Delete admin in modal:', admin);
      alert(`Administrador ${admin.firstName} ${admin.lastName} eliminado exitosamente`);
    }
  }

  /**
   * Genera reporte PDF de administradores de una organización
   */
  async generateAdminReport(org: Organization) {
    // Verificar que la organización tenga administradores
    if (!org.admins || org.admins.length === 0) {
      alert('Esta organización no tiene administradores registrados');
      return;
    }

    try {
      await this.reportService.generateAdminsReport(
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
}
