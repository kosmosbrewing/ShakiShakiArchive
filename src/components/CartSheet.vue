<script setup lang="ts">
// src/components/CartSheet.vue
// 오른쪽 슬라이드 장바구니 Sheet

import { computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useCart } from "@/composables/useCart";
import { formatPrice } from "@/lib/formatters";

// 아이콘
import { AlertCircle, X } from "lucide-vue-next";

// 공통 컴포넌트
import {
  LoadingSpinner,
  //QuantitySelector,
  ProductThumbnail,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

// Props & Emits
const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const router = useRouter();

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

// Sheet가 열릴 때 장바구니 로드
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadCart();
    }
  }
);

// Sheet 닫기
const closeSheet = () => {
  emit("update:open", false);
};

// 상품 상세 페이지로 이동
const goToProductDetail = (productId: number | string) => {
  closeSheet();
  router.push(`/productDetail/${productId}`);
};

// 장바구니 페이지로 이동
const goToCart = () => {
  closeSheet();
  router.push("/cart");
};

// 쇼핑 계속하기
const continueShopping = () => {
  closeSheet();
  router.push("/product/all");
};
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="w-full sm:max-w-sm flex flex-col p-0 bg-card rounded-2xl"
    >
      <!-- 헤더 -->
      <SheetHeader class="px-6 py-4 pt-10">
        <div class="flex items-center justify-between">
          <SheetTitle class="text-heading text-primary tracking-wider">
            장바구니
          </SheetTitle>
        </div>
        <p class="text-caption text-muted-foreground mb-3">
          관심 있는 상품을 모아두었습니다.
        </p>
        <Separator></Separator>
      </SheetHeader>

      <!-- 본문 -->
      <div class="flex-1 overflow-hidden">
        <!-- 로딩 -->
        <div v-if="loading" class="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>

        <!-- 빈 장바구니 -->
        <div
          v-else-if="isEmpty"
          class="flex flex-col items-center h-full px-6 text-muted-foreground mt-20"
        >
          <p class="text-body text-muted-foreground mb-2">
            장바구니가 비어있습니다.
          </p>
          <Button
            variant="outline"
            @click="continueShopping"
            class="rounded-lg bg-primary px-6 py-2 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            쇼핑하러 가기
          </Button>
        </div>

        <!-- 장바구니 아이템 목록 -->
        <ScrollArea v-else class="h-full">
          <div class="px-4 space-y-3">
            <!-- 재고 부족 경고 -->
            <Card
              v-if="hasOutOfStockItems"
              class="border-primary/50 bg-primary/5 rounded-2xl"
            >
              <CardContent class="flex items-center gap-2 p-3">
                <AlertCircle class="w-4 h-4 text-primary flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-caption font-semibold text-primary">
                    재고 부족 상품이 있습니다
                  </p>
                  <p class="text-caption text-muted-foreground">
                    재고 부족 상품을 삭제해주세요.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              v-for="item in cartItems"
              :key="item.id"
              :class="[
                'rounded-2xl overflow-hidden',
                isOutOfStock(item) ? 'border-primary/30 bg-muted/30' : '',
              ]"
            >
              <CardContent class="flex gap-4 p-3 relative">
                <!-- SOLD OUT 배지 -->
                <Badge
                  v-if="isOutOfStock(item)"
                  class="absolute top-2 left-2 z-10 text-xs bg-primary text-primary-foreground"
                >
                  SOLD OUT
                </Badge>

                <!-- 상품 이미지 -->
                <div class="flex-shrink-0">
                  <ProductThumbnail
                    :image-url="item.product?.imageUrl"
                    :product-id="item.productId"
                    size="sm"
                    :class="[isOutOfStock(item) ? 'opacity-50' : '']"
                    @click="goToProductDetail(item.productId)"
                  />
                </div>

                <!-- 상품 정보 -->
                <div class="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div class="flex justify-between items-start gap-2">
                      <h4
                        :class="[
                          'text-body font-medium truncate cursor-pointer hover:underline',
                          isOutOfStock(item)
                            ? 'text-muted-foreground opacity-60'
                            : 'text-foreground',
                        ]"
                        @click="goToProductDetail(item.productId)"
                      >
                        {{ item.product?.name }}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="removeItem(item.id)"
                        class="text-muted-foreground hover:text-primary h-auto p-0.5 flex-shrink-0"
                      >
                        <X class="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <p
                      v-if="item.variant"
                      :class="[
                        'text-caption text-muted-foreground mt-0.5',
                        isOutOfStock(item) ? 'opacity-60' : '',
                      ]"
                    >
                      Size : {{ item.variant.size }}
                      <span v-if="item.variant.color"
                        >/ {{ item.variant.color }}</span
                      >
                    </p>

                    <!-- 재고 부족 메시지 -->
                    <p
                      v-if="isOutOfStock(item)"
                      class="text-caption text-primary mt-1 font-medium"
                    >
                      재고 부족
                      <span v-if="item.variant"
                        >(남은 재고: {{ item.variant.stockQuantity }}개)</span
                      >
                    </p>
                  </div>

                  <div class="flex justify-between items-center mt-2">
                    <!-- 수량 비활성화
                    <QuantitySelector
                      :model-value="item.quantity"
                      size="sm"
                      @change="(change) => updateQuantity(item, change)"
                    />
                    -->
                    <span
                      :class="[
                        'text-body font-medium',
                        isOutOfStock(item)
                          ? 'text-muted-foreground opacity-60'
                          : 'text-foreground',
                      ]"
                    >
                      {{
                        formatPrice(Number(item.product?.price) * item.quantity)
                      }}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      <!-- 푸터 (주문 요약) -->
      <SheetFooter
        v-if="!loading && !isEmpty"
        class="flex-col gap-4 px-6 py-4 bg-muted/100 rounded-2xl"
      >
        <div class="w-full space-y-2">
          <div class="flex justify-between text-body">
            <span class="text-muted-foreground">상품 금액</span>
            <span class="text-foreground">{{
              formatPrice(totalProductPrice)
            }}</span>
          </div>
          <div class="flex justify-between text-body">
            <span class="text-muted-foreground">배송비</span>
            <span class="text-foreground">
              {{ shippingFee === 0 ? "무료" : formatPrice(shippingFee) }}
            </span>
          </div>

          <div class="flex justify-between text-heading pb-2">
            <span class="text-foreground">총 결제 금액</span>
            <span class="text-primary">{{ formatPrice(totalAmount) }}</span>
          </div>
          <Button
            @click="goToCart"
            :disabled="hasOutOfStockItems"
            class="w-full"
            size="lg"
          >
            {{ hasOutOfStockItems ? "재고 부족 상품 확인 필요" : "주문하기" }}
          </Button>
          <div class="pt-1"></div>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
