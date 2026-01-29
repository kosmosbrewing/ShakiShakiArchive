<script setup lang="ts">
// 반품 요청 모달 컴포넌트
// 반품 사유 타입 선택 + 상세 사유 입력

import { ref, computed, watch, nextTick } from "vue";
import { useAlert } from "@/composables/useAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, RotateCcw, Info } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import { RETURN_REASON_OPTIONS } from "@/lib/constants/order";
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
    data: { orderItemId: number; reason: string; reasonType: ReturnReasonType },
  ): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

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
const handleConfirm = async () => {
  if (!canConfirm.value || props.loading || !props.orderItem) return;

  // 최종 확인
  const confirmed = await showConfirm(
    "정말 반품을 요청하시겠습니까?\n단순 변심 왕복 배송비가 차감된 후 환불되며,\n상품 검수 결과 사용 흔적이 있을 경우\n반품이 거부될 수 있습니다.",
    { confirmText: "반품 요청", cancelText: "돌아가기" },
  );

  if (!confirmed) return;

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
  },
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
                <div class="p-2 bg-destructive/10 rounded-full">
                  <RotateCcw class="w-5 h-5 text-destructive" />
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
                      >{{ orderItem.options }} / </template
                    >{{ orderItem.quantity }}개
                  </p>
                  <p class="text-body font-medium text-foreground mt-1">
                    {{
                      formatPrice(
                        Number(orderItem.productPrice) * orderItem.quantity,
                      )
                    }}
                  </p>
                </div>
              </CardContent>
            </Card>

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
                      ? 'ring-2 ring-ring ring-offset-2 font-medium'
                      : 'border-border hover:bg-muted/50',
                  ]"
                  :disabled="loading"
                  @click="selectReasonType(reason.value)"
                >
                  {{ reason.label }}
                </button>
              </div>
            </div>

            <!-- 상세 사유 입력 (기타 선택 시에만 표시) -->
            <Transition name="slide">
              <div v-if="selectedReasonType === 'other'" class="space-y-2">
                <Label for="detail-reason" class="text-body font-medium">
                  상세 사유 입력
                </Label>
                <Textarea
                  id="detail-reason"
                  ref="detailReasonInput"
                  v-model="detailReason"
                  placeholder="반품 사유를 입력해주세요"
                  class="min-h-[80px] resize-none"
                  :disabled="loading"
                />
              </div>
            </Transition>

            <!-- 반품 이용약관 -->
            <div class="p-3 bg-primary/10 rounded-lg space-y-2">
              <div class="flex items-center gap-1.5 text-primary">
                <Info class="w-3.5 h-3.5 flex-shrink-0" />
                <span class="text-caption font-medium">반품 안내</span>
              </div>
              <ul class="text-caption text-primary space-y-1 pl-1">
                <li>
                  • 반품 신청 후, 직접 원하시는 택배사를 이용해 발송지로
                  보내주세요.
                </li>
                <li>
                  • 수령 후 7일 이내 신청, 14일 이내 도착 시 환불 가능합니다.
                </li>
                <li>• 단순 변심 시 왕복 배송비가 차감됩니다.</li>
                <li>• 불량/오배송 시 반품 배송비는 무료입니다.</li>
                <li>• 상품 훼손 시 환불 불가 (라벨제거/세탁/착용 등)</li>
              </ul>
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
