/**
 * Material usado en la resolución
 */
export interface MaterialUsed {
  productId: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

/**
 * Tipos de resolución disponibles
 */
export type ResolutionType = 
  | 'REPARACION_COMPLETA' 
  | 'REPARACION_PARCIAL' 
  | 'REEMPLAZO' 
  | 'MANTENIMIENTO' 
  | 'OTRO';

/**
 * Modelo de Resolución de Incidencia
 */
export interface IncidentResolution {
  id: string;
  incidentId: string;
  resolutionDate: string;
  resolutionType: ResolutionType;
  actionsTaken: string;
  materialsUsed: MaterialUsed[];
  laborHours: number;
  totalCost: number;
  resolvedByUserId: string;
  qualityCheck: boolean;
  followUpRequired: boolean;
  resolutionNotes?: string;
  createdAt: string;
}

/**
 * Request para crear una resolución
 */
export interface CreateIncidentResolutionRequest {
  incidentId: string;
  resolutionDate: string;
  resolutionType: ResolutionType;
  actionsTaken: string;
  materialsUsed: MaterialUsed[];
  laborHours: number;
  totalCost: number;
  resolvedByUserId: string;
  qualityCheck: boolean;
  followUpRequired: boolean;
  resolutionNotes?: string;
}

/**
 * Request para actualizar una resolución
 * Nota: El id se envía en la URL, no en el body
 */
export interface UpdateIncidentResolutionRequest {
  incidentId: string;
  resolutionDate: string;
  resolutionType: ResolutionType;
  actionsTaken: string;
  materialsUsed: MaterialUsed[];
  laborHours: number;
  totalCost: number;
  resolvedByUserId: string;
  qualityCheck: boolean;
  followUpRequired: boolean;
  resolutionNotes?: string;
}
