// src/lib/constants/order.ts
// 주문/취소/반품 관련 상수 정의

import type { OrderStatus, OrderItemStatus, ReturnReasonType, ReturnStatus } from "@/types/api";

// 반품 사유 옵션
export const RETURN_REASON_OPTIONS: {
  value: ReturnReasonType;
  label: string;
}[] = [
  { value: "change_mind", label: "단순 변심" },
  { value: "defect", label: "상품 불량" },
  { value: "wrong_item", label: "오배송" },
  { value: "other", label: "기타" },
] as const;

// 취소 가능 상태 (배송 전)
export const CANCELABLE_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paying",
  "payment_confirmed",
  "preparing",
] as const;

// 반품 가능 상태 (배송 후)
export const RETURNABLE_STATUSES: OrderItemStatus[] = [
  "shipped",
  "delivered",
] as const;

// 반품 상태 라벨
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "반품 요청됨",
  in_transit: "반품 배송 중",
  received: "검수 대기 중",
  refunded: "환불 완료",
  rejected: "반품 거절됨",
};

// 택배사 옵션
export const COURIER_OPTIONS = [
  { value: "CJ대한통운", label: "CJ대한통운" },
  { value: "한진택배", label: "한진택배" },
  { value: "롯데택배", label: "롯데택배" },
  { value: "우체국택배", label: "우체국택배" },
  { value: "로젠택배", label: "로젠택배" },
] as const;

// 취소 사유 옵션
export const CANCEL_REASON_OPTIONS = [
  { value: "change_mind", label: "단순 변심" },
  { value: "option_change", label: "상품 옵션 변경" },
  { value: "shipping_delay", label: "배송 지연" },
  { value: "other", label: "기타" },
] as const;

// 아이템 상태가 취소 가능한지 확인
export function isCancelable(status: OrderStatus | OrderItemStatus): boolean {
  return (CANCELABLE_STATUSES as readonly string[]).includes(status);
}

// 아이템 상태가 반품 가능한지 확인
export function isReturnable(status: OrderStatus | OrderItemStatus): boolean {
  return (RETURNABLE_STATUSES as readonly string[]).includes(status);
}

// 아이템 상태가 반품 진행 중인지 확인
export function isReturnInProgress(status: OrderItemStatus): boolean {
  return ["return_requested", "return_in_transit", "return_received"].includes(status);
}

// 주문 아이템 상태별 정렬 우선순위 (낮을수록 먼저 표시)
const STATUS_SORT_ORDER: Record<string, number> = {
  // 활성 상태 (먼저 표시)
  preparing: 1,
  shipped: 2,
  payment_confirmed: 3,
  pending_payment: 4,
  paying: 5,
  delivered: 6,
  purchase_confirmed: 7,  // 구매확정 (배송완료 다음)
  // 반품 진행 중
  return_requested: 10,
  return_in_transit: 11,
  return_received: 12,
  // 취소/환불 (나중에 표시)
  cancelled: 20,
  refunded: 21,
  partial_refunded: 22,
};

// 주문 아이템 상태 우선순위 가져오기
function getStatusPriority(status: string): number {
  return STATUS_SORT_ORDER[status] ?? 99;
}

// 주문 아이템 정렬 (활성 상태 먼저, 취소/환불 나중에)
export function sortOrderItems<T extends { status: string; id?: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    // 같은 상태면 ID 순서 유지 (원래 순서)
    return (a.id ?? 0) - (b.id ?? 0);
  });
}
