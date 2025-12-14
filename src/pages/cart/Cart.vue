<script setup lang="ts">
// src/pages/Cart.vue
// 장바구니 페이지

import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useCart } from "@/composables/useCart";
import { formatPrice } from "@/lib/formatters";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState, QuantitySelector, ProductThumbnail } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 장바구니 로직
const {
  cartItems,
  loading,
  totalProductPrice,
  isEmpty,
  loadCart,
  updateQuantity,
  removeItem,
} = useCart();

// 주문 페이지로 이동
const goToOrder = () => {
  if (cartItems.value.length === 0) {
    alert("장바구니가 비어있습니다.");
    return;
  }
  router.push("/order");
};

onMounted(() => {
  loadCart();
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 타이틀 -->
    <div class="mb-8">
      <h1 class="text-sm font-bold uppercase tracking-widest text-foreground">
        Shopping Cart
      </h1>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <!-- 빈 장바구니 -->
    <EmptyState
      v-else-if="isEmpty"
      message="장바구니에 담긴 상품이 없습니다."
      button-text="쇼핑하러 가기"
      button-link="/product/all"
    />

    <!-- 장바구니 내용 -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- 장바구니 아이템 목록 -->
      <div class="lg:col-span-2 space-y-4">
        <Card v-for="item in cartItems" :key="item.id">
          <CardContent class="flex gap-6 p-4">
            <!-- 상품 이미지 -->
            <ProductThumbnail
              :image-url="item.product?.imageUrl"
              :product-id="item.productId"
            />

            <!-- 상품 정보 -->
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start">
                  <h3
                    class="font-bold text-foreground cursor-pointer hover:underline"
                    @click="router.push(`/productDetail/${item.productId}`)"
                  >
                    {{ item.product?.name }}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removeItem(item.id)"
                    class="text-muted-foreground hover:text-destructive h-auto p-1"
                  >
                    삭제
                  </Button>
                </div>

                <p v-if="item.variant" class="text-sm text-muted-foreground mt-1">
                  옵션: {{ item.variant.size }}
                  <span v-if="item.variant.color">/ {{ item.variant.color }}</span>
                </p>
              </div>

              <div class="flex justify-between items-end mt-4">
                <!-- 수량 조절 -->
                <QuantitySelector
                  :model-value="item.quantity"
                  size="sm"
                  @change="(change) => updateQuantity(item, change)"
                />

                <!-- 가격 -->
                <div class="font-bold text-foreground">
                  {{ formatPrice(Number(item.product?.price) * item.quantity) }}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 주문 요약 -->
      <div class="lg:col-span-1">
        <Card class="sticky top-24">
          <CardHeader>
            <CardTitle class="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">상품 금액</span>
              <span class="text-foreground">{{ formatPrice(totalProductPrice) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">배송비</span>
              <span class="text-foreground">0원 (무료배송)</span>
            </div>

            <Separator />

            <div class="flex justify-between text-lg font-bold">
              <span class="text-foreground">총 결제 금액</span>
              <span class="text-foreground">{{ formatPrice(totalProductPrice) }}</span>
            </div>

            <Button @click="goToOrder" class="w-full" size="lg">
              주문하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
