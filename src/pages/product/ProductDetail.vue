<script setup lang="ts">
// src/pages/ProductDetail.vue
// 상품 상세 페이지

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { recordProductView } from "@/lib/api";
import {
  useProduct,
  useVariantSelection,
  useSizeMeasurements,
  useProductTabs,
  useImageGallery,
} from "@/composables/useProduct";
import { useWishlistToggle } from "@/composables/useWishlist";
import { useAuthCheck } from "@/composables/useAuthGuard";
import { useCart } from "@/composables/useCart";
import { useOptimizedImage, useNaverPayOrder } from "@/composables";
import { formatPrice, formatSizeValue } from "@/lib/formatters";

// 아이콘
import { Heart, Share2, Check } from "lucide-vue-next";

// 공통 컴포넌트
import {
  ProductDetailSkeleton,
  LoadingSpinner,
  //QuantitySelector
} from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, type AlertType } from "@/components/ui/alert";
import {
  PRODUCT_MESSAGES,
  CART_MESSAGES,
  ERROR_MESSAGES,
  formatMessage,
} from "@/lib/messages";
import type { DirectPurchaseData, CartProductInfo } from "@/types/api";
import {
  isValidQuantity,
  isValidPrice,
  isValidUUID,
  getQuantityLimits,
} from "@/lib/validators";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Composables
const productData = useProduct();
const { requireAuth } = useAuthCheck();
const { addItem } = useCart();
const { detail } = useOptimizedImage();

// 라우트 파라미터 (slug 또는 UUID — 백엔드가 자동 감지)
const routeSlug = computed(() => String(route.params.slug));

// 실제 UUID: 상품 로드 완료 후 확정 (wishlist 등 UUID 필수 API에 사용)
const productUUID = computed(() => productData.product.value?.id ?? "");

const getViewSessionKey = (id: string) => `product_view_recorded:${id}`;

const hasRecordedViewInSession = (id: string): boolean => {
  try {
    return sessionStorage.getItem(getViewSessionKey(id)) === "1";
  } catch {
    return false;
  }
};

const markViewRecordedInSession = (id: string) => {
  try {
    sessionStorage.setItem(getViewSessionKey(id), "1");
  } catch {
    // sessionStorage가 막힌 환경에서는 조용히 무시
  }
};

const trackProductView = async (id: string) => {
  if (!isValidUUID(id) || hasRecordedViewInSession(id)) {
    return;
  }

  const success = await recordProductView(id);
  if (success) {
    markViewRecordedInSession(id);
  }
};

// variant 선택
const variantSelection = useVariantSelection(productData.variants);

// 전체 품절 여부 확인
const isOutOfStock = computed(() => {
  const variants = productData.variants.value;
  if (variants.length === 0) return false;
  return variants.every((v) => v.stockQuantity <= 0 || !v.isAvailable);
});

// 사이즈 정보
const sizeMeasurements = useSizeMeasurements(productData.variants);

// 탭 관리
const { activeTab, setTab } = useProductTabs();

// 갤러리 관리
const gallery = useImageGallery(productData.galleryImages);

// 위시리스트 토글 (UUID 기반 — 상품 로드 후 productUUID가 채워진 뒤 checkStatus 호출됨)
const wishlistToggle = useWishlistToggle(productUUID);

// 네이버페이 주문형
const naverPay = useNaverPayOrder();
const naverPayInitialized = ref(false);
const naverPayRenderTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// 네이버페이 버튼 표시 여부 (관리자 + 검수 테스트 계정만)
const showNaverPayButton = computed(() => {
  return (
    naverPay.isEnabled.value &&
    (authStore.isAdmin ||
      authStore.user?.email === "test@shakishakiarchive.com")
  );
});

// 간편결제 버튼 표시 조건 (computed로 가독성 향상)
const showPaymentButtons = computed(() => {
  return (
    !variantSelection.needsVariantSelection.value &&
    !isOutOfStock.value &&
    (naverPay.sdkLoaded.value || !naverPay.isEnabled.value)
  );
});

// Alert 상태
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref<AlertType>("success");

// Alert 표시 헬퍼 함수
const displayAlert = (message: string, type: AlertType = "error") => {
  alertMessage.value = message;
  alertType.value = type;
  showAlert.value = true;
};

// 링크 복사 상태
const isCopied = ref(false);

