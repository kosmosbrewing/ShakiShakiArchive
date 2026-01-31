<script setup lang="ts">
// src/pages/OrderList.vue
// 주문 내역 페이지 (무한 스크롤 지원)

import { onMounted, onUnmounted, ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useOrders } from "@/composables/useOrders";
import { useAlert } from "@/composables/useAlert";
import { formatDate, formatPrice } from "@/lib/formatters";
import type { Order, OrderItem } from "@/types/api";
import { getDayName } from "@/lib/utils";
import { fetchAllOrders, confirmPurchase } from "@/lib/api";
import { sortOrderItems } from "@/lib/constants/order";
import { useDebounceFn } from "@vueuse/core";
import { ORDER_MESSAGES } from "@/lib/messages";

// 공통 컴포넌트
import {
  LoadingSpinner,
  EmptyState,
  ProductThumbnail,
  OrderStatusBadge,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, Search } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const { showAlert } = useAlert();

// 인증 체크
useAuthGuard();

// 주문 목록 로직 (무한 스크롤 지원)
const { orders, loading, loadingMore, hasMore, loadOrders, loadMoreOrders } =
  useOrders();

// 필터용 전체 주문 데이터
const allOrders = ref<Order[]>([]);
const loadingAllOrders = ref(false);

// 무한 스크롤을 위한 옵저버 타겟 ref
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

// 스켈레톤 노출 지연 (150ms)
const showLoadingSpinner = ref(false);
let loadingDelayTimer: NodeJS.Timeout | null = null;

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      // 타겟이 화면에 보이고, 로딩 중이 아니며, 더 불러올 데이터가 있을 때
      if (entry.isIntersecting && !loadingMore.value && hasMore.value) {
        loadMoreOrders();
      }
    },
    {
      rootMargin: "200px", // 200px 전에 미리 로드 시작
      threshold: 0.1,
    },
  );

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value);
  }
};

// 옵저버 정리
const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// 타겟 요소 변경 감지
watch(loadMoreTrigger, (newEl) => {
  cleanupObserver();
  if (newEl) {
    setupIntersectionObserver();
  }
});

// 현재 필터 상태
const currentFilter = ref<string | null>(null);

// 검색어 상태
const searchQuery = ref<string>("");

// 상태 필터 레이블 매핑
const statusLabels: Record<string, string> = {
  pending: "입금대기",
  payment_confirmed: "결제완료",
  preparing: "배송준비중",
  shipped: "배송중",
  delivered: "배송완료 (최근 1주일)",
};

// 상태별 실제 status 값 매핑
const statusMapping: Record<string, string[]> = {
  pending: ["pending_payment"],
  payment_confirmed: ["payment_confirmed"],
  preparing: ["preparing"],
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
  const weekAgo = oneWeekAgo();
  const result: Order[] = [];

  // 사용자에게 숨길 상태
  const hiddenStatuses = ["cancelled", "paying", "pending_payment"];

  // 검색어나 필터가 있으면 전체 주문 데이터, 없으면 페이지네이션된 데이터 사용
  const sourceOrders =
    currentFilter.value || searchQuery.value ? allOrders.value : orders.value;

  for (const order of sourceOrders) {
    if (!order.orderItems) continue;

    // 주문 아이템 필터링
    const filteredItems = order.orderItems.filter((item) => {
      // cancelled, paying, refunded 상태는 항상 숨김
      if (hiddenStatuses.includes(item.status)) {
        return false;
      }

      // 상품명 검색 필터
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        const productName = item.productName?.toLowerCase() || "";
        if (!productName.includes(query)) {
          return false;
        }
      }

      // 상태 필터가 있는 경우
      if (currentFilter.value) {
        const allowedStatuses = statusMapping[currentFilter.value] || [];
        // 상태 필터
        if (!allowedStatuses.includes(item.status)) {
          return false;
        }
        // 배송완료는 최근 1주일만
        if (currentFilter.value === "delivered") {
          const itemDate = new Date(
            item.updatedAt || item.createdAt || order.createdAt,
          );
          return itemDate >= weekAgo;
        }
      }

      return true;
    });

    // 필터링된 아이템이 있는 주문만 추가 (정렬 적용)
    if (filteredItems.length > 0) {
      result.push({ ...order, orderItems: sortOrderItems(filteredItems) });
    }
  }

  return result;
});

// 필터 해제
const clearFilter = () => {
  currentFilter.value = null;
  router.replace({ path: "/orderlist" });
};

// 검색어 초기화
const clearSearch = () => {
  searchQuery.value = "";
};

// 디바운스된 검색 함수 (300ms 후 전체 주문 로드)
const debouncedSearch = useDebounceFn(async () => {
  if (searchQuery.value) {
    loadingAllOrders.value = true;
    try {
      // 백엔드에서 이미 orderItems와 product 정보를 포함하여 반환
      allOrders.value = await fetchAllOrders();
    } catch (e) {
      console.error("전체 주문 로드 실패:", e);
      allOrders.value = [];
    } finally {
      loadingAllOrders.value = false;
    }
  }
}, 300);

