// src/lib/messages/account.ts
// 계정 관련 메시지 정의

/**
 * 계정 메시지
 */
export const ACCOUNT_MESSAGES = {
  // 프로필
  profileUpdateSuccess: "회원정보가 수정되었습니다.",
  profileUpdateFailed: "회원정보 수정에 실패했습니다.",
  profileLoadFailed: "회원정보를 불러오는데 실패했습니다.",

  // 배송지
  addressSaveSuccess: "배송지가 저장되었습니다.",
  addressUpdateSuccess: "배송지가 수정되었습니다.",
  addressDeleteSuccess: "배송지가 삭제되었습니다.",
  addressSaveFailed: "배송지 저장에 실패했습니다.",
  addressUpdateFailed: "배송지 수정에 실패했습니다.",
  addressDeleteFailed: "배송지 삭제에 실패했습니다.",
  addressRequired: "필수 항목을 모두 입력해주세요.",
  noAddresses: "등록된 배송지가 없습니다.",

  // 회원 탈퇴
  withdrawSuccess: "회원 탈퇴가 완료되었습니다.",
  withdrawFailed: "회원 탈퇴에 실패했습니다.",
  withdrawConfirm: "정말 탈퇴하시겠습니까? 모든 정보가 삭제됩니다.",
} as const;

// 타입 추출
export type AccountMessageKey = keyof typeof ACCOUNT_MESSAGES;
