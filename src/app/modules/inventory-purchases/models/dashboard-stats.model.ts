// Interfaces para las estadísticas del dashboard de inventario
export interface DashboardStats {
     totalProducts: number;
     totalPurchases: number;
     totalMovements: number;
     totalSuppliers: number;
     totalValue: number;
     lowStockProducts: number;
     pendingPurchases: number;
     recentMovements: number;
}

export interface ProductStats {
     totalProducts: number;
     lowStockProducts: number;
     outOfStockProducts: number;
     activeProducts: number;
     totalCategories: number;
}

export interface PurchaseStats {
     totalPurchases: number;
     totalValue: number;
     pendingPurchases: number;
     completedPurchases: number;
     averagePurchaseValue: number;
}

export interface MovementStats {
     totalMovements: number;
     incomingMovements: number;
     outgoingMovements: number;
     consumptionMovements: number;
     adjustmentMovements: number;
}

export interface SupplierStats {
     totalSuppliers: number;
     activeSuppliers: number;
     inactiveSuppliers: number;
}

export interface DashboardResponse {
     success: boolean;
     data: DashboardStats;
     message: string;
}

export interface RecentActivity {
     id: string;
     type: 'purchase' | 'movement' | 'adjustment';
     description: string;
     date: string;
     value?: number;
     status: 'completed' | 'pending' | 'cancelled';
}

export interface TopProduct {
     id: string;
     name: string;
     currentStock: number;
     minStock: number;
     maxStock: number;
     totalMovements: number;
     category: string;
}

export interface ChartData {
     labels: string[];
     data: number[];
     colors?: string[];
}
