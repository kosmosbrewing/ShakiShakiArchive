<script setup lang="ts">
// src/components/common/LoadingSpinner.vue
// 로딩 스피너 컴포넌트

interface Props {
  size?: "sm" | "md" | "lg";
  center?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  center: true,
});

// 사이즈별 클래스
const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};
</script>

<template>
  <div
    :class="[
      center ? 'flex justify-center py-20' : '',
    ]"
  >
    <div
      :class="[
        'animate-spin rounded-full border-b-2 border-primary',
        sizeClasses[props.size],
      ]"
    />
  </div>
</template>
