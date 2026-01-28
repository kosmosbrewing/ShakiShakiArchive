<script setup lang="ts">
// 관리자 주문 취소 모달 컴포넌트
// 고객 요청에 따른 취소 승인 / 판매자 직권 취소 두 가지 상황 지원

import { ref, computed, watch, nextTick } from "vue";
import { useAlert } from "@/composables/useAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, AlertTriangle, Info, MessageSquare, FileText } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import type { OrderItem } from "@/types/api";

// 취소 유형
type CancelType = "customer_request" | "seller_cancel";

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
  (e: "confirm", data: {
    cancelType: CancelType;
    customerMessage: string;
    adminMemo: string;
    cancelReason: string;
  }): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

// 취소 유형
const selectedCancelType = ref<CancelType | "">("");

// 취소 사유 옵션
const cancelTypeOptions = [
  {
    value: "customer_request" as CancelType,
    label: "고객 요청 취소",
    description: "고객의 반품/취소 요청을 승인",
  },
  {
    value: "seller_cancel" as CancelType,
    label: "판매자 직권 취소",
    description: "재고 부족, 상품 오류 등",
  },
];

// 고객 안내 메시지 템플릿
const customerMessageTemplates: Record<CancelType, string> = {
  customer_request:
    "안녕하세요, shakishaki archive입니다.\n요청하신 반품(취소) 신청이 정상적으로 승인되었습니다.\n결제하신 수단에 따라 1~5일 이내에 환불이 완료될 예정입니다.\n저희 서비스를 이용해 주셔서 감사합니다.",
  seller_cancel:
    "안녕하세요, shakishaki archive입니다.\n고객님께서 주문하신 상품이 아쉽게도 갑작스러운 재고 소진(또는 상품 오류)으로 인해 준비가 어렵게 되었습니다.\n큰 기대를 하셨을 텐데 불편을 드려 진심으로 사과드립니다.\n본 주문은 즉시 전액 환불 처리될 예정이며, 빠른 시일 내에 더 좋은 상품으로 찾아뵙겠습니다.",
};

// 내부 관리용 메모 템플릿
const adminMemoTemplates: Record<CancelType, string> = {
  customer_request: "[반품승인] 고객 요청에 따른 상품 회수 확인 후 취소 처리 완료.",
  seller_cancel: "[직권취소] 재고부족/상품오류로 인한 관리자 취소. 고객에게 사과 메시지 발송 완료.",
};

// 입력 필드
const customerMessage = ref("");
const adminMemo = ref("");
const customerMessageInput = ref<any>(null);

// 취소 유형 선택 시 템플릿 자동 적용
const selectCancelType = async (type: CancelType) => {
  selectedCancelType.value = type;
  customerMessage.value = customerMessageTemplates[type];
  adminMemo.value = adminMemoTemplates[type];
  await nextTick();
  customerMessageInput.value?.$el?.focus();
};

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  if (!selectedCancelType.value) return false;
  if (!customerMessage.value.trim()) return false;
  return true;
});

// 취소 가능 상태 확인 (결제완료, 반품 배송 중, 반품 도착)
const isCancelableStatus = computed(() => {
  if (!props.orderItem) return false;
  const cancelableStatuses = ["payment_confirmed", "return_in_transit", "return_received"];
  return cancelableStatuses.includes(props.orderItem.status);
});

// 상태 라벨
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    payment_confirmed: "결제완료",
    return_in_transit: "반품 배송 중",
    return_received: "반품 도착",
  };
  return statusMap[status] || status;
};

// 최종 취소 사유 생성
const getFinalCancelReason = () => {
  if (selectedCancelType.value === "customer_request") {
    return "고객 요청에 따른 반품/취소 승인";
  }
  return "판매자 사정에 의한 주문 취소 (재고 부족/상품 오류)";
};

// 취소 확인
const handleConfirm = async () => {
  if (!canConfirm.value || props.loading || !props.orderItem) return;

  const confirmMessage =
    selectedCancelType.value === "customer_request"
      ? "고객 요청에 따른 취소를 승인하시겠습니까?\n취소된 주문은 되돌릴 수 없습니다."
      : "해당 주문을 직권 취소하시겠습니까?\n고객에게 취소 안내 메시지가 발송됩니다.";

  const confirmed = await showConfirm(confirmMessage, {
    confirmText: "취소 승인",
    cancelText: "돌아가기",
    variant: "destructive",
  });

  if (!confirmed) return;

  emit("confirm", {
    cancelType: selectedCancelType.value as CancelType,
    customerMessage: customerMessage.value.trim(),
    adminMemo: adminMemo.value.trim(),
    cancelReason: getFinalCancelReason(),
  });
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedCancelType.value = "";
  customerMessage.value = "";
  adminMemo.value = "";
  emit("close");
};

// 모달 열릴 때 상태 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedCancelType.value = "";
      customerMessage.value = "";
      adminMemo.value = "";
    }
  }
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
        <Card class="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
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
              <AlertTriangle class="w-12 h-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p class="font-medium">현재 상태에서는 취소할 수 없습니다.</p>
              <p class="text-caption mt-1">
                결제완료, 반품진행중 상태에서만 취소 가능합니다.
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
                    <h3 class="text-body font-medium text-foreground line-clamp-2">
                      {{ orderItem.productName }}
                    </h3>
                    <p class="text-body text-muted-foreground mt-1">
                      <template v-if="orderItem.options">{{ orderItem.options }} / </template>
                      {{ orderItem.quantity }}개
                    </p>
                    <div class="flex items-center justify-between mt-1">
                      <p class="text-body font-medium text-foreground">
                        {{ formatPrice(Number(orderItem.productPrice) * orderItem.quantity) }}
                      </p>
                      <span
                        class="text-caption px-2 py-0.5 rounded-full"
                        :class="{
                          'bg-blue-50 text-blue-700': orderItem.status === 'payment_confirmed',
                          'bg-orange-50 text-orange-700': orderItem.status === 'return_in_transit' || orderItem.status === 'return_received',
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
                    <span class="text-body font-medium block">{{ option.label }}</span>
                    <span class="text-caption text-muted-foreground">{{ option.description }}</span>
                  </button>
                </div>
              </div>

              <!-- 고객 안내 메시지 -->
              <Transition name="slide">
                <div v-if="selectedCancelType" class="space-y-4">
                  <Separator />

                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <MessageSquare class="w-4 h-4 text-primary" />
                      <Label class="text-body font-medium">고객 안내 메시지</Label>
                    </div>
                    <Textarea
                      ref="customerMessageInput"
                      v-model="customerMessage"
                      placeholder="고객에게 발송될 메시지를 입력해주세요"
                      class="min-h-[120px] resize-none"
                      :disabled="loading"
                    />
                    <p class="text-caption text-muted-foreground">
                      * 해당 메시지는 고객에게 알림으로 발송됩니다.
                    </p>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <FileText class="w-4 h-4 text-muted-foreground" />
                      <Label class="text-body font-medium">내부 관리용 메모</Label>
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
                  취소 승인 시 결제 수단에 따라 즉시 ~ 5영업일 내 환불이 진행됩니다.
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