// 이미지 로딩 상태
const mainImageLoaded = ref(false);
const detailImagesLoaded = ref<Record<number, boolean>>({});

// 이미지 로드 핸들러
const handleMainImageLoad = () => {
  mainImageLoaded.value = true;
};

const handleDetailImageLoad = (index: number) => {
  detailImagesLoaded.value[index] = true;
};

// 링크 복사 핸들러
const handleCopyLink = async () => {
  try {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    isCopied.value = true;
    displayAlert(PRODUCT_MESSAGES.linkCopySuccess, "success");

    // 3초 후 아이콘 원래대로
    setTimeout(() => {
      isCopied.value = false;
    }, 3000);
  } catch (error) {
    console.error("링크 복사 실패:", error);
    displayAlert(PRODUCT_MESSAGES.linkCopyFailed);
  }
};

// 장바구니 이동 확인 다이얼로그 상태
const showCartConfirm = ref(false);

// 중복 상품 추가 확인 다이얼로그 상태
const showDuplicateConfirm = ref(false);
const existingCartItem = ref<{ quantity: number } | null>(null);

// 장바구니 composable (기존 상품 체크용)
const cart = useCart();

// 위시리스트 토글 핸들러 (회원 전용 유지)
const handleToggleWishlist = () => {
  requireAuth(async () => {
    const success = await wishlistToggle.toggle();
    if (!success) {
      displayAlert(ERROR_MESSAGES.serverError);
    }
  });
};

// [수정] 장바구니 담기 (비회원 허용)
const handleAddToCart = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    displayAlert(PRODUCT_MESSAGES.optionRequired);
    return;
  }

  // 2. 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert(PRODUCT_MESSAGES.loadFailed);
    return;
  }

  const vid = variantSelection.selectedVariantId.value || undefined;
  const qty = Number(variantSelection.quantity.value);

  // 3. 선택된 variant의 재고 확인
  const selectedVariant = vid
    ? productData.variants.value.find((v) => v.id === vid)
    : null;

  const availableStock = selectedVariant ? selectedVariant.stockQuantity : 0;

  // 재고가 0이면 담을 수 없음
  if (availableStock === 0) {
    displayAlert(CART_MESSAGES.outOfStock);
    return;
  }

  // 4. 장바구니 로드 후 기존 상품 체크 및 총 수량 확인
  await cart.loadCart();
  const existing = cart.cartItems.value.find(
    (item) => item.productId === product.id && item.variantId === vid,
  );

  // 기존 장바구니 수량 + 새로 담으려는 수량이 재고를 초과하는지 확인
  const existingQty = existing ? existing.quantity : 0;
  const totalQty = existingQty + qty;

  if (totalQty > availableStock) {
    displayAlert(
      formatMessage(CART_MESSAGES.stockLimitExceeded, {
        stock: availableStock,
      }),
    );
    return;
  }

  if (existing) {
    // 기존 상품이 있으면 확인 다이얼로그 표시
    existingCartItem.value = { quantity: existing.quantity };
    showDuplicateConfirm.value = true;
    return;
  }

  // 기존 상품이 없으면 바로 추가
  await proceedAddToCart();
};

