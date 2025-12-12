import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'routes',
    loadComponent: () => import('./components/routes-management/routes-list/routes-list').then(m => m.RoutesList)
  },
  {
    path: 'schedules',
    loadComponent: () => import('./components/schedules-management/schedules/schedules.component').then(m => m.SchedulesManagement)
  },
  {
    path: 'programming',
    loadComponent: () => import('./components/programming-management/programming-list/programming-list').then(m => m.ProgrammingList)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DistributionRoutingModule { }