<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useOrders, useCancelOrder } from "@/composables/useOrders";
import { useAlert } from "@/composables/useAlert";
import {
  formatDate,
  formatPrice,
  maskUserName,
  maskPhone,
  maskDetailAddress,
} from "@/lib/formatters";
import type { Order, OrderItem } from "@/types/api";
import { getDayName } from "@/lib/utils";

// 공통 컴포넌트
import {
  LoadingSpinner,
  ProductThumbnail,
  OrderStatusBadge,
  CancelOrderDialog,
} from "@/components/common";

// UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// UI 강화를 위한 아이콘
import { AlertCircle } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const { showAlert } = useAlert();

// useOrders 훅 사용
const { loadOrder, loading, error } = useOrders();
const order = ref<Order | null>(null);

// 주문 취소 훅
const { cancel: cancelOrder, loading: cancelLoading } = useCancelOrder();

// 취소 다이얼로그 상태
const cancelDialogOpen = ref(false);
const cancelTargetItem = ref<OrderItem | null>(null);

// 배송비 (백엔드에서 제공)
const shippingFee = computed(() => {
  if (!order.value || !order.value.shippingFee) return 0;
  return Number(order.value.shippingFee);
});

// 배송비 텍스트
const shippingFeeText = computed(() => {
  return shippingFee.value === 0 ? "무료" : formatPrice(shippingFee.value);
});

// 데이터 로드
onMounted(async () => {
  const orderId = route.params.id as string;
  const orderData = await loadOrder(orderId);

  if (orderData) {
    order.value = orderData;
  }
});

// 뒤로가기
const goBack = () => {
  router.push("/orderlist");
};

// 상태별 버튼 노출 로직
const canCancel = (status: string) => {
  return ["payment_confirmed", "preparing"].includes(status);
};
const canTrack = (status: string) => {
  return ["shipped", "delivered"].includes(status);
};

// 취소 다이얼로그 열기
const openCancelDialog = (item: OrderItem) => {
  cancelTargetItem.value = item;
  cancelDialogOpen.value = true;
};

// 취소 다이얼로그 닫기
const closeCancelDialog = () => {
  cancelDialogOpen.value = false;
  cancelTargetItem.value = null;
};

// 주문 취소 확인 핸들러
const handleConfirmCancel = async (reason: string) => {
  if (!order.value) return;

  const result = await cancelOrder(order.value.id, reason);

  if (result) {
    // 취소 성공 시 주문 정보 갱신
    order.value = result.order;
    closeCancelDialog();

    // 취소 완료 알림
    showAlert("주문이 취소되었습니다.");
  } else {
    showAlert("주문 취소에 실패했습니다. 다시 시도해주세요.", {
      type: "error",
    });
  }
};

// 배송 조회 핸들러
const handleTrackShipment = (item: OrderItem) => {
  if (!item.trackingNumber) {
    showAlert("아직 운송장 번호가 등록되지 않았습니다.", { type: "error" });
    return;
  }
  // 스마트택배 등 통합 조회 링크 권장
  const url = `https://search.naver.com/search.naver?query=${item.trackingNumber}`;
  window.open(url, "_blank");
};

