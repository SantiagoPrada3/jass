import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, map, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WaterQualityApi } from '../../services/water-quality-api';
import { ChlorineRecord, ChlorineRecordRequest } from '../../models/chlorine-record.model';
import { AuthService } from '../../../../core/auth/services/auth';
import { User } from '../../../../core/auth/models/auth';
import { CreateChlorineModalComponent } from './create-chlorine/create-chlorine.component';
import { DetailsChlorineComponent } from './details-chlorine/details-chlorine.component';
import { TestingPoints } from '../../models/quality-test.model';
import { Toast } from '../../../../shared/components/ui/notifications/toast/toast';
import { NotificationService } from "../../../../shared/services/notification.service";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-chlorine-control',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    FormsModule,
    CreateChlorineModalComponent,
    DetailsChlorineComponent,
    Toast
  ],
  templateUrl: './chlorine-control.html',
  styleUrls: ['./chlorine-control.css']
})
export class ChlorineControl implements OnInit {
  public chlorineRecords$: Observable<ChlorineRecord[]> = of([]);
  public filteredRecords$: Observable<ChlorineRecord[]> = of([]);
  public isCreateModalOpen = false;
  public isDetailsModalOpen = false;
  public selectedRecord: ChlorineRecord | null = null;
  public userOrganizationId: string = '';
  public currentUserId: string = '';
  public availableTestingPoints: TestingPoints[] = [];

  // Filtros y búsqueda
  public searchTerm = '';
  public selectedType = 'all';
  public selectedStatus = 'all';

  // Subjects para filtros reactivos
  private searchSubject = new BehaviorSubject<string>('');
  private typeSubject = new BehaviorSubject<string>('all');
  private statusSubject = new BehaviorSubject<string>('all');

  // Estadísticas calculadas
  public stats = {
    total: 0,
    acceptable: 0,
    moderate: 0,
    critical: 0
  };

