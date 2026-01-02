<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Edit3,
  Settings,
  Ruler,
  Image as ImageIcon,
  Plus,
  X,
  Check,
  PlusCircle,
} from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/admin";
import { Alert } from "@/components/ui/alert";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

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

// 삭제 확인 다이얼로그 상태
const showDeleteConfirm = ref(false);
const deleteTargetId = ref<string>("");
const deleteType = ref<"product" | "variant" | "measurement">("product");
const deleteMessage = ref("");

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
  images: [] as string[], // 상품 이미지 배열
  detailImages: [] as string[], // 상세 이미지 배열
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

interface MeasurementForm {
  id: string;
  totalLength: number;
  shoulderWidth: number;
  chestSection: number;
  sleeveLength: number;
  waistSection: number;
  hipSection: number;
  thighSection: number;
  displayOrder: number;
}

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

const measurementFields: { id: keyof MeasurementForm; label: string }[] = [
  { id: "totalLength", label: "총장" },
  { id: "shoulderWidth", label: "어깨너비" },
  { id: "chestSection", label: "가슴단면" },
  { id: "sleeveLength", label: "소매길이" },
  { id: "waistSection", label: "허리단면" },
  { id: "hipSection", label: "엉덩이단면" },
  { id: "thighSection", label: "허벅지단면" },
  { id: "displayOrder", label: "출력순서" },
];

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
    images: product.images || [],
    detailImages: product.detailImages || [],
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
      categoryId: Number(productForm.categoryId),
      imageUrl: productForm.imageUrl,
      images: productForm.images,
      detailImages: productForm.detailImages,
      isAvailable: productForm.isAvailable,
    };

    if (isEditMode.value) {
      await updateProduct(productForm.id, payload);
      showAlert("상품이 수정되었습니다.");
    } else {
      await createProduct(payload);
      showAlert("상품이 등록되었습니다.");
    }
    isProductModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    errorMessage.value = error.message || "저장에 실패했습니다.";
  }
};

// 삭제 확인 다이얼로그 열기
const openDeleteConfirm = (
  type: "product" | "variant" | "measurement",
  id: string,
  message: string
) => {
  deleteType.value = type;
  deleteTargetId.value = id;
  deleteMessage.value = message;
  showDeleteConfirm.value = true;
};

// 삭제 확인 후 실행
const handleConfirmDelete = async () => {
  showDeleteConfirm.value = false;
  try {
    if (deleteType.value === "product") {
      await deleteProduct(deleteTargetId.value);
      await loadData();
    } else if (deleteType.value === "variant" && currentProduct.value) {
      await deleteProductVariant(currentProduct.value.id, deleteTargetId.value);
      await loadVariants(currentProduct.value.id);
    } else if (deleteType.value === "measurement" && currentVariant.value) {
      await deleteSizeMeasurement(deleteTargetId.value);
      await loadMeasurements(currentVariant.value.id);
    }
  } catch (e: any) {
    showAlert(e.message, { type: "error" });
  }
};

const handleDeleteProduct = (id: string) => {
  openDeleteConfirm("product", id, "정말 삭제하시겠습니까?");
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
      showAlert("사이즈와 SKU는 필수입니다.", { type: "error" });
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
    showAlert("저장 실패: " + (error.message || "알 수 없는 오류"), { type: "error" });
  }
};

// 2. 삭제 함수 수정
const handleDeleteVariant = (variantId: string) => {
  if (!currentProduct.value) return;
  openDeleteConfirm("variant", variantId, "이 옵션을 삭제하시겠습니까?");
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
      showAlert("수정되었습니다.");
    } else {
      await createSizeMeasurement(currentVariant.value.id, payload);
      showAlert("등록되었습니다.");
    }

    await loadMeasurements(currentVariant.value.id);
    Object.assign(measurementForm, initialMeasurementForm);
    isMeasurementEditMode.value = false;
  } catch (error: any) {
    showAlert("저장 실패: " + error.message, { type: "error" });
  }
};

