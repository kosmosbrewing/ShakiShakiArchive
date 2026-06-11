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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// 장바구니 Sheet 컴포넌트
import CartSheet from "@/components/CartSheet.vue";

// 이미지 에셋 Import
import menuIcon from "@/assets/optimized/menu.webp";
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

const INSTAGRAM_USERNAME = "shaki.arc";
const INSTAGRAM_WEB_URL = "https://www.instagram.com/shaki.arc?igsh=cWl3MHpkZHY1aHZ2&utm_source=qr";
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
  <div class="sticky top-0 z-40">
    <div
      class="flex h-5 w-full items-center justify-center bg-primary text-white text-[10px] sm:text-[11px] lg:text-xs tracking-wider"
    >
      one-of-one japanese vintage sets
    </div>

    <header
      class="nav-header relative w-full mx-0 flex items-center rounded-none border-zinc-200 p-3 px-4 shadow-none transition-all duration-300 lg:bg-card lg:px-10 lg:py-0"
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
              <img
                :src="menuIcon"
                alt=""
                aria-hidden="true"
                class="w-8 h-8 object-contain"
                draggable="false"
              />
            </button>
          </SheetTrigger>

          <SheetContent
            side="left"
            class="flex flex-col bg-card"
            @open-auto-focus="(event) => event.preventDefault()"
          >
            <div class="flex flex-col gap-7 mt-14 px-4 text-primary">
              <nav class="flex flex-col gap-1.5" aria-label="Shop menu">
                <RouterLink
                  to="/product/all"
                  class="text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  shop
                </RouterLink>
                <RouterLink
                  v-for="route in categoryRoutes"
                  :key="route.label"
                  :to="route.path"
                  class="text-xl font-normal leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  {{ route.label }}
                </RouterLink>
              </nav>

              <nav class="flex flex-col gap-1.5" aria-label="Archive menu">
                <RouterLink
                  to="/archive/sold"
                  class="text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  archive
                </RouterLink>
                <RouterLink
                  to="/archive/sold"
                  class="text-xl font-normal leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  sold archive
                </RouterLink>
                <RouterLink
                  to="/archive/journal"
                  class="text-xl font-normal leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  journal
                </RouterLink>
              </nav>

              <nav class="flex flex-col gap-2.5" aria-label="Site menu">
                <RouterLink
                  to="/about"
                  class="text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  about
                </RouterLink>

                <RouterLink
                  to="/notice"
                  class="text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  @click="closingByPopState = true; isOpen = false"
                >
                  notice
                </RouterLink>

                <button
                  type="button"
                  class="text-left text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  aria-label="FAQ"
                  @click="handleFAQClick"
                >
                  FAQ
                </button>

                <button
                  type="button"
                  class="text-left text-2xl font-semibold leading-snug tracking-wide hover:text-primary/80 transition-colors"
                  aria-label="Instagram 공식 계정 열기"
                  @click="handleInstagram"
                >
                  instagram
                </button>
              </nav>
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
          src="@/assets/optimized/logo01-2.webp"
          alt="샤키샤키 아카이브"
          class="w-auto max-h-[58px] min-h-[40px] max-w-[65vw]"
          style="height: clamp(44px, 12vw, 58px)"
          draggable="false"
        />
      </button>

      <div class="flex items-center justify-end gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 hover:bg-transparent p-0"
          :aria-label="isAuthenticated ? '내 계정' : '로그인'"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt=""
            aria-hidden="true"
            class="h-6 w-6 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 relative hover:bg-transparent overflow-visible p-0"
          :aria-label="`장바구니${cartItemCount > 0 ? ` (${cartItemCount}개 상품)` : ''}`"
          @click="handleCartClick"
        >
          <div class="relative h-6 w-6">
            <img
              :src="cartIcon"
              alt=""
              aria-hidden="true"
              class="h-6 w-6 object-contain"
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1 -right-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm"
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
      <div class="flex justify-start items-center">
        <Button
          as-child
          variant="ghost"
          class="h-8 px-2 text-lg leading-none font-semibold hover:bg-transparent tracking-wider"
        >
          <RouterLink
            to="/product/all"
            class="hover:text-primary transition-colors tracking-wider py-2"
          >
            shop
          </RouterLink>
        </Button>

        <Button
          as-child
          variant="ghost"
          class="h-8 px-2 text-lg leading-none font-semibold hover:bg-transparent tracking-wider"
        >
          <RouterLink
            to="/archive/sold"
            class="hover:text-primary transition-colors tracking-wider py-2"
          >
            archive
          </RouterLink>
        </Button>

        <Button
          as-child
          variant="ghost"
          class="h-8 px-2 text-lg leading-none font-semibold hover:bg-transparent tracking-wider"
        >
          <RouterLink
            to="/about"
            class="hover:text-primary transition-colors tracking-wider py-2"
          >
            about
          </RouterLink>
        </Button>

        <Button
          as-child
          variant="ghost"
          class="h-8 px-2 text-lg leading-none font-semibold hover:bg-transparent tracking-wider"
        >
          <RouterLink
            to="/notice"
            class="hover:text-primary transition-colors tracking-wider py-2"
          >
            notice
          </RouterLink>
        </Button>
      </div>

      <button
        type="button"
        class="flex justify-center flex-shrink-0 cursor-pointer px-3 bg-transparent border-0"
        aria-label="홈으로 이동"
        @click="goHome"
      >
        <img
          src="@/assets/optimized/logo01-1.webp"
          alt="샤키샤키 아카이브"
          class="h-16 w-auto min-w-[192px] object-contain hover:opacity-80 transition-opacity"
          draggable="false"
        />
      </button>

      <div class="flex justify-end items-center gap-[1.125rem]">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform"
          aria-label="Instagram 공식 계정 열기"
          @click="handleInstagram"
        >
          <img
            :src="instagramIcon"
            alt=""
            aria-hidden="true"
            class="w-7 h-7 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform"
          :aria-label="isAuthenticated ? '내 계정' : '로그인'"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt=""
            aria-hidden="true"
            class="w-7 h-7 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform"
          aria-label="문의하기"
          @click="handleFAQClick"
        >
          <img
            :src="faqIcon"
            alt=""
            aria-hidden="true"
            class="w-7 h-7 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="relative h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform overflow-visible"
          :aria-label="`장바구니${cartItemCount > 0 ? ` (${cartItemCount}개 상품)` : ''}`"
          @click="handleCartClick"
        >
          <div class="relative inline-block">
            <img
              :src="cartIcon"
              alt=""
              aria-hidden="true"
              class="w-7 h-7 object-contain"
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm"
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
            class="h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform"
            aria-label="로그아웃"
            @click="handleLogout"
          >
            <img
              :src="logoutIcon"
              alt=""
              aria-hidden="true"
              class="w-7 h-7 object-contain"
              draggable="false"
            />
          </Button>
        </template>

        <template v-else>
          <Button
            variant="ghost"
            size="icon"
            as-child
            class="h-7 w-7 p-0 hover:bg-transparent hover:scale-110 transition-transform"
            aria-label="로그인"
          >
            <RouterLink to="/login">
              <img
                :src="loginIcon"
                alt=""
                aria-hidden="true"
                class="w-7 h-7 object-contain"
                draggable="false"
              />
            </RouterLink>
          </Button>
        </template>
      </div>
    </div>
    </header>
  </div>

  <!-- 장바구니 Sheet -->
  <CartSheet v-model:open="cartSheetOpen" />
</template>

<style scoped>
.nav-header {
  background-color: transparent;
}

/* 하단 더블 헤어라인: 데스크톱과 동일하게 모바일에도 표시 */
.nav-header::before,
.nav-header::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  pointer-events: none;
}

.nav-header::before {
  bottom: 2px;
  background-color: hsl(var(--primary) / 0.42);
}

.nav-header::after {
  bottom: 0;
  background-color: hsl(var(--primary) / 0.42);
}

@media (min-width: 1024px) {
  .nav-header {
    background-color: hsl(var(--card));
  }
}

.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}

@media (min-width: 1024px) {
  .shadow-light {
    box-shadow: none;
  }
}
</style>
