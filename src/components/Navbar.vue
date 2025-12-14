<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useColorMode } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { fetchCart } from "@/lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-vue-next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// 이미지 에셋 Import
import instagramIcon from "@/assets/instagram.png";
import accountIcon from "@/assets/account.png";
import cartIcon from "@/assets/cart.png";
import loginIcon from "@/assets/login.png";
import logoutIcon from "@/assets/logout.png";

const mode = useColorMode();
mode.value = "light";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);
const isOpen = ref<boolean>(false);
const cartItemCount = ref(0);

// 카테고리 메뉴
const categoryRoutes = [
  { path: "/product/all", label: "ALL" },
  { path: "/product/outerwear", label: "OUTERWEAR" },
  { path: "/product/topwear", label: "TOP" },
  { path: "/product/bottomwear", label: "BOTTOM" },
  { path: "/product/accessories", label: "ACCESSORY" },
  { path: "/contact", label: "CONTACT" },
];

// [핵심] 장바구니 카운트 업데이트 함수
const updateCartCount = async () => {
  // 로그인 상태일 때만 실제 DB 조회를 시도
  if (authStore.isAuthenticated) {
    try {
      const cartItems = await fetchCart();
      cartItemCount.value = cartItems.length;
    } catch (error) {
      console.error("Cart fetch error:", error);
      cartItemCount.value = 0;
    }
  } else {
    cartItemCount.value = 0;
  }
};

// 로그인 상태 변경 감지
watch(isAuthenticated, async (newVal) => {
  if (newVal) {
    await updateCartCount();
  } else {
    cartItemCount.value = 0;
  }
});

// 라우트 변경 시 모바일 메뉴 닫기
watch(route, () => {
  isOpen.value = false;
});

const handleLogout = async () => {
  isOpen.value = false;
  await authStore.handleLogout();
  router.push("/");
  // 로그아웃 시 카운트 초기화 및 이벤트 발생
  cartItemCount.value = 0;
};

const handleInstagram = () => {
  window.open("https://www.instagram.com", "_blank");
};

const goHome = () => {
  router.push("/");
};

// [수정] Account 클릭 핸들러 (비로그인 시 로그인 페이지로)
const handleAccountClick = () => {
  if (isAuthenticated.value) {
    router.push("/account");
  } else {
    router.push("/login");
  }
};

onMounted(async () => {
  await updateCartCount();
  // [필수] ProductDetail에서 보낸 'cart-updated' 신호를 듣고 숫자를 갱신
  window.addEventListener("cart-updated", updateCartCount);
});

onUnmounted(() => {
  window.removeEventListener("cart-updated", updateCartCount);
});
</script>

<template>
  <header
    :class="{
      'shadow-light': mode === 'light',
      'w-[95%] lg:w-[90%] max-w-screen-2xl top-5 mx-auto sticky z-40 rounded-2xl flex items-center p-4 bg-card shadow-md transition-all duration-300': true,
    }"
    :style="{
      backgroundColor: 'rgba(var(--color-card-rgb, 255, 255, 255), 0.9)',
    }"
  >
    <div class="grid grid-cols-3 items-center lg:hidden w-full">
      <div></div>
      <div
        class="flex items-center justify-center cursor-pointer"
        @click="goHome"
      >
        <img
          src="@/assets/logo01.png"
          alt="Logo"
          class="h-10 w-auto object-contain"
        />
      </div>
      <div class="flex justify-end">
        <Sheet v-model:open="isOpen">
          <SheetTrigger as-child>
            <Menu class="cursor-pointer h-6 w-6" />
          </SheetTrigger>
          <SheetContent
            side="left"
            class="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card"
          >
            <div>
              <SheetHeader class="mb-4">
                <SheetTitle
                  class="flex items-center cursor-pointer"
                  @click="goHome"
                >
                  <img
                    src="@/assets/logo01.png"
                    alt="Logo"
                    class="h-6 w-auto ml-3 mt-7"
                  />
                </SheetTitle>
              </SheetHeader>
              <div class="flex flex-col gap-4 mt-8 px-2">
                <RouterLink
                  v-for="route in categoryRoutes"
                  :key="route.label"
                  :to="route.path"
                  class="text-sm font-medium hover:text-primary transition-colors"
                >
                  {{ route.label }}
                </RouterLink>
                <div class="h-px bg-border my-2"></div>

                <div
                  class="text-sm font-medium cursor-pointer"
                  @click="handleInstagram"
                >
                  INSTAGRAM
                </div>

                <div
                  class="text-sm font-medium cursor-pointer"
                  @click="handleAccountClick"
                >
                  ACCOUNT
                </div>

                <template v-if="isAuthenticated">
                  <RouterLink
                    to="/cart"
                    class="text-sm font-medium flex justify-between"
                  >
                    CART
                    <span
                      v-if="cartItemCount > 0"
                      class="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full"
                      >{{ cartItemCount }}</span
                    >
                  </RouterLink>
                  <div
                    class="text-sm font-medium text-red-500 cursor-pointer"
                    @click="handleLogout"
                  >
                    LOGOUT
                  </div>
                </template>
                <template v-else>
                  <RouterLink to="/login" class="text-sm font-medium"
                    >LOGIN</RouterLink
                  >
                </template>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>

    <div
      class="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center w-full gap-4"
    >
      <div class="flex justify-start items-center flex-wrap gap-1">
        <Button
          v-for="{ path, label } in categoryRoutes"
          :key="label"
          as-child
          variant="ghost"
          class="h-9 px-3 text-xs font-medium hover:bg-muted/50"
        >
          <RouterLink :to="path">
            <span>{{ label }}</span>
          </RouterLink>
        </Button>
      </div>

      <div
        class="flex justify-center flex-shrink-0 cursor-pointer px-4"
        @click="goHome"
      >
        <img
          src="@/assets/logo01.png"
          alt="Logo"
          class="h-10 w-auto min-w-[120px] object-contain hover:opacity-80 transition-opacity"
        />
      </div>

      <div class="flex justify-end items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          @click="handleInstagram"
        >
          <img
            :src="instagramIcon"
            alt="Instagram"
            class="w-5 h-5 object-contain"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt="Account"
            class="w-5 h-5 object-contain"
          />
        </Button>

        <template v-if="isAuthenticated">
          <Button
            variant="ghost"
            size="icon"
            as-child
            class="relative hover:bg-transparent hover:scale-110 transition-transform overflow-visible"
          >
            <RouterLink to="/cart">
              <div class="relative inline-block">
                <img
                  :src="cartIcon"
                  alt="Cart"
                  class="w-6 h-6 object-contain"
                />
                <span
                  v-if="cartItemCount > 0"
                  class="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
                >
                  {{ cartItemCount }}
                </span>
              </div>
            </RouterLink>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            @click="handleLogout"
            class="hover:bg-transparent hover:scale-110 transition-transform"
          >
            <img
              :src="logoutIcon"
              alt="Logout"
              class="w-5 h-5 object-contain"
            />
          </Button>
        </template>

        <template v-else>
          <Button
            variant="ghost"
            size="icon"
            as-child
            class="hover:bg-transparent hover:scale-110 transition-transform"
          >
            <RouterLink to="/login">
              <img
                :src="loginIcon"
                alt="Login"
                class="w-5 h-5 object-contain"
              />
            </RouterLink>
          </Button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}
</style>
