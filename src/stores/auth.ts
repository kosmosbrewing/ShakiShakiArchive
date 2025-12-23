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
        let successCount = 0;
        let failCount = 0;

        // 순차 처리로 안정적인 병합
        for (const item of guestCart) {
          // productId는 UUID 문자열, variantId는 숫자 또는 undefined
          const payload = {
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            quantity: Number(item.quantity) || 1,
          };

          // 유효성 검증
          if (!payload.productId) {
            console.warn("   ⚠️ [Migration] productId 누락, 건너뜀");
            failCount++;
            continue;
          }

          try {
            await addToCart(payload);
            successCount++;
            console.log(`   ✅ [Migration] 병합 성공: ${payload.productId}`);
          } catch (reqError: any) {
            failCount++;
            console.warn(
              `   ⚠️ [Migration] 병합 실패 (${payload.productId}):`,
              reqError.message
            );
          }
        }

        // 병합 시도 후 로컬 데이터 삭제
        localStorage.removeItem("guest_cart");
        console.log(
          `🗑️ [Migration] 완료 (성공: ${successCount}, 실패: ${failCount})`
        );

        // 변경 사항 전파
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch (parseError) {
      console.error("❌ [Migration] JSON 파싱 오류:", parseError);
      // 파싱 실패한 데이터는 삭제
      localStorage.removeItem("guest_cart");
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

  /**
   * 로그아웃 처리 (보안 강화)
   * @param options.reload - 페이지 새로고침 여부 (기본값: true)
   */
  async function handleLogout(options: { reload?: boolean } = { reload: true }) {
    try {
      // 1. 서버에 로그아웃 요청 (세션/쿠키 무효화)
      await logout();
    } catch (err) {
      // 서버 요청 실패해도 클라이언트 정리는 진행
      console.error("로그아웃 서버 요청 실패:", err);
    }

    // 2. Pinia 상태 초기화
    user.value = null;
    error.value = null;
    isLoading.value = false;

    // 3. 민감한 로컬 스토리지 데이터 정리
    const sensitiveKeys = [
      "guest_cart",
      "auth_token",
      "refresh_token",
      "user_data",
      "session_data",
    ];
    sensitiveKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // 무시
      }
    });

    // 4. 세션 스토리지 전체 정리
    try {
      sessionStorage.clear();
    } catch (e) {
      // 무시
    }

    // 5. 장바구니 업데이트 이벤트 발생
    window.dispatchEvent(new Event("cart-updated"));

    // 6. 페이지 새로고침으로 메모리 상태 완전 초기화
    if (options.reload) {
      window.location.href = "/";
    }
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
