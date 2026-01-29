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
  NaverPaySdkConfigResponse,
  NaverPayCancelRequest,
  NaverPayCancelResponse,
  KakaoPayClientInfoResponse,
  KakaoPayReadyResponse,
  ImageUploadResponse,
  ImagesUploadResponse,
  ImageDeleteResponse,
  ImagesDeleteResponse,
  SiteImage,
  SiteImageType,
  CreateSiteImageRequest,
  UpdateSiteImageRequest,
  ReorderSiteImagesRequest,
  Inquiry,
  InquiryReply,
  CreateInquiryRequest,
  InquiryListParams,
  CreateReplyRequest,
  UpdateInquiryStatusRequest,
  StockShortageItem,
  AppConstants,
  ShippingConstants,
  ValidationConstants,
  ReserveStockRequest,
  ReserveStockResponse,
  ReleaseStockResponse,
  AdminUserListParams,
  AdminUsersResponse,
  AdminUserDetailResponse,
  UpdateUserRequest,
  UpdateUserRoleResponse,
  PartialCancelRequest,
  PartialCancelResponse,
  CreateReturnRequest,
  CreateReturnResponse,
  UpdateReturnTrackingRequest,
  UpdateReturnTrackingResponse,
  Return,
} from "@/types/api";
import { apiCache, cachePolicies, NEVER_CACHE_PATTERNS } from "./apiCache";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ------------------------------------------------------------------
// 커스텀 에러 클래스: 재고 부족 에러
// ------------------------------------------------------------------
export class StockShortageError extends Error {
  code: "STOCK_SHORTAGE" = "STOCK_SHORTAGE";
  shortageItems: StockShortageItem[];

  constructor(message: string, shortageItems: StockShortageItem[]) {
    super(message);
    this.name = "StockShortageError";
    this.shortageItems = shortageItems;
  }
}

// API 에러 (일반)
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ------------------------------------------------------------------
// [0] Core: 공통 요청 함수 (캐싱 지원 + Mutation 시 자동 무효화)
// ------------------------------------------------------------------

/**
 * Mutation(POST/PUT/PATCH/DELETE) 발생 시 관련 캐시를 자동 무효화하는 규칙
 * 데이터 무결성을 보장하기 위해 변경된 리소스의 캐시를 즉시 제거
 */
