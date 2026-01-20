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

export const useProductStore = defineStore("product", () => {
  // 상태
  const products = ref<ProductItem[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  // 무한스크롤 상태
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const currentPage = ref(1);

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
  const loadHomeProducts = async () => {
    // 이미 로드된 경우 스킵
    if (loaded.value && products.value.length > 0) return;

    loading.value = true;
    currentPage.value = 1;
    hasMore.value = true;

    try {
      // 홈페이지용 상품 (백엔드에서 isAvailable=true 우선 정렬)
      const response = await fetchProducts({ page: 1, limit: PAGE_SIZE });
      const mappedProducts = response.products.map(mapProduct);
      products.value = sortByStock(mappedProducts);
      hasMore.value = response.pagination?.hasMore ?? false;
      loaded.value = true;
    } catch (error) {
      console.error("상품 목록 로드 실패:", error);
      products.value = [];
      hasMore.value = false;
    } finally {
      loading.value = false;
    }
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

  // 강제 새로고침
  const refreshProducts = async () => {
    loaded.value = false;
    currentPage.value = 1;
    hasMore.value = true;
    await loadHomeProducts();
  };

  // Computed: ProductHome용 (1~4번)
  const featuredProducts = computed(() => products.value.slice(0, 4));

  // Computed: Product용 (5번 이후)
  const remainingProducts = computed(() => products.value.slice(4));

  return {
    // 상태
    products,
    loading,
    loaded,
    // 무한스크롤 상태
    loadingMore,
    hasMore,
    // 액션
    loadHomeProducts,
    loadMoreProducts,
    refreshProducts,
    // Computed
    featuredProducts,
    remainingProducts,
  };
});
