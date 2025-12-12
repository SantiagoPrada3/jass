export interface Payment {
  paymentId: string;
  organizationId: string;
  paymentCode: string;
  userId: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: number; // Cambiado a number para consistencia
  paymentDate: string;
  paymentStatus: string;
  externalReference?: string; // Opcional
  createdAt: string;
  updatedAt: string;
  // Campos adicionales para compatibilidad con el componente
  organizationName?: string;
  organizationLogo?: string;
  userName?: string;
  email?: string;
  userDocument?: string;
  userAddress?: string;
  boxCode?: string;
  details?: PaymentDetail[];
}

export interface PaymentDetail {
  paymentDetailId: string;
  paymentId: string;
  concept: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  periodStart: string;
  periodEnd: string;
}

// Respuesta del backend que incluye objeto completos
export interface PaymentEnrichedResponse {
  paymentId: string;
  organizationId: string;
  organizationName: string;
  organizationLogo: string;
  paymentCode: string;
  userId: string;
  userName: string;
  userAddress: string;
  fareAmount: string;
  userDocument: string;
  email: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: number;
  paymentDate: string;
  paymentStatus: string;
  externalReference?: string;
  createdAt: string;
  updatedAt: string;
  PaymentDtail: PaymentDetail[]; // Mantengo el nombre del backend
  details?: PaymentDetail[]; // Alias para compatibilidad con el componente
}

// Solicita creación de pago según el backend AdminRest.java
export interface CreatePaymentRequest {
  organizationId: string;
  paymentCode: string;
  userId: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: string;
  paymentDate: string;
  paymentStatus: string;
  externalReference?: string; // Opcional
  PaymentDetail: CreatePaymentDtailRequest[];
}

// Solicita creación de pago al detalle según el backend AdminRest.java
export interface CreatePaymentDtailRequest {
  paymentId: string;
  concept: string;
  year: string;
  month: string;
  amount: string;
  description: string;
  periodStart: string;
  periodEnd: string;
}

export interface Organization {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  organizationLogo: string;
}

export interface User {
  userId: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  userAddress: string;
  userDocument: string;
}

export interface waterBox {
  waterBoxId: string;
  assignedWaterBoxId: string;
  boxCode: string;
}

export interface PaymentStats {
  totalPayments: number;
  activePayments: number;
  showing: number;
}
