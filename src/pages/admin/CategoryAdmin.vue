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
import { Settings, Package, Plus, Trash2, Edit3 } from "lucide-vue-next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const router = useRouter();
const authStore = useAuthStore();

const categories = ref<any[]>([]);
const isLoading = ref(false);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const errorMessage = ref("");

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

const handleDelete = async (id: string) => {
  if (confirm("정말 이 카테고리를 삭제하시겠습니까?")) {
    try {
      await deleteCategory(id);
      await loadData();
    } catch (error: any) {
      alert("삭제 실패: " + error.message);
    }
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
      <button
        @click="openCreateModal"
        class="mb-2 bg-admin text-white px-4 py-2 rounded-md hover:opacity-90 transition-all text-body font-medium flex items-center gap-2 shadow-sm"
      >
        <Plus class="w-4 h-4" />
        <span>추가</span>
      </button>
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
                    <button
                      @click="openEditModal(category)"
                      class="p-2 text-admin-muted hover:text-primary transition-colors"
                      title="수정"
                    >
                      <Edit3 class="w-4 h-4" />
                    </button>
                    <button
                      @click="handleDelete(category.id)"
                      class="p-2 text-admin-muted hover:text-destructive transition-colors"
                      title="삭제"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
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
            <button
              @click="isModalOpen = false"
              class="text-admin-muted hover:text-admin transition-colors"
            >
              <Plus class="w-6 h-6 rotate-45" />
            </button>
          </div>

          <form @submit.prevent="handleSave" class="space-y-6">
            <div>
              <label
                class="block text-body text-admin font-semibold mb-2 ml-0.5"
              >
                카테고리명 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                class="w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                placeholder="예: Outerwear"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >
                  Category ID (숫자) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.categoryId"
                  @input="handleNumericInput"
                  @blur="handleIdBlur"
                  type="text"
                  class="w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                  placeholder="1"
                  required
                />
              </div>

              <div>
                <label
                  class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >
                  Slug (URL용) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.slug"
                  type="text"
                  class="w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
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

            <div>
              <label
                class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >설명</label
              >
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all shadow-sm"
                placeholder="카테고리에 대한 간략한 설명을 입력하세요"
              ></textarea>
            </div>

            <div>
              <label
                class="block text-body text-admin font-semibold mb-2 ml-0.5"
                >이미지 URL</label
              >
              <input
                v-model="formData.imageUrl"
                type="text"
                class="w-full border border-border rounded-xl p-3 text-body text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
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
              <button
                type="button"
                @click="isModalOpen = false"
                class="px-6 py-3 border border-border rounded-xl text-admin-muted hover:bg-muted transition-all text-body font-medium"
              >
                취소
              </button>
              <button
                type="submit"
                class="px-8 py-3 bg-admin text-white rounded-xl hover:opacity-90 transition-all text-body font-bold shadow-md shadow-primary/20"
              >
                {{ isEditMode ? "저장하기" : "등록하기" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 애니메이션 등 필요한 스타일이 있다면 추가 */
</style>
