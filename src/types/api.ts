// src/types/api.ts

// 주문 상태 타입
export type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  id: number;
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
  id: number;
  productId: number;
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
  id: number;
  userId: number;
  productId: number;
  variantId?: number;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

// 주문 아이템
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productPrice: string;
  quantity: number;
  status: OrderStatus;
  trackingNumber?: string;
  product?: Product;
}

// 주문 정보
export interface Order {
  id: string;
  userId: number;
  totalAmount: string;
  status: OrderStatus;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingPostalCode: string;
  trackingNumber?: string;
  orderItems?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

// 배송지 정보
export interface DeliveryAddress {
  id: number;
  userId: number;
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
  id: number;
  userId: number;
  productId: number;
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
