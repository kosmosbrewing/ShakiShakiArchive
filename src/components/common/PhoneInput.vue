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
  <div class="flex items-center gap-2 max-w-sm">
    <select
      :value="phone1"
      @change="emit('update:phone1', ($event.target as HTMLSelectElement).value)"
      class="border border-border rounded px-2 py-2 w-20 bg-background text-foreground"
    >
      <option v-for="opt in prefixOptions" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>
    <span class="text-muted-foreground">-</span>
    <Input
      :model-value="phone2"
      @update:model-value="emit('update:phone2', String($event))"
      type="text"
      maxlength="4"
      class="text-center"
      placeholder="0000"
    />
    <span class="text-muted-foreground">-</span>
    <Input
      :model-value="phone3"
      @update:model-value="emit('update:phone3', String($event))"
      type="text"
      maxlength="4"
      class="text-center"
      placeholder="0000"
    />
  </div>
</template>
