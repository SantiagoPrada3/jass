// analysis-management.component.ts
import { Component, OnInit } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../../shared/components/ui/breadcrumb/breadcrumb';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface WaterTestResult {
  parameterId: string | null;
  parameterCode: string;
  measuredValue: number;
  unit: string;
  status: 'ACCEPTABLE' | 'NOT_ACCEPTABLE';
  observations: string;
}

interface WaterTest {
  id: string;
  organizationId: string;
  testingPointId: string;
  testCode: string;
  testDate: string;
  testType: string;
  testedByUserId: string;
  weatherConditions: string;
  waterTemperature: number;
  generalObservations: string;
  status: string;
  results: WaterTestResult[];
  createdAt: string;
  deletedAt: string | null;
}

@Component({
  selector: 'app-analysis-management',
  standalone: true,
  imports: [Breadcrumb, CommonModule, ReactiveFormsModule],
  templateUrl: './analysis-management.component.html',
  styleUrls: ['./analysis-management.component.css']
})
export class AnalysisManagement implements OnInit {
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Panel de Control', url: '/admin/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Calidad de Agua', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 004 21h16a8.014 8.014 0 00-.572-5.572zM7 9a2 2 0 11-4 0 2 2 0 014 0zM17 9a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Gestión de Análisis', icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2zm8 0h-2a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2z' }
  ];

  // Modal y formulario
  isAnalysisModalOpen: boolean = false;
  currentTestForm: FormGroup;
  isSaving: boolean = false;

  constructor(private fb: FormBuilder) {
    this.currentTestForm = this.fb.group({
      id: ['68c9c3001d737e385452ffa3'],
      organizationId: ['6896b2ecf3e398570ffd99d3'],
      testingPointId: ['68c8a3b11d737e385452ffa1'],
      testCode: ['ANL010', Validators.required],
      testDate: ['2025-09-16T20:02:00', Validators.required],
      testType: ['RUTINARIO', Validators.required],
      testedByUserId: [''],
      weatherConditions: ['NUBLADO'],
      waterTemperature: [17, Validators.required],
      generalObservations: [''],
      status: ['COMPLETED'],
      results: this.fb.array([this.createResultGroup()])
    });
  }

  ngOnInit(): void {}

  // FormArray de resultados
  get results(): FormArray {
    return this.currentTestForm.get('results') as FormArray;
  }

  createResultGroup(): FormGroup {
    return this.fb.group({
      parameterId: [null],
      parameterCode: ['', Validators.required],
      measuredValue: [null, Validators.required],
      unit: ['', Validators.required],
      status: ['ACCEPTABLE', Validators.required],
      observations: ['']
    });
  }

  addResult(): void {
    this.results.push(this.createResultGroup());
  }

  removeResult(index: number): void {
    this.results.removeAt(index);
  }

  openAnalysisModal(): void {
    this.isAnalysisModalOpen = true;
  }

  closeAnalysisModal(): void {
    this.isAnalysisModalOpen = false;
  }

  onSubmit(): void {
    if (this.currentTestForm.invalid) {
      this.currentTestForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    setTimeout(() => {
      this.isSaving = false;
      this.closeAnalysisModal();
    }, 1000);
  }
}
