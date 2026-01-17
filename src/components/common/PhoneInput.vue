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

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:phone1", value: string): void;
  (e: "update:phone2", value: string): void;
  (e: "update:phone3", value: string): void;
  (e: "enter"): void; // 마지막 필드에서 Enter 키 이벤트
}>();

// 첫 번째 자리 옵션
const prefixOptions = ["010", "011", "016", "017", "018", "019"];

// Input refs
const phone2InputRef = ref<InstanceType<typeof Input> | null>(null);
const phone3InputRef = ref<InstanceType<typeof Input> | null>(null);

// 외부에서 첫 번째 입력 필드에 focus (phone2, 실제로 사용자가 입력하는 첫 번째 필드)
const focusFirst = () => {
  phone2InputRef.value?.$el?.focus();
};

// 중간 4자리 입력 처리 (자동 focus 이동)
const handlePhone2Input = (value: string) => {
  emit("update:phone2", value);
  if (value.length === 4) {
    phone3InputRef.value?.$el?.focus();
  }
};

// 중간 4자리에서 Enter 키 처리
const handlePhone2Enter = (event: KeyboardEvent) => {
  event.preventDefault(); // form submit 방지
  // 4자리가 모두 입력되었을 때만 다음 필드로 이동
  if (props.phone2.length === 4) {
    phone3InputRef.value?.$el?.focus();
  }
  // 4자리가 입력되지 않았으면 아무 동작도 하지 않음
};

// 마지막 4자리 입력 처리 (자동 focus 이동)
const handlePhone3Input = (value: string) => {
  emit("update:phone3", value);
  // 4자리가 모두 입력되면 자동으로 다음 필드로 이동
  if (value.length === 4) {
    emit("enter");
  }
};

// 마지막 4자리에서 Enter 키 처리
const handlePhone3Enter = (event: KeyboardEvent) => {
  event.preventDefault(); // form submit 방지
  // 4자리가 모두 입력되었을 때만 다음 필드로 이동
  if (props.phone3.length === 4) {
    emit("enter");
  }
  // 4자리가 입력되지 않았으면 아무 동작도 하지 않음
};

defineExpose({ focusFirst });
</script>

<template>
  <div class="flex items-center gap-2 w-full">
    <!-- 010 Select -->
    <select
      id="phone1"
      name="tel-country-code"
      autocomplete="off"
      :value="phone1"
      @change="
        emit('update:phone1', ($event.target as HTMLSelectElement).value)
      "
      class="flex-1 min-w-0 h-10 text-center rounded-md border border-input bg-background px-2 py-2 text-body ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option v-for="opt in prefixOptions" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>

    <span class="text-muted-foreground text-body shrink-0">-</span>

    <!-- 중간 4자리 -->
    <Input
      ref="phone2InputRef"
      id="phone2"
      name="tel-local"
      autocomplete="tel-local"
      :model-value="phone2"
      @update:model-value="handlePhone2Input(String($event))"
      @keydown.enter="handlePhone2Enter"
      type="text"
      inputmode="numeric"
      maxlength="4"
      class="flex-1 min-w-0 h-10 text-center text-body"
      placeholder="0000"
    />

    <span class="text-muted-foreground text-body shrink-0">-</span>

    <!-- 마지막 4자리 -->
    <Input
      ref="phone3InputRef"
      id="phone3"
      name="tel-local-suffix"
      autocomplete="tel-local"
      :model-value="phone3"
      @update:model-value="handlePhone3Input(String($event))"
      @keydown.enter="handlePhone3Enter"
      type="text"
      inputmode="numeric"
      maxlength="4"
      class="flex-1 min-w-0 h-10 text-center text-body"
      placeholder="0000"
    />
  </div>
</template>
