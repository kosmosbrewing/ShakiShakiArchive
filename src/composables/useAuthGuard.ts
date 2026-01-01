// src/composables/useAuthGuard.ts
// 인증 체크 및 리다이렉트 처리

import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "./useAlert";

interface UseAuthGuardOptions {
  redirectTo?: string;
  message?: string;
  loadUser?: boolean;
}

/**
 * 인증이 필요한 페이지에서 사용하는 가드
 * - 비로그인 시 로그인 페이지로 리다이렉트
 * - 필요시 사용자 정보 자동 로드
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const {
    redirectTo = "/login",
    message = "로그인이 필요합니다.",
    loadUser = true,
  } = options;

  const router = useRouter();
  const authStore = useAuthStore();

  const checkAuth = async () => {
    const { showAlert } = useAlert();

    // 사용자 정보가 없으면 로드 시도
    if (loadUser && !authStore.user) {
      await authStore.loadUser();
    }

    // 여전히 인증되지 않았으면 리다이렉트
    if (!authStore.isAuthenticated) {
      showAlert(message, { type: "error" });
      router.replace(redirectTo);
      return false;
    }

    return true;
  };

  onMounted(checkAuth);

  return {
    authStore,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    checkAuth,
  };
}

/**
 * 인증 상태만 확인 (리다이렉트 없음)
 * 위시리스트 버튼 등에서 사용
 */
export function useAuthCheck() {
  const router = useRouter();
  const authStore = useAuthStore();

  const requireAuth = async (action: () => void, message = "로그인이 필요한 서비스입니다.") => {
    if (!authStore.isAuthenticated) {
      const { showConfirm } = useAlert();
      const confirmed = await showConfirm(`${message}\n로그인 하시겠습니까?`, {
        confirmText: "로그인",
        cancelText: "취소",
      });
      if (confirmed) {
        router.push("/login");
      }
      return false;
    }
    action();
    return true;
  };

  return {
    authStore,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    requireAuth,
  };
}
