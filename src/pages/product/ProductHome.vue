<script setup lang="ts">
// src/pages/product/ProductHome.vue
// 홈 히어로 섹션용 상품 목록 컴포넌트

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Heart } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useAlert } from "@/composables/useAlert";
import { ProductCardSkeleton, EmptyState } from "@/components/common";
import { formatPrice } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { useOptimizedImage } from "@/composables";
import { fetchProducts } from "@/lib/api";

// 1. 데이터 인터페이스
interface ProductItem {
  id: string; // UUID
  imageUrl: string;
  images?: string[]; // 추가 이미지 목록 (호버용)
  name: string;
  price: number;
  totalStock?: number; // 총 재고 수량 (품절 정렬용)
  isAvailable?: boolean; // 판매 가능 여부
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const { showAlert, showConfirm } = useAlert();
const { getResponsiveAttrs } = useOptimizedImage();

// 상품 카드 반응형 이미지 속성 (srcset 포함)
const getProductImageAttrs = (url: string) => {
  return getResponsiveAttrs(url, {
    widths: [320, 480, 640], // 모바일~태블릿 대응
    sizes: "(max-width: 640px) 50vw, 33vw", // 2열 → 50vw, 그 외 33vw
  });
};

const productList = ref<ProductItem[]>([]);
const loading = ref(false);

// 호버 상태 관리 (이미지 전환용)
const hoveredProductId = ref<string | null>(null);

// 위시리스트 Set (스토어에서 반응성 유지)
const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);

// 상품 정렬 (재고 있음 → SOLD OUT 순서, isAvailable=false는 제외)
const sortByStock = (items: ProductItem[]): ProductItem[] => {
  // 1. 판매 가능 상품만 필터링 (isAvailable=false는 화면에서 제외)
  const available = items.filter((item) => item.isAvailable === true);

  // 2. 판매 가능 상품 중 재고 있는 것과 품절 분리
  const inStock = available.filter((item) => (item.totalStock ?? 1) > 0);
  const soldOut = available.filter((item) => item.totalStock !== undefined && item.totalStock === 0);

  // 3. 순서: 재고 있음 → SOLD OUT
  return [...inStock, ...soldOut];
};

// [핵심] 상품 데이터 불러오기 (api.ts 캐싱 레이어 활용)
const fetchProductData = async () => {
  loading.value = true;

  try {
    // 1. URL에서 카테고리 슬러그 추출 (예: 'outerwear')
    const categoryParam = Array.isArray(route.params.category)
      ? route.params.category[0]
      : route.params.category;

    // 'all'이거나 없으면 undefined 처리 (백엔드가 전체 목록 반환)
    const currentSlug =
      !categoryParam || categoryParam === "all"
        ? undefined
        : categoryParam.trim().toLowerCase();

    // 2. api.ts의 fetchProducts 사용 (HTTP 캐싱 레이어 적용)
    // cachePolicy: 'products' (1분 캐싱)
    const response = await fetchProducts({
      category: currentSlug,
    });

    // 3. 받아온 데이터를 화면용으로 변환 후 품절 상품을 맨 뒤로 정렬
    const mappedProducts = response.products.map((item: any) => {
      const stock = item.totalStock ?? item.stockQuantity;

      // isAvailable을 포괄적으로 boolean 변환
      // false로 간주되는 값: false, "false", "False", 0, "0", null, undefined
      const available = !(
        item.isAvailable === false ||
        item.isAvailable === "false" ||
        item.isAvailable === "False" ||
        item.isAvailable === 0 ||
        item.isAvailable === "0" ||
        item.isAvailable === null ||
        item.isAvailable === undefined
      );

      return {
        id: item.id,
        imageUrl: item.imageUrl,
        images: item.images ?? [],
        name: item.name,
        price: Number(item.price),
        totalStock: stock !== undefined && stock !== null ? Number(stock) : undefined,
        isAvailable: available,
      };
    });

    productList.value = sortByStock(mappedProducts);
  } catch (error) {
    console.error("API Error:", error);
    productList.value = []; // 에러 시 빈 목록
  } finally {
    loading.value = false;
  }
};

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
  await fetchProductData();
  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
});

// [중요] 카테고리가 바뀌면(URL 변경) 데이터를 다시 불러옴
watch(
  () => route.params.category,
  () => {
    fetchProductData();
  }
);
</script>

<template>
  <div class="w-full grid grid-cols-2 gap-4 sm:gap-6">
    <!-- 로딩 상태: 스켈레톤 카드 표시 -->
    <ProductCardSkeleton v-if="loading" :count="4" />

    <!-- 빈 상태 -->
    <EmptyState
      v-else-if="productList.length === 0"
      header="상품 없음"
      message="등록된 상품이 없습니다."
      class="col-span-full"
    />

    <!-- 상품 카드 목록 -->
    <Card
      v-else
      v-for="(
        { id, imageUrl, images, name, price, totalStock }, idx
      ) in productList.slice(0, 4)"
      :key="id"
      class="product-card bg-muted/5 flex flex-col h-full group/hoverimg border-none !shadow-none hover:!shadow-md transition-shadow relative"
      :style="{ animationDelay: `${idx * 0.05}s` }"
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
          <span class="text-caption text-muted-foreground/80">
            {{ formatPrice(price) }}</span
          >
        </CardContent>
      </CardHeader>
    </Card>
  </div>
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
