<script setup lang="ts">
// src/components/common/PhoneInput.vue
// 전화번호 3분할 입력 컴포넌트

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
</script>

<template>
  <div class="flex items-center gap-2 w-full">
    <div class="relative">
      <select
        :value="phone1"
        @change="
          emit('update:phone1', ($event.target as HTMLSelectElement).value)
        "
        class="flex h-10 w-[90px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option v-for="opt in prefixOptions" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <span class="text-muted-foreground">-</span>

    <Input
      :model-value="phone2"
      @update:model-value="emit('update:phone2', String($event))"
      type="text"
      maxlength="4"
      class="flex-1 h-10 text-center text-body"
      placeholder="0000"
    />

    <span class="text-muted-foreground">-</span>

    <Input
      :model-value="phone3"
      @update:model-value="emit('update:phone3', String($event))"
      type="text"
      maxlength="4"
      class="flex-1 h-10 text-center text-body"
      placeholder="0000"
    />
  </div>
</template>
