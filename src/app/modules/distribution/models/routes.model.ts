import { Status } from "./api-response.model";

// ROUTES
export interface Route {
  id: string;
  organizationId: string;
  routeCode: string;
  routeName: string;
  zones: RouteZone[];
  totalEstimatedDuration: number;
  responsibleUserId: string;
  status: Status;
  createdAt: string;
}

export interface RouteZone {
  zoneId: string;
  order: number;
  estimatedDuration: number;
}

// Respuesta del backend que incluye objeto completos
export interface EnrichedDistributionRouteResponse {
  id: string;
  organizationId: string;
  organizationName: string;
  routeCode: string;
  routeName: string;
  zones: RouteZone[];
  totalEstimatedDuration: number;
  responsibleUserId: string;
  status: string;
  createdAt: string;
}

// Solicitud creación de rutas según el backend AdminRest.java
export interface DistributionRouteCreateRequest {
  organizationId: string;
  routeName: string;
  zones: RouteZoneCreateRequest[];
  totalEstimatedDuration: number;
  responsibleUserId?: string; // Hacer opcional por ahora
}

export interface RouteZoneCreateRequest {
  zoneId: string;
  order: number;
  estimatedDuration: number;
}

export interface Organization {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
}

export interface Street {
  streetId: string;
  streetCode: string;
  streetName: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
}