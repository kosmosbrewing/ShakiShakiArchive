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
import { ProductDetailSkeleton, QuantitySelector } from "@/components/common";

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

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Composables
const productData = useProduct();
const { requireAuth } = useAuthCheck();
const { addItem } = useCart();
const { detail, thumbnail } = useOptimizedImage();

// 상품 ID (UUID)
const productId = computed(() => String(route.params.id));

// variant 선택
const variantSelection = useVariantSelection(productData.variants);

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
      alertMessage.value = ERROR_MESSAGES.serverError;
      alertType.value = "error";
      showAlert.value = true;
    }
  });
};

// [수정] 장바구니 담기 (비회원 허용)
const handleAddToCart = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    alertMessage.value = "옵션을 선택해주세요.";
    alertType.value = "error";
    showAlert.value = true;
    return;
  }

  // 2. 재고 확인
  if (!variantSelection.isStockAvailable.value) {
    alertMessage.value = "재고가 부족합니다.";
    alertType.value = "error";
    showAlert.value = true;
    return;
  }

  // 1) 상품 ID (UUID)
  const pid = productData.product.value!.id;

  // 2) 옵션 ID 변환 (serial)
  const rawVariantId = variantSelection.selectedVariantId.value;
  const vid = rawVariantId ? Number(rawVariantId) : undefined;

  // 3. 장바구니 로드 후 기존 상품 체크
  await cart.loadCart();
  const existing = cart.cartItems.value.find(
    (item) => item.productId === pid && item.variantId === vid
  );

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
  // 1) 상품 ID (UUID)
  const pid = productData.product.value!.id;

  // 2) 옵션 ID 변환 (serial)
  const rawVariantId = variantSelection.selectedVariantId.value;
  const vid = rawVariantId ? Number(rawVariantId) : undefined;

  // 3) 수량 변환
  const qty = Number(variantSelection.quantity.value);

  // [중요] 비회원 장바구니를 위한 상품 정보 구성
  // useCart.ts의 addItem에서 로컬 저장 시 이 정보를 사용함
  const productInfo = {
    id: pid,
    name: productData.product.value!.name,
    price: productData.product.value!.price,
    imageUrl: productData.product.value!.imageUrl,
    variant: vid ? productData.variants.value.find((v) => v.id === vid) : null,
  };

  // API 호출 (비회원은 내부적으로 localStorage 사용)
  const success = await addItem({
    productId: pid, // UUID
    variantId: vid,
    quantity: qty,
    productInfo: productInfo, // [추가] 상품 상세 정보 전달
  });

  if (success) {
    // 장바구니 이동 확인 다이얼로그 표시
    showCartConfirm.value = true;
  } else {
    alertMessage.value = "장바구니 담기에 실패했습니다.";
    alertType.value = "error";
    showAlert.value = true;
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

    <div v-else class="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <!-- 좌측: 이미지 갤러리 -->
      <div class="lg:col-span-3 space-y-4">
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

        <!-- 썸네일 갤러리 -->
        <div
          v-if="productData.galleryImages.value.length > 1"
          class="flex gap-2 overflow-x-auto pb-2"
        >
          <button
            v-for="(img, idx) in productData.galleryImages.value"
            :key="`thumb-${idx}`"
            @click="gallery.setCurrentImage(img)"
            :class="[
              'w-20 h-20 flex-shrink-0 rounded border border-border overflow-hidden transition',
              gallery.currentImage.value === img
                ? 'ring-2 ring-primary'
                : 'opacity-70 hover:opacity-100',
            ]"
          >
            <img
              :src="thumbnail(img)"
              class="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>
        </div>

        <!-- 상세 이미지 -->
        <div
          v-if="
            productData.product.value.detailImages &&
            productData.product.value.detailImages.length > 0
          "
          class="space-y-6 mt-6"
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

      <!-- 우측: 상품 정보 카드 -->
      <div class="lg:col-span-2">
        <Card class="sticky top-24">
          <CardContent class="p-6">
            <div class="flex justify-between items-start gap-3 mb-2">
              <h1 class="text-heading text-foreground font-bold">
                {{ productData.product.value.name }}
              </h1>

              <!-- 데스크톱 위시리스트 버튼 -->
              <button
                @click="handleToggleWishlist"
                class="hidden lg:flex items-center justify-center p-2 rounded-full bg-background border border-border hover:bg-accent transition-all shrink-0"
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

            <div class="flex items-baseline gap-2 mb-4 -translate-y-4">
              <span class="text-body text-foreground">
                {{ formatPrice(productData.product.value.price) }}
              </span>
              <span
                v-if="productData.product.value.originalPrice"
                class="text-caption text-muted-foreground/70 line-through -translate-y-1"
              >
                {{ formatPrice(productData.product.value.originalPrice) }}
              </span>
            </div>

            <Separator class="mb-2 -translate-y-4" />

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

            <!-- 사이즈 선택 후에만 수량 선택기 표시 -->
            <div
              v-if="!variantSelection.needsVariantSelection.value"
              class="mb-6 animate-fade-in"
            >
              <label class="block text-body font-semibold text-foreground mb-2"
                >수량</label
              >
              <QuantitySelector v-model="variantSelection.quantity.value" />
            </div>

            <div class="mb-6">
              <Button
                @click="handleAddToCart"
                :disabled="variantSelection.needsVariantSelection.value"
                class="w-full"
                size="lg"
              >
                {{
                  variantSelection.needsVariantSelection.value
                    ? "옵션을 선택해주세요"
                    : "장바구니 담기"
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
                  class="animate-fade-in"
                >
                  <p
                    class="text-muted-foreground whitespace-pre-line leading-relaxed text-caption"
                  >
                    {{ productData.product.value.description }}
                  </p>
                </div>

                <div v-show="activeTab === 'size'" class="animate-fade-in">
                  <div v-if="sizeMeasurements.hasSizeData.value">
                    <div class="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead class="w-20 text-center">
                              Size
                            </TableHead>
                            <TableHead
                              v-for="col in sizeMeasurements.activeColumns
                                .value"
                              :key="col.key"
                              class="text-center"
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
                            <TableCell class="font-medium text-center">
                              {{ data.variantSize }}
                            </TableCell>
                            <TableCell
                              v-for="col in sizeMeasurements.activeColumns
                                .value"
                              :key="col.key"
                              class="text-center text-muted-foreground"
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
                  <Card v-else class="py-10 text-center">
                    <CardContent>
                      <p class="text-muted-foreground text-body">
                        등록된 상세 사이즈 정보가 없습니다.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
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
</style>
