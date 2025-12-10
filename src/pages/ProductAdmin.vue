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
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  fetchSizeMeasurements,
  createSizeMeasurement,
  updateSizeMeasurement,
  deleteSizeMeasurement,
} from "@/lib/api";

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
const isSizeManagerOpen = ref(false); // [변경] 사이즈 관리 모달 상태 독립
const isEditMode = ref(false);
const isMeasurementEditMode = ref(false);
const errorMessage = ref("");

// 페이지네이션
const currentPage = ref(1);
const itemsPerPage = 20;

const currentProduct = ref<any>(null);
const currentVariant = ref<any>(null); // 현재 선택된 변종 (사이즈 관리용)

// --- 폼 데이터 (상품) ---
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

// --- 폼 데이터 (변종) ---
const initialVariantForm = {
  id: "",
  size: "",
  color: "",
  sku: "",
  stockQuantity: 0,
  isAvailable: true,
};
const variantForm = reactive({ ...initialVariantForm });

// --- 폼 데이터 (사이즈 측정) ---
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

// --- 데이터 로드 ---
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

// --- [모달 1] 상품 관리 로직 ---
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
    errorMessage.value = "";
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
      name: productForm.name,
      slug: productForm.slug,
      description: productForm.description,
      price: String(productForm.price),
      originalPrice: productForm.originalPrice
        ? String(productForm.originalPrice)
        : null,
      stockQuantity: productForm.stockQuantity,
      categoryId: productForm.categoryId,
      imageUrl: productForm.imageUrl,
      images: productForm.imagesStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      detailImages: productForm.detailImagesStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      isAvailable: productForm.isAvailable,
    };

    if (isEditMode.value) {
      await updateProduct(productForm.id, payload);
      alert("상품이 수정되었습니다.");
    } else {
      await createProduct(payload);
      alert("상품이 등록되었습니다.");
    }
    isProductModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    errorMessage.value = error.message || "저장에 실패했습니다.";
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

// --- [모달 2] 변종(옵션) 관리 로직 ---
const openVariantManager = async (product: any) => {
  currentProduct.value = product;
  await loadVariants(product.id);
  isEditMode.value = false;
  Object.assign(variantForm, initialVariantForm);
  isVariantModalOpen.value = true;
};

const handleEditVariant = (variant: any) => {
  isEditMode.value = true;
  Object.assign(variantForm, { ...variant });
};
const handleSaveVariant = async () => {
  if (!currentProduct.value) return;

  try {
    if (!variantForm.size || !variantForm.sku) {
      alert("사이즈와 SKU는 필수입니다.");
      return;
    }

    const payload = {
      size: variantForm.size,
      color: variantForm.color,
      sku: variantForm.sku,
      stockQuantity: variantForm.stockQuantity,
      isAvailable: variantForm.isAvailable,
    };

    if (isEditMode.value) {
      await updateProductVariant(
        currentProduct.value.id,
        variantForm.id,
        payload
      );
    } else {
      await createProductVariant(currentProduct.value.id, payload);
    }

    // 목록 갱신
    await loadVariants(currentProduct.value.id);

    // 폼 초기화
    Object.assign(variantForm, initialVariantForm);
    isEditMode.value = false;
  } catch (error: any) {
    console.error(error);
    alert("저장 실패: " + (error.message || "알 수 없는 오류"));
  }
};

// 2. 삭제 함수 수정
const handleDeleteVariant = async (variantId: string) => {
  if (!currentProduct.value) return; // 안전장치 추가

  if (confirm("이 옵션을 삭제하시겠습니까?")) {
    try {
      await deleteProductVariant(currentProduct.value.id, variantId);

      await loadVariants(currentProduct.value.id);
    } catch (e: any) {
      alert(e.message);
    }
  }
};
// --- [모달 3] 사이즈 관리 로직 (신규) ---
const openSizeManager = async (product: any) => {
  currentProduct.value = product;

  // 1. 상품의 모든 변종 로드
  await loadVariants(product.id);

  // 2. 초기화
  currentVariant.value = null;
  measurements.value = [];
  isMeasurementEditMode.value = false;
  Object.assign(measurementForm, initialMeasurementForm);

  // 3. 첫 번째 변종이 있다면 자동 선택
  if (variants.value.length > 0) {
    await selectVariantForSize(variants.value[0]);
  }

  isSizeManagerOpen.value = true;
};

// 탭 클릭 시 실행
const selectVariantForSize = async (variant: any) => {
  currentVariant.value = variant;
  // 폼 초기화
  isMeasurementEditMode.value = false;
  Object.assign(measurementForm, initialMeasurementForm);
  // 데이터 로드
  await loadMeasurements(variant.id);
};

