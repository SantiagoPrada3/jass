import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para la respuesta de la API de organizaciones
export interface OrganizationResponse {
     status: boolean;
     data: OrganizationData;
}

export interface OrganizationData {
     organizationId: string;
     organizationCode: string;
     organizationName: string;
     legalRepresentative: string;
     address: string;
     phone: string;
     status: 'ACTIVE' | 'INACTIVE';
     zones: Zone[];
}

export interface Zone {
     zoneId: string;
     organizationId: string;
     zoneCode: string;
     zoneName: string;
     description: string;
     status: 'ACTIVE' | 'INACTIVE';
     streets: Street[];
}

export interface Street {
     streetId: string;
     zoneId: string;
     streetCode: string;
     streetName: string;
     streetType: string;
     status: 'ACTIVE' | 'INACTIVE';
     createdAt: string;
}

@Injectable({
     providedIn: 'root'
})
export class DistributionOrganizationApi {
     private readonly baseUrl = environment.services.gateway;

     constructor(
          private http: HttpClient
     ) { }

     /**
      * Obtiene los datos completos de una organización por ID incluyendo zonas y calles
      * GET /management/organization/{organizationId}
      */
     getOrganizationById(organizationId: string): Observable<OrganizationResponse> {
          console.log(`🏢 [DistributionOrganizationApi] Obteniendo organización: ${organizationId}`);

          const url = `${this.baseUrl}/admin/organization/${organizationId}`;

          return this.http.get<OrganizationResponse>(url);
     }

     /**
      * Obtiene las zonas activas de una organización
      */
     getActiveZonesByOrganization(organizationId: string): Observable<Zone[]> {
          console.log(`🏗️ [DistributionOrganizationApi] Obteniendo zonas activas para organización: ${organizationId}`);

          return new Observable(observer => {
               this.getOrganizationById(organizationId).subscribe({
                    next: (response) => {
                         if (response.status && response.data?.zones) {
                              const activeZones = response.data.zones.filter(zone => zone.status === 'ACTIVE');
                              console.log(`✅ [DistributionOrganizationApi] ${activeZones.length} zonas activas encontradas`);
                              observer.next(activeZones);
                              observer.complete();
                         } else {
                              console.warn('⚠️ [DistributionOrganizationApi] No se encontraron zonas para la organización');
                              observer.next([]);
                              observer.complete();
                         }
                    },
                    error: (error) => {
                         console.error('❌ [DistributionOrganizationApi] Error obteniendo zonas:', error);
                         observer.error(error);
                    }
               });
          });
     }

     /**
      * Obtiene las calles activas de una zona específica
      */
     getActiveStreetsByZone(organizationId: string, zoneId: string): Observable<Street[]> {
          console.log(`🛣️ [DistributionOrganizationApi] Obteniendo calles activas para zona: ${zoneId}`);

          return new Observable(observer => {
               this.getOrganizationById(organizationId).subscribe({
                    next: (response) => {
                         if (response.status && response.data?.zones) {
                              const zone = response.data.zones.find(z => z.zoneId === zoneId);
                              if (zone?.streets) {
                                   const activeStreets = zone.streets.filter(street => street.status === 'ACTIVE');
                                   console.log(`✅ [DistributionOrganizationApi] ${activeStreets.length} calles activas encontradas en la zona`);
                                   observer.next(activeStreets);
                                   observer.complete();
                              } else {
                                   console.warn('⚠️ [DistributionOrganizationApi] No se encontraron calles para la zona');
                                   observer.next([]);
                                   observer.complete();
                              }
                         } else {
                              observer.next([]);
                              observer.complete();
                         }
                    },
                    error: (error) => {
                         console.error('❌ [DistributionOrganizationApi] Error obteniendo calles:', error);
                         observer.error(error);
                    }
               });
          });
     }
}
