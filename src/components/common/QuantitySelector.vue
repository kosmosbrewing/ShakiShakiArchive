<script setup lang="ts">
// src/components/common/QuantitySelector.vue
// 수량 선택 컴포넌트

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), {
  min: 1,
  max: 999,
  disabled: false,
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
  (e: "change", change: number): void;
}>();

// 수량 감소
const decrease = () => {
  if (props.modelValue > props.min) {
    emit("update:modelValue", props.modelValue - 1);
    emit("change", -1);
  }
};

// 수량 증가
const increase = () => {
  if (props.modelValue < props.max) {
    emit("update:modelValue", props.modelValue + 1);
    emit("change", 1);
  }
};

// 사이즈별 클래스
const sizeClasses = {
  sm: "w-24 h-8",
  md: "w-32 h-10",
};

const buttonSizeClasses = {
  sm: "w-8",
  md: "w-10",
};
</script>

<template>
  <div
    :class="[
      'flex items-center border border-border rounded',
      sizeClasses[props.size],
      disabled ? 'opacity-40 pointer-events-none' : '',
    ]"
  >
    <button
      type="button"
      @click="decrease"
      :disabled="disabled || modelValue <= min"
      :class="[
        'h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50',
        buttonSizeClasses[props.size],
      ]"
    >
      -
    </button>
    <span class="flex-1 text-center text-sm font-medium text-foreground">
      {{ modelValue }}
    </span>
    <button
      type="button"
      @click="increase"
      :disabled="disabled || modelValue >= max"
      :class="[
        'h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50',
        buttonSizeClasses[props.size],
      ]"
    >
      +
    </button>
  </div>
</template>
