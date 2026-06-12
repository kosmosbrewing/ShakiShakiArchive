<script setup lang="ts">
// src/pages/product/Product.vue
// 상품 목록 페이지 컴포넌트 (무한 스크롤 지원)

import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Search, X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useProductStore } from "@/stores/product";
import { useCategoryStore } from "@/stores/category";
import { useAlert } from "@/composables/useAlert";
import { useProductList } from "@/composables/useProduct";
import {
  ProductCardSkeleton,
  ProductGridCard,
  EmptyState,
  LoadingSpinner,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import { useDebounceFn } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const productStore = useProductStore();
const categoryStore = useCategoryStore();
const { showAlert, showConfirm } = useAlert();

// 스토어에서 홈페이지용 데이터 가져오기
const {
  remainingProducts,
  loading: storeLoading,
  loaded: storeLoaded,
  loadingMore: storeLoadingMore,
  hasMore: storeHasMore,
} = storeToRefs(productStore);
const { categoryRoutes } = storeToRefs(categoryStore);

// 카테고리 파라미터가 있는지 확인 (라우트에서 사용될 때)
const hasCategory = computed(() => !!route.params.category);
const activeCategory = computed(() => {
  const categoryParam = Array.isArray(route.params.category)
    ? route.params.category[0]
    : route.params.category;

  return categoryParam || "all";
});

// SEO용 h1 텍스트: 활성 카테고리 라벨 기반
const categoryHeading = computed(() => {
  const match = categoryRoutes.value.find(
    (r) => r.path.split("/").pop() === activeCategory.value
  );
  const label = match?.label || (activeCategory.value === "all" ? "전체 상품" : "SHOP");
  return `${label} 빈티지 컬렉션 | 샤키샤키 아카이브`;
});

const hideSoldOutProducts = <T extends { totalStock?: number }>(items: T[]): T[] =>
  items.filter((item) => item.totalStock === undefined || Number(item.totalStock) > 0);

// 화면에 표시할 상품 목록
// - 홈페이지: 스토어의 remainingProducts (5번 이후, ProductHome과 데이터 공유)
// - 카테고리 페이지: useProductList의 전체 목록 (무한 스크롤)
const displayProducts = computed(() => {
  if (hasCategory.value) {
    return hideSoldOutProducts(productList.value);
  }
  // 홈페이지: 스토어의 remainingProducts 사용 (ProductHome과 동일 데이터 소스)
  return hideSoldOutProducts(remainingProducts.value);
});

// 로딩 상태 (홈페이지: 스토어, 카테고리 페이지: composable)
// 홈페이지: 아직 로드되지 않은 경우(loaded=false)도 로딩 상태로 처리
const isLoading = computed(() => {
  if (hasCategory.value) {
    return loading.value;
  }
  // 스토어가 아직 한 번도 로드되지 않았거나 로딩 중이면 true
  return storeLoading.value || !storeLoaded.value;
});

// 추가 로딩 상태 (무한스크롤)
const isLoadingMore = computed(() => {
  if (hasCategory.value) {
    return loadingMore.value;
  }
  return storeLoadingMore.value;
});

// 더 불러올 데이터 여부
const hasMoreData = computed(() => {
  if (hasCategory.value) {
    return hasMore.value;
  }
  return storeHasMore.value;
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

// 스켈레톤 노출 지연 (150ms)
const showLoadingSpinner = ref(false);
let loadingDelayTimer: ReturnType<typeof setTimeout> | null = null;

// 추가 상품 로드 (페이지 타입에 따라 다른 함수 호출)
const handleLoadMore = () => {
  if (hasCategory.value) {
    loadMoreProducts();
  } else {
    productStore.loadMoreProducts();
  }
};

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      // 타겟이 화면에 보이고, 로딩 중이 아니며, 더 불러올 데이터가 있을 때
      if (
        entry.isIntersecting &&
        !isLoadingMore.value &&
        hasMoreData.value &&
        !isLoading.value
      ) {
        handleLoadMore();
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

// 로딩 스피너 지연 표시 (150ms)
watch(isLoadingMore, (newValue) => {
  // 타이머가 있으면 먼저 정리
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }

  if (newValue) {
    // 로딩 시작: 150ms 후 스피너 표시
    loadingDelayTimer = setTimeout(() => {
      showLoadingSpinner.value = true;
    }, 150);
  } else {
    // 로딩 종료: 즉시 스피너 숨김
    showLoadingSpinner.value = false;
  }
});

onMounted(async () => {
  if (hasCategory.value) {
    // 카테고리 페이지: 기존 composable 사용 (무한 스크롤)
    await Promise.all([categoryStore.loadCategories(), loadProducts()]);
  } else {
    // 홈페이지: 스토어 사용 (force: true로 최신 재고 반영)
    await productStore.loadHomeProducts(true);
  }

  // DOM이 준비된 후 옵저버 설정 (홈/카테고리 모두)
  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }

  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
});

onUnmounted(() => {
  cleanupObserver();

  // 타이머 정리
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }
});
</script>

<template>
  <section class="w-[94%] sm:w-11/12 max-w-screen-2xl mx-auto pt-4 pb-12 sm:pt-8 sm:pb-16">
    <!-- SEO: 시각적 디자인 변경 없이 h1 제공 (sr-only) -->
    <h1 class="sr-only">{{ categoryHeading }}</h1>

    <!-- 카테고리 선택 영역 (Shop 진입 화면) -->
    <nav
      v-if="hasCategory"
      class="hidden sm:flex flex-wrap items-center gap-x-7 gap-y-2 mb-3"
      aria-label="Shop categories"
    >
      <RouterLink
        v-for="{ path, label } in categoryRoutes"
        :key="label"
        :to="path"
        class="inline-flex h-7 items-center border-b-2 px-0.5 text-caption font-semibold tracking-wider transition-colors"
        :class="
          activeCategory === path.split('/').pop()
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-primary'
        "
      >
        {{ label }}
      </RouterLink>
    </nav>

    <!-- 검색 입력 영역 (카테고리 라우트에서만 활성화) -->
    <div v-if="false && hasCategory" class="mb-6">
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
        v-if="searchQuery && !isLoading"
        class="mt-2 text-sm text-muted-foreground"
      >
        "{{ searchQuery }}" 검색 결과: {{ totalProducts }}개
      </p>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8"
    >
      <!-- 로딩 상태: 스켈레톤 카드 표시 (4열 그리드에 맞게 8개) -->
      <ProductCardSkeleton v-if="isLoading" :count="8" />

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
      <ProductGridCard
        v-else
        v-for="({ id, slug, imageUrl, images, name, price }, idx) in displayProducts"
        :id="id"
        :key="id"
        :slug="slug"
        :image-url="imageUrl"
        :images="images"
        :name="name"
        :price="price"
        :is-wishlisted="wishlistSet.has(id)"
        :animation-delay="`${Math.min(idx % 8, 7) * 0.05}s`"
        @open="goToDetail"
        @action="toggleWishlist"
      />
    </div>

    <!-- 무한 스크롤 트리거 및 로딩 인디케이터 -->
    <div
      v-if="displayProducts.length > 0 || hasMoreData"
      ref="loadMoreTrigger"
      class="py-8 flex justify-center"
    >
      <div v-if="showLoadingSpinner" class="flex flex-col items-center gap-3">
        <LoadingSpinner size="md" variant="dots" :center="false" />
        <span class="text-body text-muted-foreground"
          >상품을 불러오는 중...</span
        >
      </div>
      <div
        v-else-if="!hasMoreData && displayProducts.length > 0"
        class="text-caption text-muted-foreground"
      >
        모든 상품을 불러왔습니다
      </div>
    </div>
  </section>
</template>
