// src/lib/messages/common.ts
// 공통 메시지 정의

/**
 * 공통 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  // 일반
  general: "성공적으로 처리되었습니다.",
  save: "변경사항이 저장되었습니다.",
  delete: "삭제되었습니다.",
  copy: "복사되었습니다.",

  // 데이터 처리
  load: "데이터를 불러왔습니다.",
  update: "수정되었습니다.",
  create: "등록되었습니다.",

  // 하위 호환성 (기존 alertMessages.ts 키)
  login: "반갑습니다! 성공적으로 로그인되었습니다.",
  upload: "파일 업로드가 완료되었습니다.",
  deploy: "새로운 설정이 즉시 반영되었습니다.",
} as const;

/**
 * 공통 오류 메시지
 */
export const ERROR_MESSAGES = {
  // 입력 관련
  inputError: "입력하신 정보가 올바르지 않습니다.",
  requiredField: "필수 항목을 모두 입력해주세요.",
  invalidFormat: "올바른 형식으로 입력해주세요.",

  // 권한 관련
  forbidden: "이 작업을 수행할 권한이 없습니다.",
  unauthorized: "다시 로그인해주세요.",
  adminOnly: "관리자만 접근할 수 있습니다.",

  // 서버/네트워크 관련
  serverError: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  network: "네트워크 연결을 확인해주세요.",
  timeout: "요청 시간이 초과되었습니다.",
  connectionFailed: "서버에 연결할 수 없습니다.",

  // 데이터 관련
  loadFailed: "데이터를 불러오는데 실패했습니다.",
  saveFailed: "저장에 실패했습니다.",
  deleteFailed: "삭제에 실패했습니다.",
  notFound: "요청한 정보를 찾을 수 없습니다.",

  // 일반
  unknown: "알 수 없는 오류가 발생했습니다.",
} as const;

/**
 * 확인 메시지 (confirm dialog용)
 */
export const CONFIRM_MESSAGES = {
  delete: "정말 삭제하시겠습니까?",
  cancel: "변경사항이 저장되지 않습니다. 취소하시겠습니까?",
  leave: "이 페이지를 떠나시겠습니까?",
} as const;

// 타입 추출
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type ConfirmMessageKey = keyof typeof CONFIRM_MESSAGES;
