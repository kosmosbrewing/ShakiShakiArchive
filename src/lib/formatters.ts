// src/lib/formatters.ts
// 공통 포맷팅 유틸리티 함수

import type { PhoneParts, OrderStatus, OrderItemStatus } from "@/types/api";
import { getStatusLabel } from "@/lib/constants/orderStatus";

/**
 * KST 날짜 구성요소 추출
 * DB가 KST timestamp를 저장하고 pg 드라이버가 Z suffix를 붙여 UTC로 전달하므로,
 * timeZone: "UTC"로 설정하여 이중 변환(+9h 중복)을 방지
 */
const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23", // 0~23 보장 (자정 = "00", "24" 방지)
});

const kstParts = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const parts = kstFormatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
};

/**
 * 날짜 문자열을 YYYY.MM.DD 형식으로 변환 (KST 기준)
 */
export function formatDate(dateStr: string | null | undefined): string {
  const p = kstParts(dateStr);
  if (!p) return "-";
  return `${p.year}.${p.month}.${p.day}`;
}

/**
 * 날짜 문자열을 YYYY.MM.DD HH:mm 형식으로 변환 (KST 기준)
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  const p = kstParts(dateStr);
  if (!p) return "-";
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/**
 * 날짜 문자열을 한국어 형식으로 변환 (KST 기준)
 * 예: "2024년 9월 15일 오후 8시 32분"
 */
export function formatDateTimeWithSeconds(dateStr: string): string {
  const p = kstParts(dateStr);
  if (!p) return "-";

  const hourNum = parseInt(p.hour);
  const period = hourNum < 12 ? "오전" : "오후";
  let hours12 = hourNum % 12;
  if (hours12 === 0) hours12 = 12;

  return `${p.year}년 ${parseInt(p.month)}월 ${parseInt(p.day)}일 ${period} ${hours12}시 ${parseInt(p.minute)}분`;
}

/**
 * ISO 문자열을 datetime-local input 형식으로 변환 (KST 기준)
 * 예: "2024-09-15T20:32"
 */
export function formatDateTimeLocal(dateStr: string | null | undefined): string {
  const p = kstParts(dateStr);
  if (!p) return "";
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
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
 * 주문 아이템 상태(반품 포함)도 지원
 * @deprecated getStatusLabel 사용 권장 (src/lib/constants/orderStatus.ts)
 */
export function formatOrderStatus(status: OrderStatus | OrderItemStatus): string {
  return getStatusLabel(status);
}

/**
 * 사이즈 측정값 포맷팅
 * - 빈 값이면 "-" 반환
 * - 범위 형식 문자열 지원 (예: "34-54.5")
 */
export function formatSizeValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "-";
  }

  const strValue = String(value).trim();
  if (strValue === "" || strValue === "0") {
    return "-";
  }

  return strValue;
}

/**
 * 사용자 이름 마스킹 처리
 * 예: "홍길동" → "홍*동", "김철수" → "김*수", "이영" → "이*"
 */
export function maskUserName(name: string | undefined | null): string {
  if (!name || name.length === 0) {
    return "익명";
  }

  // 1글자인 경우
  if (name.length === 1) {
    return name;
  }

  // 2글자인 경우: 첫 글자만 보여주고 나머지 마스킹
  if (name.length === 2) {
    return name[0] + "*";
  }

  // 3글자 이상인 경우: 첫 글자와 마지막 글자 보여주고 중간 마스킹
  const firstChar = name[0];
  const lastChar = name[name.length - 1];
  const middleMask = "*".repeat(name.length - 2);

  return firstChar + middleMask + lastChar;
}

/**
 * 전화번호 마스킹 처리
 * 예: "010-1234-5678" → "010-****-5678"
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return "";

  // 하이픈으로 분리된 경우
  if (phone.includes("-")) {
    const parts = phone.split("-");
    if (parts.length === 3) {
      return `${parts[0]}-****-${parts[2]}`;
    }
  }

  // 하이픈 없이 숫자만 있는 경우 (예: 01012345678)
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(6)}`;
  }

  return phone; // 형식이 맞지 않으면 원본 반환
}

/**
 * 상세주소 마스킹 처리
 * 예: "101동 1004호" → "****"
 */
export function maskDetailAddress(detailAddress: string | undefined | null): string {
  if (!detailAddress) return "";
  return "****";
}
