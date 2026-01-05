<script setup lang="ts">
// src/pages/order/PaymentCallback.vue
// 결제 완료/실패 콜백 페이지

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { CheckCircle, XCircle, Package, AlertTriangle } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatters";
import { confirmPayment, StockShortageError } from "@/lib/api";
import { LoadingSpinner } from "@/components/common";
import type { StockShortageItem } from "@/types/api";

const router = useRouter();
const route = useRoute();

// 상태: stock_shortage 추가 (재고 부족 에러)
const status = ref<"loading" | "success" | "error" | "stock_shortage">("loading");
const errorMessage = ref<string>("");
const shortageItems = ref<StockShortageItem[]>([]); // 재고 부족 상품 목록
const orderInfo = ref<{
  orderId?: string; // UUID (주문 상세 이동용)
  externalOrderId?: string; // PG사 주문번호 (화면 표시용)
  orderName?: string;
  amount?: number;
  paymentMethod?: string;
}>({});

// 팝업 창인지 확인 (네이버페이 PC 결제용)
const isPopup = ref<boolean>(false);

onMounted(async () => {
  // 팝업 창 여부 확인 (네이버페이 PC 결제)
  isPopup.value = localStorage.getItem("naverpay_popup") === "true";
  localStorage.removeItem("naverpay_popup");

  // URL 쿼리 파라미터 확인
  const result = route.query.result as string;
  const paymentKey = route.query.paymentKey as string;
  const orderId = route.query.orderId as string;
  const amount = route.query.amount as string;
  const error = route.query.error as string;
  const message = route.query.message as string;

  // 토스페이먼츠 결제 성공 시 (paymentKey가 있으면 결제 승인 필요)
  if (paymentKey && orderId && amount) {
    try {
      // 백엔드에 결제 승인 요청
      const confirmResult = await confirmPayment({
        paymentKey,
        orderId,
        amount: Number(amount),
      });

      // success 필드 또는 order가 있으면 성공으로 처리
      if (confirmResult.success || confirmResult.order) {
        status.value = "success";
        orderInfo.value = {
          orderId: confirmResult.order?.id, // UUID (주문 상세 이동용)
          externalOrderId: confirmResult.order?.externalOrderId || orderId, // PG사 주문번호
          orderName: route.query.orderName as string,
          amount: Number(amount),
          paymentMethod: confirmResult.order?.paymentProvider || "toss", // 백엔드에서 받은 paymentProvider 사용
        };
      } else {
        throw new Error("결제 승인에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("결제 승인 오류:", err);

      // 재고 부족 에러 처리 (소프트 락 실패 - PG 자동 환불됨)
      if (err instanceof StockShortageError) {
        status.value = "stock_shortage";
        errorMessage.value = err.message;
        shortageItems.value = err.shortageItems;
      } else {
        status.value = "error";
        errorMessage.value = err.message || "결제 승인 처리 중 오류가 발생했습니다.";
      }
    }
  } else if (result === "success") {
    // 네이버페이 등 다른 결제 성공
    const provider = route.query.provider as string;
    status.value = "success";
    orderInfo.value = {
      orderId: orderId, // 네이버페이는 orderId가 UUID
      externalOrderId: route.query.externalOrderId as string,
      orderName: route.query.orderName as string,
      amount: amount ? Number(amount) : undefined,
      paymentMethod: provider || (route.query.paymentMethod as string),
    };

    // 팝업 창인 경우: localStorage로 부모 창에 결과 전달 후 닫기
    if (isPopup.value) {
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_SUCCESS",
          orderId: orderId,
          timestamp: Date.now(),
        })
      );
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }
  } else if (result === "fail" || error) {
    // 결제 실패
    status.value = "error";
    errorMessage.value = message || getErrorMessage(error);

    // 팝업 창인 경우: localStorage로 부모 창에 에러 전달 후 닫기
    if (isPopup.value) {
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_ERROR",
          message: errorMessage.value,
          timestamp: Date.now(),
        })
      );
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }
  } else if (error === "user_cancel" || result === "cancel") {
    // 결제 취소
    status.value = "error";
    errorMessage.value = "결제가 취소되었습니다.";

    // 팝업 창인 경우: localStorage로 부모 창에 취소 전달 후 닫기
    if (isPopup.value) {
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_CANCEL",
          timestamp: Date.now(),
        })
      );
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }
  } else {
    // 잘못된 접근
    status.value = "error";
    errorMessage.value = "잘못된 접근입니다.";
  }
});

// 결제 제공자(paymentProvider) 라벨 변환
function getPaymentProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    toss: "토스페이먼츠",
    tosspay: "토스페이",
    naverpay: "네이버페이",
    kakaopay: "카카오페이",
    card: "신용/체크카드",
    transfer: "계좌이체",
    virtual_account: "가상계좌",
    mobile_phone: "휴대폰 결제",
  };
  return labels[provider] || provider;
}

