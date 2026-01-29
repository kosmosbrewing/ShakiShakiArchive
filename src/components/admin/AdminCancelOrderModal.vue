<script setup lang="ts">
// 관리자 주문 취소 모달 컴포넌트
// 고객 요청에 따른 취소 승인 / 판매자 직권 취소 두 가지 상황 지원

import { ref, computed, watch } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useConstantsStore } from "@/stores/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, AlertTriangle, Info, FileText } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import type { OrderItem } from "@/types/api";

// 배송비 상수
const constantsStore = useConstantsStore();
const SHIPPING_FEE = computed(() => constantsStore.shipping?.FEE ?? 3500);
const FREE_THRESHOLD = computed(() => constantsStore.shipping?.FREE_THRESHOLD ?? 70000);

// 취소 유형
type CancelType = "customer_request" | "customer_request_cod" | "seller_cancel";

interface Props {
  open: boolean;
  orderItem: OrderItem | null;
  order: any;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    data: {
      cancelType: CancelType;
      adminMemo: string;
      cancelReason: string;
    },
  ): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

// 취소 유형
const selectedCancelType = ref<CancelType | "">("");

// 취소 사유 옵션
const cancelTypeOptions = [
  {
    value: "customer_request" as CancelType,
    label: "반품 승인 (고객 귀책)",
    description: "단순 변심 등: 배송비 차감 후 환불",
  },
  {
    value: "customer_request_cod" as CancelType,
    label: "반품 승인 (고객 귀책 + 착불 차감)",
    description: "단순 변심 등 착불 반품 시: 배송비 + 반품비 차감 후 환불",
  },
  {
    value: "seller_cancel" as CancelType,
    label: "직권 취소 (판매자 귀책)",
    description: "불량/오배송/재고부족: 전액 환불",
  },
];

// 내부 관리용 메모 템플릿
const adminMemoTemplates: Record<CancelType, string> = {
  customer_request: "[반품승인] 고객 요청에 따른 상품 회수 확인 후 취소.",
  customer_request_cod: "[반품승인-착불] 착불 반품비 차감 후 환불 처리.",
  seller_cancel: "[직권취소] 재고부족/상품오류로 인한 관리자 취소.",
};

// 입력 필드
const adminMemo = ref("");

// 취소 유형 선택 시 템플릿 자동 적용
const selectCancelType = (type: CancelType) => {
  selectedCancelType.value = type;
  adminMemo.value = adminMemoTemplates[type];
};

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  return !!selectedCancelType.value;
});

// 취소 가능 상태 확인 (결제완료, 배송준비중, 반품 도착)
const isCancelableStatus = computed(() => {
  if (!props.orderItem) return false;
  const cancelableStatuses = [
    "payment_confirmed",
    "preparing",
    "return_received",
  ];
  return cancelableStatuses.includes(props.orderItem.status);
});

// 상태 라벨
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    payment_confirmed: "결제완료",
    preparing: "배송준비중",
    return_received: "반품 도착",
  };
  return statusMap[status] || status;
};

// 최종 취소 사유 생성
const getFinalCancelReason = () => {
  if (
    selectedCancelType.value === "customer_request" ||
    selectedCancelType.value === "customer_request_cod"
  ) {
    return "고객 요청에 따른 반품/취소 승인";
  }
  return "판매자 사정에 의한 주문 취소 (재고 부족/상품 오류)";
};

// 마지막 상품 여부 확인 (활성 상태인 상품이 현재 상품뿐인지)
const isLastActiveItem = computed(() => {
  if (!props.order?.orderItems || !props.orderItem) return true;
  const activeStatuses = ["payment_confirmed", "preparing", "shipped", "delivered", "return_requested", "return_in_transit", "return_received"];
  const activeItems = props.order.orderItems.filter(
    (item: any) => activeStatuses.includes(item.status) && item.id !== props.orderItem?.id
  );
  return activeItems.length === 0;
});

// 환불 금액 계산 (미리보기용) - 백엔드 calculateRefund 로직과 일치
const calculateRefundPreview = computed(() => {
  if (!props.order || !props.orderItem || !selectedCancelType.value) return null;

  // 개별 상품 금액 계산
  const itemPrice = Number(props.orderItem.productPrice) || 0;
  const itemQuantity = props.orderItem.quantity || 1;
  const itemAmount = itemPrice * itemQuantity;

  // 주문 전체 정보
  const orderItemsAmount = Number(props.order.itemsAmount) || 0;
  const paidShippingFee = Number(props.order.shippingFee) || 0;
  const alreadyRefundedAmount = Number(props.order.refundedAmount) || 0;
  const penaltyAlreadyApplied = props.order.shippingPenaltyApplied || false;
  const fee = SHIPPING_FEE.value;
  const threshold = FREE_THRESHOLD.value;

  // 남은 금액 계산 (전체 상품 - 이미 환불 - 현재 환불)
  const remainingAmount = orderItemsAmount - alreadyRefundedAmount - itemAmount;

  let refundAmount = itemAmount;
  let deductions: { label: string; amount: number }[] = [];
  let additions: { label: string; amount: number }[] = [];

  // === 판매자 귀책 (seller_cancel) ===
  if (selectedCancelType.value === "seller_cancel") {
    // 판매자 귀책: 페널티 없음
    if (isLastActiveItem.value && paidShippingFee > 0) {
      // 마지막 상품: 배송비도 환불
      additions.push({ label: "배송비 환불", amount: paidShippingFee });
      refundAmount += paidShippingFee;
    }
    // 부분 취소: 상품값만 (이미 refundAmount = itemAmount)
  }
  // === 고객 귀책 (customer_request) ===
  else if (selectedCancelType.value === "customer_request") {
    if (isLastActiveItem.value) {
      // 마지막 상품: 상품값 + 낸 배송비 - 실제낸배송비 + 크레딧
      // 도서산간 추가 배송비 포함하여 전액 차감
      if (paidShippingFee > 0) {
        additions.push({ label: "배송비 환불", amount: paidShippingFee });
        refundAmount += paidShippingFee;
        deductions.push({ label: "배송비 차감", amount: paidShippingFee });
        refundAmount -= paidShippingFee;
      }

      // 크레딧: 이미 페널티 차감됐으면 중복 차감 방지
      if (penaltyAlreadyApplied) {
        additions.push({ label: "크레딧 (중복차감 방지)", amount: fee });
        refundAmount += fee;
      }
    } else {
      // 부분 취소: 조건부 페널티 적용
      // - 유료배송 주문 → 페널티 없음
      // - 무료배송 + 남은 금액 >= 기준 → 페널티 없음
      // - 무료배송 + 이미 페널티 차감 → 페널티 없음
      // - 그 외 → 배송비 페널티
      const isFreeShipping = paidShippingFee === 0;
      const remainingAboveThreshold = remainingAmount >= threshold;

      if (isFreeShipping && !remainingAboveThreshold && !penaltyAlreadyApplied) {
        // 무료배송 + 남은 금액 < 기준 + 최초 → 페널티 적용
        deductions.push({ label: "배송비 차감", amount: fee });
        refundAmount -= fee;
      }
      // 그 외: 페널티 없이 상품값만 환불
    }
  }
  // === 고객 귀책 + 착불 (customer_request_cod) ===
  else if (selectedCancelType.value === "customer_request_cod") {
    if (isLastActiveItem.value) {
      // 마지막 상품: 상품값 + 낸 배송비 - 실제낸배송비 + 크레딧 - 착불 반품비
      // 도서산간 추가 배송비 포함하여 전액 차감
      if (paidShippingFee > 0) {
        additions.push({ label: "배송비 환불", amount: paidShippingFee });
        refundAmount += paidShippingFee;
        deductions.push({ label: "배송비 차감", amount: paidShippingFee });
        refundAmount -= paidShippingFee;
      }

      // 크레딧: 이미 페널티 차감됐으면 중복 차감 방지
      if (penaltyAlreadyApplied) {
        additions.push({ label: "크레딧 (중복차감 방지)", amount: fee });
        refundAmount += fee;
      }

      // 착불 반품비 추가 차감
      deductions.push({ label: "반품 배송비 차감", amount: fee });
      refundAmount -= fee;
    } else {
      // 부분 취소: 조건부 페널티 + 착불 반품비
      const isFreeShipping = paidShippingFee === 0;
      const remainingAboveThreshold = remainingAmount >= threshold;

      if (isFreeShipping && !remainingAboveThreshold && !penaltyAlreadyApplied) {
        deductions.push({ label: "배송비 차감", amount: fee });
        refundAmount -= fee;
      }

      // 착불 반품비 추가 차감
      deductions.push({ label: "반품 배송비 차감", amount: fee });
      refundAmount -= fee;
    }
  }

  return {
    itemAmount,
    orderItemsAmount,
    paidShippingFee,
    remainingAmount,
    isLastItem: isLastActiveItem.value,
    isFreeShipping: paidShippingFee === 0,
    penaltyAlreadyApplied,
    additions,
    deductions,
    refundAmount: Math.max(0, refundAmount),
  };
});

