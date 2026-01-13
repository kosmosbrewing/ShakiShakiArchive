<script setup lang="ts">
import { computed } from "vue";
import { getPasswordStrength } from "@/utils/password-validation";

interface Props {
  password: string;
}

const props = defineProps<Props>();

// 비밀번호 강도 계산 (실시간)
const passwordStrength = computed(() => {
  if (!props.password) {
    return null;
  }
  return getPasswordStrength(props.password);
});
</script>

<template>
  <div v-if="password" class="space-y-2 mt-1">
    <!-- 1. 진행 바 -->
    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-300"
        :class="{
          'bg-red-500': passwordStrength?.strength === '약함',
          'bg-yellow-500': passwordStrength?.strength === '보통',
          'bg-green-500': passwordStrength?.strength === '강함',
          'w-0': !passwordStrength?.checks.length,
          'w-1/4': passwordStrength?.checks.length && passwordStrength?.score === 1,
          'w-1/2': passwordStrength?.checks.length && passwordStrength?.score === 2,
          'w-3/4': passwordStrength?.checks.length && passwordStrength?.score === 3,
          'w-full': passwordStrength?.checks.length && passwordStrength?.score === 4,
        }"
      ></div>
    </div>

    <!-- 2. 상세 메시지 -->
    <p
      class="text-caption"
      :class="{
        'text-red-600': passwordStrength?.strength === '약함',
        'text-yellow-600': passwordStrength?.strength === '보통',
        'text-green-600': passwordStrength?.strength === '강함',
      }"
    >
      {{ passwordStrength?.message }}
    </p>
  </div>
</template>
