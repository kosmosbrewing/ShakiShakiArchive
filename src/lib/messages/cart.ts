// src/lib/messages/cart.ts
// 장바구니 관련 메시지 정의

/**
 * 장바구니 메시지
 */
export const CART_MESSAGES = {
  // 성공
  addSuccess: "장바구니에 담았습니다.",
  removeSuccess: "상품이 삭제되었습니다.",
  updateSuccess: "수량이 변경되었습니다.",

  // 실패
  addFailed: "장바구니 담기에 실패했습니다.",
  removeFailed: "상품 삭제에 실패했습니다.",
  updateFailed: "수량 변경에 실패했습니다.",
  loadFailed: "장바구니 로드에 실패했습니다.",

  // 확인
  removeConfirm: "삭제하시겠습니까?",
  goToCartConfirm: "장바구니에 담았습니다. 이동하시겠습니까?",
  duplicateConfirm: "이미 장바구니에 담긴 상품입니다.\n추가로 담으시겠습니까?",

  // 상태
  empty: "장바구니가 비어있습니다.",

  // 재고 관련
  outOfStock: "재고가 없어 장바구니에 담을 수 없습니다.",
  insufficientStock: "재고가 부족합니다.",
  stockLimitExceeded: "아쉽게도 남은 재고가 부족하여 더 이상 담을 수 없어요. (재고: {stock}개)",
  stockExceededWithCart: "재고가 부족합니다. (재고: {stock}개, 장바구니: {cartQty}개)",
  outOfStockItems: "재고가 부족한 상품이 있습니다.\n해당 상품을 삭제해주세요.",

  // 수량 관련
  quantityLimit: "수량은 {min}~{max}개 사이로 입력해주세요.",
  maxQuantityReached: "최대 수량({max}개)을 초과할 수 없습니다.",
} as const;

// 타입 추출
export type CartMessageKey = keyof typeof CART_MESSAGES;
