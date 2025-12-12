import { Component } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';

@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [Breadcrumb],
  templateUrl: './system-config.html',
  styleUrl: './system-config.css'
})
export class SystemConfig {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Inicio Global',
      url: '/super-admin/dashboard',
      icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Configuración Sistema',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
    }
  ];
}
