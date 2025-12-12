import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SchedulesManagement } from './schedules.component';
import { CreateScheduleModalComponent } from '../create-schedule-modal/create-schedule-modal.component';
import { UpdateScheduleModalComponent } from '../update-schedule-modal/update-schedule-modal.component';
import { ViewScheduleModalComponent } from '../view-schedule-modal/view-schedule-modal.component';
import { Breadcrumb } from '../../../../../shared/components/ui/breadcrumb/breadcrumb';
import { SCHEDULES_ROUTES } from './schedules.routes';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(SCHEDULES_ROUTES),
    FormsModule,
    SchedulesManagement,
    CreateScheduleModalComponent,
    UpdateScheduleModalComponent,
    ViewScheduleModalComponent,
    Breadcrumb
  ],
  exports: [
    SchedulesManagement
  ]
})
export class SchedulesModule { }