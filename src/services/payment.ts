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
