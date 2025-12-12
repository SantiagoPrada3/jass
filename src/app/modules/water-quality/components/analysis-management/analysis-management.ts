import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs';
import { QualityTest, QualityTestRequest } from '../../models/quality-test.model';
import { WaterQualityApi } from '../../services/water-quality-api';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { CreateManagementComponent } from './create-management/create-management.component';
import { DetailsManagementComponent } from './details-management/details-management.component';
import { AuthService } from '../../../../core/auth/services/auth';
import { User } from '../../../../core/auth/models/auth';

import { NotificationService } from '../../../../shared/services/notification.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-analysis-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CreateManagementComponent,
    DetailsManagementComponent
  ],
  templateUrl: './analysis-management.html',
})
export class AnalysisManagement implements OnInit {
  // Inyectar el servicio de notificaciones
  private readonly notificationService = inject(NotificationService);

  public qualityTests$: Observable<QualityTest[]> = of([]);
  public isCreateModalOpen = false;
  public isEditModalOpen = false;
  public isDetailsModalOpen = false;
  public selectedTest: QualityTest | null = null;
  public lastAnalysisCode: string = 'ANL-001';
  public userOrganizationId: string = '';
  public currentUserId: string = '';

  // Estadísticas para el reporte
  public stats = {
    total: 0,
    acceptable: 0,
    warning: 0,
    critical: 0,
    completed: 0,
    pending: 0
  };

  // Lista de tests para el reporte
  public allTests: QualityTest[] = [];

  constructor(
    private waterQualityApi: WaterQualityApi,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    // Set user organization ID and current user ID
    if (currentUser?.organizationId) {
      this.userOrganizationId = currentUser.organizationId;
      console.log('User organization ID set to:', this.userOrganizationId);
    } else {
      console.warn('Could not get user organization ID');
    }
    
    if (currentUser?.userId) {
      this.currentUserId = currentUser.userId;
      console.log('Current user ID set to:', this.currentUserId);
    } else {
      console.warn('Could not get current user ID');
    }
    
    this.loadQualityTests();
  }

  loadQualityTests(): void {
    this.qualityTests$ = this.waterQualityApi.getAllQualityTests().pipe(
      map((response: ApiResponse<QualityTest[]>) => response.data || []),
      tap((data: QualityTest[]) => {
        this.allTests = data; // Guardar para el reporte
        this.updateStats(data); // Actualizar estadísticas

        if (!data || data.length === 0) {
          this.notificationService.info(
            'Sin Datos',
            'No hay análisis de calidad registrados',
            4000
          );
        } else {
          // Notificación de éxito al cargar datos
          this.notificationService.success(
            'Datos Cargados',
            `Se cargaron ${data.length} análisis de calidad`,
            3000
          );
        }
      }),
      catchError(error => {
        // Notificación de error
        this.notificationService.error(
          'Error al Cargar',
          'No se pudieron cargar los análisis de calidad. Por favor, intente nuevamente.',
          6000
        );

        return of([]); // Return an empty array on error
      })
    );
  }

  openCreateManagement(): void {
    this.selectedTest = null;
    this.isCreateModalOpen = true;
    
    // Log the user organization ID and current user ID
    console.log('Opening create management with userOrganizationId:', this.userOrganizationId);
    console.log('Opening create management with currentUserId:', this.currentUserId);

    // Notificación informativa
    this.notificationService.info(
      'Crear Análisis',
      'Complete el formulario para registrar un nuevo análisis',
      3000
    );
  }

  openEditManagement(test: QualityTest): void {
    this.selectedTest = test;
    this.isCreateModalOpen = true; // Reuse the same modal
    
    // Log the user organization ID and current user ID
    console.log('Opening edit management with userOrganizationId:', this.userOrganizationId);
    console.log('Opening edit management with currentUserId:', this.currentUserId);

    // Notificación informativa
    this.notificationService.info(
      'Editar Análisis',
      `Editando análisis: ${test.testCode}`,
      3000
    );
  }

  openDetailsManagement(test: QualityTest): void {
    this.selectedTest = test;
    this.isDetailsModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.selectedTest = null;
  }

  closeEditModal(): void {
    this.isCreateModalOpen = false;
    this.selectedTest = null;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedTest = null;
  }

