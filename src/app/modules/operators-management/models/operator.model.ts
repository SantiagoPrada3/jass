export interface Operator {
  id: string;
  userCode: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone?: string;
  address?: string;
  status: OperatorStatus;
  roles: string[];
  organizationId: string;
  organizationName?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  lastLoginAt?: string;
}

// Alias para mantener consistencia con el módulo de usuarios
export type User = Operator;

export enum OperatorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

export interface CreateOperatorRequest {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone?: string;
  address?: string;
  organizationId: string;
  roles: string[];
}

export interface UpdateOperatorPatchRequest {
  email?: string;
  phone?: string;
  address?: string;
  status?: OperatorStatus;
}

export interface OperatorCreationResponse {
  userInfo: {
    id: string;
    userCode: string;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    email: string;
    phone: string;
    address: string;
    roles: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  username: string;
  temporaryPassword: string;
  message: string;
  requiresPasswordChange: boolean;
}

// Respuesta de RENIEC para operadores
export interface ReniecResponse {
  first_name: string;
  first_last_name: string;
  second_last_name: string;
  full_name: string;
  document_number: string;
}
