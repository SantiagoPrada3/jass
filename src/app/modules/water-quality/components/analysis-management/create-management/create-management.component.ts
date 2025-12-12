import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WaterQualityApi } from '../../../services/water-quality-api';
import { QualityTest, QualityTestRequest, TestType, StatusResult, TestingPoints } from '../../../models/quality-test.model';
import { ApiResponse } from '../../../../../shared/models/api-response.model';
import { MultiSelectDropdownComponent } from '../../../../../shared/components/forms/multi-select-dropdown/multi-select-dropdown.component';

import { NotificationService } from '../../../../../shared/services/notification.service';

// Interfaz para parámetros predefinidos
interface PredefinedParameter {
  code: string;
  name: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
}

@Component({
  selector: 'app-create-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MultiSelectDropdownComponent
  ],
  providers: [WaterQualityApi],
  templateUrl: './create-management.component.html',
  styleUrls: ['./create-management.component.css']
})
export class CreateManagementComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() qualityTest: QualityTest | null = null;
  @Input() lastAnalysisCode: string = '';
  @Input() userOrganizationId: string = '';
  @Input() currentUserId: string = '';
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('CreateManagementComponent input changes:', changes);
    // Si cambia el test a editar, recargar los datos
    if (changes['qualityTest'] && changes['qualityTest'].currentValue) {
      this.loadTestData();
    }

    // Si cambia el modo, resetear el formulario si es necesario
    if (changes['mode']) {
      if (this.mode === 'create') {
        this.resetForm();
      } else if (this.mode === 'edit' && this.qualityTest) {
        this.loadTestData();
      }
    }
    
    // Si cambia el userOrganizationId, recargar los puntos de prueba
    if (changes['userOrganizationId'] && changes['userOrganizationId'].currentValue) {
      console.log('User organization ID changed, loading testing points');
      // Add a small delay to ensure the component is fully initialized
      setTimeout(() => {
        this.loadTestingPoints();
      }, 100);
    }
  }
  @Output() close = new EventEmitter<void>();
  @Output() submitTest = new EventEmitter<QualityTestRequest>();
  @Output() updateTest = new EventEmitter<QualityTestRequest>();

  // Inyectar el servicio de notificaciones
  private readonly notificationService = inject(NotificationService);

  isSaving: boolean = false;
  displayTestDate: string = '';
  availableTestingPoints: TestingPoints[] = [];
  predefinedParameters: PredefinedParameter[] = [
    { code: 'CLORO_LIBRE', name: 'Cloro libre', unit: 'mg/L', minValue: 0.2, maxValue: 4.0 },
    { code: 'PH', name: 'pH', unit: 'Unidad de pH', minValue: 6.5, maxValue: 8.5 },
    { code: 'TEMPERATURA', name: 'Temperatura', unit: '°C', minValue: 0, maxValue: 50 },
  ];
  waterTestForm!: FormGroup;
  testTypes = Object.values(TestType);
  statusResults = Object.values(StatusResult);

  get results(): FormArray {
    return this.waterTestForm.get('results') as FormArray;
  }

  constructor(private fb: FormBuilder,
    private waterQualityApi: WaterQualityApi) { }

  ngOnInit(): void {
    // Formatear la fecha para mostrar
    const now = new Date();
    this.displayTestDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    this.waterTestForm = this.fb.group({
      testingPointId: [[], Validators.required],
      testType: [TestType.RUTINARIO, Validators.required],
      weatherConditions: ['', Validators.required],
      waterTemperature: [null, [Validators.required, Validators.min(0), Validators.max(50)]],
      generalObservations: [''],
      status: ['COMPLETED', Validators.required],
      results: this.fb.array([])
    });

    // Cargar puntos de prueba disponibles desde la API
    // Only load if userOrganizationId is already available
    if (this.userOrganizationId) {
      console.log('User organization ID available at ngOnInit, loading testing points');
      this.loadTestingPoints();
    } else {
      console.log('User organization ID not available at ngOnInit, will load when input changes');
    }

    // Si estamos en modo edición y hay un test, cargar sus datos
    if (this.mode === 'edit' && this.qualityTest) {
      this.loadTestData();
    }
  }

  // Cargar puntos de prueba disponibles desde la API
  loadTestingPoints(): void {
    console.log('Loading testing points for organization:', this.userOrganizationId);
    if (this.userOrganizationId) {
      this.waterQualityApi.getTestingPointsByOrganizationId(this.userOrganizationId)
        .subscribe({
          next: (response: ApiResponse<TestingPoints[]>) => {
            this.availableTestingPoints = response.data || [];
            console.log('Loaded testing points:', this.availableTestingPoints.length);

            // Notificación de éxito
            this.notificationService.success(
              'Puntos de Prueba Cargados',
              `Se cargaron ${this.availableTestingPoints.length} puntos de prueba correctamente`
            );
          },
          error: (error: any) => {
            console.error('Error loading testing points:', error);
            // Notificación de error
            this.notificationService.error(
              'Error al Cargar Puntos',
              'No se pudieron cargar los puntos de prueba.'
            );
          }
        });
    } else {
      console.warn('Organization ID not available for loading testing points');
      // Notificación de advertencia
      this.notificationService.warning(
        'Organización No Disponible',
        'No se especificó una organización.'
      );
    }
  }

  // Cargar los datos del test en el formulario
  loadTestData(): void {
    if (this.qualityTest && this.mode === 'edit') {
      // Limpiar resultados existentes
      while (this.results.length !== 0) {
        this.results.removeAt(0);
      }

      // Agregar resultados del test
      this.qualityTest.results.forEach(result => {
        this.results.push(this.fb.group({
          parameterCode: [result.parameterCode, Validators.required],
          parameterName: [result.parameterName || ''], // Optional field
          measuredValue: [result.measuredValue, [Validators.required, Validators.min(0)]],
          unit: [result.unit, Validators.required],
          status: [result.status, Validators.required],
          observations: [result.observations || '']
        }));
      });

      // Establecer valores del formulario
      this.waterTestForm.patchValue({
        testingPointId: this.qualityTest.testingPointId.map(point => point.id),
        testType: this.qualityTest.testType,
        weatherConditions: this.qualityTest.weatherConditions,
        waterTemperature: this.qualityTest.waterTemperature,
        generalObservations: this.qualityTest.generalObservations,
        status: this.qualityTest.status
      });

      // Log form status for debugging
      setTimeout(() => {
        console.log('Form validity after loading data:', this.waterTestForm.valid);
        console.log('Form pristine status:', this.waterTestForm.pristine);
        console.log('Results array validity:', this.results.valid);
        console.log('Number of results:', this.results.length);
        
        // Log individual result controls validity
        this.results.controls.forEach((control, index) => {
          console.log(`Result ${index} validity:`, control.valid);
          console.log(`Result ${index} value:`, control.value);
        });
      }, 0);

      // Notificación informativa
      this.notificationService.info(
        'Datos Cargados',
        `Análisis ${this.qualityTest.testCode} cargado para edición`
      );
    }
  }

  // Resetear el formulario
  resetForm(): void {
    this.waterTestForm.reset({
      testType: TestType.RUTINARIO,
      waterTemperature: null,
      status: 'COMPLETED'
    });

    // Limpiar resultados
    while (this.results.length !== 0) {
      this.results.removeAt(0);
    }

    // Agregar un resultado vacío
    this.addResult();
  }

  addResult(): void {
    this.results.push(this.newTestResult());

    // Notificación de información
    this.notificationService.info(
      'Resultado Agregado',
      `Se agregó un nuevo resultado. Total: ${this.results.length}`,
      3000
    );
  }

  removeResult(index: number): void {
    if (this.results.length > 1) {
      this.results.removeAt(index);

      // Notificación de información
      this.notificationService.info(
        'Resultado Eliminado',
        `Resultado #${index + 1} eliminado correctamente`,
        3000
      );
    } else {
      // Notificación de advertencia
      this.notificationService.warning(
        'No se puede eliminar',
        'Debe mantener al menos un resultado en el análisis',
        4000
      );
    }
  }

  newTestResult(): FormGroup {
    return this.fb.group({
      parameterCode: ['', Validators.required],
      parameterName: [''], // Optional field, not required
      measuredValue: [null, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      status: [StatusResult.ACCEPTABLE, Validators.required],
      observations: ['']
    });
  }

  // Manejar el cambio de parámetro seleccionado
  onParameterChange(event: any, index: number): void {
    const selectedParamCode = event.target.value;
    const selectedParam = this.predefinedParameters.find(param => param.code === selectedParamCode);

    if (selectedParam && this.results.at(index)) {
      const resultGroup = this.results.at(index);
      resultGroup.get('parameterCode')?.setValue(selectedParam.code);
      resultGroup.get('parameterName')?.setValue(selectedParam.name);
      resultGroup.get('unit')?.setValue(selectedParam.unit);
    }
  }

  onClose(): void {
    this.isOpen = false;
    this.close.emit();
    this.waterTestForm.reset();
  }

  onSubmit(): void {
    console.log('Submit clicked');
    console.log('Form valid:', this.waterTestForm.valid);
    console.log('Form pristine:', this.waterTestForm.pristine);
    console.log('Is saving:', this.isSaving);
    console.log('Form value:', this.waterTestForm.value);
    
    // Log individual result controls validity
    this.results.controls.forEach((control, index) => {
      console.log(`Result ${index} validity:`, control.valid);
      if (control.invalid) {
        console.log(`Result ${index} errors:`, control.errors);
      }
    });
    
    if (this.waterTestForm.invalid) {
      this.waterTestForm.markAllAsTouched();
      console.log('Form is invalid, marking all as touched');

      // Notificación de error de validación
      this.notificationService.error(
        'Formulario Incompleto',
        'Por favor, complete todos los campos requeridos antes de guardar',
        5000
      );

      return;
    }

    console.log('Form is valid, proceeding with submission');
    this.isSaving = true;

    // Preparar los datos en el formato correcto
    const formValue = this.waterTestForm.value;

    if (this.mode === 'create') {
      const testData: QualityTestRequest = {
        // testCode se genera automáticamente en el backend
        organization: this.userOrganizationId,
        testedByUser: this.currentUserId,
        testingPointId: formValue.testingPointId,
        testDate: new Date().toISOString(),
        testType: formValue.testType,
        weatherConditions: formValue.weatherConditions,
        waterTemperature: formValue.waterTemperature || 0,
        generalObservations: formValue.generalObservations,
        status: formValue.status,
        results: formValue.results
      };

      // Notificación de inicio de guardado
      this.notificationService.info(
        'Guardando Análisis',
        'Procesando la información del análisis de calidad...',
        3000
      );

      this.submitTest.emit(testData);
    } else if (this.mode === 'edit' && this.qualityTest) {
      const testData: QualityTestRequest = {
        // testCode no se envía - se mantiene el existente en el backend
        organization: this.userOrganizationId,
        testedByUser: this.currentUserId,
        testingPointId: formValue.testingPointId,
        testDate: this.qualityTest.testDate || new Date().toISOString(),
        testType: formValue.testType,
        weatherConditions: formValue.weatherConditions,
        waterTemperature: formValue.waterTemperature || 0,
        generalObservations: formValue.generalObservations,
        status: formValue.status,
        results: formValue.results
      };

      // Notificación de inicio de actualización
      this.notificationService.info(
        'Actualizando Análisis',
        'Procesando las actualizaciones del análisis...',
        3000
      );

      this.updateTest.emit(testData);
    }

    this.isSaving = false;
  }

  // Getter para el título del modal
  get modalTitle(): string {
    return this.mode === 'create' ? 'Crear Nuevo Análisis de Calidad de Agua' : 'Editar Análisis de Calidad de Agua';
  }

  // Getter para el texto del botón
  get submitButtonText(): string {
    if (this.isSaving) {
      return this.mode === 'create' ? 'Guardando Análisis...' : 'Actualizando Análisis...';
    }
    return this.mode === 'create' ? 'Guardar Análisis' : 'Actualizar Análisis';
  }
}