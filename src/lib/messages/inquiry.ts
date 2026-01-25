// src/lib/messages/inquiry.ts
// 문의 관련 메시지 정의

/**
 * 문의 메시지
 */
export const INQUIRY_MESSAGES = {
  // 성공
  createSuccess: "문의가 등록되었습니다.",
  updateSuccess: "문의가 수정되었습니다.",
  deleteSuccess: "문의가 삭제되었습니다.",
  replySuccess: "답변이 등록되었습니다.",

  // 실패
  createFailed: "문의 등록에 실패했습니다.",
  updateFailed: "문의 수정에 실패했습니다.",
  deleteFailed: "문의 삭제에 실패했습니다.",
  replyFailed: "답변 등록에 실패했습니다.",
  loadFailed: "문의 정보를 불러오는데 실패했습니다.",
  statusChangeFailed: "상태 변경에 실패했습니다.",
  replyDeleteFailed: "답변 삭제에 실패했습니다.",

  // 답변 삭제
  replyDeleteSuccess: "답변이 삭제되었습니다.",

  // 확인
  deleteConfirm: "정말 삭제하시겠습니까?",

  // 상태
  noInquiries: "등록된 문의가 없습니다.",
  notFound: "문의를 찾을 수 없습니다.",
  answered: "답변 완료",
  pending: "답변 대기",

  // 검증
  titleRequired: "제목을 입력해주세요.",
  contentRequired: "내용을 입력해주세요.",
  categoryRequired: "문의 유형을 선택해주세요.",
  titleAndContentRequired: "제목과 내용을 입력해주세요.",
  replyContentRequired: "답변 내용을 입력해주세요.",

  // 권한
  accessDenied: "접근 권한이 없습니다.",
  privateInquiryAccessDenied: "비밀글은 작성자만 확인할 수 있습니다.",
} as const;

// 타입 추출
export type InquiryMessageKey = keyof typeof INQUIRY_MESSAGES;
