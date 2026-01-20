// src/lib/messages/product.ts
// 상품 관련 메시지 정의

/**
 * 상품 메시지
 */
export const PRODUCT_MESSAGES = {
  // 로딩/조회
  loadFailed: "상품 정보를 불러올 수 없습니다.",
  notFound: "상품을 찾을 수 없습니다.",

  // 옵션
  optionRequired: "옵션을 선택해주세요.",
  sizeRequired: "사이즈를 선택해주세요.",
  colorRequired: "색상을 선택해주세요.",

  // 재고
  outOfStock: "재고가 없는 상품입니다.",
  insufficientStock: "재고가 부족합니다.",

  // 가격
  invalidPrice: "상품 가격 정보가 올바르지 않습니다.",
  invalidProductInfo: "상품 정보가 올바르지 않습니다.",

  // 위시리스트
  wishlistAddSuccess: "위시리스트에 추가되었습니다.",
  wishlistRemoveSuccess: "위시리스트에서 제거되었습니다.",
  wishlistFailed: "위시리스트 처리에 실패했습니다.",

  // 링크 복사
  linkCopySuccess: "링크가 복사되었습니다.",
  linkCopyFailed: "링크 복사에 실패했습니다.",
} as const;

// 타입 추출
export type ProductMessageKey = keyof typeof PRODUCT_MESSAGES;