// 실제 장바구니 추가 처리
const proceedAddToCart = async () => {
  // 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert(PRODUCT_MESSAGES.loadFailed);
    return;
  }

  const vid = variantSelection.selectedVariantId.value || undefined;
  const qty = Number(variantSelection.quantity.value);

  // 수량 검증
  if (!isValidQuantity(qty)) {
    const limits = getQuantityLimits();
    displayAlert(
      formatMessage(CART_MESSAGES.quantityLimit, {
        min: limits.MIN,
        max: limits.MAX,
      }),
    );
    return;
  }

  // 가격 검증
  const price = Number(product.price);
  if (!isValidPrice(price)) {
    displayAlert(PRODUCT_MESSAGES.invalidPrice);
    return;
  }

  // 상품 ID 검증
  if (!isValidUUID(product.id)) {
    displayAlert(PRODUCT_MESSAGES.invalidProductInfo);
    return;
  }

  const selectedVariant = vid
    ? productData.variants.value.find((v) => v.id === vid)
    : null;

  // 재고 확인 (중복 추가 확인 후에도 한 번 더 체크)
  const availableStock = selectedVariant ? selectedVariant.stockQuantity : 0;

  if (availableStock === 0) {
    displayAlert(CART_MESSAGES.outOfStock);
    return;
  }

  // 장바구니에 이미 있는 수량 확인
  await cart.loadCart();
  const existing = cart.cartItems.value.find(
    (item) => item.productId === product.id && item.variantId === vid,
  );
  const existingQty = existing ? existing.quantity : 0;
  const totalQty = existingQty + qty;

  if (totalQty > availableStock) {
    displayAlert(
      formatMessage(CART_MESSAGES.stockExceededWithCart, {
        stock: availableStock,
        cartQty: existingQty,
      }),
    );
    return;
  }

  // 비회원 장바구니를 위한 상품 정보 구성 (타입 명시)
  const productInfo: CartProductInfo = {
    id: product.id,
    name: product.name,
    price: price,
    imageUrl: product.imageUrl,
    variant: selectedVariant
      ? {
          id: selectedVariant.id,
          size: selectedVariant.size,
          color: selectedVariant.color,
        }
      : null,
  };

  // API 호출 (비회원은 내부적으로 localStorage 사용)
  const success = await addItem({
    productId: product.id,
    variantId: vid,
    quantity: qty,
    productInfo: productInfo,
  });

  if (success) {
    // 장바구니 이동 확인 다이얼로그 표시
    showCartConfirm.value = true;
  } else {
    displayAlert(CART_MESSAGES.addFailed);
  }
};

// 중복 상품 확인 후 추가
const handleConfirmDuplicate = async () => {
  showDuplicateConfirm.value = false;
  existingCartItem.value = null;
  await proceedAddToCart();
};

// 중복 상품 추가 취소
const handleCancelDuplicate = () => {
  showDuplicateConfirm.value = false;
  existingCartItem.value = null;
};

// 장바구니로 이동
const handleGoToCart = () => {
  showCartConfirm.value = false;
  router.push("/cart");
};

// 카카오페이 구매 (주문 페이지로 이동, 카카오페이 선택)
const handleKakaoPayBuy = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    displayAlert(PRODUCT_MESSAGES.optionRequired);
    return;
  }

  // 2. 재고 확인
  if (!variantSelection.isStockAvailable.value) {
    displayAlert(PRODUCT_MESSAGES.insufficientStock);
    return;
  }

  // 3. 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert(PRODUCT_MESSAGES.loadFailed);
    return;
  }

  // 4. 수량 검증
  const qty = Number(variantSelection.quantity.value);
  if (!isValidQuantity(qty)) {
    const limits = getQuantityLimits();
    displayAlert(
      formatMessage(CART_MESSAGES.quantityLimit, {
        min: limits.MIN,
        max: limits.MAX,
      }),
    );
    return;
  }

  // 5. 가격 및 상품 ID 검증
  const price = Number(product.price);
  if (!isValidPrice(price) || !isValidUUID(product.id)) {
    displayAlert(PRODUCT_MESSAGES.invalidProductInfo);
    return;
  }

  // 6. 로그인 체크 (주문 페이지는 로그인 필수)
  requireAuth(() => {
    const vid = variantSelection.selectedVariantId.value || undefined;
    const selectedVariant = vid
      ? productData.variants.value.find((v) => v.id === vid)
      : null;

    // 바로 구매 상품 정보를 세션 스토리지에 저장
    const directPurchaseItem: DirectPurchaseData = {
      id: `direct_${Date.now()}`,
      productId: product.id,
      variantId: vid,
      quantity: qty,
      product: {
        id: product.id,
        name: product.name,
        price: price,
        imageUrl: product.imageUrl,
      },
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            size: selectedVariant.size,
            color: selectedVariant.color,
          }
        : null,
    };

    sessionStorage.setItem(
      "directPurchase",
      JSON.stringify(directPurchaseItem),
    );

    // 카카오페이 선택 상태로 주문 페이지 이동
    router.push("/order?direct=true&payment=kakaopay");
  });
};

// 계속 쇼핑하기
const handleContinueShopping = () => {
  showCartConfirm.value = false;
};

// 네이버페이 SDK 로드 (설정 + 스크립트만)
const loadNaverPaySdk = async () => {
  try {
    await naverPay.loadConfig();
    if (!naverPay.isEnabled.value) return;
    await naverPay.loadSdk();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("네이버페이 SDK 로드 실패:", e);
    }
  }
};

