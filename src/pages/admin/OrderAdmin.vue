<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { fetchAdminOrders, updateAdminOrderItem } from "@/lib/api";
import { getDayName } from "@/lib/utils";
// UI 컴포넌트 및 아이콘
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common";
import {
  ShoppingBag,
  User,
  Calendar,
  MapPin,
  Image as ImageIcon,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

const orders = ref<any[]>([]);
const loading = ref(false);
const selectedStatus = ref<string>("all");

// 무한 스크롤 관련 상태
const PAGE_SIZE = 10;
const currentPage = ref(1);
const loadingMore = ref(false);
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

const statusOptions = [
  { value: "pending_payment", label: "입금대기" },
  { value: "paying", label: "결제진행중" },
  { value: "cancelled", label: "주문중단" },
  { value: "payment_confirmed", label: "결제완료" },
  { value: "preparing", label: "배송준비중" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "refunded", label: "주문취소" },
];

// 필터링된 주문 목록 (전체)
const filteredOrders = computed(() => {
  if (selectedStatus.value === "all") {
    return orders.value;
  }
  return orders.value.filter((order) =>
    order.orderItems.some((item: any) => item.status === selectedStatus.value)
  );
});

// 화면에 표시할 주문 목록 (무한 스크롤)
const displayedOrders = computed(() => {
  return filteredOrders.value.slice(0, currentPage.value * PAGE_SIZE);
});

// 더 불러올 데이터가 있는지 확인
const hasMore = computed(() => {
  return currentPage.value * PAGE_SIZE < filteredOrders.value.length;
});

// 상태별 건수 계산
const getStatusCount = (status: string) => {
  return orders.value.reduce((count, order) => {
    return (
      count +
      order.orderItems.filter((item: any) => item.status === status).length
    );
  }, 0);
};

// 각 상태별 건수
const statusCounts = computed(() => [
  {
    label: "입금대기",
    count: getStatusCount("pending_payment"),
    emphasized: false,
  },
  { label: "결제진행중", count: getStatusCount("paying"), emphasized: false },
  { label: "주문중단", count: getStatusCount("cancelled"), emphasized: false },
  {
    label: "결제완료",
    count: getStatusCount("payment_confirmed"),
    emphasized: true,
  },
  { label: "배송준비중", count: getStatusCount("preparing"), emphasized: true },
  { label: "배송중", count: getStatusCount("shipped"), emphasized: true },
  { label: "배송완료", count: getStatusCount("delivered"), emphasized: false },

  { label: "주문취소", count: getStatusCount("refunded"), emphasized: false },
]);

const getStatusClass = (status: string) => {
  switch (status) {
    // 진행 중 상태 - 파란색 계열 통일
    case "payment_confirmed":
    case "preparing":
    case "shipped":
      return "bg-blue-50 text-blue-700 border-blue-100";
    // 완료 상태 - 파스텔 녹색
    case "delivered":
      return "bg-green-50 text-green-700 border-green-200";
    // 취소/환불 상태 - 파스텔 빨간색
    case "cancelled":
    case "refunded":
      return "bg-red-50 text-red-700 border-red-200";
    // 기타 상태 - 회색
    case "pending_payment":
    case "paying":
    default:
      return "bg-muted text-admin-muted border-border";
  }
};

const loadData = async () => {
  loading.value = true;
  currentPage.value = 1; // 데이터 로드 시 페이지 초기화
  try {
    orders.value = await fetchAdminOrders();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 더 많은 주문 로드 (클라이언트 사이드 페이지네이션)
const loadMoreOrders = () => {
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  // 실제로는 이미 모든 데이터가 있으므로 페이지만 증가
  setTimeout(() => {
    currentPage.value++;
    loadingMore.value = false;
  }, 300); // 약간의 딜레이로 자연스러운 로딩 효과
};

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !loadingMore.value && hasMore.value) {
        loadMoreOrders();
      }
    },
    {
      rootMargin: "200px",
      threshold: 0.1,
    }
  );

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value);
  }
};

// 옵저버 정리
const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// 타겟 요소 변경 감지
watch(loadMoreTrigger, (newEl) => {
  cleanupObserver();
  if (newEl) {
    setupIntersectionObserver();
  }
});

