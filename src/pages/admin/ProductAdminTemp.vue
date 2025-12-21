<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  fetchAdminProductVariants,
  fetchSizeMeasurements,
} from "@/lib/api";

// UI 컴포넌트 및 아이콘
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Edit3,
  Settings,
  Ruler,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// --- 상태 관리 ---
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const variants = ref<any[]>([]);
const measurements = ref<any[]>([]);

const isLoading = ref(false);
const isProductModalOpen = ref(false);
const isVariantModalOpen = ref(false);
const isSizeManagerOpen = ref(false);
const isEditMode = ref(false);
const errorMessage = ref("");

// 페이지네이션
const currentPage = ref(1);
const itemsPerPage = 15;

const currentProduct = ref<any>(null);
const currentVariant = ref<any>(null);

// --- 폼 데이터 초기화 ---
const initialProductForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  price: 0,
  originalPrice: 0,
  stockQuantity: 0,
  categoryId: "",
  imageUrl: "",
  imagesStr: "",
  detailImagesStr: "",
  isAvailable: true,
};
const productForm = reactive({ ...initialProductForm });

const initialVariantForm = {
  id: "",
  size: "",
  color: "",
  sku: "",
  stockQuantity: 0,
  isAvailable: true,
};
const variantForm = reactive({ ...initialVariantForm });

const initialMeasurementForm = {
  id: "",
  totalLength: 0,
  shoulderWidth: 0,
  chestSection: 0,
  sleeveLength: 0,
  waistSection: 0,
  hipSection: 0,
  thighSection: 0,
  displayOrder: 0,
};
const measurementForm = reactive({ ...initialMeasurementForm });

// --- Computed ---
const totalPages = computed(() =>
  Math.ceil(products.value.length / itemsPerPage)
);
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return products.value.slice(start, start + itemsPerPage);
});

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

