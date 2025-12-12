import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./components/inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboard)
  },
  {
    path: 'products',
    loadComponent: () => import('./components/products-list/products-list').then(m => m.ProductsList)
  },
  {
    path: 'purchases',
    loadComponent: () => import('./components/purchases-list/purchases-list').then(m => m.PurchasesList)
  },
  {
    path: 'categories',
    loadComponent: () => import('./components/categories/categories.component').then(m => m.CategoriesComponent)
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./components/suppliers/suppliers.component').then(m => m.SuppliersComponent)
  },
  {
    path: 'kardex',
    loadComponent: () => import('./components/kardex-movements/kardex-movements').then(m => m.KardexMovements)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryPurchasesRoutingModule { }
