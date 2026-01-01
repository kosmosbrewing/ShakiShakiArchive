<script setup lang="ts">
// src/pages/order/PaymentCallback.vue
// 결제 완료/실패 콜백 페이지

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { CheckCircle, XCircle, Package } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatters";
import { confirmPayment } from "@/lib/api";
import { LoadingSpinner } from "@/components/common";

const router = useRouter();
const route = useRoute();

// 상태
const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref<string>("");
const orderInfo = ref<{
  orderId?: string; // UUID (주문 상세 이동용)
  externalOrderId?: string; // PG사 주문번호 (화면 표시용)
  orderName?: string;
  amount?: number;
  paymentMethod?: string;
}>({});

onMounted(async () => {
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
      status.value = "error";
      errorMessage.value = err.message || "결제 승인 처리 중 오류가 발생했습니다.";
    }
  } else if (result === "success") {
    // 네이버페이 등 다른 결제 성공
    const provider = route.query.provider as string;
    status.value = "success";
    orderInfo.value = {
      externalOrderId: orderId, // URL의 orderId는 이미 externalOrderId
      orderName: route.query.orderName as string,
      amount: amount ? Number(amount) : undefined,
      paymentMethod: provider || (route.query.paymentMethod as string), // paymentProvider 그대로 사용
    };
  } else if (result === "fail" || error) {
    // 결제 실패
    status.value = "error";
    errorMessage.value = message || getErrorMessage(error);
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
      </CardContent>
    </Card>
  </section>
</template>