// 에러 코드에 따른 메시지 반환
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "user_cancel":
      return "결제가 취소되었습니다.";
    case "payment_failed":
      return "결제 처리에 실패했습니다.";
    case "invalid_amount":
      return "결제 금액이 일치하지 않습니다.";
    case "timeout":
      return "결제 시간이 초과되었습니다.";
    default:
      return "결제 중 오류가 발생했습니다.";
  }
}

// 주문 상세로 이동
const goToOrderDetail = () => {
  if (orderInfo.value.orderId) {
    router.push(`/orderdetail/${orderInfo.value.orderId}`);
  } else {
    router.push("/orderlist");
  }
};

// 홈으로 이동
const goToHome = () => {
  router.push("/");
};

// 다시 주문하기
const goToCart = () => {
  router.push("/cart");
};
</script>

<template>
  <!-- 로딩 상태: 전체 화면 로딩 -->
  <LoadingSpinner
    v-if="status === 'loading'"
    fullscreen
    variant="heart"
    size="lg"
    message="결제를 확인하고 있습니다..."
  />

  <!-- 결과 표시 (성공/에러) -->
  <section v-else class="max-w-lg mx-auto px-4 py-24 sm:py-16">
    <Card class="bg-muted/5 dark:bg-card">
      <CardContent class="flex flex-col items-center justify-center py-12 px-6">
        <!-- 성공 상태 -->
        <div v-if="status === 'success'" class="text-center w-full">
          <div class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle class="w-12 h-12 text-green-500" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제가 완료되었습니다!</h2>
          <p class="text-muted-foreground mb-6">
            주문해 주셔서 감사합니다.
          </p>

          <!-- 주문 정보 -->
          <div
            v-if="orderInfo.externalOrderId || orderInfo.orderId"
            class="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2"
          >
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">주문번호</span>
              <span class="font-mono text-xs">{{ orderInfo.externalOrderId || orderInfo.orderId }}</span>
            </div>
            <div v-if="orderInfo.orderName" class="flex justify-between text-sm">
              <span class="text-muted-foreground">주문상품</span>
              <span>{{ orderInfo.orderName }}</span>
            </div>
            <div v-if="orderInfo.amount" class="flex justify-between text-sm">
              <span class="text-muted-foreground">결제금액</span>
              <span class="font-semibold text-primary">{{ formatPrice(orderInfo.amount) }}</span>
            </div>
            <div v-if="orderInfo.paymentMethod" class="flex justify-between text-sm">
              <span class="text-muted-foreground">결제수단</span>
              <span>{{ getPaymentProviderLabel(orderInfo.paymentMethod) }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToOrderDetail" class="w-full">
              <Package class="w-4 h-4 mr-2" />
              주문 상세 보기
            </Button>
            <Button variant="outline" @click="goToHome" class="w-full">
              쇼핑 계속하기
            </Button>
          </div>
        </div>

        <!-- 에러 상태 -->
        <div v-else-if="status === 'error'" class="text-center w-full">
          <div class="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle class="w-12 h-12 text-destructive" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제 실패</h2>
          <p class="text-muted-foreground mb-6">{{ errorMessage }}</p>
          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToCart" class="w-full">
              장바구니로 돌아가기
            </Button>
            <Button variant="outline" @click="goToHome" class="w-full">
              홈으로
            </Button>
          </div>
        </div>

        <!-- 재고 부족 상태 (소프트 락 실패 - PG 자동 환불됨) -->
        <div v-else-if="status === 'stock_shortage'" class="text-center w-full">
          <div class="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle class="w-12 h-12 text-amber-500" />
          </div>
          <h2 class="text-xl font-semibold mb-2">재고 부족으로 결제 취소</h2>
          <p class="text-muted-foreground mb-4">
            결제 처리 중 일부 상품의 재고가 부족하여 결제가 자동으로 취소되었습니다.
          </p>
          <p class="text-sm text-green-600 dark:text-green-400 mb-6">
            결제하신 금액은 자동으로 환불됩니다.
          </p>

          <!-- 재고 부족 상품 목록 -->
          <div v-if="shortageItems.length > 0" class="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 class="text-sm font-medium mb-3">재고 부족 상품</h3>
            <ul class="space-y-3">
              <li
                v-for="(item, index) in shortageItems"
                :key="index"
                class="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
              >
                <div class="flex-1">
                  <p class="font-medium">{{ item.productName }}</p>
                  <p v-if="item.variantInfo" class="text-xs text-muted-foreground">
                    {{ item.variantInfo }}
                  </p>
                </div>
                <div class="text-right text-xs">
                  <p class="text-destructive">
                    요청: {{ item.requestedQuantity }}개
                  </p>
                  <p class="text-muted-foreground">
                    재고: {{ item.availableStock }}개
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToCart" class="w-full">
              장바구니에서 수량 조정하기
            </Button>
            <Button variant="outline" @click="goToHome" class="w-full">
              쇼핑 계속하기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
