// src/components/ui/alert/alertMessages.ts
// 하위 호환성을 위한 래퍼 파일
// @deprecated 새 코드에서는 @/lib/messages 직접 사용 권장

import {
  SUCCESS_MESSAGES as _SUCCESS_MESSAGES,
  ERROR_MESSAGES as _ERROR_MESSAGES,
  getErrorByStatus,
} from "@/lib/messages";

// 새 메시지 시스템에서 re-export
export type { AlertType } from "@/lib/messages";
export const SUCCESS_MESSAGES = _SUCCESS_MESSAGES;
export const ERROR_MESSAGES = _ERROR_MESSAGES;
export { getErrorByStatus as getErrorMessageByStatus };

// 기존 타입 호환성 유지
export type SuccessMessageKey = "general" | "save" | "login" | "upload" | "deploy";
export type ErrorMessageKey = "inputError" | "forbidden" | "unauthorized" | "serverError" | "network";
export type AlertMessageKey = SuccessMessageKey | ErrorMessageKey;

/**
 * @deprecated 새 코드에서는 직접 메시지 객체 사용 권장
 * @example
 * // Before
 * getAlertMessage("error", "serverError")
 * // After
 * import { ERROR_MESSAGES } from "@/lib/messages";
 * ERROR_MESSAGES.serverError
 */
export function getAlertMessage(type: "success" | "error", key: AlertMessageKey): string {
  if (type === "success") {
    return SUCCESS_MESSAGES[key as keyof typeof SUCCESS_MESSAGES] || SUCCESS_MESSAGES.general;
  }
  return ERROR_MESSAGES[key as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.serverError;
}
