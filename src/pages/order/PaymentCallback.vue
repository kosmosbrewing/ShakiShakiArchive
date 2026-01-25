<script setup lang="ts">
// src/pages/order/PaymentCallback.vue
// 결제 완료/실패 콜백 페이지

import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { CheckCircle, XCircle, AlertTriangle, Ban } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatters";
import { confirmPayment, StockShortageError } from "@/lib/api";
import { LoadingSpinner } from "@/components/common";
import type { StockShortageItem } from "@/types/api";
import { ORDER_MESSAGES, CART_MESSAGES, ERROR_MESSAGES } from "@/lib/messages";

const router = useRouter();
const route = useRoute();

// 🔒 결제 승인 페이지 진입 즉시 플래그 설정 (Order.vue cleanup 충돌 방지)
// onMounted보다 먼저 실행되도록 컴포넌트 최상단에 배치
localStorage.setItem("payment_confirming", "true");
console.log("[PaymentCallback] 결제 승인 플래그 설정 (즉시)");

// 🔒 bfcache 복원 감지 및 새로고침 (모바일 브라우저 캐시 문제 방지)
// 뒤로 가기/앞으로 가기로 이 페이지가 복원되면 이전 결제 정보가 남아있을 수 있음
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    // bfcache에서 복원된 경우 (persisted === true)
    if (event.persisted) {
      console.log("[PaymentCallback] bfcache에서 복원됨 - 페이지 새로고침");
      window.location.reload();
    }
  });
}

// 상태: stock_shortage 추가 (재고 부족 에러), cancelled 추가 (결제 취소)
const status = ref<
  "loading" | "success" | "error" | "cancelled" | "stock_shortage"
>("loading");
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

