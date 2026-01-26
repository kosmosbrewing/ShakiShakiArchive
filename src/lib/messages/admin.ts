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

  // 회원 관리
  userListLoadFailed: "회원 목록을 불러오는데 실패했습니다.",
  userDetailLoadFailed: "회원 상세 정보를 불러오는데 실패했습니다.",
  userSearchFailed: "사용자 검색에 실패했습니다.",
  userRoleUpdateFailed: "관리자 권한 변경에 실패했습니다.",

  // 확인
  deleteConfirm: "정말 삭제하시겠습니까?",
  cannotUndo: "이 작업은 되돌릴 수 없습니다.",

  // 주문 관리 상세
  orderStatusSaveSuccess: "상태가 저장되었습니다.",
  shippingInfoSaveSuccess: "배송 정보가 저장되었습니다.",
  saveFailed: "저장 실패: {message}",

  // 사이트 이미지 관리
  siteImageUpdateSuccess: "이미지가 수정되었습니다.",
  siteImageCreateSuccess: "이미지가 추가되었습니다.",

  // 비밀번호 확인
  passwordVerifyFailed: "비밀번호 확인에 실패했습니다.",

  // 파일 업로드 관련
  singleFileOnly: "하나의 이미지만 선택해주세요.",
  supportedImageFormats: "JPEG, PNG, GIF, WebP 형식만 지원됩니다.",
  fileSizeLimit: "파일 크기는 10MB 이하여야 합니다.",
  imageRequired: "이미지를 업로드해주세요.",
  maxFilesExceeded: "최대 {max}개까지만 업로드 가능합니다.",
  imageTypeLimitExceeded: "{type} 이미지는 최대 {max}개까지 등록 가능합니다.",

  // 카테고리 관련
  categoryIdAndNameRequired: "이름과 Category ID는 필수 입력 항목입니다.",

  // 상품 관련
  requiredFieldsMissing: "필수 항목(*)을 모두 입력해주세요.",
  sizeAndSkuRequired: "사이즈와 SKU는 필수입니다.",
} as const;

// 타입 추출
export type AdminMessageKey = keyof typeof ADMIN_MESSAGES;
