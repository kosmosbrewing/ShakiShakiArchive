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
import { AlertDescription } from "@/components/ui/alert";
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
  Eye,
} from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/admin";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useVariantSelection,
  useSizeMeasurements,
  useProductTabs,
} from "@/composables/useProduct";
import { useOptimizedImage } from "@/composables";
import { formatPrice, formatSizeValue } from "@/lib/formatters";
import { isValidSizeMeasurement } from "@/lib/validators";

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
const isPreviewModalOpen = ref(false); // 미리보기 모달 상태
const isEditMode = ref(false);
const isMeasurementEditMode = ref(false);
const errorMessage = ref("");

// 페이지네이션
const currentPage = ref(1);
const itemsPerPage = 20;

const currentProduct = ref<any>(null);
const currentVariant = ref<any>(null); // 현재 선택된 변종 (사이즈 관리용)
const previewProduct = ref<any>(null); // 미리보기 모달용 상품 데이터
const previewVariants = ref<any[]>([]); // 미리보기 모달용 변종 데이터

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
  updatedAt: "", // 수정일 직접 설정용
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
  totalLength: string;
  shoulderWidth: string;
  chestSection: string;
  sleeveLength: string;
  waistSection: string;
  hipSection: string;
  thighSection: string;
  displayOrder: number;
}

// --- 폼 데이터 (사이즈 측정) ---
const initialMeasurementForm = {
  id: "",
  totalLength: "",
  shoulderWidth: "",
  chestSection: "",
  sleeveLength: "",
  waistSection: "",
  hipSection: "",
  thighSection: "",
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
  //{ id: "displayOrder", label: "출력순서" },
];

// --- 정렬 상태 ---
const sortOrder = ref<"asc" | "desc">("desc"); // 기본: 최신순

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  currentPage.value = 1; // 정렬 변경 시 첫 페이지로 이동
};

// --- Computed ---
const sortedProducts = computed(() => {
  return [...products.value].sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || 0).getTime();
    return sortOrder.value === "desc" ? dateB - dateA : dateA - dateB;
  });
});

const totalPages = computed(() =>
  Math.ceil(sortedProducts.value.length / itemsPerPage)
);
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedProducts.value.slice(start, start + itemsPerPage);
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

    // 각 상품의 totalStock 계산 (백엔드에서 제공하지 않는 경우)
    const productsWithStock = await Promise.all(
      productsData.map(async (product: any) => {
        if (product.totalStock === undefined || product.totalStock === null) {
          try {
            const productVariants = await fetchAdminProductVariants(product.id);
            const totalStock = productVariants.reduce(
              (sum: number, variant: any) => sum + (variant.stockQuantity || 0),
              0
            );
            return { ...product, totalStock };
          } catch (error) {
            console.error(`재고 로드 실패 (상품 ID: ${product.id}):`, error);
            return { ...product, totalStock: 0 };
          }
        }
        return product;
      })
    );

    products.value = productsWithStock;
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

// 수정일 표시용 포맷 (KST 기준, YYYY.MM.DD)
const formatDisplayDate = (isoString: string) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

