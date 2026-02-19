<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useOrders } from "@/composables/useOrders";
import { useAlert } from "@/composables/useAlert";
import { formatDate, formatPrice } from "@/lib/formatters";
import type { Order, OrderItem, ReturnReasonType } from "@/types/api";
import { getDayName } from "@/lib/utils";
import { ORDER_MESSAGES } from "@/lib/messages";
import {
  isCancelable,
  isReturnable,
  sortOrderItems,
} from "@/lib/constants/order";
import { partialCancelOrder, createReturn, fetchOrder } from "@/lib/api";

// 공통 컴포넌트
import {
  LoadingSpinner,
  ProductThumbnail,
  OrderStatusBadge,
  CancelOrderDialog,
} from "@/components/common";

// 주문 관련 모달 컴포넌트
import { ReturnRequestModal } from "@/components/order";

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

// 개별 취소 다이얼로그 상태
const cancelDialogOpen = ref(false);
const cancelTargetItem = ref<OrderItem | null>(null);
const cancelLoading = ref(false);

// 반품 요청 모달 상태
const returnModalOpen = ref(false);
const returnTargetItem = ref<OrderItem | null>(null);
const returnLoading = ref(false);

// 배송비 (백엔드에서 제공)
const shippingFee = computed(() => {
  if (!order.value || !order.value.shippingFee) return 0;
  return Number(order.value.shippingFee);
});

// 배송비 텍스트
const shippingFeeText = computed(() => {
  return shippingFee.value === 0 ? "무료" : formatPrice(shippingFee.value);
});

// 상품 금액 (총 결제 금액 - 배송비)
const subtotal = computed(() => {
  if (!order.value) return 0;
  const total = Number(order.value.totalAmount) || 0;
  return total - shippingFee.value;
});

// 정렬된 주문 아이템 (활성 상태 먼저, 취소/환불 나중에)
const sortedOrderItems = computed(() => {
  if (!order.value?.orderItems) return [];
  return sortOrderItems(order.value.orderItems);
});

// 데이터 로드
onMounted(async () => {
  const orderId = route.params.id as string;
  const orderData = await loadOrder(orderId);

  if (orderData) {
    order.value = orderData;
  }
});

// 주문 다시 로드
const reloadOrder = async () => {
  if (!order.value) return;
  const orderData = await fetchOrder(order.value.id);
  if (orderData) {
    order.value = orderData;
  }
};

// 뒤로가기
const goBack = () => {
  router.push("/orderlist");
};

// 상태별 버튼 노출 로직
const canCancel = (status: string) => {
  return isCancelable(status as any);
};

const canReturn = (status: string) => {
  return isReturnable(status as any);
};

const canTrack = (status: string) => {
  return ["shipped", "delivered"].includes(status);
};

// 취소 다이얼로그 열기 (개별 아이템)
const openCancelDialog = (item: OrderItem) => {
  cancelTargetItem.value = item;
  cancelDialogOpen.value = true;
};

// 취소 다이얼로그 닫기
const closeCancelDialog = () => {
  cancelDialogOpen.value = false;
  cancelTargetItem.value = null;
};

// 개별 취소 확인 핸들러 (부분 취소 API 사용)
const handleConfirmCancel = async (reason: string) => {
  if (!order.value || !cancelTargetItem.value || cancelLoading.value) return;

  cancelLoading.value = true;

  try {
    await partialCancelOrder(order.value.id, {
      cancelReason: reason,
      cancelItems: [{ orderItemId: cancelTargetItem.value.id }],
    });

    // 성공 알림
    showAlert(ORDER_MESSAGES.cancelSuccess);

    // 주문 정보 다시 로드
    await reloadOrder();

    // 모달 닫기
    closeCancelDialog();
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : ORDER_MESSAGES.cancelFailed;
    showAlert(errorMessage, { type: "error" });
  } finally {
    cancelLoading.value = false;
  }
};

// 반품 요청 모달 열기
const openReturnModal = (item: OrderItem) => {
  returnTargetItem.value = item;
  returnModalOpen.value = true;
};

// 반품 요청 모달 닫기
const closeReturnModal = () => {
  returnModalOpen.value = false;
  returnTargetItem.value = null;
};

// 반품 요청 확인 핸들러
const handleConfirmReturn = async (data: {
  orderItemId: number;
  reason: string;
  reasonType: ReturnReasonType;
}) => {
  if (returnLoading.value) return;

  returnLoading.value = true;

  try {
    await createReturn(data);

    // 성공 알림
    showAlert(ORDER_MESSAGES.returnRequestSuccess);

    // 주문 정보 다시 로드
    await reloadOrder();

    // 모달 닫기
    closeReturnModal();
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : ORDER_MESSAGES.returnRequestFailed;
    showAlert(errorMessage, { type: "error" });
  } finally {
    returnLoading.value = false;
  }
};

