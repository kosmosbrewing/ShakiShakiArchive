// src/types/api.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  totalAmount: string; // 백엔드에서 Decimal/String으로 올 가능성 대비
  status:
    | "pending_payment"
    | "payment_confirmed"
    | "preparing"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string;
  // 필요한 경우 OrderItem 등 추가 정의
}