// 쿼리 파라미터 감시
watch(
  () => route.query.status,
  (status) => {
    currentFilter.value = status as string | null;
  },
  { immediate: true },
);

// 필터 변경 시 전체 주문 로드
watch(
  currentFilter,
  async (newFilter) => {
    if (newFilter) {
      // 필터가 적용되면 전체 주문 데이터 로드
      loadingAllOrders.value = true;
      try {
        // 백엔드에서 이미 orderItems와 product 정보를 포함하여 반환
        allOrders.value = await fetchAllOrders();
      } catch (e) {
        console.error("전체 주문 로드 실패:", e);
        allOrders.value = [];
      } finally {
        loadingAllOrders.value = false;
      }
    }
  },
  { immediate: true },
);

// 검색어 변경 감지
watch(searchQuery, () => {
  debouncedSearch();
});

// 로딩 스피너 지연 표시 (150ms)
watch(loadingMore, (newValue) => {
  // 타이머가 있으면 먼저 정리
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }

  if (newValue) {
    // 로딩 시작: 150ms 후 스피너 표시
    loadingDelayTimer = setTimeout(() => {
      showLoadingSpinner.value = true;
    }, 150);
  } else {
    // 로딩 종료: 즉시 스피너 숨김
    showLoadingSpinner.value = false;
  }
});

// 주문 상세 이동
const goToOrderDetail = (orderId: string | number) => {
  router.push(`/orderdetail/${orderId}`);
};

// 상태별 버튼 노출 로직 (배송조회만 사용, 취소는 OrderDetail에서만)
const canTrack = (status: string) => {
  return ["shipped", "delivered"].includes(status);
};

// 구매 확정 가능 상태 (배송완료 상태에서만)
const canConfirm = (status: string) => {
  return status === "delivered";
};

// 구매 확정 로딩 상태 (itemId별로 관리)
const confirmingItems = ref<Set<string>>(new Set());

// 구매 확정 핸들러
const handleConfirmPurchase = async (orderId: string, itemId: number) => {
  const itemIdStr = String(itemId);
  confirmingItems.value.add(itemIdStr);
  try {
    await confirmPurchase(orderId, itemIdStr);
    showAlert("구매가 확정되었습니다.", { type: "success" });

    // 주문 목록 새로고침
    await loadOrders();
    if (currentFilter.value || searchQuery.value) {
      allOrders.value = await fetchAllOrders();
    }
  } catch (error: any) {
    showAlert(error.message || "구매 확정에 실패했습니다.", { type: "error" });
  } finally {
    confirmingItems.value.delete(itemIdStr);
  }
};

