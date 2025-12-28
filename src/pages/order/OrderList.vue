<script setup lang="ts">
// src/pages/OrderList.vue
// 주문 내역 페이지 (수정됨: 간소화된 리스트 & 상세 이동 버튼 추가)

import { onMounted, ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useOrders, useCancelOrder } from "@/composables/useOrders";
import { formatDate, formatPrice } from "@/lib/formatters";
import type { Order, OrderItem } from "@/types/api";
import { getDayName } from "@/lib/utils";

// 공통 컴포넌트
import {
  LoadingSpinner,
  EmptyState,
  ProductThumbnail,
  OrderStatusBadge,
  CancelOrderDialog,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();

// 인증 체크
useAuthGuard();

// 주문 목록 로직
const { orders, loading, loadOrders } = useOrders();

// 주문 취소 훅
const { cancel: cancelOrder, loading: cancelLoading } = useCancelOrder();

// 현재 필터 상태
const currentFilter = ref<string | null>(null);

// 상태 필터 레이블 매핑
const statusLabels: Record<string, string> = {
  pending: "입금전",
  preparing: "배송준비중",
  shipped: "배송중",
  delivered: "배송완료 (최근 1주일)",
};

// 상태별 실제 status 값 매핑
const statusMapping: Record<string, string[]> = {
  pending: ["pending_payment"],
  preparing: ["payment_confirmed", "preparing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
};

// 1주일 전 날짜 계산
const oneWeekAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
};

// 필터링된 주문 목록
const filteredOrders = computed((): Order[] => {
  if (!currentFilter.value) {
    return orders.value;
  }

  const allowedStatuses = statusMapping[currentFilter.value] || [];
  const weekAgo = oneWeekAgo();

  const result: Order[] = [];

  for (const order of orders.value) {
    if (!order.orderItems) continue;

    // 주문 아이템 필터링
    const filteredItems = order.orderItems.filter((item) => {
      // 상태 필터
      if (!allowedStatuses.includes(item.status)) {
        return false;
      }
      // 배송완료는 최근 1주일만
      if (currentFilter.value === "delivered") {
        const itemDate = new Date(item.updatedAt || item.createdAt || order.createdAt);
        return itemDate >= weekAgo;
      }
      return true;
    });

    // 필터링된 아이템이 있는 주문만 추가
    if (filteredItems.length > 0) {
      result.push({ ...order, orderItems: filteredItems });
    }
  }

  return result;
});

// 필터 해제
const clearFilter = () => {
  currentFilter.value = null;
  router.replace({ path: "/orderlist" });
};

// 쿼리 파라미터 감시
watch(
  () => route.query.status,
  (status) => {
    currentFilter.value = status as string | null;
  },
  { immediate: true }
);

// 취소 다이얼로그 상태
const cancelDialogOpen = ref(false);
const cancelTargetOrder = ref<Order | null>(null);
const cancelTargetItem = ref<OrderItem | null>(null);

// 주문 상세 이동
const goToOrderDetail = (orderId: string | number) => {
  router.push(`/orderdetail/${orderId}`);
};

// 상태별 버튼 노출 로직
const canCancel = (status: string) => {
  return ["pending_payment", "payment_confirmed", "preparing"].includes(status);
};
const canTrack = (status: string) => {
  return ["shipped", "delivered"].includes(status);
};

// 취소 다이얼로그 열기
const openCancelDialog = (order: Order, item: OrderItem) => {
  cancelTargetOrder.value = order;
  cancelTargetItem.value = item;
  cancelDialogOpen.value = true;
};

// 취소 다이얼로그 닫기
const closeCancelDialog = () => {
  cancelDialogOpen.value = false;
  cancelTargetOrder.value = null;
  cancelTargetItem.value = null;
};

// 주문 취소 확인 핸들러
const handleConfirmCancel = async (reason: string) => {
  if (!cancelTargetOrder.value) return;

  const result = await cancelOrder(cancelTargetOrder.value.id, reason);

  if (result) {
    // 취소 성공 시 주문 목록 갱신
    await loadOrders();
    closeCancelDialog();

    // 환불 정보가 있으면 알림
    if (result.refund) {
      alert(
        `주문이 취소되었습니다.\n환불 금액: ${formatPrice(
          result.refund.cancelAmount
        )}`
      );
    } else {
      alert("주문이 취소되었습니다.");
    }
  } else {
    alert("주문 취소에 실패했습니다. 다시 시도해주세요.");
  }
};

// 배송 조회 핸들러
const handleTrackShipment = (item: OrderItem) => {
  if (!item.trackingNumber) {
    alert("아직 운송장 번호가 등록되지 않았습니다.");
    return;
  }
  window.open(
    `https://search.naver.com/search.naver?query=${item.trackingNumber}`,
    "_blank"
  );
};

onMounted(() => {
  loadOrders();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-6 border-b pb-3">
      <div>
        <h3 class="text-heading text-primary tracking-wider">주문 내역</h3>
      </div>
    </div>

    <!-- 필터 표시 -->
    <div v-if="currentFilter" class="mb-4 flex items-center gap-2">
      <span class="text-body text-muted-foreground">필터:</span>
      <Button
        variant="secondary"
        size="sm"
        class="h-8 gap-1 pr-2"
        @click="clearFilter"
      >
        {{ statusLabels[currentFilter] }}
        <X class="w-4 h-4" />
      </Button>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="filteredOrders.length === 0"
      header="주문내역"
      :message="currentFilter ? `${statusLabels[currentFilter]} 상태의 주문이 없습니다.` : '주문 내역이 없습니다.'"
      :button-text="currentFilter ? '전체 주문 보기' : '쇼핑하러 가기'"
      :button-link="currentFilter ? '/orderlist' : '/product/all'"
    />

    <div v-else class="space-y-6">
      <Card
        v-for="order in filteredOrders"
        :key="order.id"
        class="overflow-hidden border-border/60"
      >
        <CardHeader
          class="bg-muted/30 py-3 px-6 flex flex-row items-center justify-between border-b"
        >
          <div class="flex items-center gap-2">
            <span class="font-semibold text-heading text-foreground">
              {{ formatDate(order.createdAt) }}
              ({{ getDayName(order.createdAt) }})
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="text-body text-muted-foreground font-semibold hover:text-foreground h-8 px-2"
            @click="goToOrderDetail(order.id)"
          >
            주문 상세
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>

        <CardContent class="p-0 divide-y divide-border">
          <div
            v-for="item in order.orderItems"
            :key="item.id"
            class="p-6 flex flex-col sm:flex-row gap-6"
          >
            <ProductThumbnail
              :image-url="item.product?.imageUrl"
              :product-id="item.productId"
            />

            <div class="flex-1 flex flex-col justify-between min-h-[100px]">
              <div>
                <div class="flex justify-between items-start mb-1 gap-2">
                  <h3
                    class="font-bold text-foreground text-body cursor-pointer hover:underline line-clamp-2"
                    @click="router.push(`/productDetail/${item.productId}`)"
                  >
                    {{ item.productName }}
                  </h3>
                  <OrderStatusBadge :status="item.status" class="shrink-0" />
                </div>

                <p class="text-body text-muted-foreground mb-1">
                  {{ item.options || "옵션 없음" }} / {{ item.quantity }}개
                </p>

                <p class="text-body text-foreground font-medium">
                  {{ formatPrice(item.productPrice) }}
                  <span v-if="item.paymentMethod" class="text-muted-foreground font-normal ml-2">
                    · {{ item.paymentMethod === 'toss' ? '토스페이' : '네이버페이' }}
                  </span>
                </p>
              </div>

              <div class="mt-4 flex items-end justify-between">
                <div></div>

                <div class="flex gap-2">
                  <Button
                    v-if="canCancel(item.status)"
                    variant="outline"
                    size="sm"
                    class="text-caption h-8"
                    @click="openCancelDialog(order, item)"
                  >
                    주문취소
                  </Button>

                  <Button
                    v-if="canTrack(item.status)"
                    variant="secondary"
                    size="sm"
                    class="text-caption h-8"
                    @click="handleTrackShipment(item)"
                  >
                    배송조회
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 주문 취소 다이얼로그 -->
    <CancelOrderDialog
      :open="cancelDialogOpen"
      :product-name="cancelTargetItem?.productName"
      :loading="cancelLoading"
      @close="closeCancelDialog"
      @confirm="handleConfirmCancel"
    />
  </div>
</template>
