// src/stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchCurrentUser, login, logout, signup, addToCart } from "@/lib/api";
import type { User } from "@/types/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin ?? false);

  // [공통] 장바구니 병합 로직 (함수로 분리하여 재사용)
  async function migrateGuestCart() {
    const guestCartJson = localStorage.getItem("guest_cart");

    if (!guestCartJson) return;

    console.log("📦 [Migration] 비회원 장바구니 발견, 병합을 시도합니다...");

    try {
      const guestCart = JSON.parse(guestCartJson);

      if (Array.isArray(guestCart) && guestCart.length > 0) {
        // 순차 처리로 안정적인 병합
        for (const item of guestCart) {
          const payload = {
            productId: Number(item.productId),
            variantId: item.variantId ? Number(item.variantId) : undefined,
            quantity: Number(item.quantity),
          };

          try {
            await addToCart(payload);
            console.log(`   ✅ [Migration] 병합 성공: ID ${payload.productId}`);
          } catch (reqError: any) {
            console.warn(
              `   ⚠️ [Migration] 병합 실패 (ID: ${payload.productId}):`,
              reqError.message
            );
          }
        }

        // 병합 시도 후 로컬 데이터 삭제
        localStorage.removeItem("guest_cart");
        console.log("🗑️ [Migration] 로컬 장바구니 데이터 삭제 완료");

        // 변경 사항 전파
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch (parseError) {
      console.error("❌ [Migration] JSON 파싱 오류:", parseError);
    }
  }

  // 유저 정보 로드 (앱 초기화 시 실행됨)
  async function loadUser() {
    isLoading.value = true;
    try {
      const currentUser = await fetchCurrentUser();
      user.value = currentUser;

      // [핵심 추가] 새로고침으로 인해 로그인이 유지된 상태라면, 여기서 병합을 시도합니다.
      if (currentUser) {
        await migrateGuestCart();
      }
    } catch (err) {
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  // 로그인 액션
  async function handleLogin(data: any) {
    isLoading.value = true;
    try {
      // 1. 로그인 수행
      const loggedInUser = await login(data);
      user.value = loggedInUser;
      console.log("✅ 로그인 성공:", loggedInUser.email);

      // 2. 장바구니 병합 실행
      await migrateGuestCart();
    } catch (err: any) {
      console.error("로그인 프로세스 실패:", err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function handleLogout() {
    await logout();
    user.value = null;
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function register(data: any) {
    isLoading.value = true;
    error.value = null;
    try {
      user.value = await signup(data);
    } catch (err: any) {
      error.value = err.message;
      throw err;
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
    register,
  };
});
