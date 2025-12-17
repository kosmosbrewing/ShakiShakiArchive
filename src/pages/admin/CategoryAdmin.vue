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

const router = useRouter();
const authStore = useAuthStore();

// 상태 관리 Variables
const categories = ref<any[]>([]);
const isLoading = ref(false);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const errorMessage = ref("");

// 폼 데이터 초기값
const initialFormState = {
  id: "",
  name: "",
  categoryId: "", // 숫자 ID
  slug: "", // [추가] 문자열 슬러그
  description: "",
  imageUrl: "",
};

const formData = reactive({ ...initialFormState });

// [1] 데이터 불러오기
const loadData = async () => {
  try {
    isLoading.value = true;
    const data = await fetchCategories();

    // [수정] Category ID(숫자) 기준 오름차순 정렬
    categories.value = data.sort((a: any, b: any) => {
      // a.id가 없으면(신규 등) 뒤로, 있으면 숫자 비교
      const idA = a.id ?? Number.MAX_SAFE_INTEGER;
      const idB = b.id ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });
  } catch (error) {
    console.error("데이터 로딩 실패:", error);
    alert("데이터를 불러오는 중 오류가 발생했습니다.");
  } finally {
    isLoading.value = false;
  }
};

// [2] 모달 열기 (생성)
const openCreateModal = () => {
  isEditMode.value = false;
  Object.assign(formData, initialFormState);
  errorMessage.value = "";
  isModalOpen.value = true;
};

// [3] 모달 열기 (수정)
const openEditModal = (category: any) => {
  isEditMode.value = true;
  // 기존 데이터 매핑
  Object.assign(formData, {
    ...category,
    // 백엔드에서 id로 넘어오거나 categoryId로 넘어오는 경우 모두 대응
    categoryId: category.id || category.categoryId || "",
    slug: category.slug || "", // [추가] 슬러그 매핑
  });
  errorMessage.value = "";
  isModalOpen.value = true;
};

// 숫자 입력 강제 핸들러 (ID용)
const handleNumericInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const numericValue = target.value.replace(/[^0-9]/g, "");
  formData.categoryId = numericValue;
  target.value = numericValue;
};

// [추가] 슬러그 자동 생성 (ID 입력 시 슬러그가 비어있으면 ID로 채움)
const handleIdBlur = () => {
  if (formData.categoryId && !formData.slug) {
    formData.slug = formData.categoryId;
  }
};

// [4] 저장 핸들러
const handleSave = async () => {
  try {
    errorMessage.value = "";

    if (!formData.name || !formData.categoryId) {
      errorMessage.value = "이름과 Category ID는 필수 입력 항목입니다.";
      return;
    }

    const payload = {
      id: Number(formData.categoryId), // ID는 숫자로
      name: formData.name,
      // 슬러그가 입력되지 않았다면 ID를 문자열로 변환해 사용
      slug: formData.slug
        ? formData.slug.trim()
        : formData.categoryId.toString(),
      description: formData.description,
      imageUrl: formData.imageUrl,
    };

    if (isEditMode.value) {
      await updateCategory(formData.id, payload); // formData.id는 수정 대상의 기존 식별자
      alert("카테고리가 수정되었습니다.");
    } else {
      await createCategory(payload);
      alert("카테고리가 생성되었습니다.");
    }

    isModalOpen.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    errorMessage.value =
      error.message || "저장에 실패했습니다. (ID/Slug 중복 등을 확인하세요)";
  }
};

// [5] 삭제 핸들러
const handleDelete = async (id: string) => {
  if (
    confirm(
      "정말 이 카테고리를 삭제하시겠습니까?\n주의: 해당 카테고리에 속한 상품의 분류 정보가 사라질 수 있습니다."
    )
  ) {
    try {
      await deleteCategory(id);
      await loadData();
    } catch (error: any) {
      alert("삭제 실패: " + error.message);
    }
  }
};

