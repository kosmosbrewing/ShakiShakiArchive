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

// 🔒 결제 승인 페이지 진입 즉시 플래그 설정 (Order.vue cleanup 충돌 방지)
// onMounted보다 먼저 실행되도록 컴포넌트 최상단에 배치
localStorage.setItem("payment_confirming", "true");
console.log("[PaymentCallback] 결제 승인 플래그 설정 (즉시)");

// 상태: stock_shortage 추가 (재고 부족 에러)
const status = ref<"loading" | "success" | "error" | "stock_shortage">(
  "loading"
);
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
  // 주의: naverpay_popup 플래그는 여기서 제거하지 않음!
  // window.close() 직전이나 beforeunload에서만 제거해야 함

  // 팝업 강제 종료 감지 (X 버튼 클릭 등)
  if (isPopup.value) {
    const handlePopupClose = () => {
      const orderId = localStorage.getItem("naverpay_current_order");
      console.log("[팝업 강제 종료] 감지, orderId:", orderId);

      // 팝업 플래그 먼저 제거 (Order.vue의 폴링이 감지)
      localStorage.removeItem("naverpay_popup");

      if (orderId) {
        console.log("[팝업 강제 종료] 부모 창에 취소 알림");
        localStorage.setItem(
          "naverpay_result",
          JSON.stringify({
            type: "PAYMENT_CANCEL",
            orderId: orderId,
            timestamp: Date.now(),
          })
        );
      }
    };

    window.addEventListener("beforeunload", handlePopupClose);
    window.addEventListener("pagehide", handlePopupClose);
  }

  // URL 쿼리 파라미터 확인
  const result = route.query.result as string;
  const paymentKey = route.query.paymentKey as string;
  let orderId = route.query.orderId as string;
  const amount = route.query.amount as string;
  const error = route.query.error as string;
  const message = route.query.message as string;

  // orderId가 URL에 없으면 localStorage에서 가져오기 (네이버페이 취소 시 백업)
  if (!orderId && isPopup.value) {
    const savedOrderId = localStorage.getItem("naverpay_current_order");
    if (savedOrderId) {
      orderId = savedOrderId;
      console.log(
        "[PaymentCallback] URL에 orderId 없음, localStorage에서 복원:",
        orderId
      );
    }
  }
  // localStorage 정리
  localStorage.removeItem("naverpay_current_order");

  // 디버깅: 팝업 및 쿼리 파라미터 로그
  console.log("[PaymentCallback] isPopup:", isPopup.value);
  console.log("[PaymentCallback] Current Path:", route.path);
  console.log("[PaymentCallback] Query Params:", {
    result,
    paymentKey,
    orderId,
    amount,
    error,
    message,
  });

  // 네이버페이 실패/취소 경로 (/checkout/fail)
  if (route.path === "/checkout/fail") {
    console.log("[PaymentCallback] 네이버페이 결제 실패/취소");
    console.log("[PaymentCallback] orderId:", orderId); // orderId 확인
    console.log("[PaymentCallback] message:", message); // 원본 메시지 확인

    status.value = "error";

    // 에러 메시지 정제 (네이버페이의 긴 메시지를 간결하게)
    let cleanMessage = message || "결제가 취소되었습니다.";

    // 특정 패턴 감지 및 메시지 정제 (네이버페이 공식 에러 코드 패턴)
    if (cleanMessage.includes("잔고") || cleanMessage.includes("잔액")) {
      cleanMessage = "계좌 잔액이 부족합니다. 잔액을 확인해주세요.";
    } else if (cleanMessage.includes("한도")) {
      cleanMessage = "카드 한도가 부족합니다. 다른 결제 수단을 이용해주세요.";
    } else if (cleanMessage.includes("본인") && cleanMessage.includes("인증")) {
      cleanMessage = "본인 인증에 실패했습니다. 카드 정보를 확인해주세요.";
    } else if (
      cleanMessage.includes("비밀번호") ||
      cleanMessage.includes("인증")
    ) {
      cleanMessage = "인증에 실패했습니다. 다시 시도해주세요.";
    } else if (cleanMessage.includes("시간") || cleanMessage.includes("만료")) {
      cleanMessage = "결제 시간이 만료되었습니다. 다시 시도해주세요.";
    } else if (cleanMessage.includes("점검")) {
      if (cleanMessage.includes("은행")) {
        cleanMessage = "은행 시스템 점검 중입니다. 잠시 후 다시 시도해주세요.";
      } else if (
        cleanMessage.includes("원천사") ||
        cleanMessage.includes("시스템")
      ) {
        cleanMessage =
          "결제 시스템 점검 중입니다. 다른 결제 수단을 이용해주세요.";
      } else {
        cleanMessage = "서비스 점검 중입니다. 잠시 후 다시 시도해주세요.";
      }
    } else if (
      cleanMessage.includes("이미") &&
      (cleanMessage.includes("진행") || cleanMessage.includes("완료"))
    ) {
      cleanMessage = "이미 처리된 결제입니다.";
    } else if (cleanMessage.length > 50) {
      // 50자 이상의 긴 메시지는 간단하게 정리
      cleanMessage = "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    }

    errorMessage.value = cleanMessage;

    // 팝업 창인 경우: localStorage로 부모 창에 에러 메시지 전달 후 닫기
    if (isPopup.value) {
      console.log(
        "[PaymentCallback] /checkout/fail - 팝업 닫기, orderId:",
        orderId
      );
      console.log("[PaymentCallback] 에러 메시지:", cleanMessage);
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_ERROR", // 실제 에러이므로 ERROR 타입 사용
          orderId: orderId, // orderId 전달 (주문 삭제용)
          message: cleanMessage, // 에러 메시지 전달
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem("naverpay_popup");
      // 즉시 팝업 닫기
      window.close();
      return;
    }
    // 팝업이 아닌 경우 에러 화면 표시
    return;
  }

  // 네이버페이 성공 경로 (/checkout/success)
  if (route.path === "/checkout/success") {
    console.log("[PaymentCallback] 네이버페이 결제 성공");
    // result=success 로직으로 이동
    // 아래에서 처리됨
  }

  // 토스페이먼츠 결제 성공 시 (paymentKey가 있으면 결제 승인 필요)
  if (paymentKey && orderId && amount) {
    try {
      console.log("[PaymentCallback] 토스페이먼츠 결제 승인 시작");
      console.log("[PaymentCallback] paymentKey:", paymentKey);
      console.log("[PaymentCallback] orderId (externalOrderId):", orderId);
      console.log("[PaymentCallback] amount:", amount);

      // 백엔드에 결제 승인 요청
      const confirmResult = await confirmPayment({
        paymentKey,
        orderId,
        amount: Number(amount),
      });

      // 결제 승인 완료 - 플래그 제거
      localStorage.removeItem("payment_confirming");
      console.log("[PaymentCallback] 결제 승인 성공:", confirmResult);

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

        // 로딩 상태 유지하며 자동으로 주문 상세로 이동 (Login.vue 패턴)
        setTimeout(() => {
          if (confirmResult.order?.id) {
            router.replace(`/orderdetail/${confirmResult.order.id}`);
          } else {
            router.replace("/orderlist");
          }
        }, 500); // 0.5초 대기
        return;
      } else {
        throw new Error("결제 승인에 실패했습니다.");
      }
    } catch (err: any) {
      // 결제 승인 실패 시 플래그 제거
      localStorage.removeItem("payment_confirming");

      console.error("[PaymentCallback] 토스 결제 승인 오류:", err);
      console.error("[PaymentCallback] 에러 타입:", err?.constructor?.name);
      console.error("[PaymentCallback] 에러 메시지:", err?.message);

      // 재고 부족 에러 처리 (소프트 락 실패 - PG 자동 환불됨)
      if (err instanceof StockShortageError) {
        status.value = "stock_shortage";
        errorMessage.value = err.message;
        shortageItems.value = err.shortageItems;
        console.log("[PaymentCallback] 재고 부족 에러 처리 완료");
      } else {
        status.value = "error";
        // 백엔드에서 정제된 메시지 사용 (ApiError.message)
        errorMessage.value =
          err.message || "결제 승인 처리 중 오류가 발생했습니다.";
        console.log("[PaymentCallback] 에러 메시지 설정:", errorMessage.value);
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
      console.log("[PaymentCallback] 결제 성공 - 팝업 닫기");
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_SUCCESS",
          orderId: orderId,
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem("naverpay_popup");
      // 즉시 팝업 닫기
      window.close();
      return;
    }

    // 팝업이 아닌 경우 (모바일 리다이렉트): 로딩 상태 유지하며 자동으로 주문 상세로 이동
    // Login.vue의 OAuth 처리와 동일한 패턴
    setTimeout(() => {
      if (orderId) {
        router.replace(`/orderdetail/${orderId}`);
      } else {
        router.replace("/orderlist");
      }
    }, 500); // 0.5초 대기 (사용자가 "결제 확인 중..." 메시지를 볼 수 있게)
    return;
  } else if (result === "fail" || error) {
    // 결제 실패
    console.log("[PaymentCallback] 결제 실패, orderId:", orderId);
    status.value = "error";
    errorMessage.value = message || getErrorMessage(error);

    // 팝업 창인 경우: localStorage로 부모 창에 에러 전달 후 닫기
    if (isPopup.value) {
      console.log("[PaymentCallback] 결제 실패 - 팝업 닫기, orderId:", orderId);
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_ERROR",
          orderId: orderId, // orderId 전달 (주문 삭제용)
          message: errorMessage.value,
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem("naverpay_popup");
      // 즉시 팝업 닫기
      window.close();
      return;
    }
  } else if (error === "user_cancel" || result === "cancel") {
    // 결제 취소
    console.log("[PaymentCallback] 결제 취소, orderId:", orderId);
    status.value = "error";
    errorMessage.value = "결제가 취소되었습니다.";

    // 팝업 창인 경우: localStorage로 부모 창에 취소 전달 후 닫기
    if (isPopup.value) {
      console.log("[PaymentCallback] 결제 취소 - 팝업 닫기, orderId:", orderId);
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_CANCEL",
          orderId: orderId, // orderId 전달 (주문 삭제용)
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem("naverpay_popup");
      // 즉시 팝업 닫기
      window.close();
      return;
    }
  } else {
    // 잘못된 접근 또는 예상하지 못한 파라미터
    console.warn("[PaymentCallback] 예상하지 못한 접근:", route.query);
    console.log("[PaymentCallback] orderId:", orderId);
    status.value = "error";
    errorMessage.value = "잘못된 접근입니다.";

    // 팝업 창인 경우: 에러 전달 후 닫기
    if (isPopup.value) {
      console.log(
        "[PaymentCallback] 잘못된 접근 - 팝업 닫기, orderId:",
        orderId
      );
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_ERROR",
          orderId: orderId, // orderId 전달 (주문 삭제용)
          message: errorMessage.value,
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem("naverpay_popup");
      // 즉시 팝업 닫기
      window.close();
      return;
    }
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
    variant="dots"
    size="lg"
    message="결제를 확인하고 있습니다..."
  />

  <!-- 결과 표시 (성공/에러) -->
  <section v-else class="max-w-lg mx-auto px-4 py-24 sm:py-16">
    <Card class="bg-muted/5 dark:bg-card">
      <CardContent class="flex flex-col items-center justify-center py-12 px-6">
        <!-- 성공 상태 -->
        <div v-if="status === 'success'" class="text-center w-full">
          <div
            class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle class="w-12 h-12 text-primary" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제가 완료되었습니다!</h2>
          <p class="text-muted-foreground mb-6">주문해 주셔서 감사합니다.</p>

          <!-- 주문 정보 -->
          <div
            v-if="orderInfo.externalOrderId || orderInfo.orderId"
            class="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2"
          >
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">주문번호</span>
              <span class="font-mono text-xs">{{
                orderInfo.externalOrderId || orderInfo.orderId
              }}</span>
            </div>
            <div
              v-if="orderInfo.orderName"
              class="flex justify-between text-sm"
            >
              <span class="text-muted-foreground">주문상품</span>
              <span>{{ orderInfo.orderName }}</span>
            </div>
            <div v-if="orderInfo.amount" class="flex justify-between text-sm">
              <span class="text-muted-foreground">결제금액</span>
              <span class="font-semibold text-primary">{{
                formatPrice(orderInfo.amount)
              }}</span>
            </div>
            <div
              v-if="orderInfo.paymentMethod"
              class="flex justify-between text-sm"
            >
              <span class="text-muted-foreground">결제수단</span>
              <span>{{
                getPaymentProviderLabel(orderInfo.paymentMethod)
              }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToOrderDetail" class="w-full">
              <Package class="w-4 h-4 mr-2" />
              주문 상세 보기
            </Button>
            <Button
              variant="outline"
              class="w-full font-medium"
              @click="goToHome"
            >
              쇼핑 계속하기
            </Button>
          </div>
        </div>

        <!-- 에러 상태 -->
        <div v-else-if="status === 'error'" class="text-center w-full">
          <div
            class="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6"
          >
            <XCircle class="w-12 h-12 text-primary" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제 실패</h2>
          <p class="text-muted-foreground mb-2 whitespace-pre-line">
            {{ errorMessage }}
          </p>

          <!-- 계좌 잔액 부족 에러 시 추가 안내 -->
          <p
            v-if="errorMessage.includes('잔액')"
            class="text-sm text-amber-600 dark:text-amber-400 mb-6"
          >
            💡 다른 결제 수단을 이용하시거나 잔액 충전 후 다시 시도해주세요.
          </p>
          <div v-else class="mb-6"></div>

          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToCart" class="w-full">
              장바구니로 돌아가기
            </Button>
            <Button
              variant="outline"
              class="w-full font-medium"
              @click="goToHome"
            >
              홈으로
            </Button>
          </div>
        </div>

        <!-- 재고 부족 상태 (소프트 락 실패 - PG 자동 환불됨) -->
        <div v-else-if="status === 'stock_shortage'" class="text-center w-full">
          <div
            class="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle class="w-12 h-12 text-amber-500" />
          </div>
          <h2 class="text-xl font-semibold mb-2">재고 부족으로 결제 취소</h2>
          <p class="text-muted-foreground mb-4">
            결제 처리 중 일부 상품의 재고가 부족하여 결제가 자동으로
            취소되었습니다.
          </p>
          <p class="text-sm text-primary mb-6">
            결제하신 금액은 자동으로 환불됩니다.
          </p>

          <!-- 재고 부족 상품 목록 -->
          <div
            v-if="shortageItems && shortageItems.length > 0"
            class="bg-muted/50 rounded-lg p-4 mb-6 text-left"
          >
            <h3 class="text-sm font-medium mb-3">재고 부족 상품</h3>
            <ul class="space-y-3">
              <li
                v-for="(item, index) in shortageItems"
                :key="index"
                class="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
              >
                <div class="flex-1">
                  <p class="font-medium">{{ item.productName }}</p>
                  <p
                    v-if="item.variantInfo"
                    class="text-xs text-muted-foreground"
                  >
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

          <!-- 재고 정보가 없을 때 (백엔드 응답 형식 차이) -->
          <div v-else class="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p class="text-sm text-muted-foreground">
              주문하신 상품의 재고가 부족하여 결제가 취소되었습니다.<br />
              장바구니에서 수량을 조정하거나 상품 페이지에서 다시 확인해주세요.
            </p>
          </div>

          <div class="flex flex-col gap-3 w-full">
            <Button @click="goToCart" class="w-full">
              장바구니에서 수량 조정하기
            </Button>
            <Button
              variant="outline"
              class="w-full font-medium"
              @click="goToHome"
            >
              쇼핑 계속하기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
