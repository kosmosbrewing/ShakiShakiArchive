// src/lib/messages/helpers.ts
// 메시지 헬퍼 함수

import type { HttpStatusCode, FormatParams, AlertType } from "./types";
import { ERROR_MESSAGES } from "./common";

/**
 * HTTP 상태 코드에 따른 오류 메시지 반환
 * @param status HTTP 상태 코드
 * @returns 해당 상태 코드에 맞는 오류 메시지
 */
export function getErrorByStatus(status: number): string {
  const statusMap: Record<HttpStatusCode, string> = {
    400: ERROR_MESSAGES.inputError,
    401: ERROR_MESSAGES.unauthorized,
    403: ERROR_MESSAGES.forbidden,
    404: ERROR_MESSAGES.notFound,
    409: "이미 존재하는 데이터입니다.",
    429: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    500: ERROR_MESSAGES.serverError,
    502: ERROR_MESSAGES.serverError,
    503: ERROR_MESSAGES.serverError,
  };

  return statusMap[status as HttpStatusCode] || ERROR_MESSAGES.serverError;
}

/**
 * 템플릿 문자열의 변수를 실제 값으로 치환
 * @param template 템플릿 문자열 (예: "최대 {max}개까지 담을 수 있습니다.")
 * @param params 치환할 값들
 * @returns 치환된 문자열
 *
 * @example
 * formatMessage("최대 {max}개까지 담을 수 있습니다.", { max: 99 })
 * // => "최대 99개까지 담을 수 있습니다."
 */
export function formatMessage(
  template: string,
  params: FormatParams
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key) => String(params[key] ?? `{${key}}`)
  );
}

/**
 * 메시지 객체에서 메시지 가져오기 (타입 안전)
 * @param messages 메시지 객체
 * @param key 메시지 키
 * @param fallback 기본값 (없을 경우)
 */
export function getMessage<T extends Record<string, string>>(
  messages: T,
  key: keyof T,
  fallback?: string
): string {
  return messages[key] ?? fallback ?? ERROR_MESSAGES.unknown;
}

/**
 * Alert 타입에 따른 메시지 반환 (하위 호환용)
 * @deprecated 새 코드에서는 직접 메시지 객체 사용 권장
 */
export function getAlertMessage(
  type: AlertType,
  key: string,
  successMessages: Record<string, string>,
  errorMessages: Record<string, string>
): string {
  if (type === "success") {
    return successMessages[key] || successMessages["general"] || "처리되었습니다.";
  }
  return errorMessages[key] || errorMessages["serverError"] || ERROR_MESSAGES.serverError;
}
