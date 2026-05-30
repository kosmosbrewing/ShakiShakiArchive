<script setup lang="ts">
// src/pages/product/ProductHome.vue
// 홈 히어로 섹션용 상품 목록 컴포넌트 (1~4번 상품)

import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useProductStore } from "@/stores/product";
import { useAlert } from "@/composables/useAlert";
import {
  ProductCardSkeleton,
  ProductGridCard,
  EmptyState,
} from "@/components/common";

const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const productStore = useProductStore();
const { showAlert, showConfirm } = useAlert();

// 스토어에서 상태 가져오기
const { featuredProducts: productList, loading, loaded } = storeToRefs(productStore);

// 위시리스트 Set (스토어에서 반응성 유지)
const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);

// 위시리스트 추가/삭제 토글 (스토어 활용)
const toggleWishlist = async (productId: string) => {
  if (!authStore.isAuthenticated) {
    const confirmed = await showConfirm(
      "로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?",
      { confirmText: "로그인", cancelText: "취소" }
    );
    if (confirmed) {
      router.push("/login");
    }
    return;
  }

  try {
    await wishlistStore.toggleItem(productId);
  } catch (error) {
    console.error("위시리스트 처리 실패:", error);
    showAlert("처리 중 오류가 발생했습니다.", { type: "error" });
  }
};

// slug가 있으면 slug로 이동 (SEO URL), 없으면 id fallback
const goToDetail = (slug: string | null | undefined, id: string) => {
  router.push(`/productDetail/${slug || id}`);
};

onMounted(async () => {
  // 스토어에서 홈페이지용 상품 로드 (force: true로 최신 재고 반영)
  // 홈페이지 진입 시 항상 최신 데이터 표시 (SOLD OUT 즉시 반영)
  await productStore.loadHomeProducts(true);
  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
});
</script>

<template>
  <div class="w-full grid grid-cols-2 gap-3 sm:gap-6">
    <!-- 로딩 상태: 스켈레톤 카드 표시 (아직 로드되지 않은 경우도 포함) -->
    <ProductCardSkeleton v-if="loading || !loaded" :count="4" />

    <!-- 빈 상태 (로드 완료 후에만 표시) -->
    <EmptyState
      v-else-if="productList.length === 0"
      header="상품 없음"
      message="등록된 상품이 없습니다."
      class="col-span-full"
    />

    <!-- 상품 카드 목록 (스토어의 featuredProducts: 1~4번) -->
    <ProductGridCard
      v-else
      v-for="({ id, slug, imageUrl, images, name, price, totalStock }, idx) in productList"
      :id="id"
      :key="id"
      :slug="slug"
      :image-url="imageUrl"
      :images="images"
      :name="name"
      :price="price"
      :is-sold-out="totalStock !== undefined && Number(totalStock) === 0"
      :is-wishlisted="wishlistSet.has(id)"
      :animation-delay="`${Math.min(idx % 4, 3) * 0.05}s`"
      @open="goToDetail"
      @action="toggleWishlist"
    />
  </div>
</template>
