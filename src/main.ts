import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import router from "./router";
import "./assets/index.css";
import axios from "axios";
import { useConstantsStore } from "./stores/constants";
import { useSeo } from "./composables/useSeo";
import { fetchHomeSeoData } from "./lib/api";

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
 * 비동기 앱 초기화
 * 핵심 데이터(공통 상수)를 먼저 로드한 후 앱을 마운트합니다.
 */
async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  const head = createHead();

  // Pinia를 먼저 등록해야 스토어 사용 가능
  app.use(pinia);
  app.use(router);
  app.use(head); // SEO 메타 태그 동적 관리

  // 공통 상수 로드 (앱 마운트 전 대기)
  const constantsStore = useConstantsStore();
  try {
    await constantsStore.loadConstants();
  } catch (e) {
    // 실패해도 폴백 값으로 앱 실행 (스토어 내부에서 처리됨)
    console.warn("⚠️ 상수 로드 실패, 폴백 값으로 진행합니다.");
  }

  // 초기 SEO 메타 태그 설정 (백엔드 API 사용)
  try {
    const seoData = await fetchHomeSeoData();
    useSeo(seoData);
  } catch (e) {
    // SEO 로드 실패해도 앱 실행 계속
    console.warn("⚠️ SEO 데이터 로드 실패, 기본값으로 진행합니다.");
  }

  // 앱 마운트
  app.mount("#app");
}

// 앱 시작
bootstrap();