const handleEditMeasurement = (measurement: any) => {
  isMeasurementEditMode.value = true;
  Object.assign(measurementForm, {
    ...measurement,
    totalLength: Number(measurement.totalLength),
    shoulderWidth: Number(measurement.shoulderWidth),
    chestSection: Number(measurement.chestSection),
    sleeveLength: Number(measurement.sleeveLength),
    waistSection: Number(measurement.waistSection),
    hipSection: Number(measurement.hipSection),
    thighSection: Number(measurement.thighSection),
  });
};

const handleSaveMeasurement = async () => {
  if (!currentVariant.value) return;
  try {
    const payload = {
      totalLength: String(measurementForm.totalLength),
      shoulderWidth: String(measurementForm.shoulderWidth),
      chestSection: String(measurementForm.chestSection),
      sleeveLength: String(measurementForm.sleeveLength),
      waistSection: String(measurementForm.waistSection),
      hipSection: String(measurementForm.hipSection),
      thighSection: String(measurementForm.thighSection),
      displayOrder: measurementForm.displayOrder,
    };

    if (isMeasurementEditMode.value) {
      await updateSizeMeasurement(measurementForm.id, payload);
      alert("수정되었습니다.");
    } else {
      await createSizeMeasurement(currentVariant.value.id, payload);
      alert("등록되었습니다.");
    }

    await loadMeasurements(currentVariant.value.id);
    Object.assign(measurementForm, initialMeasurementForm);
    isMeasurementEditMode.value = false;
  } catch (error: any) {
    alert("저장 실패: " + error.message);
  }
};

const handleDeleteMeasurement = async (id: string) => {
  if (confirm("삭제하시겠습니까?")) {
    try {
      await deleteSizeMeasurement(id);
      await loadMeasurements(currentVariant.value.id);
    } catch (e: any) {
      alert(e.message);
    }
  }
};

watch(
  // 감시 대상: 사이즈와 색상 입력값
  [() => variantForm.size, () => variantForm.color],
  ([newSize, newColor]) => {
    // 수정 모드일 때는 기존 SKU를 덮어쓰지 않도록 방지 (원하면 제거 가능)
    if (isEditMode.value) return;

    // 현재 선택된 상품명 가져오기
    const productName = currentProduct.value?.name || "";

    // 포맷팅 함수: 공백을 하이픈(-)으로 바꾸고 대문자로 변환
    const format = (str: string) =>
      str.trim().replace(/\s+/g, "-").toUpperCase();

    // 사이즈가 입력되었을 때만 생성 시작
    if (newSize) {
      let autoSku = `${format(productName)}-${format(newSize)}`;

      // 색상이 있으면 뒤에 붙임
      if (newColor) {
        autoSku += `-${format(newColor)}`;
      }

      variantForm.sku = autoSku;
    }
  }
);

