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
  }>(),
  {
    message: "잠시만 기다려주세요",
    type: "success",
    duration: 2000,
    confirmMode: false,
    confirmVariant: "success",
    confirmText: "확인",
    cancelText: "취소",
  }
);

// destructive 모드 여부
const isDestructive = computed(() => props.confirmVariant === "destructive");

const emit = defineEmits<{
  close: [];
  confirm: [];
  cancel: [];
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
    return "bg-background border border-border rounded-2xl shadow-2xl pointer-events-auto w-[320px] overflow-hidden";
  }
  return "rounded-2xl shadow-lg px-5 py-3 flex items-center gap-2 pointer-events-auto";
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

    <!-- 중앙 정렬을 위한 wrapper -->
    <div
      :class="[
        'fixed z-50 flex justify-center pointer-events-none',
        confirmMode ? 'inset-0 items-center' : 'top-8 left-0 right-0',
      ]"
    >
      <Transition
        appear
        :appear-active-class="
          confirmMode
            ? 'animate-in fade-in-0 zoom-in-95 duration-200'
            : 'animate-in fade-in-0 slide-in-from-top-5 duration-300'
        "
        :enter-active-class="
          confirmMode
            ? 'animate-in fade-in-0 zoom-in-95 duration-200'
            : 'animate-in fade-in-0 slide-in-from-top-5 duration-300'
        "
        :leave-active-class="
          confirmMode
            ? 'animate-out fade-out-0 zoom-out-95 duration-150'
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
            <div class="pt-6 pb-4 px-6 flex flex-col items-center gap-3">
              <!-- 성공 아이콘 -->
              <div
                v-if="!isDestructive"
                class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <CheckCircle2 class="w-8 h-8 text-primary" />
              </div>
              <!-- 삭제/경고 아이콘 -->
              <div
                v-else
                class="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center"
              >
                <AlertTriangle class="w-8 h-8 text-destructive" />
              </div>
              <p class="text-body font-semibold text-foreground text-center whitespace-pre-line">
                {{ message }}
              </p>
            </div>

            <!-- 하단 버튼 영역 -->
            <div class="flex border-t border-border">
              <button
                @click="handleCancel"
                class="flex-1 py-3.5 text-caption font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-r border-border"
              >
                {{ cancelText }}
              </button>
              <button
                @click="handleConfirm"
                :class="[
                  'flex-1 py-3.5 text-caption font-semibold transition-colors',
                  isDestructive
                    ? 'text-destructive hover:bg-destructive/5'
                    : 'text-primary hover:bg-primary/5',
                ]"
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
              <p class="text-caption font-medium">{{ message }}</p>
            </slot>
          </template>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
