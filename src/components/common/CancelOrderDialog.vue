<script setup lang="ts">
// 주문 취소 다이얼로그 컴포넌트
import { ref, computed } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertTriangle, Loader2 } from "lucide-vue-next";

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
  if (selectedReason.value === "기타" && !customReason.value.trim()) return false;
  return true;
});

// 취소 확인
const handleConfirm = () => {
  if (!canConfirm.value || props.loading) return;
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
const selectReason = (reason: string) => {
  selectedReason.value = reason;
  if (reason !== "기타") {
    customReason.value = "";
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
                <div class="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle class="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle class="text-heading">주문 취소</CardTitle>
                  <p v-if="productName" class="text-body text-muted-foreground mt-1">
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
              주문 취소 사유를 선택해주세요. 결제가 완료된 주문은 환불 처리됩니다.
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
                class="flex-1"
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
                <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
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
