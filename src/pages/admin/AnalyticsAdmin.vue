<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RefreshCw, Users, Eye, ShoppingBag, Banknote } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { fetchAdminAnalyticsOverview, fetchAdminOrders } from "@/lib/api";
import type { AdminAnalyticsOverviewResponse } from "@/types/api";
import { formatPrice } from "@/lib/formatters";
import { AdminNavigationTabs } from "@/components/admin";
import { LoadingSpinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(true);
const errorMessage = ref("");
const overview = ref<AdminAnalyticsOverviewResponse | null>(null);
const businessMetrics = ref({
  todayOrders: 0,
  last7DaysOrders: 0,
  last30DaysOrders: 0,
  totalOrders: 0,
  todaySales: 0,
  last7DaysSales: 0,
  last30DaysSales: 0,
  totalSales: 0,
});

const topViewedProducts = computed(
  () => overview.value?.productViews.topViewedProducts ?? [],
);

const visitorCards = computed(() => {
  const visitors = overview.value?.visitors;
  return [
    { label: "오늘 방문자", value: visitors?.today },
    { label: "어제 방문자", value: visitors?.yesterday },
    { label: "7일 방문자", value: visitors?.last7Days },
    { label: "30일 방문자", value: visitors?.last30Days },
  ];
});

const visitorChartData = computed(() => {
  const visitors = overview.value?.visitors;
  return [
    { label: "오늘", value: visitors?.today ?? 0 },
    { label: "어제", value: visitors?.yesterday ?? 0 },
    { label: "7일", value: visitors?.last7Days ?? 0 },
    { label: "30일", value: visitors?.last30Days ?? 0 },
  ];
});

const maxVisitorValue = computed(() =>
  Math.max(1, ...visitorChartData.value.map((item) => item.value)),
);

const topViewedChartData = computed(() =>
  topViewedProducts.value.slice(0, 20).map((product) => ({
    id: product.id,
    label: product.name,
    value: Number(product.viewCount ?? 0),
    imageUrl: product.imageUrl || "",
  })),
);

const maxTopViewedValue = computed(() =>
  Math.max(1, ...topViewedChartData.value.map((item) => item.value)),
);

const orderCards = computed(() => [
  { label: "오늘 주문", value: businessMetrics.value.todayOrders },
  { label: "7일 주문", value: businessMetrics.value.last7DaysOrders },
  { label: "30일 주문", value: businessMetrics.value.last30DaysOrders },
  { label: "전체 주문", value: businessMetrics.value.totalOrders },
]);

const salesCards = computed(() => [
  { label: "오늘 매출", value: formatPrice(businessMetrics.value.todaySales) },
  { label: "7일 매출", value: formatPrice(businessMetrics.value.last7DaysSales) },
  { label: "30일 매출", value: formatPrice(businessMetrics.value.last30DaysSales) },
  { label: "누적 매출", value: formatPrice(businessMetrics.value.totalSales) },
]);

const gaStatusText = computed(() => {
  const visitors = overview.value?.visitors;
  if (!visitors) return "-";
  if (!visitors.configured) return "GA4 환경 변수가 설정되지 않았습니다.";
  if (visitors.source === "unavailable") return "GA4 조회 실패";
  return "GA4 연동 정상";
});

const shouldShowGaStatus = computed(() => gaStatusText.value !== "GA4 연동 정상");

const generatedAtText = computed(() => {
  if (!overview.value?.generatedAt) return "-";
  return new Date(overview.value.generatedAt).toLocaleString("ko-KR");
});

const formatNumber = (value: number | null | undefined): string => {
  if (value == null) return "-";
  return value.toLocaleString("ko-KR");
};

const getBarWidth = (value: number, max: number): string => {
  if (value <= 0) return "0%";
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const fetchAllAdminOrders = async (): Promise<any[]> => {
  const limit = 200;
  let page = 1;
  const allOrders: any[] = [];

  // 페이지네이션 기반으로 전체 주문을 수집한다.
  while (page <= 100) {
    const response = await fetchAdminOrders({ page, limit });
    const currentOrders = response.orders || [];
    allOrders.push(...currentOrders);

    const totalPages = response.pagination?.totalPages ?? page;
    const hasMore =
      typeof response.pagination?.hasMore === "boolean"
        ? response.pagination.hasMore
        : page < totalPages;

    if (!hasMore || currentOrders.length === 0) break;
    page += 1;
  }

  return allOrders;
};

const calculateBusinessMetrics = (orders: any[]) => {
  const now = new Date();
  const todayStart = startOfToday();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const result = {
    todayOrders: 0,
    last7DaysOrders: 0,
    last30DaysOrders: 0,
    totalOrders: 0,
    todaySales: 0,
    last7DaysSales: 0,
    last30DaysSales: 0,
    totalSales: 0,
  };

  for (const order of orders) {
    const paidAt = order.paidAt ? new Date(order.paidAt) : null;
    if (!paidAt || Number.isNaN(paidAt.getTime())) continue;

    const totalAmount = toNumber(order.totalAmount);
    const refundedAmount = toNumber(order.refundedAmount || 0);
    const netAmount = Math.max(0, totalAmount - refundedAmount);

    result.totalOrders += 1;
    result.totalSales += netAmount;

    if (paidAt >= todayStart) {
      result.todayOrders += 1;
      result.todaySales += netAmount;
    }
    if (paidAt >= sevenDaysAgo) {
      result.last7DaysOrders += 1;
      result.last7DaysSales += netAmount;
    }
    if (paidAt >= thirtyDaysAgo) {
      result.last30DaysOrders += 1;
      result.last30DaysSales += netAmount;
    }
  }

  businessMetrics.value = result;
};

const loadAnalytics = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [overviewData, allOrders] = await Promise.all([
      fetchAdminAnalyticsOverview(),
      fetchAllAdminOrders(),
    ]);
    overview.value = overviewData;
    calculateBusinessMetrics(allOrders);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "통계 데이터를 불러오지 못했습니다.";
    errorMessage.value = message;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!authStore.user) {
    await authStore.loadUser();
  }
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  await loadAnalytics();
});
</script>

<template>
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <AdminNavigationTabs />

    <div class="flex justify-between items-end">
      <div>
        <h3 class="text-heading text-admin tracking-wider">통계 관리</h3>
        <p class="text-body text-admin-muted pt-1 mb-3">
          방문자 및 상품 조회 통계를 확인할 수 있습니다.
        </p>
      </div>
      <Button
        variant="outline"
        class="mb-2 gap-2 text-admin font-semibold"
        @click="loadAnalytics"
        :disabled="isLoading"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        새로고침
      </Button>
    </div>
    <Separator class="mb-6" />

    <LoadingSpinner v-if="isLoading && !overview" />

    <div v-else-if="errorMessage && !overview" class="space-y-4">
      <Card class="border-destructive/30">
        <CardContent class="py-6 text-body text-admin">
          {{ errorMessage }}
        </CardContent>
      </Card>
    </div>

    <div v-else-if="overview" class="space-y-6">
      <Card
        v-if="isLoading"
        class="border-border bg-muted/20 shadow-none"
      >
        <CardContent class="py-3 text-caption text-admin-muted">
          통계 데이터 업데이트 중...
        </CardContent>
      </Card>
      <Card
        v-else-if="errorMessage"
        class="border-destructive/30 shadow-none"
      >
        <CardContent class="py-3 text-caption text-admin">
          {{ errorMessage }}
        </CardContent>
      </Card>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card v-for="card in visitorCards" :key="card.label">
          <CardHeader class="pb-2">
            <CardDescription class="text-caption text-admin-muted">
              {{ card.label }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold text-admin tracking-tight">
              {{ formatNumber(card.value) }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between gap-3 space-y-0">
            <h3 class="text-body text-admin flex items-center gap-2">
              <ShoppingBag class="w-4 h-4" />
              주문 지표
            </h3>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 gap-3">
              <Card
                v-for="card in orderCards"
                :key="card.label"
                class="shadow-none"
              >
                <CardHeader class="pb-2">
                  <CardDescription class="text-caption text-admin-muted">
                    {{ card.label }}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-bold text-admin tracking-tight">
                    {{ formatNumber(card.value) }}건
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between gap-3 space-y-0">
            <h3 class="text-body text-admin flex items-center gap-2">
              <Banknote class="w-4 h-4" />
              매출 지표
            </h3>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 gap-3">
              <Card
                v-for="card in salesCards"
                :key="card.label"
                class="shadow-none"
              >
                <CardHeader class="pb-2">
                  <CardDescription class="text-caption text-admin-muted">
                    {{ card.label }}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p class="text-2xl font-bold text-admin tracking-tight">
                    {{ card.value }}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader class="flex flex-row items-start justify-between gap-3 space-y-0">
            <h3 class="text-body text-admin flex items-center gap-2">
              <Users class="w-4 h-4" />
              방문자 통계
            </h3>
            <div class="text-right text-caption text-admin-muted">
              <p v-if="shouldShowGaStatus" class="text-caption text-admin-muted">
                상태 :
                <span class="font-semibold text-admin">{{ gaStatusText }}</span>
              </p>
              <p>집계 시각: {{ generatedAtText }}</p>
            </div>
          </CardHeader>
          <CardContent class="space-y-2.5 text-caption leading-4 text-admin">
            <div class="space-y-3">
              <p class="text-caption font-semibold">방문자 기간별 그래프 (Google Analytics)</p>
              <div v-for="item in visitorChartData" :key="item.label">
                <div class="mb-1 flex h-12 min-h-0 items-center justify-between gap-2 text-caption text-admin-muted">
                  <span class="truncate text-admin min-w-0">{{ item.label }}</span>
                  <span class="font-semibold text-admin">
                    {{ formatNumber(item.value) }}
                  </span>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div
                    class="h-2 rounded-full bg-primary/80 transition-all duration-500"
                    :style="{ width: getBarWidth(item.value, maxVisitorValue) }"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-start justify-between gap-3 space-y-0">
            <h3 class="text-body text-admin flex items-center gap-2">
              <Eye class="w-4 h-4" />
              상품 조회 통계
            </h3>
            <p class="text-body text-admin text-right whitespace-nowrap">
              누적 상품 조회수 {{ formatNumber(overview.productViews.totalViewCount) }}
            </p>
          </CardHeader>
          <CardContent class="space-y-2.5 text-caption leading-4 text-admin">
            <div v-if="topViewedChartData.length" class="space-y-3">
              <p class="text-caption font-semibold">상위 20개 상품 조회수</p>
              <div v-for="item in topViewedChartData" :key="item.id">
                <div class="mb-1 flex h-12 min-h-0 items-center justify-between gap-2 text-caption">
                  <div class="min-w-0 flex flex-1 items-center gap-2">
                    <div class="h-12 w-12 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0">
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        class="h-full w-full object-cover"
                        crossorigin="anonymous"
                      />
                    </div>
                    <span class="truncate text-admin min-w-0 flex-1" :title="item.label">
                      {{ item.label }}
                    </span>
                  </div>
                  <span class="font-semibold text-admin text-caption">{{ formatNumber(item.value) }}</span>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div
                    class="h-2 rounded-full bg-primary/70 transition-all duration-500"
                    :style="{ width: getBarWidth(item.value, maxTopViewedValue) }"
                  />
                </div>
              </div>
            </div>
            <p v-else class="text-caption">조회수 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
