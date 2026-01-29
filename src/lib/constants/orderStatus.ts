// src/lib/constants/orderStatus.ts
// 주문 상태 스타일 및 라벨 통합 관리

import type { OrderStatus, OrderItemStatus } from "@/types/api";

// 주문 상태 스타일 정의
// - 대기 (Neutral): 아직 돈이 안 움직임 → Gray
// - 진행 (Active): 상점이 움직이는 중 → Primary (Blue)
// - 완료 (Success): 거래가 종료됨 → Green
// - 이슈 (Alert): 흐름이 끊기거나 돌아옴 → Destructive (Red)
export const ORDER_STATUS_STYLES: Record<
  OrderStatus | OrderItemStatus,
  { bg: string; text: string; label: string }
> = {
  // 대기 (Neutral) - Gray
  pending_payment: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    label: "입금대기",
  },
  paying: { bg: "bg-slate-100", text: "text-slate-600", label: "결제진행중" },
  cancelled: { bg: "bg-slate-100", text: "text-slate-600", label: "주문중단" },
  refunded: { bg: "bg-slate-100", text: "text-slate-600", label: "주문취소" },

  // 진행 (Active) - Primary
  payment_confirmed: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "결제완료",
  },
  preparing: { bg: "bg-primary/10", text: "text-primary", label: "배송준비중" },
  shipped: { bg: "bg-primary", text: "text-white", label: "배송중" },

  // 완료 (Success) - Green
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    label: "배송완료",
  },
  purchase_confirmed: {
    bg: "bg-emerald-600",
    text: "text-white",
    label: "구매확정",
  },

  // 이슈 (Alert) - Destructive
  partial_refunded: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    label: "부분환불",
  },
  return_requested: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "반품요청",
  },
  return_in_transit: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "반품배송중",
  },
  return_received: {
    bg: "bg-indigo-200",
    text: "text-indigo-700",
    label: "검수대기",
  },
};

/**
 * 주문 상태에 따른 CSS 클래스 반환 (배경색 + 텍스트색)
 */
export function getStatusClass(status: OrderStatus | OrderItemStatus): string {
  const style = ORDER_STATUS_STYLES[status];
  if (!style) return "bg-slate-100 text-slate-600";
  return `${style.bg} ${style.text}`;
}

/**
 * 주문 상태에 따른 한글 라벨 반환
 */
export function getStatusLabel(status: OrderStatus | OrderItemStatus): string {
  const style = ORDER_STATUS_STYLES[status];
  return style?.label || status;
}
