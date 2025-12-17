<script setup lang="ts">
// src/pages/Account.vue
// 마이페이지

import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useOrderStats } from "@/composables/useOrders";
import { useWishlistCount } from "@/composables/useWishlist";

// Shadcn UI 컴포넌트
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();
const authStore = useAuthStore();

// 주문 현황 통계
const { orderCounts, loadOrderStats } = useOrderStats();

// 위시리스트 개수
const { count: wishlistCount, loadCount: loadWishlistCount } =
  useWishlistCount();

// 유저 이름 표시
const userName = computed(() => {
  return authStore.user?.userName || "고객";
});

// 페이지 이동 함수들
const goToModify = () => router.push("/modify");
const goToOrderList = () => router.push("/orderlist");
const goToWishlist = () => router.push("/wishlist");
const goToAddress = () => router.push("/addresslist");

// 관리자용 페이지 이동
const goToCategoryAdmin = () => router.push("/admin/categories");
const goToProductAdmin = () => router.push("/admin/products");
const goToOrderAdmin = () => router.push("/admin/orders");

onMounted(async () => {
  // 사용자 정보 로드
  if (!authStore.user) {
    await authStore.loadUser();
  }

  // 인증된 경우 통계 로드
  if (authStore.isAuthenticated) {
    loadOrderStats();
    loadWishlistCount();
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-12">
      <h1 class="text-body font-bold uppercase tracking-widest text-foreground">
        My Page
      </h1>
    </div>

    <div class="text-center text-heading mb-10 text-foreground">
      <span class="font-bold">{{ userName }}님</span>은
      <span class="font-bold">일반회원</span>입니다.
    </div>

    <Card class="mb-16">
      <CardContent class="flex justify-between text-center py-6 px-4 md:px-10">
        <div
          @click="goToOrderList"
          class="flex-1 border-r border-border last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div class="text-caption text-muted-foreground mb-3">입금전</div>
          <div class="text-heading text-foreground">
            {{ orderCounts.pending }}
          </div>
        </div>

        <div
          @click="goToOrderList"
          class="flex-1 border-r border-border last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div class="text-caption text-muted-foreground mb-3">배송준비중</div>
          <div class="text-heading text-foreground">
            {{ orderCounts.preparing }}
          </div>
        </div>

        <div
          @click="goToOrderList"
          class="flex-1 border-r border-border last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div class="text-caption text-muted-foreground mb-3">배송중</div>
          <div class="text-heading text-foreground">
            {{ orderCounts.shipped }}
          </div>
        </div>

        <div
          @click="goToOrderList"
          class="flex-1 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div class="text-caption text-muted-foreground mb-3">배송완료</div>
          <div class="text-heading text-foreground">
            {{ orderCounts.delivered }}
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
      <Button
        variant="outline"
        @click="goToOrderList"
        class="h-16 text-body font-medium"
      >
        ORDER
      </Button>

      <Button
        variant="outline"
        @click="goToWishlist"
        class="h-16 text-body font-medium"
      >
        <span>WISHLIST</span>
        &nbsp;
        <span
          v-if="wishlistCount > 0"
          class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground transition-all group-hover:bg-primary/90"
        >
          {{ wishlistCount }}
        </span>
      </Button>

      <Button
        variant="outline"
        @click="goToModify"
        class="h-16 text-body font-medium"
      >
        PROFILE
      </Button>

      <Button
        variant="outline"
        @click="goToAddress"
        class="h-16 text-body font-medium"
      >
        ADDRESS
      </Button>
    </div>

    <div v-if="authStore.user?.isAdmin" class="border-t border-border pt-8">
      <div class="text-body text-admin font-bold uppercase mb-4">
        Admin Menu
      </div>
      <div class="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          @click="goToCategoryAdmin"
          class="bg-admin hover:bg-gray-800 text-white"
        >
          카테고리 관리
        </Button>
        <Button variant="default" size="sm" @click="goToProductAdmin">
          상품 관리
        </Button>
        <Button
          size="sm"
          @click="goToOrderAdmin"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        >
          주문 관리
        </Button>
      </div>
    </div>
  </div>
</template>