// [6] 초기화
onMounted(async () => {
  if (!authStore.user) await authStore.loadUser();

  if (!authStore.user?.isAdmin) {
    alert("관리자 권한이 필요합니다.");
    router.replace("/");
    return;
  }

  loadData();
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text heading text-admin font-bold">카테고리 관리</h1>
        <p class="text-body text-admin text-gray-500 mt-1">
          쇼핑몰의 상품 분류(Category)를 등록하고 관리합니다.
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="bg-admin text-body text-white px-4 py-2 rounded-md hover:bg-gray-800 transition font-medium flex items-center gap-2"
      >
        <span>+ 카테고리 추가</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto"></div>
    </div>

    <div
      v-else
      class="bg-white border rounded-lg overflow-hidden shadow-sm min-h-[400px]"
    >
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-admin font-bold text-gray-500 uppercase">
          <tr>
            <th class="px-6 py-3 w-20 text-body font-bold">이미지</th>
            <th class="px-6 py-3 w-1/3 text-body font-bold">카테고리 정보</th>
            <th class="px-6 py-3 text-body font-bold">설명</th>
            <th class="px-6 py-3 w-32 text-body font-bold text-right">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="category in categories"
            :key="category.id"
            class="hover:bg-gray-50"
          >
            <td class="px-6 py-4">
              <div class="h-10 w-10 bg-gray-100 rounded overflow-hidden border">
                <img
                  v-if="category.imageUrl"
                  :src="category.imageUrl"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="h-full w-full flex items-center justify-center text-gray-400 text-[10px]"
                >
                  No Img
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-body text-admin font-bold">
                {{ category.name }}
              </div>
              <div class="flex flex-col text-xs mt-0.5">
                <span class="text-caption text-admin-muted"
                  >ID: {{ category.id || category.categoryId }}</span
                >
                <span class="text-caption text-admin-muted"
                  >Slug: {{ category.slug }}</span
                >
              </div>
            </td>
            <td class="px-6 py-4 text-body text-admin">
              {{ category.description || "-" }}
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button
                @click="openEditModal(category)"
                class="text-body text-blue-600 hover:text-blue-900 font-medium"
              >
                수정
              </button>
              <button
                @click="handleDelete(category.id)"
                class="text-body text-red-600 hover:text-red-900 font-medium"
              >
                삭제
              </button>
            </td>
          </tr>
          <tr v-if="categories.length === 0">
            <td colspan="4" class="px-6 py-10 text-center text-gray-500">
              등록된 카테고리가 없습니다.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        <div class="p-6">
          <h2 class="text-xl font-bold mb-6 text-admin border-b pb-2">
            {{ isEditMode ? "카테고리 수정" : "새 카테고리 추가" }}
          </h2>

          <form @submit.prevent="handleSave" class="space-y-5">
            <div>
              <label class="block text-body text-admin font-semibold mb-1" s
                >카테고리명 <span class="text-red-500">*</span></label
              >
              <input
                v-model="formData.name"
                type="text"
                class="w-full border border-gray-300 rounded-md p-2 text-body text-admin focus:ring-2 focus:ring-gray-900 outline-none transition"
                placeholder="예: 아우터"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-body text-admin font-semibold mb-1"
                  >Category ID (숫자) <span class="text-red-500">*</span></label
                >
                <input
                  v-model="formData.categoryId"
                  @input="handleNumericInput"
                  @blur="handleIdBlur"
                  type="text"
                  class="w-full border border-gray-300 rounded-md p-2 text-body text-admin focus:ring-2 focus:ring-gray-900 outline-none transition"
                  placeholder="예: 100"
                  required
                />
              </div>

              <div>
                <label
                  class="block text-body text-admin font-semibold text-gray-700 mb-1"
                  >Slug (URL용) <span class="text-red-500">*</span></label
                >
                <input
                  v-model="formData.slug"
                  type="text"
                  class="w-full border border-gray-300 rounded-md p-2 text-body text-admin focus:ring-2 focus:ring-gray-900 outline-none transition"
                  placeholder="예: outerwear"
                />
              </div>
              <p class="col-span-2 text-caption text-admin-muted -mt-2">
                * ID는 고유 숫자여야 하며, Slug는 미입력 시 ID와 동일하게
                저장됩니다.
              </p>
            </div>

            <div>
              <label
                class="block text-body text-admin font-semibold text-gray-700 mb-1"
                >설명</label
              >
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full border border-gray-300 rounded-md p-2 text-body text-admin focus:ring-2 focus:ring-gray-900 outline-none resize-none transition"
                placeholder="카테고리에 대한 설명을 입력하세요"
              ></textarea>
            </div>

            <div>
              <label
                class="block text-body text-admin font-semibold text-gray-700 mb-1"
                >이미지 URL</label
              >
              <input
                v-model="formData.imageUrl"
                type="text"
                class="w-full border border-gray-300 rounded-md p-2 text-body text-admin focus:ring-2 focus:ring-gray-900 outline-none transition"
                placeholder="https://..."
              />
            </div>

            <div
              v-if="errorMessage"
              class="bg-red-50 text-red-600 text-body text-admin p-3 rounded-md border border-red-200 font-medium"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t mt-2">
              <button
                type="button"
                @click="isModalOpen = false"
                class="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-body text-admin font-medium transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-body font-medium shadow-sm transition-colors"
              >
                {{ isEditMode ? "수정 사항 저장" : "추가하기" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
