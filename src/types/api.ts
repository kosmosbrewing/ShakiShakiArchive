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

// ------------------------------------------------------------------
// 네이버페이 관련 타입
// ------------------------------------------------------------------

// 네이버페이 결제 예약 요청
export interface NaverPayReserveRequest {
  orderId: string; // 주문 UUID
}

// 네이버페이 결제 예약 응답
export interface NaverPayReserveResponse {
  message: string;
  reserveId: string; // 네이버페이 예약 ID
  paymentUrl: string; // 결제 페이지 URL
}

// 네이버페이 결제 상태 응답
export interface NaverPayStatusResponse {
  status: string;
  order: Order;
  paymentId?: string;
}

// 네이버페이 클라이언트 정보 응답
export interface NaverPayClientInfoResponse {
  clientId: string;
  merchantId: string;
  mode: "dev" | "prod";
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

// ------------------------------------------------------------------
// 이메일 인증 관련 타입
// ------------------------------------------------------------------

// 이메일 인증 타입 ('signup' | 'password_reset')
export type EmailVerificationType = "signup" | "password_reset";

// 인증코드 발송 요청
export interface SendVerificationRequest {
  email: string;
  type: EmailVerificationType;
}

// 인증코드 발송 응답
export interface SendVerificationResponse {
  message: string;
}

// 인증코드 확인 요청
export interface VerifyEmailRequest {
  email: string;
  code: string;
  type: EmailVerificationType;
}

// 인증코드 확인 응답
export interface VerifyEmailResponse {
  message: string;
  verified: boolean;
}

// 인증 상태 확인 응답
export interface CheckVerificationResponse {
  verified: boolean;
}

// ------------------------------------------------------------------
// 주소 검색 관련 타입 (카카오 로컬 API)
// ------------------------------------------------------------------

// 주소 검색 결과 아이템
export interface AddressSearchResult {
  addressName: string; // 전체 지번 주소
  roadAddress: string; // 전체 도로명 주소
  jibunAddress: string; // 지번 주소 상세
  zonecode: string; // 우편번호
  buildingName: string; // 건물명
  x: string; // 경도
  y: string; // 위도
}

// 주소 검색 응답
export interface AddressSearchResponse {
  results: AddressSearchResult[];
  totalCount: number;
  isEnd: boolean;
}

// 키워드(장소) 검색 결과 아이템
export interface KeywordSearchResult {
  placeName: string; // 장소명
  addressName: string; // 지번 주소
  roadAddressName: string; // 도로명 주소
  phone: string; // 전화번호
  categoryName: string; // 카테고리명
  x: string; // 경도
  y: string; // 위도
}

// 키워드 검색 응답
export interface KeywordSearchResponse {
  results: KeywordSearchResult[];
  totalCount: number;
  isEnd: boolean;
}

// ------------------------------------------------------------------
// 이미지 업로드 관련 타입 (Cloudinary)
// ------------------------------------------------------------------

// 업로드된 이미지 정보
export interface UploadedImage {
  url: string; // Cloudinary 이미지 URL
  publicId: string; // Cloudinary public ID (삭제 시 사용)
  width: number; // 이미지 너비
  height: number; // 이미지 높이
}

// 단일 이미지 업로드 응답
export interface ImageUploadResponse {
  message: string;
  image: UploadedImage;
}

// 다중 이미지 업로드 응답
export interface ImagesUploadResponse {
  message: string;
  images: UploadedImage[];
}

// 이미지 삭제 응답
export interface ImageDeleteResponse {
  message: string;
  deleted: boolean;
}

// 다중 이미지 삭제 응답
export interface ImagesDeleteResponse {
  message: string;
  deleted: string[]; // 삭제된 publicId 목록
}
