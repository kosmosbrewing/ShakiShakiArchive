<script setup lang="ts">
// src/pages/Cart.vue
// 장바구니 페이지

import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
// import { useAuthGuard } from "@/composables/useAuthGuard"; // [삭제] 비회원 접근 허용
import { useCart } from "@/composables/useCart";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { CART_MESSAGES, ORDER_MESSAGES } from "@/lib/messages";
import { formatPrice } from "@/lib/formatters";

// 공통 컴포넌트
import {
  LoadingSpinner,
  EmptyState,
  //QuantitySelector,
  ProductThumbnail,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDescription } from "@/components/ui/alert";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

// [삭제] 인증 체크 로직 제거 (이제 누구나 접근 가능)
// useAuthGuard();

// 장바구니 로직
const {
  cartItems,
  loading,
  totalProductPrice,
  shippingFee,
  totalAmount,
  isEmpty,
  loadCart,
  //updateQuantity,
  removeItem,
} = useCart();

// 재고 없는 상품 확인
const hasOutOfStockItems = computed(() => {
  return cartItems.value.some((item) => {
    if (!item.variant) return false;
    const availableStock = item.variant.stockQuantity;
    return availableStock === 0 || item.quantity > availableStock;
  });
});

// 특정 아이템이 재고 부족인지 확인
const isOutOfStock = (item: any) => {
  if (!item.variant) return false;
  const availableStock = item.variant.stockQuantity;
  return availableStock === 0 || item.quantity > availableStock;
};

// 주문 페이지로 이동
const goToOrder = async () => {
  if (cartItems.value.length === 0) {
    showAlert(CART_MESSAGES.empty, { type: "error" });
    return;
  }

  // 재고 부족 상품 확인
  if (hasOutOfStockItems.value) {
    showAlert(CART_MESSAGES.outOfStockItems, { type: "error" });
    return;
  }

  // 비회원일 경우 로그인 페이지로 유도 (결제는 회원만 가능)
  if (!authStore.isAuthenticated) {
    const confirmed = await showConfirm(
      ORDER_MESSAGES.requireLoginForOrder,
      { confirmText: "로그인", cancelText: "취소" }
    );
    if (confirmed) {
      router.push("/login");
    }
    return;
  }

  router.push("/order");
};

// 인증 상태 로딩 완료 후 장바구니 로드
onMounted(() => {
  // 이미 인증 상태 확인이 완료된 경우 바로 로드
  if (!authStore.isLoading) {
    loadCart();
  }
});

// 인증 상태 로딩 중이었다면, 완료 후 장바구니 로드
watch(
  () => authStore.isLoading,
  (isLoading, wasLoading) => {
    // 로딩이 완료된 시점 (true -> false)
    if (wasLoading && !isLoading) {
      loadCart();
    }
  }
);
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider">장바구니</h3>
      <p class="text-body text-muted-foreground pt-1 mb-3">
        관심 있는 상품을 모아두었습니다.
      </p>
      <Separator></Separator>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="isEmpty"
      header="장바구니가 비어있습니다."
      message="장바구니에 담긴 상품이 없습니다."
      button-text="쇼핑하러 가기"
      button-link="/product/all"
    />

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <!-- 재고 부족 경고 -->
        <Card
          v-if="hasOutOfStockItems"
          class="border-primary/50 bg-primary/5 rounded-2xl"
        >
          <CardContent class="p-3">
            <AlertDescription>
              아쉽게도 일부 상품의 재고가 소진되었습니다.<br
                class="sm:hidden"
              />
              <span class="hidden sm:inline">&nbsp;</span>원활한 주문을 위해
              목록에서 제외해 주세요.
            </AlertDescription>
          </CardContent>
        </Card>

        <!-- 장바구니 상품 -->
        <Card>
          <CardHeader>
            <CardTitle class="text-heading"
              >상품 목록
              {{
                cartItems.reduce((sum, item) => sum + item.quantity, 0)
              }}개</CardTitle
            >
          </CardHeader>
          <CardContent class="p-0">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="pl-6 pr-6 pb-6 pt-1 flex flex-col sm:flex-row gap-6 relative"
              :class="[isOutOfStock(item) ? 'bg-primary/5' : '']"
            >
              <!-- SOLD OUT 배지 -->
              <Badge
                v-if="isOutOfStock(item)"
                class="absolute top-3 left-3 z-10 bg-primary text-primary-foreground"
              >
                SOLD OUT
              </Badge>

              <ProductThumbnail
                :image-url="item.product?.imageUrl"
                :product-id="item.productId"
                :class="[isOutOfStock(item) ? 'opacity-50' : '']"
              />

              <div class="flex-1 flex flex-col">
                <div class="flex justify-between items-start">
                  <h3
                    :class="[
                      'text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2',
                      isOutOfStock(item) ? 'opacity-60' : '',
                    ]"
                    @click="router.push(`/productDetail/${item.productId}`)"
                  >
                    {{ item.product?.name }}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removeItem(item.id)"
                    class="text-muted-foreground hover:bg-transparent hover:text-primary transition-colors h-auto flex-shrink-0"
                  >
                    삭제
                  </Button>
                </div>

                <p
                  v-if="item.variant"
                  :class="[
                    'text-body text-muted-foreground mt-1',
                    isOutOfStock(item) ? 'opacity-60' : '',
                  ]"
                >
                  Size : {{ item.variant.size }}
                  <span v-if="item.variant.color">
                    / Color : {{ item.variant.color }}</span
                  >
                  / {{ item.quantity }}개
                </p>

                <!-- 재고 부족 메시지 -->
                <AlertDescription v-if="isOutOfStock(item)" class="mt-1">
                  재고가 부족합니다<span v-if="item.variant">
                    (남은 재고: {{ item.variant.stockQuantity }}개)</span
                  >
                </AlertDescription>

                <p
                  :class="[
                    'text-body font-medium text-foreground mt-1',
                    isOutOfStock(item) ? 'opacity-60' : '',
                  ]"
                >
                  {{ formatPrice(Number(item.product?.price) * item.quantity) }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="lg:col-span-1">
        <Card class="sticky top-24">
          <CardHeader>
            <CardTitle class="text-heading">주문 요약</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between text-body">
              <span class="text-muted-foreground">상품 금액</span>
              <span class="text-foreground">{{
                formatPrice(totalProductPrice)
              }}</span>
            </div>
            <div class="flex justify-between text-body">
              <span class="text-muted-foreground">배송비</span>
              <span class="text-foreground">
                {{ shippingFee === 0 ? "무료배송" : formatPrice(shippingFee) }}
              </span>
            </div>

            <Separator />

            <div class="flex justify-between text-heading">
              <span class="text-foreground">총 결제 금액</span>
              <span class="text-primary">{{ formatPrice(totalAmount) }}</span>
            </div>

            <Button
              @click="goToOrder"
              :disabled="hasOutOfStockItems"
              class="w-full font-bold hover:bg-primary/80"
              size="lg"
            >
              {{ hasOutOfStockItems ? "재고 부족 상품 확인 필요" : "주문하기" }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
