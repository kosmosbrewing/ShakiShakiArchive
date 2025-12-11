<script lang="ts" setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useColorMode } from "@vueuse/core";
import { storeToRefs } from "pinia";

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

const mode = useColorMode();
mode.value = "light";

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);
const isOpen = ref<boolean>(false);

interface RouteProps {
  path: string;
  label: string;
}

// [1] 전체 메뉴 리스트
const allRoutes = computed<RouteProps[]>(() => {
  const baseRoutes = [
    { path: "/product/all", label: "ALL" },
    { path: "/product/outerwear", label: "OUTERWEAR" },
    { path: "/product/topwear", label: "TOP" },
    { path: "/product/bottomwear", label: "BOTTOM" },
    { path: "/product/accessories", label: "ACCESSORY" },
    { path: "/contact", label: "CONTACT" },
    { path: "/", label: "INSTAGRAM" },
    { path: "/about", label: "ABOUT" },
  ];

  if (isAuthenticated.value) {
    return [
      ...baseRoutes,
      { path: "/account", label: "ACCOUNT" },
      { path: "/cart", label: "CART" },
      { path: "", label: "LOGOUT" },
    ];
  } else {
    return [...baseRoutes, { path: "/login", label: "LOGIN" }];
  }
});

// [2] 메뉴를 좌우로 50%씩 나누기 (중앙 로고 공간 확보를 위해)
const leftRoutes = computed(() => {
  const half = Math.ceil(allRoutes.value.length / 2);
  return allRoutes.value.slice(0, half);
});

const rightRoutes = computed(() => {
  const half = Math.ceil(allRoutes.value.length / 2);
  return allRoutes.value.slice(half);
});

const handleLogout = async () => {
  isOpen.value = false;
  await authStore.handleLogout();
  router.push("/");
};

const handleInstagram = () => {
  window.open("https://www.instagram.com", "_blank");
  isOpen.value = false;
};

// [3] 홈 이동 함수
const goHome = () => {
  router.push("/");
};
</script>

<template>
  <header
    :class="{
      'shadow-light': mode === 'light',
      'w-[95%] lg:w-[90%] max-w-screen-2xl top-5 mx-auto sticky z-40 rounded-2xl flex items-center p-4 bg-card shadow-md': true,
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
          src="@/icons/logo01.png"
          alt="Logo"
          class="h-10 w-auto object-contain"
        />
      </div>
      <div class="flex justify-end">
        <Sheet v-model:open="isOpen">
          <SheetTrigger as-child>
            <Menu @click="isOpen = true" class="cursor-pointer" />
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
                    src="@/icons/logo01.png"
                    alt="Logo"
                    class="h-6 w-auto ml-3 mt-7"
                  />
                </SheetTitle>
              </SheetHeader>
              <div class="flex flex-col gap-2 mt-8">
                <Button
                  v-for="{ path, label } in allRoutes"
                  :key="label"
                  as-child
                  variant="ghost"
                  class="justify-start text-sm w-full"
                  @click="isOpen = false"
                >
                  <div
                    :class="[
                      'w-full',
                      ['CONTACT', 'LOGIN', 'ACCOUNT'].includes(label)
                        ? 'mt-8'
                        : 'mt-0',
                    ]"
                  >
                    <span
                      v-if="label === 'INSTAGRAM'"
                      class="block w-full text-left cursor-pointer"
                      @click.stop="handleInstagram"
                      >{{ label }}</span
                    >
                    <span
                      v-else-if="label === 'LOGOUT'"
                      class="block w-full text-left cursor-pointer text-red-500 hover:text-red-600"
                      @click.stop="handleLogout"
                      >{{ label }}</span
                    >
                    <RouterLink v-else :to="path">
                      <span class="block w-full text-left">{{ label }}</span>
                    </RouterLink>
                  </div>
                </Button>
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
          v-for="{ path, label } in leftRoutes"
          :key="label"
          as-child
          variant="ghost"
          class="h-9 px-3 text-xs font-medium"
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
          src="@/icons/logo01.png"
          alt="Logo"
          class="h-10 w-auto min-w-[120px] object-contain hover:opacity-80 transition-opacity"
        />
      </div>

      <div class="flex justify-end items-center flex-wrap gap-1">
        <template v-for="{ path, label } in rightRoutes" :key="label">
          <Button
            v-if="label === 'INSTAGRAM'"
            variant="ghost"
            class="h-9 px-3 text-xs font-medium"
            @click="handleInstagram"
          >
            <span>{{ label }}</span>
          </Button>
          <Button
            v-else-if="label === 'LOGOUT'"
            variant="ghost"
            class="h-9 px-3 text-xs font-medium text-red-500 hover:text-red-600"
            @click="handleLogout"
          >
            <span>{{ label }}</span>
          </Button>
          <Button
            v-else
            as-child
            variant="ghost"
            class="h-9 px-3 text-xs font-medium"
          >
            <RouterLink :to="path">
              <span>{{ label }}</span>
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
