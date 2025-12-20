<script setup lang="ts">
// src/pages/ProductDetail.vue
// 상품 상세 페이지

import { computed, onMounted } from "vue";
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
import { formatPrice, formatSizeValue } from "@/lib/formatters";

// 아이콘
import { Heart } from "lucide-vue-next";

// 공통 컴포넌트
import { LoadingSpinner, QuantitySelector } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Composables
const productData = useProduct();
const { requireAuth } = useAuthCheck();
const { addItem } = useCart();

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

// 위시리스트 토글 핸들러 (회원 전용 유지)
const handleToggleWishlist = () => {
  requireAuth(async () => {
    const success = await wishlistToggle.toggle();
    if (!success) {
      alert("처리 중 오류가 발생했습니다.");
    }
  });
};

// [수정] 장바구니 담기 (비회원 허용)
const handleAddToCart = async () => {
  // 1. 옵션 선택 필수 체크
  if (variantSelection.needsVariantSelection.value) {
    alert("옵션을 선택해주세요.");
    return;
  }

  // 2. 재고 확인
  if (!variantSelection.isStockAvailable.value) {
    alert("재고가 부족합니다.");
    return;
  }

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
    if (confirm("장바구니에 담았습니다. 장바구니로 이동하시겠습니까?")) {
      router.push("/cart");
    }
  } else {
    alert("장바구니 담기에 실패했습니다.");
  }
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
  <div
    class="w-full px-5 mx-auto py-12 sm:py-16 sm:w-11/12 sm:px-0 max-w-screen-xl top-5 z-40"
  >
    <LoadingSpinner
      v-if="productData.loading.value || !productData.product.value"
    />

    <div v-else class="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start">
      <div class="order-1 lg:col-start-1 lg:row-start-2 w-full space-y-4">
        <Card class="overflow-hidden">
          <div class="aspect-[3/4] bg-muted relative">
            <img
              :src="gallery.currentImage.value"
              class="w-full h-full object-cover"
              alt="Product Main Image"
            />

            <button
              @click.stop="handleToggleWishlist"
              class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm lg:hidden"
              title="위시리스트 담기"
            >
              <Heart
                class="w-6 h-6 transition-colors duration-200"
                :class="
                  wishlistToggle.isWishlisted.value
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400'
                "
              />
            </button>
          </div>
        </Card>

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
            <img :src="img" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>

      <Card
        class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-24 h-fit w-full"
      >
        <CardContent class="p-6">
          <div class="flex justify-between items-start gap-4 mb-2">
            <h1 class="text-heading text-foreground font-bold leading-loose">
              {{ productData.product.value.name }}
            </h1>

            <button
              @click="handleToggleWishlist"
              class="hidden lg:flex items-center justify-center p-2 rounded-full bg-background border border-border shadow-sm hover:bg-accent transition-all group"
              title="위시리스트 담기"
            >
              <Heart
                class="w-6 h-6 transition-colors duration-200"
                :class="
                  wishlistToggle.isWishlisted.value
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                "
              />
            </button>
          </div>

          <div class="flex items-end gap-2 mb-8 -translate-y-3">
            <span class="text-body text-foreground">
              {{ formatPrice(productData.product.value.price) }}
            </span>
            <span
              v-if="productData.product.value.originalPrice"
              class="text-caption text-muted-foreground/50 line-through mb-1"
            >
              {{ formatPrice(productData.product.value.originalPrice) }}
            </span>
          </div>

          <div v-if="productData.variants.value.length > 0" class="mb-8">
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

          <div
            class="mb-8 transition-opacity duration-200"
            :class="{
              'opacity-40 pointer-events-none':
                variantSelection.needsVariantSelection.value,
            }"
          >
            <label class="block text-body font-bold text-foreground mb-3"
              >Quantity</label
            >
            <QuantitySelector
              v-model="variantSelection.quantity.value"
              :disabled="variantSelection.needsVariantSelection.value"
            />
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

          <Separator />

          <div class="mt-4">
            <div class="flex border-b border-border">
              <button
                @click="setTab('description')"
                :class="[
                  'flex-1 py-4 text-body font-semibold uppercase tracking-wide transition-colors relative',
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
                  'flex-1 py-4 text-body font-semibold uppercase tracking-wide transition-colors relative',
                  activeTab === 'size'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
              >
                Size Guide
                <span
                  v-if="activeTab === 'size'"
                  class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                />
              </button>
            </div>

            <div class="py-8 min-h-[200px]">
              <div v-show="activeTab === 'description'" class="animate-fade-in">
                <p
                  class="text-muted-foreground whitespace-pre-line leading-relaxed text-caption"
                >
                  {{ productData.product.value.description }}
                </p>
              </div>

              <div v-show="activeTab === 'size'" class="animate-fade-in">
                <div v-if="sizeMeasurements.hasSizeData.value">
                  <div class="overflow-x-auto">
                    <table
                      class="w-full text-body text-center whitespace-nowrap"
                    >
                      <thead
                        class="bg-muted text-caption text-muted-foreground uppercase"
                      >
                        <tr>
                          <th
                            class="px-4 py-3 text-caption font-semibold border-b border-border bg-muted text-center w-20"
                          >
                            Size
                          </th>
                          <th
                            v-for="col in sizeMeasurements.activeColumns.value"
                            :key="col.key"
                            class="px-4 py-3 text-caption font-semibold border-b border-border"
                          >
                            {{ col.label }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border">
                        <tr
                          v-for="(data, idx) in sizeMeasurements.allSizeData
                            .value"
                          :key="idx"
                        >
                          <td
                            class="px-4 py-3 text-caption bg-muted/50 text-foreground"
                          >
                            {{ data.variantSize }}
                          </td>
                          <td
                            v-for="col in sizeMeasurements.activeColumns.value"
                            :key="col.key"
                            class="px-4 py-3 text-muted-foreground"
                          >
                            {{
                              formatSizeValue(
                                data[col.key as keyof typeof data] as number
                              )
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="mt-4 text-caption text-muted-foreground text-right">
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

      <div
        v-if="
          productData.product.value.detailImages &&
          productData.product.value.detailImages.length > 0
        "
        class="order-3 lg:col-start-1 lg:row-start-1 flex flex-col gap-0 w-full"
      >
        <img
          v-for="(detailImg, idx) in productData.product.value.detailImages"
          :key="`detail-${idx}`"
          :src="detailImg"
          class="w-full object-cover"
          alt="Detail Description"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
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
</style>