// --- 데이터 로드 로직 (기존 로직 유지) ---
const loadData = async () => {
  try {
    isLoading.value = true;
    const [productsData, categoriesData] = await Promise.all([
      fetchAdminProducts(),
      fetchCategories(),
    ]);
    products.value = productsData;
    categories.value = categoriesData;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const loadVariants = async (productId: string) => {
  try {
    variants.value = await fetchAdminProductVariants(productId);
  } catch (error) {
    console.error(error);
  }
};

const loadMeasurements = async (variantId: string) => {
  try {
    measurements.value = await fetchSizeMeasurements(variantId);
  } catch (error) {
    console.error(error);
  }
};

// --- [모달] 제어 함수들 ---
const openCreateProductModal = () => {
  isEditMode.value = false;
  Object.assign(productForm, initialProductForm);
  errorMessage.value = "";
  isProductModalOpen.value = true;
};

const openEditProductModal = (product: any) => {
  isEditMode.value = true;
  Object.assign(productForm, {
    ...product,
    price: Number(product.price),
    originalPrice: Number(product.originalPrice || 0),
    imagesStr: product.images ? product.images.join(", ") : "",
    detailImagesStr: product.detailImages
      ? product.detailImages.join(", ")
      : "",
  });
  errorMessage.value = "";
  isProductModalOpen.value = true;
};

const handleSaveProduct = async () => {
  try {
    if (
      !productForm.name ||
      !productForm.price ||
      !productForm.categoryId ||
      !productForm.slug
    ) {
      errorMessage.value = "필수 항목(*)을 모두 입력해주세요.";
      return;
    }
    const payload = {
      ...productForm,
      price: String(productForm.price),
      originalPrice: productForm.originalPrice
        ? String(productForm.originalPrice)
        : null,
      images: productForm.imagesStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      detailImages: productForm.detailImagesStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
    };

    if (isEditMode.value) await updateProduct(productForm.id, payload);
    else await createProduct(payload);

    isProductModalOpen.value = false;
    await loadData();
    alert("저장되었습니다.");
  } catch (error: any) {
    errorMessage.value = error.message;
  }
};

const handleDeleteProduct = async (id: string) => {
  if (confirm("정말 삭제하시겠습니까?")) {
    try {
      await deleteProduct(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }
};

const openVariantManager = async (product: any) => {
  currentProduct.value = product;
  await loadVariants(product.id);
  isEditMode.value = false;
  Object.assign(variantForm, initialVariantForm);
  isVariantModalOpen.value = true;
};

const openSizeManager = async (product: any) => {
  currentProduct.value = product;
  await loadVariants(product.id);
  if (variants.value.length > 0) await selectVariantForSize(variants.value[0]);
  isSizeManagerOpen.value = true;
};

const selectVariantForSize = async (variant: any) => {
  currentVariant.value = variant;
  Object.assign(measurementForm, initialMeasurementForm);
  await loadMeasurements(variant.id);
};

watch(
  [() => variantForm.size, () => variantForm.color],
  ([newSize, newColor]) => {
    if (isEditMode.value || !newSize) return;
    const format = (str: string) =>
      str.trim().replace(/\s+/g, "-").toUpperCase();
    let sku = `${format(currentProduct.value?.name || "")}-${format(newSize)}`;
    if (newColor) sku += `-${format(newColor)}`;
    variantForm.sku = sku;
  }
);

onMounted(async () => {
  if (!authStore.user) await authStore.loadUser();
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  loadData();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-10 border-b pb-5 flex justify-between items-end">
      <div>
        <h3 class="text-h1 text-primary tracking-wider">상품 관리</h3>
        <p class="text-caption text-admin-muted mt-1 font-medium">
          총 <span class="text-admin font-bold">{{ products.length }}</span
          >개의 상품이 등록되어 있습니다.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="loadData"
          class="p-2.5 border rounded-xl text-admin-muted hover:bg-muted transition-all shadow-sm"
        >
          <RotateCcw class="w-5 h-5" />
        </button>
        <button
          @click="openCreateProductModal"
          class="bg-primary text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all text-body font-bold flex items-center gap-2 shadow-md shadow-primary/10"
        >
          <Plus class="w-5 h-5" />
          <span>상품 등록</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-32">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
      ></div>
    </div>

    <Card v-else class="overflow-hidden border-none shadow-lg">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[1000px]">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-5">이미지</th>
                <th class="px-6 py-5 w-1/3">상품명 / 슬러그</th>
                <th class="px-6 py-5 text-center">판매가</th>
                <th class="px-6 py-5 text-center">상태</th>
                <th class="px-6 py-5 text-center">관리 도구</th>
                <th class="px-6 py-5 text-right">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="product in paginatedProducts"
                :key="product.id"
                class="hover:bg-muted/30 transition-colors group"
              >
                <td class="px-6 py-4">
                  <div
                    class="h-14 w-14 bg-muted rounded-xl overflow-hidden border border-border shadow-sm group-hover:scale-105 transition-transform"
                  >
                    <img
                      v-if="product.imageUrl"
                      :src="product.imageUrl"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-admin-muted opacity-20"
                    >
                      <ImageIcon class="w-6 h-6" />
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-body font-bold text-admin">
                    {{ product.name }}
                  </div>
                  <div
                    class="text-tiny text-admin-muted bg-muted inline-block px-1.5 py-0.5 rounded mt-1 font-mono"
                  >
                    {{ product.slug }}
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="text-body font-bold text-primary">
                    {{ Number(product.price).toLocaleString() }}원
                  </div>
                  <div
                    v-if="product.originalPrice"
                    class="text-tiny text-admin-muted line-through opacity-50"
                  >
                    {{ Number(product.originalPrice).toLocaleString() }}원
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    :class="
                      product.isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    "
                    class="px-3 py-1 rounded-full text-tiny font-bold"
                  >
                    {{ product.isAvailable ? "판매중" : "중단" }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-center gap-2">
                    <button
                      @click="openVariantManager(product)"
                      class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-tiny font-bold text-admin hover:bg-muted transition-all shadow-sm"
                    >
                      <Settings class="w-3.5 h-3.5" /> 옵션
                    </button>
                    <button
                      @click="openSizeManager(product)"
                      class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-tiny font-bold text-green-700 hover:bg-green-100 transition-all shadow-sm"
                    >
                      <Ruler class="w-3.5 h-3.5" /> 사이즈
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-1">
                    <button
                      @click="openEditProductModal(product)"
                      class="p-2.5 text-admin-muted hover:text-primary transition-colors"
                    >
                      <Edit3 class="w-4.5 h-4.5" />
                    </button>
                    <button
                      @click="handleDeleteProduct(product.id)"
                      class="p-2.5 text-admin-muted hover:text-destructive transition-colors"
                    >
                      <Trash2 class="w-4.5 h-4.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="totalPages > 1"
          class="p-6 bg-muted/20 flex justify-center gap-2 border-t"
        >
          <button
            v-for="p in totalPages"
            :key="p"
            @click="changePage(p)"
            :class="[
              'h-10 w-10 rounded-xl text-sm font-bold transition-all',
              currentPage === p
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white border text-admin-muted hover:bg-muted',
            ]"
          >
            {{ p }}
          </button>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="isProductModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <div class="flex justify-between items-center mb-8 border-b pb-4">
            <h2 class="text-h2 font-bold text-primary">
              {{ isEditMode ? "상품 정보 수정" : "신규 상품 등록" }}
            </h2>
            <button
              @click="isProductModalOpen = false"
              class="text-admin-muted hover:text-admin transition-colors"
            >
              <Plus class="w-6 h-6 rotate-45" />
            </button>
          </div>

          <form @submit.prevent="handleSaveProduct" class="space-y-6">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >상품명 <span class="text-red-500">*</span></label
                >
                <input
                  v-model="productForm.name"
                  type="text"
                  class="form-input-custom"
                  placeholder="상품명을 입력하세요"
                  required
                />
              </div>
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >Slug (URL용) <span class="text-red-500">*</span></label
                >
                <input
                  v-model="productForm.slug"
                  type="text"
                  class="form-input-custom"
                  placeholder="예: oversize-wool-coat"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >판매가 <span class="text-red-500">*</span></label
                >
                <input
                  v-model.number="productForm.price"
                  type="number"
                  class="form-input-custom"
                  required
                />
              </div>
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >할인 전 가격</label
                >
                <input
                  v-model.number="productForm.originalPrice"
                  type="number"
                  class="form-input-custom"
                />
              </div>
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >카테고리 <span class="text-red-500">*</span></label
                >
                <select
                  v-model="productForm.categoryId"
                  class="form-input-custom"
                  required
                >
                  <option value="" disabled>선택하세요</option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label
                class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >대표 이미지 URL <span class="text-red-500">*</span></label
              >
              <input
                v-model="productForm.imageUrl"
                type="text"
                class="form-input-custom"
                placeholder="https://..."
                required
              />
            </div>

            <div class="grid grid-cols-1 gap-6">
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >추가 이미지 (콤마 구분)</label
                >
                <textarea
                  v-model="productForm.imagesStr"
                  rows="2"
                  class="form-input-custom resize-none"
                  placeholder="url1, url2..."
                ></textarea>
              </div>
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                  >상세 이미지 (콤마 구분)
                  <span class="text-red-500">*</span></label
                >
                <textarea
                  v-model="productForm.detailImagesStr"
                  rows="2"
                  class="form-input-custom resize-none"
                  placeholder="상세 이미지 url"
                  required
                ></textarea>
              </div>
            </div>

            <div>
              <label
                class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >상품 설명 <span class="text-red-500">*</span></label
              >
              <textarea
                v-model="productForm.description"
                rows="3"
                class="form-input-custom resize-none"
                placeholder="상품 상세 설명을 입력하세요"
                required
              ></textarea>
            </div>

            <div
              v-if="errorMessage"
              class="bg-destructive/10 text-destructive text-caption p-4 rounded-xl border border-destructive/20 font-bold"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div class="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                @click="isProductModalOpen = false"
                class="px-6 py-3 border rounded-xl text-admin-muted font-bold hover:bg-muted transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                class="px-10 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 shadow-md shadow-primary/20 transition-all"
              >
                {{ isEditMode ? "수정 내용 저장" : "상품 등록하기" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-input-custom {
  @apply w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm;
}

/* 테이블 스크롤바 디자인 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  @apply bg-transparent;
}
::-webkit-scrollbar-thumb {
  @apply bg-border rounded-full;
}
</style>
