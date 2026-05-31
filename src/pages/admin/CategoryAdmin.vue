// src/pages/admin/CategoryAdmin.vue
<script setup lang="ts">
import { ref, onMounted, reactive, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";

// 아이콘 및 UI 컴포넌트 (디자인 통일용)
import { Package, Plus, Trash2, Edit3, X } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common";
import { AdminNavigationTabs } from "@/components/admin";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

const categories = ref<any[]>([]);
const isLoading = ref(true);
const hasLoadedOnce = ref(false);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const errorMessage = ref("");
const isSlugManuallyEdited = ref(false);

// 삭제 확인 다이얼로그 상태
const showDeleteConfirm = ref(false);
const deleteTargetId = ref<string>("");

const initialFormState = {
  id: "",
  name: "",
  categoryId: "",
  slug: "",
  description: "",
  imageUrl: "",
};

const formData = reactive({ ...initialFormState });

const normalizeSlug = (value: string): string =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const shouldKeepSlugManual = (category: any): boolean => {
  const currentSlug = normalizeSlug(category.slug || "");
  const generatedSlug = normalizeSlug(category.name || "");
  return Boolean(currentSlug && generatedSlug && currentSlug !== generatedSlug);
};

const loadData = async () => {
  try {
    isLoading.value = true;
    const data = await fetchAdminCategories();
    categories.value = data.sort((a: any, b: any) => {
      const idA = a.id ?? Number.MAX_SAFE_INTEGER;
      const idB = b.id ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });
  } catch (error) {
    console.error("데이터 로딩 실패:", error);
  } finally {
    isLoading.value = false;
    hasLoadedOnce.value = true;
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  isSlugManuallyEdited.value = false;
  Object.assign(formData, initialFormState);
  errorMessage.value = "";
  isModalOpen.value = true;
};

const openEditModal = (category: any) => {
  isEditMode.value = true;
  isSlugManuallyEdited.value = shouldKeepSlugManual(category);
  Object.assign(formData, {
    ...category,
    categoryId: category.id || category.categoryId || "",
    slug: normalizeSlug(category.slug || ""),
  });
  errorMessage.value = "";
  isModalOpen.value = true;
};

const handleNumericInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const numericValue = target.value.replace(/[^0-9]/g, "");
  formData.categoryId = numericValue;
  target.value = numericValue;
};

const handleIdBlur = () => {
  if (formData.categoryId && !formData.slug) {
    formData.slug = formData.categoryId;
  }
};

const handleSlugInput = (e: Event) => {
  isSlugManuallyEdited.value = true;
  const target = e.target as HTMLInputElement;
  const slug = normalizeSlug(target.value);
  formData.slug = slug;
  target.value = slug;
};

watch(
  () => formData.name,
  (name) => {
    if (!isModalOpen.value || isSlugManuallyEdited.value) return;
    const generatedSlug = normalizeSlug(name);
    if (generatedSlug) {
      formData.slug = generatedSlug;
    }
  }
);

const handleSave = async () => {
  try {
    errorMessage.value = "";
    if (!formData.name || !formData.categoryId) {
      errorMessage.value = ADMIN_MESSAGES.categoryIdAndNameRequired;
      return;
    }
    const payload = {
      id: Number(formData.categoryId),
      name: formData.name,
      slug: normalizeSlug(formData.slug) || formData.categoryId.toString(),
      description: formData.description,
      imageUrl: formData.imageUrl,
    };

    if (isEditMode.value) {
      await updateCategory(formData.id, payload);
      showAlert(ADMIN_MESSAGES.categoryUpdateSuccess);
    } else {
      await createCategory(payload);
      showAlert(ADMIN_MESSAGES.categoryCreateSuccess);
    }
    isModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    errorMessage.value =
      error.message ||
      (isEditMode.value
        ? ADMIN_MESSAGES.categoryUpdateFailed
        : ADMIN_MESSAGES.categoryCreateFailed);
  }
};

const handleDelete = (id: string) => {
  deleteTargetId.value = id;
  showDeleteConfirm.value = true;
};

const handleConfirmDelete = async () => {
  showDeleteConfirm.value = false;
  try {
    await deleteCategory(deleteTargetId.value);
    await loadData();
  } catch (error: any) {
    showAlert(ADMIN_MESSAGES.saveFailed.replace("{message}", error.message), { type: "error" });
  }
};

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
  <div class="category-admin-page w-11/12 max-w-screen-2xl mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
    <AdminNavigationTabs />
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h3 class="text-heading text-admin tracking-wider">카테고리 관리</h3>
        <p class="mt-1 mb-3 text-body text-admin-muted">
          총
          <span class="text-body font-bold text-admin">{{ categories.length }}</span>개 카테고리
          <span class="text-caption text-admin-muted">/ 상품 분류 체계 관리</span>
        </p>
      </div>
      <Button
        @click="openCreateModal"
        class="mb-2 gap-2 bg-primary hover:bg-primary/80 text-white font-semibold"
      >
        <Plus class="w-4 h-4" />
        추가
      </Button>
    </div>
    <Separator class="mb-4 bg-border/70"></Separator>

    <LoadingSpinner v-if="isLoading && !hasLoadedOnce" />

    <Card v-else class="overflow-hidden border-x-0 border-y border-border/70 bg-card shadow-none">
      <div
        v-if="isLoading && hasLoadedOnce"
        class="border-b border-border/70 bg-card px-6 py-3 text-caption text-admin-muted"
      >
        카테고리 목록 업데이트 중...
      </div>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="category-admin-table w-full min-w-[820px] border-separate border-spacing-0 text-left">
            <thead
              class="border-b border-border/70 bg-transparent text-caption font-semibold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-5 py-2.5 w-20">이미지</th>
                <th class="px-5 py-2.5 w-1/3">분류 정보</th>
                <th class="px-5 py-2.5 hidden sm:table-cell">설명</th>
                <th class="px-5 py-2.5 text-right w-28">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="category in categories"
                :key="category.id"
                class="group transition-colors hover:bg-primary/[0.03]"
              >
                <td class="px-5 py-2.5">
                  <div
                    class="h-10 w-10 overflow-hidden border border-border/70 bg-muted/20 transition-colors group-hover:border-primary/20"
                  >
                    <img
                      v-if="category.imageUrl"
                      :src="category.imageUrl"
                      class="h-full w-full object-cover"
                      crossorigin="anonymous"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-admin-muted"
                    >
                      <Package class="w-5 h-5 opacity-30" />
                    </div>
                  </div>
                </td>
                <td class="px-5 py-2.5">
                  <div class="text-[14px] font-medium leading-[1.25] text-admin">
                    {{ category.name }}
                  </div>
                  <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] leading-[1.2] text-admin-muted">
                    <span class="border border-border/60 bg-background px-1.5 py-0.5 font-mono"
                      >ID: {{ category.id }}</span
                    >
                    <span class="border border-border/60 bg-background px-1.5 py-0.5 font-mono"
                      >Slug: {{ category.slug }}</span
                    >
                  </div>
                </td>
                <td
                  class="hidden max-w-xs truncate px-5 py-2.5 text-[12px] leading-[1.25] text-admin-muted sm:table-cell"
                >
                  {{ category.description || "-" }}
                </td>
                <td class="px-5 py-2.5 text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditModal(category)"
                      class="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="handleDelete(category.id)"
                      class="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              <tr v-if="categories.length === 0">
                <td colspan="4" class="px-6 py-16 text-center text-admin-muted">
                  <Package class="w-12 h-12 mx-auto mb-3 opacity-10" />
                  등록된 카테고리가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="w-full max-w-lg overflow-hidden border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <div class="flex justify-between items-center mb-8 border-b pb-4">
            <h2 class="text-heading font-bold text-admin tracking-tight">
              {{ isEditMode ? "카테고리 정보 수정" : "새 카테고리 등록" }}
            </h2>
            <Button variant="ghost" size="icon" @click="isModalOpen = false">
              <X class="w-5 h-5" />
            </Button>
          </div>

          <form
            @submit.prevent="handleSave"
            autocomplete="off"
            class="space-y-6"
          >
            <div class="space-y-2">
              <Label class="text-admin">
                카테고리명 <span class="text-primary">*</span>
              </Label>
              <Input
                v-model="formData.name"
                type="text"
                placeholder="예: Outerwear"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label class="text-admin">
                  Category ID (숫자) <span class="text-primary">*</span>
                </Label>
                <Input
                  v-model="formData.categoryId"
                  @input="handleNumericInput"
                  @blur="handleIdBlur"
                  type="text"
                  placeholder="1"
                  required
                />
              </div>

              <div class="space-y-2">
                <Label class="text-admin">
                  Slug (URL용) <span class="text-primary">*</span>
                </Label>
                <Input
                  v-model="formData.slug"
                  @input="handleSlugInput"
                  type="text"
                  placeholder="outerwear"
                />
              </div>

              <p
                class="col-span-2 text-caption text-admin-muted mt-1 px-1 leading-relaxed"
              >
                * ID는 고유 숫자여야 하며, Slug는 미입력 시 ID와 동일하게
                저장됩니다. Slug 변경 시 URL도 바뀌며, 직접 접속/검색 반영은 다음 배포 후 완료됩니다.
              </p>
            </div>

            <div class="space-y-2">
              <Label class="text-admin">설명</Label>
              <Textarea
                v-model="formData.description"
                rows="3"
                class="resize-none"
                placeholder="카테고리에 대한 간략한 설명을 입력하세요"
              />
            </div>

            <div class="space-y-2">
              <Label class="text-admin">이미지 URL</Label>
              <Input
                v-model="formData.imageUrl"
                type="text"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <AlertDescription v-if="errorMessage" class="animate-pulse">
              {{ errorMessage }}
            </AlertDescription>

            <div
              class="flex justify-end gap-3 pt-6 mt-4 border-t border-border"
            >
              <Button
                type="button"
                variant="outline"
                class="font-medium"
                @click="isModalOpen = false"
              >
                취소
              </Button>
              <Button
                type="submit"
                class="bg-primary hover:bg-primary/80 text-white font-semibold"
              >
                {{ isEditMode ? "저장하기" : "등록하기" }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 다이얼로그 -->
    <Alert
      v-if="showDeleteConfirm"
      :confirm-mode="true"
      confirm-variant="destructive"
      message="정말 이 카테고리를 삭제하시겠습니까?"
      confirm-text="삭제"
      cancel-text="취소"
      @confirm="handleConfirmDelete"
      @cancel="showDeleteConfirm = false"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.category-admin-page :deep(input),
.category-admin-page :deep([role="combobox"]) {
  border-radius: 0;
  border-color: hsl(var(--border) / 0.7);
  background: hsl(var(--card));
  box-shadow: none;
}

.category-admin-page :deep(input:focus-visible),
.category-admin-page :deep([role="combobox"]:focus) {
  outline: none;
  box-shadow: none;
}

.category-admin-table th,
.category-admin-table td {
  border-left: 1px solid hsl(var(--border) / 0.42);
  vertical-align: middle;
}

.category-admin-table th:first-child,
.category-admin-table td:first-child {
  border-left: 0;
}

.category-admin-table tbody td {
  border-top: 1px solid hsl(var(--border) / 0.62);
}

.category-admin-table thead th {
  line-height: 1.2;
}
</style>
