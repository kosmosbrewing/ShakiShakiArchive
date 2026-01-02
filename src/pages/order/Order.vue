<script setup lang="ts">
// src/pages/Order.vue
// 주문/결제 페이지

import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCart } from "@/composables/useCart";
import { useAddresses, useShippingForm } from "@/composables/useAddresses";
import { useCreateOrder } from "@/composables/useOrders";
import { useAlert } from "@/composables/useAlert";
import { formatPrice } from "@/lib/formatters";
import {
  createDeliveryAddress,
  getPaymentClientKey,
  getNaverPaySdkConfig,
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
import type { DeliveryAddress, User } from "@/types/api";

// [이미지 Import]
import tossLogo from "@/assets/tossSymbol.png";
import naverLogo from "@/assets/naverSymbol.svg";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

// Composables
const { cartItems, shippingFee, totalAmount, loadCart } = useCart();
const { addresses, loadAddresses } = useAddresses();
const shippingForm = useShippingForm();
const { submitOrder } = useCreateOrder();

// 상태
const loading = ref(false);
const isPaymentProcessing = ref(false); // 주문 생성 중 (전체 화면 로딩)
const isPaymentPopupOpen = ref(false); // 결제 팝업 열림 상태 (버튼 비활성화용)
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
    if (authStore.isAuthenticated && !authStore.user) {
      await authStore.loadUser();
    }

    await loadCart();
    if (cartItems.value.length === 0) {
      showAlert("주문할 상품이 없습니다.", { type: "error" });
      router.replace("/");
      return;
    }

    await loadAddresses();

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
  // 필수 항목 개별 유효성 검사
  if (!shippingForm.form.recipient.trim()) {
    showValidationError("수령인을 입력해주세요.", "recipient");
    return;
  }

  if (!shippingForm.form.phone2 || !shippingForm.form.phone3) {
    showValidationError("연락처를 입력해주세요.", "phone");
    return;
  }

  if (!shippingForm.form.zipCode || !shippingForm.form.address) {
    showValidationError("주소를 검색해주세요.", "address");
    return;
  }

  if (!shippingForm.form.detailAddress.trim()) {
    showValidationError("상세 주소를 입력해주세요.", "detailAddress");
    return;
  }

  const confirmed = await showConfirm(`${formatPrice(totalAmount.value)}을\n결제하시겠습니까?`, {
    confirmText: "결제하기",
    cancelText: "취소",
  });
  if (!confirmed) return;

  try {
    // 주문 생성 중 전체 화면 로딩
    isPaymentProcessing.value = true;

    const orderData = await submitOrder({
      shippingName: shippingForm.form.recipient,
      shippingPhone: shippingForm.fullPhone.value,
      shippingPostalCode: shippingForm.form.zipCode,
      shippingAddress: shippingForm.form.address,
      shippingDetailAddress: shippingForm.form.detailAddress,
      shippingRequestNote: shippingForm.finalRequestNote.value,
      paymentMethod: paymentProvider.value,
    });

    if (!orderData) throw new Error("주문 생성 실패");

    // 주문 생성 완료 → 결제 창 열기 전 로딩 해제
    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = true; // 버튼 비활성화 유지

    if (paymentProvider.value === "toss") {
      await processTossPayment(orderData);
    } else if (paymentProvider.value === "naverpay") {
      await processNaverPayment(orderData);
    }
  } catch (error: any) {
    showAlert(`결제 요청 중 오류가 발생했습니다: ${error.message}`, { type: "error" });
    isPaymentProcessing.value = false;
    isPaymentPopupOpen.value = false;
  }
};

// [토스페이먼츠] 결제 로직
const processTossPayment = async (orderData: any) => {
  try {
    // 1. 클라이언트 키 가져오기
    const { clientKey } = await getPaymentClientKey();

    // 2. 토스페이먼츠 SDK 초기화 (window 객체에서 가져옴)
    const TossPayments = (window as any).TossPayments;
    if (!TossPayments) {
      throw new Error("토스페이먼츠 SDK가 로드되지 않았습니다.");
    }

    const tossPayments = TossPayments(clientKey);

    // 3. customerKey 생성 (회원: 유저ID, 비회원: 주문ID 기반)
    const customerKey = authStore.user?.id
      ? `user_${authStore.user.id}`
      : `guest_${orderData.orderId}`;

    // 4. 주문명 생성 (첫 번째 상품명 + 외 n개)
    const firstProductName = cartItems.value[0]?.product?.name || "상품";
    const orderName =
      cartItems.value.length > 1
        ? `${firstProductName} 외 ${cartItems.value.length - 1}건`
        : firstProductName;

    // 5. 기본 배송지 저장 (결제 전에 저장)
    await saveDefaultAddressIfNeeded();

    // 6. 결제 요청
    const payment = tossPayments.payment({ customerKey });

    await payment.requestPayment({
      method: "CARD", // 카드 결제 (토스페이 선택 시 다양한 결제수단 제공)
      amount: {
        currency: "KRW",
        value: totalAmount.value,
      },
      orderId: orderData.externalOrderId, // PG사에서 사용할 주문번호 (SHAKI_... 형식)
      orderName: orderName,
      successUrl: `${window.location.origin}/payment/callback?result=success`,
      failUrl: `${window.location.origin}/payment/callback?result=fail`,
      customerEmail: authStore.user?.email || undefined,
      customerName: shippingForm.form.recipient,
      customerMobilePhone: shippingForm.fullPhone.value.replace(/-/g, ""),
    });
  } catch (err: any) {
    console.error("토스 결제 오류", err);
    isPaymentPopupOpen.value = false; // 결제 취소/실패 시 버튼 다시 활성화

    // 사용자가 결제 취소한 경우는 별도 처리
    if (err.code === "USER_CANCEL") {
      showAlert("결제가 취소되었습니다.");
    } else {
      throw new Error(err.message || "토스 결제 창 호출에 실패했습니다.");
    }
  }
};

