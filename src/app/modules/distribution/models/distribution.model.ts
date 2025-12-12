import { ProgramStatus } from "./api-response.model";

// DISTRIBUTION PROGRAMS
export interface DistributionProgram {
  id: string;
  organizationId: string;
  programCode: string;
  scheduleId: string;
  routeId: string;
  programDate: string; // formato YYYY-MM-DD
  plannedStartTime: string; // "08:00"
  plannedEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  status: ProgramStatus;
  responsibleUserId: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
  zoneId?: string;
  streetId?: string; // Cambiado de number a string para consistencia
  // Campo para identificar programas eliminados
  deleted?: boolean;
}

// Respuesta del backend que incluye objeto completos
export interface EnrichedDistributionProgramResponse {
  id: string;
  organizationId: string;
  organizationName: string;
  programCode: string;
  scheduleId: string;
  scheduleName: string;
  routeId: string;
  routeName: string;
  zoneId: string;
  zoneName: string;
  streetId: string;
  streetName: string;
  programDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime: string;
  actualEndTime: string;
  status: ProgramStatus;
  responsibleUserId: string;
  responsibleUserName: string;
  observations: string;
  createdAt: string;
}

// Solicita creación de programas según el backend AdminRest.java
export interface DistributionProgramCreateRequest {
  organizationId: string;
  programCode?: string; // OPCIONAL - El backend lo genera automáticamente
  scheduleId: string;
  routeId: string;
  zoneId: string;
  streetId: string; // Cambiado de number a string para consistencia
  programDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime?: string | null; // Campo opcional para horas reales, puede ser null
  actualEndTime?: string | null;   // Campo opcional para horas reales, puede ser null
  responsibleUserId: string;
  observations: string;
}

export interface Organization {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
}

export interface Schedule {
  scheduleId: string;
  scheduleCode: string;
  scheduleName: string;
}

export interface Route {
  routeId: string;
  routeCode: string;
  routeName: string;
}

export interface Zone {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
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
