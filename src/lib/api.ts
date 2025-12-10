import type { User, Order } from "@/types/api"; // 타입 경로 확인 (없으면 any로 변경 가능)

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// 공통 요청 함수
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

  return response.json();
}

// ----------------------------------------------------
// [1] 인증 관련 API (이 부분이 없어서 오류가 났습니다)
// ----------------------------------------------------

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

// 현재 사용자 정보 가져오기
export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/user");
}

// ----------------------------------------------------
// [2] 관리자/상품 관련 API
// ----------------------------------------------------

export async function fetchAdminProducts(): Promise<any[]> {
  return apiRequest("/api/admin/products");
}

// [기존에 없다면 추가] 상품 상세 정보 조회
export async function fetchProduct(id: string | number): Promise<any> {
  return apiRequest(`/api/products/${id}`);
}

// [기존에 없다면 추가] 장바구니 담기
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
export async function createProduct(data: any): Promise<any> {
  return apiRequest("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: any): Promise<any> {
  return apiRequest(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return apiRequest(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
}

export async function fetchCategories(): Promise<any[]> {
  return apiRequest("/api/categories");
}

export async function fetchProductVariants(productId: string): Promise<any[]> {
  return apiRequest(`/api/products/${productId}/variants`);
}

// 관리자 권한 검사가 포함된 API를 호출합니다.
export async function fetchAdminProductVariants(
  productId: string | number
): Promise<any[]> {
  return apiRequest(`/api/admin/products/${productId}/variants`);
}

export async function createProductVariant(
  productId: string,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProductVariant(
  productId: string, // [추가] 명세 변경으로 productId 필요
  variantId: string,
  data: any
): Promise<any> {
  // URL 구조 변경: /products/:productId/variants/:variantId
  return apiRequest(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProductVariant(
  productId: string, // [추가] 명세 변경으로 productId 필요
  variantId: string
): Promise<void> {
  // URL 구조 변경: /products/:productId/variants/:variantId
  return apiRequest(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
  });
}

// [신규] 사이즈 측정 정보 조회
export async function fetchSizeMeasurements(
  variantId: number | string
): Promise<any[]> {
  return apiRequest(`/api/admin/variants/${variantId}/measurements`);
}

// [신규] 사이즈 측정 정보 생성
export async function createSizeMeasurement(
  variantId: number | string,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/variants/${variantId}/measurements`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// [신규] 사이즈 측정 정보 수정
export async function updateSizeMeasurement(
  measurementId: number | string,
  data: any
): Promise<any> {
  return apiRequest(`/api/admin/measurements/${measurementId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// [신규] 사이즈 측정 정보 삭제
export async function deleteSizeMeasurement(
  measurementId: number | string
): Promise<void> {
  return apiRequest(`/api/admin/measurements/${measurementId}`, {
    method: "DELETE",
  });
}

// [관리자] 카테고리 생성
export async function createCategory(data: any): Promise<any> {
  return apiRequest("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// [관리자] 카테고리 수정
export async function updateCategory(id: string, data: any): Promise<any> {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// [관리자] 카테고리 삭제
export async function deleteCategory(id: string): Promise<void> {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------
// [3] 주문 관련 API
// ----------------------------------------------------

export async function fetchOrders(): Promise<Order[]> {
  return apiRequest<Order[]>("/api/orders");
}

// [장바구니] 조회
export async function fetchCart(): Promise<any[]> {
  return apiRequest("/api/cart");
}

// [장바구니] 수량 변경
export async function updateCartItem(
  itemId: string | number,
  quantity: number
): Promise<any> {
  return apiRequest(`/api/cart/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

// [장바구니] 아이템 삭제
export async function deleteCartItem(itemId: string | number): Promise<void> {
  return apiRequest(`/api/cart/${itemId}`, {
    method: "DELETE",
  });
}

// [주문] 주문 생성 (결제)
export async function createOrder(data: {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingPostalCode?: string;
}): Promise<any> {
  return apiRequest("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// [주문] 주문 상세 조회 (OrderList에서 상품 정보를 가져오기 위해 사용)
export async function fetchOrder(orderId: number | string): Promise<any> {
  return apiRequest(`/api/orders/${orderId}`);
}

// [관리자] 모든 주문 목록 조회
export async function fetchAdminOrders(): Promise<any[]> {
  return apiRequest("/api/admin/orders");
}

// [관리자] 주문 상태 및 운송장 번호 수정
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

// [신규] 관리자: 주문 아이템 개별 상태 수정
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

// 백엔드 엔드포인트: PATCH /api/auth/user (예상)
export async function updateMyInfo(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}): Promise<any> {
  return apiRequest("/api/auth/user", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// [비밀번호 변경]
// 백엔드 엔드포인트: PUT /api/auth/password (예상)
export async function changeMyPassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<any> {
  // 백엔드에 추가한 경로와 일치해야 함 (PUT /api/auth/password)
  return apiRequest("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// [회원 탈퇴]
export async function withdrawUser(): Promise<void> {
  return apiRequest("/api/auth/user", {
    method: "DELETE",
  });
}

// [추가] 배송지 목록 조회
export async function fetchDeliveryAddresses(): Promise<any[]> {
  return apiRequest("/api/user/addresses");
}

// [추가] 배송지 추가 API
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

// [추가] 배송지 삭제
export async function deleteDeliveryAddress(addressId: number): Promise<void> {
  return apiRequest(`/api/user/addresses/${addressId}`, {
    method: "DELETE",
  });
}
