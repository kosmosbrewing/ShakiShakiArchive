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
  SheetTrigger,
  SheetHeader,
  SheetTitle,
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
];

// [수정] 장바구니 카운트 업데이트 (회원/비회원 분기 처리)
const updateCartCount = async () => {
  if (authStore.isAuthenticated) {
    try {
      // 회원: 서버 API 조회
      const cartItems = await fetchCart();
      cartItemCount.value = cartItems.length;
    } catch (error) {
      console.error("Cart fetch error:", error);
      cartItemCount.value = 0;
    }
  } else {
    // 비회원: 로컬 스토리지 조회
    const localCart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
    cartItemCount.value = localCart.length;
  }
};

// 로그인 상태 변경 감지
watch(isAuthenticated, async () => {
  await updateCartCount();
});

// 라우트 변경 시 모바일 메뉴 닫기 & 카운트 갱신
watch(route, () => {
  isOpen.value = false;
  updateCartCount();
});

const handleLogout = async () => {
  isOpen.value = false;
  await authStore.handleLogout();
  router.push("/");
  // 로그아웃 시 cart-updated 이벤트가 authStore에서 발생하므로 자동 갱신됨
};

const handleInstagram = () => {
  window.open("https://www.instagram.com", "_blank");
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
  router.push("/cart");
};

// [중요] 이벤트 리스너 등록 (병합 완료 신호 수신)
onMounted(async () => {
  await updateCartCount();
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
    <div
      class="relative flex items-center justify-between lg:hidden w-full h-10"
    >
      <div class="flex justify-start z-10">
        <Sheet v-model:open="isOpen">
          <SheetTrigger as-child>
            <Menu class="cursor-pointer h-6 w-6" />
          </SheetTrigger>

          <SheetContent
            side="left"
            class="flex flex-col rounded-tr-2xl rounded-br-2xl bg-card"
          >
            <SheetHeader class="mb-4 text-left">
              <SheetTitle
                class="flex items-center cursor-pointer"
                @click="goHome"
              >
                <img
                  src="@/assets/logo03.png"
                  alt="Logo"
                  class="h-6 w-auto ml-1 mt-5"
                />
              </SheetTitle>
            </SheetHeader>

            <div class="flex flex-col gap-1">
              <RouterLink
                v-for="route in categoryRoutes"
                :key="route.label"
                :to="route.path"
                class="text-base font-medium hover:text-primary transition-colors py-3"
                @click="isOpen = false"
              >
                {{ route.label }}
              </RouterLink>
            </div>

            <div class="flex-1"></div>

            <div class="flex justify-end p-2 mt-2">
              <Button
                v-if="isAuthenticated"
                variant="ghost"
                size="icon"
                class="h-10 w-10 hover:bg-transparent"
                @click="handleLogout"
                title="LOGOUT"
              >
                <img
                  :src="logoutIcon"
                  alt="Logout"
                  class="w-6 h-6 object-contain"
                />
              </Button>

              <Button
                v-else
                variant="ghost"
                size="icon"
                as-child
                class="h-10 w-10 hover:bg-transparent"
                title="LOGIN"
              >
                <RouterLink to="/login" @click="isOpen = false">
                  <img
                    :src="loginIcon"
                    alt="Login"
                    class="w-6 h-6 object-contain"
                  />
                </RouterLink>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div
        class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
        @click="goHome"
      >
        <img
          src="@/assets/logo01.png"
          alt="Logo"
          class="h-10 w-auto object-contain"
        />
      </div>

      <div class="flex items-center justify-end gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 hover:bg-transparent p-1"
          @click="handleInstagram"
        >
          <img
            :src="instagramIcon"
            alt="Instagram"
            class="w-full h-full object-contain"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 hover:bg-transparent p-1"
          @click="handleAccountClick"
        >
          <img
            :src="accountIcon"
            alt="Account"
            class="w-full h-full object-contain"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 relative hover:bg-transparent overflow-visible p-1"
          @click="handleCartClick"
        >
          <div class="relative w-full h-full">
            <img
              :src="cartIcon"
              alt="Cart"
              class="w-full h-full object-contain"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1 -right-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white"
            >
              {{ cartItemCount }}
            </span>
          </div>
        </Button>
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

        <Button
          variant="ghost"
          size="icon"
          as-child
          class="relative hover:bg-transparent hover:scale-110 transition-transform overflow-visible"
        >
          <RouterLink to="/cart">
            <div class="relative inline-block">
              <img :src="cartIcon" alt="Cart" class="w-6 h-6 object-contain" />
              <span
                v-if="cartItemCount > 0"
                class="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
              >
                {{ cartItemCount }}
              </span>
            </div>
          </RouterLink>
        </Button>

        <template v-if="isAuthenticated">
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
