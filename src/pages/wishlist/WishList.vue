<script setup lang="ts">
// src/pages/WishList.vue
// 위시리스트 페이지

import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useWishlist, useOptimizedImage } from "@/composables";
import { formatPrice } from "@/lib/formatters";

// 아이콘
import { Trash2 } from "lucide-vue-next";

// 공통 컴포넌트
import { ProductCardSkeleton, EmptyState } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 위시리스트 로직
const { wishlistItems, loading, isEmpty, loadWishlist, removeItem } =
  useWishlist();

// 이미지 최적화
const { card } = useOptimizedImage();

// 호버 상태 관리 (이미지 전환용)
const hoveredProductId = ref<string | null>(null);

// 상품 상세 페이지로 이동
const goToDetail = (productId: string) => {
  router.push(`/productDetail/${productId}`);
};

// 아이템 삭제
const handleDelete = (event: Event, productId: string) => {
  event.stopPropagation();
  removeItem(productId, "정말 위시리스트에서 삭제하시겠습니까?");
};

onMounted(() => {
  loadWishlist();
});
</script>

<template>
  <section class="w-11/12 max-w-screen-2xl mx-auto py-12 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider">위시리스트</h3>
      <p class="text-body text-muted-foreground pt-1 mb-3">
        관심 있는 상품을 모아두었습니다.
      </p>
      <Separator></Separator>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6"
    >
      <!-- 로딩 상태: 스켈레톤 카드 표시 -->
      <ProductCardSkeleton v-if="loading" :count="8" />

      <!-- 빈 상태 -->
      <EmptyState
        v-else-if="isEmpty"
        header="위시리스트가 비어있습니다."
        message="마음에 드는 상품을 찾아 하트 버튼을 눌러보세요!"
        button-text="쇼핑하러 가기"
        button-link="/product/all"
        class="col-span-full"
      />

      <!-- 위시리스트 상품 카드 -->
      <Card
        v-else
        v-for="(item, idx) in wishlistItems"
        :key="item.id"
        class="product-card bg-muted/5 flex flex-col h-full group/hoverimg border-none !shadow-none hover:!shadow-md transition-shadow relative mt-3"
        :style="{ animationDelay: `${idx * 0.05}s` }"
      >
        <CardHeader class="p-0 gap-0 overflow-hidden rounded-t-lg">
          <div
            class="aspect-square cursor-pointer relative"
            @click="goToDetail(item.productId)"
            @mouseenter="hoveredProductId = item.productId"
            @mouseleave="hoveredProductId = null"
          >
            <!-- 기본 이미지 -->
            <img
              :src="card(item.product.imageUrl || '/placeholder.png')"
              :alt="item.product.name"
              class="w-full aspect-square object-cover size-full absolute inset-0 transition-opacity duration-300"
              :class="
                hoveredProductId === item.productId &&
                item.product.images &&
                item.product.images.length > 0
                  ? 'opacity-0'
                  : 'opacity-100'
              "
              loading="lazy"
              decoding="async"
              draggable="false"
            />
            <!-- 호버 이미지 -->
            <img
              v-if="item.product.images && item.product.images.length > 0"
              :src="card(item.product.images[0])"
              :alt="`${item.product.name} - 호버`"
              class="w-full aspect-square object-cover size-full transition-opacity duration-300"
              :class="
                hoveredProductId === item.productId
                  ? 'opacity-100'
                  : 'opacity-0'
              "
              loading="lazy"
              decoding="async"
              draggable="false"
            />

            <!-- SOLD OUT 배지 -->
            <div
              v-if="!item.product.isAvailable"
              class="absolute top-2 right-2 z-10 px-1 text-caption text-muted-foreground"
            >
              SOLD OUT
            </div>

            <!-- 삭제 버튼 -->
            <button
              @click="handleDelete($event, item.productId)"
              class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md shadow-light"
              title="위시리스트에서 삭제"
            >
              <Trash2
                class="w-5 h-5 text-muted-foreground hover:text-primary transition-colors"
              />
            </button>
          </div>
          <Separator></Separator>
          <!-- 상품명 -->
          <CardContent
            class="pb-0 px-4 mt-3 cursor-pointer hover:underline text-center"
            @click="goToDetail(item.productId)"
          >
            <span
              class="text-caption text-foreground leading-snug line-clamp-2"
            >
              {{ item.product.name }}
            </span>
          </CardContent>
          <!-- 가격 -->
          <CardContent class="pb-0 px-4 text-center">
            <span class="text-caption text-muted-foreground/80">
              {{ formatPrice(item.product.price) }}</span
            >
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  </section>
</template>

<style scoped>
.product-card {
  animation: slideUp 0.3s ease-out both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