// 취소 확인
const handleConfirm = async () => {
  if (!canConfirm.value || props.loading || !props.orderItem) return;

  const preview = calculateRefundPreview.value;
  if (!preview) return;

  // 환불 금액 요약 생성
  let refundSummary = `\n\n━━━ 환불 금액 계산 ━━━\n`;
  refundSummary += `상품 금액: ${formatPrice(preview.itemAmount)}\n`;

  // 추가 항목 (배송비 환불 등)
  if (preview.additions.length > 0) {
    preview.additions.forEach((a) => {
      refundSummary += `${a.label}: +${formatPrice(a.amount)}\n`;
    });
  }

  // 차감 항목
  if (preview.deductions.length > 0) {
    preview.deductions.forEach((d) => {
      refundSummary += `${d.label}: -${formatPrice(d.amount)}\n`;
    });
  }

  refundSummary += `━━━━━━━━━━━━━━━━\n`;
  refundSummary += `환불 금액: ${formatPrice(preview.refundAmount)}`;

  if (preview.isLastItem) {
    refundSummary += `\n(마지막 상품)`;
  }

  const typeLabels: Record<CancelType, string> = {
    customer_request: "반품 승인 (고객 귀책)",
    customer_request_cod: "반품 승인 (착불 차감)",
    seller_cancel: "직권 취소 (판매자 귀책)",
  };

  const confirmMessage =
    `[${typeLabels[selectedCancelType.value as CancelType]}]\n` +
    `"${props.orderItem.productName}" 취소하시겠습니까?` +
    refundSummary;

  const confirmed = await showConfirm(confirmMessage, {
    confirmText: "취소 승인",
    cancelText: "돌아가기",
    variant: "destructive",
  });

  if (!confirmed) return;

  emit("confirm", {
    cancelType: selectedCancelType.value as CancelType,
    adminMemo: adminMemo.value.trim(),
    cancelReason: getFinalCancelReason(),
  });
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedCancelType.value = "";
  adminMemo.value = "";
  emit("close");
};

// 모달 열릴 때 상태 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedCancelType.value = "";
      adminMemo.value = "";
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && orderItem && order"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 배경 오버레이 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- 다이얼로그 카드 -->
        <Card
          class="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        >
          <CardHeader class="pb-4 sticky top-0 bg-background z-10">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle class="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle class="text-heading">관리자 주문 취소</CardTitle>
                  <p class="text-body text-muted-foreground mt-1">
                    취소 유형을 선택해주세요
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 -mr-2 -mt-2"
                :disabled="loading"
                @click="handleClose"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- 취소 불가 상태 안내 -->
            <div
              v-if="!isCancelableStatus"
              class="py-8 text-center text-muted-foreground"
            >
              <AlertTriangle
                class="w-12 h-12 mx-auto mb-3 opacity-50 text-destructive"
              />
              <p class="font-medium">현재 상태에서는 취소할 수 없습니다.</p>
              <p class="text-caption mt-1">
                결제완료, 배송준비중, 반품도착 상태에서만 취소 가능합니다.
              </p>
            </div>

            <template v-else>
              <!-- 상품 정보 -->
              <Card class="rounded-2xl overflow-hidden">
                <CardContent class="flex gap-4 p-4">
                  <ProductThumbnail
                    :image-url="orderItem.product?.imageUrl"
                    class="flex-shrink-0"
                  />
                  <div class="flex-1 flex flex-col min-w-0">
                    <h3
                      class="text-body font-medium text-foreground line-clamp-2"
                    >
                      {{ orderItem.productName }}
                    </h3>
                    <p class="text-body text-muted-foreground mt-1">
                      <template v-if="orderItem.options"
                        >{{ orderItem.options }} /
                      </template>
                      {{ orderItem.quantity }}개
                    </p>
                    <div class="flex items-center justify-between mt-1">
                      <p class="text-body font-medium text-foreground">
                        {{
                          formatPrice(
                            Number(orderItem.productPrice) * orderItem.quantity,
                          )
                        }}
                      </p>
                      <span
                        class="text-caption px-2 py-0.5 rounded-full"
                        :class="{
                          'bg-blue-50 text-blue-700':
                            orderItem.status === 'payment_confirmed',
                          'bg-yellow-50 text-yellow-700':
                            orderItem.status === 'preparing',
                          'bg-orange-50 text-orange-700':
                            orderItem.status === 'return_received',
                        }"
                      >
                        {{ getStatusLabel(orderItem.status) }}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- 취소 유형 선택 -->
              <div class="space-y-3">
                <Label class="text-body font-medium">취소 유형</Label>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for="option in cancelTypeOptions"
                    :key="option.value"
                    type="button"
                    class="px-4 py-3 text-left rounded-lg border transition-colors"
                    :class="[
                      selectedCancelType === option.value
                        ? 'ring-2 ring-ring ring-offset-2 bg-destructive/5 border-destructive/30'
                        : 'border-border hover:bg-muted/50',
                    ]"
                    :disabled="loading"
                    @click="selectCancelType(option.value)"
                  >
                    <span class="text-body font-medium block">{{
                      option.label
                    }}</span>
                    <span class="text-caption text-muted-foreground">{{
                      option.description
                    }}</span>
                  </button>
                </div>
              </div>

              <!-- 내부 관리용 메모 -->
              <Transition name="slide">
                <div v-if="selectedCancelType" class="space-y-4">
                  <Separator />

                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <FileText class="w-4 h-4 text-muted-foreground" />
                      <Label class="text-body font-medium"
                        >내부 관리용 메모</Label
                      >
                    </div>
                    <Textarea
                      v-model="adminMemo"
                      placeholder="내부 관리용 메모를 입력해주세요 (선택)"
                      class="min-h-[80px] resize-none"
                      :disabled="loading"
                    />
                  </div>
                </div>
              </Transition>

              <!-- 환불 안내 -->
              <div
                class="flex items-start gap-2 p-3 bg-primary/10 rounded-lg text-primary"
              >
                <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p class="text-caption">
                  취소 승인 시 결제 수단에 따라 즉시 ~ 3영업일 내 환불이
                  진행됩니다.
                </p>
              </div>

              <!-- 버튼 영역 -->
              <div class="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  class="flex-1 font-medium"
                  :disabled="loading"
                  @click="handleClose"
                >
                  닫기
                </Button>
                <Button
                  variant="destructive"
                  class="flex-1"
                  :disabled="!canConfirm || loading"
                  @click="handleConfirm"
                >
                  <LoadingSpinner
                    v-if="loading"
                    variant="spinner"
                    size="sm"
                    color="white"
                    :center="false"
                    class="mr-2"
                  />
                  {{ loading ? "처리 중..." : "취소 승인" }}
                </Button>
              </div>
            </template>
          </CardContent>
        </Card>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
