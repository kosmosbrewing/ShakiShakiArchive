/**
 * 백엔드와 동일한 비밀번호 복잡도 검증
 * OWASP 기준: 최소 8자 + 3가지 이상 조합
 */
export function validatePasswordComplexity(password: string): boolean {
  if (password.length < 8) return false;

  let complexity = 0;
  if (/[a-z]/.test(password)) complexity++; // 영문 소문자
  if (/[A-Z]/.test(password)) complexity++; // 영문 대문자
  if (/[0-9]/.test(password)) complexity++; // 숫자
  if (/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password)) complexity++; // 특수문자

  return complexity >= 3;
}

/**
 * 비밀번호 강도 상세 정보 반환
 */
export interface PasswordStrength {
  valid: boolean;
  strength: "약함" | "보통" | "강함";
  score: number; // 0-4
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
  complexity: number; // 충족한 조건 개수
  message: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password),
  };

  const complexity = [
    checks.lowercase,
    checks.uppercase,
    checks.number,
    checks.special,
  ].filter(Boolean).length;

  const valid = checks.length && complexity >= 3;

  let strength: "약함" | "보통" | "강함";
  let message: string;

  if (!checks.length) {
    strength = "약함";
    message = "최소 8자 이상 입력해주세요";
  } else if (complexity < 3) {
    strength = "약함";
    message = `더 안전한 비밀번호를 위해 조합을 추가해 주세요 (${complexity}/3)`;
  } else if (complexity === 3) {
    strength = "보통";
    message = "이제 안전하게 사용할 수 있어요";
  } else {
    strength = "강함";
    message = "매우 안전하고 강력해요!";
  }

  return {
    valid,
    strength,
    score: complexity,
    checks,
    complexity,
    message,
  };
}

/**
 * 비밀번호 에러 메시지 생성 (백엔드와 동일)
 */
export function getPasswordErrorMessage(password: string): string | null {
  const strength = getPasswordStrength(password);

  if (!strength.valid) {
    return strength.message;
  }

  return null;
}