// 결제 제공자(paymentProvider) 라벨 변환
const getPaymentProviderLabel = (provider: string): string => {
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
  return labels[provider] || provider; // 매핑되지 않은 경우 원본 출력
};
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">주문 상세</h3>
      <Separator></Separator>
    </div>

    <div class="mb-5 pl-2">
      <p v-if="order" class="text-body text-foreground">
        <span class="text-heading text-foreground font-semibold"
          >{{ formatDate(order.createdAt) }}({{ getDayName(order.createdAt) }})
        </span>

        <br />
        주문번호: {{ order.externalOrderId || order.id }}
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <div v-else-if="error || !order" class="py-12 text-center">
      <div
        class="rounded-lg border border-destructive/50 bg-destructive/5 p-6 inline-block"
      >
        <p class="text-destructive mb-4">
          {{ error || "주문을 찾을 수 없습니다" }}
        </p>
        <Button variant="outline" @click="goBack"
          >주문 내역으로 돌아가기</Button
        >
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <!-- 배송지 정보 -->
        <Card>
          <CardHeader class="pb-6">
            <CardTitle class="flex items-center gap-2 text-heading">
              배송지 정보
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="text-body">
              <div class="flex flex-col gap-1">
                <span class="text-heading text-foreground font-semibold">
                  {{ maskUserName(order.shippingName) }}
                </span>
              </div>
              <p class="text-foreground pt-2">
                {{ order.shippingAddress }}
                <span v-if="order.shippingDetailAddress">
                  {{ maskDetailAddress(order.shippingDetailAddress) }}
                </span>
              </p>
              <p class="pt-1">
                <span class="text-body text-muted-foreground">
                  {{ maskPhone(order.shippingPhone) }}
                </span>
              </p>
              <!-- 배송 요청사항 -->
              <p class="pt-1">
                <span
                  v-if="order.shippingRequestNote"
                  class="text-caption text-muted-foreground"
                >
                  {{ order.shippingRequestNote }}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 주문 상품 -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-heading">
              주문 상품 {{ order?.orderItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0 }}개
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0 divide-y divide-border">
            <div
              v-for="item in order.orderItems"
              :key="item.id"
              class="pl-6 pr-6 pb-6 pt-3 flex flex-col gap-3"
            >
              <!-- 배송상태 뱃지 -->
              <OrderStatusBadge
                :status="item.status"
                class="shadow-sm self-start"
              />

              <div class="flex flex-col sm:flex-row gap-6">
                <ProductThumbnail
                  :image-url="item.product?.imageUrl"
                  :product-id="item.productId"
                />

                <div class="flex-1 flex flex-col justify-between min-h-[100px]">
                  <div>
                    <div class="flex justify-between items-start mb-1 gap-2">
                      <h3
                        class="text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2"
                        @click="router.push(`/productDetail/${item.productId}`)"
                      >
                        {{ item.productName }}
                      </h3>
                    </div>

                    <p class="text-body text-muted-foreground mt-1">
                      <template v-if="item.options"
                        >{{ item.options }} / </template
                      >{{ item.quantity }}개
                    </p>

                    <!-- 모바일: 금액과 버튼을 같은 라인에 배치 -->
                    <div
                      class="flex items-baseline justify-between gap-2 mt-1 sm:block"
                    >
                      <p class="text-body text-foreground font-medium">
                        {{ formatPrice(item.productPrice) }}
                      </p>

                      <!-- 모바일 버튼 (금액과 같은 라인) -->
                      <div class="flex gap-2 sm:hidden">
                        <Button
                          v-if="canCancel(item.status)"
                          variant="outline"
                          size="sm"
                          class="text-caption px-2.5 py-1"
                          @click="openCancelDialog(item)"
                        >
                          주문취소
                        </Button>

                        <Button
                          v-if="canTrack(item.status)"
                          variant="outline"
                          size="sm"
                          class="text-caption px-2.5 py-1"
                          @click="handleTrackShipment(item)"
                        >
                          배송조회
                        </Button>
                      </div>
                    </div>
                  </div>

                  <!-- 데스크톱 버튼 (하단 우측) -->
                  <div class="mt-4 hidden sm:flex items-end justify-between">
                    <div></div>

                    <div class="flex gap-2">
                      <Button
                        v-if="canCancel(item.status)"
                        variant="outline"
                        size="sm"
                        class="text-caption px-3 py-1.5"
                        @click="openCancelDialog(item)"
                      >
                        주문취소
                      </Button>

                      <Button
                        v-if="canTrack(item.status)"
                        variant="outline"
                        size="sm"
                        class="text-caption px-3 py-1.5"
                        @click="handleTrackShipment(item)"
                      >
                        배송조회
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 우측: 결제 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader class="pb-6">
            <CardTitle class="flex items-center gap-2 text-heading">
              결제 정보
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between text-body">
              <span class="text-muted-foreground">상품 금액</span>
              <span>{{ formatPrice(order.totalAmount) }}</span>
            </div>
            <div class="flex justify-between text-body pb-2">
              <span class="text-muted-foreground">배송비</span>
              <span :class="shippingFee === 0 ? 'text-primary font-medium' : ''">{{ shippingFeeText }}</span>
            </div>
            <Separator />
            <div class="flex justify-between items-center pt-2">
              <span class="font-bold">결제 금액</span>
              <span class="text-heading text-primary">
                {{ formatPrice(order.totalAmount) }}
              </span>
            </div>

            <div v-if="order.paymentProvider">
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground text-sm flex items-center">
                  결제 수단
                </span>
                <span class="text-sm">{{
                  getPaymentProviderLabel(order.paymentProvider)
                }}</span>
              </div>
            </div>

            <div
              v-if="order.canceledAt"
              class="pt-3 border-t mt-1 bg-destructive/5 -mx-6 px-6 pb-2"
            >
              <div
                class="flex items-center gap-2 text-destructive font-bold text-body mb-2"
              >
                <AlertCircle class="w-4 h-4" />
                주문 취소됨
              </div>
              <div class="space-y-1 text-body">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">취소 일시</span>
                  <span>{{ formatDate(order.canceledAt) }}</span>
                </div>
                <div v-if="order.cancelReason" class="flex justify-between">
                  <span class="text-muted-foreground">사유</span>
                  <span>{{ order.cancelReason }}</span>
                </div>
                <div
                  v-if="order.refundedAmount"
                  class="flex justify-between font-medium text-destructive mt-2"
                >
                  <span>환불 금액</span>
                  <span>{{ formatPrice(order.refundedAmount) }}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- 주문 취소 다이얼로그 -->
    <CancelOrderDialog
      :open="cancelDialogOpen"
      :product-name="cancelTargetItem?.productName"
      :loading="cancelLoading"
      @close="closeCancelDialog"
      @confirm="handleConfirmCancel"
    />
  </div>
</template>
