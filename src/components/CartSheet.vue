<script setup lang="ts">
// src/components/CartSheet.vue
// 오른쪽 슬라이드 장바구니 Sheet

import { computed, watch, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useCart } from "@/composables/useCart";
import { formatPrice } from "@/lib/formatters";

// 아이콘
import { X } from "lucide-vue-next";

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
import { AlertDescription } from "@/components/ui/alert";
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

// 뒤로가기로 시트를 닫는지 여부를 추적
const closingByPopState = ref(false);

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

// Sheet가 열릴 때 장바구니 로드 및 history 관리
watch(
  () => props.open,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      loadCart();
      // 시트가 열릴 때: history에 가상 상태 추가
      window.history.pushState({ cartSheetOpen: true }, '');
    } else if (!newValue && oldValue && !closingByPopState.value) {
      // 시트가 닫힐 때 (뒤로가기가 아닌 경우): history에서 제거
      window.history.back();
    }
    // 플래그 리셋
    closingByPopState.value = false;
  }
);

// Sheet 닫기
const closeSheet = () => {
  emit("update:open", false);
};

// 상품 상세 페이지로 이동
const goToProductDetail = (productId: number | string) => {
  // 라우터 네비게이션 시 history.back() 방지
  closingByPopState.value = true;
  emit("update:open", false);
  router.push(`/productDetail/${productId}`);
};

// 장바구니 페이지로 이동
const goToCart = () => {
  // 라우터 네비게이션 시 history.back() 방지
  closingByPopState.value = true;
  emit("update:open", false);
  router.push("/cart");
};

// 뒤로가기 이벤트 핸들러
const handlePopState = () => {
  if (props.open) {
    // 시트가 열려있는 경우 뒤로가기로 시트 닫기
    closingByPopState.value = true;
    emit("update:open", false);
  }
};

onMounted(() => {
  window.addEventListener("popstate", handlePopState);
});

onUnmounted(() => {
  window.removeEventListener("popstate", handlePopState);
});

// 쇼핑 계속하기
const continueShopping = () => {
  closeSheet();
  router.push("/product/all");
};

// 스와이프로 닫기 기능
const touchStartX = ref(0);
const touchEndX = ref(0);
const isSwiping = ref(false);

// 터치 시작
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  isSwiping.value = true;
};

// 터치 이동
const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value) return;
  touchEndX.value = e.touches[0].clientX;
};

// 터치 종료
const handleTouchEnd = () => {
  if (!isSwiping.value) return;

  const swipeDistance = touchEndX.value - touchStartX.value;
  const minSwipeDistance = 100; // 최소 스와이프 거리 (px)

  // 오른쪽으로 스와이프 (Sheet 닫기)
  if (swipeDistance > minSwipeDistance) {
    closeSheet();
  }

  isSwiping.value = false;
  touchStartX.value = 0;
  touchEndX.value = 0;
};
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="w-11/12 sm:max-w-md flex flex-col p-0 bg-card rounded-2xl"
      @open-auto-focus="(event) => event.preventDefault()"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
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
            class="rounded-lg bg-primary hover:bg-primary/80 px-6 py-2 text-body font-medium text-primary-foreground transition-colors"
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
              <CardContent class="p-3">
                <AlertDescription>
                  아쉽게도 일부 상품의 재고가 소진되었습니다.
                  <p />
                  원활한 주문을 위해 목록에서 제외해 주세요.
                </AlertDescription>
              </CardContent>
            </Card>

            <Card
              v-for="item in cartItems"
              :key="item.id"
              :class="[
                'rounded-2xl overflow-hidden',
                isOutOfStock(item) ? 'border-primary/30 bg-primary/5 ' : '',
              ]"
            >
              <CardContent class="flex gap-6 p-4 relative">
                <!-- SOLD OUT 배지 -->
                <Badge
                  v-if="isOutOfStock(item)"
                  class="absolute top-3 left-3 z-10 bg-primary text-primary-foreground"
                >
                  SOLD OUT
                </Badge>

                <!-- 상품 이미지 -->
                <ProductThumbnail
                  :image-url="item.product?.imageUrl"
                  :product-id="item.productId"
                  :class="[isOutOfStock(item) ? 'opacity-50' : '']"
                  @click="goToProductDetail(item.productId)"
                />

                <!-- 상품 정보 -->
                <div class="flex-1 flex flex-col min-w-0">
                  <div class="flex justify-between items-start gap-2">
                    <h3
                      :class="[
                        'text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2',
                        isOutOfStock(item) ? 'opacity-60' : '',
                      ]"
                      @click="goToProductDetail(item.productId)"
                    >
                      {{ item.product?.name }}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="removeItem(item.id)"
                      class="text-muted-foreground hover:bg-transparent hover:text-primary transition-colors h-auto p-0.5 flex-shrink-0"
                    >
                      <X class="h-3.5 w-3.5" />
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
                    재고 부족<span v-if="item.variant">
                      (남은 재고: {{ item.variant.stockQuantity }}개)</span
                    >
                  </AlertDescription>

                  <p
                    :class="[
                      'text-body font-medium text-foreground mt-1',
                      isOutOfStock(item) ? 'opacity-60' : '',
                    ]"
                  >
                    {{
                      formatPrice(Number(item.product?.price) * item.quantity)
                    }}
                  </p>
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
            <span :class="shippingFee === 0 ? 'text-primary font-medium' : 'text-foreground'">
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
            class="w-full font-bold hover:bg-primary/80"
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
