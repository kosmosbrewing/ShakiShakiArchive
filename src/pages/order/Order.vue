<script setup lang="ts">
// src/pages/Order.vue
// 주문/결제 페이지

import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import { useRouter } from "vue-router";

// Production 환경 체크
const isProduction = computed(() => import.meta.env.MODE === "production");
import { useAuthStore } from "@/stores/auth";
import { useOrderItems } from "@/composables/useOrderItems";
import { useAddresses, useShippingForm } from "@/composables/useAddresses";
import { useCreateOrder } from "@/composables/useOrders";
import { useStockReservation } from "@/composables/useStockReservation";
import { useAlert } from "@/composables/useAlert";
import { formatPrice } from "@/lib/formatters";
import {
  createDeliveryAddress,
  getPaymentClientKey,
  getNaverPaySdkConfig,
  deleteOrder,
} from "@/lib/api";
import { initNaverPay } from "@/services/payment";

// 공통 컴포넌트
import {
  LoadingSpinner,
  AddressCard,
  AddressForm,
  AddressSearchModal,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import type {
  DeliveryAddress,
  User,
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/types/api";
import {
  isValidPhone,
  isValidZipCode,
  isNonEmptyString,
  isValidPrice,
  isValidQuantity,
  validateOrderAmount,
} from "@/lib/validators";

// [이미지 Import]
import tossLogo from "@/assets/tossSymbol.png";
import naverLogo from "@/assets/naverSymbol.svg";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

// Composables - 주문 상품 관리
const {
  items: orderItems,
  subtotal: orderSubtotal,
  shippingFee: orderShippingFee,
  totalAmount: orderTotalAmount,
  orderName,
  loadOrderItems,
  clearDirectPurchase,
  getDirectPurchasePayload,
} = useOrderItems();
const { addresses, loadAddresses } = useAddresses();
const shippingForm = useShippingForm();
const { submitOrder } = useCreateOrder();
const {
  reservationId,
  isReserved,
  isLoading: isReserving,
  remainingTimeFormatted,
  reserve: reserveStock,
  release: releaseStock,
  reset: resetReservation,
} = useStockReservation();

// 상태
const loading = ref(false);
const isPaymentProcessing = ref(false); // 주문 생성 중 (전체 화면 로딩)
const isPaymentPopupOpen = ref(false); // 결제 팝업 열림 상태 (버튼 비활성화용)
const currentOrderId = ref<string | null>(null); // 현재 처리 중인 주문 ID (결제 취소 시 주문 취소용)
const isProcessingPaymentResult = ref(false); // 결제 결과 처리 중 플래그 (중복 호출 방지)

// 네이버페이 팝업 체크 인터벌
let popupCheckInterval: ReturnType<typeof setInterval> | null = null;

// 모바일 환경 감지 (모바일에서는 리다이렉트 방식 사용)
const isMobile = computed(() => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
});
const isAddressModalOpen = ref(false);
const isAddressSearchOpen = ref(false);
const deliveryMode = ref<"new" | "member" | "saved">("new");
const paymentProvider = ref<"toss" | "naverpay">("toss");

// 유효성 검사 상태
const showValidationAlert = ref(false);
const validationMessage = ref("");

// AddressForm ref
const addressFormRef = ref<InstanceType<typeof AddressForm> | null>(null);

// [결제 수단 옵션] icon에 import한 이미지 변수 할당
const paymentMethods = [
  { label: "토스페이", value: "toss", icon: tossLogo },
  { label: "네이버페이", value: "naverpay", icon: naverLogo },
];

// 배송지 모드 변경 감시
watch(deliveryMode, (newMode) => {
  if (newMode === "member" && authStore.user) {
    shippingForm.fillFromUser(authStore.user as User);
    shippingForm.form.saveDefault = true;
  } else if (newMode === "new") {
    shippingForm.clearForm();
  } else if (newMode === "saved") {
    const defaultAddr =
      addresses.value.find((a) => a.isDefault) || addresses.value[0];
    if (defaultAddr) shippingForm.fillFromAddress(defaultAddr);
  }
});

// 데이터 로드
const loadData = async () => {
  loading.value = true;
  try {
    // 사용자 정보 로드
    if (authStore.isAuthenticated && !authStore.user) {
      await authStore.loadUser();
    }

    // 주문 상품 로드 (바로 구매 / 장바구니 자동 분기)
    const success = await loadOrderItems();
    if (!success) return;

    // 배송지 로드
    await loadAddresses();

    // 기본 배송지 설정
    const defaultAddr = addresses.value.find((a) => a.isDefault);
    if (defaultAddr) {
      deliveryMode.value = "saved";
      shippingForm.fillFromAddress(defaultAddr);
    } else if (authStore.user) {
      deliveryMode.value = "member";
      shippingForm.fillFromUser(authStore.user as User);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const selectAddressFromModal = (addr: DeliveryAddress) => {
  deliveryMode.value = "saved";
  shippingForm.fillFromAddress(addr);
  isAddressModalOpen.value = false;
};

// 주소 검색 모달 열기
const openAddressSearch = () => {
  isAddressSearchOpen.value = true;
};

// 주소 선택 핸들러
const handleAddressSelect = (address: {
  zonecode: string;
  address: string;
}) => {
  shippingForm.form.zipCode = address.zonecode;
  shippingForm.form.address = address.address;
  shippingForm.form.detailAddress = ""; // 상세 주소 초기화
};

// 유효성 검사 및 Alert 표시 헬퍼
const showValidationError = (
  message: string,
  focusField?: "recipient" | "phone" | "address" | "detailAddress"
) => {
  validationMessage.value = message;
  showValidationAlert.value = true;
  if (focusField) {
    // Alert가 닫힌 후 해당 필드에 focus
    setTimeout(() => {
      addressFormRef.value?.focusField(focusField);
    }, 100);
  }
};

// 결제 처리 핸들러
const handlePayment = async () => {
  // 1. 주문 상품 유효성 검사
  if (orderItems.value.length === 0) {
    showValidationError("주문할 상품이 없습니다.");
    return;
  }

  // 2. 주문 상품 데이터 무결성 검사 (가격, 수량)
  for (const item of orderItems.value) {
    if (!isValidPrice(item.product.price)) {
      showValidationError("상품 가격 정보가 올바르지 않습니다.");
      console.error("Invalid price:", item.product.price);
      return;
    }
    if (!isValidQuantity(item.quantity)) {
      showValidationError("상품 수량이 올바르지 않습니다.");
      console.error("Invalid quantity:", item.quantity);
      return;
    }
  }

  // 3. 금액 계산 무결성 검사
  const itemsForValidation = orderItems.value.map((item) => ({
    price: item.product.price,
    quantity: item.quantity,
  }));
  if (
    !validateOrderAmount(
      itemsForValidation,
      orderTotalAmount.value,
      orderShippingFee.value
    )
  ) {
    showValidationError(
      "주문 금액 계산에 오류가 있습니다. 새로고침 후 다시 시도해주세요."
    );
    console.error("Order amount mismatch");
    return;
  }

  // 4. 배송지 필수 항목 유효성 검사
  if (!isNonEmptyString(shippingForm.form.recipient)) {
    showValidationError("수령인을 입력해주세요.", "recipient");
    return;
  }

  // 5. 연락처 유효성 검사
  const fullPhone = shippingForm.fullPhone.value;
  if (!isValidPhone(fullPhone)) {
    showValidationError("올바른 연락처를 입력해주세요.", "phone");
    return;
  }

  // 6. 우편번호 유효성 검사
  if (!isValidZipCode(shippingForm.form.zipCode)) {
    showValidationError("주소를 검색해주세요.", "address");
    return;
  }

  // 7. 주소 유효성 검사
  if (!isNonEmptyString(shippingForm.form.address)) {
    showValidationError("주소를 검색해주세요.", "address");
    return;
  }

  // 8. 상세 주소 유효성 검사
  if (!isNonEmptyString(shippingForm.form.detailAddress)) {
    showValidationError("상세 주소를 입력해주세요.", "detailAddress");
    return;
  }

  const confirmed = await showConfirm(
    `${formatPrice(orderTotalAmount.value)}을\n결제하시겠습니까?`,
    {
      confirmText: "결제하기",
      cancelText: "취소",
    }
  );
  if (!confirmed) return;

  let orderData: CreateOrderResponse | null = null;

  try {
    // 1단계: 재고 선점 (임시 점유)
    isPaymentProcessing.value = true;

    console.log("[결제 프로세스] 1단계: 재고 선점 시작");
    const reservationResult = await reserveStock(
      orderItems.value,
      getDirectPurchasePayload()
    );

    if (!reservationResult) {
      console.error("[결제 프로세스] 재고 선점 실패");
      throw new Error(
        "방금 다른 고객님이 먼저 결제를 시작하셨어요. 잠시 후 다시 확인해 주세요!"
      );
    }

    console.log("[결제 프로세스] 재고 선점 성공:", reservationResult.reservationId);

    // 2단계: 주문 생성 (reservationId 포함)
    console.log("[결제 프로세스] 2단계: 주문 생성 시작");
    const orderParams: CreateOrderRequest = {
      shippingName: shippingForm.form.recipient,
      shippingPhone: shippingForm.fullPhone.value,
      shippingPostalCode: shippingForm.form.zipCode,
      shippingAddress: shippingForm.form.address,
      shippingDetailAddress: shippingForm.form.detailAddress,
      shippingRequestNote: shippingForm.finalRequestNote.value,
      paymentMethod: paymentProvider.value,
      directPurchaseItem: getDirectPurchasePayload(),
      reservationId: reservationResult.reservationId,
    };

    orderData = await submitOrder(orderParams);

    if (!orderData) {
      // 주문 생성 실패 시 재고 선점 해제
      console.error("[결제 프로세스] 주문 생성 실패, 재고 해제");
      await releaseStock();
      throw new Error("주문 생성 실패");
    }

    console.log("[결제 프로세스] 주문 생성 성공:", orderData.orderId);

    // 현재 주문 ID 저장 (결제 취소 시 주문 취소용)
    currentOrderId.value = orderData.orderId;

    // 3단계: 결제 진행
    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = true;

    if (paymentProvider.value === "toss") {
      await processTossPayment(orderData);
    } else if (paymentProvider.value === "naverpay") {
      await processNaverPayment(orderData);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    showAlert(`결제 요청 중 오류가 발생했습니다: ${errorMessage}`, {
      type: "error",
    });

    // 에러 발생 시 정리
    if (orderData?.orderId) {
      // 주문이 생성된 경우: 주문 삭제 (백엔드에서 재고 자동 복구)
      try {
        console.log("[결제 프로세스] 주문 삭제:", orderData.orderId);
        await deleteOrder(orderData.orderId);
        console.log("[결제 프로세스] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
      } catch (deleteError) {
        console.error("[결제 프로세스] 주문 삭제 실패:", deleteError);
      }
      currentOrderId.value = null;

      // 재고 선점 상태만 정리
      resetReservation();
      console.log("[결제 프로세스] 재고 선점 상태 정리 완료");
    } else if (reservationId.value) {
      // 주문 생성 전 에러: 재고 선점만 해제 (API 호출 필요)
      try {
        console.log("[결제 프로세스] 주문 생성 전 에러, 재고 선점 해제");
        await releaseStock();
        console.log("[결제 프로세스] 재고 선점 해제 완료");
      } catch (releaseError) {
        console.error("재고 해제 실패:", releaseError);
        // API 실패해도 클라이언트 상태는 정리
        resetReservation();
      }
    }

    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = false;
  }
};

// 토스페이먼츠 SDK 타입 선언
interface TossPaymentRequestParams {
  method: string;
  amount: { currency: string; value: number };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  windowTarget?: "iframe" | "self" | "_blank"; // 결제창 표시 방식
}

interface TossPaymentsInstance {
  payment: (options: { customerKey: string }) => {
    requestPayment: (params: TossPaymentRequestParams) => Promise<void>;
  };
}

interface TossPaymentsSDK {
  (clientKey: string): TossPaymentsInstance;
}

// [토스페이먼츠] 결제 로직 (PC: iframe 모달, 모바일: 리다이렉트)
const processTossPayment = async (orderData: CreateOrderResponse) => {
  try {
    // 1. 클라이언트 키 가져오기
    const { clientKey } = await getPaymentClientKey();

    // 2. 토스페이먼츠 SDK 초기화 (window 객체에서 가져옴)
    const TossPayments = (
      window as unknown as { TossPayments?: TossPaymentsSDK }
    ).TossPayments;
    if (!TossPayments) {
      throw new Error("토스페이먼츠 SDK가 로드되지 않았습니다.");
    }

    const tossPayments = TossPayments(clientKey);

    // 3. customerKey 생성 (회원: 유저ID, 비회원: 주문ID 기반)
    const customerKey = authStore.user?.id
      ? `user_${authStore.user.id}`
      : `guest_${orderData.orderId}`;

    // 4. 주문명 (useOrderItems에서 제공)

    // 5. 기본 배송지 저장 (결제 전에 저장)
    await saveDefaultAddressIfNeeded();

    // 6. 결제 요청 (모바일: 리다이렉트, PC: iframe 모달)
    const payment = tossPayments.payment({ customerKey });

    await payment.requestPayment({
      method: "CARD", // 카드 결제 (토스페이 선택 시 다양한 결제수단 제공)
      amount: {
        currency: "KRW",
        value: orderTotalAmount.value,
      },
      orderId: orderData.externalOrderId, // PG사에서 사용할 주문번호 (SHAKI_... 형식)
      orderName: orderName.value,
      successUrl: `${window.location.origin}/payment/callback?result=success`,
      failUrl: `${window.location.origin}/payment/callback?result=fail`,
      customerEmail: authStore.user?.email || undefined,
      customerName: shippingForm.form.recipient,
      customerMobilePhone: shippingForm.fullPhone.value.replace(/-/g, ""),
      // 모바일: 현재 창에서 리다이렉트, PC: iframe 모달
      windowTarget: isMobile.value ? "self" : "iframe",
    });
  } catch (err: unknown) {
    console.error("[토스페이] 결제 오류 (상세):", err);
    console.error("[토스페이] 에러 타입:", (err as any)?.constructor?.name);
    console.error("[토스페이] 에러 코드:", (err as any)?.code);
    console.error("[토스페이] 에러 메시지:", (err as any)?.message);
    isPaymentPopupOpen.value = false;

    // 중요: 토스페이먼츠 iframe 결제창에서 결제 완료 시 콜백 URL로 리다이렉트되면서
    // iframe이 닫히는데, 이것이 에러로 감지됩니다.
    // 따라서 여기서 주문을 삭제하면 안 됩니다!
    // 대신 watcher에서 일정 시간 후 처리합니다.

    const errorWithCode = err as { code?: string; message?: string };

    // 재고 선점 상태만 정리 (백엔드에서 이미 복구했으므로 API 호출 불필요)
    resetReservation();
    console.log("[토스페이] 재고 선점 상태 정리 완료");

    // 사용자가 결제 취소한 경우는 별도 처리
    if (errorWithCode.code === "USER_CANCEL") {
      console.log("[토스페이] 사용자 취소로 처리");
      showAlert("결제가 취소되었습니다.");
    } else {
      // iframe이 닫힌 경우는 정상 결제 진행일 수 있으므로 에러 메시지 표시하지 않음
      console.log("[토스페이] 결제창이 닫혔습니다 - watcher에서 처리 예정");
    }

    // 상태 복구
    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = false;
  }
};

// [네이버페이] 결제 로직 (PC: 팝업 방식, 모바일: 리다이렉트 방식)
const processNaverPayment = async (orderData: CreateOrderResponse) => {
  try {
    // 1. 네이버페이 SDK 설정 가져오기
    const sdkConfig = await getNaverPaySdkConfig();

    // 2. 모바일 환경에서는 리다이렉트(page), PC에서는 팝업(popup) 방식
    const openType = isMobile.value ? "page" : "popup";

    // 3. 네이버페이 SDK 초기화
    const naverPay = initNaverPay(
      sdkConfig.clientId,
      sdkConfig.chainId,
      sdkConfig.mode,
      sdkConfig.payType,
      openType
    );

    if (!naverPay) {
      throw new Error("네이버페이 SDK가 로드되지 않았습니다.");
    }

    // 4. 주문명 (useOrderItems에서 제공, 128자 이내)

    // 5. 상품 수량 계산
    const productCount = orderItems.value.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // 6. 상품 정보 배열 생성 (필수)
    const productItems = orderItems.value.map((item) => ({
      categoryType: "PRODUCT", // 영대문자만 허용 (PRODUCT, ETC, BOOK 등)
      categoryId: "GENERAL", // 영대문자, 언더스코어 허용
      uid: item.product.id,
      name: item.product.name,
      count: item.quantity,
    }));

    // 7. 사용자 식별키 생성 (암호화 권장)
    const merchantUserKey = authStore.user?.id
      ? `user_${authStore.user.id}`
      : `guest_${orderData.orderId}`;

    // 8. 기본 배송지 저장 (결제 전에 저장)
    await saveDefaultAddressIfNeeded();

    // 9. PC 팝업 방식: localStorage로 팝업 여부 표시 (PaymentCallback에서 확인)
    if (!isMobile.value) {
      localStorage.setItem("naverpay_popup", "true");
      // 현재 주문 ID를 localStorage에 저장 (취소 시 백업용)
      localStorage.setItem("naverpay_current_order", orderData.orderId);
    }

    // 10. 네이버페이 결제창 호출
    const naverPayParams = {
      merchantPayKey: orderData.externalOrderId, // 가맹점 주문번호
      merchantUserKey: merchantUserKey, // 사용자 식별키
      productName: orderName.value,
      productCount: productCount,
      totalPayAmount: orderTotalAmount.value,
      taxScopeAmount: orderTotalAmount.value, // 전체 금액을 과세 대상으로
      taxExScopeAmount: 0, // 면세 대상 금액 없음
      returnUrl: `${sdkConfig.returnUrl}?orderId=${orderData.orderId}`,
      productItems: productItems,
    };

    // 🔍 디버깅: SDK 설정 및 파라미터 로깅
    console.log("=== 네이버페이 SDK 디버깅 ===");
    console.log("1. SDK Config:", {
      clientId: sdkConfig.clientId?.substring(0, 8) + "...",
      chainId: sdkConfig.chainId,
      mode: sdkConfig.mode,
      payType: sdkConfig.payType,
    });
    console.log("2. Pay Reserve Params:", naverPayParams);
    console.log("3. Product Items:", productItems);
    console.log("============================");

    naverPay.open(naverPayParams);

    // PC 팝업 방식: focus 이벤트 및 localStorage로 결제 결과 수신
    if (!isMobile.value) {

      // 팝업 강제 종료 처리 함수 (먼저 정의)
      const handlePopupForceClosed = async () => {
        console.log("[네이버페이] 팝업 강제 종료 처리 시작");

        // 주문 삭제 및 정리
        if (currentOrderId.value) {
          try {
            console.log("[팝업 강제 종료] 주문 삭제:", currentOrderId.value);
            await deleteOrder(currentOrderId.value);
            console.log("[팝업 강제 종료] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
          } catch (deleteError) {
            console.error("[팝업 강제 종료] 주문 삭제 실패:", deleteError);
          }
          currentOrderId.value = null;
        }

        // 재고 선점 상태 정리
        resetReservation();
        console.log("[팝업 강제 종료] 재고 선점 상태 정리 완료");

        // 팝업 상태 종료 및 Alert
        isPaymentPopupOpen.value = false;
        isPaymentProcessing.value = false;
        showAlert("결제가 취소되었습니다.");

        // localStorage 정리
        localStorage.removeItem("naverpay_popup");
        localStorage.removeItem("naverpay_current_order");
      };

      // localStorage 주기적 체크 (storage/focus 이벤트 보완)
      let pollCount = 0;
      const maxPolls = 1200; // 10분 (500ms * 1200)
      let popupClosedDetected = false;

      popupCheckInterval = setInterval(async () => {
        pollCount++;

        const popupFlag = localStorage.getItem("naverpay_popup");
        const resultStr = localStorage.getItem("naverpay_result");

        if (resultStr) {
          // 결과가 있으면 즉시 처리
          clearInterval(popupCheckInterval!);
          popupCheckInterval = null;
          await handleNaverPayResult(resultStr);
        } else if (!popupFlag && isPaymentPopupOpen.value) {
          // 팝업 플래그가 없어졌는데 결과도 없는 경우
          if (!popupClosedDetected) {
            popupClosedDetected = true;
          } else {
            // 2번째 체크에서도 결과 없음 = 강제 종료
            clearInterval(popupCheckInterval!);
            popupCheckInterval = null;
            await handlePopupForceClosed();
          }
        } else if (pollCount >= maxPolls) {
          // 타임아웃 (10분)
          clearInterval(popupCheckInterval!);
          popupCheckInterval = null;
          if (isPaymentPopupOpen.value) {
            isPaymentPopupOpen.value = false;
            isPaymentProcessing.value = false;
          }
        }
      }, 500);

      // 결과 처리 함수
      const handleNaverPayResult = async (resultStr: string) => {
        try {
          const result = JSON.parse(resultStr);
          const { type, orderId, message } = result;
          console.log("[네이버페이] 결제 결과 수신:", { type, orderId });

          // 중복 처리 방지
          isProcessingPaymentResult.value = true;

          // watcher 타이머 취소 (중복 호출 방지)
          if (paymentTimeoutId) {
            clearTimeout(paymentTimeoutId);
            paymentTimeoutId = null;
          }

          // 팝업 체크 인터벌 정리
          if (popupCheckInterval) {
            clearInterval(popupCheckInterval);
            popupCheckInterval = null;
          }

          // 결과 처리 후 localStorage 정리
          localStorage.removeItem("naverpay_result");
          localStorage.removeItem("naverpay_popup");
          localStorage.removeItem("naverpay_current_order");

          if (type === "PAYMENT_SUCCESS") {
            // 결제 성공: 팝업 닫히고 전체 화면 로딩 표시
            isPaymentPopupOpen.value = false;
            isPaymentProcessing.value = true;

            // 재고 선점 상태 정리
            resetReservation();
            clearDirectPurchase();
            currentOrderId.value = null; // 주문 ID 초기화

            // 주문 상세 페이지로 이동 (replace로 히스토리 쌓이지 않게)
            router.replace(`/orderdetail/${orderId}`);
          } else if (type === "PAYMENT_ERROR") {
            // 결제 실패: 주문 삭제
            isPaymentPopupOpen.value = false;

            if (orderId) {
              try {
                console.log("[네이버페이] 주문 삭제 (실패):", orderId);
                await deleteOrder(orderId);
                console.log("[네이버페이] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
              } catch (deleteError) {
                console.error("[네이버페이] 주문 삭제 실패:", deleteError);
              }
            } else {
              console.warn("[네이버페이] orderId가 없어서 주문을 삭제할 수 없습니다.");
            }
            currentOrderId.value = null; // 주문 ID 초기화

            // 재고 선점 상태만 정리 (백엔드에서 이미 복구했으므로 API 호출 불필요)
            resetReservation();
            console.log("[네이버페이] 재고 선점 상태 정리 완료");

            showAlert(message || "결제 처리 중 오류가 발생했습니다.", {
              type: "error",
            });
          } else if (type === "PAYMENT_CANCEL") {
            // 결제 취소: 주문 삭제
            isPaymentPopupOpen.value = false;

            if (orderId) {
              try {
                console.log("[네이버페이] 주문 삭제 (취소):", orderId);
                await deleteOrder(orderId);
                console.log("[네이버페이] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
              } catch (deleteError) {
                console.error("[네이버페이] 주문 삭제 실패:", deleteError);
              }
            } else {
              console.warn("[네이버페이] orderId가 없어서 주문을 삭제할 수 없습니다.");
            }
            currentOrderId.value = null; // 주문 ID 초기화

            // 재고 선점 상태만 정리 (백엔드에서 이미 복구했으므로 API 호출 불필요)
            resetReservation();
            showAlert("결제가 취소되었습니다.");
          }

          // 처리 완료 후 플래그 리셋
          setTimeout(() => {
            isProcessingPaymentResult.value = false;
          }, 1000);
        } catch (e) {
          console.error("네이버페이 결과 파싱 오류:", e);
          isPaymentPopupOpen.value = false;
          isProcessingPaymentResult.value = false;
        }
      };

      // focus 이벤트 핸들러 (팝업 닫힘 감지)
      let focusCheckTimeout: ReturnType<typeof setTimeout> | null = null;
      let focusCount = 0; // focus 이벤트 발생 횟수

      const handleWindowFocus = () => {
        focusCount++;

        // focus 이벤트 후 잠시 대기 (500ms) - 팝업이 완전히 닫힐 시간 확보
        if (focusCheckTimeout) clearTimeout(focusCheckTimeout);
        focusCheckTimeout = setTimeout(async () => {
          if (!isPaymentPopupOpen.value) {
            return;
          }

          const resultStr = localStorage.getItem("naverpay_result");
          const popupFlag = localStorage.getItem("naverpay_popup");

          if (resultStr) {
            // 결과가 있으면 정상 처리
            window.removeEventListener("focus", handleWindowFocus);
            if (popupCheckInterval) {
              clearInterval(popupCheckInterval);
              popupCheckInterval = null;
            }
            await handleNaverPayResult(resultStr);
          } else if (!popupFlag) {
            // 플래그가 없고 결과도 없으면 강제 종료
            window.removeEventListener("focus", handleWindowFocus);
            if (popupCheckInterval) {
              clearInterval(popupCheckInterval);
              popupCheckInterval = null;
            }
            await handlePopupForceClosed();
          } else if (focusCount >= 2) {
            // 2번째 focus인데도 결과가 없으면 강제 종료
            // (사용자가 팝업 내에서 클릭하면 focus가 여러 번 발생할 수 있음)
            window.removeEventListener("focus", handleWindowFocus);
            if (popupCheckInterval) {
              clearInterval(popupCheckInterval);
              popupCheckInterval = null;
            }
            await handlePopupForceClosed();
          } else {
            // 첫 focus이고 플래그가 있으면 1초 더 대기
            setTimeout(async () => {
              const resultStr2 = localStorage.getItem("naverpay_result");
              if (!resultStr2 && isPaymentPopupOpen.value) {
                window.removeEventListener("focus", handleWindowFocus);
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                  popupCheckInterval = null;
                }
                await handlePopupForceClosed();
              }
            }, 1000);
          }
        }, 500);
      };

      // storage 이벤트 핸들러 (다른 창에서 localStorage 변경 시)
      const handleStorageChange = async (event: StorageEvent) => {
        if (event.key !== "naverpay_result" || !event.newValue) return;

        console.log("[네이버페이] storage 이벤트로 결과 수신");
        window.removeEventListener("focus", handleWindowFocus);
        await handleNaverPayResult(event.newValue);
      };

      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("storage", handleStorageChange);
    }
    // 모바일은 리다이렉트되므로 별도 처리 불필요
  } catch (err: unknown) {
    console.error("네이버페이 결제 오류", err);
    isPaymentPopupOpen.value = false;

    // 팝업 체크 인터벌 정리
    if (popupCheckInterval) {
      clearInterval(popupCheckInterval);
      popupCheckInterval = null;
    }

    // localStorage 정리
    localStorage.removeItem("naverpay_current_order");

    // 에러 발생 시 주문 삭제
    if (orderData.orderId) {
      try {
        console.log("[네이버페이] 주문 삭제 (오류):", orderData.orderId);
        await deleteOrder(orderData.orderId);
        console.log("[네이버페이] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
      } catch (deleteError) {
        console.error("[네이버페이] 주문 삭제 실패:", deleteError);
      }
    }
    currentOrderId.value = null; // 주문 ID 초기화

    // 재고 선점 상태만 정리 (백엔드에서 이미 복구했으므로 API 호출 불필요)
    resetReservation();
    console.log("[네이버페이] 재고 선점 상태 정리 완료");

    const errorMessage =
      err instanceof Error
        ? err.message
        : "네이버페이 결제 호출에 실패했습니다.";
    showAlert(`결제 요청 중 오류가 발생했습니다: ${errorMessage}`, {
      type: "error",
    });

    // 이미 처리했으므로 외부 catch로 throw하지 않음
    // 상태 복구
    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = false;
  }
};

// 기본 배송지 저장 헬퍼 함수
const saveDefaultAddressIfNeeded = async () => {
  if (shippingForm.form.saveDefault && deliveryMode.value !== "saved") {
    try {
      await createDeliveryAddress({
        recipient: shippingForm.form.recipient,
        phone: shippingForm.fullPhone.value,
        zipCode: shippingForm.form.zipCode,
        address: shippingForm.form.address,
        detailAddress: shippingForm.form.detailAddress,
        requestNote: shippingForm.finalRequestNote.value,
        isDefault: true,
      });
    } catch (e) {
      console.error("배송지 저장 실패 (결제는 성공함)", e);
    }
  }
};

// 페이지 이탈 시 정리 (브라우저 종료, 탭 닫기 등)
const handleBeforeUnload = () => {
  // 주문이 생성되었으면 삭제 (keepalive로 보장)
  if (currentOrderId.value) {
    console.log("[페이지 이탈] 주문 삭제 (비정상 종료):", currentOrderId.value);
    deleteOrder(currentOrderId.value, { keepalive: true }).catch(() => {});
  }
  // 재고 선점만 있으면 해제 (주문 생성 전)
  else if (reservationId.value && !isPaymentProcessing.value) {
    console.log("[페이지 이탈] 재고 선점 해제:", reservationId.value);
    releaseStock(0, { keepalive: true }).catch(() => {});
  }
};

// 뒤로가기/앞으로가기 감지
const handlePopState = () => {
  // 주문이 생성되었으면 삭제
  if (currentOrderId.value) {
    console.log("[뒤로가기] 주문 삭제:", currentOrderId.value);
    deleteOrder(currentOrderId.value, { keepalive: true }).catch(() => {});
  }
  // 재고 선점만 있으면 해제
  else if (reservationId.value) {
    console.log("[뒤로가기] 재고 선점 해제:", reservationId.value);
    releaseStock(0, { keepalive: true }).catch(() => {});
  }
};

// 결제 팝업 상태 감시 (팝업이 닫혔을 때 처리)
let paymentTimeoutId: ReturnType<typeof setTimeout> | null = null;

watch(isPaymentPopupOpen, async (isOpen, wasOpen) => {
  // 팝업이 열림 → 닫힘
  if (wasOpen && !isOpen) {
    // 결제 팝업이 닫혔을 때, storage 이벤트 처리 대기 후 재고 선점 확인
    // (결제 성공 시 resetReservation()이 호출되므로 reservationId가 null이 됨)
    paymentTimeoutId = setTimeout(async () => {
      // storage 이벤트로 이미 처리됐으면 스킵 (중복 호출 방지)
      if (isProcessingPaymentResult.value) {
        return;
      }

      // 결제 승인이 진행 중이면 주문 삭제하지 않음 (localStorage 확인)
      if (localStorage.getItem("payment_confirming") === "true") {
        console.log("[팝업 종료] 결제 승인 진행 중 - 주문 삭제 취소");
        return;
      }

      if (reservationId.value || currentOrderId.value) {
        // 결제 성공하지 않았는데 팝업이 닫힌 경우

        // 주문 삭제
        if (currentOrderId.value) {
          try {
            console.log("[팝업 종료] 주문 삭제:", currentOrderId.value);
            await deleteOrder(currentOrderId.value);
            console.log("[팝업 종료] 주문 삭제 성공 (백엔드에서 재고 자동 복구)");
          } catch (deleteError) {
            console.error("[팝업 종료] 주문 삭제 실패:", deleteError);
          }
          currentOrderId.value = null;
        }

        // 재고 선점 상태만 정리 (백엔드에서 이미 복구했으므로 API 호출 불필요)
        resetReservation();

        // 상태 초기화 (버튼 재활성화)
        isPaymentProcessing.value = false;
        showAlert("결제가 취소되었습니다.");
      }
    }, 10000); // 10초 대기 (결제 승인 완료 대기)
  }

  // 팝업이 열릴 때 타이머 정리
  if (isOpen && paymentTimeoutId) {
    clearTimeout(paymentTimeoutId);
    paymentTimeoutId = null;
  }
});

onMounted(() => {
  loadData();

  // 페이지 이탈 감지 이벤트 등록 (비정상 종료 대응)
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handleBeforeUnload); // 모바일/탭 닫기
  window.addEventListener("popstate", handlePopState);
});

// 페이지 이탈 시 바로 구매 세션 정리
onUnmounted(() => {
  // 이벤트 리스너 제거
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("pagehide", handleBeforeUnload);
  window.removeEventListener("popstate", handlePopState);

  // 타이머 정리
  if (paymentTimeoutId) {
    clearTimeout(paymentTimeoutId);
  }

  // 팝업 체크 인터벌 정리
  if (popupCheckInterval) {
    clearInterval(popupCheckInterval);
    popupCheckInterval = null;
  }

  // 비정상 종료 시 정리
  if (currentOrderId.value) {
    console.log("[언마운트] 주문 삭제:", currentOrderId.value);
    deleteOrder(currentOrderId.value, { keepalive: true }).catch(() => {});
  } else if (reservationId.value) {
    console.log("[언마운트] 재고 선점 해제:", reservationId.value);
    releaseStock(0, { keepalive: true }).catch(() => {});
  }

  // 결제 완료 콜백으로 이동하는 경우는 정리하지 않음
  if (!window.location.pathname.includes("/payment/callback")) {
    clearDirectPurchase();
  }
});
</script>

<template>
  <!-- Production 환경: 준비중 화면 -->
  <div
    v-if="isProduction"
    class="max-w-5xl mx-auto px-4 py-24 sm:py-32 text-center"
  >
    <h3 class="text-heading text-primary tracking-wider mb-4">주문 하기</h3>
    <p class="text-xl text-muted-foreground">준비중입니다.</p>
  </div>

  <!-- 개발 환경: 실제 주문 화면 -->
  <div v-else class="max-w-5xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider">주문 하기</h3>
      <p class="text-body text-muted-foreground pt-1 mb-3">
        결제 정보를 입력해주세요.
      </p>
      <Separator></Separator>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle class="text-heading">배송지 정보</CardTitle>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg">
              <button
                v-for="mode in ['saved', 'member', 'new']"
                :key="mode"
                @click="deliveryMode = mode as any"
                :disabled="mode === 'saved' && addresses.length === 0"
                :class="[
                  'flex-1 py-2 text-body font-medium rounded-md transition-all',
                  deliveryMode === mode
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground disabled:opacity-50',
                ]"
              >
                {{
                  mode === "saved"
                    ? "최근 배송지"
                    : mode === "member"
                    ? "회원 정보"
                    : "신규 입력"
                }}
              </button>
            </div>

            <div
              v-if="deliveryMode === 'saved' && addresses.length > 0"
              class="flex justify-end"
            >
              <Button
                variant="outline"
                size="sm"
                @click="isAddressModalOpen = true"
              >
                배송지 목록 변경
              </Button>
            </div>

            <AddressForm
              ref="addressFormRef"
              class="text-left [&_label]:text-left"
              :form="shippingForm.form"
              :show-save-default="deliveryMode !== 'saved'"
              @update:form="Object.assign(shippingForm.form, $event)"
              @search-address="openAddressSearch"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-heading"
              >주문 상품 ({{ orderItems.length }}개)</CardTitle
            >
          </CardHeader>
          <CardContent class="p-0">
            <div class="divide-y divide-border">
              <div
                v-for="item in orderItems"
                :key="item.id"
                class="flex gap-4 pl-4 pr-7 pb-4 items-start"
              >
                <div
                  class="w-20 h-24 bg-muted rounded overflow-hidden shrink-0 border border-border"
                >
                  <img
                    :src="item.product.imageUrl"
                    class="w-full h-full object-cover"
                    draggable="false"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <h3 class="text-body font-bold truncate">
                    {{ item.product.name }}
                  </h3>
                  <p class="text-caption text-muted-foreground mt-1">
                    옵션: {{ item.variant?.size || "-" }}
                    <span v-if="item.variant?.color"
                      >/ {{ item.variant.color }}</span
                    >
                  </p>
                  <div class="flex justify-between items-end mt-2">
                    <span class="text-body">수량 {{ item.quantity }}개</span>
                    <span class="font-bold">
                      {{ formatPrice(item.product.price * item.quantity) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="lg:col-span-1">
        <div class="sticky top-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="text-heading">최종 결제 금액</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="flex justify-between text-body">
                <span class="text-muted-foreground">총 상품 금액</span>
                <span>{{ formatPrice(orderSubtotal) }}</span>
              </div>
              <div class="flex justify-between text-body">
                <span class="text-muted-foreground">배송비</span>
                <span>{{ formatPrice(orderShippingFee) }}</span>
              </div>
              <div class="border-t pt-3 flex justify-between items-center">
                <span class="font-bold text-heading">합계</span>
                <span class="font-bold text-heading text-primary">{{
                  formatPrice(orderTotalAmount)
                }}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-heading">결제 수단</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="method in paymentMethods"
                  :key="method.value"
                  @click="paymentProvider = method.value as any"
                  :class="[
                    'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                    paymentProvider === method.value
                      ? 'border-primary'
                      : 'border-border',
                  ]"
                >
                  <img
                    :src="method.icon"
                    :alt="method.label"
                    class="h-8 w-auto mb-2 object-contain"
                    draggable="false"
                  />
                  <span
                    class="text-body font-bold"
                    :class="
                      paymentProvider === method.value
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    "
                  >
                    {{ method.label }}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          <!-- 재고 선점 상태 표시 -->
          <div
            v-if="isReserved"
            class="flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 rounded-lg text-sm"
          >
            <span class="text-primary font-medium">재고 확보됨</span>
            <span class="text-muted-foreground">
              ({{ remainingTimeFormatted }} 남음)
            </span>
          </div>

          <Button
            @click="handlePayment"
            class="w-full"
            size="lg"
            :disabled="isPaymentProcessing || isPaymentPopupOpen || isReserving"
          >
            <template v-if="isReserving"> 재고 확인 중... </template>
            <template v-else-if="isPaymentProcessing || isPaymentPopupOpen">
              결제 진행 중...
            </template>
            <template v-else>
              {{ formatPrice(orderTotalAmount) }} 결제하기
            </template>
          </Button>
          <p
            class="text-caption text-center text-muted-foreground -translate-y-3"
          >
            위 주문 내용을 확인하였으며 결제에 동의합니다.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="isAddressModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="isAddressModalOpen = false"
    >
      <Card
        class="w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200"
      >
        <CardHeader
          class="flex flex-row items-center justify-between border-b py-4"
        >
          <CardTitle class="text-heading">배송지 목록</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            @click="isAddressModalOpen = false"
            class="h-8 w-8 rounded-full"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent class="overflow-y-auto p-4 space-y-3 bg-muted/10 flex-1">
          <AddressCard
            v-for="addr in addresses"
            :key="addr.id"
            :address="addr"
            :show-actions="false"
            :selectable="true"
            @select="selectAddressFromModal"
          />
        </CardContent>
      </Card>
    </div>

    <!-- 주소 검색 모달 -->
    <AddressSearchModal
      :open="isAddressSearchOpen"
      @close="isAddressSearchOpen = false"
      @select="handleAddressSelect"
    />

    <!-- 유효성 검사 Alert -->
    <Alert
      v-if="showValidationAlert"
      type="error"
      :message="validationMessage"
      :duration="2000"
      @close="showValidationAlert = false"
    />

    <!-- 주문 생성 중 전체 화면 로딩 -->
    <LoadingSpinner
      v-if="isPaymentProcessing"
      fullscreen
      variant="dots"
      size="lg"
      message="주문을 생성하고 있습니다..."
    />
  </div>
</template>
