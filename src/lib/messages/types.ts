// src/lib/messages/types.ts
// 메시지 시스템 타입 정의

/**
 * Alert 타입
 */
export type AlertType = "success" | "error";

/**
 * HTTP 상태 코드 타입
 */
export type HttpStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503;

/**
 * 메시지 객체 기본 타입
 * 각 도메인별 메시지 객체는 이 타입을 기반으로 확장됨
 */
export type MessageObject = Record<string, string>;

/**
 * 포맷 파라미터 타입
 * formatMessage 함수에서 사용되는 템플릿 변수 타입
 */
export type FormatParams = Record<string, string | number>;
