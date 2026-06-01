<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Check, X, CheckCircle2, AlertTriangle } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { AlertType } from "./alertMessages";

// confirm 모드 스타일 타입
type ConfirmVariant = "success" | "destructive";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    message?: string;
    type?: AlertType;
    duration?: number;
    // confirm 모드 관련 props
    confirmMode?: boolean;
    confirmVariant?: ConfirmVariant;
    confirmText?: string;
    cancelText?: string;
    // prompt 모드 관련 props
    promptMode?: boolean;
    promptValue?: string;
    promptPlaceholder?: string;
    promptRequired?: string;
  }>(),
  {
    message: "잠시만 기다려주세요",
    type: "success",
    duration: 2000,
    confirmMode: false,
    confirmVariant: "success",
    confirmText: "확인",
    cancelText: "취소",
    promptMode: false,
    promptValue: "",
    promptPlaceholder: "",
    promptRequired: "",
  }
);

// destructive 모드 여부
const isDestructive = computed(() => props.confirmVariant === "destructive");

const emit = defineEmits<{
  close: [];
  confirm: [];
  cancel: [];
  "update:promptValue": [value: string];
}>();

const isVisible = ref(true);
let timer: ReturnType<typeof setTimeout> | null = null;

// type에 따른 스타일 클래스 (기본 알림용)
const alertStyles = computed(() => {
  if (props.confirmMode) {
    return ""; // confirm 모드는 별도 스타일 적용
  }
  if (props.type === "error") {
    return "bg-primary text-destructive-foreground";
  }
  return "bg-primary text-primary-foreground";
});

// confirm 모드일 때의 컨테이너 스타일
const containerStyles = computed(() => {
  if (props.confirmMode) {
    return "bg-background border border-border rounded-2xl shadow-2xl pointer-events-auto w-[280px] sm:w-[320px] overflow-hidden";
  }
  return "rounded-2xl shadow-lg px-5 py-3 flex items-center gap-2 pointer-events-auto max-w-[calc(100vw-2rem)] sm:max-w-md";
});

// 애니메이션 완료 후 close 이벤트 발생
const onAfterLeave = () => {
  emit("close");
};

// confirm 버튼 클릭
const handleConfirm = () => {
  emit("confirm");
  isVisible.value = false;
};

// cancel 버튼 클릭
const handleCancel = () => {
  emit("cancel");
  isVisible.value = false;
};

onMounted(() => {
  // confirm 모드가 아닐 때만 자동 닫힘
  if (!props.confirmMode) {
    timer = setTimeout(() => {
      isVisible.value = false;
    }, props.duration);
  }
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- confirm 모드: 배경 오버레이 -->
    <Transition
      v-if="confirmMode"
      appear
      appear-active-class="animate-in fade-in-0 duration-200"
      enter-active-class="animate-in fade-in-0 duration-200"
      leave-active-class="animate-out fade-out-0 duration-150"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 bg-black/50"
        @click="handleCancel"
      />
    </Transition>

    <!-- 반응형 위치 조정 wrapper -->
    <!-- Confirm 모드 - 데스크탑: Visual Center / 모바일: 상단에서 10% 아래 -->
    <!-- 일반 Alert - 항상 상단 -->
    <div
      :class="[
        'fixed z-50 flex justify-center pointer-events-none',
        confirmMode
          ? 'inset-0 items-center pt-[10vh] sm:pt-0 sm:pb-[8vh]'
          : 'top-8 left-0 right-0',
      ]"
    >
      <Transition
        appear
        :appear-active-class="
          confirmMode
            ? 'animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 sm:slide-in-from-bottom-0 duration-200'
            : 'animate-in fade-in-0 slide-in-from-top-5 duration-300'
        "
        :enter-active-class="
          confirmMode
            ? 'animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 sm:slide-in-from-bottom-0 duration-200'
            : 'animate-in fade-in-0 slide-in-from-top-5 duration-300'
        "
        :leave-active-class="
          confirmMode
            ? 'animate-out fade-out-0 zoom-out-95 slide-out-to-top-4 sm:slide-out-to-bottom-0 duration-150'
            : 'animate-out fade-out-0 slide-out-to-top-5 duration-200'
        "
        @after-leave="onAfterLeave"
      >
        <div
          v-if="isVisible"
          :class="cn(containerStyles, alertStyles, props.class)"
          role="alert"
        >
          <!-- confirm 모드 -->
          <template v-if="confirmMode">
            <!-- 상단 아이콘 영역 -->
            <div class="pt-6 pb-4 px-5 sm:pt-6 sm:pb-4 sm:px-6 flex flex-col items-center gap-2.5">
              <!-- 성공 아이콘 -->
              <div
                v-if="!isDestructive"
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/5 flex items-center justify-center"
              >
                <CheckCircle2 class="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <!-- 삭제/경고 아이콘 -->
              <div
                v-else
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/5 flex items-center justify-center"
              >
                <AlertTriangle class="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <p
                class="text-caption sm:text-body font-medium text-foreground text-center whitespace-pre-line"
              >
                {{ message }}
              </p>

              <!-- Prompt 입력 필드 -->
              <input
                v-if="promptMode"
                :value="promptValue"
                @input="
                  emit(
                    'update:promptValue',
                    ($event.target as HTMLInputElement).value
                  )
                "
                :placeholder="promptPlaceholder"
                class="w-full px-3 py-2 mt-2 border border-border rounded-md text-caption sm:text-body focus:outline-none focus:ring-2 focus:ring-primary"
                autocomplete="off"
              />
              <p
                v-if="promptMode && promptRequired"
                class="text-caption text-muted-foreground text-center"
              >
                {{ promptPlaceholder || `'${promptRequired}'를 입력하세요` }}
              </p>
            </div>

            <!-- 하단 버튼 영역 -->
            <div class="flex border-t border-border">
              <button
                @click="handleCancel"
                class="flex-1 py-3 sm:py-3.5 text-caption sm:text-body font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
              >
                {{ cancelText }}
              </button>
              <button
                @click="handleConfirm"
                class="flex-1 py-3 sm:py-3.5 text-caption sm:text-body font-semibold transition-colors text-primary hover:bg-primary/5"
              >
                {{ confirmText }}
              </button>
            </div>
          </template>

          <!-- 기본 알림 모드 -->
          <template v-else>
            <slot>
              <Check v-if="type === 'success'" class="w-4 h-4" />
              <X v-else class="w-4 h-4" />
              <p class="text-body font-medium leading-snug whitespace-pre-line">{{ message }}</p>
            </slot>
          </template>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
