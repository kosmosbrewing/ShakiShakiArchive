<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import {
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAdminCategories,
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
  Search,
  Copy,
} from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import { AdminNavigationTabs, ImageUploader } from "@/components/admin";
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
import {
  formatPrice,
  formatSizeValue,
  formatDateTimeLocal,
  formatDate,
} from "@/lib/formatters";
import { isValidSizeMeasurement } from "@/lib/validators";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

// --- 상태 관리 ---
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const variants = ref<any[]>([]);
const measurements = ref<any[]>([]);

const isLoading = ref(true);
const hasLoadedOnce = ref(false);
const isProductModalOpen = ref(false);
const isVariantModalOpen = ref(false);
const isSizeManagerOpen = ref(false); // [변경] 사이즈 관리 모달 상태 독립
const isPreviewModalOpen = ref(false); // 미리보기 모달 상태
const isEditMode = ref(false);
const isMeasurementEditMode = ref(false);
const errorMessage = ref("");
const duplicatingProductId = ref<string | null>(null);

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
  description: `model size : 167cm/48kg\n\ncondition :  S (Mint)\n\n• 내용 입력\n• 내용 입력\n• 내용 입력\n\n[Comment] 내용 입력\n 내용 입력`,
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

// --- 검색 & 필터 ---
const searchQuery = ref("");
const stockFilter = ref<"all" | "inStock" | "outOfStock">("all");
const saleFilter = ref<"all" | "available" | "unavailable">("all");
const selectedCategoryId = ref<string>("all");

// --- 정렬 상태 ---
const sortOrder = ref<"asc" | "desc">("desc"); // 기본: 최신순

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  currentPage.value = 1; // 정렬 변경 시 첫 페이지로 이동
};

// 검색어/필터 변경 시 첫 페이지로 이동
watch([searchQuery, stockFilter, saleFilter, selectedCategoryId], () => {
  currentPage.value = 1;
});

// --- Computed ---
const filteredProducts = computed(() => {
  let result = products.value;

  // 검색어 필터
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q),
    );
  }

  // 재고 필터 (totalStock은 DB SUM 결과로 문자열 "0"일 수 있음)
  if (stockFilter.value === "inStock") {
    result = result.filter((p) => Number(p.totalStock ?? 0) > 0);
  } else if (stockFilter.value === "outOfStock") {
    result = result.filter(
      (p) => p.totalStock != null && Number(p.totalStock) === 0,
    );
  }

  // 판매 상태 필터
  if (saleFilter.value === "available") {
    result = result.filter((p) => p.isAvailable);
  } else if (saleFilter.value === "unavailable") {
    result = result.filter((p) => !p.isAvailable);
  }

  // 카테고리 필터
  if (selectedCategoryId.value !== "all") {
    result = result.filter(
      (p) => String(p.categoryId ?? "") === selectedCategoryId.value,
    );
  }

  return result;
});

const sortedProducts = computed(() => {
  return [...filteredProducts.value].sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || 0).getTime();
    return sortOrder.value === "desc" ? dateB - dateA : dateA - dateB;
  });
});

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const totalProductAmount = computed(() => {
  return products.value.reduce((sum, product) => {
    return sum + toNumber(product.price);
  }, 0);
});

const soldOutProductSalesAmount = computed(() => {
  return products.value
    .filter(
      (product) =>
        product.totalStock != null && Number(product.totalStock) === 0,
    )
    .reduce((sum, product) => {
      return sum + toNumber(product.price);
    }, 0);
});

const totalPages = computed(() =>
  Math.ceil(sortedProducts.value.length / itemsPerPage),
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
    const [productsResponse, categoriesData] = await Promise.all([
      fetchAdminProducts(),
      fetchAdminCategories(),
    ]);

    // 백엔드에서 totalStock을 포함하여 반환하므로 N+1 variant 호출 불필요
    products.value = productsResponse.products;
    categories.value = categoriesData;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
    hasLoadedOnce.value = true;
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
      errorMessage.value = ADMIN_MESSAGES.requiredFieldsMissing;
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
      // datetime-local 값은 KST이며, 백엔드도 KST를 그대로 저장하므로 Z suffix만 붙여 전송
      if (productForm.updatedAt) {
        const date = new Date(productForm.updatedAt + "Z");
        if (!isNaN(date.getTime())) {
          payload.updatedAt = date.toISOString();
        }
      }
      await updateProduct(productForm.id, payload);
      showAlert(ADMIN_MESSAGES.productUpdateSuccess);
    } else {
      await createProduct(payload);
      showAlert(ADMIN_MESSAGES.productCreateSuccess);
    }
    isProductModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    errorMessage.value = error.message || ADMIN_MESSAGES.productCreateFailed;
  }
};

