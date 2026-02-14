<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RefreshCw, Users, Eye } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { fetchAdminAnalyticsOverview } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import type { AdminAnalyticsOverviewResponse } from "@/types/api";
import { AdminNavigationTabs } from "@/components/admin";
import { LoadingSpinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(false);
const errorMessage = ref("");
const overview = ref<AdminAnalyticsOverviewResponse | null>(null);

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
  topViewedProducts.value.slice(0, 8).map((product) => ({
    id: product.id,
    label: product.name,
    value: Number(product.viewCount ?? 0),
  })),
);

const maxTopViewedValue = computed(() =>
  Math.max(1, ...topViewedChartData.value.map((item) => item.value)),
);

const gaStatusText = computed(() => {
  const visitors = overview.value?.visitors;
  if (!visitors) return "-";
  if (!visitors.configured) return "GA4 미설정";
  if (visitors.source === "unavailable") return "GA4 조회 실패";
  return "GA4 연동 정상";
});

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

const getStockStatusText = (stock: number): string =>
  stock <= 0 ? "품절" : "재고 있음";

const loadAnalytics = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    overview.value = await fetchAdminAnalyticsOverview();
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

    <LoadingSpinner v-if="isLoading" />

    <div v-else-if="errorMessage" class="space-y-4">
      <Card class="border-destructive/30">
        <CardContent class="py-6 text-body text-admin">
          {{ errorMessage }}
        </CardContent>
      </Card>
    </div>

    <div v-else-if="overview" class="space-y-6">
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
          <CardHeader>
            <CardTitle class="text-body flex items-center gap-2">
              <Users class="w-4 h-4" />
              방문자 통계 상태
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-1 text-caption text-admin-muted">
            <p>상태: <span class="font-semibold text-admin">{{ gaStatusText }}</span></p>
            <p v-if="overview.visitors.note">{{ overview.visitors.note }}</p>
            <p>집계 시각: {{ generatedAtText }}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-body flex items-center gap-2">
              <Eye class="w-4 h-4" />
              상품 조회 통계
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-1 text-caption text-admin-muted">
            <p>
              누적 상품 조회수:
              <span class="font-semibold text-admin">
                {{ formatNumber(overview.productViews.totalViewCount) }}
              </span>
            </p>
            <p>상위 조회 상품은 아래 표에서 확인 가능합니다.</p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-body">방문자 기간별 그래프</CardTitle>
            <CardDescription class="text-caption text-admin-muted">
              GA4 activeUsers 기준
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-for="item in visitorChartData" :key="item.label">
                <div class="mb-1 flex items-center justify-between text-caption text-admin-muted">
                  <span>{{ item.label }}</span>
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
          <CardHeader>
            <CardTitle class="text-body">조회수 TOP 그래프</CardTitle>
            <CardDescription class="text-caption text-admin-muted">
              상위 8개 상품 조회수 비중
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="topViewedChartData.length" class="space-y-3">
              <div v-for="item in topViewedChartData" :key="item.id">
                <div class="mb-1 flex items-center justify-between gap-2 text-caption text-admin-muted">
                  <span class="truncate" :title="item.label">{{ item.label }}</span>
                  <span class="font-semibold text-admin">{{ formatNumber(item.value) }}</span>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div
                    class="h-2 rounded-full bg-primary/70 transition-all duration-500"
                    :style="{ width: getBarWidth(item.value, maxTopViewedValue) }"
                  />
                </div>
              </div>
            </div>
            <p v-else class="text-caption text-admin-muted">
              조회수 데이터가 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card class="overflow-hidden border-none shadow-lg">
        <CardHeader class="pb-0">
          <CardTitle class="text-body">조회수 상위 상품 TOP 10</CardTitle>
        </CardHeader>
        <CardContent class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[920px]">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-4">상품명</th>
                <th class="px-6 py-4 text-right">조회수</th>
                <th class="px-6 py-4 text-right">판매가</th>
                <th class="px-6 py-4 text-center">재고</th>
                <th class="px-6 py-4 text-center">상태</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="product in topViewedProducts"
                :key="product.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="text-body text-admin font-semibold">
                    {{ product.name }}
                  </div>
                  <div class="text-caption text-admin-muted font-mono">
                    {{ product.slug }}
                  </div>
                </td>
                <td class="px-6 py-4 text-right text-body text-admin">
                  {{ formatNumber(product.viewCount ?? 0) }}
                </td>
                <td class="px-6 py-4 text-right text-body text-admin">
                  {{ formatPrice(product.price) }}
                </td>
                <td class="px-6 py-4 text-center text-body text-admin">
                  {{ formatNumber(product.totalStock) }}
                </td>
                <td class="px-6 py-4 text-center text-caption text-admin-muted">
                  {{ getStockStatusText(product.totalStock) }}
                </td>
              </tr>
              <tr v-if="topViewedProducts.length === 0">
                <td colspan="5" class="px-6 py-16 text-center text-admin-muted">
                  조회수 데이터가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
