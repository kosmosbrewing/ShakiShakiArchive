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

  // 유효성 검사
  noOrderItems: "주문할 상품이 없습니다.",
  recipientRequired: "수령인을 입력해주세요.",
  phoneInvalid: "올바른 연락처를 입력해주세요.",
  addressRequired: "주소를 검색해주세요.",
  detailAddressRequired: "상세 주소를 입력해주세요.",
  paymentMethodRequired: "결제 수단을 선택해주세요.",
  invalidPrice: "상품 가격 정보가 올바르지 않습니다.",
  invalidQuantity: "상품 수량이 올바르지 않습니다.",
  amountMismatch: "주문 금액 계산에 오류가 있습니다. 새로고침 후 다시 시도해주세요.",

  // 결제 에러 (PG사 공통)
  paymentError: "결제 처리 중 오류가 발생했습니다.",
  insufficientBalance: "계좌 잔액이 부족합니다.\n잔액을 확인해주세요.",
  cardLimitExceeded: "카드 한도가 부족합니다.\n다른 결제 수단을 이용해주세요.",
  authenticationFailed: "본인 인증에 실패했습니다.\n카드 정보를 확인해주세요.",
  verificationFailed: "인증에 실패했습니다.\n다시 시도해주세요.",
  paymentExpired: "결제 시간이 만료되었습니다.\n다시 시도해주세요.",
  bankMaintenance: "은행 시스템 점검 중입니다.\n잠시 후 다시 시도해주세요.",
  systemMaintenance: "결제 시스템 점검 중입니다.\n다른 결제 수단을 이용해주세요.",
  serviceMaintenance: "서비스 점검 중입니다.\n잠시 후 다시 시도해주세요.",
  alreadyProcessed: "이미 처리된 결제입니다.\n주문 내역을 확인해주세요.",
  cancelledOrder: "취소된 주문입니다.\n새로운 주문을 생성해주세요.",
  networkUnstable: "네트워크 연결이 불안정합니다.\n인터넷 연결 확인 후 다시 시도해주세요.",
  cardUnavailable: "사용할 수 없는 카드입니다.\n다른 카드로 결제해주세요.",
  paymentErrorRetry: "결제 처리 중 오류가 발생했습니다.\n다시 시도해주세요.",

  // SDK 관련
  tossSdkNotLoaded: "토스페이먼츠 SDK가 로드되지 않았습니다.",
  naverpaySdkNotLoaded: "네이버페이 SDK가 로드되지 않았습니다.",
  paymentPrepareError: "결제 준비 중 오류가 발생했습니다.",

  // 재고 관련
  stockShortage: "재고가 부족합니다.",
  stockShortageRefund: "재고가 부족하여 결제가 취소되었습니다.\n결제 금액은 자동으로 환불됩니다.",
  orderCreateFailed: "주문 생성에 실패했습니다. 재고 부족일 수 있습니다.",

  // 배송 관련
  trackingNumberNotReady: "아직 운송장 번호가 등록되지 않았습니다.",

  // 결제창 관련
  paymentWindowClosed: "결제창이 닫혔습니다.\n결제가 완료되지 않은 경우 주문이 자동으로 취소됩니다.",
  paymentApprovalFailed: "결제 승인에 실패했습니다.",

  // 취소 관련 상세
  cancelFailedRetry: "주문 취소에 실패했습니다. 다시 시도해주세요.",

  // 상품 정보 오류
  invalidProductInfo: "잘못된 상품 정보입니다.",
  noOrderItemsInfo: "주문할 상품 정보가 없습니다.",

  // 부분 취소 관련
  partialCancelSuccess: "선택한 상품이 취소되었습니다.",
  partialCancelFailed: "부분 취소에 실패했습니다.",
  partialCancelConfirm: "선택한 상품을 취소하시겠습니까?\n취소된 상품은 되돌릴 수 없습니다.",
  selectCancelItems: "취소할 상품을 선택해주세요.",
  noSelectableItems: "취소 가능한 상품이 없습니다.",

  // 환불 안내
  refundGuide: "환불은 결제 수단에 따라 즉시 ~ 3영업일 내 완료됩니다.",

  // 반품 관련
  returnRequestSuccess: "반품 요청이 접수되었습니다.",
  returnRequestFailed: "반품 요청에 실패했습니다.",
  returnTrackingSuccess: "반품 운송장이 등록되었습니다.",
  returnTrackingFailed: "운송장 등록에 실패했습니다.",
  returnReasonRequired: "반품 사유를 선택해주세요.",
  returnDetailReasonRequired: "상세 사유를 입력해주세요.",
  returnTrackingRequired: "운송장 번호를 입력해주세요.",
  returnCourierRequired: "택배사를 선택해주세요.",
  returnGuide: "반품은 상품 회수 및 검수 완료 후 3영업일 내 처리됩니다.",
  returnShippingGuide: "상품을 포장 후 택배로 발송해주세요.\n발송 후 운송장 번호를 등록하면 반품 처리가 진행됩니다.",
  returnNotReturnable: "반품 가능한 상태가 아닙니다.",
} as const;

// 타입 추출
export type OrderMessageKey = keyof typeof ORDER_MESSAGES;
