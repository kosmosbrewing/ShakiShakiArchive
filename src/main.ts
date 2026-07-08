import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/index.css";
import axios from "axios";
import { useConstantsStore } from "./stores/constants";
import { initAnalytics } from "./lib/analytics";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
axios.defaults.baseURL = API_BASE;

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // 쿠키 포함 필수
  headers: {
    "Content-Type": "application/json",
  },
});
// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);
export default apiClient;

/**
 * 앱 초기화
 * mount를 먼저 실행해 첫 페인트를 앞당기고, 공통 상수는 백그라운드로 로드합니다.
 * (constants 응답을 기다리면 그동안 흰 화면이 유지됨 — 소비처는 전부
 * FALLBACK_CONSTANTS 폴백 + reactive 갱신이라 mount 전 대기가 불필요)
 */
function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  // Pinia를 먼저 등록해야 스토어 사용 가능
  app.use(pinia);
  app.use(router);

  // GA4 초기화 (환경변수 설정 시에만 동작)
  initAnalytics();

  // 배포 직후 옛 index.html이 삭제/교체된 청크를 preload하다 실패하면 새 HTML로 리로드
  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });

  // 앱 마운트 (constants를 기다리지 않음)
  app.mount("#app");

  // 공통 상수 백그라운드 로드 — 실패해도 스토어 내부 폴백 값으로 동작
  useConstantsStore()
    .loadConstants()
    .catch(() => {
      console.warn("⚠️ 상수 로드 실패, 폴백 값으로 진행합니다.");
    });
}

// 앱 시작
bootstrap();
