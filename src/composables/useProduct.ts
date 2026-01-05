// src/composables/useProduct.ts
// 상품 관련 로직 (목록 및 상세)

import { ref, computed, onMounted, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchProduct, fetchProducts, fetchProductVariants, fetchSizeMeasurements } from "@/lib/api";
import type { Product, ProductVariant, SizeMeasurement } from "@/types/api";
import { useAlert } from "./useAlert";

// 사이즈 측정 키 정의
export const MEASUREMENT_KEYS = [
  { key: "totalLength", label: "총장" },
  { key: "shoulderWidth", label: "어깨너비" },
  { key: "chestSection", label: "가슴단면" },
  { key: "sleeveLength", label: "소매길이" },
  { key: "waistSection", label: "허리단면" },
  { key: "hipSection", label: "엉덩이단면" },
  { key: "thighSection", label: "허벅지단면" },
] as const;

export type MeasurementKey = typeof MEASUREMENT_KEYS[number]["key"];

/**
 * 상품 상세 정보 로드
 */
export function useProduct(productId?: string | number) {
  const route = useRoute();
  const router = useRouter();

  const product = ref<Product | null>(null);
  const variants = ref<ProductVariant[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 갤러리 이미지 목록
  const galleryImages = computed(() => {
    if (!product.value) return [];
    const list: string[] = [];
    if (product.value.imageUrl) list.push(product.value.imageUrl);
    if (product.value.images && Array.isArray(product.value.images)) {
      list.push(...product.value.images);
    }
    return list;
  });

  // 상품 데이터 로드
  const loadProduct = async (id?: string | number) => {
    const pid = id || productId || (route.params.id as string);
    if (!pid) {
      error.value = "상품 ID가 필요합니다";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      product.value = await fetchProduct(String(pid));
      variants.value = await fetchProductVariants(String(pid));
    } catch (e) {
      const { showAlert } = useAlert();
      error.value = "상품 정보를 불러올 수 없습니다.";
      console.error("상품 로드 실패:", e);
      showAlert("상품 정보를 불러올 수 없습니다.", { type: "error" });
      router.go(-1);
    } finally {
      loading.value = false;
    }
  };

  return {
    product,
    variants,
    loading,
    error,
    galleryImages,
    loadProduct,
  };
}

/**
 * 상품 옵션(사이즈/색상) 순차 선택 관리
 */
export function useVariantSelection(variants: Ref<ProductVariant[]>) {
  const selectedSize = ref<string>("");
  const selectedColor = ref<string>("");
  const selectedVariantId = ref<string>("");
  const quantity = ref(1);

  // 고유한 사이즈 목록 (재고/판매 가능 여부 포함)
  const uniqueSizes = computed(() => {
    const sizeMap = new Map<string, { size: string; hasStock: boolean }>();

    variants.value.forEach((v: ProductVariant) => {
      const existing = sizeMap.get(v.size);
      const hasStock = v.stockQuantity > 0 && v.isAvailable;

      if (!existing) {
        sizeMap.set(v.size, { size: v.size, hasStock });
      } else if (hasStock && !existing.hasStock) {
        // 재고 있는 variant가 하나라도 있으면 활성화
        sizeMap.set(v.size, { size: v.size, hasStock: true });
      }
    });

    return Array.from(sizeMap.values());
  });

  // 색상이 있는지 여부 확인
  const hasColors = computed(() => {
    return variants.value.some((v: ProductVariant) => v.color && v.color.trim() !== "");
  });

  // 선택된 사이즈에 대한 색상 목록
  const availableColors = computed(() => {
    if (!selectedSize.value) return [];

    return variants.value
      .filter((v: ProductVariant) => v.size === selectedSize.value && v.color)
      .map((v: ProductVariant) => ({
        color: v.color!,
        hasStock: v.stockQuantity > 0 && v.isAvailable,
        variantId: v.id,
      }));
  });

  // 선택된 variant 객체
  const selectedVariant = computed(() => {
    if (!selectedVariantId.value) return null;
    return variants.value.find((v: ProductVariant) => v.id === selectedVariantId.value) || null;
  });

  // 옵션 선택 가능 여부
  const hasVariants = computed(() => variants.value.length > 0);

  // 옵션 선택 필요 여부 (사이즈/색상 모두 선택해야 완료)
  const needsVariantSelection = computed(() => {
    if (!hasVariants.value) return false;
    if (!selectedSize.value) return true;
    if (hasColors.value && !selectedColor.value) return true;
    return !selectedVariantId.value;
  });

  // 선택된 옵션의 재고 확인
  const isStockAvailable = computed(() => {
    if (!selectedVariant.value) return true;
    return selectedVariant.value.stockQuantity >= quantity.value;
  });

  // 사이즈 선택
  const selectSize = (size: string) => {
    // 해당 사이즈에 재고 있는 variant가 있는지 확인
    const sizeInfo = uniqueSizes.value.find((s) => s.size === size);
    if (!sizeInfo?.hasStock) return;

    selectedSize.value = size;
    selectedColor.value = "";
    selectedVariantId.value = "";
    quantity.value = 1;

    // 색상이 없는 경우 바로 variant 선택
    if (!hasColors.value) {
      const variant = variants.value.find(
        (v: ProductVariant) => v.size === size && v.stockQuantity > 0 && v.isAvailable
      );
      if (variant) {
        selectedVariantId.value = variant.id;
      }
    }
  };

  // 색상 선택
  const selectColor = (color: string) => {
    const colorInfo = availableColors.value.find((c) => c.color === color);
    if (!colorInfo?.hasStock) return;

    selectedColor.value = color;
    selectedVariantId.value = colorInfo.variantId;
    quantity.value = 1;
  };

  // variant 직접 선택 (기존 호환성 유지)
  const selectVariant = (variant: ProductVariant) => {
    if (variant.stockQuantity <= 0 || !variant.isAvailable) return;
    selectedSize.value = variant.size;
    selectedColor.value = variant.color || "";
    selectedVariantId.value = variant.id;
    quantity.value = 1;
  };

  // 수량 증가
  const increaseQuantity = () => {
    quantity.value++;
  };

  // 수량 감소
  const decreaseQuantity = () => {
    if (quantity.value > 1) {
      quantity.value--;
    }
  };

  // 선택 초기화
  const resetSelection = () => {
    selectedSize.value = "";
    selectedColor.value = "";
    selectedVariantId.value = "";
    quantity.value = 1;
  };

  return {
    selectedSize,
    selectedColor,
    selectedVariantId,
    quantity,
    selectedVariant,
    hasVariants,
    hasColors,
    uniqueSizes,
    availableColors,
    needsVariantSelection,
    isStockAvailable,
    selectSize,
    selectColor,
    selectVariant,
    increaseQuantity,
    decreaseQuantity,
    resetSelection,
  };
}

/**
 * 사이즈 측정 정보 관리
 */
export function useSizeMeasurements(variants: Ref<ProductVariant[]>) {
  const allSizeData = ref<(SizeMeasurement & { variantSize: string })[]>([]);
  const loading = ref(false);

  // 데이터가 있는 측정 항목만 필터링
  const activeColumns = computed(() => {
    return MEASUREMENT_KEYS.filter((col) => {
      return allSizeData.value.some((data: SizeMeasurement & { variantSize: string }) => {
        const value = data[col.key as keyof SizeMeasurement];
        return value !== undefined && Number(value) > 0;
      });
    });
  });

  // 사이즈 데이터 존재 여부
  const hasSizeData = computed(() => {
    return allSizeData.value.length > 0 && activeColumns.value.length > 0;
  });

  // 사이즈 정보 로드
  const loadSizeMeasurements = async () => {
    if (variants.value.length === 0) return;

    loading.value = true;
    try {
      const promises = variants.value.map(async (variant: ProductVariant) => {
        try {
          const measurements = await fetchSizeMeasurements(variant.id);
          const measureData = Array.isArray(measurements) && measurements.length > 0
            ? measurements[0]
            : null;

          if (measureData) {
            return { variantSize: variant.size, ...measureData };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      allSizeData.value = results.filter(
        (item: (SizeMeasurement & { variantSize: string }) | null): item is (SizeMeasurement & { variantSize: string }) => item !== null
      );
    } catch (e) {
      console.error("사이즈 정보 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  return {
    allSizeData,
    loading,
    activeColumns,
    hasSizeData,
    loadSizeMeasurements,
    measurementKeys: MEASUREMENT_KEYS,
  };
}

/**
 * 상품 상세 탭 관리
 */
export function useProductTabs() {
  const activeTab = ref<"description" | "size">("description");

  const setTab = (tab: "description" | "size") => {
    activeTab.value = tab;
  };

  return {
    activeTab,
    setTab,
  };
}

/**
 * 상품 이미지 갤러리 관리
 */
export function useImageGallery(galleryImages: Ref<string[]>) {
  const currentImage = ref("");

  // 현재 이미지 설정
  const setCurrentImage = (imageUrl: string) => {
    currentImage.value = imageUrl;
  };

  // 첫 번째 이미지로 초기화
  const initializeImage = (defaultImage?: string) => {
    if (defaultImage) {
      currentImage.value = defaultImage;
    } else if (galleryImages.value.length > 0) {
      currentImage.value = galleryImages.value[0];
    }
  };

  return {
    currentImage,
    setCurrentImage,
    initializeImage,
  };
}

/**
 * 상품 상세 페이지 전체 로직 (통합)
 */
export function useProductDetail() {
  const route = useRoute();
  const productId = computed(() => route.params.id as string);

  const productData = useProduct();
  const variantSelection = useVariantSelection(productData.variants);
  const sizeMeasurements = useSizeMeasurements(productData.variants);
  const tabs = useProductTabs();
  const gallery = useImageGallery(productData.galleryImages);

  // 전체 데이터 로드
  const loadAllData = async () => {
    await productData.loadProduct(productId.value);

    // 상품 로드 후 이미지 초기화
    if (productData.product.value?.imageUrl) {
      gallery.initializeImage(productData.product.value.imageUrl);
    }

    // 사이즈 정보 로드
    await sizeMeasurements.loadSizeMeasurements();
  };

  onMounted(loadAllData);

  return {
    // 상품 정보
    product: productData.product,
    variants: productData.variants,
    galleryImages: productData.galleryImages,
    loading: productData.loading,

    // 옵션 선택
    ...variantSelection,

    // 사이즈 정보
    allSizeData: sizeMeasurements.allSizeData,
    activeColumns: sizeMeasurements.activeColumns,
    hasSizeData: sizeMeasurements.hasSizeData,
    measurementKeys: sizeMeasurements.measurementKeys,

    // 탭
    activeTab: tabs.activeTab,
    setTab: tabs.setTab,

    // 갤러리
    currentImage: gallery.currentImage,
    setCurrentImage: gallery.setCurrentImage,

    // 데이터 로드
    loadAllData,
  };
}

// 상품 목록 아이템 인터페이스
export interface ProductListItem {
  id: string;
  imageUrl: string;
  name: string;
  price: number;
  totalStock?: number; // 총 재고 수량 (품절 정렬용)
  isAvailable?: boolean; // 판매 가능 여부
}

/**
 * 상품 목록 조회 및 관리 (무한 스크롤 지원 - 상태 기반 잠금)
 */
export function useProductList() {
  const route = useRoute();

  const products = ref<ProductListItem[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

  // 페이지네이션 상태
  const currentPage = ref(1);
  const hasMore = ref(true);
  const totalProducts = ref(0);
  const pageSize = 12;

  // 필터 상태
  const currentCategory = ref<string | undefined>(undefined);
  const currentSearch = ref<string>("");

  // 카테고리 슬러그 추출
  const getCategorySlug = () => {
    const categoryParam = Array.isArray(route.params.category)
      ? route.params.category[0]
      : route.params.category;

    return !categoryParam || categoryParam === "all"
      ? undefined
      : categoryParam.trim().toLowerCase();
  };

  // 상품 정렬 (품절 상품 맨 뒤로)
  const sortByStock = (items: ProductListItem[]): ProductListItem[] => {
    return [...items].sort((a, b) => {
      const aStock = a.totalStock ?? 1; // totalStock이 없으면 재고 있음으로 간주
      const bStock = b.totalStock ?? 1;

      // 품절(재고 0) 상품을 뒤로 정렬
      if (aStock === 0 && bStock > 0) return 1;
      if (aStock > 0 && bStock === 0) return -1;
      return 0; // 둘 다 재고 있거나 둘 다 품절이면 순서 유지
    });
  };

  // API 응답을 ProductListItem으로 변환
  const mapProduct = (item: any): ProductListItem => ({
    id: item.id,
    imageUrl: item.imageUrl,
    name: item.name,
    price: Number(item.price),
    totalStock: item.totalStock ?? item.stockQuantity ?? undefined,
    isAvailable: item.isAvailable,
  });

  // 상품 목록 초기 로드
  const loadProducts = async (search?: string) => {
    loading.value = true;
    error.value = null;
    currentPage.value = 1;
    hasMore.value = true;
    currentCategory.value = getCategorySlug();
    currentSearch.value = search?.trim() || "";

    try {
      const response = await fetchProducts({
        category: currentCategory.value,
        search: currentSearch.value || undefined,
        page: 1,
        limit: pageSize,
      });

      // 상품 매핑 후 isAvailable이 false인 상품 제외, 품절 상품을 맨 뒤로 정렬
      const mappedProducts = response.products
        .map(mapProduct)
        .filter((p) => p.isAvailable !== false);
      products.value = sortByStock(mappedProducts);

      totalProducts.value = response.pagination.total;
      hasMore.value = response.pagination.hasMore;
    } catch (e) {
      error.value = "상품 목록을 불러올 수 없습니다.";
      console.error("상품 목록 로드 실패:", e);
      products.value = [];
    } finally {
      loading.value = false;
    }
  };

  // 추가 상품 목록 로드 (무한 스크롤용 - 상태 기반 잠금)
  const loadMoreProducts = async () => {
    // 상태 기반 잠금: 이미 로딩 중이거나 더 이상 데이터가 없으면 스킵
    if (loadingMore.value || loading.value || !hasMore.value) return;

    // 잠금 설정
    loadingMore.value = true;
    const nextPage = currentPage.value + 1;

    try {
      const response = await fetchProducts({
        category: currentCategory.value,
        search: currentSearch.value || undefined,
        page: nextPage,
        limit: pageSize,
      });

      // isAvailable이 false인 상품 제외
      const newProducts = response.products
        .map(mapProduct)
        .filter((p) => p.isAvailable !== false);

      // 기존 상품과 새 상품을 합친 후 품절 상품을 맨 뒤로 정렬
      products.value = sortByStock([...products.value, ...newProducts]);
      hasMore.value = response.pagination.hasMore;
      currentPage.value = nextPage;
    } catch (e) {
      console.error("추가 상품 로드 실패:", e);
    } finally {
      // 잠금 해제
      loadingMore.value = false;
    }
  };

  // 카테고리 변경 감지
  watch(
    () => route.params.category,
    () => {
      loadProducts(currentSearch.value);
    }
  );

  return {
    products,
    loading,
    loadingMore,
    error,
    hasMore,
    totalProducts,
    currentSearch,
    loadProducts,
    loadMoreProducts,
  };
}
