// src/composables/useProduct.ts
// 상품 상세 관련 로직

import { ref, computed, onMounted, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchProduct, fetchProductVariants, fetchSizeMeasurements } from "@/lib/api";
import type { Product, ProductVariant, SizeMeasurement } from "@/types/api";

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
      error.value = "상품 정보를 불러올 수 없습니다.";
      console.error("상품 로드 실패:", e);
      alert("상품 정보를 불러올 수 없습니다.");
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
 * 상품 옵션(사이즈) 선택 관리
 */
export function useVariantSelection(variants: Ref<ProductVariant[]>) {
  const selectedVariantId = ref<number | string>("");
  const quantity = ref(1);

  // 선택된 variant 객체
  const selectedVariant = computed(() => {
    if (!selectedVariantId.value) return null;
    return variants.value.find((v: ProductVariant) => v.id === selectedVariantId.value) || null;
  });

  // 옵션 선택 가능 여부
  const hasVariants = computed(() => variants.value.length > 0);

  // 옵션 선택 필요 여부
  const needsVariantSelection = computed(() => {
    return hasVariants.value && !selectedVariantId.value;
  });

  // 선택된 옵션의 재고 확인
  const isStockAvailable = computed(() => {
    if (!selectedVariant.value) return true;
    return selectedVariant.value.stockQuantity >= quantity.value;
  });

  // variant 선택
  const selectVariant = (variant: ProductVariant) => {
    if (variant.stockQuantity <= 0 || !variant.isAvailable) return;
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
    selectedVariantId.value = "";
    quantity.value = 1;
  };

  return {
    selectedVariantId,
    quantity,
    selectedVariant,
    hasVariants,
    needsVariantSelection,
    isStockAvailable,
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
