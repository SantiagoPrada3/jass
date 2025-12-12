import { Component } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [Breadcrumb],
  templateUrl: './service-requests.html',
  styleUrl: './service-requests.css'
})
export class ServiceRequests {
  breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Mi Inicio',
      url: '/client/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      label: 'Solicitudes de Servicio',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    }
  ];
}
