<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCategoryStore } from "@/stores/category";
import { useCartStore } from "@/stores/cart";
import { useAlert } from "@/composables/useAlert";
import { AUTH_MESSAGES } from "@/lib/messages";
import { useColorMode } from "@vueuse/core";
import { storeToRefs } from "pinia";

// UI Components
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-vue-next";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// 장바구니 Sheet 컴포넌트
import CartSheet from "@/components/CartSheet.vue";

// 이미지 에셋 Import
import instagramIcon from "@/assets/instagram.png";
import accountIcon from "@/assets/account.png";
import cartIcon from "@/assets/cart.png";
import loginIcon from "@/assets/login.png";
import logoutIcon from "@/assets/logout.png";
import faqIcon from "@/assets/FAQ.png";

const mode = useColorMode();
mode.value = "light";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const cartStore = useCartStore();
const { showAlert, showConfirm } = useAlert();

const { isAuthenticated } = storeToRefs(authStore);
const { categoryRoutes } = storeToRefs(categoryStore);
const { totalQuantity: cartItemCount } = storeToRefs(cartStore);

const isOpen = ref<boolean>(false);
const cartSheetOpen = ref<boolean>(false);

// 뒤로가기로 시트를 닫는지 여부를 추적
const closingByPopState = ref(false);

// 장바구니 카운트 업데이트 (스토어 활용, 강제 새로고침)
const updateCartCount = async () => {
  try {
    await cartStore.loadCart(true);
  } catch (error) {
    console.error("Cart fetch error:", error);
  }
};

// 감시 및 이벤트 핸들러들
watch(isAuthenticated, async () => {
  await updateCartCount();
});

watch(route, () => {
  // 라우트 변경 시 모바일 메뉴 닫기 (history.back() 방지)
  if (isOpen.value) {
    closingByPopState.value = true;
    isOpen.value = false;
  }
  updateCartCount();
});

// 모바일 시트 열림/닫힘에 따른 history 관리
watch(isOpen, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // 시트가 열릴 때: history에 가상 상태 추가
    window.history.pushState({ mobileMenuOpen: true }, '');
  } else if (!newValue && oldValue && !closingByPopState.value) {
    // 시트가 닫힐 때 (뒤로가기가 아닌 경우): history에서 제거
    window.history.back();
  }
  // 플래그 리셋
  closingByPopState.value = false;
});

// CartSheet 닫힐 때 카운트 동기화
watch(cartSheetOpen, (isOpen) => {
  if (!isOpen) {
    updateCartCount();
  }
});

const handleLogout = async () => {
  const confirmed = await showConfirm(AUTH_MESSAGES.logoutConfirm, {
    confirmText: "로그아웃",
    cancelText: "취소",
  });

  if (!confirmed) return;

  isOpen.value = false;
  showAlert(AUTH_MESSAGES.logoutSuccess);
  // 🔒 보안: 로그아웃 시 페이지 새로고침 강제 (캐시된 개인정보 완전 제거)
  await authStore.handleLogout({ reload: true });
  router.push("/");
};

const INSTAGRAM_USERNAME = "shakishaki_archive";
const INSTAGRAM_WEB_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
const INSTAGRAM_APP_URL = `instagram://user?username=${INSTAGRAM_USERNAME}`;
const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

const handleInstagram = () => {
  if (isOpen.value) {
    closingByPopState.value = true;
    isOpen.value = false;
  }

  if (isMobileDevice()) {
    const cleanupCallbacks: Array<() => void> = [];
    let fallbackTimer: number | null = null;
    let isCleanedUp = false;
    const clearFallback = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      cleanupCallbacks.forEach((cleanup) => cleanup());
    };

    const handlePageHidden = () => {
      if (document.hidden) {
        clearFallback();
      }
    };
    const handlePageHide = () => clearFallback();
    const handleBlur = () => clearFallback();

    document.addEventListener("visibilitychange", handlePageHidden);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("blur", handleBlur);
    cleanupCallbacks.push(() =>
      document.removeEventListener("visibilitychange", handlePageHidden)
    );
    cleanupCallbacks.push(() =>
      window.removeEventListener("pagehide", handlePageHide)
    );
    cleanupCallbacks.push(() => window.removeEventListener("blur", handleBlur));

    fallbackTimer = window.setTimeout(() => {
      clearFallback();
      window.location.href = INSTAGRAM_WEB_URL;
    }, 1800);

    window.location.href = INSTAGRAM_APP_URL;
    return;
  }

  window.open(INSTAGRAM_WEB_URL, "_blank", "noopener,noreferrer");
};

