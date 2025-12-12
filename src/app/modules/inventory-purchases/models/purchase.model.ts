// Modelos actualizados para coincidir con la API real de compras
export interface Purchase {
     purchaseId: string;
     organizationId: string;
     purchaseCode: string;
     supplierId: string;
     supplierName: string;
     supplierCode: string;
     purchaseDate: string;
     deliveryDate: string;
     totalAmount: number;
     status: PurchaseStatus;
     requestedByUserId: string;
     approvedByUserId: string;
     invoiceNumber: string;
     observations: string;
     createdAt: string;
     details: PurchaseDetail[];
     requestedByUser?: UserInfo;
     organizationInfo?: OrganizationInfo;
}

export interface PurchaseDetail {
     purchaseDetailId: string;
     purchaseId: string;
     productId: string;
     productName: string;
     productCode: string;
     quantityOrdered: number;
     quantityReceived: number;
     unitCost: number;
     subtotal: number;
     observations: string;
}

export interface UserInfo {
     id: string;
     userCode: string;
     firstName: string;
     lastName: string;
     fullName: string;
     documentType: string;
     documentNumber: string;
     email: string;
     phone?: string;
     address?: string;
     roles: string[];
     status: string;
}

export interface OrganizationInfo {
     organizationId: string;
     organizationCode: string;
     organizationName: string;
     address?: string;
     phone?: string;
     legalRepresentative?: string;
     logo?: string;
     status: string;
}

export enum PurchaseStatus {
     PENDIENTE = 'PENDIENTE',
     AUTORIZADO = 'AUTORIZADO',
     COMPLETADO = 'COMPLETADO',
     CANCELADO = 'CANCELADO'
}

export interface PurchaseRequest {
     organizationId: string;
     purchaseCode?: string;
     supplierId: string;
     purchaseDate: string;
     deliveryDate?: string;
     requestedByUserId: string;
     invoiceNumber?: string;
     observations?: string;
     status?: PurchaseStatus;
     details: PurchaseDetailRequest[];
}

export interface PurchaseDetailRequest {
     productId: string;
     quantity: number;
     unitPrice: number;
     observations?: string;
}

// Interfaz específica para crear nuevas compras (coincide con la API)
export interface CreatePurchaseRequest {
     organizationId: string;
     purchaseCode: string;
     supplierId: string;
     purchaseDate: string;
     deliveryDate: string;
     requestedByUserId: string;
     invoiceNumber: string;
     observations: string;
     status: string;
     details: CreatePurchaseDetailRequest[];
}

export interface CreatePurchaseDetailRequest {
     productId: string;
     quantityOrdered: number;
     unitCost: number;
     observations: string;
}

export interface PurchaseStatusUpdateRequest {
     status: PurchaseStatus;
}

// Respuesta específica de la API de compras (usa 'status' en lugar de 'success')
export interface PurchaseApiResponse<T = any> {
     status: boolean;
     message?: string;
     data?: T;
     error?: string;
}

// Interfaz para el response con información enriquecida
export interface PurchaseWithUserDetailsResponse extends Purchase {
     requestedByUser?: UserInfo;
     organizationInfo?: OrganizationInfo;
}

// Filtros para compras
export interface PurchaseFilters {
     organizationId: string;
     status?: PurchaseStatus;
     supplierId?: string;
     dateFrom?: string;
     dateTo?: string;
     searchTerm?: string;
     page?: number;
     size?: number;
}

// Para mapeo de estados con etiquetas y colores
export const PurchaseStatusConfig = {
     [PurchaseStatus.PENDIENTE]: {
          label: 'Pendiente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: 'clock'
     },
     [PurchaseStatus.AUTORIZADO]: {
          label: 'Autorizado',
          color: 'bg-blue-100 text-blue-800',
          icon: 'check'
     },
     [PurchaseStatus.COMPLETADO]: {
          label: 'Completado',
          color: 'bg-green-100 text-green-800',
          icon: 'check-circle'
     },
     [PurchaseStatus.CANCELADO]: {
          label: 'Cancelado',
          color: 'bg-gray-100 text-gray-800',
          icon: 'ban'
     }
};

// Interfaz para actualizar estado de compra
export interface PurchaseStatusUpdateRequest {
     status: PurchaseStatus;
     approvedByUserId?: string;
     observations?: string;
}

// Interfaz para estadísticas de compras
export interface PurchaseStats {
     totalPurchases: number;
     pendingPurchases: number;
     approvedPurchases: number;
     completedPurchases: number;
     totalAmount: number;
     averageAmount: number;
}
