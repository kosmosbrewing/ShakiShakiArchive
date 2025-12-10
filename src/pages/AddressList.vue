<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchDeliveryAddresses, deleteDeliveryAddress } from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();

const addresses = ref<any[]>([]);
const loading = ref(false);

const loadAddresses = async () => {
  loading.value = true;
  try {
    addresses.value = await fetchDeliveryAddresses();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm("해당 배송지를 삭제하시겠습니까?")) return;

  try {
    await deleteDeliveryAddress(id);
    addresses.value = addresses.value.filter((addr) => addr.id !== id);
  } catch (error: any) {
    alert("삭제 실패: " + error.message);
  }
};

// [신규] 수정 버튼 핸들러 (추후 모달 연동 등 기능 구현 필요)
const handleEdit = (addr: any) => {
  alert(`'${addr.recipient}'님의 배송지 수정 기능을 준비 중입니다.`);
  // 여기에 수정 모달을 띄우거나 수정 페이지로 이동하는 로직을 추가하면 됩니다.
};

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    alert("로그인이 필요합니다.");
    router.replace("/login");
    return;
  }
  loadAddresses();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="border-b border-gray-900 pb-4 mb-8">
      <h1 class="text-2xl font-bold text-gray-900">ADDRESS BOOK</h1>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
      ></div>
    </div>

    <div
      v-else-if="addresses.length === 0"
      class="text-center py-20 bg-gray-50 rounded-lg"
    >
      <p class="text-gray-500 mb-4">등록된 배송지가 없습니다.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="addr in addresses"
        :key="addr.id"
        class="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:border-gray-400 transition-colors flex flex-col justify-between"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-gray-900">{{
                addr.recipient
              }}</span>
              <span
                v-if="addr.isDefault"
                class="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold whitespace-nowrap"
              >
                기본 배송지
              </span>
            </div>
            <span class="text-sm text-gray-500">{{ addr.phone }}</span>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="handleEdit(addr)"
              class="text-xs text-gray-500 hover:text-blue-600 underline transition-colors"
            >
              수정
            </button>
            <span class="text-gray-300">|</span>
            <button
              @click="handleDelete(addr.id)"
              class="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
            >
              삭제
            </button>
          </div>
        </div>

        <div class="text-sm text-gray-800 space-y-1 mb-4 min-h-[60px]">
          <p class="text-gray-500">({{ addr.zipCode }})</p>
          <p>{{ addr.address }}</p>
          <p>{{ addr.detailAddress }}</p>
        </div>

        <div v-if="addr.requestNote" class="mt-auto">
          <p
            class="text-xs text-blue-600 bg-blue-50 p-2 rounded inline-block w-full truncate"
          >
            "{{ addr.requestNote }}"
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
