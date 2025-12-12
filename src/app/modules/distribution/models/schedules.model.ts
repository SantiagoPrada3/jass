import { DaysOfWeek, Status } from "./api-response.model";

// SCHEDULES
export interface Schedule {
  id: string;
  scheduleCode: string;
  scheduleName: string;
  daysOfWeek: string[]; // Cambiado de DaysOfWeek[] a string[]
  startTime: string;
  endTime: string;
  durationHours: number;
  organizationId: string;
  zoneId: string;
  streetId: string;
  status: Status;
}

// Respuesta del backend que incluye objeto completos
export interface EnrichedDistributionScheduleResponse {
  id: string;
  organizationId: string;
  organizationName: string;
  scheduleCode: string;
  zoneId: string;
  streetId: string;
  scheduleName: string;
  daysOfWeek: DaysOfWeek[];
  startTime: string;
  endTime: string;
  durationHours: number;
  status: string;
  createdAt: string;
}

// Solicita creación de horarios según el backend AdminRest.java
export interface DistributionScheduleCreateRequest {
  organizationId: string;
  scheduleId?: string; // Opcional para creación, requerido para actualización
  scheduleCode?: string; // Opcional ya que el backend lo genera
  zoneId: string;
  streetId: string;
  scheduleName: string;
  daysOfWeek: string[]; // Cambiado de DaysOfWeek[] a string[]
  startTime: string;
  endTime: string;
  durationHours: number;
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