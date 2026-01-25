// src/lib/messages/auth.ts
// 인증 관련 메시지 정의

/**
 * 인증 메시지
 */
export const AUTH_MESSAGES = {
  // 로그인 성공
  loginSuccess: "로그인되었습니다.",
  welcomeBack: "반가워요, {name}님!",

  // 로그인 실패
  loginFailed: "이메일 또는 비밀번호를 확인해주세요.",
  loginRequired: "로그인이 필요한 서비스입니다.",
  loginInfoLoadFailed: "로그인은 성공했으나 사용자 정보를 불러오는데 실패했습니다.",

  // 로그아웃
  logoutConfirm: "로그아웃 하시겠습니까?",
  logoutSuccess: "로그아웃되었습니다.",

  // 입력 검증
  emailRequired: "이메일을 입력해주세요.",
  passwordRequired: "비밀번호를 입력해주세요.",
  emailAndPasswordRequired: "이메일과 비밀번호를 모두 입력해주세요.",
  invalidEmailFormat: "올바른 이메일 형식을 입력하세요.",
  invalidEmailMessage: "유효한 이메일을 입력해주세요.",
  invalidPassword: "비밀번호는 8자 이상이어야 합니다.",

  // 회원가입
  signupSuccess: "회원가입이 완료되었습니다!",
  signupFailed: "회원가입 중 오류가 발생했습니다.",
  signupRedirect: "회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.",

  // 이메일 인증
  emailVerificationRequired: "이메일 인증을 완료해주세요.",
  emailVerificationSent: "인증코드가 발송되었습니다.",
  emailVerificationFailed: "인증코드 발송에 실패했습니다.",
  emailVerificationSuccess: "이메일 인증이 완료되었습니다.",
  emailAlreadyExists: "이미 가입된 이메일입니다.",
  invalidVerificationCode: "인증번호가 일치하지 않습니다.",
  verificationCodeRequired: "6자리 인증코드를 입력해주세요.",

  // 비밀번호
  passwordMismatch: "비밀번호가 일치하지 않습니다.",
  confirmPasswordRequired: "비밀번호 확인을 입력해주세요.",
  passwordChangeSuccess: "비밀번호가 변경되었습니다.",
  passwordResetSuccess: "비밀번호가 성공적으로 변경되었습니다.",
  passwordChangeFailed: "비밀번호 변경에 실패했습니다.",
  currentPasswordRequired: "현재 비밀번호를 입력해주세요.",
  newPasswordRequired: "새 비밀번호를 입력해주세요.",
  wrongCurrentPassword: "현재 비밀번호가 일치하지 않습니다.",

  // 소셜 로그인
  naverLoginFailed: "네이버 로그인 연결에 실패했습니다.",
  kakaoLoginFailed: "카카오 로그인 연결에 실패했습니다.",
  oauthFailed: "소셜 로그인에 실패했습니다.",

  // Rate Limiting
  tooManyAttempts: "로그인 시도 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.",

  // 닉네임
  userNameRequired: "닉네임을 입력해주세요.",

  // OAuth 관련
  oauthProcessingFailed: "로그인 처리에 실패했습니다. 다시 시도해주세요.",
  verificationCheckFailed: "인증 확인에 실패했습니다.",
  passwordResetFailed: "비밀번호 재설정 중 오류가 발생했습니다.",
} as const;

// 타입 추출
export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
