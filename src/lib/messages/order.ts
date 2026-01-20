// src/lib/messages/order.ts
// 주문 관련 메시지 정의

/**
 * 주문 메시지
 */
export const ORDER_MESSAGES = {
  // 성공
  orderSuccess: "주문이 완료되었습니다.",
  paymentSuccess: "결제가 완료되었습니다.",
  cancelSuccess: "주문이 취소되었습니다.",
  refundSuccess: "환불이 처리되었습니다.",

  // 실패
  orderFailed: "주문에 실패했습니다.",
  paymentFailed: "결제에 실패했습니다.",
  cancelFailed: "주문 취소에 실패했습니다.",
  refundFailed: "환불 처리에 실패했습니다.",
  loadFailed: "주문 정보를 불러오는데 실패했습니다.",

  // 확인
  cancelConfirm: "정말 주문을 취소하시겠습니까?",
  requireLoginForOrder: "주문을 위해 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?",

  // 상태
  noOrders: "주문 내역이 없습니다.",
  orderNotFound: "주문 정보를 찾을 수 없습니다.",

  // 결제 관련
  paymentProcessing: "결제 처리 중...",
  paymentTimeout: "결제 시간이 초과되었습니다.",
  paymentCancelled: "결제가 취소되었습니다.",
  invalidPaymentInfo: "결제 정보가 올바르지 않습니다.",

  // 배송지 관련
  shippingAddressRequired: "배송지를 선택해주세요.",
  invalidShippingInfo: "배송 정보가 올바르지 않습니다.",

  // 서비스 준비중
  servicePreparation: "서비스 준비중입니다. 곧 찾아뵙겠습니다!",
} as const;

// 타입 추출
export type OrderMessageKey = keyof typeof ORDER_MESSAGES;
