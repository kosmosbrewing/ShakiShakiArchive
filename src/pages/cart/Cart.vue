<script setup lang="ts">
// src/pages/Cart.vue
// 장바구니 페이지

import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
// import { useAuthGuard } from "@/composables/useAuthGuard"; // [삭제] 비회원 접근 허용
import { useCart } from "@/composables/useCart";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useNaverPayOrder } from "@/composables/useNaverPayOrder";
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

// 네이버페이 주문형
const naverPay = useNaverPayOrder();
const naverPayInitialized = ref(false);

// 결제 버튼 표시 조건 (SDK 로드 완료 후 동시 표시)
const showPaymentButtons = computed(() => {
  return (
    !isEmpty.value && (naverPay.sdkLoaded.value || !naverPay.isEnabled.value)
  );
});

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

// 주문 페이지로 이동 (추후 필요 시 활성화)
// const goToOrder = async () => {
//   if (cartItems.value.length === 0) {
//     showAlert(CART_MESSAGES.empty, { type: "error" });
//     return;
//   }
//
//   // 재고 부족 상품 확인
//   if (hasOutOfStockItems.value) {
//     showAlert(CART_MESSAGES.outOfStockItems, { type: "error" });
//     return;
//   }
//
//   // 비회원일 경우 로그인 페이지로 유도 (결제는 회원만 가능)
//   if (!authStore.isAuthenticated) {
//     const confirmed = await showConfirm(ORDER_MESSAGES.requireLoginForOrder, {
//       confirmText: "로그인",
//       cancelText: "취소",
//     });
//     if (confirmed) {
//       router.push("/login");
//     }
//     return;
//   }
//
//   router.push("/order");
// };

// 네이버페이 SDK 로드 (설정 + 스크립트만)
const loadNaverPaySdk = async () => {
  try {
    await naverPay.loadConfig();
    if (!naverPay.isEnabled.value) return;
    await naverPay.loadSdk();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("네이버페이 SDK 로드 실패:", e);
    }
  }
};

// 네이버페이 버튼 렌더링 (컨테이너가 존재할 때만)
const renderNaverPayButton = () => {
  if (naverPayInitialized.value) return;
  if (!naverPay.isEnabled.value || !naverPay.sdkLoaded.value) return;

  const container = document.getElementById("naverpay-cart-button-container");
  if (!container) return;

  // 컨테이너 초기화 (중복 방지)
  container.replaceChildren();

  try {
    naverPay.renderButton({
      containerId: "naverpay-cart-button-container",
      buttonType: "A",
      buttonColor: 1,
      count: 2,
      onBuy: handleNaverPayCartBuy,
    });
    naverPayInitialized.value = true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("네이버페이 버튼 렌더링 실패:", e);
    }
  }
};

// 카카오페이 장바구니 구매 핸들러 (Order.vue로 이동)
const handleKakaoPayCartBuy = async () => {
  if (cartItems.value.length === 0) {
    showAlert(CART_MESSAGES.empty, { type: "error" });
    return;
  }

  // 재고 부족 상품 확인
  if (hasOutOfStockItems.value) {
    showAlert(CART_MESSAGES.outOfStockItems, { type: "error" });
    return;
  }

  // 비회원일 경우 로그인 페이지로 유도
  if (!authStore.isAuthenticated) {
    const confirmed = await showConfirm(ORDER_MESSAGES.requireLoginForOrder, {
      confirmText: "로그인",
      cancelText: "취소",
    });
    if (confirmed) {
      router.push("/login");
    }
    return;
  }

  // 카카오페이 선택 상태로 주문 페이지 이동
  router.push("/order?payment=kakaopay");
};

// 네이버페이 장바구니 구매 핸들러 (회원/비회원 모두 지원)
const handleNaverPayCartBuy = async () => {
  if (cartItems.value.length === 0) {
    showAlert(CART_MESSAGES.empty, { type: "error" });
    return;
  }

  // 재고 부족 상품 확인
  if (hasOutOfStockItems.value) {
    showAlert(CART_MESSAGES.outOfStockItems, { type: "error" });
    return;
  }

  try {
    // 비회원: localStorage 장바구니 데이터 전달
    // 회원: undefined 전달 → 백엔드에서 세션 기반 장바구니 조회
    const guestCartItems = !authStore.isAuthenticated
      ? cartItems.value.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
        }))
      : undefined;

    const response = await naverPay.registerCartOrder(guestCartItems);
    // 네이버페이 주문서로 이동 (백엔드에서 받은 URL 사용)
    naverPay.openNaverPayOrder(response.orderPageUrl);
  } catch (e: any) {
    showAlert(e.message || "네이버페이 주문 등록에 실패했습니다", {
      type: "error",
    });
  }
};

