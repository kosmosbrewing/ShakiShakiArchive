<script setup lang="ts">
// 반품 운송장 입력 모달 컴포넌트
// 택배사 선택 + 운송장 번호 입력

import { ref, computed, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common";
import { X, Truck, Info } from "lucide-vue-next";
import { COURIER_OPTIONS } from "@/lib/constants/order";
import { ORDER_MESSAGES } from "@/lib/messages";
import type { Return } from "@/types/api";

interface Props {
  open: boolean;
  returnInfo: Return | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    data: { returnId: string; trackingNumber: string; courierCompany: string }
  ): void;
}>();

// 선택된 택배사
const selectedCourier = ref<string>("");
// 운송장 번호
const trackingNumber = ref<string>("");

// 확인 버튼 활성화 여부
const canConfirm = computed(() => {
  if (!selectedCourier.value) return false;
  if (!trackingNumber.value.trim()) return false;
  return true;
});

// 운송장 번호 입력 시 숫자만 허용
const handleTrackingInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  // 숫자와 하이픈만 허용
  trackingNumber.value = target.value.replace(/[^0-9-]/g, "");
};

// 운송장 등록 확인
const handleConfirm = () => {
  if (!canConfirm.value || props.loading || !props.returnInfo) return;

  emit("confirm", {
    returnId: props.returnInfo.id,
    trackingNumber: trackingNumber.value.trim(),
    courierCompany: selectedCourier.value,
  });
};

// 닫기
const handleClose = () => {
  if (props.loading) return;
  selectedCourier.value = "";
  trackingNumber.value = "";
  emit("close");
};

// 모달 열릴 때 상태 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // 이미 등록된 정보가 있으면 표시
      if (props.returnInfo?.returnCourierCompany) {
        selectedCourier.value = props.returnInfo.returnCourierCompany;
      } else {
        selectedCourier.value = "";
      }
      if (props.returnInfo?.returnTrackingNumber) {
        trackingNumber.value = props.returnInfo.returnTrackingNumber;
      } else {
        trackingNumber.value = "";
      }
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && returnInfo"
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
                <div class="p-2 bg-indigo-100 rounded-full">
                  <Truck class="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle class="text-heading">반품 운송장 등록</CardTitle>
                  <p class="text-body text-muted-foreground mt-1">
                    반품 택배 정보를 입력해주세요
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
            <!-- 택배사 선택 -->
            <div class="space-y-2">
              <Label for="courier" class="text-body font-medium">택배사</Label>
              <Select v-model="selectedCourier" :disabled="loading">
                <SelectTrigger id="courier">
                  <SelectValue placeholder="택배사를 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="courier in COURIER_OPTIONS"
                    :key="courier.value"
                    :value="courier.value"
                  >
                    {{ courier.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- 운송장 번호 입력 -->
            <div class="space-y-2">
              <Label for="tracking-number" class="text-body font-medium"
                >운송장 번호</Label
              >
              <Input
                id="tracking-number"
                v-model="trackingNumber"
                type="text"
                placeholder="운송장 번호를 입력해주세요"
                aria-describedby="tracking-help"
                :disabled="loading"
                @input="handleTrackingInput"
              />
              <p id="tracking-help" class="text-caption text-muted-foreground">
                숫자와 하이픈(-)만 입력 가능합니다
              </p>
            </div>

            <!-- 안내 문구 -->
            <div
              class="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-700"
            >
              <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div class="text-caption space-y-1">
                <p>{{ ORDER_MESSAGES.returnShippingGuide }}</p>
              </div>
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
                class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white"
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
                {{ loading ? "등록 중..." : "운송장 등록" }}
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
</style>
