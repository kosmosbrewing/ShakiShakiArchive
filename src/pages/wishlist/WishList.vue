<script setup lang="ts">
// src/pages/WishList.vue
// 위시리스트 페이지

import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useWishlist } from "@/composables";

// 공통 컴포넌트
import {
  ProductCardSkeleton,
  ProductGridCard,
  EmptyState,
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Separator } from "@/components/ui/separator";

const router = useRouter();

// 인증 체크
useAuthGuard();

// 위시리스트 로직
const { wishlistItems, loading, isEmpty, loadWishlist, removeItem } =
  useWishlist();

// 상품 상세 페이지로 이동 (slug 우선, fallback: id)
const goToDetail = (slug: string | undefined | null, id: string) => {
  router.push(`/productDetail/${slug || id}`);
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
  <section class="w-[94%] sm:w-11/12 max-w-screen-2xl mx-auto pt-4 pb-12 sm:pt-8 sm:pb-16">
    <!-- 페이지 제목 -->
    <div class="mb-6 text-left">
      <h3 class="text-heading text-primary tracking-wider">위시리스트</h3>
      <p class="text-body text-left text-muted-foreground pt-1 mb-3">
        관심 있는 상품을 모아두었습니다.
      </p>
      <Separator></Separator>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6"
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
      <ProductGridCard
        v-else
        v-for="(item, idx) in wishlistItems"
        :id="item.productId"
        :key="item.id"
        :slug="item.product?.slug"
        :image-url="item.product.imageUrl || '/placeholder.png'"
        :images="item.product.images"
        :name="item.product.name"
        :price="item.product.price"
        :is-sold-out="!item.product.isAvailable"
        action="delete"
        :animation-delay="`${Math.min(idx % 8, 7) * 0.05}s`"
        @open="goToDetail"
        @action="handleDelete"
      />
    </div>
  </section>
</template>
