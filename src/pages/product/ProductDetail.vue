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

// 상품 ID
const productId = computed(() => Number(route.params.id));

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

// 위시리스트 토글 핸들러
const handleToggleWishlist = () => {
  requireAuth(async () => {
    const success = await wishlistToggle.toggle();
    if (!success) {
      alert("처리 중 오류가 발생했습니다.");
    }
  });
};

// 장바구니 담기
const handleAddToCart = () => {
  requireAuth(async () => {
    // 옵션 선택 필요 확인
    if (variantSelection.needsVariantSelection.value) {
      alert("옵션을 선택해주세요.");
      return;
    }

    // 재고 확인
    if (!variantSelection.isStockAvailable.value) {
      alert("재고가 부족합니다.");
      return;
    }

    const success = await addItem({
      productId: productData.product.value!.id,
      variantId: variantSelection.selectedVariantId.value as number | undefined,
      quantity: variantSelection.quantity.value,
    });

    if (success) {
      if (confirm("장바구니에 담았습니다. 장바구니로 이동하시겠습니까?")) {
        router.push("/cart");
      }
    } else {
      alert("장바구니 담기 실패");
    }
  });
};

// 데이터 로드
onMounted(async () => {
  await productData.loadProduct(String(productId.value));

  // 이미지 초기화
  if (productData.product.value?.imageUrl) {
    gallery.initializeImage(productData.product.value.imageUrl);
  }

  // 위시리스트 상태 확인
  if (authStore.isAuthenticated) {
    await wishlistToggle.checkStatus();
  }

  // 사이즈 정보 로드
  await sizeMeasurements.loadSizeMeasurements();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="productData.loading.value || !productData.product.value" />

    <div v-else class="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start">
      <!-- 상품 이미지 갤러리 -->
      <div class="order-1 lg:col-start-1 lg:row-start-2 w-full space-y-4">
        <Card class="overflow-hidden">
          <div class="aspect-[3/4] bg-muted relative">
            <img
              :src="gallery.currentImage.value"
              class="w-full h-full object-cover"
              alt="Product Main Image"
            />

            <!-- 모바일 위시리스트 버튼 -->
            <button
              @click.stop="handleToggleWishlist"
              class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm lg:hidden"
              title="위시리스트 담기"
            >
              <Heart
                class="w-6 h-6 transition-colors duration-200"
                :class="wishlistToggle.isWishlisted.value ? 'fill-red-500 text-red-500' : 'text-gray-400'"
              />
            </button>
          </div>
        </Card>

        <!-- 썸네일 갤러리 -->
        <div v-if="productData.galleryImages.value.length > 1" class="flex gap-2 overflow-x-auto pb-2">
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

      <!-- 상품 정보 카드 -->
      <Card class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-24 h-fit w-full">
        <CardContent class="p-6">
          <!-- 상품명 + 위시리스트 버튼 -->
          <div class="flex justify-between items-start gap-4 mb-2">
            <h1 class="text-3xl font-bold text-foreground">
              {{ productData.product.value.name }}
            </h1>

            <!-- 데스크탑 위시리스트 버튼 -->
            <button
              @click="handleToggleWishlist"
              class="hidden lg:flex items-center justify-center p-2 rounded-full bg-background border border-border shadow-sm hover:bg-accent transition-all group"
              title="위시리스트 담기"
            >
              <Heart
                class="w-6 h-6 transition-colors duration-200"
                :class="wishlistToggle.isWishlisted.value ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400'"
              />
            </button>
          </div>

          <!-- 가격 -->
          <div class="flex items-end gap-2 mb-8">
            <span class="text-2xl font-bold text-foreground">
              {{ formatPrice(productData.product.value.price) }}
            </span>
            <span
              v-if="productData.product.value.originalPrice"
              class="text-lg text-muted-foreground line-through mb-1"
            >
              {{ formatPrice(productData.product.value.originalPrice) }}
            </span>
          </div>

          <!-- 사이즈 선택 -->
          <div v-if="productData.variants.value.length > 0" class="mb-8">
            <label class="block text-sm font-bold text-foreground mb-3">Size</label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="variant in productData.variants.value"
                :key="variant.id"
                @click="variantSelection.selectVariant(variant)"
                :disabled="variant.stockQuantity <= 0 || !variant.isAvailable"
                :variant="variantSelection.selectedVariantId.value === variant.id ? 'default' : 'outline'"
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

          <!-- 수량 선택 -->
          <div
            class="mb-8 transition-opacity duration-200"
            :class="{ 'opacity-40 pointer-events-none': variantSelection.needsVariantSelection.value }"
          >
            <label class="block text-sm font-bold text-foreground mb-3">Quantity</label>
            <QuantitySelector
              v-model="variantSelection.quantity.value"
              :disabled="variantSelection.needsVariantSelection.value"
            />
          </div>

          <!-- 장바구니 버튼 -->
          <div class="mb-8">
            <Button
              @click="handleAddToCart"
              :disabled="variantSelection.needsVariantSelection.value"
              class="w-full h-14 text-lg font-bold"
              size="lg"
            >
              {{ variantSelection.needsVariantSelection.value ? "옵션을 선택해주세요" : "장바구니 담기" }}
            </Button>
          </div>

          <Separator />

          <!-- 탭 메뉴 -->
          <div class="mt-6">
            <div class="flex border-b border-border">
              <button
                @click="setTab('description')"
                :class="[
                  'flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative',
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
                  'flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative',
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

            <!-- 탭 콘텐츠 -->
            <div class="py-8 min-h-[200px]">
              <!-- Description 탭 -->
              <div v-show="activeTab === 'description'" class="animate-fade-in">
                <p class="text-muted-foreground whitespace-pre-line leading-relaxed text-sm">
                  {{ productData.product.value.description }}
                </p>
              </div>

              <!-- Size Guide 탭 -->
              <div v-show="activeTab === 'size'" class="animate-fade-in">
                <div v-if="sizeMeasurements.hasSizeData.value">
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm text-center whitespace-nowrap">
                      <thead class="bg-muted text-xs text-muted-foreground uppercase">
                        <tr>
                          <th class="px-4 py-3 font-bold border-b border-border bg-muted text-left w-20">
                            Size
                          </th>
                          <th
                            v-for="col in sizeMeasurements.activeColumns.value"
                            :key="col.key"
                            class="px-4 py-3 font-medium border-b border-border"
                          >
                            {{ col.label }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border">
                        <tr v-for="(data, idx) in sizeMeasurements.allSizeData.value" :key="idx">
                          <td class="px-4 py-3 font-bold text-left bg-muted/50 text-foreground">
                            {{ data.variantSize }}
                          </td>
                          <td
                            v-for="col in sizeMeasurements.activeColumns.value"
                            :key="col.key"
                            class="px-4 py-3 text-muted-foreground"
                          >
                            {{ formatSizeValue(data[col.key as keyof typeof data] as number) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="mt-4 text-xs text-muted-foreground text-right">
                    * 단위: cm / 측정 방법에 따라 오차가 있을 수 있습니다.
                  </p>
                </div>
                <Card v-else class="py-10 text-center">
                  <CardContent>
                    <p class="text-muted-foreground text-sm">
                      등록된 상세 사이즈 정보가 없습니다.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 상품 상세 이미지 -->
      <div
        v-if="productData.product.value.detailImages && productData.product.value.detailImages.length > 0"
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