  handleTestSubmission(testData: any): void {
    // Usar directamente los datos que vienen del modal (ya están en el formato correcto)
    const qualityTestRequest: QualityTestRequest = {
      // No incluir testCode - se genera automáticamente en el backend
      organization: testData.organization,
      testedByUser: testData.testedByUser,
      testingPointId: testData.testingPointId,
      testDate: testData.testDate,
      testType: testData.testType,
      weatherConditions: testData.weatherConditions,
      waterTemperature: testData.waterTemperature,
      generalObservations: testData.generalObservations,
      status: testData.status,
      results: testData.results
    };

    // Notificación de inicio
    this.notificationService.info(
      'Creando Análisis',
      'Enviando datos al servidor...',
      3000
    );

    this.waterQualityApi.createQualityTest(qualityTestRequest).pipe(
      catchError(error => {

        // Notificación de error detallada
        const errorMessage = error.error?.message || error.message || `Error ${error.status}: ${error.statusText}`;
        this.notificationService.error(
          'Error al Crear Análisis',
          errorMessage,
          7000
        );

        return of(null); // Return null or a specific error object
      }
      )).subscribe({
        next: (response) => {
          console.log('Create response:', response);
          if (response && (response.success === true || (response as any)?.status === true)) {
            // Notificación de éxito
            this.notificationService.success(
              'Análisis Creado',
              `El análisis se creó exitosamente`,
              5000
            );

            this.loadQualityTests();
            this.closeCreateModal();
          } else {
            // Notificación de error del servidor
            const serverMessage = response?.message || 'No se pudo crear el análisis - respuesta inválida del servidor';
            console.log('Server response indicates failure:', response);
            this.notificationService.error(
              'Error del Servidor',
              serverMessage,
              6000
            );
          }
        },
        error: (error) => {
          // Notificación de error en suscripción
          this.notificationService.error(
            'Error de Conexión',
            'Hubo un problema al conectar con el servidor',
            6000
          );
        }
      });
  }

  handleTestUpdate(testData: QualityTestRequest): void {
    if (!this.selectedTest) {
      // Notificación de advertencia
      this.notificationService.warning(
        'Error de Actualización',
        'No se ha seleccionado ningún análisis para actualizar',
        4000
      );
      return;
    }

    // Notificación de inicio
    this.notificationService.info(
      'Actualizando Análisis',
      `Actualizando análisis: ${this.selectedTest.testCode}`,
      3000
    );

    this.waterQualityApi.updateQualityTest(this.selectedTest.id, testData).pipe(
      catchError(error => {
        // Notificación de error
        const errorMessage = error.error?.message || error.message || 'Error desconocido al actualizar el análisis';
        this.notificationService.error(
          'Error al Actualizar',
          errorMessage,
          7000
        );

        return of(null);
      })
    ).subscribe({
      next: (response) => {
        console.log('Update response:', response);
        if (response && (response.success === true || (response as any)?.status === true)) {
          // Notificación de éxito
          this.notificationService.success(
            'Análisis Actualizado',
            `El análisis ${this.selectedTest?.testCode} se actualizó correctamente`,
            5000
          );

          this.loadQualityTests();
          this.closeCreateModal(); // Close the reused modal
        } else {
          // Notificación de error del servidor
          const serverMessage = response?.message || 'No se pudo actualizar el análisis - respuesta inválida del servidor';
          console.log('Server response indicates failure:', response);
          this.notificationService.error(
            'Error del Servidor',
            serverMessage,
            6000
          );
        }
      },
      error: (error) => {
        // Notificación de error en suscripción
        this.notificationService.error(
          'Error de Conexión',
          'Hubo un problema al conectar con el servidor',
          6000
        );
      }
    });
  }

  viewTest(test: QualityTest): void {
    this.openDetailsManagement(test);
  }

  editTest(test: QualityTest): void {
    this.openEditManagement(test);
  }

  deleteTest(test: QualityTest): void {
    // Implementar lógica de eliminación
    // Notificación de confirmación (en una implementación real, usar un modal de confirmación)
    this.notificationService.warning(
      'Eliminar Análisis',
      `¿Está seguro de eliminar el análisis ${test.testCode}?`,
      5000
    );

    // Aquí iría la lógica de eliminación real
    // Por ahora solo mostramos la notificación

    /* Ejemplo de implementación completa:
    this.waterQualityApi.deleteQualityTest(test.id).pipe(
      catchError(error => {
        this.notificationService.error(
          'Error al Eliminar',
          'No se pudo eliminar el análisis',
          6000
        );
        return of(null);
      }
    ).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.notificationService.success(
            'Análisis Eliminado',
            `El análisis ${test.testCode} fue eliminado exitosamente`,
            5000
          );
          this.loadQualityTests();
        }
      }
    });
    */
  }

  translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'ACCEPTABLE': 'Aceptado',
      'WARNING': 'Advertencia',
      'CRITICAL': 'Crítico',
      'COMPLETED': 'Completado',
      'PENDING': 'Pendiente'
    };
    
    return statusMap[status] || status;
  }

  getStatusBadgeClass(status: string): any {
    return {
      'bg-green-100 text-green-800': status === 'ACCEPTABLE',
      'bg-yellow-100 text-yellow-800': status === 'WARNING',
      'bg-red-100 text-red-800': status === 'CRITICAL',
      'bg-blue-100 text-blue-800': status === 'COMPLETED',
      'bg-gray-100 text-gray-800': status === 'PENDING',
    };
  }

  // ===============================
  // Estadísticas y Reporte PDF
  // ===============================

  updateStats(tests: QualityTest[]): void {
    this.stats = {
      total: tests.length,
      acceptable: tests.filter(t => t.status === 'ACCEPTABLE').length,
      warning: tests.filter(t => t.status === 'WARNING').length,
      critical: tests.filter(t => t.status === 'CRITICAL').length,
      completed: tests.filter(t => t.status === 'COMPLETED').length,
      pending: tests.filter(t => t.status === 'PENDING').length
    };
  }

  generateReport(): void {
    this.notificationService.info('Generando reporte', 'Preparando el documento PDF...');

    // Obtener información de la organización y generar PDF
    this.loadOrganizationDataAndCreateReport();
  }

  private async loadOrganizationDataAndCreateReport(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    const organizationId = currentUser?.organizationId;

    if (!organizationId) {
      this.notificationService.warning(
        'Información Incompleta',
        'No se pudo obtener la información de la organización. Generando reporte básico...'
      );
      await this.createPDFReportAsync(null);
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
      
      await this.createPDFReportAsync(organization);
      
    } catch (error) {
      console.log('Error general al obtener organización:', error);
      this.notificationService.warning(
        'Error al cargar organización',
        'Generando reporte con información básica...'
      );
      await this.createPDFReportAsync(null);
    }
  }

  private async createPDFReportAsync(organization: any | null): Promise<void> {
    const doc = new jsPDF();
    const currentUser = this.authService.getCurrentUser();
    const currentDate = new Date();
    const organizationName = organization?.name || organization?.organizationName || 'Sistema JASS';
    const organizationLogo = organization?.logoUrl || organization?.logo;

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
    doc.text('Reporte de Análisis de Calidad', 55, 37);

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

    // Tabla detallada de análisis
    let yPos = 82;
    
    // Título de la tabla
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Análisis de Calidad', 20, yPos);
    
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
    doc.text('Tipo', 75, yPos + 4);
    doc.text('Puntos de Muestreo', 95, yPos + 4);
    doc.text('Temp.', 140, yPos + 4);
    doc.text('Estado', 160, yPos + 4);

    // Datos de la tabla
    yPos += 15;
    doc.setFont('helvetica', 'normal');

    this.allTests.slice(0, 15).forEach((test, index) => {
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
        doc.text('Tipo', 75, yPos + 4);
        doc.text('Puntos de Muestreo', 95, yPos + 4);
        doc.text('Temp.', 140, yPos + 4);
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

      // Datos del análisis
      doc.setFont('helvetica', 'bold');
      doc.text(test.testCode || 'N/A', 18, rowY + 2);
      
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(test.testDate).toLocaleDateString('es-ES'), 45, rowY + 2);
      
      // Tipo
      doc.text(test.testType || 'N/A', 75, rowY + 2);

      // Puntos de prueba
      const points = test.testingPointId?.map(p => p.pointName).join(', ') || 'N/A';
      const truncatedPoints = points.length > 18 ? points.substring(0, 15) + '...' : points;
      doc.text(truncatedPoints, 95, rowY + 2);

      // Temperatura
      doc.text(`${test.waterTemperature || 0}°C`, 140, rowY + 2);

      // Estado
      const statusColor = this.getStatusColor(test.status);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(this.translateStatus(test.status), 160, rowY + 2);

      // Usuario que realizó el análisis
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'normal');
      const userName = `${test.testedByUser?.firstName || ''} ${test.testedByUser?.lastName || ''}`.trim();
      if (userName) {
        doc.text(`Por: ${userName}`, 18, rowY + 7);
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    });

    // Footer del documento
    yPos = Math.max(yPos + (Math.min(this.allTests.length, 15) * 14) + 20, 200);
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
    const fileName = `reporte-calidad-agua-${orgName}-${currentDate.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    this.notificationService.success(
      '📄 Reporte PDF Generado',
      `El archivo "${fileName}" se ha descargado exitosamente con ${this.allTests.length} análisis de calidad`
    );
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case 'ACCEPTABLE': return [5, 150, 105]; // Verde
      case 'WARNING': return [245, 158, 11]; // Amarillo
      case 'CRITICAL': return [220, 38, 38]; // Rojo
      case 'COMPLETED': return [59, 130, 246]; // Azul
      case 'PENDING': return [156, 163, 175]; // Gris
      default: return [107, 114, 128]; // Gris por defecto
    }
  }

  private getPercentage(value: number): number {
    return this.stats.total > 0 ? Math.round((value / this.stats.total) * 100) : 0;
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

  private loadImageAsync(imageUrl: string): Promise<{dataURL: string, width: number, height: number}> {
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
    doc.circle(finalX + logoWidth/2, finalY + logoHeight/2 - circleRadius/2, circleRadius, 'F');
    
    // Texto JASS proporcional
    const fontSize = Math.min(logoWidth, logoHeight) * 0.25;
    doc.setFontSize(fontSize);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    
    // Centrar el texto
    const textWidth = fontSize * 2; // Aproximación del ancho del texto "JASS"
    doc.text('JASS', finalX + (logoWidth - textWidth) / 2, finalY + logoHeight - fontSize/2);
    
    doc.setLineWidth(0.5);
  }
}