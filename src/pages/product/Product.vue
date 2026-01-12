<script setup lang="ts">
// src/pages/product/Product.vue
// 상품 목록 페이지 컴포넌트 (무한 스크롤 지원)

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Heart, Search, X, Loader2 } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useAlert } from "@/composables/useAlert";
import { useProductList } from "@/composables/useProduct";
import { ProductCardSkeleton, EmptyState } from "@/components/common";
import { formatPrice } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { useOptimizedImage } from "@/composables";
import { Input } from "@/components/ui/input";
import { useDebounceFn } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const { showAlert, showConfirm } = useAlert();
const { card } = useOptimizedImage();

// 카테고리 파라미터가 있는지 확인 (라우트에서 사용될 때)
const hasCategory = computed(() => !!route.params.category);

// 화면에 표시할 상품 목록 (Home에서는 5번째부터, 라우트에서는 전체)
const displayProducts = computed(() => {
  if (hasCategory.value) {
    return productList.value;
  }
  // Home에서 사용될 때: ProductHome이 0~3을 보여주므로 4번 인덱스부터 출력
  return productList.value.slice(4);
});

// 상품 목록 composable (무한 스크롤 지원)
const {
  products: productList,
  loading,
  loadingMore,
  hasMore,
  totalProducts,
  loadProducts,
  loadMoreProducts,
} = useProductList();

const searchQuery = ref("");

// 위시리스트 Set (스토어에서 반응성 유지)
const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);

// 무한 스크롤을 위한 옵저버 타겟 ref
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

// 호버 상태 관리 (이미지 전환용)
const hoveredProductId = ref<string | null>(null);

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      // 타겟이 화면에 보이고, 로딩 중이 아니며, 더 불러올 데이터가 있을 때
      if (
        entry.isIntersecting &&
        !loadingMore.value &&
        hasMore.value &&
        !loading.value
      ) {
        loadMoreProducts();
      }
    },
    {
      rootMargin: "200px", // 200px 전에 미리 로드 시작
      threshold: 0.1,
    }
  );

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value);
  }
};

// 옵저버 정리
const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// 타겟 요소 변경 감지
watch(loadMoreTrigger, (newEl) => {
  cleanupObserver();
  if (newEl) {
    setupIntersectionObserver();
  }
});

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

// 디바운스된 검색 함수 (300ms 후 API 호출)
const debouncedSearch = useDebounceFn(() => {
  loadProducts(searchQuery.value);
}, 300);

// 검색어 초기화
const clearSearch = () => {
  searchQuery.value = "";
  loadProducts();
};

// 검색어 변경 감지
watch(searchQuery, () => {
  debouncedSearch();
});

onMounted(async () => {
  await loadProducts();
  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
  // DOM이 준비된 후 옵저버 설정
  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }
});

onUnmounted(() => {
  cleanupObserver();
});
</script>

<template>
  <section class="w-11/12 max-w-screen-2xl mx-auto py-4 sm:py-8">
    <!-- 검색 입력 영역 (카테고리 라우트에서만 활성화) -->
    <div v-if="hasCategory" class="mb-6 pt-8">
      <div class="relative max-w-md">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        />
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="상품명으로 검색..."
          class="pl-10 pr-10"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          type="button"
          aria-label="검색어 초기화"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <p
        v-if="searchQuery && !loading"
        class="mt-2 text-sm text-muted-foreground"
      >
        "{{ searchQuery }}" 검색 결과: {{ totalProducts }}개
      </p>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6"
    >
      <!-- 로딩 상태: 스켈레톤 카드 표시 (4열 그리드에 맞게 8개) -->
      <ProductCardSkeleton v-if="loading" :count="8" />

      <!-- 빈 상태 (검색 결과 없음 또는 상품 없음) -->
      <EmptyState
        v-else-if="displayProducts.length === 0"
        :header="searchQuery ? '검색 결과 없음' : '상품 없음'"
        :message="
          searchQuery
            ? `'${searchQuery}'에 대한 검색 결과가 없습니다.`
            : '등록된 상품이 없습니다.'
        "
        :button-text="searchQuery ? '검색어 초기화' : '홈으로 이동'"
        :button-link="searchQuery ? '' : '/'"
        @action="clearSearch"
        class="col-span-full"
      />

      <!-- 상품 카드 목록 -->
      <Card
        v-else
        v-for="(
          { id, imageUrl, images, name, price, totalStock }, idx
        ) in displayProducts"
        :key="id"
        class="product-card bg-muted/5 flex flex-col h-full group/hoverimg border-none !shadow-none hover:!shadow-md transition-shadow relative mt-3"
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
              :src="card(imageUrl)"
              :alt="name"
              class="w-full aspect-square object-cover size-full absolute inset-0 transition-opacity duration-300"
              :class="
                hoveredProductId === id && images && images.length > 0
                  ? 'opacity-0'
                  : 'opacity-100'
              "
              loading="lazy"
              decoding="async"
              draggable="false"
            />
            <!-- 호버 이미지 -->
            <img
              v-if="images && images.length > 0"
              :src="card(images[0])"
              :alt="`${name} - 호버`"
              class="w-full aspect-square object-cover size-full transition-opacity duration-300"
              :class="hoveredProductId === id ? 'opacity-100' : 'opacity-0'"
              loading="lazy"
              decoding="async"
              draggable="false"
            />

            <!-- SOLD OUT 배지 -->
            <div
              v-if="totalStock !== undefined && totalStock === 0"
              class="absolute top-2 right-2 z-10 px-1 text-caption text-muted-foreground"
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
            <span
              class="text-caption text-foreground leading-snug line-clamp-2"
            >
              {{ name }}
            </span>
          </CardContent>
          <!-- 가격 -->
          <CardContent class="pb-0 px-4 text-center">
            <span class="text-caption text-muted-foreground/80">
              {{ formatPrice(price) }}</span
            >
          </CardContent>
        </CardHeader>
      </Card>
    </div>

    <!-- 무한 스크롤 트리거 및 로딩 인디케이터 -->
    <div
      v-if="displayProducts.length > 0 || hasMore"
      ref="loadMoreTrigger"
      class="py-8 flex justify-center"
    >
      <div
        v-if="loadingMore"
        class="flex items-center gap-2 text-muted-foreground"
      >
        <Loader2 class="w-5 h-5 animate-spin" />
        <span class="text-body">상품을 불러오는 중...</span>
      </div>
      <div
        v-else-if="!hasMore && displayProducts.length > 0"
        class="text-body text-muted-foreground"
      >
        모든 상품을 불러왔습니다
      </div>
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
