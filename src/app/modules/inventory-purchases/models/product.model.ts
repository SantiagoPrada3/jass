// Modelo actualizado para coincidir con la API real
export interface Product {
     productId: string;
     organizationId: string;
     productCode: string;
     productName: string;
     categoryId: string;
     categoryName: string;
     unitOfMeasure: string;
     minimumStock: number;
     maximumStock: number;
     currentStock: number;
     unitCost: number;
     status: ProductStatus;
     createdAt: string;
     updatedAt: string;
}

export enum ProductStatus {
     ACTIVO = 'ACTIVO',
     INACTIVO = 'INACTIVO',
     DESCONTINUADO = 'DESCONTINUADO'
}

export interface ProductRequest {
     organizationId: string;
     productCode: string;
     productName: string;
     categoryId: string;
     unitOfMeasure: string;
     minimumStock: number;
     maximumStock: number;
     currentStock: number;
     unitCost: number;
}

export interface ProductResponse {
     status: boolean;
     data: Product[] | Product;
     message?: string;
}

// Interfaz para compatibilidad con código existente
export interface ProductLegacy {
     id: string;
     code: string;
     name: string;
     description?: string;
     category: string;
     unit: string;
     minStock: number;
     maxStock: number;
     currentStock: number;
     unitPrice: number;
     isActive: boolean;
     supplierId?: string;
     supplierName?: string;
     createdAt: string;
     updatedAt: string;
}

export interface ProductCategory {
     id: string;
     name: string;
     description?: string;
     productsCount: number;
}

export interface Supplier {
     supplierId: string;
     organizationId: string;
     supplierCode: string;
     supplierName: string;
     contactPerson?: string;
     email?: string;
     phone?: string;
     address?: string;
     status: boolean;
     createdAt?: string;
     updatedAt?: string;
}

// Filtros para productos
export interface ProductFilters {
     organizationId: string;
     status?: ProductStatus;
     categoryId?: string;
     searchTerm?: string;
     page?: number;
     size?: number;
}

// Para paginación si es necesario
export interface PageableResponse<T> {
     content: T[];
     totalElements: number;
     totalPages: number;
     size: number;
     number: number;
     first: boolean;
     last: boolean;
}
