import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QualityTest, TestResults } from '../../../models/quality-test.model';

@Component({
  selector: 'app-details-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[8000]" (keydown.escape)="onClose()" (keyup.escape)="onClose()" tabindex="0">
      <!-- Background overlay - CLIC PARA CERRAR -->
      <div class="absolute inset-0 bg-transparent transition-opacity duration-300" (click)="onClose()"></div>

      <!-- Modal Panel -->
      <div class="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl transform transition-transform duration-300 ease-out flex flex-col"
           [class.translate-x-full]="!isOpen" [class.translate-x-0]="isOpen" (click)="$event.stopPropagation()">

           <!-- Header -->
           <div class="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                <div class="flex items-center space-x-3">
                     <div class="w-12 h-12 rounded-full flex items-center justify-center text-slate-600 font-semibold bg-slate-100">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
                               </path>
                          </svg>
                     </div>
                     <div>
                          <h2 class="text-xl font-semibold text-white">Detalles del Análisis de Calidad de Agua</h2>
                          <p class="text-sm text-slate-400">Información completa del análisis</p>
                     </div>
                </div>
                <button (click)="onClose()"
                     class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12">
                          </path>
                     </svg>
                </button>
           </div>

           <!-- Contenido del Modal -->
           <div class="flex-1 overflow-y-auto bg-gray-50 min-h-0" *ngIf="qualityTest">
                <div class="p-6 space-y-6">
                     <!-- Sección: Información General -->
                     <div class="bg-white rounded-lg border border-slate-200">
                          <div class="px-6 py-4 border-b border-slate-200">
                               <h3 class="text-lg font-semibold text-slate-900">Información General</h3>
                          </div>
                          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Código de Análisis</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testCode }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fecha de Análisis</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testDate | date:'short' }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Tipo de Análisis</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testType }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                                    <p class="text-sm text-slate-900">
                                         <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                              [ngClass]="{
                                                   'bg-green-100 text-green-800': qualityTest.status === 'ACCEPTABLE',
                                                   'bg-yellow-100 text-yellow-800': qualityTest.status === 'WARNING',
                                                   'bg-red-100 text-red-800': qualityTest.status === 'CRITICAL',
                                                   'bg-blue-100 text-blue-800': qualityTest.status === 'COMPLETED',
                                                   'bg-gray-100 text-gray-800': qualityTest.status === 'PENDING',
                                              }">
                                              {{ translateStatus(qualityTest.status) }}
                                         </span>
                                    </p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Condiciones Climáticas</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.weatherConditions }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Temperatura del Agua</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.waterTemperature }}°C</p>
                               </div>
                               <div class="md:col-span-2">
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Puntos de Prueba</label>
                                    <div class="flex flex-wrap gap-2">
                                         <span *ngFor="let point of qualityTest.testingPointId" 
                                               class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                              {{ point.pointName }}
                                         </span>
                                    </div>
                               </div>
                               <div class="md:col-span-2">
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Observaciones Generales</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.generalObservations || 'No hay observaciones' }}</p>
                               </div>
                          </div>
                     </div>

                     <!-- Sección: Información del Usuario -->
                     <div class="bg-white rounded-lg border border-slate-200">
                          <div class="px-6 py-4 border-b border-slate-200">
                               <h3 class="text-lg font-semibold text-slate-900">Información del Usuario</h3>
                          </div>
                          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Nombre del Usuario</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testedByUser.firstName }} {{ qualityTest.testedByUser.lastName }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Código de Usuario</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testedByUser.userCode }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Documento</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testedByUser.documentType }}: {{ qualityTest.testedByUser.documentNumber }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.testedByUser.email }}</p>
                               </div>
                          </div>
                     </div>

                     <!-- Sección: Información de la Organización -->
                     <div class="bg-white rounded-lg border border-slate-200">
                          <div class="px-6 py-4 border-b border-slate-200">
                               <h3 class="text-lg font-semibold text-slate-900">Información de la Organización</h3>
                          </div>
                          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Nombre de la Organización</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.organization.organizationName }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Código de Organización</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.organization.organizationCode }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.organization.address }}</p>
                               </div>
                               <div>
                                    <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                                    <p class="text-sm text-slate-900">{{ qualityTest.organization.phone }}</p>
                               </div>
                          </div>
                     </div>

                     <!-- Sección: Resultados de Pruebas -->
                     <div class="bg-white rounded-lg border border-slate-200">
                          <div class="px-6 py-4 border-b border-slate-200">
                               <h3 class="text-lg font-semibold text-slate-900">Resultados de Pruebas</h3>
                          </div>
                          <div class="p-6 space-y-4">
                               <div *ngFor="let result of qualityTest.results; let i = index" 
                                    class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start">
                                         <h4 class="text-md font-semibold text-slate-800">Resultado #{{ i + 1 }} - {{ result.parameterName }}</h4>
                                         <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                              [ngClass]="{
                                                   'bg-green-100 text-green-800': result.status === 'ACCEPTABLE',
                                                   'bg-yellow-100 text-yellow-800': result.status === 'WARNING',
                                                   'bg-red-100 text-red-800': result.status === 'CRITICAL'
                                              }">
                                              {{ translateStatus(result.status) }}
                                         </span>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                         <div>
                                              <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Valor Medido</label>
                                              <p class="text-sm text-slate-900 font-medium">{{ result.measuredValue }} {{ result.unit }}</p>
                                         </div>
                                         <div>
                                              <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Unidad</label>
                                              <p class="text-sm text-slate-900">{{ result.unit }}</p>
                                         </div>
                                         <div class="md:col-span-2">
                                              <label class="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Observaciones</label>
                                              <p class="text-sm text-slate-900">{{ result.observations || 'No hay observaciones' }}</p>
                                         </div>
                                    </div>
                               </div>
                          </div>
                     </div>

                     <!-- Botones de Acción -->
                     <div class="flex justify-end gap-4 pt-6 border-t border-slate-200">
                          <button type="button" (click)="onClose()"
                               class="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-colors">
                               Cerrar
                          </button>
                     </div>
                </div>
           </div>
      </div>
    </div>
  `,
  styles: [`
    /* Estilos para el modal de detalles */
    
    /* Animaciones para modal lateral derecho */
    .modal-enter {
      transform: translateX(100%);
    }

    .modal-enter-active {
      transform: translateX(0);
      transition: transform 0.3s ease-in-out;
    }

    .modal-exit {
      transform: translateX(0);
    }

    .modal-exit-active {
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    }

    /* Estilos para etiquetas */
    label {
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    /* Transiciones suaves */
    .transition-all {
      transition: all 0.2s ease-in-out;
    }

    /* Scroll suave para el modal */
    .modal-scroll {
      scroll-behavior: smooth;
    }
  `]
})
export class DetailsManagementComponent {
  @Input() isOpen: boolean = false;
  @Input() qualityTest: QualityTest | null = null;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.isOpen = false;
    this.close.emit();
  }

  translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'ACCEPTABLE': 'Aceptable',
      'WARNING': 'Advertencia',
      'CRITICAL': 'Crítico',
      'COMPLETED': 'Completado',
      'PENDING': 'Pendiente'
    };
    
    return statusMap[status] || status;
  }
}