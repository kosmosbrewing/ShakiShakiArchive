<script setup lang="ts">
// src/components/CartSheet.vue
// 오른쪽 슬라이드 장바구니 Sheet

import { watch } from "vue";
import { useRouter } from "vue-router";
import { useCart } from "@/composables/useCart";
import { useAuthStore } from "@/stores/auth";
import { formatPrice } from "@/lib/formatters";

// 공통 컴포넌트
import {
  LoadingSpinner,
  QuantitySelector,
  ProductThumbnail,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { X } from "lucide-vue-next";

// Props & Emits
const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const router = useRouter();
const authStore = useAuthStore();

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

// 주문 페이지로 이동
const goToOrder = () => {
  if (cartItems.value.length === 0) {
    alert("장바구니가 비어있습니다.");
    return;
  }

  // 비회원일 경우 로그인 페이지로 유도
  if (!authStore.isAuthenticated) {
    if (
      confirm(
        "주문을 위해 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?"
      )
    ) {
      closeSheet();
      router.push("/login");
    }
    return;
  }

  closeSheet();
  router.push("/order");
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
      class="w-full sm:max-w-md flex flex-col p-0 bg-card rounded-2xl"
    >
      <!-- 헤더 -->
      <SheetHeader class="px-6 py-4 pt-10">
        <div class="flex items-center justify-between">
          <SheetTitle class="text-heading text-primary tracking-wider">
            CART
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
            <Card
              v-for="item in cartItems"
              :key="item.id"
              class="rounded-2xl overflow-hidden"
            >
              <CardContent class="flex gap-4 p-3">
                <!-- 상품 이미지 -->
                <div class="flex-shrink-0">
                  <ProductThumbnail
                    :image-url="item.product?.imageUrl"
                    :product-id="item.productId"
                    size="sm"
                    @click="goToProductDetail(item.productId)"
                  />
                </div>

                <!-- 상품 정보 -->
                <div class="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div class="flex justify-between items-start gap-2">
                      <h4
                        class="text-body font-medium text-foreground truncate cursor-pointer hover:underline"
                        @click="goToProductDetail(item.productId)"
                      >
                        {{ item.product?.name }}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="removeItem(item.id)"
                        class="text-muted-foreground hover:text-destructive h-auto p-0.5 flex-shrink-0"
                      >
                        <X class="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <p
                      v-if="item.variant"
                      class="text-caption text-muted-foreground mt-0.5"
                    >
                      {{ item.variant.size }}
                      <span v-if="item.variant.color"
                        >/ {{ item.variant.color }}</span
                      >
                    </p>
                  </div>

                  <div class="flex justify-between items-center mt-2">
                    <QuantitySelector
                      :model-value="item.quantity"
                      size="sm"
                      @change="(change) => updateQuantity(item, change)"
                    />
                    <span class="text-body font-medium text-foreground">
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
            <span class="text-foreground">무료</span>
          </div>

          <div class="flex justify-between text-heading pb-2">
            <span class="text-foreground">총 결제 금액</span>
            <span class="text-primary">{{
              formatPrice(totalProductPrice)
            }}</span>
          </div>
          <Button @click="goToOrder" class="w-full" size="lg">
            주문하기
          </Button>
          <div class="pt-1"></div>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
