<script setup lang="ts">
// src/pages/OrderList.vue
// 주문 내역 페이지

import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useOrders } from "@/composables/useOrders";
import { formatDate, formatPrice } from "@/lib/formatters";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState, ProductThumbnail, OrderStatusBadge } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 주문 목록 로직
const { orders, loading, loadOrders } = useOrders();

onMounted(() => {
  loadOrders();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 타이틀 -->
    <div class="mb-8">
      <h1 class="text-sm font-bold uppercase tracking-widest text-foreground">
        Order List
      </h1>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <!-- 빈 주문 내역 -->
    <EmptyState
      v-else-if="orders.length === 0"
      message="주문 내역이 없습니다."
      button-text="쇼핑하러 가기"
      button-link="/product/all"
    />

    <!-- 주문 목록 -->
    <div v-else class="space-y-6">
      <Card v-for="order in orders" :key="order.id">
        <!-- 주문 헤더 -->
        <CardHeader class="bg-muted/50 py-4">
          <div class="flex flex-wrap justify-between items-center gap-4">
            <div class="flex items-center gap-3">
              <span class="font-bold text-lg text-foreground">
                {{ formatDate(order.createdAt) }}
              </span>
              <span class="text-xs text-muted-foreground">|</span>
              <span class="text-sm text-muted-foreground">
                주문번호 {{ order.id }}
              </span>
            </div>
            <div class="text-right">
              <span class="text-xs text-muted-foreground mr-2">총 결제금액</span>
              <span class="font-bold text-foreground text-lg">
                {{ formatPrice(order.totalAmount) }}
              </span>
            </div>
          </div>
        </CardHeader>

        <!-- 주문 아이템 목록 -->
        <CardContent class="p-0 divide-y divide-border">
          <div
            v-for="item in order.orderItems"
            :key="item.id"
            class="p-6 flex flex-col sm:flex-row gap-6"
          >
            <!-- 상품 이미지 -->
            <ProductThumbnail
              :image-url="item.product?.imageUrl"
              :product-id="item.productId"
            />

            <!-- 상품 정보 -->
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <h3
                    class="font-bold text-foreground text-lg cursor-pointer hover:underline"
                    @click="router.push(`/productDetail/${item.productId}`)"
                  >
                    {{ item.productName }}
                  </h3>
                  <OrderStatusBadge :status="item.status" />
                </div>

                <p class="text-sm text-muted-foreground">
                  {{ formatPrice(item.productPrice) }} / {{ item.quantity }}개
                </p>
              </div>

              <!-- 운송장 번호 -->
              <div
                v-if="item.trackingNumber"
                class="mt-4 pt-4 border-t border-dashed border-border"
              >
                <p class="text-xs text-muted-foreground flex items-center gap-2">
                  <span class="font-bold">운송장번호:</span>
                  <span class="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                    {{ item.trackingNumber }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <!-- 배송 정보 -->
        <CardFooter class="bg-muted/30 py-4 flex-col items-start gap-1">
          <div class="flex gap-2 text-sm">
            <span class="font-bold text-foreground min-w-[60px]">받는분</span>
            <span class="text-muted-foreground">
              {{ order.shippingName }} ({{ order.shippingPhone }})
            </span>
          </div>
          <div class="flex gap-2 text-sm">
            <span class="font-bold text-foreground min-w-[60px]">배송지</span>
            <span class="text-muted-foreground">
              ({{ order.shippingPostalCode }}) {{ order.shippingAddress }}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
