<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  fetchProduct,
  fetchProductVariants,
  addToCart,
  fetchSizeMeasurements,
} from "@/lib/api";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const product = ref<any>(null);
const variants = ref<any[]>([]);
const loading = ref(false);

const currentImage = ref("");
const selectedVariantId = ref<string | number>("");
const quantity = ref(1);
const activeTab = ref("description");
const allSizeData = ref<any[]>([]);

const measurementKeys = [
  { key: "totalLength", label: "총장" },
  { key: "shoulderWidth", label: "어깨너비" },
  { key: "chestSection", label: "가슴단면" },
  { key: "sleeveLength", label: "소매길이" },
  { key: "waistSection", label: "허리단면" },
  { key: "hipSection", label: "엉덩이단면" },
  { key: "thighSection", label: "허벅지단면" },
];

const loadProductData = async () => {
  const productId = route.params.id as string;
  loading.value = true;
  try {
    product.value = await fetchProduct(productId);
    if (product.value.imageUrl) {
      currentImage.value = product.value.imageUrl;
    }

    variants.value = await fetchProductVariants(productId);

    if (variants.value.length > 0) {
      const promises = variants.value.map(async (variant) => {
        try {
          const measurements = await fetchSizeMeasurements(variant.id);
          const measureData =
            Array.isArray(measurements) && measurements.length > 0
              ? measurements[0]
              : null;

          if (measureData) {
            return { variantSize: variant.size, ...measureData };
          }
          return null;
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(promises);
      allSizeData.value = results.filter((item) => item !== null);
    }
  } catch (error) {
    console.error("상품 로드 실패:", error);
    alert("상품 정보를 불러올 수 없습니다.");
    router.go(-1);
  } finally {
    loading.value = false;
  }
};

const activeColumns = computed(() => {
  return measurementKeys.filter((col) => {
    return allSizeData.value.some((data) => Number(data[col.key]) > 0);
  });
});

const galleryImages = computed(() => {
  if (!product.value) return [];
  const list = [];
  if (product.value.imageUrl) list.push(product.value.imageUrl);
  if (product.value.images && Array.isArray(product.value.images)) {
    list.push(...product.value.images);
  }
  return list;
});

const selectVariant = (variant: any) => {
  if (variant.stockQuantity <= 0 || !variant.isAvailable) return;
  selectedVariantId.value = variant.id;
  quantity.value = 1;
};

const handleAddToCart = async () => {
  if (!authStore.isAuthenticated) {
    if (confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
      router.push("/login");
    }
    return;
  }

  if (variants.value.length > 0 && !selectedVariantId.value) {
    alert("옵션을 선택해주세요.");
    return;
  }

  const selectedVariant = variants.value.find(
    (v) => v.id === selectedVariantId.value
  );
  if (selectedVariant && selectedVariant.stockQuantity < quantity.value) {
    alert("재고가 부족합니다.");
    return;
  }

  try {
    await addToCart({
      productId: product.value.id,
      variantId: selectedVariantId.value || undefined,
      quantity: quantity.value,
    });

    if (confirm("장바구니에 담았습니다. 장바구니로 이동하시겠습니까?")) {
      router.push("/cart");
    }
  } catch (error) {
    console.error(error);
    alert("장바구니 담기 실패");
  }
};

const formatSize = (value: any) => {
  return value && Number(value) > 0 ? Number(value) : "-";
};

onMounted(() => {
  loadProductData();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div v-if="loading || !product" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"
      ></div>
    </div>

    <div v-else class="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start">
      <div class="order-1 lg:col-start-1 lg:row-start-2 w-full space-y-4">
        <div class="aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden border">
          <img
            :src="currentImage"
            class="w-full h-full object-cover"
            alt="Product Main Image"
          />
        </div>

        <div
          v-if="galleryImages.length > 1"
          class="flex gap-2 overflow-x-auto pb-2"
        >
          <button
            v-for="(img, idx) in galleryImages"
            :key="`thumb-${idx}`"
            @click="currentImage = img"
            :class="[
              'w-20 h-20 flex-shrink-0 rounded border overflow-hidden transition',
              currentImage === img
                ? 'ring-2 ring-black'
                : 'opacity-70 hover:opacity-100',
            ]"
          >
            <img :src="img" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>

      <div
        class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-24 h-fit bg-white p-2 w-full"
      >
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          {{ product.name }}
        </h1>
        <div class="flex items-end gap-2 mb-8">
          <span class="text-2xl font-bold text-gray-900"
            >{{ Number(product.price).toLocaleString() }}원</span
          >
          <span
            v-if="product.originalPrice"
            class="text-lg text-gray-400 line-through mb-1"
          >
            {{ Number(product.originalPrice).toLocaleString() }}원
          </span>
        </div>

        <div v-if="variants.length > 0" class="mb-8">
          <label class="block text-sm font-bold text-gray-900 mb-3">Size</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="variant in variants"
              :key="variant.id"
              @click="selectVariant(variant)"
              :disabled="variant.stockQuantity <= 0 || !variant.isAvailable"
              :class="[
                'px-4 py-2 border text-sm font-medium transition-all min-w-[3rem]',
                selectedVariantId === variant.id
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400',
                variant.stockQuantity <= 0 || !variant.isAvailable
                  ? 'opacity-40 cursor-not-allowed bg-gray-50 decoration-slice line-through'
                  : '',
              ]"
            >
              {{ variant.size }}
            </button>
          </div>
        </div>

        <div
          class="mb-8 transition-opacity duration-200"
          :class="{
            'opacity-40 pointer-events-none':
              variants.length > 0 && !selectedVariantId,
          }"
        >
          <label class="block text-sm font-bold text-gray-900 mb-3"
            >Quantity</label
          >
          <div class="flex items-center border border-gray-300 w-32 h-10">
            <button
              @click="quantity > 1 && quantity--"
              class="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition"
            >
              -
            </button>
            <input
              type="text"
              v-model="quantity"
              readonly
              class="w-full h-full text-center border-none focus:ring-0 bg-transparent text-sm font-medium"
            />
            <button
              @click="quantity++"
              class="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition"
            >
              +
            </button>
          </div>
        </div>

        <div class="mb-12">
          <button
            @click="handleAddToCart"
            :disabled="variants.length > 0 && !selectedVariantId"
            :class="[
              'w-full py-4 font-bold text-lg transition-all duration-200',
              variants.length > 0 && !selectedVariantId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 active:scale-[0.99]',
            ]"
          >
            {{
              variants.length > 0 && !selectedVariantId
                ? "옵션을 선택해주세요"
                : "장바구니 담기"
            }}
          </button>
        </div>

        <div class="border-t border-gray-200">
          <div class="flex border-b border-gray-200">
            <button
              @click="activeTab = 'description'"
              :class="[
                'flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative',
                activeTab === 'description'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600',
              ]"
            >
              Description
              <span
                v-if="activeTab === 'description'"
                class="absolute bottom-0 left-0 w-full h-0.5 bg-black"
              ></span>
            </button>
            <button
              @click="activeTab = 'size'"
              :class="[
                'flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors relative',
                activeTab === 'size'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600',
              ]"
            >
              Size Guide
              <span
                v-if="activeTab === 'size'"
                class="absolute bottom-0 left-0 w-full h-0.5 bg-black"
              ></span>
            </button>
          </div>

          <div class="py-8 min-h-[200px]">
            <div v-show="activeTab === 'description'" class="animate-fade-in">
              <p
                class="text-gray-600 whitespace-pre-line leading-relaxed text-sm"
              >
                {{ product.description }}
              </p>
            </div>

            <div v-show="activeTab === 'size'" class="animate-fade-in">
              <div v-if="allSizeData.length > 0 && activeColumns.length > 0">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm text-center whitespace-nowrap">
                    <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th
                          class="px-4 py-3 font-bold border-b bg-gray-100 text-left w-20"
                        >
                          Size
                        </th>
                        <th
                          v-for="col in activeColumns"
                          :key="col.key"
                          class="px-4 py-3 font-medium border-b"
                        >
                          {{ col.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr v-for="(data, idx) in allSizeData" :key="idx">
                        <td class="px-4 py-3 font-bold text-left bg-gray-50/50">
                          {{ data.variantSize }}
                        </td>
                        <td
                          v-for="col in activeColumns"
                          :key="col.key"
                          class="px-4 py-3 text-gray-600"
                        >
                          {{ formatSize(data[col.key]) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="mt-4 text-xs text-gray-400 text-right">
                  * 단위: cm / 측정 방법에 따라 오차가 있을 수 있습니다.
                </p>
              </div>
              <div
                v-else
                class="py-10 text-center text-gray-400 text-sm bg-gray-50 rounded"
              >
                등록된 상세 사이즈 정보가 없습니다.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="product.detailImages && product.detailImages.length > 0"
        class="order-3 lg:col-start-1 lg:row-start-1 flex flex-col gap-0 w-full"
      >
        <img
          v-for="(detailImg, idx) in product.detailImages"
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
