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

  // 비밀번호 변경
  passwordChangeSuccess: "비밀번호가 변경되었습니다.",
  passwordChangeFailed: "비밀번호 변경에 실패했습니다.",
  currentPasswordRequired: "현재 비밀번호를 입력해주세요.",
  newPasswordRequired: "새 비밀번호를 입력해주세요.",

  // 유효성 검사
  userNameRequired: "닉네임을 입력해주세요.",
  currentPasswordRequiredForUpdate: "정보를 수정하려면 현재 비밀번호를 입력해주세요.",
  newPasswordConfirmRequired: "새 비밀번호 확인을 입력해주세요.",
  newPasswordMismatch: "새 비밀번호가 일치하지 않습니다.",
  sameAsCurrentPassword: "현재 비밀번호와 다른 비밀번호를 입력해주세요.",
  incorrectPassword: "비밀번호가 올바르지 않습니다.",
  incorrectCurrentPassword: "현재 비밀번호가 올바르지 않습니다.",

  // 기타 에러
  updateError: "오류 발생: {message}",
} as const;

// 타입 추출
export type AccountMessageKey = keyof typeof ACCOUNT_MESSAGES;
