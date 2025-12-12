export interface PurchaseOrder {
     id: string;
     code: string;
     organizationId: string;
     requestedByUserId: string;
     requestedByUserName?: string;
     requestedByUserEmail?: string;
     organizationName?: string;
     supplierId: string;
     supplierName?: string;
     purchaseDate: string;
     expectedDeliveryDate?: string;
     actualDeliveryDate?: string;
     status: PurchaseStatus;
     subtotal: number;
     tax: number;
     total: number;
     notes?: string;
     items: PurchaseOrderItem[];
     createdAt: string;
     updatedAt: string;
}

export interface PurchaseOrderItem {
     id: string;
     productId: string;
     productName?: string;
     productCode?: string;
     quantity: number;
     unitPrice: number;
     subtotal: number;
}

export enum PurchaseStatus {
     PENDING = 'PENDING',
     APPROVED = 'APPROVED',
     ORDERED = 'ORDERED',
     RECEIVED = 'RECEIVED',
     CANCELLED = 'CANCELLED'
}

export interface InventoryMovement {
     id: string;
     type: MovementType;
     productId: string;
     productName?: string;
     productCode?: string;
     quantity: number;
     unitPrice?: number;
     totalValue?: number;
     reason: string;
     performedBy: string;
     performedAt: string;
     organizationId: string;
     reference?: string;
     notes?: string;
}

export enum MovementType {
     INCOMING = 'INCOMING',
     OUTGOING = 'OUTGOING',
     ADJUSTMENT = 'ADJUSTMENT',
     CONSUMPTION = 'CONSUMPTION'
}
