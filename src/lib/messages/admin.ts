// src/lib/messages/admin.ts
// 관리자 관련 메시지 정의

/**
 * 관리자 메시지
 */
export const ADMIN_MESSAGES = {
  // 공통 CRUD
  createSuccess: "등록되었습니다.",
  updateSuccess: "수정되었습니다.",
  deleteSuccess: "삭제되었습니다.",
  createFailed: "등록에 실패했습니다.",
  updateFailed: "수정에 실패했습니다.",
  deleteFailed: "삭제에 실패했습니다.",

  // 상품 관리
  productCreateSuccess: "상품이 등록되었습니다.",
  productUpdateSuccess: "상품이 수정되었습니다.",
  productDeleteSuccess: "상품이 삭제되었습니다.",
  productCreateFailed: "상품 등록에 실패했습니다.",
  productUpdateFailed: "상품 수정에 실패했습니다.",
  productDeleteFailed: "상품 삭제에 실패했습니다.",

  // 카테고리 관리
  categoryCreateSuccess: "카테고리가 등록되었습니다.",
  categoryUpdateSuccess: "카테고리가 수정되었습니다.",
  categoryDeleteSuccess: "카테고리가 삭제되었습니다.",
  categoryCreateFailed: "카테고리 등록에 실패했습니다.",
  categoryUpdateFailed: "카테고리 수정에 실패했습니다.",
  categoryDeleteFailed: "카테고리 삭제에 실패했습니다.",

  // 주문 관리
  orderStatusUpdateSuccess: "주문 상태가 변경되었습니다.",
  orderStatusUpdateFailed: "주문 상태 변경에 실패했습니다.",

  // 문의 관리
  inquiryReplySuccess: "답변이 등록되었습니다.",
  inquiryReplyFailed: "답변 등록에 실패했습니다.",

  // 이미지 관리
  imageUploadSuccess: "이미지가 업로드되었습니다.",
  imageUploadFailed: "이미지 업로드에 실패했습니다.",
  imageDeleteSuccess: "이미지가 삭제되었습니다.",
  imageDeleteFailed: "이미지 삭제에 실패했습니다.",

  // 권한
  accessDenied: "접근 권한이 없습니다. (관리자 전용)",
  adminOnly: "관리자만 접근할 수 있습니다.",

  // 확인
  deleteConfirm: "정말 삭제하시겠습니까?",
  cannotUndo: "이 작업은 되돌릴 수 없습니다.",
} as const;

// 타입 추출
export type AdminMessageKey = keyof typeof ADMIN_MESSAGES;
