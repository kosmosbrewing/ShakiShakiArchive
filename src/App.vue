<script setup lang="ts">
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { Alert } from "@/components/ui/alert";
import { useAlert } from "@/composables/useAlert";

// 커서 이미지 import - WebP 최적화 (69.3% 용량 감소)
import cursor01 from "@/assets/optimized/cursor/cursor01.webp";
import cursor02 from "@/assets/optimized/cursor/cursor02.webp";
import cursor03 from "@/assets/optimized/cursor/cursor03.webp";
import cursor04 from "@/assets/optimized/cursor/cursor04.webp";
import cursor05 from "@/assets/optimized/cursor/cursor05.webp";
import cursor06 from "@/assets/optimized/cursor/cursor06.webp";
import cursor07 from "@/assets/optimized/cursor/cursor07.webp";
import cursor08 from "@/assets/optimized/cursor/cursor08.webp";
import cursor09 from "@/assets/optimized/cursor/cursor09.webp";
import cursor10 from "@/assets/optimized/cursor/cursor10.webp";
import cursor11 from "@/assets/optimized/cursor/cursor11.webp";
import cursor12 from "@/assets/optimized/cursor/cursor12.webp";

const cursorImages = [
  cursor01,
  cursor02,
  cursor03,
  cursor04,
  cursor05,
  cursor06,
  cursor07,
  cursor08,
  cursor09,
  cursor10,
  cursor11,
  cursor12,
];

const authStore = useAuthStore();

// 전역 Alert 시스템
const {
  alertState,
  closeAlert,
  handleConfirm,
  handleCancel,
  updatePromptValue,
} = useAlert();

// 환영 메시지 Alert 상태
const showWelcomeAlert = ref(false);
const welcomeAlertMessage = ref("");

// 환영 메시지 감지
watch(
  () => authStore.welcomeMessage,
  (message) => {
    if (message) {
      welcomeAlertMessage.value = message;
      showWelcomeAlert.value = true;
      authStore.clearWelcomeMessage();
    }
  }
);

// 떨어지는 입자 인터페이스
interface FallingParticle {
  id: number;
  x: number;
  y: number;
  image: string;
  rotation: number;
  scale: number;
  duration: number;
  fallDistance: number;
  horizontalDrift: number;
}

// 입자 상태 관리
const particles = ref<FallingParticle[]>([]);
let particleId = 0;
let lastSpawnTime = 0;
const SPAWN_THROTTLE = 80; // 입자 생성 간격 (ms)
const MAX_PARTICLES = 50; // 최대 입자 수

// 모바일 감지
const isMobile = ref(false);

// 입자 생성 함수
const createParticle = (x: number, y: number) => {
  const now = Date.now();

  // 스로틀링: 너무 빠르게 생성되지 않도록
  if (now - lastSpawnTime < SPAWN_THROTTLE) return;
  lastSpawnTime = now;

  // 최대 개수 제한
  if (particles.value.length >= MAX_PARTICLES) {
    particles.value.shift();
  }

  const particle: FallingParticle = {
    id: particleId++,
    x: x,
    y: y,
    image: cursorImages[Math.floor(Math.random() * cursorImages.length)],
    rotation: Math.random() * 360, // 초기 회전 각도
    scale: 0.5 + Math.random() * 0.5, // 0.5 ~ 1.0 크기
    duration: 1200 + Math.random() * 800, // 1.2초 ~ 2초
    fallDistance: 150 + Math.random() * 100, // 낙하 거리 150~250px
    horizontalDrift: (Math.random() - 0.5) * 60, // 좌우 흔들림 -30 ~ 30px
  };

  particles.value.push(particle);

  // 애니메이션 종료 후 입자 제거
  setTimeout(() => {
    const index = particles.value.findIndex((p) => p.id === particle.id);
    if (index !== -1) {
      particles.value.splice(index, 1);
    }
  }, particle.duration);
};

// PC: 마우스 움직임 핸들러
const handleMouseMove = (e: MouseEvent) => {
  if (isMobile.value) return;
  createParticle(e.clientX, e.clientY);
};

// 모바일: 터치/클릭 핸들러
const handleClick = (e: MouseEvent | TouchEvent) => {
  if (!isMobile.value) return;

  let x: number, y: number;

  if (e instanceof TouchEvent && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else if (e instanceof MouseEvent) {
    x = e.clientX;
    y = e.clientY;
  } else {
    return;
  }

  // 모바일에서는 클릭 시 여러 개 동시 생성
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      createParticle(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40
      );
    }, i * 50);
  }
};

// 모바일 감지 함수
const checkMobile = () => {
  isMobile.value =
    window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
};

onMounted(async () => {
  await authStore.loadUser();

  checkMobile();
  window.addEventListener("resize", checkMobile);
  window.addEventListener("mousemove", handleMouseMove, { passive: true });
  window.addEventListener("click", handleClick);
  window.addEventListener("touchstart", handleClick, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("click", handleClick);
  window.removeEventListener("touchstart", handleClick);
});
</script>

<template>
  <div class="min-h-screen bg-[#FFFEFC]">
    <!-- 떨어지는 입자들 -->
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="falling-particle"
      :style="{
        left: `${particle.x}px`,
        top: `${particle.y}px`,
        '--fall-distance': `${particle.fallDistance}px`,
        '--horizontal-drift': `${particle.horizontalDrift}px`,
        '--rotation': `${particle.rotation}deg`,
        '--end-rotation': `${particle.rotation + 180}deg`,
        '--scale': particle.scale,
        '--duration': `${particle.duration}ms`,
      }"
    >
      <img
        :src="particle.image"
        alt="cursor"
        class="w-12 md:w-14\ object-contain"
      />
    </div>

    <Navbar />
    <main>
      <router-view :key="$route.fullPath" />
    </main>
    <Footer />
  </div>

  <!-- 전역 환영 메시지 Alert -->
  <Alert
    v-if="showWelcomeAlert"
    type="success"
    :message="welcomeAlertMessage"
    @close="showWelcomeAlert = false"
  />

  <!-- 전역 Alert/Confirm 시스템 -->
  <Alert
    v-if="alertState.show"
    :type="alertState.type"
    :message="alertState.message"
    :duration="alertState.duration"
    :confirm-mode="alertState.confirmMode"
    :confirm-variant="alertState.confirmVariant"
    :confirm-text="alertState.confirmText"
    :cancel-text="alertState.cancelText"
    :prompt-mode="alertState.promptMode"
    :prompt-value="alertState.promptValue"
    :prompt-placeholder="alertState.promptPlaceholder"
    :prompt-required="alertState.promptRequired"
    @close="closeAlert"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @update:prompt-value="updatePromptValue"
  />
</template>

<style>
/* 떨어지는 입자 스타일 */
.falling-particle {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform-origin: center center;
  animation: fall var(--duration) ease-out forwards;
}

@keyframes fall {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) translateX(0)
      rotate(var(--rotation)) scale(var(--scale));
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(var(--fall-distance))
      translateX(var(--horizontal-drift)) rotate(var(--end-rotation))
      scale(calc(var(--scale) * 0.3));
  }
}

/* 링크/버튼 기본 커서 유지 */
a,
button {
  cursor: pointer;
}
</style>
