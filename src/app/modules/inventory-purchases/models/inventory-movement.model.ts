// Modelos para los movimientos de inventario/kardex
export interface InventoryMovement {
     movementId: string;
     organizationId: string;
     productId: string;
     movementType: MovementType;
     movementReason: MovementReason;
     quantity: number;
     unitCost: number;
     referenceDocument?: string;
     referenceId?: string;
     previousStock: number;
     newStock: number;
     movementDate: string;
     userId: string;
     observations?: string;
     createdAt: string;
     // Información enriquecida del producto (se agregará desde el servicio)
     productInfo?: ProductInfo;
     // Información del usuario (se agregará desde el servicio)
     userInfo?: UserInfo;
}

export interface ProductInfo {
     productId: string;
     productCode: string;
     productName: string;
     categoryId?: string;
     categoryName: string; // ✅ Agregado
     category?: string; // Mantener por compatibilidad
     unitOfMeasure: string; // ✅ Cambiado de 'unit' a 'unitOfMeasure'
     unit?: string; // Mantener por compatibilidad
     minimumStock?: number; // ✅ Agregado
     maximumStock?: number; // ✅ Agregado
     currentStock?: number; // ✅ Agregado
     unitCost?: number; // ✅ Agregado
     status?: string; // ✅ Agregado
     description?: string;
}

export interface UserInfo {
     id: string;
     userCode: string;
     firstName: string;
     lastName: string;
     fullName: string;
     email: string;
     phone?: string; // ✅ Agregado
}

export enum MovementType {
     ENTRADA = 'ENTRADA',
     SALIDA = 'SALIDA'
}

export enum MovementReason {
     COMPRA = 'COMPRA',
     USO_INTERNO = 'USO_INTERNO',
     AJUSTE = 'AJUSTE',
     DEVOLUCION = 'DEVOLUCION',
     TRANSFERENCIA = 'TRANSFERENCIA'
}

// Configuración de colores y etiquetas para tipos de movimiento
export const MovementTypeConfig = {
     [MovementType.ENTRADA]: {
          label: 'Entrada',
          color: 'bg-green-100 text-green-800',
          icon: 'arrow-up',
          bgClass: 'bg-green-50'
     },
     [MovementType.SALIDA]: {
          label: 'Salida',
          color: 'bg-red-100 text-red-800',
          icon: 'arrow-down',
          bgClass: 'bg-red-50'
     }
};

// Configuración de colores y etiquetas para razones de movimiento
export const MovementReasonConfig = {
     [MovementReason.COMPRA]: {
          label: 'Compra',
          color: 'bg-blue-100 text-blue-800',
          icon: 'shopping-cart'
     },
     [MovementReason.USO_INTERNO]: {
          label: 'Uso Interno',
          color: 'bg-purple-100 text-purple-800',
          icon: 'home'
     },
     [MovementReason.AJUSTE]: {
          label: 'Ajuste',
          color: 'bg-yellow-100 text-yellow-800',
          icon: 'edit'
     },
     [MovementReason.DEVOLUCION]: {
          label: 'Devolución',
          color: 'bg-orange-100 text-orange-800',
          icon: 'undo'
     },
     [MovementReason.TRANSFERENCIA]: {
          label: 'Transferencia',
          color: 'bg-indigo-100 text-indigo-800',
          icon: 'exchange'
     }
};

// Filtros para movimientos de inventario
export interface InventoryMovementFilters {
     organizationId: string;
     searchTerm?: string;
     movementType?: MovementType;
     movementReason?: MovementReason;
     productId?: string;
     userId?: string;
     dateFrom?: string;
     dateTo?: string;
     page?: number;
     size?: number;
}

// Respuesta de la API
export interface InventoryMovementApiResponse {
     success: boolean;
     message?: string;
     data?: InventoryMovement[];
     error?: string;
}

// Estadísticas de movimientos
export interface InventoryMovementStats {
     totalMovements: number;
     totalEntries: number;
     totalExits: number;
     totalValue: number;
     averageValue: number;
     mostActiveProduct?: string;
     recentMovements: number;
}

// Para el enriquecimiento de datos
export interface EnrichedInventoryMovement extends InventoryMovement {
     productInfo: ProductInfo;
     userInfo: UserInfo;
     formattedDate: string;
     formattedCost: string;
     formattedValue: string;
}
