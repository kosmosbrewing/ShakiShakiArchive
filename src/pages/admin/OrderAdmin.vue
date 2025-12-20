<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchAdminOrders, updateAdminOrderItem } from "@/lib/api";

// UI 컴포넌트 및 아이콘
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingBag,
  Package,
  Truck,
  User,
  Search,
  RotateCcw,
  ChevronRight,
  Calendar,
  Phone,
  MapPin,
} from "lucide-vue-next";

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
      return "bg-muted text-admin-muted border-border";
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
      return "bg-muted";
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    orders.value = await fetchAdminOrders();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSaveItem = async (item: any) => {
  if (!confirm(`'${item.productName}' 상품의 상태를 수정하시겠습니까?`)) return;
  try {
    await updateAdminOrderItem(item.id, item.status, item.trackingNumber);
    alert("수정되었습니다.");
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
  <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
    <div class="mb-10 border-b pb-3 flex justify-between items-end">
      <div>
        <h3 class="text-h1 text-primary tracking-wider">주문/배송 관리</h3>
        <p class="text-caption text-admin-muted mt-1 font-medium">
          전체 주문 현황을 파악하고 배송 상태를 관리합니다.
        </p>
      </div>
      <button
        @click="loadData"
        class="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-body font-bold text-admin hover:bg-muted transition-all shadow-sm"
      >
        <RotateCcw class="w-4 h-4" />
        <span>새로고침</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-32">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
      ></div>
    </div>

    <div v-else class="space-y-10">
      <Card
        v-for="order in orders"
        :key="order.id"
        class="overflow-hidden border-none shadow-lg group"
      >
        <CardHeader
          class="bg-muted/30 px-6 py-5 border-b border-border transition-colors group-hover:bg-muted/50"
        >
          <div class="flex flex-wrap justify-between items-center gap-6">
            <div class="flex items-center gap-6">
              <div class="flex flex-col">
                <span
                  class="text-tiny font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >Order Number</span
                >
                <span class="text-h3 font-bold text-admin"
                  >#{{ order.id }}</span
                >
              </div>
              <div class="h-8 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-tiny font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >Order Date</span
                >
                <div class="flex items-center gap-1.5 text-body text-admin">
                  <Calendar class="w-3.5 h-3.5 opacity-50" />
                  {{ formatDate(order.createdAt) }}
                </div>
              </div>
              <div class="h-8 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-tiny font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >Customer</span
                >
                <div
                  class="flex items-center gap-1.5 text-body text-admin font-bold"
                >
                  <User class="w-3.5 h-3.5 opacity-50" />
                  {{ order.shippingName }}
                  <span class="text-admin-muted font-normal text-caption ml-1"
                    >({{ order.shippingPhone }})</span
                  >
                </div>
              </div>
            </div>
            <div class="text-right">
              <span
                class="text-tiny font-bold text-primary uppercase tracking-tighter block mb-0.5"
                >Total Amount</span
              >
              <span class="text-h3 font-bold text-primary"
                >{{ Number(order.totalAmount).toLocaleString() }}원</span
              >
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[900px]">
            <thead
              class="bg-white border-b text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-8 py-4 w-24">이미지</th>
                <th class="px-8 py-4 w-1/3">상품명 / 옵션</th>
                <th class="px-8 py-4 text-center">수량/금액</th>
                <th class="px-8 py-4 text-center">상태 관리</th>
                <th class="px-8 py-4 text-center">운송장 번호</th>
                <th class="px-8 py-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="item in order.orderItems"
                :key="item.id"
                class="hover:bg-muted/10 transition-colors"
              >
                <td class="px-8 py-5">
                  <div
                    class="h-14 w-14 bg-muted rounded-xl overflow-hidden border border-border shadow-sm"
                  >
                    <img
                      v-if="item.product?.imageUrl"
                      :src="item.product.imageUrl"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-admin-muted opacity-20"
                    >
                      <ImageIcon class="w-6 h-6" />
                    </div>
                  </div>
                </td>
                <td class="px-8 py-5">
                  <div class="text-body font-bold text-admin">
                    {{ item.productName }}
                  </div>
                  <div
                    class="text-tiny text-admin-muted mt-1 bg-muted/50 inline-block px-2 py-0.5 rounded"
                  >
                    {{ item.options || "기본 옵션" }}
                  </div>
                </td>

                <td class="px-8 py-5 text-center">
                  <div class="text-body text-admin">
                    <span class="font-bold text-primary">{{
                      item.quantity
                    }}</span
                    >개
                  </div>
                  <div class="text-tiny text-admin-muted mt-0.5">
                    {{ Number(item.productPrice).toLocaleString() }}원
                  </div>
                </td>

                <td class="px-8 py-5 text-center">
                  <select
                    v-model="item.status"
                    :class="[
                      'inline-flex items-center border rounded-xl px-3 py-1.5 text-tiny font-bold focus:ring-2 focus:ring-primary/20 outline-none w-36 transition-all shadow-sm',
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

                <td class="px-8 py-5 text-center">
                  <input
                    v-model="item.trackingNumber"
                    type="text"
                    placeholder="운송장 입력"
                    class="w-full max-w-[160px] border border-border rounded-xl px-3 py-1.5 text-tiny text-admin focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                  />
                </td>

                <td class="px-8 py-5 text-right">
                  <button
                    @click="handleSaveItem(item)"
                    class="bg-admin text-white px-5 py-2 rounded-xl text-tiny font-bold hover:opacity-90 transition-all shadow-md shadow-admin/10"
                  >
                    저장
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>

        <div
          class="px-8 py-4 bg-muted/5 border-t border-border flex items-center gap-3"
        >
          <div class="p-1.5 bg-white border border-border rounded-lg shadow-xs">
            <MapPin class="w-3.5 h-3.5 text-admin-muted" />
          </div>
          <span class="text-caption font-bold text-admin-muted"
            >배송지 정보:</span
          >
          <span class="text-caption text-admin">
            {{ order.shippingAddress }}
            <span class="text-admin-muted"
              >({{ order.shippingPostalCode }})</span
            >
          </span>
        </div>
      </Card>
    </div>

    <div
      v-if="orders.length === 0 && !loading"
      class="text-center py-32 border-2 border-dashed border-border rounded-2xl bg-muted/10"
    >
      <ShoppingBag class="w-12 h-12 mx-auto mb-4 opacity-10 text-admin" />
      <p class="text-body text-admin-muted">
        현재 접수된 주문 내역이 없습니다.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 테이블 스크롤바 디자인 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
</style>