const handleDeleteMeasurement = (id: string) => {
  openDeleteConfirm("measurement", id, "삭제하시겠습니까?");
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
  <div class="w-11/12 max-w-screen-2xl mx-auto py-24 sm:py-16">
    <div class="flex justify-between items-end">
      <div>
        <h3 class="text-heading text-admin tracking-wider">상품 관리</h3>
        <p class="text-body text-admin-muted mt-1 mb-3">
          총
          <span class="text-body text-admin font-bold">{{
            products.length
          }}</span
          >개 상품
        </p>
      </div>
      <Button @click="openCreateProductModal" class="mb-2 gap-2">
        <Plus class="w-4 h-4" />
        새 상품 등록
      </Button>
    </div>
    <Separator class="mb-6"></Separator>
    <div v-if="isLoading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"
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
                <th class="px-6 py-5 text-right pr-10">작업</th>
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
                  <div class="text-body text-admin">
                    {{ product.name }}
                  </div>
                  <div
                    class="text-caption text-admin-muted bg-muted inline-block py-0.5 rounded mt-1 font-mono"
                  >
                    {{ product.slug }}
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="text-body text-admin">
                    {{ Number(product.price).toLocaleString() }}원
                  </div>
                  <div
                    v-if="product.originalPrice"
                    class="text-caption text-admin-muted line-through opacity-50"
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
                    class="px-3 py-1 rounded-full text-caption font-bold"
                  >
                    {{ product.isAvailable ? "판매중" : "중단" }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openVariantManager(product)"
                      class="gap-1.5"
                    >
                      <Settings class="w-3.5 h-3.5" /> 옵션
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openSizeManager(product)"
                      class="gap-1.5 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
                    >
                      <Ruler class="w-3.5 h-3.5" /> 사이즈
                    </Button>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditProductModal(product)"
                      class="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="handleDeleteProduct(product.id)"
                      class="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
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
          <Button
            v-for="p in totalPages"
            :key="p"
            @click="changePage(p)"
            :variant="currentPage === p ? 'default' : 'outline'"
            size="icon"
            class="h-10 w-10"
          >
            {{ p }}
          </Button>
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
          <div class="flex justify-between items-end">
            <h2
              class="text-heading font-semibold text-admin tracking-wide mb-3"
            >
              {{ isEditMode ? "상품 정보 수정" : "신규 상품 등록" }}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              @click="isProductModalOpen = false"
              class="mb-2"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator></Separator>
          <form @submit.prevent="handleSaveProduct" class="space-y-6">
            <div class="grid grid-cols-2 gap-6 mt-6">
              <div class="space-y-2">
                <Label class="text-admin">
                  상품명 <span class="text-red-500">*</span>
                </Label>
                <Input
                  v-model="productForm.name"
                  type="text"
                  placeholder="상품명을 입력하세요"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label class="text-admin">
                  Slug (URL용) <span class="text-red-500">*</span>
                </Label>
                <Input
                  v-model="productForm.slug"
                  type="text"
                  placeholder="예: oversize-wool-coat"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
              <div class="space-y-2">
                <Label class="text-admin">
                  판매 가격 <span class="text-red-500">*</span>
                </Label>
                <Input
                  v-model.number="productForm.price"
                  type="number"
                  placeholder="0"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label class="text-admin">원래 가격</Label>
                <Input
                  v-model.number="productForm.originalPrice"
                  type="number"
                  placeholder="0"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-admin">
                  카테고리 <span class="text-red-500">*</span>
                </Label>
                <Select v-model="productForm.categoryId">
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="cat in categories"
                      :key="cat.id"
                      :value="String(cat.id)"
                    >
                      {{ cat.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="space-y-6">
              <!-- 대표 이미지 업로드 -->
              <ImageUploader
                v-model="productForm.imageUrl"
                type="single"
                label="대표 이미지"
                :required="true"
              />

              <!-- 상세 이미지 업로드 -->
              <ImageUploader
                v-model="productForm.detailImages"
                type="details"
                label="상세 이미지"
                :required="true"
                :max-files="10"
              />

              <!-- 상품 설명 -->
              <div class="space-y-2">
                <Label class="text-admin">
                  상품 설명 <span class="text-red-500">*</span>
                </Label>
                <Textarea
                  v-model="productForm.description"
                  rows="4"
                  class="resize-none"
                  placeholder="상품에 대한 상세한 설명을 입력하세요"
                  required
                />
              </div>

              <!-- 추가 이미지 업로드 -->
              <ImageUploader
                v-model="productForm.images"
                type="multiple"
                label="추가 이미지 (선택)"
                :required="false"
                :max-files="10"
              />
            </div>

            <div
              v-if="errorMessage"
              class="bg-destructive/10 text-destructive text-caption p-4 rounded-xl border border-destructive/20 font-bold animate-pulse"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div
              class="flex justify-end gap-3 pt-6 border-t border-border mt-4"
            >
              <Button
                type="button"
                variant="outline"
                @click="isProductModalOpen = false"
              >
                취소
              </Button>
              <Button type="submit">
                {{ isEditMode ? "수정 내용 저장" : "상품 등록하기" }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="isVariantModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <div class="flex justify-between items-end">
            <h2
              class="text-heading font-semibold text-admin tracking-wider mb-3"
            >
              {{
                isEditMode
                  ? "옵션 수정 : " + currentProduct?.name
                  : "신규 옵션 추가"
              }}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              @click="isVariantModalOpen = false"
              class="mb-2"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator class="mb-6"></Separator>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div
              class="bg-muted/30 p-6 rounded-2xl border border-border h-fit shadow-sm"
            >
              <h4
                class="text-body font-bold text-admin mb-5 flex items-center gap-2"
              >
                <PlusCircle class="w-[18px] h-[18px] text-primary" />
                {{ isEditMode ? "옵션 정보 수정" : "옵션 신규 등록" }}
              </h4>

              <form @submit.prevent="handleSaveVariant" class="space-y-5">
                <div class="space-y-2">
                  <Label class="text-muted-foreground">재고관리코드 (SKU)</Label>
                  <Input
                    v-model="variantForm.sku"
                    type="text"
                    disabled
                    class="bg-muted/50 cursor-not-allowed opacity-70"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-2">
                    <Label class="text-muted-foreground">사이즈 *</Label>
                    <Input
                      v-model="variantForm.size"
                      type="text"
                      placeholder="예: S, FREE"
                      required
                    />
                  </div>
                  <div class="space-y-2">
                    <Label class="text-muted-foreground">색상 *</Label>
                    <Input
                      v-model="variantForm.color"
                      type="text"
                      placeholder="예: Black"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <Label class="text-muted-foreground">현재 재고 수량</Label>
                  <Input
                    v-model.number="variantForm.stockQuantity"
                    type="number"
                    placeholder="0"
                  />
                </div>

                <div class="flex items-center gap-3 py-1">
                  <input
                    v-model="variantForm.isAvailable"
                    type="checkbox"
                    id="isAvailable"
                    class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <Label for="isAvailable" class="cursor-pointer">
                    즉시 판매 가능함
                  </Label>
                </div>

                <div class="pt-2 space-y-2">
                  <Button type="submit" class="w-full">
                    {{ isEditMode ? "수정 내용 저장" : "옵션 추가하기" }}
                  </Button>
                  <Button
                    v-if="isEditMode"
                    type="button"
                    variant="outline"
                    class="w-full"
                    @click="
                      () => {
                        isEditMode = false;
                        Object.assign(variantForm, initialVariantForm);
                      }
                    "
                  >
                    취소하고 새로 등록
                  </Button>
                </div>
              </form>
            </div>

            <div class="lg:col-span-2">
              <div
                class="border border-border rounded-2xl overflow-hidden shadow-sm bg-white"
              >
                <table class="w-full text-left border-collapse">
                  <thead
                    class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
                  >
                    <tr>
                      <th class="px-6 py-4">재고관리코드(SKU)</th>
                      <th class="px-6 py-4">옵션 상세</th>
                      <th class="px-6 py-4 text-center">재고</th>
                      <th class="px-6 py-4 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr
                      v-for="variant in variants"
                      :key="variant.id"
                      :class="{ 'bg-primary/5': variant.id === variantForm.id }"
                      class="hover:bg-muted/20 transition-colors group"
                    >
                      <td class="px-6 py-4 text-tiny text-admin-muted">
                        {{ variant.sku }}
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-caption font-semibold text-admin-muted"
                            >{{ variant.size }}</span
                          >
                          <span
                            v-if="variant.color"
                            class="text-caption font-semibold text-admin-muted"
                            >/ {{ variant.color }}</span
                          >
                          <span
                            v-if="!variant.isAvailable"
                            class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold ml-1"
                            >품절처리</span
                          >
                        </div>
                      </td>
                      <td
                        class="px-6 py-4 text-center font-semibold text-caption text-admin-muted"
                      >
                        {{ variant.stockQuantity }}
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            @click="handleEditVariant(variant)"
                            class="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit3 class="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            @click="handleDeleteVariant(variant.id)"
                            class="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 class="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="variants.length === 0">
                      <td
                        colspan="4"
                        class="px-6 py-16 text-center text-admin-muted text-caption"
                      >
                        등록된 상품 옵션이 없습니다.
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <div class="flex justify-between items-end">
            <div>
              <h2
                class="text-heading font-semibold text-admin tracking-wide mb-3"
              >
                사이즈 관리
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              @click="isSizeManagerOpen = false"
              class="mb-2"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator></Separator>
          <div class="mb-10">
            <p class="text-body text-admin-muted mt-3">
              상품:
              <span class="text-admin-muted">{{ currentProduct?.name }}</span>
            </p>
            <label
              class="text-body text-admin-muted uppercase tracking-tighter block mb-1 mt-3"
            >
              사이즈 옵션 선택
            </label>
            <div v-if="variants.length > 0" class="flex flex-wrap gap-2">
              <Button
                v-for="v in variants"
                :key="v.id"
                @click="selectVariantForSize(v)"
                :variant="currentVariant?.id === v.id ? 'default' : 'outline'"
                :class="currentVariant?.id === v.id ? 'scale-105' : ''"
              >
                <span class="text-caption">{{ v.size }}</span>
                <span class="text-caption ml-1">({{ v.color }})</span>
              </Button>
            </div>
            <div
              v-else
              class="p-5 bg-destructive/5 text-destructive text-body rounded-2xl border border-destructive/10 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-alert-circle"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              등록된 옵션이 없습니다. 먼저 [옵션 관리]에서 옵션을 추가해주세요.
            </div>
          </div>

          <div
            v-if="currentVariant"
            class="space-y-8 animate-in slide-in-from-bottom-2 duration-300"
          >
            <div
              class="bg-muted/30 p-6 rounded-2xl border border-border shadow-inner"
            >
              <div class="flex items-center gap-2 mb-5">
                <div class="text-body font-semibold text-admin-muted">
                  사이즈 상세 수치 입력
                </div>
                <span
                  class="bg-primary text-white text-caption font-bold px-1 py-0.5 rounded"
                  >{{ currentVariant.size }}</span
                >
              </div>

              <form @submit.prevent="handleSaveMeasurement" class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    v-for="field in measurementFields"
                    :key="field.id"
                    class="space-y-2"
                  >
                    <Label class="text-muted-foreground">
                      {{ field.label }} (cm)
                    </Label>
                    <Input
                      v-model.number="measurementForm[field.id]"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <Button
                    v-if="isMeasurementEditMode"
                    type="button"
                    variant="ghost"
                    @click="
                      () => {
                        isMeasurementEditMode = false;
                        Object.assign(measurementForm, initialMeasurementForm);
                      }
                    "
                  >
                    취소
                  </Button>
                  <Button type="submit" class="gap-2">
                    <Check class="w-4 h-4" />
                    {{ isMeasurementEditMode ? "수정 완료" : "수치 등록하기" }}
                  </Button>
                </div>
              </form>
            </div>

            <div
              class="border border-border rounded-2xl overflow-hidden shadow-sm bg-white"
            >
              <table class="w-full text-left border-collapse">
                <thead
                  class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
                >
                  <tr>
                    <th class="px-6 py-4">총장</th>
                    <th class="px-6 py-4">어깨</th>
                    <th class="px-6 py-4">가슴</th>
                    <th class="px-6 py-4">소매</th>
                    <th class="px-6 py-4">허리/힙/허벅지</th>
                    <th class="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border text-body text-admin">
                  <tr
                    v-for="m in measurements"
                    :key="m.id"
                    class="hover:bg-muted/20 transition-colors"
                  >
                    <td class="px-6 py-4 text-caption">{{ m.totalLength }}</td>
                    <td class="px-6 py-4 text-caption">
                      {{ m.shoulderWidth }}
                    </td>
                    <td class="px-6 py-4 text-caption">{{ m.chestSection }}</td>
                    <td class="px-6 py-4 text-caption">{{ m.sleeveLength }}</td>
                    <td class="px-6 py-4 text-caption">
                      {{ m.waistSection }} / {{ m.hipSection }} /
                      {{ m.thighSection }}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="handleEditMeasurement(m)"
                          class="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Edit3 class="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="handleDeleteMeasurement(m.id)"
                          class="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 class="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="measurements.length === 0">
                    <td
                      colspan="6"
                      class="px-6 py-12 text-center text-admin-muted text-caption"
                    >
                      등록된 치수 정보가 없습니다. 상단 폼을 통해 입력해주세요.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 다이얼로그 -->
    <Alert
      v-if="showDeleteConfirm"
      :confirm-mode="true"
      confirm-variant="destructive"
      :message="deleteMessage"
      confirm-text="삭제"
      cancel-text="취소"
      @confirm="handleConfirmDelete"
      @cancel="showDeleteConfirm = false"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
/* 실측 입력용 전용 클래스 (패딩 최적화) */
.form-input-custom {
  @apply w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm;
}
.form-input-custom-small {
  @apply w-full border border-border rounded-xl p-2.5 text-caption text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm;
}
</style>