// 배송 조회 핸들러
const handleTrackShipment = (item: OrderItem) => {
  if (!item.trackingNumber) {
    showAlert(ORDER_MESSAGES.trackingNumberNotReady, { type: "error" });
    return;
  }
  // 네이버 통합 택배조회: 택배사+운송장번호
  const courier = item.courierCompany || "택배";
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(courier)}+${encodeURIComponent(item.trackingNumber)}`;
  window.open(url, "_blank");
};

onMounted(() => {
  loadOrders();
  // DOM이 준비된 후 옵저버 설정
  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }
});

onUnmounted(() => {
  cleanupObserver();
  // 타이머 정리
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">주문 내역</h3>
      <Separator></Separator>
    </div>
    <!-- 검색 및 필터 -->
    <div class="mb-6 space-y-4">
      <!-- 검색 입력 -->
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="상품명으로 검색..."
          class="pl-9 pr-9"
        />
        <Button
          v-if="searchQuery"
          variant="ghost"
          size="sm"
          class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          @click="clearSearch"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>

      <!-- 적용된 필터 표시 -->
      <div
        v-if="currentFilter || searchQuery"
        class="flex items-center gap-2 flex-wrap"
      >
        <span class="text-caption text-muted-foreground">적용된 필터:</span>
        <Button
          v-if="currentFilter"
          variant="secondary"
          size="sm"
          class="h-7 gap-1 pr-2 text-xs"
          @click="clearFilter"
        >
          {{ statusLabels[currentFilter] }}
          <X class="w-3 h-3" />
        </Button>
        <Button
          v-if="searchQuery"
          variant="secondary"
          size="sm"
          class="h-7 gap-1 pr-2 text-xs"
          @click="clearSearch"
        >
          검색: {{ searchQuery }}
          <X class="w-3 h-3" />
        </Button>
      </div>
    </div>

    <LoadingSpinner
      v-if="currentFilter || searchQuery ? loadingAllOrders : loading"
    />

    <EmptyState
      v-else-if="filteredOrders.length === 0"
      header="주문내역"
      :message="
        currentFilter || searchQuery
          ? '조건에 맞는 주문이 없습니다.'
          : '주문 내역이 없습니다.'
      "
      :button-text="
        currentFilter || searchQuery ? '전체 주문 보기' : '쇼핑하러 가기'
      "
      :button-link="
        currentFilter || searchQuery ? '/orderlist' : '/product/all'
      "
    />

    <div v-else class="space-y-6">
      <Card
        v-for="order in filteredOrders"
        :key="order.id"
        class="overflow-hidden border-border/60"
      >
        <CardHeader
          class="py-3 px-6 flex flex-row items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span class="font-semibold text-heading text-foreground pt-1">
              {{ formatDate(order.createdAt) }}
              ({{ getDayName(order.createdAt) }})
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="text-body text-muted-foreground underline font-semibold h-8 px-2 pt-1"
            @click="goToOrderDetail(order.id)"
          >
            주문 상세
          </Button>
        </CardHeader>

        <CardContent class="p-0">
          <div
            v-for="item in order.orderItems"
            :key="item.id"
            class="pl-6 pr-6 pb-6 pt-2 flex flex-col gap-3"
          >
            <!-- 배송상태 뱃지 -->

            <OrderStatusBadge
              :status="item.status"
              class="shadow-sm self-start l"
            />

            <div class="flex flex-col sm:flex-row gap-6">
              <ProductThumbnail
                :image-url="item.product?.imageUrl"
                :product-id="item.productId"
              />

              <div class="flex-1 flex flex-col justify-between min-h-[100px]">
                <div>
                  <div class="flex justify-between items-start gap-2">
                    <h3
                      class="text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2"
                      @click="router.push(`/productDetail/${item.productId}`)"
                    >
                      {{ item.productName }}
                    </h3>
                  </div>

                  <p class="text-body text-muted-foreground mt-1">
                    <template v-if="item.options"
                      >{{ item.options }} / </template
                    >{{ item.quantity }}개
                  </p>

                  <!-- 모바일: 금액과 버튼을 같은 라인에 배치 -->
                  <div
                    class="flex items-baseline justify-between gap-2 mt-1 sm:block"
                  >
                    <p class="text-body text-foreground font-medium">
                      {{ formatPrice(item.productPrice) }}
                      <span
                        v-if="item.paymentMethod"
                        class="text-muted-foreground font-normal ml-2"
                      >
                        ·
                        {{
                          item.paymentMethod === "toss"
                            ? "토스페이"
                            : "네이버페이"
                        }}
                      </span>
                    </p>

                    <!-- 모바일 버튼 (금액과 같은 라인) -->
                    <div
                      v-if="canTrack(item.status) || canConfirm(item.status)"
                      class="flex gap-2 sm:hidden"
                    >
                      <Button
                        v-if="canTrack(item.status)"
                        variant="outline"
                        size="sm"
                        class="text-caption px-2.5 py-1"
                        @click="handleTrackShipment(item)"
                      >
                        배송조회
                      </Button>
                      <Button
                        v-if="canConfirm(item.status)"
                        variant="default"
                        size="sm"
                        class="text-caption px-2.5 py-1"
                        :disabled="confirmingItems.has(String(item.id))"
                        @click="handleConfirmPurchase(order.id, item.id)"
                      >
                        {{ confirmingItems.has(String(item.id)) ? "처리중..." : "구매확정" }}
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- 데스크톱 버튼 (하단 우측) -->
                <div
                  v-if="canTrack(item.status) || canConfirm(item.status)"
                  class="hidden sm:flex items-end justify-end gap-2"
                >
                  <Button
                    v-if="canTrack(item.status)"
                    variant="outline"
                    size="sm"
                    class="text-caption px-3 py-1.5"
                    @click="handleTrackShipment(item)"
                  >
                    배송조회
                  </Button>
                  <Button
                    v-if="canConfirm(item.status)"
                    variant="default"
                    size="sm"
                    class="text-caption px-3 py-1.5"
                    :disabled="confirmingItems.has(String(item.id))"
                    @click="handleConfirmPurchase(order.id, item.id)"
                  >
                    {{ confirmingItems.has(String(item.id)) ? "처리중..." : "구매확정" }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 무한 스크롤 트리거 및 로딩 인디케이터 -->
      <div
        v-if="!currentFilter && !searchQuery"
        ref="loadMoreTrigger"
        class="py-8 flex justify-center"
      >
        <div v-if="showLoadingSpinner" class="flex flex-col items-center gap-3">
          <LoadingSpinner size="md" variant="dots" :center="false" />
          <span class="text-body text-muted-foreground"
            >주문 내역을 불러오는 중...</span
          >
        </div>
        <div
          v-else-if="!hasMore && orders.length > 0"
          class="text-body text-muted-foreground"
        >
          모든 주문 내역을 불러왔습니다
        </div>
      </div>
    </div>
  </div>
</template>
