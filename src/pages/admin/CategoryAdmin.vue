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
const isEditMode = ref(false); // 생성 모드인지 수정 모드인지 구분
const errorMessage = ref("");

// 폼 데이터 초기값
const initialFormState = {
  id: "",
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
};

const formData = reactive({ ...initialFormState });

// [1] 데이터 불러오기
const loadData = async () => {
  try {
    isLoading.value = true;
    // 카테고리 목록 조회 API 호출
    categories.value = await fetchCategories();
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
  Object.assign(formData, initialFormState); // 폼 초기화
  errorMessage.value = "";
  isModalOpen.value = true;
};

// [3] 모달 열기 (수정)
const openEditModal = (category: any) => {
  isEditMode.value = true;
  Object.assign(formData, { ...category }); // 선택한 데이터로 폼 채우기
  errorMessage.value = "";
  isModalOpen.value = true;
};

// [4] 저장 핸들러 (생성 및 수정 공통)
const handleSave = async () => {
  try {
    errorMessage.value = "";

    // 유효성 검사
    if (!formData.name || !formData.slug) {
      errorMessage.value = "이름과 슬러그는 필수 입력 항목입니다.";
      return;
    }

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      imageUrl: formData.imageUrl,
    };

    if (isEditMode.value) {
      // 수정 모드
      await updateCategory(formData.id, payload);
      alert("카테고리가 수정되었습니다.");
    } else {
      // 생성 모드
      await createCategory(payload);
      alert("카테고리가 생성되었습니다.");
    }

    isModalOpen.value = false;
    await loadData(); // 목록 새로고침
  } catch (error: any) {
    console.error(error);
    // 슬러그 중복 등 백엔드 에러 처리
    errorMessage.value =
      error.message || "저장에 실패했습니다. (슬러그 중복 등을 확인하세요)";
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
  // 새로고침 대비 유저 정보 로드
  if (!authStore.user) await authStore.loadUser();

  // 관리자가 아니면 차단
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
        <h1 class="text-2xl font-bold text-gray-900">카테고리 관리</h1>
        <p class="text-sm text-gray-500 mt-1">
          쇼핑몰의 상품 분류(Category)를 등록하고 관리합니다.
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition font-medium text-sm flex items-center gap-2"
      >
        <span>+ 카테고리 추가</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
      ></div>
    </div>

    <div
      v-else
      class="bg-white border rounded-lg overflow-hidden shadow-sm min-h-[400px]"
    >
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
          <tr>
            <th class="px-6 py-3 w-20">이미지</th>
            <th class="px-6 py-3 w-1/4">카테고리명 (Slug)</th>
            <th class="px-6 py-3">설명</th>
            <th class="px-6 py-3 w-32 text-right">관리</th>
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
              <div class="font-bold text-gray-900">{{ category.name }}</div>
              <div class="text-xs text-gray-500">{{ category.slug }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ category.description || "-" }}
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button
                @click="openEditModal(category)"
                class="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                수정
              </button>
              <button
                @click="handleDelete(category.id)"
                class="text-red-600 hover:text-red-900 text-sm font-medium"
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
          <h2 class="text-xl font-bold mb-6 text-gray-900 border-b pb-2">
            {{ isEditMode ? "카테고리 수정" : "새 카테고리 추가" }}
          </h2>

          <form @submit.prevent="handleSave" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1"
                >카테고리명 <span class="text-red-500">*</span></label
              >
              <input
                v-model="formData.name"
                type="text"
                class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none transition"
                placeholder="예: 아우터"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1"
                >슬러그 (고유 ID) <span class="text-red-500">*</span></label
              >
              <input
                v-model="formData.slug"
                type="text"
                class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none transition"
                placeholder="예: outerwear"
                required
              />
              <p class="text-xs text-gray-500 mt-1">
                URL에 사용되는 영문 ID입니다. (중복 불가)
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1"
                >설명</label
              >
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none transition"
                placeholder="카테고리에 대한 설명을 입력하세요"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1"
                >이미지 URL</label
              >
              <input
                v-model="formData.imageUrl"
                type="text"
                class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none transition"
                placeholder="https://..."
              />
            </div>

            <div
              v-if="errorMessage"
              class="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 font-medium"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t mt-2">
              <button
                type="button"
                @click="isModalOpen = false"
                class="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-bold shadow-sm transition-colors"
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