// 삭제 확인 다이얼로그 열기
const openDeleteConfirm = (
  type: "product" | "variant" | "measurement",
  id: string,
  message: string,
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

const slugify = (value: string): string => {
  const slug = (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `product-${Date.now()}`;
};

const buildDuplicateName = (originalName: string): string => {
  const base = `${originalName} 복제본`;
  const existingNames = new Set(products.value.map((p) => String(p.name || "")));
  if (!existingNames.has(base)) return base;

  let index = 2;
  let candidate = `${base} ${index}`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${base} ${index}`;
  }
  return candidate;
};

const buildDuplicateSlug = (originalSlug: string): string => {
  const base = `${slugify(originalSlug)}-copy`;
  const existingSlugs = new Set(products.value.map((p) => String(p.slug || "")));
  if (!existingSlugs.has(base)) return base;

  let index = 2;
  let candidate = `${base}-${index}`;
  while (existingSlugs.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
};

const handleDuplicateProduct = async (product: any) => {
  duplicatingProductId.value = product.id;
  try {
    const duplicatedName = buildDuplicateName(String(product.name || "상품"));
    const duplicatedSlug = buildDuplicateSlug(
      String(product.slug || product.name || "product"),
    );

    const duplicatePayload: Record<string, any> = {
      name: duplicatedName,
      slug: duplicatedSlug,
      description: product.description || "",
      price: String(product.price || 0),
      originalPrice: product.originalPrice ? String(product.originalPrice) : null,
      stockQuantity: product.stockQuantity || 0,
      categoryId: Number(product.categoryId),
      imageUrl: product.imageUrl || "",
      images: product.images || [],
      detailImages: product.detailImages || [],
      // 복제본은 검수 후 노출하도록 기본 비활성화로 생성
      isAvailable: false,
    };

    const createdProduct = await createProduct(duplicatePayload);

    const sourceVariants = await fetchAdminProductVariants(product.id);
    let copiedVariantCount = 0;

    for (let index = 0; index < sourceVariants.length; index += 1) {
      const variant = sourceVariants[index];
      const variantPayload: Record<string, any> = {
        size: variant.size,
        color: variant.color,
        sku: `${((variant as any).sku || `${duplicatedSlug}-${variant.size || "opt"}`)
          .replace(/\s+/g, "-")
          .toUpperCase()}-COPY-${index + 1}`,
        stockQuantity: Number(variant.stockQuantity || 0),
        isAvailable: Boolean(variant.isAvailable),
      };
      const newVariant = await createProductVariant(createdProduct.id, variantPayload);
      copiedVariantCount += 1;

      const sourceMeasurements = await fetchSizeMeasurements(variant.id);
      for (const measurement of sourceMeasurements) {
        const rawPayload: Record<string, any> = {
          totalLength: measurement.totalLength || undefined,
          shoulderWidth: measurement.shoulderWidth || undefined,
          chestSection: measurement.chestSection || undefined,
          sleeveLength: measurement.sleeveLength || undefined,
          waistSection: measurement.waistSection || undefined,
          hipSection: measurement.hipSection || undefined,
          thighSection: measurement.thighSection || undefined,
          displayOrder: (measurement as any).displayOrder ?? 0,
        };
        const payload = Object.fromEntries(
          Object.entries(rawPayload).filter(
            ([, value]) => value !== undefined && value !== null,
          ),
        ) as Record<string, string | number>;
        await createSizeMeasurement(newVariant.id, payload);
      }
    }

    await loadData();
    showAlert(
      copiedVariantCount > 0
        ? `상품이 복제되었습니다. 옵션 ${copiedVariantCount}개를 함께 복제했으며 판매는 비활성화 상태입니다.`
        : "상품이 복제되었으며 판매는 비활성화 상태입니다.",
    );
  } catch (error: any) {
    showAlert(error.message || "상품 복제에 실패했습니다.", { type: "error" });
  } finally {
    duplicatingProductId.value = null;
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
      showAlert(ADMIN_MESSAGES.sizeAndSkuRequired, { type: "error" });
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
        payload,
      );
      showAlert(ADMIN_MESSAGES.updateSuccess);
    } else {
      await createProductVariant(currentProduct.value.id, payload);
      showAlert(ADMIN_MESSAGES.createSuccess);
    }

    // 목록 갱신
    await loadVariants(currentProduct.value.id);

    // 폼 초기화
    Object.assign(variantForm, initialVariantForm);
    isEditMode.value = false;
  } catch (error: any) {
    console.error(error);
    showAlert(
      ADMIN_MESSAGES.saveFailed.replace(
        "{message}",
        error.message || "알 수 없는 오류",
      ),
      {
        type: "error",
      },
    );
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
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === 0 ||
      value === "0"
    ) {
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
      ({ value }) => value.trim() !== "" && !isValidSizeMeasurement(value),
    );

    if (invalidFields.length > 0) {
      const fieldNames = invalidFields.map(({ field }) => field).join(", ");
      showAlert(
        `잘못된 측정값입니다 (${fieldNames}).\n1~999 범위의 숫자, 소수점, 범위(95-100) 형식만 허용됩니다.`,
        { type: "error" },
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
      Object.entries(payload).filter(([_, v]) => v !== undefined),
    ) as Record<string, string | number>;

    if (isMeasurementEditMode.value) {
      await updateSizeMeasurement(measurementForm.id, cleanedPayload);
      showAlert(ADMIN_MESSAGES.updateSuccess);
    } else {
      await createSizeMeasurement(currentVariant.value.id, cleanedPayload);
      showAlert(ADMIN_MESSAGES.createSuccess);
    }

    await loadMeasurements(currentVariant.value.id);
    Object.assign(measurementForm, initialMeasurementForm);
    isMeasurementEditMode.value = false;
  } catch (error: any) {
    showAlert(ADMIN_MESSAGES.saveFailed.replace("{message}", error.message), {
      type: "error",
    });
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
  },
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
  },
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
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <AdminNavigationTabs />
    <div class="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-end">
      <div class="min-w-0">
        <h3 class="text-heading text-admin tracking-wider">상품 관리</h3>
        <div
          class="mt-1 mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm lg:flex-nowrap lg:whitespace-nowrap"
        >
          <p class="text-body text-admin-muted">
            <template
              v-if="
                searchQuery.trim() ||
                stockFilter !== 'all' ||
                saleFilter !== 'all' ||
                selectedCategoryId !== 'all'
              "
            >
              검색 결과
              <span class="text-body text-admin font-bold">{{
                filteredProducts.length
              }}</span
              >개
              <span class="text-caption text-admin-muted"
                >/ 전체 {{ products.length }}개</span
              >
            </template>
            <template v-else>
              총
              <span class="text-body text-admin font-bold">{{
                products.length
              }}</span
              >개 상품
            </template>
          </p>
          <span class="text-caption text-admin-muted">|</span>
          <p class="text-caption text-admin-muted">
            총 상품 금액
            <span class="font-bold text-admin">{{
              formatPrice(totalProductAmount)
            }}</span>
          </p>
          <span class="text-caption text-admin-muted">|</span>
          <p class="text-caption text-admin-muted">
            품절 상품 금액
            <span class="font-bold text-admin">{{
              formatPrice(soldOutProductSalesAmount)
            }}</span>
          </p>
        </div>
      </div>
      <Button
        @click="openCreateProductModal"
        class="mb-2 gap-2 bg-primary hover:bg-primary/80 text-white font-semibold"
      >
        <Plus class="w-4 h-4" />
        새 상품 등록
      </Button>
    </div>
    <Separator class="mb-4"></Separator>

    <!-- 검색 & 필터 -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <!-- 왼쪽: 검색 -->
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="상품명 또는 슬러그로 검색"
          class="pl-9 w-64"
        />
      </div>

      <!-- 오른쪽: 필터 버튼 -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="min-w-[180px]">
          <Select v-model="selectedCategoryId">
            <SelectTrigger class="h-8">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
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

        <div class="flex items-center gap-1.5">
          <Button
            v-for="opt in [
              { value: 'all', label: '전체 재고' },
              { value: 'inStock', label: '재고 있음' },
              { value: 'outOfStock', label: '재고 없음' },
            ]"
            :key="opt.value"
            size="sm"
            variant="outline"
            :class="
              stockFilter === opt.value
                ? 'bg-transparent border-transparent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ring-2 ring-ring ring-offset-2 ring-offset-background text-admin-muted hover:bg-transparent active:bg-transparent'
                : 'bg-transparent text-admin-muted hover:bg-transparent hover:border-border/80 hover:text-admin-muted active:bg-transparent'
            "
            @click="stockFilter = opt.value as typeof stockFilter"
            class="text-xs"
          >
            {{ opt.label }}
          </Button>
        </div>

        <div class="flex items-center gap-1.5">
          <Button
            v-for="opt in [
              { value: 'all', label: '전체 상태' },
              { value: 'available', label: '판매중' },
              { value: 'unavailable', label: '미판매' },
            ]"
            :key="opt.value"
            size="sm"
            variant="outline"
            :class="
              saleFilter === opt.value
                ? 'bg-transparent border-transparent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ring-2 ring-ring ring-offset-2 ring-offset-background text-admin-muted hover:bg-transparent active:bg-transparent'
                : 'bg-transparent text-admin-muted hover:bg-transparent hover:border-border/80 hover:text-admin-muted active:bg-transparent'
            "
            @click="saleFilter = opt.value as typeof saleFilter"
            class="text-xs"
          >
            {{ opt.label }}
          </Button>
        </div>
      </div>
    </div>
    <LoadingSpinner v-if="isLoading && !hasLoadedOnce" />

    <Card v-else class="overflow-hidden border-none shadow-lg">
      <div
        v-if="isLoading && hasLoadedOnce"
        class="px-6 py-3 border-b bg-muted/20 text-caption text-admin-muted"
      >
        상품 목록 업데이트 중...
      </div>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[1160px]">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-5">이미지</th>
                <th class="px-6 py-5 w-1/3">상품명 / 슬러그</th>
                <th class="px-6 py-5 text-center whitespace-nowrap w-28">
                  판매가
                </th>
                <th class="px-6 py-5 text-center whitespace-nowrap w-20">
                  재고
                </th>
                <th class="px-6 py-5 text-center whitespace-nowrap w-24">
                  상태
                </th>
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
                      crossorigin="anonymous"
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
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <div class="text-body text-admin">
                    {{ formatPrice(product.price) }}
                  </div>
                  <div
                    v-if="product.originalPrice"
                    class="text-caption text-admin-muted line-through opacity-50"
                  >
                    {{ formatPrice(product.originalPrice) }}
                  </div>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <div class="text-body text-admin">
                    {{ product.totalStock ?? "-" }}개
                  </div>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
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
                      :disabled="duplicatingProductId === product.id"
                      @click="handleDuplicateProduct(product)"
                      class="text-muted-foreground hover:text-primary"
                    >
                      <Copy class="w-4 h-4" />
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
                    {{ formatDate(product.updatedAt) }}
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
          <form
            @submit.prevent="handleSaveProduct"
            autocomplete="off"
            class="space-y-6"
          >
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
              <!-- 대표 이미지 + 추가 이미지 (2열) -->
              <div class="grid grid-cols-2 gap-4">
                <ImageUploader
                  v-model="productForm.imageUrl"
                  type="single"
                  label="대표 이미지"
                  :required="true"
                  :product-slug="productForm.slug"
                />
                <ImageUploader
                  v-model="productForm.images"
                  type="multiple"
                  label="추가 이미지 (선택)"
                  :required="false"
                  :max-files="10"
                  :product-slug="productForm.slug"
                />
              </div>

              <!-- 상세 이미지 업로드 -->
              <ImageUploader
                v-model="productForm.detailImages"
                type="details"
                label="상세 이미지"
                :required="true"
                :max-files="10"
                :product-slug="productForm.slug"
              />

              <!-- 상품 설명 -->
              <div class="space-y-2">
                <Label class="text-admin">
                  상품 설명 <span class="text-primary">*</span>
                </Label>
                <Textarea
                  v-model="productForm.description"
                  rows="10"
                  class="resize-y"
                  placeholder="상품에 대한 상세한 설명을 입력하세요"
                  required
                />
              </div>
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
                class="bg-primary hover:bg-primary/80 text-white font-semibold"
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

              <form
                @submit.prevent="handleSaveVariant"
                autocomplete="off"
                class="space-y-5"
              >
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
                    class="w-full bg-primary hover:bg-primary/80 text-white font-semibold"
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
                      :class="
                        variant.id === variantForm.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/20'
                      "
                      class="transition-colors group cursor-pointer"
                      @click="handleEditVariant(variant)"
                    >
                      <td class="px-6 py-4 text-tiny text-admin-muted">
                        <div class="flex items-center gap-2">
                          <span
                            v-if="variant.id === variantForm.id"
                            class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                          />
                          {{ variant.sku }}
                        </div>
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
                    :class="
                      m.id === measurementForm.id
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/20'
                    "
                    class="transition-colors cursor-pointer"
                    @click="handleEditMeasurement(m)"
                  >
                    <td class="px-6 py-4 text-caption">
                      <div class="flex items-center gap-2">
                        <span
                          v-if="m.id === measurementForm.id"
                          class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        />
                        {{ m.totalLength }}
                      </div>
                    </td>
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

              <form
                @submit.prevent="handleSaveMeasurement"
                autocomplete="off"
                class="space-y-6"
              >
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
                    class="gap-2 bg-primary hover:bg-primary/80 text-white font-semibold"
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
                  crossorigin="anonymous"
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

                    <div class="py-6">
                      <!-- Description 탭 -->
                      <div
                        v-show="previewActiveTab === 'description'"
                        class="animate-fade-in max-h-[180px] overflow-y-auto pr-2 scrollbar-thin"
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