// ISO 문자열을 datetime-local input 형식으로 변환 (KST 기준)
const formatDateTimeLocal = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  // 로컬 시간(KST) 기준으로 "YYYY-MM-DDTHH:mm" 형식 생성
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const openEditProductModal = (product: any) => {
  isEditMode.value = true;
  Object.assign(productForm, {
    ...product,
    price: Number(product.price),
    originalPrice: Number(product.originalPrice || 0),
    categoryId: String(product.categoryId), // Select 컴포넌트 value와 타입 일치 필요
    images: product.images || [],
    detailImages: product.detailImages || [],
    updatedAt: formatDateTimeLocal(product.updatedAt),
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
    const payload: Record<string, any> = {
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
      // 수정 모드에서 updatedAt이 설정된 경우 ISO 형식으로 변환하여 전송
      if (productForm.updatedAt) {
        const date = new Date(productForm.updatedAt);
        // 유효한 날짜인지 확인
        if (!isNaN(date.getTime())) {
          payload.updatedAt = date.toISOString();
        }
      }
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
      showAlert("옵션이 수정되었습니다.");
    } else {
      await createProductVariant(currentProduct.value.id, payload);
      showAlert("옵션이 추가되었습니다.");
    }

    // 목록 갱신
    await loadVariants(currentProduct.value.id);

    // 폼 초기화
    Object.assign(variantForm, initialVariantForm);
    isEditMode.value = false;
  } catch (error: any) {
    console.error(error);
    showAlert("저장 실패: " + (error.message || "알 수 없는 오류"), {
      type: "error",
    });
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

  // 0을 빈 문자열로 변환하는 헬퍼 함수
  const convertValue = (value: any): string => {
    // 0, "0", null, undefined, 빈 문자열을 모두 빈 문자열로 변환
    if (value === null || value === undefined || value === "" || value === 0 || value === "0") {
      return "";
    }
    return String(value);
  };

  Object.assign(measurementForm, {
    ...measurement,
    totalLength: convertValue(measurement.totalLength),
    shoulderWidth: convertValue(measurement.shoulderWidth),
    chestSection: convertValue(measurement.chestSection),
    sleeveLength: convertValue(measurement.sleeveLength),
    waistSection: convertValue(measurement.waistSection),
    hipSection: convertValue(measurement.hipSection),
    thighSection: convertValue(measurement.thighSection),
  });
};

const handleSaveMeasurement = async () => {
  if (!currentVariant.value) return;
  try {
    // 사이즈 측정값 검증
    const measurementValues = [
      { field: "총장", value: measurementForm.totalLength },
      { field: "어깨너비", value: measurementForm.shoulderWidth },
      { field: "가슴단면", value: measurementForm.chestSection },
      { field: "소매길이", value: measurementForm.sleeveLength },
      { field: "허리단면", value: measurementForm.waistSection },
      { field: "엉덩이단면", value: measurementForm.hipSection },
      { field: "허벅지단면", value: measurementForm.thighSection },
    ];

    const invalidFields = measurementValues.filter(
      ({ value }) => value.trim() !== "" && !isValidSizeMeasurement(value)
    );

    if (invalidFields.length > 0) {
      const fieldNames = invalidFields.map(({ field }) => field).join(", ");
      showAlert(
        `잘못된 측정값입니다 (${fieldNames}). 1~999 범위의 숫자, 소수점, 범위(95-100) 형식만 허용됩니다.`,
        { type: "error" }
      );
      return;
    }

    // 측정값 payload 생성 (빈 값은 undefined로 처리)
    const payload: Record<string, string | number | undefined> = {
      totalLength: measurementForm.totalLength.trim() || undefined,
      shoulderWidth: measurementForm.shoulderWidth.trim() || undefined,
      chestSection: measurementForm.chestSection.trim() || undefined,
      sleeveLength: measurementForm.sleeveLength.trim() || undefined,
      waistSection: measurementForm.waistSection.trim() || undefined,
      hipSection: measurementForm.hipSection.trim() || undefined,
      thighSection: measurementForm.thighSection.trim() || undefined,
      displayOrder: measurementForm.displayOrder,
    };

    // undefined 필드 제거 (백엔드에 전송하지 않음)
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    ) as Record<string, string | number>;

    if (isMeasurementEditMode.value) {
      await updateSizeMeasurement(measurementForm.id, cleanedPayload);
      showAlert("수정되었습니다.");
    } else {
      await createSizeMeasurement(currentVariant.value.id, cleanedPayload);
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

// --- [모달 4] 미리보기 로직 ---
const { detail } = useOptimizedImage();

// 미리보기 모달용 composables
const previewVariantSelection = useVariantSelection(previewVariants);
const previewSizeMeasurements = useSizeMeasurements(previewVariants);
const { activeTab: previewActiveTab, setTab: setPreviewTab } = useProductTabs();

// 미리보기 모달 열기
const openPreviewModal = async (product: any) => {
  previewProduct.value = product;
  await loadVariants(product.id);
  previewVariants.value = variants.value;

  // 사이즈 측정 데이터 로드
  await previewSizeMeasurements.loadSizeMeasurements();

  isPreviewModalOpen.value = true;
};

// 상품명 변경 시 Slug 자동 생성
watch(
  () => productForm.name,
  (newName) => {
    if (newName) {
      // 공백을 '-'로 치환, 연속 하이픈 제거, 앞뒤 하이픈 제거, 소문자 변환
      productForm.slug = newName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
  }
);

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
      <Button
        @click="openCreateProductModal"
        class="mb-2 gap-2 bg-admin hover:bg-admin/80 text-white font-semibold"
      >
        <Plus class="w-4 h-4" />
        새 상품 등록
      </Button>
    </div>
    <Separator class="mb-6"></Separator>
    <LoadingSpinner v-if="isLoading" />

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
                <th class="px-6 py-5 text-center">재고</th>
                <th class="px-6 py-5 text-center">상태</th>
                <th class="px-6 py-5 text-center">관리 도구</th>
                <th class="px-6 py-5 text-center">작업</th>
                <th class="px-6 py-5 text-right pr-10">
                  <button
                    @click="toggleSortOrder"
                    class="inline-flex items-center gap-1 hover:underline"
                  >
                    수정일
                  </button>
                </th>
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
                  <div class="text-body text-admin">
                    {{ product.totalStock ?? "-" }}개
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
                      class="gap-1.5 text-xs"
                    >
                      <Settings class="w-3.5 h-3.5" /> 옵션
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openSizeManager(product)"
                      class="gap-1.5 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 text-xs"
                    >
                      <Ruler class="w-3.5 h-3.5" /> 사이즈
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openPreviewModal(product)"
                      class="gap-1.5 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 text-xs"
                    >
                      <Eye class="w-3.5 h-3.5" /> 미리보기
                    </Button>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="flex justify-center gap-1">
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
                <td class="px-6 py-4 text-right pr-10">
                  <span class="text-caption text-admin-muted">
                    {{ formatDisplayDate(product.updatedAt) }}
                  </span>
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
                  상품명 <span class="text-primary">*</span>
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
                  Slug (URL용) <span class="text-primary">*</span>
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
                  판매 가격 <span class="text-primary">*</span>
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
                  카테고리 <span class="text-primary">*</span>
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

            <!-- 판매 상태 토글 -->
            <div class="flex items-center gap-3 py-2">
              <input
                v-model="productForm.isAvailable"
                type="checkbox"
                id="productIsAvailable"
                class="w-4 h-4 rounded border-border accent-primary focus:ring-primary/20"
              />
              <Label for="productIsAvailable" class="cursor-pointer">
                판매 가능 상태
              </Label>
              <span
                :class="
                  productForm.isAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                "
                class="px-2 py-0.5 rounded-full text-caption font-bold ml-2"
              >
                {{ productForm.isAvailable ? "판매중" : "판매중단" }}
              </span>
            </div>

            <!-- 수정일 설정 (수정 모드에서만 표시) -->
            <div v-if="isEditMode" class="space-y-2">
              <Label class="text-admin">수정일 (updatedAt)</Label>
              <Input v-model="productForm.updatedAt" type="datetime-local" />
              <p class="text-caption text-muted-foreground">
                비워두면 현재 시간으로 자동 설정됩니다.
              </p>
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
                  상품 설명 <span class="text-primary">*</span>
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

            <AlertDescription v-if="errorMessage" class="animate-pulse">
              {{ errorMessage }}
            </AlertDescription>

            <div
              class="flex justify-end gap-3 pt-6 border-t border-border mt-4"
            >
              <Button
                type="button"
                variant="outline"
                class="font-medium"
                @click="isProductModalOpen = false"
              >
                취소
              </Button>
              <Button
                type="submit"
                class="bg-admin hover:bg-admin/80 text-white font-semibold"
              >
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
                  <Label class="text-muted-foreground"
                    >재고관리코드 (SKU)</Label
                  >
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

                <div class="pt-2 space-y-2">
                  <Button
                    type="submit"
                    class="w-full bg-admin hover:bg-admin/80 text-white font-semibold"
                  >
                    {{ isEditMode ? "수정 내용 저장" : "옵션 추가하기" }}
                  </Button>
                  <Button
                    v-if="isEditMode"
                    type="button"
                    variant="outline"
                    class="w-full font-medium"
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
                      :class="{
                        'bg-primary/5': variant.id === variantForm.id,
                      }"
                      class="hover:bg-muted/20 transition-colors group cursor-pointer"
                      @click="handleEditVariant(variant)"
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
                      <td class="px-6 py-4 text-right" @click.stop>
                        <div class="flex justify-end gap-1">
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
          <div class="mb-4">
            <p class="text-body text-admin-muted mt-3 mb-1">
              상품:
              <span class="text-admin-muted">{{ currentProduct?.name }}</span>
            </p>
            <div v-if="variants.length > 0" class="flex flex-wrap gap-2">
              <Button
                v-for="v in variants"
                :key="v.id"
                @click="selectVariantForSize(v)"
                :variant="currentVariant?.id === v.id ? 'default' : 'outline'"
                :class="currentVariant?.id === v.id ? 'scale-105' : ''"
              >
                <span class="text-caption">{{ v.size }}</span>
                <span v-if="v.color" class="text-caption ml-1"
                  >({{ v.color }})</span
                >
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
            class="space-y-5 animate-in slide-in-from-bottom-2 duration-300"
          >
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
                    :class="{ 'bg-primary/5': m.id === measurementForm.id }"
                    class="hover:bg-muted/20 transition-colors cursor-pointer"
                    @click="handleEditMeasurement(m)"
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
                    <td class="px-6 py-4 text-right" @click.stop>
                      <div class="flex justify-end gap-1">
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
                      v-model="measurementForm[field.id]"
                      type="text"
                      placeholder="예: 95, 95.5, 95-100"
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
                  <Button
                    type="submit"
                    class="gap-2 bg-admin hover:bg-admin/80 text-white font-semibold"
                  >
                    <Check class="w-4 h-4" />
                    {{ isMeasurementEditMode ? "수정 완료" : "수치 등록하기" }}
                  </Button>
                </div>
              </form>
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

    <!-- 미리보기 모달 -->
    <div
      v-if="isPreviewModalOpen && previewProduct"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
      >
        <!-- 헤더 영역 (고정) -->
        <div class="p-8 pb-0 shrink-0">
          <div class="flex justify-between items-center mb-6">
            <h2
              class="text-heading font-semibold text-admin tracking-wide flex items-center gap-2"
            >
              <Eye class="w-5 h-5 text-blue-600" />
              상품 미리보기
            </h2>
            <Button
              variant="ghost"
              size="icon"
              @click="isPreviewModalOpen = false"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator class="mb-8" />
        </div>

        <!-- 스크롤 영역 -->
        <div class="overflow-y-auto px-8 pb-8">
          <!-- ProductDetail과 동일한 레이아웃 -->
          <div class="flex flex-col lg:grid lg:grid-cols-2 gap-8">
            <!-- 상세 이미지 섹션 (왼쪽) -->
            <div
              v-if="
                previewProduct.detailImages &&
                previewProduct.detailImages.length > 0
              "
              class="order-3 lg:order-1 space-y-6"
            >
              <div
                v-for="(detailImg, idx) in previewProduct.detailImages"
                :key="`detail-${idx}`"
                class="detail-image-wrapper overflow-hidden rounded-lg shadow-sm"
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

            <!-- 상품 정보 카드 (오른쪽) -->
            <div class="order-2 lg:order-2">
              <Card class="sticky top-8">
                <CardContent class="p-6">
                  <div class="flex justify-between items-end gap-3 mb-3">
                    <div>
                      <h3 class="text-body font-medium">
                        {{ previewProduct.name }}
                      </h3>
                      <div class="flex items-baseline gap-2 pt-1.5">
                        <span class="text-body text-muted-foreground">
                          {{ formatPrice(previewProduct.price) }}
                        </span>
                        <span
                          v-if="previewProduct.originalPrice"
                          class="text-caption text-muted-foreground/70 line-through -translate-y-1"
                        >
                          {{ formatPrice(previewProduct.originalPrice) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator class="mb-4" />

                  <!-- 사이즈 선택 -->
                  <div v-if="previewVariants.length > 0" class="mb-6">
                    <label
                      class="block text-body font-semibold text-foreground mb-2"
                      >사이즈</label
                    >
                    <div class="flex flex-wrap gap-2">
                      <Button
                        v-for="variant in previewVariants"
                        :key="variant.id"
                        @click="previewVariantSelection.selectVariant(variant)"
                        :disabled="
                          variant.stockQuantity <= 0 || !variant.isAvailable
                        "
                        :variant="
                          previewVariantSelection.selectedVariantId.value ===
                          variant.id
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

                  <!-- 미리보기용 안내 메시지 -->
                  <div
                    class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-caption text-blue-700"
                  >
                    <div class="flex items-center gap-2">
                      <Eye class="w-4 h-4" />
                      <span>관리자 미리보기 모드입니다.</span>
                    </div>
                  </div>

                  <Separator></Separator>

                  <!-- Description / Size 탭 -->
                  <div class="mt-6">
                    <div class="flex border-b border-border">
                      <button
                        @click="setPreviewTab('description')"
                        :class="[
                          'flex-1 py-3 text-body font-semibold uppercase tracking-wide relative',
                          previewActiveTab === 'description'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:underline',
                        ]"
                      >
                        Description
                        <span
                          v-if="previewActiveTab === 'description'"
                          class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                        />
                      </button>
                      <button
                        @click="setPreviewTab('size')"
                        :class="[
                          'flex-1 py-3 text-body font-semibold uppercase tracking-wide relative',
                          previewActiveTab === 'size'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:underline',
                        ]"
                      >
                        Size
                        <span
                          v-if="previewActiveTab === 'size'"
                          class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                        />
                      </button>
                    </div>

                    <div class="py-6 min-h-[180px]">
                      <!-- Description 탭 -->
                      <div
                        v-show="previewActiveTab === 'description'"
                        class="animate-fade-in max-h-[175px] overflow-y-auto pr-2 scrollbar-thin"
                      >
                        <p
                          class="text-muted-foreground whitespace-pre-line leading-relaxed text-caption tracking-wide"
                        >
                          {{ previewProduct.description }}
                        </p>
                      </div>

                      <!-- Size 탭 -->
                      <div
                        v-show="previewActiveTab === 'size'"
                        class="animate-fade-in"
                      >
                        <div v-if="previewSizeMeasurements.hasSizeData.value">
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
                                    v-for="col in previewSizeMeasurements
                                      .activeColumns.value"
                                    :key="col.key"
                                    class="text-caption text-center"
                                  >
                                    {{ col.label }}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow
                                  v-for="(data, idx) in previewSizeMeasurements
                                    .allSizeData.value"
                                  :key="idx"
                                >
                                  <TableCell
                                    class="font-medium text-caption text-center"
                                  >
                                    {{ data.variantSize }}
                                  </TableCell>
                                  <TableCell
                                    v-for="col in previewSizeMeasurements
                                      .activeColumns.value"
                                    :key="col.key"
                                    class="text-center text-caption text-muted-foreground"
                                  >
                                    {{
                                      formatSizeValue(
                                        data[
                                          col.key as keyof typeof data
                                        ] as number
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
                            * 단위: cm / 측정 방법에 따라 오차가 있을 수
                            있습니다.
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
          </div>
        </div>
        <!-- 스크롤 영역 끝 -->
      </div>
    </div>
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

/* 미리보기 모달 애니메이션 */
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
