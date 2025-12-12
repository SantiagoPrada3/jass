import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./components/payments-admin/payments-admin').then(m => m.PaymentsAdmin)
  },
  {
    path: 'client',
    loadComponent: () => import('./components/payments-client/payments-client').then(m => m.PaymentsClient)
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
export class PaymentsBillingRoutingModule { }
