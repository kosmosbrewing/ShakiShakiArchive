// src/stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchCurrentUser, login, logout, signup } from "@/lib/api"; // signup import 확인
import type { User } from "@/types/api";

export const useAuthStore = defineStore("auth", () => {
  // 상태
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 계산 속성
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin ?? false);

  // [기존] 유저 로드
  async function loadUser() {
    isLoading.value = true;
    try {
      user.value = await fetchCurrentUser();
    } catch (err) {
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  // [기존] 로그인
  async function handleLogin(data: any) {
    isLoading.value = true;
    try {
      user.value = await login(data);
    } finally {
      isLoading.value = false;
    }
  }

  // [기존] 로그아웃
  async function handleLogout() {
    await logout();
    user.value = null;
  }

  // 🔥 [누락된 부분 추가] 회원가입 액션 🔥
  async function register(data: any) {
    isLoading.value = true;
    error.value = null;
    try {
      // API의 signup 함수 호출
      user.value = await signup(data);
    } catch (err: any) {
      error.value = err.message;
      throw err; // 컴포넌트에서 에러를 잡을 수 있게 던짐
    } finally {
      isLoading.value = false;
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    loadUser,
    handleLogin,
    handleLogout,
    register, // 👈 중요: 여기서 반드시 반환해야 컴포넌트에서 쓸 수 있습니다!
  };
});