const goHome = () => {
  router.push("/");
};

const handleAccountClick = () => {
  isOpen.value = false;
  if (isAuthenticated.value) {
    router.push("/account");
  } else {
    router.push("/login");
  }
};

const handleCartClick = () => {
  isOpen.value = false;
  cartSheetOpen.value = true;
};

const handleFAQClick = () => {
  closingByPopState.value = true;
  isOpen.value = false;
  router.push("/faq");
};

// 뒤로가기 이벤트 핸들러
const handlePopState = () => {
  if (isOpen.value) {
    // 시트가 열려있는 경우 뒤로가기로 시트 닫기
    closingByPopState.value = true;
    isOpen.value = false;
  }
};

onMounted(async () => {
  await Promise.all([cartStore.loadCart(), categoryStore.loadCategories()]);
  window.addEventListener("cart-updated", updateCartCount);
  window.addEventListener("popstate", handlePopState);
});

onUnmounted(() => {
  window.removeEventListener("cart-updated", updateCartCount);
  window.removeEventListener("popstate", handlePopState);
});
</script>

<template>
  <header
    :class="{
      'w-11/12 max-w-screen-2xl top-5 mx-auto sticky z-40 shadow-light border-zinc-200 rounded-2xl flex items-center px-4 p-3 lg:p-4 bg-card shadow-md transition-all duration-300': true,
    }"
    :style="{
      backgroundColor: 'rgba(var(--color-card-rgb, 255, 255, 255), 0.3)',
    }"
  >
    <!-- Mobile -->
    <div
      class="relative flex items-center justify-between lg:hidden w-full"
      style="min-height: 40px"
    >
      <div class="flex justify-start z-10">
        <Sheet v-model:open="isOpen">
          <SheetTrigger as-child>
            <button type="button" aria-label="메뉴 열기" class="p-0 bg-transparent border-0">
              <Menu class="cursor-pointer h-6 w-6" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="left"
            class="flex flex-col rounded-tr-2xl rounded-br-2xl bg-card"
            @open-auto-focus="(event) => event.preventDefault()"
          >
            <div class="flex flex-col gap-0.5 mt-12">
              <RouterLink
                v-for="route in categoryRoutes"
                :key="route.label"
                :to="route.path"
                class="text-body font-medium hover:text-primary transition-colors tracking-wider py-1.5 pl-3"
                @click="closingByPopState = true; isOpen = false"
              >
                {{ route.label }}
              </RouterLink>
              <button
                type="button"
                class="text-body font-medium hover:text-primary transition-colors tracking-wider py-1.5 text-left pl-3"
                aria-label="Instagram 공식 계정 열기"
                @click="handleInstagram"
              >
                INSTAGRAM
              </button>

              <button
                type="button"
                class="text-body font-medium hover:text-primary transition-colors tracking-wider py-1.5 text-left pl-3"
                aria-label="자주 묻는 질문"
                @click="handleFAQClick"
              >
                FAQ
              </button>
            </div>
            <div class="flex-1"></div>

            <div class="flex justify-end p-2 mt-2">
              <Button
                v-if="isAuthenticated"
                variant="ghost"
                size="icon"
                class="h-10 w-10 hover:bg-transparent"
                aria-label="로그아웃"
                @click="handleLogout"
              >
                <img
                  :src="logoutIcon"
                  alt=""
                  aria-hidden="true"
                  class="w-6 h-6 object-contain"
                  draggable="false"
                />
              </Button>

              <Button
                v-else
                variant="ghost"
                size="icon"
                as-child
                class="h-10 w-10 hover:bg-transparent"
                aria-label="로그인"
              >
                <RouterLink to="/login" @click="closingByPopState = true; isOpen = false">
                  <img
                    :src="loginIcon"
                    alt=""
                    aria-hidden="true"
                    class="w-6 h-6 object-contain"
                    draggable="false"
                  />
                </RouterLink>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <button
        type="button"
        class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer overflow-visible bg-transparent border-0 p-0"
        aria-label="홈으로 이동"
        @click="goHome"
      >
        <img
          src="@/assets/optimized/logo01-1.webp"
          alt="샤키샤키 아카이브"
          class="w-auto max-h-[38px] min-h-[24px] max-w-[65vw]"
          style="height: clamp(24px, 7vw, 38px)"
          draggable="false"
        />
      </button>

      <div class="flex items-center justify-end gap-[clamp(0.375rem,2vw,0.75rem)] z-10">
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 hover:bg-transparent p-0"
          :aria-label="isAuthenticated ? '내 계정' : '로그인'"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt=""
            aria-hidden="true"
            class="w-full h-full object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 relative hover:bg-transparent overflow-visible p-0"
          :aria-label="`장바구니${cartItemCount > 0 ? ` (${cartItemCount}개 상품)` : ''}`"
          @click="handleCartClick"
        >
          <div class="relative w-full h-full">
            <img
              :src="cartIcon"
              alt=""
              aria-hidden="true"
              class="w-full h-full object-contain"
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1 -right-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white"
              aria-hidden="true"
            >
              {{ cartItemCount }}
            </span>
          </div>
        </Button>
      </div>
    </div>

    <!-- Desktop -->
    <div
      class="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center w-full gap-4"
    >
      <div class="flex justify-start items-center flex-wrap gap-1">
        <Button
          v-for="{ path, label } in categoryRoutes"
          :key="label"
          as-child
          variant="ghost"
          class="h-9 pl-1 px-2.5 text-caption font-medium hover:bg-transparent tracking-wider"
        >
          <RouterLink
            :to="path"
            class="hover:text-primary transition-colors tracking-wider py-3"
          >
            <span class="text-caption">{{ label }}</span>
          </RouterLink>
        </Button>
      </div>

      <button
        type="button"
        class="flex justify-center flex-shrink-0 cursor-pointer px-4 bg-transparent border-0"
        aria-label="홈으로 이동"
        @click="goHome"
      >
        <img
          src="@/assets/optimized/logo01-1.webp"
          alt="샤키샤키 아카이브"
          class="h-10 w-auto min-w-[120px] object-contain hover:opacity-80 transition-opacity"
          draggable="false"
        />
      </button>

      <div class="flex justify-end items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          aria-label="Instagram 공식 계정 열기"
          @click="handleInstagram"
        >
          <img
            :src="instagramIcon"
            alt=""
            aria-hidden="true"
            class="w-5 h-5 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          :aria-label="isAuthenticated ? '내 계정' : '로그인'"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt=""
            aria-hidden="true"
            class="w-5 h-5 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          aria-label="자주 묻는 질문"
          @click="handleFAQClick"
        >
          <img
            :src="faqIcon"
            alt=""
            aria-hidden="true"
            class="w-5 h-5 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="relative hover:bg-transparent hover:scale-110 transition-transform overflow-visible"
          :aria-label="`장바구니${cartItemCount > 0 ? ` (${cartItemCount}개 상품)` : ''}`"
          @click="handleCartClick"
        >
          <div class="relative inline-block">
            <img
              :src="cartIcon"
              alt=""
              aria-hidden="true"
              class="w-5 h-5 object-contain"
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
              aria-hidden="true"
            >
              {{ cartItemCount }}
            </span>
          </div>
        </Button>

        <template v-if="isAuthenticated">
          <Button
            variant="ghost"
            size="icon"
            class="hover:bg-transparent hover:scale-110 transition-transform"
            aria-label="로그아웃"
            @click="handleLogout"
          >
            <img
              :src="logoutIcon"
              alt=""
              aria-hidden="true"
              class="w-5 h-5 object-contain"
              draggable="false"
            />
          </Button>
        </template>

        <template v-else>
          <Button
            variant="ghost"
            size="icon"
            as-child
            class="hover:bg-transparent hover:scale-110 transition-transform"
            aria-label="로그인"
          >
            <RouterLink to="/login">
              <img
                :src="loginIcon"
                alt=""
                aria-hidden="true"
                class="w-5 h-5 object-contain"
                draggable="false"
              />
            </RouterLink>
          </Button>
        </template>
      </div>
    </div>
  </header>

  <!-- 장바구니 Sheet -->
  <CartSheet v-model:open="cartSheetOpen" />
</template>

<style scoped>
.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}
</style>