  // Opciones para los filtros (propiedades estáticas)
  public recordTypeOptions: string[] = ['CLORO', 'SULFATO', 'PH', 'TURBIDEZ'];
  public statusOptions: { value: string, label: string }[] = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'acceptable', label: 'Aceptables' },
    { value: 'moderate', label: 'Moderados' },
    { value: 'critical', label: 'Críticos' }
  ];

  // Hacer Math disponible en el template
  public Math = Math;

  // Inyectar el servicio de notificaciones
  private notificationService = inject(NotificationService);

  constructor(
    private waterQualityApi: WaterQualityApi,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const currentUser: User | null = this.authService.getCurrentUser();
    if (currentUser) {
      this.userOrganizationId = currentUser.organizationId || '';
      this.currentUserId = currentUser.userId || '';
    } else {
      this.userOrganizationId = 'default-org-id';
      this.currentUserId = 'default-user-id';
      this.notificationService.warning(
        'Usuario no autenticado',
        'Usando valores por defecto para desarrollo'
      );
    }

    this.loadChlorineRecords();
    this.loadTestingPoints();
    this.setupFilters();
  }

  loadChlorineRecords(): void {
    this.chlorineRecords$ = this.waterQualityApi.getAllChlorineRecords().pipe(
      map(response => response.data || []),
      tap(data => {
        console.log('Chlorine records data received:', data);
        if (!data || data.length === 0) {
          console.warn('No chlorine records data received');
        }
      }),
      catchError(error => {
        console.error('Error loading chlorine records:', error);
        this.notificationService.error(
          'Error al cargar registros',
          'No se pudieron cargar los registros de cloro'
        );
        return of([]);
      })
    );
  }

  loadTestingPoints(): void {
    if (this.userOrganizationId) {
      this.waterQualityApi.getAllTestingPointsByOrganizationId(this.userOrganizationId).pipe(
        map(response => {
          console.log('Testing points response:', response);
          return response.data || [];
        }),
        catchError(error => {
          console.error('Error loading testing points:', error);
          this.notificationService.error(
            'Error al cargar puntos de prueba',
            'No se pudieron cargar los puntos de prueba disponibles'
          );
          return of([]);
        })
      ).subscribe(points => {
        this.availableTestingPoints = points;
        console.log('Available testing points loaded:', this.availableTestingPoints);
      });
    }
  }

  openCreateManagement(): void {
    this.selectedRecord = null;
    this.isCreateModalOpen = true;
  }

  openEditManagement(record: ChlorineRecord): void {
    this.selectedRecord = record;
    this.isCreateModalOpen = true;
  }

  openDetailsManagement(record: ChlorineRecord): void {
    this.selectedRecord = record;
    this.isDetailsModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.selectedRecord = null;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedRecord = null;
  }

  handleRecordSubmission(recordData: ChlorineRecordRequest): void {
    if (this.selectedRecord) {
      // Actualización
      this.waterQualityApi.updateChlorineRecord(this.selectedRecord.id, recordData).subscribe({
        next: () => {
          this.notificationService.success(
            'Registro actualizado',
            'El registro de cloro ha sido actualizado exitosamente'
          );
          this.loadChlorineRecords();
          this.closeCreateModal();
        },
        error: (error) => {
          console.error('Error updating chlorine record:', error);
          this.notificationService.error(
            'Error al actualizar',
            'No se pudo actualizar el registro de cloro'
          );
        }
      });
    } else {
      // Creación
      this.waterQualityApi.createChlorineRecord(recordData).subscribe({
        next: () => {
          this.notificationService.success(
            'Registro creado',
            'El registro de cloro ha sido creado exitosamente'
          );
          this.loadChlorineRecords();
          this.closeCreateModal();
        },
        error: (error) => {
          console.error('Error creating chlorine record:', error);
          this.notificationService.error(
            'Error al crear',
            'No se pudo crear el registro de cloro'
          );
        }
      });
    }
  }

  viewRecord(record: ChlorineRecord): void {
    this.openDetailsManagement(record);
  }

  editRecord(record: ChlorineRecord): void {
    this.openEditManagement(record);
  }

  deleteRecord(record: ChlorineRecord): void {
    if (confirm('¿Estás seguro de que quieres eliminar este registro de cloro?')) {
      this.waterQualityApi.deleteChlorineRecord(record.id).subscribe({
        next: () => {
          this.notificationService.success(
            'Registro eliminado',
            'El registro de cloro ha sido eliminado exitosamente'
          );
          this.loadChlorineRecords();
        },
        error: (error) => {
          console.error('Error deleting chlorine record:', error);
          this.notificationService.error(
            'Error al eliminar',
            'No se pudo eliminar el registro de cloro'
          );
        }
      });
    }
  }

  translateStatus(acceptable: boolean, actionRequired: boolean): string {
    if (actionRequired) {
      return 'Acción Requerida';
    } else if (acceptable) {
      return 'Aceptado';
    } else {
      return 'No Aceptable';
    }
  }

  // ===============================
  // Filtros y Búsqueda Reactiva
  // ===============================

  setupFilters(): void {
    // Configurar filtros reactivos con debounce
    this.filteredRecords$ = combineLatest([
      this.chlorineRecords$,
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.typeSubject.pipe(distinctUntilChanged()),
      this.statusSubject.pipe(distinctUntilChanged())
    ]).pipe(
      map(([records, search, type, status]) => {
        let filtered = records;

        // Filtro por búsqueda
        if (search.trim()) {
          filtered = filtered.filter(record =>
            record.recordCode?.toLowerCase().includes(search.toLowerCase()) ||
            record.recordType?.toLowerCase().includes(search.toLowerCase())
          );
        }

        // Filtro por tipo
        if (type !== 'all') {
          filtered = filtered.filter(record => record.recordType === type);
        }

        // Filtro por estado
        if (status !== 'all') {
          filtered = filtered.filter(record => {
            switch (status) {
              case 'acceptable': return record.acceptable && !record.actionRequired;
              case 'moderate': return !record.acceptable && !record.actionRequired;
              case 'critical': return record.actionRequired;
              default: return true;
            }
          });
        }

        // Actualizar estadísticas
        this.updateStats(filtered);

        return filtered;
      })
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  onTypeChange(type: string): void {
    this.selectedType = type;
    this.typeSubject.next(type);
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.statusSubject.next(status);
  }

  updateStats(records: ChlorineRecord[]): void {
    this.stats = {
      total: records.length,
      acceptable: records.filter(r => r.acceptable && !r.actionRequired).length,
      moderate: records.filter(r => !r.acceptable && !r.actionRequired).length,
      critical: records.filter(r => r.actionRequired).length
    };
  }

  // ===============================
  // Generación de Reporte PDF
  // ===============================

  generateReport(): void {
    this.notificationService.info('Generando reporte', 'Preparando el documento PDF...');

    this.filteredRecords$.pipe(
      map(records => this.loadOrganizationDataAndCreateReport(records))
    ).subscribe();
  }

  private async loadOrganizationDataAndCreateReport(records: ChlorineRecord[]): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      this.notificationService.warning(
        'Información Incompleta',
        'No se pudo obtener la información de la organización. Generando reporte básico...'
      );
      await this.createPDFReportAsync(records, null);
      return;
    }

    try {
      // Intentar obtener datos de la organización desde diferentes endpoints
      let organization = null;

      // Endpoint 1: Admin organization
      try {
        const response1 = await this.http.get<any>(`https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/organization/${organizationId}`).toPromise();
        console.log('Respuesta endpoint 1:', response1);

        if (response1?.data) {
          organization = response1.data;
        } else if (response1?.success && response1?.organization) {
          organization = response1.organization;
        } else if (response1?.name || response1?.organizationName) {
          organization = response1;
        }
      } catch (e) {
        console.log('Error en endpoint 1:', e);
      }

      // Endpoint 2: Management organizations (si el primero falla)
      if (!organization) {
        try {
          const response2 = await this.http.get<any>(`https://lab.vallegrande.edu.pe/jass/ms-gateway/admin/management/organizations/${organizationId}`).toPromise();
          console.log('Respuesta endpoint 2:', response2);

          if (response2?.data) {
            organization = response2.data;
          } else if (response2?.success && response2?.organization) {
            organization = response2.organization;
          } else if (response2?.name || response2?.organizationName) {
            organization = response2;
          }
        } catch (e) {
          console.log('Error en endpoint 2:', e);
        }
      }

      console.log('Datos finales de organización:', organization);

      await this.createPDFReportAsync(records, organization);

    } catch (error) {
      console.log('Error general al obtener organización:', error);
      this.notificationService.warning(
        'Error al cargar organización',
        'Generando reporte con información básica...'
      );
      await this.createPDFReportAsync(records, null);
    }
  }

  private async createPDFReportAsync(records: ChlorineRecord[], organization: any | null): Promise<void> {
    const doc = new jsPDF();
    const currentUser = this.authService.getCurrentUser();
    const currentDate = new Date();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';

    // Configuración de colores sobrios
    const primaryColor: [number, number, number] = [55, 65, 81]; // Gris oscuro
    const secondaryColor: [number, number, number] = [107, 114, 128]; // Gris medio
    const lightGray: [number, number, number] = [249, 250, 251]; // Gris claro
    const borderColor: [number, number, number] = [209, 213, 219]; // Gris borde

    // Header profesional y sobrio
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
    doc.text('Sistema de Control de Calidad del Agua', 55, 30);

    doc.setFontSize(10);
    doc.text('Reporte de Control de Cloro Residual', 55, 37);

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
    // Tabla detallada de registros
    let yPos = 82;

    // Título de la tabla
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Registros de Cloro', 20, yPos);

    // Línea
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(20, yPos + 3, 190, yPos + 3);
    doc.setLineWidth(0.5);

    // Headers de tabla con color
    yPos += 12;
    doc.setFillColor(59, 130, 246); // Azul profesional
    doc.rect(15, yPos - 3, 180, 12, 'F');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255); // Texto blanco
    doc.setFont('helvetica', 'bold');
    doc.text('Código', 18, yPos + 4);
    doc.text('Fecha', 45, yPos + 4);
    doc.text('Nivel (mg/L)', 75, yPos + 4);
    doc.text('Cantidad', 110, yPos + 4);
    doc.text('Tipo', 135, yPos + 4);
    doc.text('Estado', 160, yPos + 4);

    // Datos de la tabla
    yPos += 15;
    doc.setFont('helvetica', 'normal');

    records.slice(0, 15).forEach((record, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;

        // Repetir header en nueva página
        doc.setFillColor(59, 130, 246);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Código', 18, yPos + 4);
        doc.text('Fecha', 45, yPos + 4);
        doc.text('Nivel (mg/L)', 75, yPos + 4);
        doc.text('Cantidad', 110, yPos + 4);
        doc.text('Tipo', 135, yPos + 4);
        doc.text('Estado', 160, yPos + 4);
        yPos += 15;
      }

      const rowY = yPos + (index * 14);

      // Alternar color de fondo
      if (index % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(15, rowY - 2, 180, 11, 'F');
      }

      // Línea separadora
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(15, rowY + 8, 195, rowY + 8);
      doc.setLineWidth(0.5);

      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      // Datos del registro
      doc.setFont('helvetica', 'bold');
      doc.text(record.recordCode || 'N/A', 18, rowY + 2);

      doc.setFont('helvetica', 'normal');
      doc.text(new Date(record.recordDate).toLocaleDateString('es-ES'), 45, rowY + 2);

      // Nivel con color según rango
      const levelColor = this.getLevelColorRGB(record.level);
      doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${record.level}`, 75, rowY + 2);

      // Resto de datos
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`${record.amount || 0}`, 110, rowY + 2);
      doc.text(record.recordType || 'N/A', 135, rowY + 2);

      // Estado
      let statusText = '';
      let statusColor: [number, number, number] = [0, 0, 0];

      if (record.actionRequired) {
        statusText = 'Crítico';
        statusColor = [220, 38, 38];
      } else if (record.acceptable) {
        statusText = 'Aceptable';
        statusColor = [34, 197, 94];
      } else {
        statusText = 'Moderado';
        statusColor = [245, 158, 11];
      }

      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(statusText, 160, rowY + 2);

      // Usuario que registró
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'normal');
      const userName = `${record.recordedByUser?.firstName || ''} ${record.recordedByUser?.lastName || ''}`.trim();
      if (userName) {
        doc.text(`Por: ${userName}`, 18, rowY + 7);
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    });

    // Footer del documento
    yPos = Math.max(yPos + (Math.min(records.length, 15) * 14) + 20, 200);
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }

    // Línea separadora
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 195, yPos);

    // Información del pie de página
    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte generado por ${organizationName}`, 20, yPos);
    doc.text(`${currentDate.toLocaleDateString('es-ES')} - ${currentDate.toLocaleTimeString('es-ES')}`, 20, yPos + 6);

    // Número de página
    doc.text('Página 1', 170, yPos);

    // Descargar el PDF con nombre mejorado
    const orgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileName = `reporte-cloro-${orgName}-${currentDate.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    this.notificationService.success(
      'Reporte PDF Generado',
      `El archivo "${fileName}" se ha descargado exitosamente con ${records.length} registros de cloro`
    );
  }

  // Función auxiliar para obtener color RGB según el nivel
  private getLevelColorRGB(level: number): [number, number, number] {
    if (level >= 0.5 && level <= 1.0) return [5, 150, 105]; // Verde
    if (level >= 0.3 && level <= 1.5) return [245, 158, 11]; // Amarillo
    return [220, 38, 38]; // Rojo
  }

  private getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  private getRecommendations(): string {
    const criticalPercentage = this.getPercentage(this.stats.critical, this.stats.total);
    const acceptablePercentage = this.getPercentage(this.stats.acceptable, this.stats.total);

    if (criticalPercentage > 30) {
      return '• Revisar urgentemente el sistema de cloración\n• Verificar la dosificación y calibración de equipos\n• Capacitar al personal operativo\n• Implementar mantenimiento correctivo inmediato';
    } else if (acceptablePercentage > 80) {
      return '• Mantener el protocolo actual de operación\n• Continuar con el monitoreo regular establecido\n• Documentar las buenas prácticas implementadas\n• Realizar mantenimiento preventivo programado';
    } else {
      return '• Ajustar la dosificación de cloro según análisis\n• Aumentar la frecuencia de monitoreo en puntos críticos\n• Revisar y optimizar los procedimientos operativos\n• Capacitar al personal en técnicas de control';
    }
  }

  private getAppliedFilters(): string {
    const filters = [];
    if (this.searchTerm) {
      filters.push(`Búsqueda: "${this.searchTerm}"`);
    }
    if (this.selectedType !== 'all') {
      filters.push(`Tipo: ${this.selectedType}`);
    }
    if (this.selectedStatus !== 'all') {
      const statusMap = {
        'acceptable': 'Aceptable',
        'moderate': 'Moderado',
        'critical': 'Crítico'
      };
      filters.push(`Estado: ${statusMap[this.selectedStatus as keyof typeof statusMap] || this.selectedStatus}`);
    }
    return filters.length > 0 ? filters.join(', ') : 'Ninguno';
  }

  // ===============================
  // Utilidades para Cards
  // ===============================

  getRecordInitials(recordCode: string): string {
    if (!recordCode) return 'RC';
    return recordCode.substring(0, 2).toUpperCase();
  }

  getStatusClass(record: ChlorineRecord): string {
    if (record.actionRequired) {
      return 'bg-red-100 text-red-800';
    } else if (record.acceptable) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  }

  getLevelColor(level: number): string {
    if (level >= 0.5 && level <= 1.0) return 'text-green-600';
    if (level >= 0.3 && level <= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  }



  getProgressWidth(level: number): number {
    return Math.min((level / 2) * 100, 100);
  }

  // ===============================
  // Métodos auxiliares para el logo
  // ===============================

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

      console.log('URL del logo encontrada:', logoUrl);
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
        console.log('Logo agregado exitosamente al PDF con dimensiones:', finalWidth, 'x', finalHeight);
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