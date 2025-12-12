import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-reports/admin-reports').then(m => m.AdminReports)
  },
  {
    path: 'super-admin',
    loadComponent: () => import('./components/super-admin-reports/super-admin-reports').then(m => m.SuperAdminReports)
  },
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportTemplatesRoutingModule { }
