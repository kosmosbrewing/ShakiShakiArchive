// src/stores/product.ts
// 홈페이지 상품 목록 상태 관리 (ProductHome, Product 데이터 동기화)

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchProducts } from "@/lib/api";

interface ProductItem {
  id: string;
  imageUrl: string;
  images?: string[];
  name: string;
  price: number;
  totalStock?: number;
  isAvailable: boolean;
}

const PAGE_SIZE = 12;

// 캐시 설정 (API 캐시와 동기화: 30초)
const STALE_TIME = 15 * 1000; // 15초 - 백그라운드 갱신 시작
const CACHE_TIME = 30 * 1000; // 30초 - API 캐시와 일치

export const useProductStore = defineStore("product", () => {
  // 상태
  const products = ref<ProductItem[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const lastFetchedAt = ref<number | null>(null); // 마지막 fetch 시간

  // 무한스크롤 상태
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const currentPage = ref(1);

  // 중복 요청 방지용 Promise
  let fetchPromise: Promise<void> | null = null;

  // 캐시 상태 확인
  const isStale = computed(() => {
    if (!lastFetchedAt.value) return true;
    return Date.now() - lastFetchedAt.value > STALE_TIME;
  });

  const isCacheExpired = computed(() => {
    if (!lastFetchedAt.value) return true;
    return Date.now() - lastFetchedAt.value > CACHE_TIME;
  });

  // 상품 매핑 (API 응답 → ProductItem)
  const mapProduct = (item: any): ProductItem => {
    const stock = item.totalStock ?? item.stockQuantity;

    // isAvailable: 명시적으로 false인 경우만 제외
    const available = !(
      item.isAvailable === false ||
      item.isAvailable === "false" ||
      item.isAvailable === "False" ||
      item.isAvailable === 0 ||
      item.isAvailable === "0"
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
  };

  // 상품 정렬 (재고 있음 → SOLD OUT 순서, isAvailable=false 제외)
  const sortByStock = (items: ProductItem[]): ProductItem[] => {
    // 1. 판매 가능 상품만 필터링
    const available = items.filter((item) => item.isAvailable === true);

    // 2. 재고 있는 것과 품절 분리
    const inStock = available.filter((item) => (item.totalStock ?? 1) > 0);
    const soldOut = available.filter(
      (item) => item.totalStock !== undefined && item.totalStock === 0
    );

    // 3. 순서: 재고 있음 → SOLD OUT
    return [...inStock, ...soldOut];
  };

  // 홈페이지용 상품 로드 (첫 페이지)
  // force: true면 캐시 무시하고 강제 로드
  const loadHomeProducts = async (force: boolean = false) => {
    // 캐시 유효성 검사
    const hasValidCache = loaded.value && products.value.length > 0;
    const shouldSkip = hasValidCache && !isStale.value && !force;

    // 유효한 캐시가 있고 stale이 아니면 스킵
    if (shouldSkip) {
      console.log("[ProductStore] 캐시 유효 - API 호출 스킵");
      return;
    }

    // 🔒 중복 요청 방지: 이미 진행 중인 요청이 있으면 대기
    if (fetchPromise && !force) {
      console.log("[ProductStore] 중복 요청 방지 - 기존 요청 대기");
      return fetchPromise;
    }

    // stale 데이터가 있으면 백그라운드 갱신 (기존 데이터 유지하며 로딩)
    const isBackgroundRefresh = hasValidCache && isStale.value && !force;
    if (isBackgroundRefresh) {
      console.log("[ProductStore] Stale 데이터 - 백그라운드 갱신");
    }

    // 캐시 만료 또는 강제 새로고침이면 로딩 표시
    if (!isBackgroundRefresh) {
      loading.value = true;
    }

    currentPage.value = 1;
    hasMore.value = true;

    // fetch 시작 - Promise 저장
    fetchPromise = (async () => {
      try {
        // 홈페이지용 상품 (백엔드에서 isAvailable=true 우선 정렬)
        const response = await fetchProducts({ page: 1, limit: PAGE_SIZE });
        const mappedProducts = response.products.map(mapProduct);
        products.value = sortByStock(mappedProducts);
        hasMore.value = response.pagination?.hasMore ?? false;
        loaded.value = true;
        lastFetchedAt.value = Date.now(); // 캐시 타임스탬프 갱신
        console.log("[ProductStore] 상품 데이터 갱신 완료");
      } catch (error) {
        console.error("상품 목록 로드 실패:", error);
        // 백그라운드 갱신 실패 시 기존 데이터 유지
        if (!isBackgroundRefresh) {
          products.value = [];
          hasMore.value = false;
        }
      } finally {
        loading.value = false;
        fetchPromise = null; // 요청 완료 후 초기화
      }
    })();

    return fetchPromise;
  };

  // 추가 상품 로드 (무한스크롤)
  const loadMoreProducts = async () => {
    // 이미 로딩 중이거나 더 이상 데이터가 없으면 스킵
    if (loadingMore.value || loading.value || !hasMore.value) return;

    loadingMore.value = true;
    const nextPage = currentPage.value + 1;

    try {
      const response = await fetchProducts({ page: nextPage, limit: PAGE_SIZE });
      const newProducts = response.products.map(mapProduct);

      // 기존 상품과 새 상품을 합친 후 정렬
      products.value = sortByStock([...products.value, ...newProducts]);
      hasMore.value = response.pagination?.hasMore ?? false;
      currentPage.value = nextPage;
    } catch (error) {
      console.error("추가 상품 로드 실패:", error);
    } finally {
      loadingMore.value = false;
    }
  };

  // 강제 새로고침 (캐시 무시)
  const refreshProducts = async () => {
    loaded.value = false;
    lastFetchedAt.value = null;
    currentPage.value = 1;
    hasMore.value = true;
    await loadHomeProducts(true);
  };

  // 캐시 초기화 (로그아웃 등)
  const clearCache = () => {
    products.value = [];
    loaded.value = false;
    lastFetchedAt.value = null;
    currentPage.value = 1;
    hasMore.value = true;
    fetchPromise = null;
  };

  // 로그아웃 이벤트 리스너 (reload=false일 때 캐시 정리)
  if (typeof window !== "undefined") {
    window.addEventListener("auth-logout", () => {
      clearCache();
      console.log("[ProductStore] 로그아웃으로 캐시 정리");
    });
  }

  // Computed: ProductHome용 (1~4번)
  const featuredProducts = computed(() => products.value.slice(0, 4));

  // Computed: Product용 (5번 이후)
  const remainingProducts = computed(() => products.value.slice(4));

  return {
    // 상태
    products,
    loading,
    loaded,
    lastFetchedAt,
    // 캐시 상태
    isStale,
    isCacheExpired,
    // 무한스크롤 상태
    loadingMore,
    hasMore,
    // 액션
    loadHomeProducts,
    loadMoreProducts,
    refreshProducts,
    clearCache,
    // Computed
    featuredProducts,
    remainingProducts,
  };
});