// [네이버페이] 결제 로직 (SDK 클라이언트 직접 호출 방식)
const processNaverPayment = async (orderData: any) => {
  try {
    // 1. 네이버페이 SDK 설정 가져오기 (신규 엔드포인트)
    const sdkConfig = await getNaverPaySdkConfig();

    // 2. 네이버페이 SDK 초기화 (payType 파라미터 추가)
    const naverPay = initNaverPay(
      sdkConfig.clientId,
      sdkConfig.chainId,
      sdkConfig.mode,
      sdkConfig.payType
    );

    if (!naverPay) {
      throw new Error("네이버페이 SDK가 로드되지 않았습니다.");
    }

    // 3. 주문명 생성 (128자 이내)
    const firstProductName = cartItems.value[0]?.product?.name || "상품";
    const productName =
      cartItems.value.length > 1
        ? `${firstProductName} 외 ${cartItems.value.length - 1}건`
        : firstProductName;

    // 4. 상품 수량 계산
    const productCount = cartItems.value.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // 5. 상품 정보 배열 생성 (필수)
    const productItems = cartItems.value.map((item) => ({
      categoryType: "ETC",
      categoryId: "ETC",
      uid: item.product?.id || item.productId || String(item.id),
      name: item.product?.name || "상품",
      count: item.quantity,
    }));

    // 6. 사용자 식별키 생성 (암호화 권장)
    const merchantUserKey = authStore.user?.id
      ? `user_${authStore.user.id}`
      : `guest_${orderData.orderId}`;

    // 7. 기본 배송지 저장 (결제 전에 저장)
    await saveDefaultAddressIfNeeded();

    // 8. 네이버페이 결제창 호출 (신규 파라미터 적용)
    naverPay.open({
      merchantPayKey: orderData.externalOrderId, // 가맹점 주문번호
      merchantUserKey: merchantUserKey, // 사용자 식별키 (신규 필수)
      productName: productName,
      productCount: productCount, // 숫자 타입으로 변경
      totalPayAmount: totalAmount.value, // 숫자 타입으로 변경
      taxScopeAmount: totalAmount.value, // 전체 금액을 과세 대상으로
      taxExScopeAmount: 0, // 면세 대상 금액 없음
      returnUrl: `${sdkConfig.returnUrl}?orderId=${orderData.orderId}`, // 백엔드에서 제공하는 returnUrl 사용
      productItems: productItems, // 상품 정보 배열 (신규 필수)
    });

    // 팝업이 닫히면 버튼 재활성화 (visibilitychange 이벤트 감지)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // 페이지가 다시 보이면 버튼 재활성화 (사용자가 팝업을 닫은 경우)
        isPaymentPopupOpen.value = false;
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
  } catch (err: any) {
    console.error("네이버페이 결제 오류", err);
    isPaymentPopupOpen.value = false; // 에러 시 버튼 다시 활성화
    throw new Error(err.message || "네이버페이 결제 호출에 실패했습니다.");
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

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider">ORDER</h3>
      <p class="text-body text-muted-foreground pt-1 mb-3">결제 내용</p>
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
              >주문 상품 ({{ cartItems.length }}개)</CardTitle
            >
          </CardHeader>
          <CardContent class="p-0">
            <div class="divide-y divide-border">
              <div
                v-for="item in cartItems"
                :key="item.id"
                class="flex gap-4 pl-4 pr-7 pb-4 items-start"
              >
                <div
                  class="w-20 h-24 bg-muted rounded overflow-hidden shrink-0 border border-border"
                >
                  <img
                    :src="item.product?.imageUrl"
                    class="w-full h-full object-cover"
                    draggable="false"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <h3 class="text-body font-bold truncate">
                    {{ item.product?.name }}
                  </h3>
                  <p class="text-caption text-muted-foreground mt-1">
                    옵션: {{ item.variant?.size || "-" }}
                    <span v-if="item.variant?.color"
                      >/ {{ item.variant?.color }}</span
                    >
                  </p>
                  <div class="flex justify-between items-end mt-2">
                    <span class="text-body">수량 {{ item.quantity }}개</span>
                    <span class="font-bold">
                      {{
                        formatPrice(Number(item.product?.price) * item.quantity)
                      }}
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
                <span>{{ formatPrice(totalAmount - shippingFee) }}</span>
              </div>
              <div class="flex justify-between text-body">
                <span class="text-muted-foreground">배송비</span>
                <span>{{ formatPrice(shippingFee) }}</span>
              </div>
              <div class="border-t pt-3 flex justify-between items-center">
                <span class="font-bold text-heading">합계</span>
                <span class="font-bold text-heading text-primary">{{
                  formatPrice(totalAmount)
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

          <Button
            @click="handlePayment"
            class="w-full"
            size="lg"
            :disabled="isPaymentProcessing || isPaymentPopupOpen"
          >
            <template v-if="isPaymentProcessing || isPaymentPopupOpen">
              결제 진행 중...
            </template>
            <template v-else>
              {{ formatPrice(totalAmount) }} 결제하기
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
