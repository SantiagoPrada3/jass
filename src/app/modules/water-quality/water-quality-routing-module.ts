import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'chlorine',
    loadComponent: () => import('./components/chlorine-control/chlorine-control').then(m => m.ChlorineControl)
  },
  {
    path: 'analysis',
    loadComponent: () => import('./components/analysis-management/analysis-management').then(m => m.AnalysisManagement)
  },
  {
    path: 'points',
    loadComponent: () => import('./components/analysis-points/analysis-points').then(m => m.AnalysisPoints)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WaterQualityRoutingModule { }
