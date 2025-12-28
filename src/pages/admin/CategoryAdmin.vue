// src/pages/admin/CategoryAdmin.vue
<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  fetchCategories,
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
import { Alert } from "@/components/ui/alert";

const router = useRouter();
const authStore = useAuthStore();

const categories = ref<any[]>([]);
const isLoading = ref(false);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const errorMessage = ref("");

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

const loadData = async () => {
  try {
    isLoading.value = true;
    const data = await fetchCategories();
    categories.value = data.sort((a: any, b: any) => {
      const idA = a.id ?? Number.MAX_SAFE_INTEGER;
      const idB = b.id ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });
  } catch (error) {
    console.error("데이터 로딩 실패:", error);
  } finally {
    isLoading.value = false;
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  Object.assign(formData, initialFormState);
  errorMessage.value = "";
  isModalOpen.value = true;
};

const openEditModal = (category: any) => {
  isEditMode.value = true;
  Object.assign(formData, {
    ...category,
    categoryId: category.id || category.categoryId || "",
    slug: category.slug || "",
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

const handleSave = async () => {
  try {
    errorMessage.value = "";
    if (!formData.name || !formData.categoryId) {
      errorMessage.value = "이름과 Category ID는 필수 입력 항목입니다.";
      return;
    }
    const payload = {
      id: Number(formData.categoryId),
      name: formData.name,
      slug: formData.slug
        ? formData.slug.trim()
        : formData.categoryId.toString(),
      description: formData.description,
      imageUrl: formData.imageUrl,
    };

    if (isEditMode.value) {
      await updateCategory(formData.id, payload);
      alert("카테고리가 수정되었습니다.");
    } else {
      await createCategory(payload);
      alert("카테고리가 생성되었습니다.");
    }
    isModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    errorMessage.value = error.message || "저장에 실패했습니다.";
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
    alert("삭제 실패: " + error.message);
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
  <div class="max-w-4xl mx-auto px-4 py-24 sm:py-16">
    <div class="flex justify-between items-end">
      <div>
        <h3 class="text-heading text-admin tracking-wider">카테고리 관리</h3>
        <p class="text-caption text-admin-muted mt-1 mb-3">
          상품 분류 체계를 구성하고 관리합니다.
        </p>
      </div>
      <Button @click="openCreateModal" class="mb-2 gap-2">
        <Plus class="w-4 h-4" />
        추가
      </Button>
    </div>
    <Separator class="mb-6"></Separator>

    <div v-if="isLoading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"
      ></div>
    </div>

    <Card v-else class="overflow-hidden border-none shadow-md">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-4 w-20">이미지</th>
                <th class="px-6 py-4">분류 정보</th>
                <th class="px-6 py-4 hidden sm:table-cell">설명</th>
                <th class="px-6 py-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="category in categories"
                :key="category.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-6 py-4">
                  <div
                    class="h-12 w-12 bg-muted rounded-lg overflow-hidden border border-border shadow-sm"
                  >
                    <img
                      v-if="category.imageUrl"
                      :src="category.imageUrl"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-admin-muted"
                    >
                      <Package class="w-5 h-5 opacity-30" />
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-body font-bold text-admin">
                    {{ category.name }}
                  </div>
                  <div class="flex gap-2 text-tiny text-admin-muted mt-0.5">
                    <span class="bg-muted px-1.5 py-0.5 rounded"
                      >ID: {{ category.id }}</span
                    >
                    <span class="bg-muted px-1.5 py-0.5 rounded"
                      >Slug: {{ category.slug }}</span
                    >
                  </div>
                </td>
                <td
                  class="px-6 py-4 text-caption text-admin-muted hidden sm:table-cell max-w-xs truncate"
                >
                  {{ category.description || "-" }}
                </td>
                <td class="px-6 py-4 text-right">
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
        class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"
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

          <form @submit.prevent="handleSave" class="space-y-6">
            <div class="space-y-2">
              <Label class="text-admin">
                카테고리명 <span class="text-red-500">*</span>
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
                  Category ID (숫자) <span class="text-red-500">*</span>
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
                  Slug (URL용) <span class="text-red-500">*</span>
                </Label>
                <Input
                  v-model="formData.slug"
                  type="text"
                  placeholder="outerwear"
                />
              </div>

              <p
                class="col-span-2 text-caption text-admin-muted mt-1 px-1 leading-relaxed"
              >
                * ID는 고유 숫자여야 하며, Slug는 미입력 시 ID와 동일하게
                저장됩니다.
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

            <div
              v-if="errorMessage"
              class="bg-destructive/10 text-destructive text-caption p-3 rounded-lg border border-destructive/20 font-medium animate-pulse"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div
              class="flex justify-end gap-3 pt-6 mt-4 border-t border-border"
            >
              <Button
                type="button"
                variant="outline"
                @click="isModalOpen = false"
              >
                취소
              </Button>
              <Button type="submit">
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
/* 애니메이션 등 필요한 스타일이 있다면 추가 */
</style>
