// src/lib/formatters.ts
// 공통 포맷팅 유틸리티 함수

import type { PhoneParts, OrderStatus } from "@/types/api";

/**
 * 날짜 문자열을 YYYY.MM.DD 형식으로 변환
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * 날짜 문자열을 YYYY.MM.DD HH:mm 형식으로 변환
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

/**
 * 숫자 또는 문자열을 한국 원화 형식으로 변환
 */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === "string" ? Number(price) : price;
  return numPrice.toLocaleString("ko-KR") + "원";
}

/**
 * 숫자만 포맷팅 (원 단위 없이)
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("ko-KR");
}

/**
 * 전화번호 문자열을 3분할 객체로 파싱
 */
export function parsePhone(phone: string): PhoneParts {
  if (!phone) {
    return { part1: "010", part2: "", part3: "" };
  }

  // 하이픈이 포함된 경우
  if (phone.includes("-")) {
    const parts = phone.split("-");
    if (parts.length === 3) {
      return { part1: parts[0], part2: parts[1], part3: parts[2] };
    }
  }

  // 하이픈 없이 연속된 숫자인 경우
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return {
      part1: cleaned.substring(0, 3),
      part2: cleaned.substring(3, 7),
      part3: cleaned.substring(7),
    };
  }

  return { part1: "010", part2: "", part3: "" };
}

/**
 * 전화번호 파츠를 하이픈 포함 문자열로 합침
 */
export function formatPhone(parts: PhoneParts): string {
  return `${parts.part1}-${parts.part2}-${parts.part3}`;
}

/**
 * 전화번호 유효성 검사
 */
export function isValidPhone(parts: PhoneParts): boolean {
  return (
    parts.part1.length >= 2 &&
    parts.part2.length >= 3 &&
    parts.part3.length >= 4
  );
}

/**
 * 주문 상태 코드를 한글로 변환
 */
export function formatOrderStatus(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    pending_payment: "입금대기",
    payment_confirmed: "결제완료",
    preparing: "배송준비중",
    shipped: "배송중",
    delivered: "배송완료",
    cancelled: "주문취소",
  };
  return statusMap[status] || status;
}

/**
 * 사이즈 측정값 포맷팅 (0이면 "-" 반환)
 */
export function formatSizeValue(value: number | undefined | null): string | number {
  if (value === undefined || value === null || Number(value) <= 0) {
    return "-";
  }
  return Number(value);
}
