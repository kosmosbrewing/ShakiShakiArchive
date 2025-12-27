// Alert 메시지 타입 정의
export type AlertType = "success" | "error";

// 성공 메시지 키
export type SuccessMessageKey =
  | "general"
  | "save"
  | "login"
  | "upload"
  | "deploy";

// 오류 메시지 키
export type ErrorMessageKey =
  | "inputError"
  | "forbidden"
  | "unauthorized"
  | "serverError"
  | "network";

// 전체 메시지 키
export type AlertMessageKey = SuccessMessageKey | ErrorMessageKey;

// 성공 메시지
export const SUCCESS_MESSAGES: Record<SuccessMessageKey, string> = {
  general: "성공적으로 처리되었습니다.",
  save: "변경사항이 안전하게 저장되었습니다.",
  login: "반갑습니다! 성공적으로 로그인되었습니다.",
  upload: "파일 업로드가 완료되었습니다.",
  deploy: "새로운 설정이 즉시 반영되었습니다.",
};

// 오류 메시지
export const ERROR_MESSAGES: Record<ErrorMessageKey, string> = {
  inputError: "입력하신 정보가 올바르지 않습니다.",
  forbidden: "이 작업을 수행할 권한이 없습니다.",
  unauthorized: "다시 로그인해주세요.",
  serverError: "잠시 후 다시 시도해주세요.",
  network: "인터넷 연결을 확인해주세요.",
};

// 메시지 가져오기 헬퍼 함수
export function getAlertMessage(type: AlertType, key: AlertMessageKey): string {
  if (type === "success") {
    return (
      SUCCESS_MESSAGES[key as SuccessMessageKey] || SUCCESS_MESSAGES.general
    );
  }
  return ERROR_MESSAGES[key as ErrorMessageKey] || ERROR_MESSAGES.serverError;
}

// HTTP 상태 코드에 따른 오류 메시지 매핑
export function getErrorMessageByStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.inputError;
    case 401:
      return ERROR_MESSAGES.unauthorized;
    case 403:
      return ERROR_MESSAGES.forbidden;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.serverError;
    default:
      return ERROR_MESSAGES.serverError;
  }
}
