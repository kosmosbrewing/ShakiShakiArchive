<script setup lang="ts">
// 주문 취소 다이얼로그 컴포넌트
import { ref, computed, nextTick } from "vue";
import { useAlert } from "@/composables/useAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
import { X, AlertTriangle, Info } from "lucide-vue-next";
import { formatPrice } from "@/lib/formatters";
import type { OrderItem } from "@/types/api";

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
  (e: "confirm", reason: string): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

// 취소 사유 목록
const cancelReasons = ["단순 변심", "상품 옵션 변경", "배송 지연", "기타"];

const selectedReason = ref<string>("");
const customReason = ref<string>("");
const customReasonInput = ref<any>(null);

// 최종 취소 사유
const finalReason = computed(() => {
  if (selectedReason.value === "기타") {
    return customReason.value.trim() || "기타";
  }
  return selectedReason.value;
});

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  if (!selectedReason.value) return false;
  if (selectedReason.value === "기타" && !customReason.value.trim())
    return false;
  return true;
});

// 취소 확인
const handleConfirm = async () => {
  if (!canConfirm.value || props.loading) return;

  // 최종 확인
  const confirmed = await showConfirm(
    "주문을 취소하시겠습니까?\n취소된 주문은 되돌릴 수 없습니다.",
    { confirmText: "취소하기", cancelText: "돌아가기" },
  );

  if (!confirmed) return;

  emit("confirm", finalReason.value);
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedReason.value = "";
  customReason.value = "";
  emit("close");
};

// 사유 선택
const selectReason = async (reason: string) => {
  selectedReason.value = reason;
  if (reason !== "기타") {
    customReason.value = "";
  } else {
    // "기타" 선택 시 상세 사유 입력란으로 포커스 이동
    await nextTick();
    // Textarea 컴포넌트의 $el을 통해 실제 textarea 엘리먼트에 접근
    const textarea = customReasonInput.value?.$el || customReasonInput.value;
    textarea?.focus();
  }
};
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
                  <AlertTriangle class="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle class="text-heading">주문 취소</CardTitle>
                  <p class="text-body text-muted-foreground mt-1">
                    주문 취소 사유를 선택해주세요
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
                  <h3 class="text-body font-medium text-foreground line-clamp-2">
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
                        Number(orderItem.productPrice) * orderItem.quantity
                      )
                    }}
                  </p>
                </div>
              </CardContent>
            </Card>

            <!-- 취소 사유 선택 -->
            <div class="space-y-2">
              <Label class="text-body font-medium">취소 사유</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="reason in cancelReasons"
                  :key="reason"
                  type="button"
                  class="px-3 py-2.5 text-body text-left rounded-md border transition-colors"
                  :class="[
                    selectedReason === reason
                      ? 'ring-2 ring-ring ring-offset-2 font-medium'
                      : 'border-border hover:bg-muted/50',
                  ]"
                  :disabled="loading"
                  @click="selectReason(reason)"
                >
                  {{ reason }}
                </button>
              </div>
            </div>

            <!-- 기타 사유 입력 -->
            <Transition name="slide">
              <div v-if="selectedReason === '기타'" class="space-y-2">
                <Label for="custom-reason" class="text-body font-medium">
                  상세 사유 입력
                </Label>
                <Textarea
                  id="custom-reason"
                  ref="customReasonInput"
                  v-model="customReason"
                  placeholder="취소 사유를 입력해주세요"
                  class="min-h-[80px] resize-none"
                  :disabled="loading"
                />
              </div>
            </Transition>

            <!-- 환불 안내 -->
            <div class="p-3 bg-primary/10 rounded-lg space-y-2">
              <div class="flex items-center gap-1.5 text-primary">
                <Info class="w-3.5 h-3.5 flex-shrink-0" />
                <span class="text-caption font-medium">환불 안내</span>
              </div>
              <ul class="text-caption text-primary space-y-1 pl-1">
                <li>• 환불은 결제 수단에 따라 즉시~3영업일 이내 완료됩니다.</li>
                <li>• 정확한 환불 일정은 카드사/은행에 따라 상이할 수 있습니다.</li>
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
                {{ loading ? "처리 중..." : "주문 취소" }}
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
