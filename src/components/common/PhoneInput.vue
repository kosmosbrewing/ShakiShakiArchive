<script setup lang="ts">
// src/components/common/PhoneInput.vue
// 전화번호 3분할 입력 컴포넌트

import { ref } from "vue";
import { Input } from "@/components/ui/input";

interface Props {
  phone1: string;
  phone2: string;
  phone3: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: "update:phone1", value: string): void;
  (e: "update:phone2", value: string): void;
  (e: "update:phone3", value: string): void;
}>();

// 첫 번째 자리 옵션
const prefixOptions = ["010", "011", "016", "017", "018", "019"];

// Input refs
const phone2InputRef = ref<InstanceType<typeof Input> | null>(null);

// 외부에서 첫 번째 입력 필드에 focus (phone2, 실제로 사용자가 입력하는 첫 번째 필드)
const focusFirst = () => {
  phone2InputRef.value?.$el?.focus();
};

defineExpose({ focusFirst });
</script>

<template>
  <div class="flex items-center gap-1.5 sm:gap-2 w-full">
    <!-- 010 Select - 고정 너비 -->
    <select
      :value="phone1"
      @change="
        emit('update:phone1', ($event.target as HTMLSelectElement).value)
      "
      class="w-[4.2rem] sm:w-20 h-10 text-center rounded-md border border-input bg-background px-1 sm:px-2 py-2 text-caption sm:text-body ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option v-for="opt in prefixOptions" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>

    <span class="text-muted-foreground text-caption sm:text-body">-</span>

    <!-- 중간 4자리 -->
    <Input
      ref="phone2InputRef"
      :model-value="phone2"
      @update:model-value="emit('update:phone2', String($event))"
      type="text"
      inputmode="numeric"
      maxlength="4"
      class="flex-1 min-w-0 h-10 text-center text-caption sm:text-body"
      placeholder="0000"
    />

    <span class="text-muted-foreground text-caption sm:text-body">-</span>

    <!-- 마지막 4자리 -->
    <Input
      :model-value="phone3"
      @update:model-value="emit('update:phone3', String($event))"
      type="text"
      inputmode="numeric"
      maxlength="4"
      class="flex-1 min-w-0 h-10 text-center text-caption sm:text-body"
      placeholder="0000"
    />
  </div>
</template>
