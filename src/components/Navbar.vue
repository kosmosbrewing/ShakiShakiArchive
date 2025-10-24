<script lang="ts" setup>
import { ref } from "vue";

import { useColorMode } from "@vueuse/core";
const mode = useColorMode();
mode.value = "light";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ChevronsDown, Menu } from "lucide-vue-next";
import ClothingPost from "@/components/ClothingPost.vue";

interface RouteProps {
  path: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    path: "#ALL",
    label: "ALL",
  },
  {
    path: "#OUTERWEAR",
    label: "OUTERWEAR",
  },
  {
    path: "#TOP",
    label: "TOP",
  },
  {
    path: "#BOTTOM",
    label: "BOTTOM",
  },
  {
    path: "#DRESS",
    label: "DRESS",
  },
  {
    path: "#ACCESSORY",
    label: "ACCESSORY",
  },
  {
    path: "#CONTACT",
    label: "CONTACT",
  },
  {
    path: "#INSTAGRAM",
    label: "INSTAGRAM",
  },
  {
    path: "#LOGIN",
    label: "LOGIN",
  },
  {
    path: "#ACCOUNT",
    label: "ACCOUNT",
  },
  {
    path: "/ClothingPost",
    label: "CLOTHING",
  },
];

const isOpen = ref<boolean>(false);
</script>

<template>
  <header
    :class="{
      'shadow-light': mode === 'light',
      'shadow-dark': mode === 'dark',
      'w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl top-5 mx-auto sticky border z-40 rounded-2xl flex justify-between items-center p-2 bg-card shadow-md': true,
    }"
  >
    <a></a>

    <!-- Mobile -->
    <div class="flex items-center lg:hidden">
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
              <SheetTitle class="flex items-center">
                <a href="/" class="flex items-center">
                  <img
                    src="@/icons/logo01.png"
                    alt="Logo"
                    class="h-8 w-18 ml-3 mt-7"
                  />
                </a>
              </SheetTitle>
            </SheetHeader>

            <div class="flex flex-col gap-2">
              <Button
                v-for="{ path, label } in routeList"
                :key="label"
                as-child
                variant="ghost"
                class="justify-start text-base"
              >
                <RouterLink @click="isOpen = false" :to="path">
                  {{ label }}
                </RouterLink>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>

    <!-- Desktop -->
    <NavigationMenu class="hidden lg:block">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Button
              v-for="{ path, label } in routeList"
              :key="label"
              as-child
              variant="ghost"
              class="justify-start text-base"
            >
              <RouterLink @click="isOpen = false" :to="path">
                {{ label }}
              </RouterLink>
            </Button>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>

    <div class="hidden lg:flex"></div>
  </header>
</template>

<style scoped>
.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}
</style>