// --- 초기화 ---
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
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">상품 관리</h1>
        <p class="text-sm text-gray-500 mt-1">
          총 <span class="text-blue-600 font-bold">{{ products.length }}</span
          >개 상품
        </p>
      </div>
      <button
        @click="openCreateProductModal"
        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        + 새 상품 등록
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
      ></div>
    </div>

    <div
      v-else
      class="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[600px]"
    >
      <div class="flex-grow overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[800px]">
          <thead class="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th class="px-6 py-3">이미지</th>
              <th class="px-6 py-3 w-1/3">상품명 / 슬러그</th>
              <th class="px-6 py-3">가격</th>
              <th class="px-6 py-3">상태</th>
              <th class="px-6 py-3 text-right">옵션/재고</th>
              <th class="px-6 py-3 text-right">사이즈</th>
              <th class="px-6 py-3 text-right">수정/삭제</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="product in paginatedProducts"
              :key="product.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4">
                <div
                  class="h-12 w-12 bg-gray-100 rounded border overflow-hidden"
                >
                  <img
                    v-if="product.imageUrl"
                    :src="product.imageUrl"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400 text-xs"
                  >
                    No
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ product.name }}</div>
                <div class="text-xs text-gray-500">{{ product.slug }}</div>
              </td>
              <td class="px-6 py-4 text-sm">
                <div class="font-medium">
                  {{ Number(product.price).toLocaleString() }}원
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="
                    product.isAvailable
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  "
                  class="px-2 py-1 rounded-full text-xs font-bold"
                >
                  {{ product.isAvailable ? "판매중" : "중지" }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="openVariantManager(product)"
                  class="bg-white border text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-50 font-medium"
                >
                  📦 관리
                </button>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="openSizeManager(product)"
                  class="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded text-xs hover:bg-green-100 font-medium"
                >
                  📏 사이즈
                </button>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <button
                  @click="openEditProductModal(product)"
                  class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  수정
                </button>
                <button
                  @click="handleDeleteProduct(product.id)"
                  class="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  삭제
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="totalPages > 1"
        class="border-t px-6 py-4 bg-gray-50 flex justify-center gap-2"
      >
        <button
          v-for="p in totalPages"
          :key="p"
          @click="changePage(p)"
          :class="[
            'px-3 py-1 border rounded text-sm',
            currentPage === p ? 'bg-blue-600 text-white' : 'bg-white',
          ]"
        >
          {{ p }}
        </button>
      </div>
    </div>

    <div
      v-if="isProductModalOpen"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div class="p-6">
          <h2 class="text-xl font-bold mb-6 pb-2 border-b">
            {{ isEditMode ? "상품 수정" : "새 상품 등록" }}
          </h2>
          <form @submit.prevent="handleSaveProduct" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">상품명 *</label>
                <input
                  v-model="productForm.name"
                  type="text"
                  class="w-full border rounded p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1">슬러그 *</label>
                <input
                  v-model="productForm.slug"
                  type="text"
                  class="w-full border rounded p-2 text-sm"
                  required
                />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1">판매가 *</label>
                <input
                  v-model.number="productForm.price"
                  type="number"
                  class="w-full border rounded p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >원래 가격</label
                >
                <input
                  v-model.number="productForm.originalPrice"
                  type="number"
                  class="w-full border rounded p-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1"
                  >카테고리 *</label
                >
                <select
                  v-model="productForm.categoryId"
                  class="w-full border rounded p-2 text-sm"
                  required
                >
                  <option value="" disabled>선택</option>
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
              <label class="block text-sm font-semibold mb-1"
                >대표 이미지 URL</label
              >
              <input
                v-model="productForm.imageUrl"
                type="text"
                class="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >추가 이미지 (콤마로 구분)</label
              >
              <input
                v-model="productForm.imagesStr"
                type="text"
                class="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >상세 이미지 (콤마로 구분)</label
              >
              <input
                v-model="productForm.detailImagesStr"
                type="text"
                class="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">설명</label>
              <textarea
                v-model="productForm.description"
                class="w-full border rounded p-2 text-sm"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                @click="isProductModalOpen = false"
                class="px-4 py-2 border rounded text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="isVariantModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-6 border-b pb-2">
            <h2 class="text-xl font-bold">
              옵션 관리: {{ currentProduct?.name }}
            </h2>
            <button
              @click="isVariantModalOpen = false"
              class="text-gray-500 hover:text-black"
            >
              ✕ 닫기
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="bg-gray-50 p-4 rounded-lg h-fit">
              <h3 class="font-bold mb-4 text-sm uppercase text-gray-500">
                {{ isEditMode ? "옵션 수정" : "새 옵션 추가" }}
              </h3>
              <form @submit.prevent="handleSaveVariant" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold mb-1">사이즈 *</label>
                  <input
                    v-model="variantForm.size"
                    type="text"
                    class="w-full border rounded p-2 text-sm"
                    placeholder="예: S"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold mb-1">색상</label>
                  <input
                    v-model="variantForm.color"
                    type="text"
                    class="w-full border rounded p-2 text-sm"
                    placeholder="예: Red"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold mb-1">SKU *</label>
                  <input
                    v-model="variantForm.sku"
                    type="text"
                    class="w-full border rounded p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold mb-1">재고</label>
                  <input
                    v-model.number="variantForm.stockQuantity"
                    type="number"
                    class="w-full border rounded p-2 text-sm"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <input v-model="variantForm.isAvailable" type="checkbox" />
                  <span class="text-sm">판매 가능</span>
                </div>
                <button
                  type="submit"
                  class="w-full bg-gray-900 text-white py-2 rounded text-sm font-bold"
                >
                  {{ isEditMode ? "수정 저장" : "추가하기" }}
                </button>
                <button
                  v-if="isEditMode"
                  type="button"
                  @click="
                    () => {
                      isEditMode = false;
                      Object.assign(variantForm, initialVariantForm);
                    }
                  "
                  class="w-full border bg-white py-2 rounded text-sm mt-2"
                >
                  취소하고 새 등록
                </button>
              </form>
            </div>

            <div class="lg:col-span-2">
              <div class="border rounded-lg overflow-hidden">
                <table class="w-full text-left text-sm">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="p-3">SKU</th>
                      <th class="p-3">정보</th>
                      <th class="p-3">재고</th>
                      <th class="p-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <tr
                      v-for="variant in variants"
                      :key="variant.id"
                      :class="{ 'bg-blue-50': variant.id === variantForm.id }"
                    >
                      <td class="p-3 font-mono text-xs">{{ variant.sku }}</td>
                      <td class="p-3">
                        <span class="font-bold">{{ variant.size }}</span>
                        <span v-if="variant.color" class="text-gray-500">
                          / {{ variant.color }}</span
                        >
                      </td>
                      <td class="p-3 font-bold">{{ variant.stockQuantity }}</td>
                      <td class="p-3 text-right space-x-1">
                        <button
                          @click="handleEditVariant(variant)"
                          class="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-xs"
                        >
                          수정
                        </button>
                        <button
                          @click="handleDeleteVariant(variant.id)"
                          class="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 text-xs"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                    <tr v-if="variants.length === 0">
                      <td colspan="4" class="p-6 text-center text-gray-400">
                        등록된 옵션이 없습니다.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSizeManagerOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto"
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-6 border-b pb-2">
            <div>
              <h2 class="text-xl font-bold">사이즈 측정 관리</h2>
              <p class="text-sm text-gray-500">
                상품: {{ currentProduct?.name }}
              </p>
            </div>
            <button
              @click="isSizeManagerOpen = false"
              class="text-gray-500 hover:text-black"
            >
              ✕ 닫기
            </button>
          </div>

          <div class="mb-6">
            <h3 class="text-xs font-bold text-gray-500 uppercase mb-2">
              관리할 사이즈 옵션을 선택하세요
            </h3>
            <div v-if="variants.length > 0" class="flex flex-wrap gap-2">
              <button
                v-for="v in variants"
                :key="v.id"
                @click="selectVariantForSize(v)"
                :class="[
                  'px-4 py-2 rounded border text-sm font-medium transition-colors',
                  currentVariant?.id === v.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50',
                ]"
              >
                {{ v.size }}
                <span v-if="v.color" class="opacity-70">({{ v.color }})</span>
              </button>
            </div>
            <div
              v-else
              class="p-4 bg-yellow-50 text-yellow-700 text-sm rounded border border-yellow-200"
            >
              ⚠️ 등록된 옵션이 없습니다. 먼저 [옵션 관리]에서 옵션을
              추가해주세요.
            </div>
          </div>

          <div v-if="currentVariant">
            <div class="bg-gray-50 p-4 rounded-lg border mb-6">
              <h3 class="text-sm font-bold mb-3 uppercase text-gray-600">
                {{ isMeasurementEditMode ? "치수 수정" : "새 치수 등록" }} ({{
                  currentVariant.size
                }})
              </h3>
              <form @submit.prevent="handleSaveMeasurement">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >총장 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.totalLength"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >어깨너비 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.shoulderWidth"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >가슴단면 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.chestSection"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >소매길이 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.sleeveLength"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >허리단면 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.waistSection"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >엉덩이단면 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.hipSection"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1"
                      >허벅지단면 (cm)</label
                    >
                    <input
                      v-model.number="measurementForm.thighSection"
                      type="number"
                      step="0.1"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1">출력순서</label>
                    <input
                      v-model.number="measurementForm.displayOrder"
                      type="number"
                      class="w-full border rounded p-1 text-sm"
                    />
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <button
                    v-if="isMeasurementEditMode"
                    type="button"
                    @click="
                      () => {
                        isMeasurementEditMode = false;
                        Object.assign(measurementForm, initialMeasurementForm);
                      }
                    "
                    class="px-3 py-1 bg-white border rounded text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                  >
                    {{ isMeasurementEditMode ? "수정 완료" : "등록하기" }}
                  </button>
                </div>
              </form>
            </div>

            <div class="border rounded-lg overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="p-2">총장</th>
                    <th class="p-2">어깨</th>
                    <th class="p-2">가슴</th>
                    <th class="p-2">소매</th>
                    <th class="p-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="m in measurements"
                    :key="m.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="p-2">{{ m.totalLength }}</td>
                    <td class="p-2">{{ m.shoulderWidth }}</td>
                    <td class="p-2">{{ m.chestSection }}</td>
                    <td class="p-2">{{ m.sleeveLength }}</td>
                    <td class="p-2 text-right space-x-1">
                      <button
                        @click="handleEditMeasurement(m)"
                        class="text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        @click="handleDeleteMeasurement(m.id)"
                        class="text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr v-if="measurements.length === 0">
                    <td colspan="5" class="p-4 text-center text-gray-400">
                      등록된 치수 정보가 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