// 네이버페이 버튼 렌더링 (컨테이너가 존재할 때만)
const renderNaverPayButton = () => {
  if (naverPayInitialized.value) return;
  if (!naverPay.isEnabled.value || !naverPay.sdkLoaded.value) return;

  // 컨테이너 존재 확인
  const container = document.getElementById("naverpay-button-container");
  if (!container) return;

  // 컨테이너 초기화 (중복 방지)
  container.replaceChildren();

  try {
    naverPay.renderButton({
      containerId: "naverpay-button-container",
      buttonType: "A",
      buttonColor: 1,
      count: 2,
      onBuy: handleNaverPayBuy,
      onWishlist: handleNaverPayWishlist,
    });
    naverPayInitialized.value = true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("네이버페이 버튼 렌더링 실패:", e);
    }
  }
};

// 네이버페이 찜하기 핸들러
const handleNaverPayWishlist = async () => {
  const product = productData.product.value;
  if (!product) return;

  try {
    await naverPay.addToWishlist(product.id);
    displayAlert("네이버페이 찜 목록에 추가되었습니다", "success");
  } catch (e: any) {
    displayAlert(e.message || "찜하기에 실패했습니다");
  }
};

// 네이버페이 구매 핸들러
const handleNaverPayBuy = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    displayAlert(PRODUCT_MESSAGES.optionRequired);
    return;
  }

  // 2. 재고 확인
  if (!variantSelection.isStockAvailable.value) {
    displayAlert(PRODUCT_MESSAGES.insufficientStock);
    return;
  }

  // 3. 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert(PRODUCT_MESSAGES.loadFailed);
    return;
  }

  try {
    const response = await naverPay.registerOrder({
      productId: product.id,
      variantId: variantSelection.selectedVariantId.value || undefined,
      quantity: Number(variantSelection.quantity.value) || 1,
    });

    // 네이버페이 주문서로 이동 (백엔드에서 받은 URL 사용)
    naverPay.openNaverPayOrder(response.orderPageUrl);
  } catch (e: any) {
    displayAlert(e.message || "네이버페이 주문 등록에 실패했습니다");
  }
};

// 갤러리 이미지 변경 시 로딩 상태 리셋
watch(
  () => gallery.currentImage.value,
  () => {
    mainImageLoaded.value = false;
  },
);

// 옵션 선택 시 네이버페이 버튼 렌더링
watch(
  () => variantSelection.needsVariantSelection.value,
  (needsSelection) => {
    // 옵션이 선택되면 (needsSelection이 false가 되면) 버튼 렌더링
    if (!needsSelection && !isOutOfStock.value) {
      // 기존 타이머 정리
      if (naverPayRenderTimer.value) {
        clearTimeout(naverPayRenderTimer.value);
      }
      // nextTick으로 DOM 업데이트 후 렌더링
      nextTick(() => {
        naverPayRenderTimer.value = setTimeout(renderNaverPayButton, 100);
      });
    }
  },
);

// SDK 로드 완료 시 버튼 렌더링 (사이즈가 이미 선택된 경우)
watch(
  () => naverPay.sdkLoaded.value,
  (loaded) => {
    if (
      loaded &&
      !variantSelection.needsVariantSelection.value &&
      !isOutOfStock.value
    ) {
      // 기존 타이머 정리
      if (naverPayRenderTimer.value) {
        clearTimeout(naverPayRenderTimer.value);
      }
      nextTick(() => {
        naverPayRenderTimer.value = setTimeout(renderNaverPayButton, 100);
      });
    }
  },
);

// 컴포넌트 언마운트 시 cleanup
onUnmounted(() => {
  if (naverPayRenderTimer.value) {
    clearTimeout(naverPayRenderTimer.value);
    naverPayRenderTimer.value = null;
  }
});

