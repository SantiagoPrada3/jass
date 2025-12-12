import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'admins',
    loadComponent: () => import('./components/organization-admins/organization-admins').then(m => m.OrganizationAdmins)
  },
  {
    path: 'branches',
    loadComponent: () => import('./components/organization-branches/organization-branches').then(m => m.OrganizationBranches)
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/system-settings/system-settings').then(m => m.SystemSettings)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrganizationManagementRoutingModule { }
