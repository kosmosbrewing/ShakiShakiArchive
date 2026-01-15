<script setup lang="ts">
// 주문 취소 다이얼로그 컴포넌트
import { ref, computed, nextTick } from "vue";
import { useAlert } from "@/composables/useAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/common";
import { X, AlertTriangle } from "lucide-vue-next";

interface Props {
  open: boolean;
  productName?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  productName: "",
  loading: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", reason: string): void;
}>();

// Alert composable
const { showConfirm } = useAlert();

// 취소 사유 목록
const cancelReasons = [
  "단순 변심",
  "상품 옵션 변경",
  "다른 상품으로 재주문",
  "배송 지연",
  "기타",
];

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
    { confirmText: "취소하기", cancelText: "돌아가기" }
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
        v-if="open"
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
                <div class="p-2 bg-primary/10 rounded-full">
                  <AlertTriangle class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle class="text-heading">주문 취소</CardTitle>
                  <p
                    v-if="productName"
                    class="text-body text-muted-foreground mt-1"
                  >
                    {{ productName }}
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
            <!-- 안내 메시지 -->
            <p class="text-body text-muted-foreground">
              주문 취소 사유를 선택해주세요. 결제가 완료된 주문은 환불
              처리됩니다.
            </p>

            <!-- 취소 사유 선택 -->
            <div class="space-y-2">
              <Label class="text-body font-medium">취소 사유</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="reason in cancelReasons"
                  :key="reason"
                  type="button"
                  class="px-3 py-2 text-body text-left rounded-md border transition-colors"
                  :class="[
                    selectedReason === reason
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50',
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
                class="flex-1 hover:bg-primary/80"
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
