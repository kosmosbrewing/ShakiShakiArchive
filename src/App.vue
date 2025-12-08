<script setup lang="ts">
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

onMounted(async () => {
  // 앱이 시작될 때 쿠키(세션)가 있다면 사용자 정보를 다시 채워넣음
  await authStore.loadUser();
  window.addEventListener("mousemove", updateMousePosition);
});

// 1. 마우스 좌표 상태 저장
const mouseX = ref(0);
const mouseY = ref(0);

// 2. 마우스 움직임 감지 함수
const updateMousePosition = (e: MouseEvent) => {
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
};

onUnmounted(() => {
  window.removeEventListener("mousemove", updateMousePosition);
});
</script>

<template>
  <div
    class="cursor-follower"
    :style="{ transform: `translate(${mouseX + 15}px, ${mouseY + 15}px)` }"
  >
    <img src="/rabbit-cursor.svg" alt="cursor" width="32" height="32" />
  </div>
  <Navbar />
  <router-view :key="$route.fullPath" />
  <Footer />
</template>

<style>
/* 5. 따라다니는 이미지 스타일 설정 */
.cursor-follower {
  position: fixed; /* 화면에 고정 */
  top: 0;
  left: 0;
  width: 32px;
  height: 32px;
  pointer-events: none; /* [핵심] 마우스 클릭이 이미지를 통과해서 뒤에 있는 버튼이 눌리게 함 */
  z-index: 9999; /* 모든 요소보다 위에 표시 */

  /* 부드럽게 따라오게 하려면 아래 transition 주석을 해제하세요 */
  /* transition: transform 0.1s ease-out; */

  /* 시스템 커서는 기본값으로 유지 */
  cursor: default;
}

/* (선택사항) 링크에 올렸을 때도 기본 손가락 모양 유지 */
a,
button {
  cursor: pointer;
}
</style>
