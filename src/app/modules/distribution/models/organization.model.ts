export interface Street {
  streetId: string;
  zoneId: string;
  streetCode: string;
  streetName: string;
  streetType: 'Calle' | 'Avenida' | 'Jirón' | 'Pasaje';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  // Propiedades para UI
  isEditing?: boolean;
  originalData?: any;
}

export interface OrganizationResponse{
  status: boolean;
  data: OrganizationData;
}


export interface OrganizationData {
     organizationId: string;
     organizationCode: string;
     organizationName: string;
     logo:string;
     createdAt:string;
    updatedAt:string; 
     legalRepresentative: string;
     address: string;
     phone: string;
     status: 'ACTIVE' | 'INACTIVE';
     zones: Zone[];
}
export interface CreateStreetRequest {
  zoneId: string;
  streetName: string;
  streetType: 'Calle' | 'Avenida' | 'Jirón' | 'Pasaje';
  status: 'ACTIVE' | 'INACTIVE';
}


export interface Zone {
  zoneId: string;
  organizationId: string;
  zoneCode: string;
  zoneName: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  streets: Street[];
  // Propiedades para UI
  isEditing?: boolean;
  originalData?: any;
}

export interface ZoneCreateRequest {
  organizationId: string;
  zoneName: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Organization {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  legalRepresentative: string;
  address: string;
  phone: string;
  logo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  zones: Zone[];
  street:Street[];
  admins?: Admin[];
}

export interface Admin {
  adminId: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  organizationId: string;
  streetId?: string;
  zoneId?: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface OrganizationApiResponse {
  status: boolean;
  data: Organization[];
}

export interface SingleOrganizationApiResponse {
  status: boolean;
  data: Organization;
}

export interface CreateOrganizationRequest {
  organizationName: string;
  legalRepresentative: string;
  address: string;
  phone: string;
  logo: string | null;
  status: string;
}

export interface UpdateOrganizationRequest {
  organizationName: string;
  legalRepresentative: string;
  address: string;
  phone: string;
  logo: string | null;
  status: string;
}

// Respuesta de RENIEC según el backend real
export interface ReniecResponse {
     first_name: string;
     first_last_name: string;
     second_last_name: string;
     full_name: string;
     document_number: string;
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
}

// Respuesta de creación de usuario según el backend AdminRest.java
export interface AdminCreationResponse {
     userInfo: UserWithLocationResponse;
     username: string;
     temporaryPassword: string;
     message: string;
     requiresPasswordChange: boolean;
}

export interface CreateAdminRequest {
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

export interface UpdateAdminPatchRequest {
     email?: string;
     phone?: string;
     address?: string;
     streetAddress?: string; // Alias para address en el backend
     zoneId?: string;
     streetId?: string;
     status?: AdminStatus;
}
export enum AdminStatus {
     ACTIVE = 'ACTIVE',
     INACTIVE = 'INACTIVE',
     PENDING = 'PENDING',
     SUSPENDED = 'SUSPENDED'
}
