// src/lib/messages/index.ts
// 메시지 시스템 통합 export

// 타입
export type {
  AlertType,
  HttpStatusCode,
  MessageObject,
  FormatParams,
} from "./types";

// 헬퍼 함수
export {
  getErrorByStatus,
  formatMessage,
  getMessage,
  getAlertMessage,
} from "./helpers";

// 공통 메시지
export {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  CONFIRM_MESSAGES,
  type SuccessMessageKey,
  type ErrorMessageKey,
  type ValidationMessageKey,
  type ConfirmMessageKey,
} from "./common";

// 도메인별 메시지
export { AUTH_MESSAGES, type AuthMessageKey } from "./auth";
export { ACCOUNT_MESSAGES, type AccountMessageKey } from "./account";
export { CART_MESSAGES, type CartMessageKey } from "./cart";
export { ORDER_MESSAGES, type OrderMessageKey } from "./order";
export { PRODUCT_MESSAGES, type ProductMessageKey } from "./product";
export { INQUIRY_MESSAGES, type InquiryMessageKey } from "./inquiry";
export { ADMIN_MESSAGES, type AdminMessageKey } from "./admin";
