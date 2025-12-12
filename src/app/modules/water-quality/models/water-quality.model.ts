/* eslint-disable */
// ============================================================================
// BASE INTERFACES (from nested objects in your JSON)
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BasicOrganization {
  organizationName: string | null;
  organizationCode: string | null;
  organizationId: string | null;
  status: string | null;
  address: string | null;
  phone: string | null;
  legalRepresentative: string | null;
}

export interface BasicUser {
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
  organization: BasicOrganization;
  zone: BasicZone;
  street: BasicStreet;
}

export interface BasicZone {
  zoneCode: string;
  zoneId: string;
  status: string;
  zoneName: string;
  description: string;
}

export interface BasicStreet {
  status: string;
  streetCode: string;
  streetId: string;
  streetType: string;
  streetName: string;
}

// ============================================================================
// CORE ENTITY: TestingPoint
// ============================================================================

export interface TestingPoint {
  id: string;
  pointCode: string;
  pointName: string;
  pointType: 'DOMICILIO' | 'PUBLICO' | 'RESERVORIO';
  zoneId: string;
  locationDescription: string;
  street: BasicStreet | null;
  coordinates: Coordinates;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  organization: BasicOrganization;

  // UI-specific properties
  isEditing?: boolean;
  originalData?: TestingPoint;
}

// ============================================================================
// CORE ENTITY: WaterTest
// ============================================================================

export interface WaterTestResult {
  parameterId: string | null;
  parameterCode: string;
  measuredValue: number;
  unit: string;
  status: 'ACCEPTABLE' | 'REJECTED';
  observations: string;
}

export interface WaterTest {
  id: string;
  organizationId: string;
  testCode: string;
  testingPointId: string;
  testDate: string;
  testType: 'RUTINARIO' | 'EMERGENCIA';
  testedByUserId: string;
  weatherConditions: 'SOLEADO' | 'NUBLADO' | 'LLUVIOSO';
  waterTemperature: number;
  generalObservations: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  results: WaterTestResult[];
  createdAt: string;
  deletedAt: string | null;
}

// ============================================================================
// CORE ENTITY: DailyRecord
// ============================================================================

export interface DailyRecord {
  id: string;
  recordCode: string;
  testingPointIds: string[];
  recordDate: string;
  level: number;
  acceptable: boolean;
  actionRequired: boolean;
  observations: string;
  amount: number;
  recordType: 'CLORO' | 'OTRO_TIPO'; // Assuming there could be others
  createdAt: string;
  organization: BasicOrganization;
  recordedByUser: BasicUser;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface ApiResponse<T> {
  status: boolean;
  data: T;
  message?: string;
}
