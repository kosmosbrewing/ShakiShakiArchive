// src/types/api.ts

// 주문 상태 타입
export type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

// 결제 제공자 타입 (PG사 통합)
export type PaymentProvider = "toss" | "naverpay" | "kakaopay" | string;

// 결제 방법 타입
export type PaymentMethod = "card" | "transfer" | "naverpay" | "kakaopay" | string;

// 사용자 정보
export interface User {
  id: string;
  email: string;
  userName: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  phone: string;
  emailOptIn: boolean;
  profileImageUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// 상품 정보
export interface Product {
  id: string; // UUID
  name: string;
  price: string;
  originalPrice?: string;
  description?: string;
  imageUrl: string;
  images?: string[];
  detailImages?: string[];
  isAvailable: boolean;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
}

// 상품 옵션(사이즈/색상)
export interface ProductVariant {
  id: number; // serial (옵션은 serial 유지)
  productId: string; // UUID
  size: string;
  color?: string;
  stockQuantity: number;
  isAvailable: boolean;
}

// 사이즈 측정 정보
export interface SizeMeasurement {
  id: number;
  variantId: number;
  variantSize?: string;
  totalLength?: number;
  shoulderWidth?: number;
  chestSection?: number;
  sleeveLength?: number;
  waistSection?: number;
  hipSection?: number;
  thighSection?: number;
}

// 장바구니 아이템
export interface CartItem {
  id: string; // UUID
  userId: string; // UUID
  productId: string; // UUID
  variantId?: number; // serial (옵션은 serial 유지)
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

// 주문 아이템
export interface OrderItem {
  id: number; // serial
  orderId: string; // UUID
  productId: string; // UUID
  productName: string;
  productPrice: string;
  options?: string; // 옵션 정보 (사이즈/색상 등)
  quantity: number;
  status: OrderStatus;
  trackingNumber?: string;
  product?: Product;
  createdAt?: string;
}

// 주문 정보
export interface Order {
  id: string; // UUID
  userId: string; // UUID
  totalAmount: string;
  status: OrderStatus;
  // 배송 정보
  shippingName: string;
  shippingPhone: string;
  shippingPostalCode: string;
  shippingAddress: string;
  shippingDetailAddress?: string; // 상세 주소 (NEW)
  shippingRequestNote?: string; // 배송 요청사항 (NEW)
  trackingNumber?: string;
  // 결제 정보 (PG사 통합)
  paymentProvider?: PaymentProvider; // 'toss', 'naverpay', 'kakaopay' 등
  paymentKey?: string; // PG사 결제 고유 키
  externalOrderId?: string; // PG사 주문 ID
  paymentMethod?: PaymentMethod; // 'card', 'transfer' 등
  paidAt?: string; // 결제 완료 시각
  canceledAt?: string; // 취소 시각
  cancelReason?: string; // 취소 사유
  refundedAmount?: string; // 환불 금액
  // 주문 상품
  orderItems?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

// 배송지 정보
export interface DeliveryAddress {
  id: string; // UUID
  userId: string; // UUID
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  requestNote?: string;
  isDefault: boolean;
  createdAt?: string;
}

// 위시리스트 아이템
export interface WishlistItem {
  id: string; // UUID
  userId: string; // UUID
  productId: string; // UUID
  createdAt: string;
  product: Product;
}

// 전화번호 파츠
export interface PhoneParts {
  part1: string;
  part2: string;
  part3: string;
}

// 배송지 폼 데이터
export interface ShippingFormData {
  recipient: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  phone1: string;
  phone2: string;
  phone3: string;
  message: string;
  customMessage: string;
  saveDefault: boolean;
}

// 주문 상태 카운트
export interface OrderStatusCounts {
  pending: number;
  preparing: number;
  shipped: number;
  delivered: number;
}

// 주문 생성 요청 타입
export interface CreateOrderRequest {
  shippingName: string;
  shippingPhone: string;
  shippingPostalCode: string;
  shippingAddress: string;
  shippingDetailAddress?: string; // 상세 주소 (NEW)
  shippingRequestNote?: string; // 배송 요청사항 (NEW)
}

// 주문 생성 응답 타입
export interface CreateOrderResponse {
  orderId: string; // UUID
  externalOrderId: string; // PG사 주문번호
  orderName: string; // "상품명 외 N건"
  amount: number;
}

// 결제 승인 요청 타입
export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string; // externalOrderId
  amount: number;
}

// 결제 승인 응답 타입
export interface ConfirmPaymentResponse {
  success: boolean;
  order: Order;
}

// 결제 취소 요청 타입
export interface CancelPaymentRequest {
  cancelReason: string;
  cancelAmount?: number; // 부분 취소 시
}

// 카테고리 타입
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
}