// 배송 조회 핸들러
const handleTrackShipment = (item: OrderItem) => {
  if (!item.trackingNumber) {
    showAlert(ORDER_MESSAGES.trackingNumberNotReady, { type: "error" });
    return;
  }
  // 네이버 통합 택배조회: 택배사+운송장번호
  const courier = item.courierCompany || "택배";
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(courier)}+${encodeURIComponent(item.trackingNumber)}`;
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
  return labels[provider] || provider;
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

    <div v-else class="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-8">
      <div class="space-y-6">
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
                  {{ order.shippingName }}
                </span>
              </div>
              <p class="text-foreground pt-2">
                {{ order.shippingAddress }}
              </p>
              <p v-if="order.shippingDetailAddress" class="text-foreground">
                {{ order.shippingDetailAddress }}
              </p>
              <p class="pt-1">
                <span class="text-body text-muted-foreground">
                  {{ order.shippingPhone }}
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
              주문 상품
              {{
                order?.orderItems?.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                ) ?? 0
              }}개
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0 divide-y divide-border">
            <div
              v-for="item in sortedOrderItems"
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
                  :product-slug="item.product?.slug"
                />

                <div class="flex-1 flex flex-col justify-between min-h-[100px]">
                  <div>
                    <div class="flex justify-between items-start mb-1 gap-2">
                      <h3
                        class="text-body font-medium text-foreground cursor-pointer hover:underline line-clamp-2"
                        @click="router.push(`/productDetail/${item.product?.slug || item.productId}`)"
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
                      <div class="flex gap-2 sm:hidden flex-wrap justify-end">
                        <Button
                          v-if="canCancel(item.status)"
                          variant="outline"
                          size="sm"
                          class="text-caption px-2.5 min-h-[36px]"
                          @click="openCancelDialog(item)"
                        >
                          주문취소
                        </Button>

                        <Button
                          v-if="canTrack(item.status)"
                          variant="outline"
                          size="sm"
                          class="text-caption px-2.5 min-h-[36px]"
                          @click="handleTrackShipment(item)"
                        >
                          배송조회
                        </Button>

                        <Button
                          v-if="canReturn(item.status)"
                          variant="outline"
                          size="sm"
                          class="text-caption px-2.5 min-h-[36px]"
                          @click="openReturnModal(item)"
                        >
                          반품요청
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

                      <Button
                        v-if="canReturn(item.status)"
                        variant="outline"
                        size="sm"
                        class="text-caption px-3 py-1.5"
                        @click="openReturnModal(item)"
                      >
                        반품요청
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
      <div class="space-y-6">
        <Card>
          <CardHeader class="pb-6">
            <CardTitle class="flex items-center gap-2 text-heading">
              결제 정보
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between text-body">
              <span class="text-muted-foreground">상품 금액</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-body pb-2">
              <span class="text-muted-foreground">배송비</span>
              <span
                :class="shippingFee === 0 ? 'text-primary font-medium' : ''"
                >{{ shippingFeeText }}</span
              >
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

            <!-- 취소/환불 정보 -->
            <div
              v-if="
                order.status === 'refunded' ||
                order.status === 'partial_refunded'
              "
              class="pt-3 border-t !mt-4 bg-destructive/5 -mx-6 px-6 pb-2"
            >
              <div
                class="flex items-center gap-2 text-destructive font-bold text-body mb-2"
              >
                <AlertCircle class="w-4 h-4" />
                {{
                  order.status === "partial_refunded"
                    ? "부분 환불"
                    : "주문 취소됨"
                }}
              </div>
              <div class="space-y-2 text-body">
                <div v-if="order.canceledAt" class="flex justify-between">
                  <span class="text-muted-foreground">취소 일시</span>
                  <span>{{ formatDate(order.canceledAt) }}</span>
                </div>
                <div
                  v-if="order.cancelReason"
                  class="flex justify-between items-start gap-4"
                >
                  <span class="text-muted-foreground">사유</span>
                  <span class="text-right break-words flex-1 ml-3">{{
                    order.cancelReason
                  }}</span>
                </div>
                <div
                  v-if="order.refundedAmount"
                  class="flex justify-between font-medium text-destructive"
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

    <!-- 주문 취소 다이얼로그 (개별 아이템용) -->
    <CancelOrderDialog
      :open="cancelDialogOpen"
      :order-item="cancelTargetItem"
      :loading="cancelLoading"
      @close="closeCancelDialog"
      @confirm="handleConfirmCancel"
    />

    <!-- 반품 요청 모달 -->
    <ReturnRequestModal
      :open="returnModalOpen"
      :order-item="returnTargetItem"
      :loading="returnLoading"
      @close="closeReturnModal"
      @confirm="handleConfirmReturn"
    />
  </div>
</template>
