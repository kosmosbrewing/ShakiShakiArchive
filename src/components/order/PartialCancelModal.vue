<script setup lang="ts">
// 부분 취소 모달 컴포넌트
// 취소할 아이템 선택 + 취소 사유 입력 + 환불 예상 금액 표시

import { ref, computed, watch } from "vue";
import { useAlert } from "@/composables/useAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, AlertTriangle, Package, Check, Info } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import { CANCEL_REASON_OPTIONS, isCancelable } from "@/lib/constants/order";
import { ORDER_MESSAGES } from "@/lib/messages";
import type { OrderItem, PartialCancelRefundDetails } from "@/types/api";

interface Props {
  open: boolean;
  orderItems: OrderItem[];
  loading?: boolean;
  refundDetails?: PartialCancelRefundDetails | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  refundDetails: null,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", data: { cancelItems: number[]; cancelReason: string }): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

// 선택된 아이템 ID 목록
const selectedItemIds = ref<number[]>([]);
const selectedReason = ref<string>("");
const customReason = ref<string>("");

// 취소 가능한 아이템만 필터링
const cancelableItems = computed(() => {
  return props.orderItems.filter((item) => isCancelable(item.status));
});

// 모든 아이템 선택 여부
const isAllSelected = computed(() => {
  return (
    cancelableItems.value.length > 0 &&
    selectedItemIds.value.length === cancelableItems.value.length
  );
});

// 최종 취소 사유
const finalReason = computed(() => {
  if (selectedReason.value === "other") {
    return customReason.value.trim() || "기타";
  }
  const option = CANCEL_REASON_OPTIONS.find(
    (opt) => opt.value === selectedReason.value
  );
  return option?.label || selectedReason.value;
});

// 선택된 아이템들의 총 금액
const selectedTotalPrice = computed(() => {
  return selectedItemIds.value.reduce((total, itemId) => {
    const item = props.orderItems.find((i) => i.id === itemId);
    if (item) {
      return total + Number(item.productPrice) * item.quantity;
    }
    return total;
  }, 0);
});

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  if (selectedItemIds.value.length === 0) return false;
  if (!selectedReason.value) return false;
  if (selectedReason.value === "other" && !customReason.value.trim())
    return false;
  return true;
});

// 전체 선택/해제 토글
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItemIds.value = [];
  } else {
    selectedItemIds.value = cancelableItems.value.map((item) => item.id);
  }
};

// 개별 아이템 선택 토글
const toggleItem = (itemId: number) => {
  const index = selectedItemIds.value.indexOf(itemId);
  if (index === -1) {
    selectedItemIds.value.push(itemId);
  } else {
    selectedItemIds.value.splice(index, 1);
  }
};

// 아이템 선택 여부 확인
const isItemSelected = (itemId: number) => {
  return selectedItemIds.value.includes(itemId);
};

// 취소 확인
const handleConfirm = async () => {
  if (!canConfirm.value || props.loading) return;

  // 최종 확인
  const confirmed = await showConfirm(
    "선택한 상품을 취소하시겠습니까?\n취소된 주문은 되돌릴 수 없습니다.",
    { confirmText: "취소하기", cancelText: "돌아가기" }
  );

  if (!confirmed) return;

  emit("confirm", {
    cancelItems: selectedItemIds.value,
    cancelReason: finalReason.value,
  });
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedItemIds.value = [];
  selectedReason.value = "";
  customReason.value = "";
  emit("close");
};

// 모달 열릴 때 상태 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedItemIds.value = [];
      selectedReason.value = "";
      customReason.value = "";
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
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
                  <CardTitle class="text-heading">부분 취소</CardTitle>
                  <p class="text-body text-muted-foreground mt-1">
                    취소할 상품을 선택해주세요
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
            <!-- 취소 가능한 아이템이 없는 경우 -->
            <div
              v-if="cancelableItems.length === 0"
              class="py-8 text-center text-muted-foreground"
            >
              <Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>취소 가능한 상품이 없습니다.</p>
            </div>

            <!-- 상품 선택 영역 -->
            <div v-else class="space-y-3">
              <!-- 전체 선택 -->
              <button
                type="button"
                role="checkbox"
                :aria-checked="isAllSelected"
                :aria-label="`모든 ${cancelableItems.length}개 상품 선택`"
                class="flex items-center gap-2 pb-2 w-full text-left"
                :disabled="loading"
                @click="toggleSelectAll"
              >
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  :class="
                    isAllSelected
                      ? 'bg-destructive border-destructive text-white'
                      : 'border-muted-foreground/50 hover:border-destructive'
                  "
                >
                  <Check v-if="isAllSelected" class="w-3 h-3" />
                </div>
                <span class="text-body font-medium">
                  전체 선택 ({{ cancelableItems.length }}개)
                </span>
              </button>

              <Separator />

              <!-- 상품 목록 -->
              <div class="space-y-3 max-h-[240px] overflow-y-auto" role="group" aria-label="취소할 상품 목록">
                <Card
                  v-for="item in cancelableItems"
                  :key="item.id"
                  class="rounded-2xl overflow-hidden cursor-pointer transition-colors"
                  :class="{ 'border-destructive/30 bg-destructive/5': isItemSelected(item.id) }"
                  @click="toggleItem(item.id)"
                >
                  <CardContent class="flex gap-4 p-4">
                    <div
                      class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-1"
                      :class="
                        isItemSelected(item.id)
                          ? 'bg-destructive border-destructive text-white'
                          : 'border-muted-foreground/50 hover:border-destructive'
                      "
                    >
                      <Check v-if="isItemSelected(item.id)" class="w-3 h-3" />
                    </div>
                    <ProductThumbnail
                      :image-url="item.product?.imageUrl"
                      class="flex-shrink-0"
                    />
                    <div class="flex-1 flex flex-col min-w-0">
                      <h3 class="text-body font-medium text-foreground line-clamp-2">
                        {{ item.productName }}
                      </h3>
                      <p class="text-body text-muted-foreground mt-1">
                        <template v-if="item.options">{{ item.options }} / </template>
                        {{ item.quantity }}개
                      </p>
                      <p class="text-body font-medium text-foreground mt-1">
                        {{ formatPrice(Number(item.productPrice) * item.quantity) }}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <!-- 취소 사유 선택 -->
            <div v-if="cancelableItems.length > 0" class="space-y-3 pt-2">
              <Separator />
              <Label class="text-body font-medium">취소 사유</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="reason in CANCEL_REASON_OPTIONS"
                  :key="reason.value"
                  type="button"
                  class="px-3 py-2.5 text-body text-left rounded-md border transition-colors"
                  :class="[
                    selectedReason === reason.value
                      ? 'ring-2 ring-ring ring-offset-2 font-medium'
                      : 'border-border hover:bg-muted/50',
                  ]"
                  :disabled="loading"
                  @click="selectedReason = reason.value"
                >
                  {{ reason.label }}
                </button>
              </div>

              <!-- 기타 사유 입력 -->
              <Transition name="slide">
                <div v-if="selectedReason === 'other'" class="space-y-2">
                  <Label for="custom-reason" class="text-body font-medium">
                    상세 사유 입력
                  </Label>
                  <Textarea
                    id="custom-reason"
                    v-model="customReason"
                    placeholder="취소 사유를 입력해주세요"
                    class="min-h-[80px] resize-none"
                    :disabled="loading"
                  />
                </div>
              </Transition>
            </div>

            <!-- 환불 예상 금액 -->
            <div
              v-if="selectedItemIds.length > 0"
              class="bg-muted/50 rounded-lg p-4 space-y-2"
            >
              <div class="flex justify-between text-body">
                <span class="text-muted-foreground">선택 상품 금액</span>
                <span>{{ formatPrice(selectedTotalPrice) }}</span>
              </div>
              <template v-if="refundDetails">
                <div
                  v-if="refundDetails.shippingRefund > 0"
                  class="flex justify-between text-body"
                >
                  <span class="text-muted-foreground">배송비 환불</span>
                  <span>{{ formatPrice(refundDetails.shippingRefund) }}</span>
                </div>
                <div
                  v-if="refundDetails.penalty > 0"
                  class="flex justify-between text-body text-destructive"
                >
                  <span>취소 수수료</span>
                  <span>-{{ formatPrice(refundDetails.penalty) }}</span>
                </div>
                <Separator />
                <div class="flex justify-between font-bold">
                  <span>예상 환불 금액</span>
                  <span class="text-primary">
                    {{ formatPrice(refundDetails.totalRefund) }}
                  </span>
                </div>
              </template>
            </div>

            <!-- 환불 안내 -->
            <div
              class="flex items-start gap-2 p-3 bg-primary/10 rounded-lg text-primary"
            >
              <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p class="text-caption">{{ ORDER_MESSAGES.refundGuide }}</p>
            </div>

            <!-- 버튼 영역 -->
            <div class="flex gap-3 pt-2">
              <Button
                variant="outline"
                class="flex-1 font-medium"
                :disabled="loading"
                @click="handleClose"
              >
                취소
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
                {{
                  loading
                    ? "처리 중..."
                    : `${selectedItemIds.length}개 상품 취소`
                }}
              </Button>
            </div>
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
