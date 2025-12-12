// Modelos para infraestructura - cajas de agua

export enum BoxType {
  CAÑO = 'CAÑO',
  BOMBA = 'BOMBA',
  OTRO = 'OTRO',
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface WaterBox {
  id: number;
  organizationId: string;
  boxCode: string;
  boxType: BoxType;
  installationDate: string; // ISO date
  currentAssignmentId?: number;
  status: Status;
  createdAt: string; // ISO date-time
  updatedAt?: string; // ISO date-time
  organizationName?: string; // Nombre de la organización
}

export interface WaterBoxAssignment {
  id: number;
  waterBoxId: number;
  userId: string;
  username?: string; // Nombre del usuario asociado
  startDate: string; // ISO date-time
  endDate?: string; // ISO date-time
  monthlyFee: number;
  status: Status;
  createdAt: string; // ISO date-time
  updatedAt?: string; // ISO date-time
  transferId?: number;
}

export interface WaterBoxTransfer {
  id: number;
  waterBoxId: number;
  oldAssignmentId: number;
  newAssignmentId: number;
  transferReason: string;
  documents?: string[] | null;
  createdAt: string; // ISO date-time
  status: Status; // Estado de la transferencia
  // Propiedades auxiliares para mostrar en la UI (opcional)
  oldAssignmentUsername?: string;
  newAssignmentUsername?: string;
}
