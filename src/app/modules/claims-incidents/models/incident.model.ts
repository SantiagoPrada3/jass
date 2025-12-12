export interface Incident {
  id: string;
  organizationId: string;
  incidentCode: string;
  incidentTypeId: string;
  incidentCategory: 'DISTRIBUCION' | 'CALIDAD_AGUA' | 'INFRAESTRUCTURA' | 'FACTURACION' | 'ATENCION_CLIENTE';
  zoneId: string;
  incidentDate: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  affectedBoxesCount: number;
  reportedByUserId: string;
  assignedToUserId?: string;
  resolved: boolean;
  recordStatus: 'ACTIVE' | 'INACTIVE';
  
  // Campos de resolución
  resolutionDate?: string;
  resolutionType?: 'REPARACION_COMPLETA' | 'REPARACION_TEMPORAL' | 'REEMPLAZO' | 'AJUSTE' | 'OTRO';
  actionsTaken?: string;
  materialsUsed?: MaterialUsed[];
  laborHours?: number;
  totalCost?: number;
  resolvedByUserId?: string;
  qualityCheck?: boolean;
  followUpRequired?: boolean;
  resolutionNotes?: string;
}

export interface MaterialUsed {
  productId: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface CreateIncidentRequest {
  incidentCode: string;
  title: string;
  description: string;
  incidentTypeId: string;
  incidentCategory: 'DISTRIBUCION' | 'CALIDAD_AGUA' | 'INFRAESTRUCTURA' | 'FACTURACION' | 'ATENCION_CLIENTE' | 'INFRASTRUCTURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reportedByUserId: string;
  assignedToUserId?: string;
  organizationId: string;
  zoneId: string;
  incidentDate: string;
  affectedBoxesCount: number;
  resolved: boolean;
  
  // Campos de resolución
  resolutionDate?: string;
  resolutionType?: 'REPARACION_COMPLETA' | 'REPARACION_TEMPORAL' | 'REEMPLAZO' | 'AJUSTE' | 'OTRO';
  actionsTaken?: string;
  materialsUsed?: MaterialUsed[];
  laborHours?: number;
  totalCost?: number;
  resolvedByUserId?: string;
  qualityCheck?: boolean;
  followUpRequired?: boolean;
  resolutionNotes?: string;
}

export interface UpdateIncidentRequest extends Partial<CreateIncidentRequest> {
  id: string;
  status?: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedToUserId?: string;
  recordStatus?: 'ACTIVE' | 'INACTIVE';
}

export interface IncidentResponse {
  data: Incident[];
  total: number;
  page: number;
  size: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  recordStatus?: 'ACTIVE' | 'INACTIVE';
}
