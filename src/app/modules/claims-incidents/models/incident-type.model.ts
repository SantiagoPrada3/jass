export interface IncidentType {
  id: string;
  organizationId: string | null;
  typeCode: string;
  typeName: string;
  description: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedResolutionTime: number; // en horas
  requiresExternalService: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateIncidentTypeRequest {
  organizationId?: string;
  typeCode: string;
  typeName: string;
  description: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedResolutionTime: number;
  requiresExternalService: boolean;
}

export interface UpdateIncidentTypeRequest extends Partial<CreateIncidentTypeRequest> {
  id: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface IncidentTypeResponse {
  data: IncidentType[];
  total: number;
  page: number;
  size: number;
}