// 인증 상태 로딩 완료 후 장바구니 로드
onMounted(() => {
  // 이미 인증 상태 확인이 완료된 경우 바로 로드
  if (!authStore.isLoading) {
    loadCart();
    // 네이버페이 SDK 로드 (약간 딜레이 후)
    setTimeout(loadNaverPaySdk, 200);
  }
});

// 인증 상태 로딩 중이었다면, 완료 후 장바구니 로드
watch(
  () => authStore.isLoading,
  (isLoading, wasLoading) => {
    // 로딩이 완료된 시점 (true -> false)
    if (wasLoading && !isLoading) {
      loadCart();
      // 네이버페이 SDK 로드 (약간 딜레이 후)
      setTimeout(loadNaverPaySdk, 200);
    }
  },
);

// SDK 로드 완료 + 장바구니 로드 완료 시 버튼 렌더링
// 둘 중 어느 쪽이 먼저 완료되더라도 양쪽 조건이 갖춰지면 렌더링 시도
watch(
  [() => naverPay.sdkLoaded.value, isEmpty],
  ([loaded, empty]) => {
    if (loaded && !empty) {
      nextTick(() => {
        setTimeout(renderNaverPayButton, 100);
      });
    }
  },
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
                :product-slug="item.product?.slug"
                :class="[isOutOfStock(item) ? 'opacity-50' : '']"
              />

              <div class="flex-1 flex flex-col">
                <div class="flex justify-between items-start">
                  <h3
                    :class="[
                      'text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2',
                      isOutOfStock(item) ? 'opacity-60' : '',
                    ]"
                    @click="router.push(`/productDetail/${item.product?.slug || item.productId}`)"
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

      <div class="lg:col-span-1 space-y-4 sticky top-24">
        <!-- 주문 요약 Card -->
        <Card>
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
          </CardContent>
        </Card>

        <!-- 주문하기 Card (SDK 로드 완료 후 표시) -->
        <Card
          v-if="!hasOutOfStockItems && showPaymentButtons"
          class="animate-fade-in"
        >
          <CardHeader>
            <CardTitle class="text-heading">바로 구매</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-2 pt-2">
            <!-- 네이버페이 SDK 버튼 (관리자 + 검수 테스트 계정) -->
            <div
              v-if="naverPay.isEnabled.value && (authStore.isAdmin || authStore.user?.email === 'test@shakishakiarchive.com')"
              id="naverpay-cart-button-container"
              class="flex items-center justify-center min-h-[100px]"
            ></div>

            <!-- 카카오페이 (기본 285x88px, 부모 영역에 따라 가변) -->
            <div class="flex items-center justify-center w-full pt-3">
              <div
                class="border-t-[2px] border-[#222] bg-white w-full max-w-[285px] h-[88px] flex flex-col items-center"
                style="font-family: Dotum, 돋움, sans-serif"
              >
                <!-- 내부 영역 -->
                <div
                  class="w-[calc(100%-8px)] h-[59px] flex items-center justify-between"
                >
                  <!-- 왼쪽: 설명 -->
                  <div class="flex flex-col shrink-0">
                    <span class="text-[11px] font-medium text-[#191919]"
                      ><span
                        style="
                          background: linear-gradient(
                            to top,
                            #ffeb00 2px,
                            transparent 2px
                          );
                        "
                        >kakao<span class="font-bold">pay</span></span
                      >
                      <p />
                      간편하게 주문</span
                    >
                  </div>
                  <!-- 오른쪽: 버튼 (PC: 167px, 모바일: 191px) -->
                  <button
                    @click="handleKakaoPayCartBuy"
                    class="flex items-center justify-center gap-px bg-[#FFEB00] hover:bg-[#FEE500] text-[#191919] flex-1 max-w-[191px] lg:max-w-[167.36px] h-[37px] ml-2 px-3 rounded-[3px] transition-colors"
                  >
                    <img
                      src="@/assets/kakaoSymbol.png"
                      alt="카카오페이"
                      class="h-5 w-auto object-contain"
                    />
                    <span class="text-[12px] font-semibold -translate-x-1"
                      >결제</span
                    >
                  </button>
                </div>
                <!-- 하단 영역 -->
                <div
                  class="w-[calc(100%-8px)] h-[28px] flex items-center border-t-[0.1px] border-[#eaeaea]"
                >
                  <span class="text-[12px] text-[#888]">회원 주문가능</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
