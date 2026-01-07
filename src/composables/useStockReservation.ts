// src/composables/useStockReservation.ts
// 재고 선점(Reservation) 패턴 관리 composable

import { ref, computed, onUnmounted } from "vue";
import { reserveStock, releaseStockReservation } from "@/lib/api";
import type {
  ReserveStockRequest,
  ReserveStockResponse,
  DirectPurchaseItem,
} from "@/types/api";
import type { OrderItemDisplay } from "./useOrderItems";

// 선점 상태 타입
export type ReservationStatus =
  | "idle" // 대기 상태
  | "reserving" // 선점 요청 중
  | "reserved" // 선점 완료
  | "releasing" // 해제 중
  | "expired" // 만료됨
  | "failed"; // 실패

export function useStockReservation() {
  // 상태
  const reservationId = ref<string | null>(null);
  const status = ref<ReservationStatus>("idle");
  const error = ref<string | null>(null);
  const expiresAt = ref<Date | null>(null);
  const ttlSeconds = ref<number>(0);

  // 만료 타이머
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  // 선점 여부
  const isReserved = computed(() => status.value === "reserved");
  const isLoading = computed(
    () => status.value === "reserving" || status.value === "releasing"
  );

  // 남은 시간 (MM:SS 형식)
  const remainingTimeFormatted = computed(() => {
    if (ttlSeconds.value <= 0) return "00:00";
    const minutes = Math.floor(ttlSeconds.value / 60);
    const seconds = ttlSeconds.value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  });

  // 타이머 정리
  const clearTimers = () => {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  // 카운트다운 시작
  const startCountdown = (seconds: number) => {
    ttlSeconds.value = seconds;

    // 1초마다 카운트다운
    countdownTimer = setInterval(() => {
      ttlSeconds.value--;
      if (ttlSeconds.value <= 0) {
        clearTimers();
        status.value = "expired";
        reservationId.value = null;
      }
    }, 1000);

    // 만료 시 자동 해제
    expiryTimer = setTimeout(() => {
      clearTimers();
      status.value = "expired";
      reservationId.value = null;
    }, seconds * 1000);
  };

  // 재고 선점 요청
  const reserve = async (
    items: OrderItemDisplay[],
    directPurchaseItem?: DirectPurchaseItem
  ): Promise<ReserveStockResponse | null> => {
    // 이미 선점 중이면 스킵
    if (status.value === "reserving") return null;

    // 이전 선점이 있으면 먼저 해제
    if (reservationId.value) {
      await release();
    }

    status.value = "reserving";
    error.value = null;

    try {
      const request: ReserveStockRequest = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        directPurchaseItem,
      };

      const response = await reserveStock(request);

      reservationId.value = response.reservationId;
      expiresAt.value = new Date(response.expiresAt);
      status.value = "reserved";

      // 카운트다운 시작 (서버에서 받은 TTL 사용)
      startCountdown(response.ttlSeconds);

      return response;
    } catch (e) {
      status.value = "failed";
      error.value = e instanceof Error ? e.message : "재고 선점 실패";
      console.error("재고 선점 실패:", e);
      return null;
    }
  };

  // 재고 선점 해제
  const release = async (): Promise<boolean> => {
    if (!reservationId.value) return true;

    status.value = "releasing";
    const currentReservationId = reservationId.value;

    try {
      await releaseStockReservation(currentReservationId);
      clearTimers();
      reservationId.value = null;
      expiresAt.value = null;
      ttlSeconds.value = 0;
      status.value = "idle";
      return true;
    } catch (e) {
      // 해제 실패해도 로컬 상태는 정리 (서버에서 TTL로 자동 해제됨)
      console.error("재고 선점 해제 실패:", e);
      clearTimers();
      reservationId.value = null;
      status.value = "idle";
      return false;
    }
  };

  // 상태 초기화 (결제 성공 시 사용)
  const reset = () => {
    clearTimers();
    reservationId.value = null;
    expiresAt.value = null;
    ttlSeconds.value = 0;
    status.value = "idle";
    error.value = null;
  };

  // 컴포넌트 언마운트 시 자동 해제
  onUnmounted(() => {
    if (reservationId.value) {
      // 비동기 해제 요청 (결과 무시)
      releaseStockReservation(reservationId.value).catch(() => {});
    }
    clearTimers();
  });

  return {
    // 상태
    reservationId,
    status,
    error,
    expiresAt,
    ttlSeconds,

    // 계산된 속성
    isReserved,
    isLoading,
    remainingTimeFormatted,

    // 메서드
    reserve,
    release,
    reset,
  };
}
