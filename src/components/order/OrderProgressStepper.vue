<script setup lang="ts">
// src/components/order/OrderProgressStepper.vue
// 주문 진행 상황을 4단계 수평 스테퍼로 시각화

import { computed } from "vue";
import type { OrderStatus, OrderItemStatus } from "@/types/api";
import { getStepIndex } from "@/lib/constants/orderStatus";
import { CheckCircle, Package, Truck, MapPin } from "lucide-vue-next";

const props = defineProps<{
  status: OrderStatus | OrderItemStatus;
}>();

// 4단계 스텝 정의
const steps = [
  { label: "결제완료", icon: CheckCircle },
  { label: "배송준비중", icon: Package },
  { label: "배송중", icon: Truck },
  { label: "배송완료", icon: MapPin },
];

// 현재 활성 스텝 인덱스
const currentStep = computed(() => getStepIndex(props.status));
</script>

<template>
  <div class="w-full py-3 px-4 sm:px-6">
    <!-- 아이콘 + 연결선 행 -->
    <div class="flex items-center">
      <template v-for="(step, index) in steps" :key="'icon-' + index">
        <div
          class="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0 transition-colors"
          :class="
            index <= currentStep
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground'
          "
        >
          <component
            :is="step.icon"
            class="w-3 h-3 sm:w-3.5 sm:h-3.5"
          />
        </div>

        <!-- 연결선 -->
        <div
          v-if="index < steps.length - 1"
          class="flex-1 mx-1 sm:mx-2"
        >
          <div
            v-if="index < currentStep"
            class="h-0.5 bg-primary rounded-full"
          />
          <div
            v-else
            class="border-t-2 border-dashed border-muted-foreground/25"
          />
        </div>
      </template>
    </div>

    <!-- 라벨 행: 아이콘 행과 동일한 flex 구조로 위치 정렬 -->
    <div class="flex mt-1.5">
      <template v-for="(step, index) in steps" :key="'label-' + index">
        <!-- 아이콘과 동일한 너비의 래퍼 + flex 중앙 정렬로 텍스트 양쪽 균등 오버플로우 -->
        <div class="w-6 sm:w-7 flex-shrink-0 flex justify-center">
          <span
            class="text-[10px] sm:text-xs font-medium whitespace-nowrap"
            :class="
              index <= currentStep
                ? 'text-primary'
                : 'text-muted-foreground'
            "
          >
            {{ step.label }}
          </span>
        </div>

        <!-- 연결선 영역과 동일한 간격 -->
        <div
          v-if="index < steps.length - 1"
          class="flex-1 mx-1 sm:mx-2"
        />
      </template>
    </div>
  </div>
</template>
