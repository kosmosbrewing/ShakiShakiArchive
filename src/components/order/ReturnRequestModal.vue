<script setup lang="ts">
// 반품 요청 모달 컴포넌트
// 반품 사유 타입 선택 + 상세 사유 입력

import { ref, computed, watch, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, RotateCcw, Info } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import { RETURN_REASON_OPTIONS } from "@/lib/constants/order";
import { ORDER_MESSAGES } from "@/lib/messages";
import type { OrderItem, ReturnReasonType } from "@/types/api";

interface Props {
  open: boolean;
  orderItem: OrderItem | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    data: { orderItemId: number; reason: string; reasonType: ReturnReasonType }
  ): void;
}>();

// 선택된 사유 타입
const selectedReasonType = ref<ReturnReasonType | "">("");
const detailReason = ref<string>("");
const detailReasonInput = ref<any>(null);

// 최종 반품 사유
const finalReason = computed(() => {
  return detailReason.value.trim() || getReasonLabel(selectedReasonType.value);
});

// 사유 타입에 해당하는 라벨 반환
const getReasonLabel = (type: ReturnReasonType | "") => {
  const option = RETURN_REASON_OPTIONS.find((opt) => opt.value === type);
  return option?.label || "";
};

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  if (!selectedReasonType.value) return false;
  // "기타"인 경우 상세 사유 필수
  if (selectedReasonType.value === "other" && !detailReason.value.trim())
    return false;
  return true;
});

// 사유 타입 선택
const selectReasonType = async (type: ReturnReasonType) => {
  selectedReasonType.value = type;
  if (type === "other") {
    await nextTick();
    const textarea = detailReasonInput.value?.$el || detailReasonInput.value;
    textarea?.focus();
  }
};

// 반품 요청 확인
const handleConfirm = () => {
  if (!canConfirm.value || props.loading || !props.orderItem) return;

  emit("confirm", {
    orderItemId: props.orderItem.id,
    reason: finalReason.value,
    reasonType: selectedReasonType.value as ReturnReasonType,
  });
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedReasonType.value = "";
  detailReason.value = "";
  emit("close");
};

// 모달 열릴 때 상태 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedReasonType.value = "";
      detailReason.value = "";
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && orderItem"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 배경 오버레이 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- 다이얼로그 카드 -->
        <Card class="relative z-10 w-full max-w-md shadow-xl">
          <CardHeader class="pb-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-amber-100 rounded-full">
                  <RotateCcw class="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle class="text-heading">반품 요청</CardTitle>
                  <p class="text-body text-muted-foreground mt-1">
                    반품 사유를 선택해주세요
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
            <!-- 상품 정보 -->
            <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <ProductThumbnail
                :image-url="orderItem.product?.imageUrl"
                class="w-14 h-14 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-body font-medium truncate">
                  {{ orderItem.productName }}
                </p>
                <p class="text-caption text-muted-foreground">
                  <template v-if="orderItem.options"
                    >{{ orderItem.options }} / </template
                  >{{ orderItem.quantity }}개
                </p>
                <p class="text-body font-medium mt-1">
                  {{
                    formatPrice(
                      Number(orderItem.productPrice) * orderItem.quantity
                    )
                  }}
                </p>
              </div>
            </div>

            <!-- 반품 사유 선택 -->
            <div class="space-y-2">
              <Label class="text-body font-medium">반품 사유</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="reason in RETURN_REASON_OPTIONS"
                  :key="reason.value"
                  type="button"
                  class="px-3 py-2.5 text-body text-left rounded-md border transition-colors"
                  :class="[
                    selectedReasonType === reason.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                      : 'border-border hover:border-amber-300 hover:bg-amber-50/50',
                  ]"
                  :disabled="loading"
                  @click="selectReasonType(reason.value)"
                >
                  {{ reason.label }}
                </button>
              </div>
            </div>

            <!-- 상세 사유 입력 -->
            <Transition name="slide">
              <div
                v-if="selectedReasonType === 'other' || selectedReasonType"
                class="space-y-2"
              >
                <Label for="detail-reason" class="text-body font-medium">
                  상세 사유
                  <span
                    v-if="selectedReasonType !== 'other'"
                    class="text-muted-foreground font-normal"
                    >(선택)</span
                  >
                </Label>
                <Textarea
                  id="detail-reason"
                  ref="detailReasonInput"
                  v-model="detailReason"
                  :placeholder="
                    selectedReasonType === 'defect'
                      ? '불량 부위나 상태를 자세히 설명해주세요'
                      : selectedReasonType === 'wrong_item'
                        ? '받으신 상품과 주문 상품의 차이점을 설명해주세요'
                        : '반품 사유를 자세히 입력해주세요'
                  "
                  class="min-h-[80px] resize-none"
                  :disabled="loading"
                />
              </div>
            </Transition>

            <!-- 반품 안내 -->
            <div
              class="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-700"
            >
              <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p class="text-caption">{{ ORDER_MESSAGES.returnGuide }}</p>
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
                class="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
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
                {{ loading ? "처리 중..." : "반품 요청" }}
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