// 데이터 로드
onMounted(async () => {
  await productData.loadProduct(routeSlug.value);
  const loadedProduct = productData.product.value;

  if (loadedProduct?.id) {
    void trackProductView(loadedProduct.id);
  }

  // 페이지 타이틀 업데이트 (상품명으로)
  if (productData.product.value?.name) {
    document.title = `${productData.product.value.name} | 샤키샤키 아카이브(ShakiShaki Archive)`;
  }

  // 이미지 초기화
  if (productData.product.value?.imageUrl) {
    gallery.initializeImage(productData.product.value.imageUrl);
  }

  // 위시리스트 상태 확인 (회원인 경우만)
  if (authStore.isAuthenticated) {
    await wishlistToggle.checkStatus();
  }

  // 사이즈 정보 로드
  await sizeMeasurements.loadSizeMeasurements();

  // 네이버페이 SDK 로드 (약간 딜레이 후)
  setTimeout(loadNaverPaySdk, 200);
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
    <!-- 에러 상태: 로딩 완료 후 상품 데이터가 없는 경우 (Rate-limit 등) -->
    <div
      v-if="
        !productData.loading.value &&
        productData.error.value &&
        !productData.product.value
      "
      class="flex flex-col items-center justify-center py-20 gap-4"
    >
      <p class="text-body text-muted-foreground">
        {{ productData.error.value }}
      </p>
      <Button variant="outline" @click="productData.loadProduct(routeSlug)">
        다시 시도
      </Button>
    </div>

    <!-- 로딩 상태: 상세 페이지 스켈레톤 -->
    <ProductDetailSkeleton
      v-else-if="productData.loading.value || !productData.product.value"
    />

    <div v-else class="flex flex-col lg:grid lg:grid-cols-2 gap-8">
      <!-- 메인 이미지: 모바일에서만 표시 -->
      <div class="order-1 lg:hidden">
        <Card class="overflow-hidden">
          <div class="aspect-[3/4] bg-muted relative">
            <!-- 로딩 스피너 -->
            <div
              v-if="!mainImageLoaded"
              class="absolute inset-0 flex items-center justify-center bg-muted"
            >
              <LoadingSpinner variant="spinner" size="lg" />
            </div>

            <!-- 메인 이미지 -->
            <img
              :src="detail(gallery.currentImage.value)"
              class="w-full h-full object-cover"
              :class="{ 'opacity-0': !mainImageLoaded }"
              loading="eager"
              decoding="async"
              crossorigin="anonymous"
              draggable="false"
              alt="Product Main Image"
              @load="handleMainImageLoad"
            />

            <!-- 모바일 액션 버튼들 -->
            <div class="absolute bottom-3 right-3 z-10 flex gap-2 lg:hidden">
              <!-- 링크 복사 버튼 -->
              <button
                @click.stop="handleCopyLink"
                class="p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md"
                title="링크 복사"
              >
                <Share2
                  v-if="!isCopied"
                  class="w-5 h-5 text-muted-foreground transition-colors duration-200"
                />
                <Check
                  v-else
                  class="w-5 h-5 text-primary transition-colors duration-200"
                />
              </button>

              <!-- 위시리스트 버튼 -->
              <button
                @click.stop="handleToggleWishlist"
                class="p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md"
                title="위시리스트 담기"
              >
                <Heart
                  class="w-5 h-5 transition-colors duration-200"
                  :class="
                    wishlistToggle.isWishlisted.value
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  "
                />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <!-- 상품 정보 카드: 모바일 2번, 데스크탑 우측 -->
      <div class="order-2 lg:order-2">
        <Card class="sticky top-24">
          <CardContent class="p-6">
            <div class="flex justify-between items-end gap-3 mb-3">
              <div>
                <h3 class="text-body text-foreground font-medium">
                  {{ productData.product.value.name }}
                </h3>
                <div class="flex items-baseline gap-2 pt-1.5">
                  <span class="text-body text-muted-foreground">
                    {{ formatPrice(productData.product.value.price) }}
                  </span>
                  <span
                    v-if="productData.product.value.originalPrice"
                    class="text-caption text-muted-foreground/70 line-through -translate-y-1"
                  >
                    {{ formatPrice(productData.product.value.originalPrice) }}
                  </span>
                </div>
              </div>

              <!-- 데스크톱 액션 버튼들 -->
              <div class="hidden lg:flex gap-2 shrink-0 lg:-translate-y-3">
                <!-- 링크 복사 버튼 -->
                <button
                  @click="handleCopyLink"
                  class="flex items-center justify-center p-2 rounded-full bg-background border border-border hover:bg-accent transition-all"
                  title="링크 복사"
                >
                  <Share2
                    v-if="!isCopied"
                    class="w-5 h-5 text-muted-foreground hover:text-primary transition-colors duration-200"
                  />
                  <Check
                    v-else
                    class="w-5 h-5 text-primary transition-colors duration-200"
                  />
                </button>

                <!-- 위시리스트 버튼 -->
                <button
                  @click="handleToggleWishlist"
                  class="flex items-center justify-center p-2 rounded-full bg-background border border-border hover:bg-accent transition-all"
                  title="위시리스트 담기"
                >
                  <Heart
                    class="w-5 h-5 transition-colors duration-200"
                    :class="
                      wishlistToggle.isWishlisted.value
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    "
                  />
                </button>
              </div>
            </div>

            <Separator class="mb-4" />

            <div v-if="productData.variants.value.length > 0" class="mb-6">
              <label class="block text-body font-semibold text-foreground mb-2"
                >사이즈</label
              >
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="variant in productData.variants.value"
                  :key="variant.id"
                  @click="variantSelection.selectVariant(variant)"
                  :disabled="variant.stockQuantity <= 0 || !variant.isAvailable"
                  :variant="
                    variantSelection.selectedVariantId.value === variant.id
                      ? 'default'
                      : 'outline'
                  "
                  :class="[
                    'min-w-[3rem]',
                    variant.stockQuantity <= 0 || !variant.isAvailable
                      ? 'opacity-40 line-through'
                      : '',
                  ]"
                >
                  {{ variant.size }}
                </Button>
              </div>
            </div>

            <!-- 사이즈 선택 후에만 수량 선택기 표시
            <div
              v-if="!variantSelection.needsVariantSelection.value"
              class="mb-6 animate-fade-in"
            >
              <label class="block text-body font-semibold text-foreground mb-2"
                >수량</label
              >
              <QuantitySelector v-model="variantSelection.quantity.value" />
            </div>
             -->
            <div class="mb-6 flex flex-col gap-3">
              <!-- 옵션 미선택 시 안내 메시지 -->
              <Button
                v-if="
                  variantSelection.needsVariantSelection.value && !isOutOfStock
                "
                disabled
                class="w-full font-bold"
                size="lg"
              >
                옵션을 선택해주세요
              </Button>

              <!-- 품절 시 안내 -->
              <Button
                v-else-if="isOutOfStock"
                disabled
                class="w-full font-bold"
                size="lg"
              >
                SOLD OUT
              </Button>

              <!-- 옵션 선택 완료 시: 장바구니 버튼 (애니메이션 적용) -->
              <Button
                v-if="
                  !variantSelection.needsVariantSelection.value && !isOutOfStock
                "
                @click="handleAddToCart"
                class="w-full bg-primary text-white hover:bg-primary/90 font-bold animate-fade-in"
                size="lg"
              >
                장바구니 담기
              </Button>

              <!-- 간편결제 버튼 (네이버페이 SDK 로드 완료 후 동시 표시) -->
              <div v-if="showPaymentButtons" class="animate-fade-in">
                <!-- 네이버페이 + 카카오페이 2열 레이아웃 -->
                <div
                  v-if="showNaverPayButton"
                  class="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <!-- 네이버페이 SDK 버튼 -->
                  <div
                    id="naverpay-button-container"
                    class="flex items-center justify-center pt-3 min-h-[100px]"
                  ></div>

                  <!-- 카카오페이 (네이버페이 SDK 버튼과 동일 크기) -->
                  <div class="flex items-center justify-center w-full pt-3">
                    <div
                      class="border-t-[2px] border-[#222] bg-white w-full max-w-[285px] h-[88px] flex flex-col items-center"
                      style="font-family: Dotum, 돋움, sans-serif"
                    >
                      <div
                        class="w-[calc(100%-8px)] h-[59px] flex items-center justify-between"
                      >
                        <div class="flex flex-col shrink-0">
                          <span class="text-[11px] font-medium text-[#191919]"
                            ><span
                              style="
                                background: linear-gradient(
                                  to top,
                                  #ffeb00 2px,
                                  transparent 2px
                                );
                              "
                              >kakao<span class="font-bold">pay</span></span
                            >
                            <p />
                            간편하게 주문</span
                          >
                        </div>
                        <button
                          @click="handleKakaoPayBuy"
                          class="flex items-center justify-center gap-px bg-[#FFEB00] hover:bg-[#FEE500] text-[#191919] flex-1 max-w-[191px] sm:max-w-[182px] h-[37px] ml-2 px-3 rounded-[3px] transition-colors"
                        >
                          <img
                            src="@/assets/kakaoSymbol.png"
                            alt="카카오페이"
                            class="h-5 w-auto object-contain"
                          />
                          <span class="text-[12px] font-semibold -translate-x-1"
                            >결제</span
                          >
                        </button>
                      </div>
                      <div
                        class="w-[calc(100%-8px)] h-[28px] flex items-center border-t-[0.1px] border-[#eaeaea]"
                      >
                        <span class="text-[12px] text-[#888]">
                          회원 주문가능
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 카카오페이만 표시 (장바구니 버튼과 동일 크기) -->
                <button
                  v-else
                  @click="handleKakaoPayBuy"
                  class="w-full h-10 flex items-center justify-center gap-1.5 bg-[#FFEB00] hover:bg-[#FEE500] text-[#191919] font-bold rounded-md transition-colors"
                >
                  <img
                    src="@/assets/kakaoSymbol.png"
                    alt="카카오페이"
                    class="h-6 w-auto object-contain"
                  />
                  <span class="text-sm font-bold -translate-x-2">결제</span>
                </button>
              </div>
            </div>

            <Separator></Separator>

            <div class="mt-6">
              <div class="flex border-b border-border">
                <button
                  @click="setTab('description')"
                  :class="[
                    'flex-1 py-3 text-body font-semibold uppercase tracking-wide relative',
                    activeTab === 'description'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:underline',
                  ]"
                >
                  Description
                  <span
                    v-if="activeTab === 'description'"
                    class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                  />
                </button>
                <button
                  @click="setTab('size')"
                  :class="[
                    'flex-1 py-3 text-body font-semibold uppercase tracking-wide relative',
                    activeTab === 'size'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:underline',
                  ]"
                >
                  Size
                  <span
                    v-if="activeTab === 'size'"
                    class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                  />
                </button>
              </div>

              <div class="py-6">
                <div
                  v-show="activeTab === 'description'"
                  class="animate-fade-in max-h-[180px] overflow-y-auto pr-2 scrollbar-thin"
                >
                  <p
                    class="text-muted-foreground whitespace-pre-line leading-relaxed text-caption tracking-wide"
                  >
                    {{ productData.product.value.description }}
                  </p>
                </div>

                <div v-show="activeTab === 'size'" class="animate-fade-in">
                  <div v-if="sizeMeasurements.hasSizeData.value">
                    <div class="overflow-x-auto">
                      <Table class="table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              class="font-medium text-caption text-center"
                            >
                              Size
                            </TableHead>
                            <TableHead
                              v-for="col in sizeMeasurements.activeColumns
                                .value"
                              :key="col.key"
                              class="text-caption text-center"
                            >
                              {{ col.label }}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="(data, idx) in sizeMeasurements.allSizeData
                              .value"
                            :key="idx"
                          >
                            <TableCell
                              class="font-medium text-caption text-center"
                            >
                              {{ data.variantSize }}
                            </TableCell>
                            <TableCell
                              v-for="col in sizeMeasurements.activeColumns
                                .value"
                              :key="col.key"
                              class="text-center text-caption text-muted-foreground"
                            >
                              {{
                                formatSizeValue(
                                  data[col.key as keyof typeof data],
                                )
                              }}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <p
                      class="mt-4 text-caption text-muted-foreground text-right"
                    >
                      * 단위: cm / 측정 방법에 따라 오차가 있을 수 있습니다.
                    </p>
                  </div>
                  <p
                    v-else
                    class="py-10 text-center text-muted-foreground text-body"
                  >
                    등록된 상세 사이즈 정보가 없습니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 상세 이미지: 모바일 3번, 데스크탑 좌측 -->
      <div
        v-if="
          productData.product.value?.detailImages &&
          productData.product.value.detailImages.length > 0
        "
        class="order-3 lg:order-1 space-y-6"
      >
        <div
          v-for="(detailImg, idx) in productData.product.value?.detailImages"
          :key="`detail-${idx}`"
          class="detail-image-wrapper overflow-hidden rounded-lg shadow-sm relative"
          :style="{ animationDelay: `${idx * 0.1}s` }"
        >
          <!-- 로딩 스피너 -->
          <div
            v-if="!detailImagesLoaded[idx]"
            class="absolute inset-0 flex items-center justify-center bg-muted min-h-[400px]"
          >
            <LoadingSpinner variant="spinner" size="lg" />
          </div>

          <!-- 상세 이미지 -->
          <img
            :src="detail(detailImg)"
            class="w-full object-cover"
            :class="{ 'opacity-0': !detailImagesLoaded[idx] }"
            loading="lazy"
            decoding="async"
            crossorigin="anonymous"
            draggable="false"
            :alt="`상품 상세 이미지 ${idx + 1}`"
            @load="handleDetailImageLoad(idx)"
          />
        </div>
      </div>

      <!-- 배송 및 교환/환불 안내 -->
      <div class="order-4 lg:order-2 pt-4">
        <Card>
          <CardContent class="p-5 space-y-4">
            <!-- 배송 안내 -->
            <div class="space-y-2">
              <h3 class="text-body font-semibold text-foreground">배송 안내</h3>
              <ul class="space-y-1.5 text-caption text-muted-foreground">
                <li class="flex gap-2">
                  <span
                    >결제 완료 후
                    <strong class="text-foreground">최대 7일 이내</strong>
                    택배로 배송됩니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >제주 및 도서산간 지역은 별도의 추가 배송비가 발생할 수
                    있으며, 배송일이 1~2일 더 소요될 수 있습니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >배송 조회는 마이페이지 > 주문내역에서 확인
                    가능합니다.</span
                  >
                </li>
              </ul>
            </div>

            <Separator />

            <!-- 교환/환불 안내 -->
            <div class="space-y-2">
              <h3 class="text-body font-semibold text-foreground">
                환불 및 반품 안내
              </h3>
              <ul class="space-y-1.5 text-caption text-muted-foreground">
                <li class="flex gap-2">
                  <span
                    >반품 신청 후, 고객님께서 직접 원하시는 택배사를 이용해
                    상품이 발송된 주소로 상품을 보내주셔야 합니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >상품 수령 후
                    <strong class="text-foreground">7일 이내</strong>
                    신청 및
                    <strong class="text-foreground">14일 이내</strong>
                    상품 도착 시 환불이 가능합니다.</span
                  >
                </li>

                <li class="flex gap-2">
                  <span
                    >고객 단순 변심 시
                    <strong class="text-foreground">선불로 직접 발송</strong
                    >하시거나, 결제 대금에서
                    <strong class="text-foreground">왕복 배송비가 차감</strong>
                    된 후 환불됩니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >상품 불량/오배송 시 반품 배송비는 전액 무료입니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >상품이 훼손된 경우 환불이 불가능합니다. (라벨제거/세탁/착용
                    등)</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >환불은 결제 수단에 따라 즉시~3영업일 이내 완료됩니다.</span
                  >
                </li>
                <li class="flex gap-2">
                  <span
                    >정확한 환불 일정은 결제 수단(네이버/카카오)에 따라 상이할
                    수 있습니다.</span
                  >
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Alert 모달 (성공/오류) -->
    <Alert
      v-if="showAlert"
      :type="alertType"
      :message="alertMessage"
      @close="showAlert = false"
    />

    <!-- 장바구니 이동 확인 다이얼로그 -->
    <Alert
      v-if="showCartConfirm"
      :confirm-mode="true"
      message="장바구니에 담았습니다. 이동하시겠습니까?"
      confirm-text="장바구니로 이동"
      cancel-text="계속 쇼핑하기"
      @confirm="handleGoToCart"
      @cancel="handleContinueShopping"
      @close="showCartConfirm = false"
    />

    <!-- 중복 상품 추가 확인 다이얼로그 -->
    <Alert
      v-if="showDuplicateConfirm"
      :confirm-mode="true"
      :message="`이미 장바구니에 담긴 상품입니다.\n추가로 담으시겠습니까?`"
      confirm-text="추가로 담기"
      cancel-text="취소"
      @confirm="handleConfirmDuplicate"
      @cancel="handleCancelDuplicate"
      @close="handleCancelDuplicate"
    />
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

.detail-image-wrapper {
  animation: slideUp 0.6s ease-out both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Description 스크롤바 스타일 */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground));
}

/* Vue Transition - fade */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
