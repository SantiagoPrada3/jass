import { Routes } from '@angular/router';
import { SchedulesManagement } from './schedules.component';

export const SCHEDULES_ROUTES: Routes = [
  {
    path: '',
    component: SchedulesManagement,
    data: { title: 'Gestión de Horarios' }
  }
];