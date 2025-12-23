import type {
  User,
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CancelPaymentRequest,
  SendVerificationRequest,
  SendVerificationResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  CheckVerificationResponse,
  EmailVerificationType,
  AddressSearchResponse,
  KeywordSearchResponse,
  NaverPayReserveResponse,
  NaverPayStatusResponse,
  NaverPayClientInfoResponse,
  ImageUploadResponse,
  ImagesUploadResponse,
  ImageDeleteResponse,
  ImagesDeleteResponse,
  SiteImage,
  SiteImageType,
  CreateSiteImageRequest,
  UpdateSiteImageRequest,
  ReorderSiteImagesRequest,
} from "@/types/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ------------------------------------------------------------------
// [0] Core: 공통 요청 함수
// ------------------------------------------------------------------
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include", // [중요] 세션 쿠키 전송
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // 204 No Content 처리 (삭제 요청 등)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ------------------------------------------------------------------
// [1] 인증 및 사용자 (Auth & User Profile)
// ------------------------------------------------------------------

// 로그인
export async function login(data: {
  email: string;
  password: string;
}): Promise<User> {
  return apiRequest<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 회원가입
export async function signup(data: any): Promise<User> {
  return apiRequest<User>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 로그아웃
export async function logout(): Promise<void> {
  return apiRequest("/api/auth/logout", { method: "POST" });
}

// 네이버 소셜 로그인 URL 반환
export function getNaverLoginUrl(): string {
  return `${API_BASE}/api/oauth/naver/login`;
}

// 현재 사용자 정보 가져오기
export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/user");
}

// 내 정보 수정
export async function updateMyInfo(data: {
  userName?: string;
  phone?: string;
  zipCode?: string;
  address?: string;
  detailAddress?: string;
  emailOptIn?: boolean;
}): Promise<any> {
  return apiRequest("/api/auth/user", {
    method: "PUT", // 백엔드 명세에 맞게 PUT으로 변경
    body: JSON.stringify(data),
  });
}

// 비밀번호 변경
export async function changeMyPassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<any> {
  return apiRequest("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// 회원 탈퇴
export async function withdrawUser(): Promise<void> {
  return apiRequest("/api/auth/user", {
    method: "DELETE",
  });
}

// ------------------------------------------------------------------
// [1-1] 이메일 인증 (Email Verification)
// ------------------------------------------------------------------

// 이메일 인증코드 발송
export async function sendVerification(
  email: string,
  type: EmailVerificationType = "signup"
): Promise<SendVerificationResponse> {
  return apiRequest<SendVerificationResponse>("/api/auth/send-verification", {
    method: "POST",
    body: JSON.stringify({ email, type } as SendVerificationRequest),
  });
}

// 이메일 인증코드 확인
export async function verifyEmail(
  email: string,
  code: string,
  type: EmailVerificationType = "signup"
): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code, type } as VerifyEmailRequest),
  });
}

// 이메일 인증 상태 확인
export async function checkVerification(
  email: string,
  type: EmailVerificationType = "signup"
): Promise<CheckVerificationResponse> {
  const params = new URLSearchParams({ email, type });
  return apiRequest<CheckVerificationResponse>(
    `/api/auth/check-verification?${params.toString()}`
  );
}

// ------------------------------------------------------------------
// [1-2] 주소 검색 (카카오 로컬 API)
// ------------------------------------------------------------------

// 주소 검색
export async function searchAddress(
  query: string,
  page: number = 1,
  size: number = 10
): Promise<AddressSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    size: size.toString(),
  });
  return apiRequest<AddressSearchResponse>(
    `/api/search/address?${params.toString()}`
  );
}

// 키워드(장소) 검색
export async function searchKeyword(
  query: string,
  page: number = 1,
  size: number = 10
): Promise<KeywordSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    size: size.toString(),
  });
  return apiRequest<KeywordSearchResponse>(
    `/api/search/keyword?${params.toString()}`
  );
}

// ------------------------------------------------------------------
// [2] 상품 및 카테고리 (Public Products & Categories)
// ------------------------------------------------------------------

