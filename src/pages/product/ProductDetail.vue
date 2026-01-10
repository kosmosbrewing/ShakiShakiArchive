<script setup lang="ts">
// src/pages/ProductDetail.vue
// 상품 상세 페이지

import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
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
import { useOptimizedImage } from "@/composables";
import { formatPrice, formatSizeValue } from "@/lib/formatters";

// 아이콘
import { Heart } from "lucide-vue-next";

// 공통 컴포넌트
import {
  ProductDetailSkeleton,
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
import { Alert, type AlertType, ERROR_MESSAGES } from "@/components/ui/alert";
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

// 상품 ID (UUID)
const productId = computed(() => String(route.params.id));

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

// 위시리스트 토글
const wishlistToggle = useWishlistToggle(productId);

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
    displayAlert("옵션을 선택해주세요.");
    return;
  }

  // 2. 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert("상품 정보를 불러올 수 없습니다.");
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
    displayAlert("재고가 없어 장바구니에 담을 수 없습니다.");
    return;
  }

  // 4. 장바구니 로드 후 기존 상품 체크 및 총 수량 확인
  await cart.loadCart();
  const existing = cart.cartItems.value.find(
    (item) => item.productId === product.id && item.variantId === vid
  );

  // 기존 장바구니 수량 + 새로 담으려는 수량이 재고를 초과하는지 확인
  const existingQty = existing ? existing.quantity : 0;
  const totalQty = existingQty + qty;

  if (totalQty > availableStock) {
    displayAlert(
      `아쉽게도 남은 재고가 부족하여 더 이상 담을 수 없어요. (재고: ${availableStock}개)`
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
    displayAlert("상품 정보를 불러올 수 없습니다.");
    return;
  }

  const vid = variantSelection.selectedVariantId.value || undefined;
  const qty = Number(variantSelection.quantity.value);

  // 수량 검증
  if (!isValidQuantity(qty)) {
    const limits = getQuantityLimits();
    displayAlert(`수량은 ${limits.MIN}~${limits.MAX}개 사이로 입력해주세요.`);
    return;
  }

  // 가격 검증
  const price = Number(product.price);
  if (!isValidPrice(price)) {
    displayAlert("상품 가격 정보가 올바르지 않습니다.");
    return;
  }

  // 상품 ID 검증
  if (!isValidUUID(product.id)) {
    displayAlert("상품 정보가 올바르지 않습니다.");
    return;
  }

  const selectedVariant = vid
    ? productData.variants.value.find((v) => v.id === vid)
    : null;

  // 재고 확인 (중복 추가 확인 후에도 한 번 더 체크)
  const availableStock = selectedVariant ? selectedVariant.stockQuantity : 0;

  if (availableStock === 0) {
    displayAlert("재고가 없어 장바구니에 담을 수 없습니다.");
    return;
  }

  // 장바구니에 이미 있는 수량 확인
  await cart.loadCart();
  const existing = cart.cartItems.value.find(
    (item) => item.productId === product.id && item.variantId === vid
  );
  const existingQty = existing ? existing.quantity : 0;
  const totalQty = existingQty + qty;

  if (totalQty > availableStock) {
    displayAlert(
      `재고가 부족합니다. (재고: ${availableStock}개, 장바구니: ${existingQty}개)`
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
    displayAlert("장바구니 담기에 실패했습니다.");
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

// 바로 구매 (해당 상품만 주문 페이지로 이동)
const handleBuyNow = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    displayAlert("옵션을 선택해주세요.");
    return;
  }

  // 2. 재고 확인
  if (!variantSelection.isStockAvailable.value) {
    displayAlert("재고가 부족합니다.");
    return;
  }

  // 3. 상품 데이터 존재 확인
  const product = productData.product.value;
  if (!product) {
    displayAlert("상품 정보를 불러올 수 없습니다.");
    return;
  }

  // 4. 수량 검증
  const qty = Number(variantSelection.quantity.value);
  if (!isValidQuantity(qty)) {
    const limits = getQuantityLimits();
    displayAlert(`수량은 ${limits.MIN}~${limits.MAX}개 사이로 입력해주세요.`);
    return;
  }

  // 5. 가격 및 상품 ID 검증
  const price = Number(product.price);
  if (!isValidPrice(price) || !isValidUUID(product.id)) {
    displayAlert("상품 정보가 올바르지 않습니다.");
    return;
  }

  // 6. 로그인 체크 (주문 페이지는 로그인 필수)
  requireAuth(() => {
    const vid = variantSelection.selectedVariantId.value || undefined;
    const selectedVariant = vid
      ? productData.variants.value.find((v) => v.id === vid)
      : null;

    // 바로 구매 상품 정보를 세션 스토리지에 저장 (타입 명시)
    const directPurchaseItem: DirectPurchaseData = {
      id: `direct_${Date.now()}`,
      productId: product.id,
      variantId: vid,
      quantity: qty,
      product: {
        id: product.id,
        name: product.name,
        price: price, // 이미 검증된 가격 사용
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
      JSON.stringify(directPurchaseItem)
    );

    router.push("/order?direct=true");
  });
};

// 계속 쇼핑하기
const handleContinueShopping = () => {
  showCartConfirm.value = false;
};

// 데이터 로드
onMounted(async () => {
  await productData.loadProduct(String(productId.value));

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
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
    <!-- 로딩 상태: 상세 페이지 스켈레톤 -->
    <ProductDetailSkeleton
      v-if="productData.loading.value || !productData.product.value"
    />

    <div v-else class="flex flex-col lg:grid lg:grid-cols-2 gap-8">
      <!-- 메인 이미지: 모바일에서만 표시 -->
      <div class="order-1 lg:hidden">
        <Card class="overflow-hidden">
          <div class="aspect-[3/4] bg-muted relative">
            <img
              :src="detail(gallery.currentImage.value)"
              class="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              draggable="false"
              alt="Product Main Image"
            />

            <!-- 모바일 위시리스트 버튼 -->
            <button
              @click.stop="handleToggleWishlist"
              class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md lg:hidden"
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
        </Card>
      </div>

      <!-- 상품 정보 카드: 모바일 2번, 데스크탑 우측 -->
      <div class="order-2 lg:order-2">
        <Card class="sticky top-24">
          <CardContent class="p-6">
            <div class="flex justify-between items-end gap-3 mb-3">
              <div>
                <h3 class="text-body font-medium">
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

              <!-- 데스크톱 위시리스트 버튼 -->
              <button
                @click="handleToggleWishlist"
                class="hidden lg:flex items-center justify-center p-2 rounded-full bg-background border border-border hover:bg-accent transition-all shrink-0 lg:-translate-y-3"
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
              <Button
                v-if="!variantSelection.needsVariantSelection.value"
                @click="handleAddToCart"
                class="w-full text-primary hover:text-primary"
                size="lg"
                variant="outline"
              >
                장바구니 담기
              </Button>
              <Button
                @click="handleBuyNow"
                :disabled="
                  isOutOfStock || variantSelection.needsVariantSelection.value
                "
                class="w-full"
                size="lg"
              >
                {{
                  isOutOfStock
                    ? "SOLD OUT"
                    : variantSelection.needsVariantSelection.value
                    ? "옵션을 선택해주세요"
                    : "바로 구매"
                }}
              </Button>
            </div>

            <Separator></Separator>

            <div class="mt-6">
              <div class="flex border-b border-border">
                <button
                  @click="setTab('description')"
                  :class="[
                    'flex-1 py-3 text-body font-semibold uppercase tracking-wide transition-colors relative',
                    activeTab === 'description'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
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
                    'flex-1 py-3 text-body font-semibold uppercase tracking-wide transition-colors relative',
                    activeTab === 'size'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ]"
                >
                  Size
                  <span
                    v-if="activeTab === 'size'"
                    class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                  />
                </button>
              </div>

              <div class="py-6 min-h-[180px]">
                <div
                  v-show="activeTab === 'description'"
                  class="animate-fade-in max-h-[175px] overflow-y-auto pr-2 scrollbar-thin"
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
                                  data[col.key as keyof typeof data] as number
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
          productData.product.value.detailImages &&
          productData.product.value.detailImages.length > 0
        "
        class="order-3 lg:order-1 space-y-6"
      >
        <div
          v-for="(detailImg, idx) in productData.product.value.detailImages"
          :key="`detail-${idx}`"
          class="detail-image-wrapper overflow-hidden rounded-lg shadow-sm"
          :style="{ animationDelay: `${idx * 0.1}s` }"
        >
          <img
            :src="detail(detailImg)"
            class="w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
            draggable="false"
            :alt="`상품 상세 이미지 ${idx + 1}`"
          />
        </div>
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
</style>
