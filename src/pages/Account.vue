<script setup lang="ts">
import { onMounted, computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchOrders, fetchOrder } from "@/lib/api"; // [추가] API 함수 임포트

const router = useRouter();
const authStore = useAuthStore();

// [신규] 주문 상태 카운트 상태값
const orderCounts = reactive({
  pending: 0, // 입금전 (pending_payment)
  preparing: 0, // 배송준비중 (preparing)
  shipped: 0, // 배송중 (shipped)
  delivered: 0, // 배송완료 (delivered)
});

// 유저 이름 표시
const userName = computed(() => {
  if (authStore.user) {
    return `${authStore.user.userName}`;
  }
  return "고객";
});

// 페이지 이동 함수들
const goToModify = () => router.push("/modify");
const goToOrderList = () => router.push("/orderlist");
const goToWishlist = () => router.push("/wishlist");
const goToAddress = () => router.push("/addresslist");

// 관리자용 페이지 이동
const goToCategoryAdmin = () => router.push("/admin/categories");
const goToProductAdmin = () => router.push("/admin/products");
const goToOrderAdmin = () => router.push("/admin/orders");

// [신규] 주문 데이터 로드 및 상태 카운트 계산
const loadOrderStats = async () => {
  try {
    // 1. 내 주문 목록 조회
    const orders = await fetchOrders();

    // 2. 각 주문의 상세 아이템 정보(상태 포함) 조회
    // (상품 단위 상태 관리를 위해 상세 정보를 모두 가져와서 집계합니다)
    const detailsPromises = orders.map((order) => fetchOrder(order.id));
    const ordersWithItems = await Promise.all(detailsPromises);

    // 3. 상태별 개수 초기화
    orderCounts.pending = 0;
    orderCounts.preparing = 0;
    orderCounts.shipped = 0;
    orderCounts.delivered = 0;

    // 4. 모든 상품(Item)의 상태를 순회하며 카운트
    ordersWithItems.forEach((order: any) => {
      if (order && order.orderItems) {
        order.orderItems.forEach((item: any) => {
          switch (item.status) {
            case "pending_payment":
              orderCounts.pending++;
              break;
            case "payment_confirmed": // 결제완료도 배송준비 전 단계로 포함하거나 별도 표기 (여기선 배송준비로 합침 or 입금전 유지)
            case "preparing":
              orderCounts.preparing++;
              break;
            case "shipped":
              orderCounts.shipped++;
              break;
            case "delivered":
              orderCounts.delivered++;
              break;
          }
        });
      }
    });
  } catch (error) {
    console.error("주문 현황 로드 실패:", error);
  }
};

onMounted(async () => {
  if (!authStore.user) {
    await authStore.loadUser();
  }
  // [추가] 데이터 로드 실행
  if (authStore.isAuthenticated) {
    loadOrderStats();
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
      <div
        @click="goToOrderList"
        class="flex-1 border-r border-gray-100 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
      >
        <div class="text-xs text-gray-500 mb-3">입금전</div>
        <div class="text-lg font-bold">{{ orderCounts.pending }}</div>
      </div>

      <div
        @click="goToOrderList"
        class="flex-1 border-r border-gray-100 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
      >
        <div class="text-xs text-gray-500 mb-3">배송준비중</div>
        <div class="text-lg font-bold">{{ orderCounts.preparing }}</div>
      </div>

      <div
        @click="goToOrderList"
        class="flex-1 border-r border-gray-100 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
      >
        <div class="text-xs text-gray-500 mb-3">배송중</div>
        <div class="text-lg font-bold">{{ orderCounts.shipped }}</div>
      </div>

      <div
        @click="goToOrderList"
        class="flex-1 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
      >
        <div class="text-xs text-gray-500 mb-3">배송완료</div>
        <div class="text-lg font-bold">{{ orderCounts.delivered }}</div>
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
        <button
          @click="goToOrderAdmin"
          class="bg-blue-900 text-white px-4 py-2 rounded text-xs hover:bg-blue-800"
        >
          🚚 주문 관리
        </button>
      </div>
    </div>
  </div>
</template>
