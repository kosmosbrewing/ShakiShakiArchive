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
import { LoadingSpinner, EmptyState } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 위시리스트 로직
const { wishlistItems, loading, isEmpty, loadWishlist, removeItem } =
  useWishlist();

// 상품 상세 페이지로 이동
const goToDetail = (productId: string) => {
  router.push(`/productDetail/${productId}`);
};

// 아이템 삭제
const handleDelete = (productId: string) => {
  removeItem(productId, "정말 위시리스트에서 삭제하시겠습니까?");
};

onMounted(() => {
  loadWishlist();
});
</script>

<template>
  <section class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6 border-b pb-3">
      <h3 class="text-heading text-primary tracking-wider">MY WISHLIST</h3>
      <p class="text-body text-muted-foreground pt-1">
        관심 있는 상품을 모아두었습니다.
      </p>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="isEmpty"
      header="위시리스트가 비어있습니다."
      message="마음에 드는 상품을 찾아 하트 버튼을 눌러보세요!"
      button-text="쇼핑하러 가기"
      button-link="/product/all"
    />

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
            class="text-body text-foreground font-semibold truncate cursor-pointer"
            @click="goToDetail(item.productId)"
          >
            {{ item.product.name }}
          </h3>
          <p class="text-body text-foreground">
            {{ formatPrice(item.product.price) }}
          </p>
        </CardContent>

        <!-- 삭제 버튼 -->
        <CardFooter class="p-4 pt-0 flex justify-end">
          <Button size="sm" @click="handleDelete(item.productId)">
            <Trash2 class="w-4 h-4 mr-2" /> 삭제
          </Button>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
