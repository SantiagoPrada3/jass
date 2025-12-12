// Quality Test
export interface QualityTest {
    id: string;
    testCode: string;
    testingPointId: TestingPoints[];
    testDate: string;
    testType: string;
    weatherConditions: string;
    waterTemperature: number;
    generalObservations: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    results: TestResults[];
    organization: OrganizationInfo;
    testedByUser: TestedByUser;
}

export interface TestedByUser {
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
    status: 'ACTIVE' | string;
    createdAt: string;
    updatedAt: string;
    organization: OrganizationInfo;
    zone: ZoneInfo;
    street: StreetInfo;
}

export interface TestResults {
    parameterCode: string; // Cambio: parameterId → parameterCode
    parameterName?: string; // Opcional - puede no enviarse al backend
    measuredValue: number;
    unit: string;
    observations: string;
    status: StatusResult;
}

export interface QualityTestRequest {
    testCode?: string; // Opcional - se genera automáticamente en el backend
    organization: string; // Cambio: organizationId → organization
    testedByUser: string; // Cambio: testedByUserId → testedByUser
    testingPointId: string[];
    testDate: string;
    testType: TestType;
    weatherConditions: string;
    waterTemperature: number;
    generalObservations: string;
    status: string;
    results: TestResults[];
}

export interface QualityTestResponse {
    id: string;
    testCode: string;
    testingPointId: TestingPoints[];
    testDate: string;
    testType: string;
    weatherConditions: string;
    waterTemperature: number;
    generalObservations: string;
    dailyRecords: DailyRecord[];
    createdAt: Date;
    updatedAt: Date;
    status: string;
    results: TestResults[];
    organization: OrganizationInfo;
    testedByUser: TestedByUser;
}


export enum StatusResult {
    ACCEPTABLE = 'ACCEPTABLE',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL'
}

// ENUM TESTTYPE
export enum TestType {
    RUTINARIO = 'RUTINARIO',
    ESPECIAL = 'ESPECIAL',
    INCIDENCIA = 'INCIDENCIA'
}

//X si acaso borrar en caso de no usar
export enum Status {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}
//Daily Records
export interface DailyRecord {

}

// Puntos de Prueba
export interface TestingPoints {
    id: string;
    organizationId: string;
    pointCode: string;
    pointName: string;
    pointType: string;
    zoneId: string;
    locationDescription: string;
    street: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    status: string;
    createdAt: string;
    updatedAt: string;
}

// External model info necesary transform json enriquesido

export interface ZoneInfo {
    zoneId: string;
    zoneCode: string;
    zoneName: string;
    status: 'ACTIVE' | string;
}

export interface StreetInfo {
    status: 'ACTIVE' | string;
    streetCode: string;
    streetId: string;
    streetType: string;
    streetName: string;
}
export interface OrganizationInfo {
    organizationName: string;
    organizationCode: string;
    organizationId: string;
    status: 'ACTIVE' | string;
    address: string;
    phone: string;
    legalRepresentative: string;
}
