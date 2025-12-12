import { UserStatus } from './role.model';

export interface User {
     id: string;
     userCode: string;
     username: string;
     email: string;
     firstName: string;
     lastName: string;
     dni: string;
     phone?: string;
     address?: string;
     status: UserStatus;
     roles: string[];
     organizationId: string;
     createdAt: string;
     updatedAt?: string;
     deletedAt?: string;
     lastLoginAt?: string;
}

// Interfaces para objetos anidados según la respuesta del backend
export interface Organization {
     organizationId: string;
     organizationCode: string;
     organizationName: string;
     legalRepresentative: string;
     address: string;
     phone: string;
     status: string;
     logo?: string;
}

export interface Zone {
     zoneId: string;
     zoneCode: string;
     zoneName: string;
     description: string;
     status: string;
}

export interface Street {
     streetId: string;
     streetCode: string;
     streetName: string;
     streetType: string;
     status: string;
}

// Interfaz para la asignación de caja de agua
export interface WaterBoxAssignment {
     id: number | null;
     waterBoxId: number | null;
     userId: string | null;
     startDate: string | null;
     endDate: string | null;
     monthlyFee: number | null;
     status: string; // "ACTIVE" o "404" si no tiene caja
     createdAt: string | null;
     transferId: number | null;
     boxCode: string | null;
     boxType: string | null;
}

// Respuesta del backend que incluye objetos completos
export interface UserWithLocationResponse {
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
     organization: Organization;
     zone?: Zone;
     street?: Street;
     waterBoxAssignment?: WaterBoxAssignment; // Agregado para soporte de cajas de agua
}

export interface CreateUserRequest {
     firstName: string;
     lastName: string;
     documentType: string;
     documentNumber: string;
     email: string;
     phone?: string;
     address?: string;
     organizationId: string;
     zoneId: string;
     streetId: string;
     roles: string[];
}

export interface UpdateUserPatchRequest {
     email?: string;
     phone?: string;
     address?: string;
     streetAddress?: string; // Alias para address en el backend
     zoneId?: string;
     streetId?: string;
     status?: UserStatus;
}

// Respuesta de creación de usuario según el backend AdminRest.java
export interface UserCreationResponse {
     userInfo: UserWithLocationResponse;
     username: string;
     temporaryPassword: string;
     message: string;
     requiresPasswordChange: boolean;
}

// Respuesta de RENIEC según el backend real
export interface ReniecResponse {
     first_name: string;
     first_last_name: string;
     second_last_name: string;
     full_name: string;
     document_number: string;
}

// Interfaces para la respuesta completa de organizaciones
export interface OrganizationWithZones {
     organizationId: string;
     organizationCode: string;
     organizationName: string;
     legalRepresentative: string;
     address: string;
     phone: string;
     status: string;
     logo?: string;
     zones: ZoneWithStreets[];
}

export interface ZoneWithStreets {
     zoneId: string;
     organizationId: string;
     zoneCode: string;
     zoneName: string;
     description: string;
     status: string;
     streets: StreetWithDetails[];
}

export interface StreetWithDetails {
     streetId: string;
     zoneId: string;
     streetCode: string;
     streetName: string;
     streetType: string;
     status: string;
     createdAt: string;
}

export interface UserFilters {
     search?: string;
     status?: UserStatus;
     zone?: string;
     organizationId?: string;
     page?: number;
     size?: number;
}
