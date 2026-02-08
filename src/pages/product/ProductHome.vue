<script setup lang="ts">
// src/pages/product/ProductHome.vue
// 홈 히어로 섹션용 상품 목록 컴포넌트 (1~4번 상품)

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { Heart } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useProductStore } from "@/stores/product";
import { useAlert } from "@/composables/useAlert";
import { ProductCardSkeleton, EmptyState } from "@/components/common";
import { formatPrice } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { useOptimizedImage } from "@/composables";

const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const productStore = useProductStore();
const { showAlert, showConfirm } = useAlert();
const { getResponsiveAttrs } = useOptimizedImage();

// 스토어에서 상태 가져오기
const { featuredProducts: productList, loading, loaded } = storeToRefs(productStore);

// 상품 카드 반응형 이미지 속성 (srcset 포함)
const getProductImageAttrs = (url: string) => {
  return getResponsiveAttrs(url, {
    widths: [320, 480, 640], // 모바일~태블릿 대응
    sizes: "(max-width: 640px) 50vw, 33vw", // 2열 → 50vw, 그 외 33vw
  });
};

// 호버 상태 관리 (이미지 전환용)
const hoveredProductId = ref<string | null>(null);

// 위시리스트 Set (스토어에서 반응성 유지)
const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);

// 위시리스트 추가/삭제 토글 (스토어 활용)
const toggleWishlist = async (event: Event, productId: string) => {
  event.stopPropagation();

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

const goToDetail = (id: string) => {
  router.push(`/productDetail/${id}`);
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
  <div class="w-full grid grid-cols-2 gap-4 sm:gap-6">
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
    <Card
      v-else
      v-for="(
        { id, imageUrl, images, name, price, totalStock }, idx
      ) in productList"
      :key="id"
      class="product-card bg-muted/5 flex flex-col h-full group/hoverimg border-none !shadow-none hover:!shadow-md transition-shadow relative"
      :style="{ animationDelay: `${idx * 0.1}s` }"
    >
      <CardHeader class="p-0 gap-0 overflow-hidden rounded-t-lg">
        <div
          class="aspect-square cursor-pointer relative"
          @click="goToDetail(id)"
          @mouseenter="hoveredProductId = id"
          @mouseleave="hoveredProductId = null"
        >
          <!-- 기본 이미지 -->
          <img
            v-bind="getProductImageAttrs(imageUrl)"
            :alt="name"
            class="w-full aspect-square object-cover size-full absolute inset-0 transition-opacity duration-300"
            :class="
              hoveredProductId === id && images && images.length > 0
                ? 'opacity-0'
                : 'opacity-100'
            "
            draggable="false"
          />
          <!-- 호버 이미지 -->
          <img
            v-if="images && images.length > 0"
            v-bind="getProductImageAttrs(images[0])"
            :alt="`${name} - 호버`"
            class="w-full aspect-square object-cover size-full transition-opacity duration-300"
            :class="hoveredProductId === id ? 'opacity-100' : 'opacity-0'"
            draggable="false"
          />

          <!-- SOLD OUT 배지 (재고 소진) -->
          <div
            v-if="totalStock !== undefined && Number(totalStock) === 0"
            class="absolute top-2 right-2 z-10 px-2 py-1 text-caption font-bold bg-primary text-white rounded"
          >
            SOLD OUT
          </div>

          <!-- 위시리스트 버튼 -->
          <button
            @click="toggleWishlist($event, id)"
            class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md shadow-light"
            title="위시리스트 담기"
          >
            <Heart
              class="w-5 h-5 transition-colors duration-200"
              :class="
                wishlistSet.has(id)
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground group-hover:text-primary'
              "
            />
          </button>
        </div>
        <Separator></Separator>
        <!-- 상품명 -->
        <CardContent
          class="pb-0 px-4 mt-3 cursor-pointer hover:underline text-center"
          @click="goToDetail(id)"
        >
          <span class="text-caption text-foreground leading-snug line-clamp-2">
            {{ name }}
          </span>
        </CardContent>
        <!-- 가격 -->
        <CardContent class="pb-2 px-4 text-center">
          <span class="text-caption text-muted-foreground">
            {{ formatPrice(price) }}</span
          >
        </CardContent>
      </CardHeader>
    </Card>
  </div>
</template>

<style scoped>
.product-card {
  animation: cardReveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-card {
    animation: none;
    opacity: 1;
  }
}
</style>
