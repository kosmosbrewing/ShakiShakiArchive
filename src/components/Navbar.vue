<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCategoryStore } from "@/stores/category";
import { useCartStore } from "@/stores/cart";
import { useColorMode } from "@vueuse/core";
import { storeToRefs } from "pinia";

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

// 장바구니 Sheet 컴포넌트
import CartSheet from "@/components/CartSheet.vue";

// 이미지 에셋 Import
import instagramIcon from "@/assets/instagram.png";
import accountIcon from "@/assets/account.png";
import cartIcon from "@/assets/cart.png";
import loginIcon from "@/assets/login.png";
import logoutIcon from "@/assets/logout.png";
import qaIcon from "@/assets/QA.png";

const mode = useColorMode();
mode.value = "light";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const cartStore = useCartStore();

const { isAuthenticated } = storeToRefs(authStore);
const { categoryRoutes } = storeToRefs(categoryStore);
const { itemCount: cartItemCount } = storeToRefs(cartStore);

const isOpen = ref<boolean>(false);
const cartSheetOpen = ref<boolean>(false);

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
  isOpen.value = false;
  updateCartCount();
});

// CartSheet 닫힐 때 카운트 동기화
watch(cartSheetOpen, (isOpen) => {
  if (!isOpen) {
    updateCartCount();
  }
});

const handleLogout = async () => {
  isOpen.value = false;
  // auth store에서 새로고침까지 처리함
  await authStore.handleLogout();
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
  cartSheetOpen.value = true;
};

const handleQAClick = () => {
  isOpen.value = false;
  router.push("/inquiry");
};

onMounted(async () => {
  await Promise.all([cartStore.loadCart(), categoryStore.loadCategories()]);
  window.addEventListener("cart-updated", updateCartCount);
});

onUnmounted(() => {
  window.removeEventListener("cart-updated", updateCartCount);
});
</script>

<template>
  <header
    :class="{
      'w-11/12 max-w-screen-2xl top-5 mx-auto sticky z-40 shadow-light border-zinc-200 rounded-2xl flex items-center p-4 bg-card shadow-md transition-all duration-300': true,
    }"
    :style="{
      backgroundColor: 'rgba(var(--color-card-rgb, 255, 255, 255), 0.9)',
    }"
  >
    <!-- Mobile -->
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
                  class="h-10 w-auto ml-1 mt-10 object-contain"
                  draggable="false"
                />
              </SheetTitle>
            </SheetHeader>

            <div class="flex flex-col gap-1">
              <RouterLink
                v-for="route in categoryRoutes"
                :key="route.label"
                :to="route.path"
                class="text-body font-medium hover:text-primary transition-colors tracking-wider py-3"
                @click="isOpen = false"
              >
                {{ route.label }}
              </RouterLink>
              <Button
                variant="ghost"
                class="text-body font-medium hover:text-primary hover:bg-transparent transition-colors tracking-wider py-3 justify-start px-0"
                @click="handleInstagram"
              >
                INSTAGRAM
              </Button>
              <Button
                variant="ghost"
                class="text-body font-medium hover:text-primary hover:bg-transparent transition-colors tracking-wider py-3 justify-start px-0"
                @click="handleQAClick"
              >
                Q&A
              </Button>
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
                  draggable="false"
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
                    draggable="false"
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
          class="h-8 w-auto object-contain"
          draggable="false"
        />
      </div>

      <div class="flex items-center justify-end gap-1 z-10">
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
            draggable="false"
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
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1 -right-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white"
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
          class="h-9 pl-1 px-2.5 text-caption font-medium hover:bg-muted/10 tracking-wider"
        >
          <RouterLink
            :to="path"
            class="hover:text-primary transition-colors tracking-wider py-3"
          >
            <span class="text-caption">{{ label }}</span>
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
          draggable="false"
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
            draggable="false"
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
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="hover:bg-transparent hover:scale-110 transition-transform"
          @click="handleQAClick"
        >
          <img
            :src="qaIcon"
            alt="Q&A"
            class="w-5 h-5 object-contain"
            draggable="false"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          class="relative hover:bg-transparent hover:scale-110 transition-transform overflow-visible"
          @click="handleCartClick"
        >
          <div class="relative inline-block">
            <img
              :src="cartIcon"
              alt="Cart"
              class="w-5 h-5 object-contain"
              draggable="false"
            />
            <span
              v-if="cartItemCount > 0"
              class="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
            >
              {{ cartItemCount }}
            </span>
          </div>
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
          >
            <RouterLink to="/login">
              <img
                :src="loginIcon"
                alt="Login"
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
