<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Check, X } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { AlertType } from "./alertMessages";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    message?: string;
    type?: AlertType;
    duration?: number;
  }>(),
  {
    message: "잠시만 기다려주세요",
    type: "success",
    duration: 2000,
  }
);

const emit = defineEmits<{
  close: [];
}>();

const isVisible = ref(true);
let timer: ReturnType<typeof setTimeout> | null = null;

// type에 따른 스타일 클래스
const alertStyles = computed(() => {
  if (props.type === "error") {
    return "bg-primary text-destructive-foreground";
  }
  return "bg-primary text-primary-foreground";
});

// 애니메이션 완료 후 close 이벤트 발생
const onAfterLeave = () => {
  emit("close");
};

onMounted(() => {
  timer = setTimeout(() => {
    isVisible.value = false;
  }, props.duration);
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- 중앙 정렬을 위한 wrapper -->
    <div class="fixed top-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <Transition
        appear
        appear-active-class="animate-in fade-in-0 slide-in-from-top-5 duration-300"
        enter-active-class="animate-in fade-in-0 slide-in-from-top-5 duration-300"
        leave-active-class="animate-out fade-out-0 slide-out-to-top-5 duration-200"
        @after-leave="onAfterLeave"
      >
        <div
          v-if="isVisible"
          :class="
            cn(
              'rounded-2xl shadow-lg px-5 py-3 flex items-center gap-2 pointer-events-auto',
              alertStyles,
              props.class
            )
          "
          role="alert"
        >
          <slot>
            <Check v-if="type === 'success'" class="w-4 h-4" />
            <X v-else class="w-4 h-4" />
            <p class="text-caption font-medium">{{ message }}</p>
          </slot>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
