<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchAdminOrders, updateAdminOrderItem } from "@/lib/api"; // 함수명 변경 확인

const router = useRouter();
const authStore = useAuthStore();

const orders = ref<any[]>([]);
const loading = ref(false);

const statusOptions = [
  { value: "pending_payment", label: "입금대기" },
  { value: "payment_confirmed", label: "결제완료" },
  { value: "preparing", label: "배송준비중" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "cancelled", label: "주문취소" },
];

const getStatusClass = (status: string) => {
  switch (status) {
    case "pending_payment":
      return "bg-gray-100 text-gray-600";
    case "payment_confirmed":
      return "bg-blue-50 text-blue-700";
    case "preparing":
      return "bg-indigo-50 text-indigo-700";
    case "shipped":
      return "bg-orange-50 text-orange-700";
    case "delivered":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100";
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    // 주문 목록을 가져오면 그 안에 orderItems 배열이 포함되어 있어야 합니다.
    // (백엔드 storage.getAllOrders 구현 시 orderItems join 필요)
    orders.value = await fetchAdminOrders();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// [수정] 개별 상품 상태 저장
const handleSaveItem = async (item: any) => {
  if (!confirm(`'${item.productName}' 상품의 상태를 수정하시겠습니까?`)) return;

  try {
    await updateAdminOrderItem(item.id, item.status, item.trackingNumber);
    alert("수정되었습니다.");
    // 전체 새로고침 대신 해당 아이템만 갱신하거나 전체 로드
    await loadData();
  } catch (error: any) {
    alert("수정 실패: " + error.message);
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
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
  <div class="max-w-7xl mx-auto px-4 py-12">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">주문/배송 관리</h1>
      <button
        @click="loadData"
        class="px-3 py-2 border rounded hover:bg-gray-50 text-sm"
      >
        새로고침
      </button>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
      ></div>
    </div>

    <div v-else class="space-y-8">
      <div
        v-for="order in orders"
        :key="order.id"
        class="border rounded-lg overflow-hidden bg-white shadow-sm"
      >
        <div
          class="bg-gray-50 px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4"
        >
          <div class="flex items-center gap-4 text-sm">
            <span class="font-bold text-lg">주문번호 #{{ order.id }}</span>
            <span class="text-gray-500">{{ formatDate(order.createdAt) }}</span>
            <span class="text-gray-400">|</span>
            <span class="font-medium">{{ order.shippingName }}</span>
            <span class="text-gray-500">({{ order.shippingPhone }})</span>
          </div>
          <div class="font-bold text-blue-600">
            총 결제: {{ Number(order.totalAmount).toLocaleString() }}원
          </div>
        </div>

        <div class="p-0 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-white border-b text-gray-500">
              <tr>
                <th class="px-6 py-3 w-1/3">상품명 / 옵션</th>
                <th class="px-6 py-3">수량/금액</th>
                <th class="px-6 py-3">상태 관리</th>
                <th class="px-6 py-3">운송장 번호</th>
                <th class="px-6 py-3 text-center">저장</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="item in order.orderItems"
                :key="item.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">
                    {{ item.productName }}
                  </div>
                </td>

                <td class="px-6 py-4 text-gray-600">
                  {{ item.quantity }}개 /
                  {{
                    Number(item.productPrice * item.quantity).toLocaleString()
                  }}원
                </td>

                <td class="px-6 py-4">
                  <select
                    v-model="item.status"
                    :class="[
                      'border rounded px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-black outline-none w-32',
                      getStatusClass(item.status),
                    ]"
                  >
                    <option
                      v-for="opt in statusOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </td>

                <td class="px-6 py-4">
                  <input
                    v-model="item.trackingNumber"
                    type="text"
                    placeholder="운송장 입력"
                    class="border rounded px-2 py-1 text-xs w-full max-w-[150px] focus:border-black outline-none"
                  />
                </td>

                <td class="px-6 py-4 text-center">
                  <button
                    @click="handleSaveItem(item)"
                    class="bg-black text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 transition-colors"
                  >
                    저장
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="px-6 py-3 bg-gray-50/50 border-t text-xs text-gray-500 flex gap-2"
        >
          <span class="font-bold">배송지:</span>
          <span
            >{{ order.shippingAddress }} ({{ order.shippingPostalCode }})</span
          >
        </div>
      </div>

      <div
        v-if="orders.length === 0"
        class="text-center py-20 text-gray-500 border rounded-lg bg-white"
      >
        주문 내역이 없습니다.
      </div>
    </div>
  </div>
</template>