// 필터 변경 시 페이지 초기화 및 스크롤 최상단 이동
watch(selectedStatus, async () => {
  currentPage.value = 1;
  // DOM 업데이트 후 스크롤을 맨 위로 이동
  await nextTick();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const handleSaveItem = async (item: any) => {
  const confirmed = await showConfirm(
    `'${item.productName}' 상품의 상태를\n수정하시겠습니까?`,
    {
      confirmText: "수정",
      cancelText: "취소",
    }
  );
  if (!confirmed) return;

  try {
    // 배송준비중 상태에서 운송장 번호가 입력되면 자동으로 배송중으로 변경
    let finalStatus = item.status;
    if (
      item.status === "preparing" &&
      item.trackingNumber &&
      item.trackingNumber.trim()
    ) {
      finalStatus = "shipped";
    }

    await updateAdminOrderItem(item.id, finalStatus, item.trackingNumber);
    showAlert("수정되었습니다.");
    await loadData();
  } catch (error: any) {
    showAlert("수정 실패: " + error.message, { type: "error" });
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
  await loadData();

  // DOM이 준비된 후 옵저버 설정
  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }
});

onUnmounted(() => {
  cleanupObserver();
});
</script>

<template>
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-6">
      <h3 class="text-heading text-admin tracking-wider">주문/배송 관리</h3>
    </div>
    <Separator class="mb-6"></Separator>

    <!-- 필터 -->
    <div class="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex gap-3">
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-[160px] sm:w-[180px]">
            <SelectValue placeholder="주문 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending_payment">입금대기</SelectItem>
            <SelectItem value="paying">결제진행중</SelectItem>
            <SelectItem value="cancelled">주문중단</SelectItem>
            <SelectItem value="payment_confirmed">결제완료</SelectItem>
            <SelectItem value="preparing">배송준비중</SelectItem>
            <SelectItem value="shipped">배송중</SelectItem>
            <SelectItem value="delivered">배송완료</SelectItem>
            <SelectItem value="refunded">주문취소</SelectItem>
          </SelectContent>
        </Select>

        <span class="text-body text-muted-foreground self-center ml-2">
          필터 결과:
          <span class="font-bold text-foreground">{{
            filteredOrders.length
          }}</span
          >건
        </span>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <span
          v-for="status in statusCounts"
          :key="status.label"
          class="text-caption self-center"
          :class="
            status.emphasized
              ? 'text-muted-foreground'
              : 'text-muted-foreground'
          "
        >
          {{ status.label }}:
          <span
            class="font-bold"
            :class="status.emphasized ? 'text-primary' : 'text-foreground'"
          >
            {{ status.count }} </span
          >건
        </span>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="space-y-10">
      <Card
        v-for="order in displayedOrders"
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
                  class="text-caption font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >주문번호</span
                >
                <span class="text-caption font-semibold text-admin-muted">{{
                  order.externalOrderId || order.id
                }}</span>
              </div>
              <div class="h-8 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-caption font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >주문일자</span
                >
                <div
                  class="flex items-center gap-1.5 text-caption text-admin-muted font-semibold"
                >
                  <Calendar class="w-3.5 h-3.5 opacity-50" />
                  {{ formatDate(order.createdAt) }}({{
                    getDayName(order.createdAt)
                  }})
                </div>
              </div>
              <div class="h-8 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-caption font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >주문자</span
                >
                <div
                  class="flex items-center gap-1.5 text-body text-admin font-bold"
                >
                  <User class="w-3.5 h-3.5 opacity-50" />
                  <span class="text-caption text-admin-muted font-semibold">{{
                    order.shippingName
                  }}</span>

                  <span class="text-caption text-admin-muted ml-1"
                    >({{ order.shippingPhone }})</span
                  >
                </div>
              </div>
            </div>
            <div class="text-right">
              <span
                class="text-body font-semibold text-admin uppercase tracking-tighter block mb-0.5"
                >총액</span
              >
              <span class="text-body font-semibold text-admin"
                >{{ Number(order.totalAmount).toLocaleString() }}원</span
              >
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[900px]">
            <thead
              class="bg-white border-l border-r text-caption font-bold text-admin-muted uppercase tracking-tight shadow-sm shadow-light"
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
                  <div class="text-body text-admin">
                    {{ item.productName }}
                  </div>
                  <div
                    class="text-caption text-admin-muted mt-1 bg-muted/50 inline-block py-0.5 rounded"
                  >
                    {{ item.options || "기본 옵션" }}
                  </div>
                </td>

                <td class="px-8 py-5 text-center">
                  <div class="text-body text-admin">
                    <span class="text-admin">{{ item.quantity }}</span
                    >개
                  </div>
                  <div class="text-caption text-admin-muted mt-0.5">
                    {{ Number(item.productPrice).toLocaleString() }}원
                  </div>
                </td>

                <td class="px-8 py-5 text-center">
                  <select
                    v-model="item.status"
                    :class="[
                      'inline-flex items-center border rounded-xl px-3 py-1.5 text-caption font-bold focus:ring-2 focus:ring-primary/20 outline-none w-36 transition-all shadow-sm',
                      getStatusClass(item.status),
                    ]"
                  >
                    <option
                      v-for="opt in statusOptions"
                      :key="opt.value"
                      :value="opt.value"
                      class="text-center"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </td>

                <td class="px-8 py-5 text-center">
                  <Input
                    v-model="item.trackingNumber"
                    type="text"
                    placeholder="운송장 입력"
                    class="w-full max-w-[160px]"
                  />
                </td>

                <td class="px-8 py-5 text-right">
                  <Button
                    size="sm"
                    @click="handleSaveItem(item)"
                    class="bg-admin hover:bg-admin/80 text-white font-semibold"
                  >
                    저장
                  </Button>
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

      <!-- 무한 스크롤 트리거 및 로딩 인디케이터 -->
      <div ref="loadMoreTrigger" class="py-8 flex justify-center">
        <div
          v-if="loadingMore"
          class="flex items-center gap-2 text-muted-foreground"
        >
          <LoadingSpinner
            variant="dots"
            size="md"
            color="muted"
            :center="false"
          />
          <span class="text-body">주문 내역을 불러오는 중...</span>
        </div>
        <div
          v-else-if="!hasMore && displayedOrders.length > 0"
          class="text-body text-muted-foreground"
        >
          모든 주문을 불러왔습니다
        </div>
      </div>
    </div>

    <div
      v-if="filteredOrders.length === 0 && !loading"
      class="text-center py-32 border-2 border-dashed border-border rounded-2xl bg-muted/10"
    >
      <ShoppingBag class="w-12 h-12 mx-auto mb-4 opacity-10 text-admin" />
      <p class="text-body text-admin-muted">
        필터 조건에 해당하는 주문이 없습니다.
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