// 전체 상품 조회 (관리자용 아님)
export async function fetchProducts(
  categoryId?: number,
  search?: string
): Promise<any[]> {
  const params = new URLSearchParams();
  if (categoryId) params.append("categoryId", categoryId.toString());
  if (search) params.append("search", search);

  return apiRequest(`/api/products?${params.toString()}`);
}

// 상품 상세 조회
export async function fetchProduct(id: string | number): Promise<any> {
  return apiRequest(`/api/products/${id}`);
}

// 상품 옵션(Variants) 조회
export async function fetchProductVariants(
  productId: string | number
): Promise<any[]> {
  return apiRequest(`/api/products/${productId}/variants`);
}

// 카테고리 목록 조회
export async function fetchCategories(): Promise<any[]> {
  return apiRequest("/api/categories");
}

// ------------------------------------------------------------------
// [3] 쇼핑 활동 (Cart & Wishlist)
// ------------------------------------------------------------------

// --- 장바구니 (Cart) ---
export async function fetchCart(): Promise<any[]> {
  return apiRequest("/api/cart");
}

export async function addToCart(data: {
  productId: string | number;
  variantId?: string | number;
  quantity: number;
}): Promise<any> {
  return apiRequest("/api/cart", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCartItem(
  itemId: string | number,
  quantity: number
): Promise<any> {
  return apiRequest(`/api/cart/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function deleteCartItem(itemId: string | number): Promise<void> {
  return apiRequest(`/api/cart/${itemId}`, {
    method: "DELETE",
  });
}

// --- [신규] 위시리스트 (Wishlist) ---
export async function fetchWishlist(): Promise<any[]> {
  return apiRequest("/api/wishlist");
}

export async function addToWishlist(productId: string): Promise<any> {
  return apiRequest("/api/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  return apiRequest(`/api/wishlist/${productId}`, {
    method: "DELETE",
  });
}

// ------------------------------------------------------------------
// [4] 주문 및 배송지 (Orders & Addresses)
// ------------------------------------------------------------------

// --- 주문 (Orders) ---
export async function createOrder(
  data: CreateOrderRequest
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchOrders(): Promise<Order[]> {
  return apiRequest<Order[]>("/api/orders");
}

export async function fetchOrder(orderId: number | string): Promise<Order> {
  return apiRequest(`/api/orders/${orderId}`);
}

// 주문 취소 (결제 대기/결제 완료/상품 준비 중 상태에서만 가능)
export async function cancelOrder(
  orderId: number | string,
  data: CancelPaymentRequest
): Promise<{
  message: string;
  order: Order;
  refund?: {
    cancelAmount: number;
    refundableAmount: number;
    canceledAt: string;
  };
}> {
  return apiRequest(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- 배송지 (Address Book) ---
export async function fetchDeliveryAddresses(): Promise<any[]> {
  const response = await apiRequest<{ addresses: any[] } | any[]>("/api/user/addresses");
  return Array.isArray(response) ? response : response.addresses || [];
}

export async function createDeliveryAddress(data: {
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress?: string;
  requestNote?: string;
  isDefault: boolean;
}): Promise<any> {
  return apiRequest("/api/user/addresses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 배송지 수정
export async function updateDeliveryAddress(
  addressId: string | number,
  data: {
    recipient?: string;
    phone?: string;
    zipCode?: string;
    address?: string;
    detailAddress?: string;
    requestNote?: string;
    isDefault?: boolean;
  }
): Promise<any> {
  return apiRequest(`/api/user/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDeliveryAddress(addressId: string | number): Promise<void> {
  return apiRequest(`/api/user/addresses/${addressId}`, {
    method: "DELETE",
  });
}

// ------------------------------------------------------------------
// [5] 관리자 전용 (Admin Operations)
// ------------------------------------------------------------------

// --- 상품 관리 ---
export async function fetchAdminProducts(): Promise<any[]> {
  return apiRequest("/api/admin/products");
}

export async function createProduct(data: any): Promise<any> {
  return apiRequest("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: string | number,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string | number): Promise<void> {
  return apiRequest(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
}

// --- 옵션(Variant) 관리 ---
export async function fetchAdminProductVariants(
  productId: string | number
): Promise<any[]> {
  return apiRequest(`/api/admin/products/${productId}/variants`);
}

export async function createProductVariant(
  productId: string | number,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProductVariant(
  productId: string | number,
  variantId: string | number,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProductVariant(
  productId: string | number,
  variantId: string | number
): Promise<void> {
  return apiRequest(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
  });
}

// --- 사이즈 측정 정보 조회 (공개 API) ---
export async function fetchSizeMeasurements(
  variantId: number | string
): Promise<any[]> {
  return apiRequest(`/api/variants/${variantId}/measurements`);
}

export async function createSizeMeasurement(
  variantId: number | string,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/variants/${variantId}/measurements`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSizeMeasurement(
  measurementId: number | string,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/measurements/${measurementId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSizeMeasurement(
  measurementId: number | string
): Promise<void> {
  return apiRequest(`/api/admin/measurements/${measurementId}`, {
    method: "DELETE",
  });
}

// --- 카테고리 관리 ---
export async function createCategory(data: any): Promise<any> {
  return apiRequest("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string | number,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string | number): Promise<void> {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// --- 주문 관리 ---
export async function fetchAdminOrders(): Promise<any[]> {
  return apiRequest("/api/admin/orders");
}

export async function updateAdminOrderStatus(
  orderId: string | number,
  status: string,
  trackingNumber?: string
): Promise<any> {
  return apiRequest(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, trackingNumber }),
  });
}

export async function updateAdminOrderItem(
  itemId: number | string,
  status: string,
  trackingNumber?: string
): Promise<any> {
  return apiRequest(`/api/admin/order-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, trackingNumber }),
  });
}

// ------------------------------------------------------------------
// [6] 결제 (Payments)
// ------------------------------------------------------------------

// 토스페이먼츠 클라이언트 키 조회
export async function getPaymentClientKey(): Promise<{ clientKey: string }> {
  return apiRequest<{ clientKey: string }>("/api/payments/client-key");
}

// 결제 승인 (토스페이먼츠)
export async function confirmPayment(
  data: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> {
  return apiRequest<ConfirmPaymentResponse>("/api/payments/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 결제 취소
export async function cancelPayment(
  orderId: number | string,
  data: CancelPaymentRequest
): Promise<Order> {
  return apiRequest<Order>(`/api/payments/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 결제 상태 조회
export async function getPaymentStatus(
  orderId: number | string
): Promise<{ status: string; order: Order }> {
  return apiRequest<{ status: string; order: Order }>(
    `/api/payments/${orderId}/status`
  );
}

// ------------------------------------------------------------------
// [6-2] 네이버페이 (NaverPay)
// ------------------------------------------------------------------

// 네이버페이 클라이언트 정보 조회
export async function getNaverPayClientInfo(): Promise<NaverPayClientInfoResponse> {
  return apiRequest<NaverPayClientInfoResponse>(
    "/api/payments/naverpay/client-info"
  );
}

// 네이버페이 결제 예약
export async function reserveNaverPayment(
  orderId: string
): Promise<NaverPayReserveResponse> {
  return apiRequest<NaverPayReserveResponse>("/api/payments/naverpay/reserve", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

// 네이버페이 결제 상태 조회
export async function getNaverPaymentStatus(
  orderId: string
): Promise<NaverPayStatusResponse> {
  return apiRequest<NaverPayStatusResponse>(
    `/api/payments/naverpay/${orderId}/status`
  );
}

// 네이버페이 결제 취소
export async function cancelNaverPayment(
  orderId: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<Order> {
  return apiRequest<Order>(`/api/payments/naverpay/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancelReason, cancelAmount }),
  });
}

// --- 관리자 결제 관리 ---
export async function getAdminPaymentDetail(
  orderId: number | string
): Promise<any> {
  return apiRequest(`/api/admin/payments/${orderId}`);
}

export async function adminCancelPayment(
  orderId: number | string,
  cancelReason: string
): Promise<any> {
  return apiRequest(`/api/admin/payments/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancelReason }),
  });
}

// ------------------------------------------------------------------
// [7] 이미지 업로드 (Admin Only - Cloudinary)
// ------------------------------------------------------------------

// 파일 업로드용 공통 함수 (FormData 사용)
async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData, // Content-Type은 자동으로 multipart/form-data로 설정됨
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 단일 상품 이미지 업로드
export async function uploadProductImage(
  file: File
): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append("image", file);
  return uploadFile<ImageUploadResponse>("/api/admin/images/product", formData);
}

// 여러 상품 이미지 업로드 (최대 10개)
export async function uploadProductImages(
  files: File[]
): Promise<ImagesUploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });
  return uploadFile<ImagesUploadResponse>(
    "/api/admin/images/products",
    formData
  );
}

// 상품 상세 이미지 업로드 (최대 10개)
export async function uploadProductDetailImages(
  files: File[]
): Promise<ImagesUploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });
  return uploadFile<ImagesUploadResponse>(
    "/api/admin/images/product-details",
    formData
  );
}

// 단일 이미지 삭제
export async function deleteImage(
  publicId: string
): Promise<ImageDeleteResponse> {
  return apiRequest<ImageDeleteResponse>("/api/admin/images", {
    method: "DELETE",
    body: JSON.stringify({ publicId }),
  });
}

// 여러 이미지 삭제
export async function deleteImages(
  publicIds: string[]
): Promise<ImagesDeleteResponse> {
  return apiRequest<ImagesDeleteResponse>("/api/admin/images/bulk", {
    method: "DELETE",
    body: JSON.stringify({ publicIds }),
  });
}

// ------------------------------------------------------------------
// [8] 사이트 이미지 (Hero, Marquee) - Public API
// ------------------------------------------------------------------

// 활성화된 전체 사이트 이미지 조회
export async function fetchSiteImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>("/api/site-images");
  return response.images || [];
}

// Hero 이미지만 조회
export async function fetchHeroImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>("/api/site-images/hero");
  return response.images || [];
}

// Marquee 이미지만 조회
export async function fetchMarqueeImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>("/api/site-images/marquee");
  return response.images || [];
}

// ------------------------------------------------------------------
// [8-1] 사이트 이미지 관리 (Admin Only)
// ------------------------------------------------------------------

// 전체 이미지 목록 조회 (관리자용 - 비활성화 포함)
export async function fetchAdminSiteImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>("/api/admin/site-images");
  return response.images || [];
}

// 이미지 상세 조회
export async function fetchAdminSiteImage(id: number): Promise<SiteImage> {
  return apiRequest<SiteImage>(`/api/admin/site-images/${id}`);
}

// 이미지 추가
export async function createSiteImage(
  data: CreateSiteImageRequest
): Promise<{ message: string; image: SiteImage }> {
  return apiRequest<{ message: string; image: SiteImage }>(
    "/api/admin/site-images",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

// 이미지 수정
export async function updateSiteImage(
  id: number,
  data: UpdateSiteImageRequest
): Promise<{ message: string; image: SiteImage }> {
  return apiRequest<{ message: string; image: SiteImage }>(
    `/api/admin/site-images/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// 이미지 삭제
export async function deleteSiteImage(
  id: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/site-images/${id}`, {
    method: "DELETE",
  });
}

// 이미지 순서 변경
export async function reorderSiteImages(
  data: ReorderSiteImagesRequest
): Promise<{ message: string; images: SiteImage[] }> {
  return apiRequest<{ message: string; images: SiteImage[] }>(
    "/api/admin/site-images/reorder",
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

// 사이트 이미지 업로드 (Hero/Marquee용)
export async function uploadSiteImage(
  file: File,
  type: SiteImageType
): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("type", type);
  return uploadFile<ImageUploadResponse>("/api/admin/images/site", formData);
}
