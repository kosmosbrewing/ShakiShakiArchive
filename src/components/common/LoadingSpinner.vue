<script setup lang="ts">
// src/components/common/LoadingSpinner.vue
// 귀여운 로딩 스피너 컴포넌트

interface Props {
  size?: "sm" | "md" | "lg";
  center?: boolean;
  variant?: "dots" | "heart" | "hanger";
  fullscreen?: boolean; // 전체 화면 오버레이 모드
  message?: string; // 로딩 메시지
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  center: true,
  variant: "dots",
  fullscreen: false,
  message: "",
});

// 사이즈별 dot 크기
const dotSizes = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

// 사이즈별 하트 크기
const heartSizes = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

// 사이즈별 옷걸이 크기
const hangerSizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};
</script>

<template>
  <!-- 전체 화면 오버레이 모드 -->
  <div
    v-if="fullscreen"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
  >
    <!-- Dots 바운스 애니메이션 -->
    <div v-if="variant === 'dots'" class="flex items-center gap-1.5">
      <span
        v-for="i in 3"
        :key="i"
        :class="[
          'rounded-full bg-primary animate-bounce-dot',
          dotSizes[props.size],
        ]"
        :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
      />
    </div>

    <!-- 하트 펄스 애니메이션 -->
    <div v-else-if="variant === 'heart'" class="relative">
      <svg
        :class="[heartSizes[props.size], 'animate-heart-beat']"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="text-primary drop-shadow-sm"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <svg
        class="absolute -top-1 -right-1 w-3 h-3 text-primary/60 animate-float"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>

    <!-- 옷걸이 흔들림 애니메이션 -->
    <div v-else-if="variant === 'hanger'" class="relative">
      <svg
        :class="[hangerSizes[props.size], 'animate-swing origin-top']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-primary"
      >
        <circle cx="12" cy="4" r="2" class="fill-primary/30" />
        <path d="M12 6 L12 8 L4 14 L4 15 L20 15 L20 14 L12 8" class="fill-primary/20" />
        <path d="M4 15 Q12 18 20 15" class="stroke-primary/50" />
      </svg>
      <span class="absolute top-1 right-2 w-1.5 h-1.5 bg-primary/40 rounded-full animate-twinkle" />
    </div>

    <!-- 로딩 메시지 -->
    <p v-if="message" class="mt-4 text-sm text-muted-foreground">{{ message }}</p>
  </div>

  <!-- 일반 모드 (기존 동작) -->
  <div
    v-else
    :class="[
      center ? 'flex justify-center items-center py-20' : '',
    ]"
  >
    <!-- Dots 바운스 애니메이션 -->
    <div v-if="variant === 'dots'" class="flex items-center gap-1.5">
      <span
        v-for="i in 3"
        :key="i"
        :class="[
          'rounded-full bg-primary animate-bounce-dot',
          dotSizes[props.size],
        ]"
        :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
      />
    </div>

    <!-- 하트 펄스 애니메이션 -->
    <div v-else-if="variant === 'heart'" class="relative">
      <svg
        :class="[heartSizes[props.size], 'animate-heart-beat']"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="text-primary drop-shadow-sm"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <!-- 작은 하트 장식 -->
      <svg
        class="absolute -top-1 -right-1 w-3 h-3 text-primary/60 animate-float"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>

    <!-- 옷걸이 흔들림 애니메이션 -->
    <div v-else-if="variant === 'hanger'" class="relative">
      <svg
        :class="[hangerSizes[props.size], 'animate-swing origin-top']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-primary"
      >
        <!-- 고리 -->
        <circle cx="12" cy="4" r="2" class="fill-primary/30" />
        <!-- 옷걸이 몸체 -->
        <path d="M12 6 L12 8 L4 14 L4 15 L20 15 L20 14 L12 8" class="fill-primary/20" />
        <!-- 하단 장식 -->
        <path d="M4 15 Q12 18 20 15" class="stroke-primary/50" />
      </svg>
      <!-- 반짝임 효과 -->
      <span class="absolute top-1 right-2 w-1.5 h-1.5 bg-primary/40 rounded-full animate-twinkle" />
    </div>
  </div>
</template>

<style scoped>
/* 통통 튀는 dot 애니메이션 */
@keyframes bounce-dot {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-12px);
  }
}

.animate-bounce-dot {
  animation: bounce-dot 1.2s ease-in-out infinite;
}

/* 하트 두근두근 애니메이션 */
@keyframes heart-beat {
  0%, 100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.15);
  }
  30% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.1);
  }
  60% {
    transform: scale(1);
  }
}

.animate-heart-beat {
  animation: heart-beat 1.5s ease-in-out infinite;
}

/* 작은 하트 떠다니는 효과 */
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(-10deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-6px) rotate(10deg);
    opacity: 1;
  }
}

.animate-float {
  animation: float 2s ease-in-out infinite;
}

/* 옷걸이 흔들림 애니메이션 */
@keyframes swing {
  0%, 100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

.animate-swing {
  animation: swing 1.5s ease-in-out infinite;
}

/* 반짝임 효과 */
@keyframes twinkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.animate-twinkle {
  animation: twinkle 1s ease-in-out infinite;
}
</style>
