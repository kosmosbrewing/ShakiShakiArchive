// src/composables/useOrders.ts
// 주문 관련 로직

import { ref, reactive, onMounted } from "vue";
import {
  fetchOrders,
  fetchAllOrders,
  fetchOrder,
  createOrder,
  cancelOrder,
} from "@/lib/api";
import type {
  Order,
  OrderItem,
  OrderStatusCounts,
  OrderStatus,
  OrderItemStatus,
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/types/api";

// 주문 상태별 Badge variant
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * 주문 상태에 따른 Badge variant 반환
 * 주문 아이템 상태(반품 포함)도 지원
 */
export function getStatusVariant(status: OrderStatus | OrderItemStatus): BadgeVariant {
  switch (status) {
    // 진행 중 상태 - primary 색상 (파란색)
    case "payment_confirmed":
    case "preparing":
    case "shipped":
      return "default";
    // 완료 상태 - 파스텔 녹색 (CSS 오버라이드)
    case "delivered":
      return "outline";
    // 구매확정 상태 - 파스텔 파란색 (CSS 오버라이드)
    case "purchase_confirmed":
      return "outline";
    // 취소/환불 상태 - 파스텔 빨간색 (CSS 오버라이드)
    case "cancelled":
    case "refunded":
    case "partial_refunded":
      return "outline";
    // 반품 상태 - 파스텔 노란색 (CSS 오버라이드)
    case "return_requested":
    case "return_in_transit":
    case "return_received":
      return "outline";
    // 기타 (거의 표시 안됨)
    case "pending_payment":
    case "paying":
    default:
      return "outline";
  }
}

/**
 * 주문 상태별 추가 CSS 클래스
 * 파스텔 톤 색상으로 부드러운 디자인 적용 (border 완전 제거)
 */
export function getStatusClass(status: OrderStatus | OrderItemStatus): string {
  switch (status) {
    case "delivered":
      // 파스텔 녹색 - 배송완료 상태
      return "bg-green-50 hover:bg-green-100 text-green-700 border-0";
    case "purchase_confirmed":
      // 파스텔 파란색 - 구매확정 상태
      return "bg-blue-50 hover:bg-blue-100 text-blue-700 border-0";
    case "cancelled":
    case "refunded":
      // 파스텔 빨간색 - 취소/환불 상태
      return "bg-red-50 hover:bg-red-100 text-red-700 border-0";
    case "partial_refunded":
      // 파스텔 보라색 - 부분 환불 상태
      return "bg-purple-50 hover:bg-purple-100 text-purple-700 border-0";
    case "return_requested":
    case "return_in_transit":
    case "return_received":
      // 파스텔 노란색 - 반품 진행 상태
      return "bg-amber-50 hover:bg-amber-100 text-amber-700 border-0";
    default:
      return "";
  }
}

/**
 * 주문 목록 조회 및 관리 (무한 스크롤 지원 - 상태 기반 잠금)
 */
export function useOrders() {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

  // 페이지네이션 상태
  const currentPage = ref(1);
  const hasMore = ref(true);
  const totalOrders = ref(0);
  const pageSize = 10;

  // 주문 목록 초기 로드 (상세 정보 포함)
  const loadOrders = async () => {
    loading.value = true;
    error.value = null;
    currentPage.value = 1;
    hasMore.value = true;

    try {
      const response = await fetchOrders(1, pageSize);
      totalOrders.value = response.pagination.total;
      hasMore.value = response.pagination.hasMore;

      // 백엔드에서 이미 orderItems와 product 정보를 포함하여 반환
      orders.value = response.orders;
    } catch (e) {
      error.value = "주문 목록 로드 실패";
      console.error("주문 목록 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  // 추가 주문 목록 로드 (무한 스크롤용 - 상태 기반 잠금)
  const loadMoreOrders = async () => {
    // 상태 기반 잠금: 이미 로딩 중이거나 더 이상 데이터가 없으면 스킵
    if (loadingMore.value || loading.value || !hasMore.value) return;

    // 잠금 설정
    loadingMore.value = true;
    const nextPage = currentPage.value + 1;

    try {
      const response = await fetchOrders(nextPage, pageSize);
      hasMore.value = response.pagination.hasMore;
      currentPage.value = nextPage;

      // 백엔드에서 이미 orderItems와 product 정보를 포함하여 반환
      orders.value = [...orders.value, ...response.orders];
    } catch (e) {
      console.error("추가 주문 로드 실패:", e);
    } finally {
      // 잠금 해제
      loadingMore.value = false;
    }
  };

  // 단일 주문 조회
  const loadOrder = async (orderId: string) => {
    loading.value = true;
    error.value = null;
    try {
      return await fetchOrder(orderId);
    } catch (e) {
      error.value = "주문 정보 로드 실패";
      console.error("주문 정보 로드 실패:", e);
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    orders,
    loading,
    loadingMore,
    error,
    hasMore,
    totalOrders,
    loadOrders,
    loadMoreOrders,
    loadOrder,
    getStatusVariant,
    getStatusClass,
  };
}

/**
 * 주문 통계 (Account 페이지용)
 */
export function useOrderStats() {
  const orderCounts = reactive<OrderStatusCounts>({
    pending: 0,
    payment_confirmed: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
  });
  const loading = ref(false);

  // 주문 현황 통계 로드
  const loadOrderStats = async () => {
    loading.value = true;
    try {
      // 백엔드에서 이미 orderItems 정보를 포함하여 반환
      const ordersWithItems = await fetchAllOrders();

      // 카운트 초기화
      orderCounts.pending = 0;
      orderCounts.payment_confirmed = 0;
      orderCounts.preparing = 0;
      orderCounts.shipped = 0;
      orderCounts.delivered = 0;

      // 사용자에게 숨길 상태 (OrderList와 동일하게 유지)
      const hiddenStatuses = ["cancelled", "paying"];

      // 각 주문 아이템의 상태별 카운트
      ordersWithItems.forEach((order) => {
        if (order?.orderItems) {
          order.orderItems.forEach((item: OrderItem) => {
            // 숨겨진 상태는 카운트하지 않음
            if (hiddenStatuses.includes(item.status)) {
              return;
            }

            switch (item.status) {
              case "pending_payment":
                orderCounts.pending++;
                break;
              case "payment_confirmed":
                orderCounts.payment_confirmed++;
                break;
              case "preparing":
                orderCounts.preparing++;
                break;
              case "shipped":
                orderCounts.shipped++;
                break;
              case "delivered":
                orderCounts.delivered++;
                break;
            }
          });
        }
      });
    } catch (e) {
      console.error("주문 현황 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  return {
    orderCounts,
    loading,
    loadOrderStats,
  };
}

/**
 * 주문 생성
 */
export function useCreateOrder() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const orderResult = ref<CreateOrderResponse | null>(null);

  // 주문 생성 (결제 전)
  const submitOrder = async (
    params: CreateOrderRequest
  ): Promise<CreateOrderResponse | null> => {
    loading.value = true;
    error.value = null;
    orderResult.value = null;
    try {
      const result = await createOrder(params);
      orderResult.value = result;
      window.dispatchEvent(new Event("cart-updated"));
      return result;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "주문 생성 실패";
      error.value = errorMessage;
      console.error("주문 생성 실패:", e);
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    orderResult,
    submitOrder,
  };
}

// 주문 취소 응답 타입
export interface CancelOrderResult {
  message: string;
  order: Order;
  refund?: {
    cancelAmount: number;
    refundableAmount: number;
    canceledAt: string;
  };
}

/**
 * 주문 취소
 * - pending_payment: 단순 상태 변경
 * - payment_confirmed, preparing: PG사 결제 취소 후 상태 변경
 * - shipped, delivered, cancelled: 취소 불가
 */
export function useCancelOrder() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const cancel = async (
    orderId: number | string,
    cancelReason: string,
    cancelAmount?: number
  ): Promise<CancelOrderResult | null> => {
    loading.value = true;
    error.value = null;
    try {
      const result = await cancelOrder(orderId, { cancelReason, cancelAmount });
      return result;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "주문 취소 실패";
      error.value = errorMessage;
      console.error("주문 취소 실패:", e);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 취소 가능 여부 체크
  const canCancelOrder = (status: string): boolean => {
    return ["pending_payment", "payment_confirmed", "preparing"].includes(status);
  };

  return {
    loading,
    error,
    cancel,
    canCancelOrder,
  };
}

/**
 * 주문 목록 자동 로드
 */
export function useOrdersWithAutoLoad() {
  const ordersData = useOrders();

  onMounted(() => {
    ordersData.loadOrders();
  });

  return ordersData;
}
