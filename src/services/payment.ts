// src/services/payment.ts
// 결제 API 서비스 (토스페이먼츠, 카카오페이 등)

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * 결제 수단 타입
 */
export type PaymentMethod =
  | "CARD" // 카드
  | "VIRTUAL_ACCOUNT" // 가상계좌
  | "TRANSFER" // 계좌이체
  | "MOBILE" // 휴대폰
  | "TOSS_PAY" // 토스페이
  | "KAKAO_PAY" // 카카오페이
  | "NAVER_PAY"; // 네이버페이

/**
 * 결제 상태
 */
export type PaymentStatus =
  | "READY" // 결제 준비
  | "IN_PROGRESS" // 결제 진행 중
  | "DONE" // 결제 완료
  | "CANCELED" // 결제 취소
  | "PARTIAL_CANCELED" // 부분 취소
  | "ABORTED" // 결제 중단
  | "EXPIRED"; // 결제 만료

/**
 * 결제 요청 데이터
 */
export interface PaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
  method?: PaymentMethod;
}

/**
 * 결제 응답 데이터
 */
export interface PaymentResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: PaymentStatus;
  totalAmount: number;
  method: PaymentMethod;
  requestedAt: string;
  approvedAt?: string;
  receipt?: {
    url: string;
  };
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
  };
}

/**
 * 결제 확인 요청 데이터
 */
export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/**
 * 토스페이먼츠 결제 위젯 초기화
 * @see https://docs.tosspayments.com/guides/payment-widget/integration
 *
 * 사용 전 index.html에 스크립트 추가 필요:
 * <script src="https://js.tosspayments.com/v1/payment-widget"></script>
 */
export function initTossPayments(clientKey: string) {
  const TossPayments = (window as any).TossPayments;

  if (!TossPayments) {
    console.error("토스페이먼츠 SDK가 로드되지 않았습니다.");
    return null;
  }

  return TossPayments(clientKey);
}

/**
 * 토스페이먼츠 결제 요청
 */
export async function requestTossPayment(
  tossPayments: any,
  request: PaymentRequest
): Promise<void> {
  if (!tossPayments) {
    throw new Error("토스페이먼츠가 초기화되지 않았습니다.");
  }

  await tossPayments.requestPayment(request.method || "카드", {
    amount: request.amount,
    orderId: request.orderId,
    orderName: request.orderName,
    customerName: request.customerName,
    customerEmail: request.customerEmail,
    customerMobilePhone: request.customerMobilePhone,
    successUrl: request.successUrl,
    failUrl: request.failUrl,
  });
}

/**
 * 결제 확인 (서버 측 처리)
 * 결제 성공 후 서버에서 최종 확인을 위해 호출
 */
export async function confirmPayment(
  data: PaymentConfirmRequest
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE}/api/payments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "결제 확인 실패");
  }

  return response.json();
}

/**
 * 결제 취소 요청
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE}/api/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      cancelReason,
      cancelAmount,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "결제 취소 실패");
  }

  return response.json();
}

/**
 * 결제 정보 조회
 */
export async function getPaymentInfo(
  paymentKey: string
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE}/api/payments/${paymentKey}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "결제 정보 조회 실패");
  }

  return response.json();
}

/**
 * 카카오페이 결제 요청
 * @see https://developers.kakao.com/docs/latest/ko/kakaopay/single-payment
 */
export async function requestKakaoPay(request: PaymentRequest): Promise<{
  next_redirect_pc_url: string;
  tid: string;
}> {
  const response = await fetch(`${API_BASE}/api/payments/kakao/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      orderId: request.orderId,
      orderName: request.orderName,
      amount: request.amount,
      successUrl: request.successUrl,
      failUrl: request.failUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "카카오페이 결제 요청 실패");
  }

  return response.json();
}

/**
 * 카카오페이 결제 승인
 */
export async function approveKakaoPay(
  tid: string,
  pgToken: string
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE}/api/payments/kakao/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tid, pg_token: pgToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "카카오페이 결제 승인 실패");
  }

  return response.json();
}

/**
 * 결제 수단 표시 이름
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    CARD: "신용/체크카드",
    VIRTUAL_ACCOUNT: "가상계좌",
    TRANSFER: "계좌이체",
    MOBILE: "휴대폰 결제",
    TOSS_PAY: "토스페이",
    KAKAO_PAY: "카카오페이",
    NAVER_PAY: "네이버페이",
  };
  return labels[method] || method;
}

// ------------------------------------------------------------------
// 네이버페이 SDK (클라이언트 직접 호출 방식)
// ------------------------------------------------------------------

/**
 * 네이버페이 상품 아이템
 */
export interface NaverPayProductItem {
  categoryType: string; // 카테고리 타입 (ETC, PRODUCT 등)
  categoryId: string; // 카테고리 ID
  uid: string; // 상품 고유 ID
  name: string; // 상품명
  count: number; // 수량
}

/**
 * 네이버페이 결제 요청 데이터 (신규 - 클라이언트 SDK 직접 호출용)
 */
export interface NaverPayOpenRequest {
  merchantPayKey: string; // 가맹점 주문번호
  merchantUserKey: string; // 사용자 식별키 (암호화 권장)
  productName: string; // 상품명 (128자 이내)
  productCount: number; // 총 상품 수량
  totalPayAmount: number; // 총 결제 금액
  taxScopeAmount: number; // 과세 금액
  taxExScopeAmount: number; // 면세 금액
  returnUrl: string; // 결제 완료 후 리다이렉트 URL
  productItems: NaverPayProductItem[]; // 상품 정보 배열 (필수)
}

/**
 * 네이버페이 결제 요청 데이터 (기존 - 하위 호환용)
 * @deprecated NaverPayOpenRequest를 사용하세요
 */
export interface NaverPayOpenRequestLegacy {
  merchantPayKey: string;
  productName: string;
  productCount: string;
  totalPayAmount: string;
  taxScopeAmount: string;
  taxExScopeAmount: string;
  returnUrl: string;
}

/**
 * 네이버페이 SDK 인스턴스 타입
 */
export interface NaverPayInstance {
  open: (request: NaverPayOpenRequest) => void;
  close: () => void;
}

/**
 * 네이버페이 SDK 초기화 (openType 파라미터 추가로 팝업 방식 지원)
 * @param clientId - 네이버페이 클라이언트 ID
 * @param chainId - 네이버페이 체인 ID (merchantId)
 * @param mode - 환경 ("development" | "production")
 * @param payType - 결제 타입 ("normal" | "recurrent")
 * @param openType - 결제창 오픈 방식 ("popup" | "page"), 기본값 "popup" (모달 방식)
 */
export function initNaverPay(
  clientId: string,
  chainId: string,
  mode: "development" | "production" = "development",
  payType: "normal" | "recurrent" = "normal",
  openType: "popup" | "page" = "popup"
): NaverPayInstance | null {
  if (!window.Naver?.Pay?.create) {
    console.error("네이버페이 SDK가 로드되지 않았습니다.");
    return null;
  }

  return window.Naver.Pay.create({
    mode,
    clientId,
    chainId,
    payType,
    openType,
  });
}

/**
 * 네이버페이 팝업 결제 요청
 * @param naverPay - 네이버페이 SDK 인스턴스
 * @param request - 결제 요청 데이터
 */
export function requestNaverPayPopup(
  naverPay: NaverPayInstance,
  request: NaverPayOpenRequest
): void {
  naverPay.open(request);
}
