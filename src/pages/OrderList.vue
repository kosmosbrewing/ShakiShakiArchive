<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchOrders, fetchOrder } from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();

const orders = ref<any[]>([]);
const loading = ref(false);

// 주문 상태 한글 매핑
const statusMap: Record<string, string> = {
  pending_payment: "입금대기",
  payment_confirmed: "결제완료",
  preparing: "배송준비중",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "주문취소",
};

// 상태별 뱃지 스타일
const getStatusClass = (status: string) => {
  switch (status) {
    case "pending_payment":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "payment_confirmed":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "preparing":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    case "shipped":
      return "bg-orange-50 text-orange-700 border-orange-100";
    case "delivered":
      return "bg-green-50 text-green-700 border-green-100";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

// 데이터 로드
const loadOrders = async () => {
  loading.value = true;
  try {
    // 1. 내 주문 목록 가져오기 (기본 정보)
    const simpleOrders = await fetchOrders();

    // 2. 각 주문별 상세 상품 정보 채우기 (아이템별 상태 확인을 위해 필수)
    const detailedOrdersPromises = simpleOrders.map(async (order) => {
      try {
        const detail = await fetchOrder(order.id);
        return detail; // orderItems (status, trackingNumber 포함)가 있는 객체
      } catch (e) {
        console.error(`Order ${order.id} fetch failed`, e);
        return order;
      }
    });

    orders.value = await Promise.all(detailedOrdersPromises);
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 날짜 포맷
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(date.getDate()).padStart(2, "0")}`;
};

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    alert("로그인이 필요합니다.");
    router.replace("/login");
    return;
  }
  await loadOrders();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12">
    <h1 class="text-2xl font-bold text-gray-900 mb-8">ORDER LIST</h1>

    <div v-if="loading" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"
      ></div>
    </div>

    <div
      v-else-if="orders.length === 0"
      class="text-center py-20 bg-gray-50 rounded-lg border border-gray-100"
    >
      <p class="text-gray-500 mb-4">주문 내역이 없습니다.</p>
      <router-link
        to="/product/all"
        class="text-sm font-bold underline hover:text-gray-600"
      >
        쇼핑하러 가기
      </router-link>
    </div>

    <div v-else class="space-y-8">
      <div
        v-for="order in orders"
        :key="order.id"
        class="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
      >
        <div
          class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4"
        >
          <div class="flex items-center gap-3">
            <span class="font-bold text-lg text-gray-900">{{
              formatDate(order.createdAt)
            }}</span>
            <span class="text-xs text-gray-400">|</span>
            <span class="text-sm text-gray-500">주문번호 {{ order.id }}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-500 mr-2">총 결제금액</span>
            <span class="font-bold text-gray-900 text-lg"
              >{{ Number(order.totalAmount).toLocaleString() }}원</span
            >
          </div>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="item in order.orderItems"
            :key="item.id"
            class="p-6 flex flex-col sm:flex-row gap-6"
          >
            <div
              class="w-24 h-24 bg-gray-100 rounded border overflow-hidden flex-shrink-0 cursor-pointer"
              @click="router.push(`/product/${item.productId}`)"
            >
              <img
                v-if="item.product?.imageUrl"
                :src="item.product.imageUrl"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-xs text-gray-400"
              >
                No Img
              </div>
            </div>

            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <h3
                    class="font-bold text-gray-900 text-lg cursor-pointer hover:underline"
                    @click="router.push(`/product/${item.productId}`)"
                  >
                    {{ item.productName }}
                  </h3>
                  <span
                    :class="[
                      'px-2 py-1 rounded text-xs font-bold border',
                      getStatusClass(item.status),
                    ]"
                  >
                    {{ statusMap[item.status] || item.status }}
                  </span>
                </div>

                <p class="text-sm text-gray-600">
                  {{ Number(item.productPrice).toLocaleString() }}원 /
                  {{ item.quantity }}개
                </p>
              </div>

              <div
                class="mt-4 pt-4 border-t border-dashed border-gray-200"
                v-if="item.trackingNumber"
              >
                <p class="text-xs text-gray-500 flex items-center gap-2">
                  <span class="font-bold">🚚 운송장번호:</span>
                  <span class="font-mono bg-gray-100 px-2 py-0.5 rounded">{{
                    item.trackingNumber
                  }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50/50 border-t border-gray-200 text-sm text-gray-600"
        >
          <div class="flex gap-2">
            <span class="font-bold min-w-[60px]">받는분</span>
            <span>{{ order.shippingName }} ({{ order.shippingPhone }})</span>
          </div>
          <div class="flex gap-2 mt-1">
            <span class="font-bold min-w-[60px]">배송지</span>
            <span
              >({{ order.shippingPostalCode }})
              {{ order.shippingAddress }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
