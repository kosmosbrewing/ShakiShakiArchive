<script setup lang="ts">
// src/pages/WishList.vue
// 위시리스트 페이지

import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useWishlist } from "@/composables/useWishlist";
import { formatPrice } from "@/lib/formatters";

// 아이콘
import { Trash2, ShoppingBag, ArrowRight } from "lucide-vue-next";

// 공통 컴포넌트
import { LoadingSpinner } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 위시리스트 로직
const { wishlistItems, loading, isEmpty, loadWishlist, removeItem } = useWishlist();

// 상품 상세 페이지로 이동
const goToDetail = (productId: number) => {
  router.push(`/productDetail/${productId}`);
};

// 아이템 삭제
const handleDelete = (productId: number) => {
  removeItem(productId, "정말 위시리스트에서 삭제하시겠습니까?");
};

onMounted(() => {
  loadWishlist();
});
</script>

<template>
  <section class="container py-12 sm:py-20 min-h-[60vh]">
    <div class="mb-10 text-center">
      <h1 class="text-3xl font-bold tracking-tight mb-2">My Wishlist</h1>
      <p class="text-muted-foreground">
        관심 있는 상품을 모아두었습니다.
      </p>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <!-- 빈 위시리스트 -->
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10"
    >
      <div class="bg-muted p-4 rounded-full mb-4">
        <ShoppingBag class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-xl font-semibold mb-2">위시리스트가 비어있습니다.</h3>
      <p class="text-muted-foreground mb-6">
        마음에 드는 상품을 찾아 하트 버튼을 눌러보세요!
      </p>
      <Button @click="router.push('/')" size="lg">
        쇼핑하러 가기 <ArrowRight class="ml-2 w-4 h-4" />
      </Button>
    </div>

    <!-- 위시리스트 그리드 -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <Card
        v-for="item in wishlistItems"
        :key="item.id"
        class="group flex flex-col overflow-hidden transition-all hover:shadow-md"
      >
        <!-- 상품 이미지 -->
        <div
          class="relative aspect-square overflow-hidden cursor-pointer bg-muted"
          @click="goToDetail(item.productId)"
        >
          <img
            :src="item.product.imageUrl || '/placeholder.png'"
            alt="Product Image"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <!-- 품절 표시 -->
          <div
            v-if="!item.product.isAvailable"
            class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold"
          >
            SOLD OUT
          </div>
        </div>

        <!-- 상품 정보 -->
        <CardContent class="p-4 flex-1 flex flex-col gap-2">
          <h3
            class="font-medium truncate cursor-pointer hover:underline"
            @click="goToDetail(item.productId)"
          >
            {{ item.product.name }}
          </h3>
          <p class="text-lg font-bold">
            {{ formatPrice(item.product.price) }}
          </p>
        </CardContent>

        <!-- 삭제 버튼 -->
        <CardFooter class="p-4 pt-0 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            class="text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 w-full sm:w-auto"
            @click="handleDelete(item.productId)"
          >
            <Trash2 class="w-4 h-4 mr-2" /> 삭제
          </Button>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