// 모바일 환경 감지
const isMobile = computed(() => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
});

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
          }),
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
  // 네이버페이 백엔드 리다이렉트 파라미터
  const provider = route.query.provider as string;
  const externalOrderId = route.query.externalOrderId as string;
  const orderNameParam = route.query.orderName as string;
  const alreadyPaid = route.query.alreadyPaid as string;
  const errorCode = route.query.code as string; // INSUFFICIENT_STOCK 등

  // orderId가 URL에 없으면 localStorage에서 가져오기 (네이버페이 취소 시 백업)
  if (!orderId && isPopup.value) {
    const savedOrderId = localStorage.getItem("naverpay_current_order");
    if (savedOrderId) {
      orderId = savedOrderId;
      console.log(
        "[PaymentCallback] URL에 orderId 없음, localStorage에서 복원:",
        orderId,
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

  // 🔒 중복 결제 처리 방지: 이미 처리된 orderId인지 확인
  // 모바일 bfcache 또는 새로고침으로 인한 중복 confirmPayment 호출 방지
  if (orderId && paymentKey) {
    const processedKey = `payment_processed_${orderId}`;
    if (localStorage.getItem(processedKey)) {
      console.log(
        "[PaymentCallback] 이미 처리된 결제 - 주문 목록으로 이동:",
        orderId,
      );
      localStorage.removeItem("payment_confirming");
      // 이미 처리된 결제는 주문 목록으로 이동
      if (isMobile.value) {
        window.location.replace("/orderlist");
      } else {
        router.replace("/orderlist");
      }
      return;
    }
  }

  // 네이버페이 실패/취소 경로 (/checkout/fail)
  if (route.path === "/checkout/fail") {
    console.log("[PaymentCallback] 네이버페이 결제 실패/취소");
    console.log("[PaymentCallback] orderId:", orderId);
    console.log("[PaymentCallback] message:", message);
    console.log("[PaymentCallback] errorCode:", errorCode);

    // 재고 부족 에러 처리 (code=INSUFFICIENT_STOCK)
    if (errorCode === "INSUFFICIENT_STOCK") {
      status.value = "stock_shortage";
      errorMessage.value = message || CART_MESSAGES.insufficientStock;
    } else {
      status.value = "error";
      // 에러 메시지 정제 (cleanErrorMessage 함수 재사용)
      errorMessage.value = cleanErrorMessage(
        message || ORDER_MESSAGES.paymentCancelled,
      );
    }

    // 팝업 창인 경우: localStorage로 부모 창에 에러 메시지 전달 후 닫기
    if (isPopup.value) {
      console.log(
        "[PaymentCallback] /checkout/fail - 팝업 닫기, orderId:",
        orderId,
      );
      console.log("[PaymentCallback] 에러 메시지:", errorMessage.value);
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type:
            errorCode === "INSUFFICIENT_STOCK"
              ? "STOCK_SHORTAGE"
              : "PAYMENT_ERROR",
          orderId: orderId,
          message: errorMessage.value,
          timestamp: Date.now(),
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 팝업이 아닌 경우 (모바일 리다이렉트): 에러 화면 표시
    // 백엔드에서 이미 주문 취소 처리됨 (별도 취소 API 호출 불필요)
    localStorage.removeItem("payment_confirming");
    return;
  }

  // 네이버페이 백엔드 리다이렉트 처리 (/checkout/success with provider=naverpay)
  // 백엔드에서 결제 승인 완료 후 프론트엔드로 리다이렉트하는 경우
  if (route.path === "/checkout/success" && provider === "naverpay") {
    console.log("[PaymentCallback] 네이버페이 백엔드 리다이렉트 감지");
    console.log("[PaymentCallback] 파라미터:", {
      orderId,
      externalOrderId,
      amount,
      alreadyPaid,
    });

    // 🔒 중복 결제 처리 방지 (alreadyPaid=true)
    if (alreadyPaid === "true") {
      console.log("[PaymentCallback] 이미 결제된 주문 - 주문 목록으로 이동");
      localStorage.removeItem("payment_confirming");
      if (isMobile.value) {
        window.location.replace("/orderlist");
      } else {
        router.replace("/orderlist");
      }
      return;
    }

    // 결제 승인 플래그 제거
    localStorage.removeItem("payment_confirming");

    status.value = "success";
    orderInfo.value = {
      orderId: orderId,
      externalOrderId: externalOrderId,
      orderName: orderNameParam
        ? decodeURIComponent(orderNameParam)
        : undefined,
      amount: amount ? Number(amount) : undefined,
      paymentMethod: "naverpay",
    };

    // 팝업인 경우: localStorage로 부모 창에 결과 전달 후 닫기
    if (isPopup.value) {
      console.log("[PaymentCallback] 네이버페이 성공 - 팝업 닫기");
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_SUCCESS",
          orderId: orderId,
          timestamp: Date.now(),
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 모바일/일반: 주문 상세로 자동 이동
    setTimeout(() => {
      const targetUrl = orderId ? `/orderdetail/${orderId}` : "/orderlist";
      console.log(
        "[PaymentCallback] 네이버페이 성공 - 주문 상세로 이동:",
        targetUrl,
      );
      if (isMobile.value) {
        window.location.replace(targetUrl);
      } else {
        router.replace(targetUrl);
      }
    }, 2000);
    return;
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

      // 결제 승인 완료 - 플래그 제거 및 처리 완료 표시
      localStorage.removeItem("payment_confirming");
      // 🔒 중복 처리 방지: 이 orderId는 이미 처리됨을 표시 (5분간 유지)
      const processedKey = `payment_processed_${orderId}`;
      localStorage.setItem(processedKey, Date.now().toString());
      // 5분 후 자동 삭제 (메모리 정리)
      setTimeout(() => localStorage.removeItem(processedKey), 5 * 60 * 1000);
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
          const targetUrl = confirmResult.order?.id
            ? `/orderdetail/${confirmResult.order.id}`
            : "/orderlist";

          // 모바일 리다이렉트: 히스토리 완전 대체
          if (isMobile.value && !isPopup.value) {
            window.location.replace(targetUrl);
          } else {
            // PC 또는 팝업: Vue Router 사용 (부드러운 전환)
            router.replace(targetUrl);
          }
        }, 2000); // 2초 대기 (사용자가 결제 성공 메시지 확인)
        return;
      } else {
        throw new Error(ORDER_MESSAGES.paymentApprovalFailed);
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
        // 백엔드 메시지를 정제하여 사용자 친화적으로 표시
        const rawMessage =
          err.message || ORDER_MESSAGES.paymentError;
        errorMessage.value = cleanErrorMessage(rawMessage);
        console.log("[PaymentCallback] 원본 에러 메시지:", rawMessage);
        console.log(
          "[PaymentCallback] 정제된 에러 메시지:",
          errorMessage.value,
        );
      }
    }
  } else if (result === "success") {
    // 기타 결제 성공 (네이버페이는 위에서 처리됨, 향후 다른 PG 추가 시 사용)
    console.log("[PaymentCallback] 기타 결제 성공 처리");

    status.value = "success";
    orderInfo.value = {
      orderId: orderId,
      externalOrderId: externalOrderId,
      orderName: orderNameParam
        ? decodeURIComponent(orderNameParam)
        : undefined,
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
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 결제 승인 플래그 제거
    localStorage.removeItem("payment_confirming");

    // 주문 상세로 자동 이동
    setTimeout(() => {
      const targetUrl = orderId ? `/orderdetail/${orderId}` : "/orderlist";
      if (isMobile.value) {
        window.location.replace(targetUrl);
      } else {
        router.replace(targetUrl);
      }
    }, 2000);
    return;
  } else if (result === "fail" || error) {
    // 결제 실패 (토스페이먼츠 등)
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
          orderId: orderId,
          message: errorMessage.value,
          timestamp: Date.now(),
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 플래그 제거 (팝업이 아닌 경우)
    localStorage.removeItem("payment_confirming");
  } else if (error === "user_cancel" || result === "cancel") {
    // 결제 취소
    console.log("[PaymentCallback] 결제 취소, orderId:", orderId);
    status.value = "cancelled";
    errorMessage.value = ORDER_MESSAGES.paymentCancelled;

    // 팝업 창인 경우: localStorage로 부모 창에 취소 전달 후 닫기
    if (isPopup.value) {
      console.log("[PaymentCallback] 결제 취소 - 팝업 닫기, orderId:", orderId);
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_CANCEL",
          orderId: orderId,
          timestamp: Date.now(),
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 플래그 제거 (팝업이 아닌 경우)
    localStorage.removeItem("payment_confirming");
  } else {
    // 잘못된 접근 또는 예상하지 못한 파라미터
    console.warn("[PaymentCallback] 예상하지 못한 접근:", route.query);
    console.log("[PaymentCallback] orderId:", orderId);
    status.value = "error";
    errorMessage.value = ERROR_MESSAGES.invalidAccess;

    // 팝업 창인 경우: 에러 전달 후 닫기
    if (isPopup.value) {
      console.log(
        "[PaymentCallback] 잘못된 접근 - 팝업 닫기, orderId:",
        orderId,
      );
      localStorage.setItem(
        "naverpay_result",
        JSON.stringify({
          type: "PAYMENT_ERROR",
          orderId: orderId,
          message: errorMessage.value,
          timestamp: Date.now(),
        }),
      );
      localStorage.removeItem("naverpay_popup");
      window.close();
      return;
    }

    // 플래그 제거 (팝업이 아닌 경우)
    localStorage.removeItem("payment_confirming");
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
      return ORDER_MESSAGES.paymentCancelled;
    case "payment_failed":
      return ORDER_MESSAGES.paymentFailed;
    case "invalid_amount":
      return ORDER_MESSAGES.invalidPaymentInfo;
    case "timeout":
      return ORDER_MESSAGES.paymentTimeout;
    default:
      return ORDER_MESSAGES.paymentError;
  }
}

// 에러 메시지 정제 함수 (토스페이먼츠 및 기타 PG사용)
function cleanErrorMessage(message: string): string {
  if (!message) return ORDER_MESSAGES.paymentError;

  let cleanMessage = message;

  // 특정 패턴 감지 및 메시지 정제
  if (cleanMessage.includes("잔고") || cleanMessage.includes("잔액")) {
    cleanMessage = ORDER_MESSAGES.insufficientBalance;
  } else if (cleanMessage.includes("한도")) {
    cleanMessage = ORDER_MESSAGES.cardLimitExceeded;
  } else if (cleanMessage.includes("본인") && cleanMessage.includes("인증")) {
    cleanMessage = ORDER_MESSAGES.authenticationFailed;
  } else if (
    cleanMessage.includes("비밀번호") ||
    cleanMessage.includes("인증")
  ) {
    cleanMessage = ORDER_MESSAGES.verificationFailed;
  } else if (cleanMessage.includes("시간") || cleanMessage.includes("만료")) {
    cleanMessage = ORDER_MESSAGES.paymentExpired;
  } else if (cleanMessage.includes("점검")) {
    if (cleanMessage.includes("은행")) {
      cleanMessage = ORDER_MESSAGES.bankMaintenance;
    } else if (
      cleanMessage.includes("원천사") ||
      cleanMessage.includes("시스템")
    ) {
      cleanMessage = ORDER_MESSAGES.systemMaintenance;
    } else {
      cleanMessage = ORDER_MESSAGES.serviceMaintenance;
    }
  } else if (
    cleanMessage.includes("이미") &&
    (cleanMessage.includes("진행") || cleanMessage.includes("완료"))
  ) {
    cleanMessage = ORDER_MESSAGES.alreadyProcessed;
  } else if (cleanMessage.includes("취소된 주문")) {
    cleanMessage = ORDER_MESSAGES.cancelledOrder;
  } else if (
    cleanMessage.includes("네트워크") ||
    cleanMessage.includes("연결")
  ) {
    cleanMessage = ORDER_MESSAGES.networkUnstable;
  } else if (cleanMessage.includes("카드") && cleanMessage.includes("사용")) {
    cleanMessage = ORDER_MESSAGES.cardUnavailable;
  } else if (cleanMessage.length > 50) {
    // 50자 이상의 긴 메시지는 간단하게 정리
    cleanMessage = ORDER_MESSAGES.paymentErrorRetry;
  }

  return cleanMessage;
}

// 주문 상세로 이동
const goToOrderDetail = () => {
  const targetUrl = orderInfo.value.orderId
    ? `/orderdetail/${orderInfo.value.orderId}`
    : "/orderlist";

  // 모바일: 히스토리 완전 대체
  if (isMobile.value && !isPopup.value) {
    window.location.replace(targetUrl);
  } else {
    router.push(targetUrl); // PC는 push 유지 (뒤로 가기 허용)
  }
};

// 홈으로 이동
const goToHome = () => {
  const targetUrl = "/";

  if (isMobile.value && !isPopup.value) {
    window.location.replace(targetUrl);
  } else {
    router.push(targetUrl);
  }
};

// 다시 주문하기
const goToCart = () => {
  const targetUrl = "/cart";

  if (isMobile.value && !isPopup.value) {
    window.location.replace(targetUrl);
  } else {
    router.push(targetUrl);
  }
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
            class="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-6"
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

        <!-- 취소 상태 -->
        <div v-else-if="status === 'cancelled'" class="text-center w-full">
          <div
            class="w-20 h-20 rounded-full bg-muted/50 dark:bg-muted/30 flex items-center justify-center mx-auto mb-6"
          >
            <Ban class="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제가 취소되었습니다</h2>
          <p class="text-muted-foreground mb-6">
            결제를 진행하지 않으셨습니다.<br />
            장바구니에서 다시 주문하실 수 있습니다.
          </p>

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

        <!-- 에러 상태 -->
        <div v-else-if="status === 'error'" class="text-center w-full">
          <div
            class="w-20 h-20 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center mx-auto mb-6"
          >
            <XCircle class="w-12 h-12 text-destructive" />
          </div>
          <h2 class="text-xl font-semibold mb-2">결제 실패</h2>
          <p class="text-muted-foreground mb-2 whitespace-pre-line">
            {{ errorMessage }}
          </p>

          <!-- 계좌 잔액 부족 에러 시 추가 안내 -->
          <p
            v-if="errorMessage.includes('잔액')"
            class="text-sm text-amber-600 dark:text-amber-400 mb-6 whitespace-pre-line"
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
          <p class="text-muted-foreground mb-4 whitespace-pre-line">
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
            <p class="text-sm text-muted-foreground whitespace-pre-line">
              주문하신 상품의 재고가 부족하여 결제가 취소되었습니다.
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