function invalidateCacheAfterMutation(endpoint: string, method: string) {
  // POST, PUT, PATCH, DELETE 요청만 처리
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  // 엔드포인트별 캐시 무효화 규칙
  // 장바구니 변경 → 장바구니 캐시 무효화
  if (endpoint.includes('/api/cart')) {
    apiCache.invalidate('/api/cart');
    console.debug(`[Cache INVALIDATE] Cart updated - cleared /api/cart`);
  }

  // 상품 변경 (관리자) → 상품 목록 캐시 무효화
  if (endpoint.includes('/api/admin/products') || endpoint.includes('/api/products/')) {
    apiCache.invalidate('/api/products');
    console.debug(`[Cache INVALIDATE] Product updated - cleared /api/products`);
  }

  // 카테고리 변경 (관리자) → 카테고리 캐시 무효화
  if (endpoint.includes('/api/admin/categories') || endpoint.includes('/api/categories/')) {
    apiCache.invalidate('/api/categories');
    console.debug(`[Cache INVALIDATE] Category updated - cleared /api/categories`);
  }

  // 사이트 이미지 변경 (관리자) → 사이트 이미지 캐시 무효화
  if (endpoint.includes('/api/admin/site-images') || endpoint.includes('/api/site-images/')) {
    apiCache.invalidate('/api/site-images');
    console.debug(`[Cache INVALIDATE] Site images updated - cleared /api/site-images`);
  }

  // 주문 생성/변경 → 주문 목록 캐시 무효화
  if (endpoint.includes('/api/orders')) {
    apiCache.invalidate('/api/orders');
    console.debug(`[Cache INVALIDATE] Order updated - cleared /api/orders`);
  }

  // 위시리스트 변경 → 위시리스트 캐시 무효화
  if (endpoint.includes('/api/wishlist')) {
    apiCache.invalidate('/api/wishlist');
    console.debug(`[Cache INVALIDATE] Wishlist updated - cleared /api/wishlist`);
  }

  // 결제 완료 → 장바구니 및 주문 캐시 무효화
  // 결제 승인 후 장바구니가 비워지므로 캐시도 즉시 무효화
  if (endpoint.includes('/api/payments')) {
    apiCache.invalidate('/api/cart');
    apiCache.invalidate('/api/orders');
    console.debug(`[Cache INVALIDATE] Payment processed - cleared /api/cart, /api/orders`);
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { cachePolicy?: keyof typeof cachePolicies } = {}
): Promise<T> {
  const { cachePolicy, ...fetchOptions } = options;
  const url = `${API_BASE}${endpoint}`;
  const method = fetchOptions.method || 'GET';
  const cacheKey = `${method}:${url}`;

  // 🔒 보안: 민감 데이터 캐싱 방지 검증 (강제 적용)
  const shouldNeverCache = NEVER_CACHE_PATTERNS.some(pattern => pattern.test(endpoint));
  let effectiveCachePolicy = cachePolicy;

  if (shouldNeverCache) {
    if (cachePolicy && cachePolicy !== 'noCache') {
      console.error(
        `[Security] ${endpoint}는 개인정보를 포함하므로 캐시할 수 없습니다.\n` +
        `요청한 정책: ${cachePolicy} → 강제 적용: noCache`
      );
    }
    // 민감 데이터는 무조건 noCache 강제 적용
    effectiveCachePolicy = 'noCache';
  }

  // GET 요청만 캐싱
  if (method === 'GET') {
    const policy = effectiveCachePolicy ? cachePolicies[effectiveCachePolicy] : cachePolicies.noCache;

    // 캐시 확인
    const cached = apiCache.get<T>(cacheKey, policy.maxAge);
    if (cached) {
      console.debug(`[Cache HIT] ${cacheKey}`);
      return cached;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: "include", // [중요] 세션 쿠키 전송
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // 백엔드 에러 응답 형식 지원: error.error (Rate-limit 등) 또는 error.message (일반)
    const errorMessage = error.error || error.message || `HTTP ${response.status}`;

    // 401 Unauthorized는 로그인 안한 상태에서 정상 동작
    // Lighthouse Best Practices: 콘솔 에러 방지를 위해 ApiError 사용
    if (response.status === 401) {
      throw new ApiError(errorMessage, response.status, error);
    }

    throw new Error(errorMessage);
  }

  // 204 No Content 처리 (삭제 요청 등)
  if (response.status === 204) {
    // Mutation 성공 시 관련 캐시 무효화
    invalidateCacheAfterMutation(endpoint, method);
    return {} as T;
  }

  const data = await response.json();

  // GET 결과 캐싱
  if (method === 'GET') {
    const etag = response.headers.get('etag');
    apiCache.set(cacheKey, data, etag || undefined);
    console.debug(`[Cache SET] ${cacheKey}`);
  } else {
    // Mutation 성공 시 관련 캐시 무효화
    invalidateCacheAfterMutation(endpoint, method);
  }

  return data;
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
export function getNaverLoginUrl(options?: { forceLogin?: boolean; returnUrl?: string }): string {
  // 캐시 방지를 위한 타임스탬프 추가
  const timestamp = Date.now();
  // 로그인 후 돌아올 페이지 저장
  // 인증 관련 페이지(/login, /signup 등)에서는 홈으로 이동
  const currentPath = window.location.pathname;
  const authPaths = ["/login", "/signup", "/forgot-password", "/auth"];
  const isAuthPage = authPaths.some((path) => currentPath.startsWith(path));
  const returnUrl = encodeURIComponent(options?.returnUrl || (isAuthPage ? "/" : currentPath || "/"));

  let url = `${API_BASE}/api/oauth/naver/login?t=${timestamp}&returnUrl=${returnUrl}`;

  // 재인증 요청 시 auth_type=reprompt 파라미터 추가
  if (options?.forceLogin) {
    url += "&auth_type=reprompt";
  }

  return url;
}

// 카카오 소셜 로그인 URL 반환
export function getKakaoLoginUrl(options?: { forceLogin?: boolean; returnUrl?: string }): string {
  const timestamp = Date.now();
  const currentPath = window.location.pathname;
  const authPaths = ["/login", "/signup", "/forgot-password", "/auth"];
  const isAuthPage = authPaths.some((path) => currentPath.startsWith(path));
  const returnUrl = encodeURIComponent(options?.returnUrl || (isAuthPage ? "/" : currentPath || "/"));

  let url = `${API_BASE}/api/oauth/kakao?t=${timestamp}&returnUrl=${returnUrl}`;

  // 재인증 요청 시 prompt=login 파라미터 추가
  if (options?.forceLogin) {
    url += "&prompt=login";
  }

  return url;
}

// 현재 사용자 정보 가져오기
export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/user", { cachePolicy: 'noCache' });
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

// 비밀번호 재설정 (비로그인 상태에서 이메일 인증 후 사용)
export async function resetPassword(data: {
  email: string;
  newPassword: string;
}): Promise<any> {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 비밀번호 확인 (관리자 인증용)
export async function verifyPassword(password: string): Promise<{ verified: boolean }> {
  return apiRequest("/api/auth/verify-password", {
    method: "POST",
    body: JSON.stringify({ password }),
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

// 상품 목록 페이지네이션 응답 타입
export interface PaginatedProductsResponse {
  products: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// 상품 목록 조회 (페이지네이션 지원)
export async function fetchProducts(
  options: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<PaginatedProductsResponse> {
  const { category, search, page = 1, limit = 12 } = options;
  const params = new URLSearchParams();

  if (category) params.append("category", category);
  if (search) params.append("search", search);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  try {
    const response = await apiRequest<PaginatedProductsResponse | any[]>(
      `/api/products?${params.toString()}`,
      { cachePolicy: 'productList' }
    );

    // 백엔드가 배열만 반환하는 경우 (기존 API 호환)
    if (Array.isArray(response)) {
      const products = response;
      const total = products.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedProducts = products.slice(start, end);

      return {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: end < total,
        },
      };
    }

    return response;
  } catch (e) {
    throw e;
  }
}

// 전체 상품 조회 (기존 호환용)
export async function fetchAllProducts(
  category?: string,
  search?: string
): Promise<any[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (search) params.append("search", search);

  return apiRequest(`/api/products?${params.toString()}`, { cachePolicy: 'productList' });
}

// 상품 상세 조회
export async function fetchProduct(id: string | number): Promise<any> {
  return apiRequest(`/api/products/${id}`, { cachePolicy: 'productDetail' });
}

// 상품 옵션(Variants) 조회
export async function fetchProductVariants(
  productId: string | number
): Promise<any[]> {
  return apiRequest(`/api/products/${productId}/variants`, { cachePolicy: 'productDetail' });
}

// 카테고리 목록 조회
export async function fetchCategories(): Promise<any[]> {
  return apiRequest("/api/categories", { cachePolicy: 'categories' });
}

// ------------------------------------------------------------------
// [3] 쇼핑 활동 (Cart & Wishlist)
// ------------------------------------------------------------------

// --- 장바구니 (Cart) ---
export async function fetchCart(): Promise<any[]> {
  return apiRequest("/api/cart", { cachePolicy: 'noCache' });
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

// --- 재고 선점 (Stock Reservation) ---

// 재고 선점 요청 (결제 전 임시 점유)
export async function reserveStock(
  data: ReserveStockRequest
): Promise<ReserveStockResponse> {
  return apiRequest<ReserveStockResponse>("/api/stock/reserve", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 재고 선점 해제 (결제 취소/실패/이탈 시)
export async function releaseStockReservation(
  reservationId: string,
  options?: { keepalive?: boolean }
): Promise<ReleaseStockResponse> {
  return apiRequest<ReleaseStockResponse>(
    `/api/stock/reserve/${reservationId}`,
    {
      method: "DELETE",
      keepalive: options?.keepalive || false, // 페이지 종료 시에도 요청 보장
    }
  );
}

// --- 주문 (Orders) ---
export async function createOrder(
  data: CreateOrderRequest
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 주문 목록 페이지네이션 응답 타입
export interface PaginatedOrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// 주문 목록 조회 (페이지네이션 지원)
export async function fetchOrders(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedOrdersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // 백엔드가 페이지네이션을 지원하는 경우
  try {
    const response = await apiRequest<PaginatedOrdersResponse | Order[]>(
      `/api/orders?${params.toString()}`,
      { cachePolicy: 'noCache' }
    );

    // 백엔드가 배열만 반환하는 경우 (기존 API 호환)
    if (Array.isArray(response)) {
      const orders = response;
      const total = orders.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedOrders = orders.slice(start, end);

      return {
        orders: paginatedOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: end < total,
        },
      };
    }

    return response;
  } catch (e) {
    throw e;
  }
}

// 전체 주문 목록 조회 (기존 호환용)
export async function fetchAllOrders(): Promise<Order[]> {
  return apiRequest<Order[]>("/api/orders", { cachePolicy: 'noCache' });
}

export async function fetchOrder(orderId: number | string): Promise<Order> {
  return apiRequest(`/api/orders/${orderId}`, { cachePolicy: 'noCache' });
}

// 주문 취소 (결제 대기/결제 완료/상품 준비 중 상태에서만 가능)
/**
 * 주문 상태를 paying으로 변경
 * 토스페이먼츠 결제창 오픈 직전 호출
 */
export async function updateOrderStatusToPaying(
  orderId: number | string
): Promise<{
  message: string;
  order: Order;
}> {
  return apiRequest(`/api/orders/${orderId}/status/paying`, {
    method: "PUT",
  });
}

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

// 부분 취소 (선택한 아이템만 취소)
export async function partialCancelOrder(
  orderId: number | string,
  data: PartialCancelRequest
): Promise<PartialCancelResponse> {
  return apiRequest<PartialCancelResponse>(
    `/api/orders/${orderId}/partial-cancel`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

// ------------------------------------------------------------------
// [4-1] 반품 (Returns)
// ------------------------------------------------------------------

// 반품 요청
export async function createReturn(
  data: CreateReturnRequest
): Promise<CreateReturnResponse> {
  return apiRequest<CreateReturnResponse>("/api/returns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 반품 운송장 등록
export async function updateReturnTracking(
  returnId: string,
  data: UpdateReturnTrackingRequest
): Promise<UpdateReturnTrackingResponse> {
  return apiRequest<UpdateReturnTrackingResponse>(
    `/api/returns/${returnId}/tracking`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

// 내 반품 목록 조회
export async function getReturns(): Promise<Return[]> {
  return apiRequest<Return[]>("/api/returns", { cachePolicy: "noCache" });
}

// 반품 상세 조회
export async function getReturn(returnId: string): Promise<Return> {
  return apiRequest<Return>(`/api/returns/${returnId}`, {
    cachePolicy: "noCache",
  });
}

// 주문 삭제 (결제 전 주문만 삭제 가능 - 입금 대기 상태)
export async function deleteOrder(
  orderId: number | string,
  options?: { keepalive?: boolean }
): Promise<{ message: string }> {
  return apiRequest(`/api/orders/${orderId}`, {
    method: "DELETE",
    keepalive: options?.keepalive || false, // 페이지 종료 시에도 요청 보장
  });
}

/**
 * 🔒 브라우저 강제 종료 시 주문 정리 (Best Effort)
 * 3중 안전장치로 전송 보장률 향상 (Phase 1 & 2)
 * paying 상태 주문의 재고를 즉시 복구합니다.
 *
 * ⚠️ 주의: 백엔드에 /api/orders/:orderId/cleanup 엔드포인트가 없으므로
 *         기존 /api/orders/:orderId/cancel API를 사용합니다.
 */
export function cleanupOrder(orderId: number | string): boolean {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = `${API_BASE_URL}/api/orders/${orderId}/cancel`;

  // 1차 시도: JSON Blob (cancelReason 포함)
  const blob = new Blob(
    [JSON.stringify({ cancelReason: "브라우저 강제 종료" })],
    { type: "application/json" }
  );
  const sent1 = navigator.sendBeacon(url, blob);

  if (sent1) {
    console.log("[cleanup] Blob 전송 성공 (cancel API 사용)");
    return true;
  }

  // 2차 시도: FormData (일부 브라우저에서 더 안정적)
  const formData = new FormData();
  formData.append("cancelReason", "브라우저 강제 종료");
  const sent2 = navigator.sendBeacon(url, formData);

  if (sent2) {
    console.log("[cleanup] FormData 백업 전송 성공 (cancel API 사용)");
    return true;
  }

  // 3차 시도: fetch keepalive (최후의 수단)
  try {
    fetch(url, {
      method: "POST",
      keepalive: true,
      credentials: "include", // 쿠키 전송 필수
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason: "브라우저 강제 종료" }),
    }).catch((err) => console.error("[cleanup] fetch keepalive 실패:", err));
    console.log("[cleanup] fetch keepalive 전송 시도 (cancel API 사용)");
  } catch (err) {
    console.error("[cleanup] 모든 전송 방식 실패:", err);
  }

  return false;
}

// --- 배송지 (Address Book) ---
export async function fetchDeliveryAddresses(options?: { noHttpCache?: boolean }): Promise<any[]> {
  const fetchOptions: RequestInit & { cachePolicy?: 'noCache' } = { cachePolicy: 'noCache' };

  // 브라우저 HTTP 캐시 무시 옵션 (배송지 관리 페이지용)
  if (options?.noHttpCache) {
    fetchOptions.cache = 'no-store';
  }

  const response = await apiRequest<{ addresses: any[] } | any[]>(
    "/api/user/addresses",
    fetchOptions
  );
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

export async function deleteDeliveryAddress(
  addressId: string | number
): Promise<void> {
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
  return apiRequest(`/api/variants/${variantId}/measurements`, { cachePolicy: 'productDetail' });
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
  trackingNumber?: string,
  courierCompany?: string
): Promise<any> {
  const body: any = { status };

  if (trackingNumber !== undefined) {
    body.trackingNumber = trackingNumber;
  }

  if (courierCompany !== undefined) {
    body.courierCompany = courierCompany;
  }

  return apiRequest(`/api/admin/order-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------------
// [6] 결제 (Payments)
// ------------------------------------------------------------------

// 토스페이먼츠 클라이언트 키 조회
export async function getPaymentClientKey(): Promise<{ clientKey: string }> {
  return apiRequest<{ clientKey: string }>("/api/payments/client-key");
}

// 결제 승인 (토스페이먼츠) - 재고 소프트 락 에러 처리 포함
export async function confirmPayment(
  data: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> {
  const url = `${API_BASE}/api/payments/confirm`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    // 재고 부족 에러 처리 (소프트 락 실패)
    // 백엔드가 STOCK_SHORTAGE 또는 INSUFFICIENT_STOCK 둘 다 사용할 수 있음
    if (
      (result.code === "STOCK_SHORTAGE" || result.code === "INSUFFICIENT_STOCK") &&
      result.shortageItems
    ) {
      throw new StockShortageError(
        result.message || "재고가 부족한 상품이 있습니다.",
        result.shortageItems
      );
    }
    // 재고 부족인데 shortageItems가 없는 경우 (백엔드 응답 형식 차이)
    if (result.code === "STOCK_SHORTAGE" || result.code === "INSUFFICIENT_STOCK") {
      throw new StockShortageError(
        result.message || "재고가 부족한 상품이 있습니다.",
        [] // 빈 배열로 처리
      );
    }
    // 일반 에러
    throw new ApiError(
      result.message || `HTTP ${response.status}`,
      response.status,
      result
    );
  }

  return result;
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

// 네이버페이 클라이언트 정보 조회 (기존 - 하위 호환용)
/** @deprecated getNaverPaySdkConfig()를 사용하세요 */
export async function getNaverPayClientInfo(): Promise<NaverPayClientInfoResponse> {
  return apiRequest<NaverPayClientInfoResponse>(
    "/api/payments/naverpay/client-info"
  );
}

// 네이버페이 SDK 설정 조회 (신규 - 클라이언트 SDK 직접 호출용)
export async function getNaverPaySdkConfig(): Promise<NaverPaySdkConfigResponse> {
  return apiRequest<NaverPaySdkConfigResponse>(
    "/api/payments/naverpay/sdk-config"
  );
}

// 네이버페이 결제 예약 (삭제됨 - 클라이언트 SDK 직접 호출 방식으로 변경)
/** @deprecated 서버 예약 방식에서 클라이언트 SDK 직접 호출 방식으로 변경되었습니다 */
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

// 네이버페이 결제 취소 (과세/면세 금액 추가)
export async function cancelNaverPayment(
  orderId: string,
  data: NaverPayCancelRequest
): Promise<NaverPayCancelResponse> {
  return apiRequest<NaverPayCancelResponse>(
    `/api/payments/naverpay/${orderId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

// ------------------------------------------------------------------
// [6-3] 카카오페이 (KakaoPay)
// ------------------------------------------------------------------

// 카카오페이 클라이언트 정보 조회
export async function getKakaoPayClientInfo(): Promise<KakaoPayClientInfoResponse> {
  return apiRequest<KakaoPayClientInfoResponse>("/api/payments/kakaopay/client-info");
}

// 카카오페이 결제 준비 (서버 리다이렉트 방식)
export async function readyKakaoPay(orderId: string): Promise<KakaoPayReadyResponse> {
  return apiRequest<KakaoPayReadyResponse>("/api/payments/kakaopay/ready", {
    method: "POST",
    body: JSON.stringify({ orderId }),
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
    // 백엔드 에러 응답 형식 지원: error.error (Rate-limit 등) 또는 error.message (일반)
    const errorMessage = error.error || error.message || `HTTP ${response.status}`;
    throw new Error(errorMessage);
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
  const response = await apiRequest<{ images: SiteImage[] }>(
    "/api/site-images",
    { cachePolicy: 'siteImages' }
  );
  return response.images || [];
}

// Hero 이미지만 조회
export async function fetchHeroImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>(
    "/api/site-images/hero",
    { cachePolicy: 'siteImages' }
  );
  return response.images || [];
}

// Marquee 이미지만 조회
export async function fetchMarqueeImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>(
    "/api/site-images/marquee",
    { cachePolicy: 'siteImages' }
  );
  return response.images || [];
}

// ------------------------------------------------------------------
// [8-1] 사이트 이미지 관리 (Admin Only)
// ------------------------------------------------------------------

// 전체 이미지 목록 조회 (관리자용 - 비활성화 포함)
export async function fetchAdminSiteImages(): Promise<SiteImage[]> {
  const response = await apiRequest<{ images: SiteImage[] }>(
    "/api/admin/site-images"
  );
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

// ------------------------------------------------------------------
// [8.5] 이메일 템플릿 미리보기 (Admin Only)
// ------------------------------------------------------------------

// 이메일 템플릿 타입
export type EmailTemplateType =
  | "payment_confirm"
  | "order_cancel"
  | "refund_complete"
  | "return_request"
  | "verification";

// 이메일 템플릿 정보
export interface EmailTemplateInfo {
  type: EmailTemplateType;
  name: string;
  description: string;
}

// 이메일 템플릿 목록 조회
export async function fetchEmailTemplates(): Promise<{
  templates: EmailTemplateInfo[];
  colors: Record<string, string>;
}> {
  return apiRequest("/api/admin/email-preview/templates", { cachePolicy: "noCache" });
}

// 이메일 템플릿 미리보기 HTML 조회
export async function fetchEmailPreview(type: EmailTemplateType): Promise<string> {
  const response = await fetch(`${API_BASE}/api/admin/email-preview/${type}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("이메일 템플릿을 불러오는데 실패했습니다.");
  }
  return response.text();
}

// ------------------------------------------------------------------
// [9] 문의하기 (Q&A Inquiries)
// ------------------------------------------------------------------

// 문의 목록 조회
export async function fetchInquiries(
  params?: InquiryListParams
): Promise<Inquiry[]> {
  const searchParams = new URLSearchParams();
  if (params?.productId) searchParams.append("productId", params.productId);
  if (params?.type) searchParams.append("type", params.type);
  if (params?.status) searchParams.append("status", params.status);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/inquiries?${queryString}` : "/api/inquiries";
  return apiRequest<Inquiry[]>(url);
}

// 내 문의 목록 조회
export async function fetchMyInquiries(): Promise<Inquiry[]> {
  return apiRequest<Inquiry[]>("/api/inquiries/my/list", { cachePolicy: 'noCache' });
}

// 문의 상세 조회
export async function fetchInquiry(id: string): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/inquiries/${id}`, { cachePolicy: 'noCache' });
}

// 문의 등록
export async function createInquiry(
  data: CreateInquiryRequest
): Promise<Inquiry> {
  return apiRequest<Inquiry>("/api/inquiries", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 문의 삭제
export async function deleteInquiry(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/inquiries/${id}`, {
    method: "DELETE",
  });
}

// 답변 등록 (관리자)
export async function createInquiryReply(
  inquiryId: string,
  data: CreateReplyRequest
): Promise<InquiryReply> {
  return apiRequest<InquiryReply>(`/api/inquiries/${inquiryId}/replies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 답변 삭제 (관리자)
export async function deleteInquiryReply(
  inquiryId: string,
  replyId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/inquiries/${inquiryId}/replies/${replyId}`,
    {
      method: "DELETE",
    }
  );
}

// 문의 상태 변경 (관리자)
export async function updateInquiryStatus(
  id: string,
  data: UpdateInquiryStatusRequest
): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/inquiries/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ------------------------------------------------------------------
// [9-1] 문의하기 관리자 전용 API
// ------------------------------------------------------------------

// 문의 목록 조회 (관리자 전용 - 마스킹된 사용자 정보 포함)
export async function fetchAdminInquiries(
  params?: InquiryListParams
): Promise<Inquiry[]> {
  const searchParams = new URLSearchParams();
  if (params?.productId) searchParams.append("productId", params.productId);
  if (params?.type) searchParams.append("type", params.type);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.userId) searchParams.append("userId", params.userId);

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/admin/inquiries?${queryString}`
    : "/api/admin/inquiries";
  return apiRequest<Inquiry[]>(url);
}

// 문의 상세 조회 (관리자 전용 - 마스킹된 사용자 정보 포함)
export async function fetchAdminInquiry(id: string): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/admin/inquiries/${id}`);
}

// ------------------------------------------------------------------
// [10] 회원 관리 (Admin Only)
// ------------------------------------------------------------------

// 전체 회원 목록 조회 (관리자 전용)
export async function fetchAdminUsers(
  params?: AdminUserListParams
): Promise<AdminUsersResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.search) queryParams.append("search", params.search);
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const queryString = queryParams.toString();
  const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ""}`;

  return apiRequest<AdminUsersResponse>(endpoint);
}

// 회원 상세 조회 (관리자 전용)
export async function fetchAdminUserDetail(
  userId: string
): Promise<AdminUserDetailResponse> {
  return apiRequest<AdminUserDetailResponse>(`/api/admin/users/${userId}`);
}

// 회원 정보 수정 (관리자 전용)
export async function updateAdminUser(
  userId: string,
  data: UpdateUserRequest
): Promise<User> {
  return apiRequest<User>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// 회원 권한 변경 (슈퍼 관리자 전용)
export async function updateUserRole(
  userId: string,
  isAdmin: boolean
): Promise<UpdateUserRoleResponse> {
  return apiRequest<UpdateUserRoleResponse>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ isAdmin }),
  });
}

// 회원 강제 탈퇴 (관리자 전용)
export async function deleteAdminUser(
  userId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

// ------------------------------------------------------------------
// [11] 공통 상수 (Constants)
// ------------------------------------------------------------------

// 전체 상수 조회
export async function fetchConstants(): Promise<AppConstants> {
  return apiRequest<AppConstants>("/api/constants", { cachePolicy: 'constants' });
}

// 배송비 설정만 조회
export async function fetchShippingConstants(): Promise<ShippingConstants> {
  return apiRequest<ShippingConstants>("/api/constants/shipping", { cachePolicy: 'constants' });
}

// 폼 검증 규칙만 조회
export async function fetchValidationConstants(): Promise<ValidationConstants> {
  return apiRequest<ValidationConstants>("/api/constants/validation", { cachePolicy: 'constants' });
}

