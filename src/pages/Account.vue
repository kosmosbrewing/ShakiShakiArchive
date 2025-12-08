<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

// 유저 이름 표시 (없으면 '고객'님)
const userName = computed(() => {
  if (authStore.user) {
    return `${authStore.user.userName}`;
  }
  return "고객";
});

// 페이지 이동 함수들
const goToModify = () => router.push("/modify"); // PROFILE -> 수정 페이지
const goToOrderList = () => router.push("/order-list"); // ORDER -> 주문 내역 (가상의 경로)
const goToWishlist = () => router.push("/wishlist"); // WISHLIST -> 위시리스트 (가상의 경로)
const goToAddress = () => router.push("/address"); // ADDRESS -> 배송지 관리 (가상의 경로)

// 관리자용 페이지 이동
const goToCategoryAdmin = () => router.push("/admin/categories");
const goToProductAdmin = () => router.push("/admin/product");

onMounted(async () => {
  // 유저 정보가 없으면 로드
  if (!authStore.user) {
    await authStore.loadUser();
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-16 text-gray-900">
    <div class="mb-16">
      <h1 class="text-sm font-bold uppercase tracking-widest">My Page</h1>
    </div>

    <div class="text-center text-xl mb-12">
      <span class="font-bold">{{ userName }}님</span>은
      <span class="font-bold">일반회원</span>입니다.
    </div>

    <div class="border border-gray-400 flex mb-12 h-32">
      <div
        class="flex-1 border-r border-gray-200 flex flex-col justify-center items-center"
      ></div>
      <div class="flex-1 flex flex-col justify-center items-center">
        <span class="text-sm font-bold text-blue-600 mb-2">쿠폰</span>
        <span class="text-xl font-bold">0장</span>
      </div>
    </div>

    <div class="flex justify-between text-center mb-20 px-4 md:px-10">
      <div class="flex-1 border-r border-gray-100 last:border-0">
        <div class="text-xs text-gray-500 mb-3">입금전</div>
        <div class="text-lg font-bold">0</div>
      </div>
      <div class="flex-1 border-r border-gray-100 last:border-0">
        <div class="text-xs text-gray-500 mb-3">배송준비중</div>
        <div class="text-lg font-bold">0</div>
      </div>
      <div class="flex-1 border-r border-gray-100 last:border-0">
        <div class="text-xs text-gray-500 mb-3">배송중</div>
        <div class="text-lg font-bold">0</div>
      </div>
      <div class="flex-1 last:border-0">
        <div class="text-xs text-gray-500 mb-3">배송완료</div>
        <div class="text-lg font-bold">0</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
      <button
        @click="goToOrderList"
        class="border border-gray-400 py-6 flex justify-center items-center hover:bg-gray-50 transition-colors"
      >
        <span class="text-sm font-medium">ORDER</span>
      </button>

      <button
        @click="goToWishlist"
        class="border border-gray-400 py-6 flex justify-center items-center hover:bg-gray-50 transition-colors"
      >
        <span class="text-sm font-medium">WISHLIST(0)</span>
      </button>

      <button
        @click="goToModify"
        class="border border-gray-400 py-6 flex justify-center items-center hover:bg-gray-50 transition-colors"
      >
        <span class="text-sm font-medium">PROFILE</span>
      </button>

      <button
        @click="goToAddress"
        class="border border-gray-400 py-6 flex justify-center items-center hover:bg-gray-50 transition-colors"
      >
        <span class="text-sm font-medium">ADDRESS</span>
      </button>
    </div>

    <div v-if="authStore.user?.isAdmin" class="border-t border-gray-200 pt-8">
      <h3 class="text-xs font-bold text-gray-400 uppercase mb-4">Admin Menu</h3>
      <div class="flex gap-3">
        <button
          @click="goToCategoryAdmin"
          class="bg-gray-800 text-white px-4 py-2 rounded text-xs hover:bg-gray-700"
        >
          📂 카테고리 관리
        </button>
        <button
          @click="goToProductAdmin"
          class="bg-black text-white px-4 py-2 rounded text-xs hover:bg-gray-800"
        >
          🛠 상품 관리
        </button>
      </div>
    </div>
  </div>
</template>
