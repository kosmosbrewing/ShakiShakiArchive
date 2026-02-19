<script setup lang="ts">
// src/pages/product/Product.vue
// 상품 목록 페이지 컴포넌트 (무한 스크롤 지원)

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, computed, onMounted, onUnmounted, watch, type Directive } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Heart, Search, X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useProductStore } from "@/stores/product";
import { useAlert } from "@/composables/useAlert";
import { useProductList } from "@/composables/useProduct";
import {
  ProductCardSkeleton,
  EmptyState,
  LoadingSpinner,
} from "@/components/common";
import { formatPrice } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { useOptimizedImage } from "@/composables";
import { Input } from "@/components/ui/input";
import { useDebounceFn } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const productStore = useProductStore();
const { showAlert, showConfirm } = useAlert();
const { getResponsiveAttrs } = useOptimizedImage();

// 스토어에서 홈페이지용 데이터 가져오기
const {
  remainingProducts,
  loading: storeLoading,
  loaded: storeLoaded,
  loadingMore: storeLoadingMore,
  hasMore: storeHasMore,
} = storeToRefs(productStore);

// 상품 카드 반응형 이미지 속성 (srcset 포함)
const getProductImageAttrs = (url: string) => {
  return getResponsiveAttrs(url, {
    widths: [320, 480, 640], // 모바일~태블릿 대응
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw", // 반응형 그리드
  });
};

// 카테고리 파라미터가 있는지 확인 (라우트에서 사용될 때)
const hasCategory = computed(() => !!route.params.category);

// 화면에 표시할 상품 목록
// - 홈페이지: 스토어의 remainingProducts (5번 이후, ProductHome과 데이터 공유)
// - 카테고리 페이지: useProductList의 전체 목록 (무한 스크롤)
const displayProducts = computed(() => {
  if (hasCategory.value) {
    return productList.value;
  }
  // 홈페이지: 스토어의 remainingProducts 사용 (ProductHome과 동일 데이터 소스)
  return remainingProducts.value;
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

// 호버 상태 관리 (이미지 전환용)
const hoveredProductId = ref<string | null>(null);

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

// slug가 있으면 slug로 이동 (SEO URL), 없으면 id fallback
const goToDetail = (slug: string | undefined, id: string) => {
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

// --- 뷰포트 진입 시 순차 등장 애니메이션 (IntersectionObserver 기반) ---
let cardObserver: IntersectionObserver | null = null;
let revealQueue: HTMLElement[] = [];
let revealBatchTimer: ReturnType<typeof setTimeout> | null = null;
let initialRenderDone = false; // 초기 로드 완료 플래그

// 같은 시점에 뷰포트에 진입한 카드를 배치로 묶어 순차 등장
const processRevealBatch = () => {
  const batch = [...revealQueue];
  revealQueue = [];
  revealBatchTimer = null;

  if (!initialRenderDone) {
    // 초기 렌더: 이미 뷰포트에 있는 카드는 애니메이션 없이 즉시 표시
    batch.forEach((el) => {
      el.classList.add('no-animate', 'revealed');
    });
    initialRenderDone = true;
    return;
  }

  // 스크롤 등장: 순차 애니메이션
  batch.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('revealed');
    }, i * 70);
  });
};

const getCardObserver = (): IntersectionObserver => {
  if (!cardObserver) {
    cardObserver = new IntersectionObserver(
      (entries) => {
        let hasNew = false;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            revealQueue.push(entry.target as HTMLElement);
            cardObserver!.unobserve(entry.target);
            hasNew = true;
          }
        }
        if (hasNew) {
          if (revealBatchTimer) clearTimeout(revealBatchTimer);
          // 같은 프레임에서 여러 카드가 뷰포트 진입 → 30ms 내 배치 처리
          revealBatchTimer = setTimeout(processRevealBatch, 30);
        }
      },
      { threshold: 0.05, rootMargin: '50px' }
    );
  }
  return cardObserver;
};

// Vue 3 로컬 디렉티브: 'v' 접두어로 자동 등록 → 템플릿에서 v-reveal 사용
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const vReveal: Directive<HTMLElement> = {
  mounted(el) {
    getCardObserver().observe(el);
  },
  unmounted(el) {
    cardObserver?.unobserve(el);
  },
};

onMounted(async () => {
  if (hasCategory.value) {
    // 카테고리 페이지: 기존 composable 사용 (무한 스크롤)
    await loadProducts();
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

  // reveal 애니메이션 정리
  if (cardObserver) {
    cardObserver.disconnect();
    cardObserver = null;
  }
  revealQueue = [];
  if (revealBatchTimer) {
    clearTimeout(revealBatchTimer);
    revealBatchTimer = null;
  }

  // 타이머 정리
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }
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
        v-if="searchQuery && !isLoading"
        class="mt-2 text-sm text-muted-foreground"
      >
        "{{ searchQuery }}" 검색 결과: {{ totalProducts }}개
      </p>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6"
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
      <Card
        v-else
        v-for="(
          { id, slug, imageUrl, images, name, price, totalStock }
        ) in displayProducts"
        :key="id"
        v-reveal
        class="product-card bg-muted/5 flex flex-col h-full group/hoverimg border-none !shadow-none hover:!shadow-md relative mt-3"
      >
        <CardHeader class="p-0 gap-0 overflow-hidden rounded-t-lg">
          <div
            class="aspect-square cursor-pointer relative"
            @click="goToDetail(slug, id)"
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
            <!-- 호버 이미지 (장식용 → alt="" 적용) -->
            <img
              v-if="images && images.length > 0"
              v-bind="getProductImageAttrs(images[0])"
              alt=""
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
            @click="goToDetail(slug, id)"
          >
            <span
              class="text-caption text-foreground leading-snug line-clamp-2"
            >
              {{ name }}
            </span>
          </CardContent>
          <!-- 가격 -->
          <CardContent class="pb-0 px-4 text-center">
            <span class="text-caption text-muted-foreground">
              {{ formatPrice(price) }}</span
            >
          </CardContent>
        </CardHeader>
      </Card>
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
        class="text-body text-muted-foreground"
      >
        모든 상품을 불러왔습니다
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 초기 상태: 숨김 (IntersectionObserver가 .revealed 추가 시 등장) */
.product-card {
  opacity: 0;
  transform: translateY(32px) scale(0.96);
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.15s ease;
}

.product-card.revealed {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 초기 뷰포트 내 카드: 트랜지션 없이 즉시 표시 (hover shadow는 유지) */
.product-card.no-animate {
  transition: box-shadow 0.15s ease;
}

@media (prefers-reduced-motion: reduce) {
  .product-card {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
