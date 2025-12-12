
import { OrganizationInfo, StreetInfo, ZoneInfo } from "./quality-test.model";

// Main interface for the daily chlorine record
export interface ChlorineRecord {
    id: string;
    recordCode: string;
    testingPoints: any[]; // Assuming a structure, but using any[] for now as it's empty in the example.
    recordDate: string;
    level: number;
    acceptable: boolean;
    actionRequired: boolean;
    observations: string;
    amount: number;
    recordType: string;
    createdAt: string;
    organization: OrganizationInfo;
    recordedByUser: RecordedByUser;
}

// Interface for the user who recorded the data
export interface RecordedByUser {
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
    organization: OrganizationInfo;
    zone: ZoneInfo;
    street: StreetInfo;
}

// Interface for creating a new chlorine record
export interface ChlorineRecordRequest {
    organizationId: string;
    recordedByUserId: string;
    testingPointId: string; // Assuming a single point for creation
    recordDate: string;
    level: number;
    acceptable: boolean;
    actionRequired: boolean;
    observations: string;
    amount: number;
    recordType: string;
}
