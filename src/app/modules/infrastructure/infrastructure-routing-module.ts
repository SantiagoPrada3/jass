import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'management',
    loadComponent: () => import('./components/supplies-management/supplies-management').then(m => m.SuppliesManagementComponent)
  },
  {
    path: 'assignment',
    loadComponent: () => import('./components/supplies-assignment/supplies-assignment').then(m => m.SuppliesAssignmentComponent)
  },
  {
    path: 'transfer',
    loadComponent: () => import('./components/supplies-transfer/supplies-transfer').then(m => m.SuppliesTransferComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InfrastructureRoutingModule { }
