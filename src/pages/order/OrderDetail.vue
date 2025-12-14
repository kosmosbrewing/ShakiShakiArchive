<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useOrders } from "@/composables/useOrders"; // Composable 사용
import { formatDate, formatPrice } from "@/lib/formatters";
import type { Order, OrderItem } from "@/types/api";

// 공통 컴포넌트
import {
  LoadingSpinner,
  ProductThumbnail,
  OrderStatusBadge,
} from "@/components/common";

// UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, CreditCard, Package } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

// useOrders 훅 사용
const { loadOrder, loading, error } = useOrders();
const order = ref<Order | null>(null);

// 데이터 로드
onMounted(async () => {
  const orderId = route.params.id as string;
  const data = await loadOrder(orderId);
  if (data) {
    order.value = data;
  }
});

// 뒤로가기
const goBack = () => {
  router.push("/orderlist");
};

// 상태별 버튼 노출 로직 (OrderList와 동일)
const canCancel = (status: string) => {
  return ["pending_payment", "payment_confirmed", "preparing"].includes(status);
};
const canTrack = (status: string) => {
  return ["shipped", "delivered"].includes(status);
};

// 주문 취소 핸들러
const handleCancelOrder = async (item: OrderItem) => {
  if (confirm(`'${item.productName}' 주문을 취소하시겠습니까?`)) {
    alert("주문 취소 요청이 접수되었습니다. (기능 준비중)");
  }
};

// 배송 조회 핸들러
const handleTrackShipment = (item: OrderItem) => {
  if (!item.trackingNumber) {
    alert("아직 운송장 번호가 등록되지 않았습니다.");
    return;
  }
  const url = `https://search.naver.com/search.naver?query=${item.trackingNumber}`;
  window.open(url, "_blank");
};
</script>

<template>
  <div class="container max-w-6xl mx-auto px-4 py-8 sm:py-12">
    <div class="flex items-center gap-4 mb-8">
      <Button
        variant="ghost"
        size="icon"
        @click="goBack"
        class="hover:bg-muted"
      >
        <ArrowLeft class="w-5 h-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">주문 상세</h1>
        <p v-if="order" class="text-sm text-muted-foreground">
          주문번호 {{ order.id }} • {{ formatDate(order.createdAt) }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <div v-else-if="error || !order" class="py-12 text-center">
      <div
        class="rounded-lg border border-destructive/50 bg-destructive/5 p-6 inline-block"
      >
        <p class="text-destructive mb-4">
          {{ error || "주문을 찾을 수 없습니다" }}
        </p>
        <Button variant="outline" @click="goBack"
          >주문 내역으로 돌아가기</Button
        >
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>주문 상품 ({{ order.orderItems.length }}개)</CardTitle>
          </CardHeader>
          <CardContent class="divide-y divide-border">
            <div
              v-for="item in order.orderItems"
              :key="item.id"
              class="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-6"
            >
              <ProductThumbnail
                :image-url="item.product?.imageUrl"
                :product-id="item.productId"
              />

              <div class="flex-1 flex flex-col justify-between min-h-[100px]">
                <div>
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-bold text-foreground text-lg">
                      {{ item.productName }}
                    </h3>
                    <OrderStatusBadge :status="item.status" class="shrink-0" />
                  </div>

                  <p class="text-sm text-muted-foreground mb-2">
                    {{ item.options || "옵션 없음" }}
                  </p>

                  <p class="text-sm font-medium">
                    {{ formatPrice(item.productPrice) }} / {{ item.quantity }}개
                  </p>
                </div>

                <div
                  class="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                >
                  <div
                    v-if="item.trackingNumber"
                    class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded w-fit"
                  >
                    운송장:
                    <span class="font-mono font-bold">{{
                      item.trackingNumber
                    }}</span>
                  </div>
                  <div v-else></div>

                  <div class="flex gap-2">
                    <Button
                      v-if="canCancel(item.status)"
                      variant="outline"
                      size="sm"
                      @click="handleCancelOrder(item)"
                    >
                      주문취소
                    </Button>
                    <Button
                      v-if="canTrack(item.status)"
                      variant="secondary"
                      size="sm"
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

      <div class="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-base">
              <CreditCard class="w-4 h-4" />
              결제 정보
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">상품 금액</span>
              <span>{{ formatPrice(order.totalAmount) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">배송비</span>
              <span>무료</span>
            </div>
            <Separator />
            <div class="flex justify-between items-center">
              <span class="font-bold">총 결제금액</span>
              <span class="text-xl font-bold text-primary">
                {{ formatPrice(order.totalAmount) }}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-base">
              <MapPin class="w-4 h-4" />
              배송지 정보
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div>
              <p class="font-bold mb-1">{{ order.shippingName }}</p>
              <p class="text-muted-foreground">{{ order.shippingPhone }}</p>
            </div>
            <div>
              <p class="text-muted-foreground">
                ({{ order.shippingPostalCode }})
              </p>
              <p>{{ order.shippingAddress }}</p>
            </div>

            <div v-if="order.trackingNumber" class="pt-2 border-t mt-2">
              <p
                class="text-xs text-muted-foreground mb-1 flex items-center gap-1"
              >
                <Package class="w-3 h-3" /> 전체 운송장 번호
              </p>
              <p class="font-mono font-medium">{{ order.trackingNumber }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
