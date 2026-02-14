<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import { fetchAdminOrders, updateAdminOrderItem, adminCancelPayment } from "@/lib/api";
import { getDayName } from "@/lib/utils";
import { maskUserName, maskPhone, maskDetailAddress, formatDate, formatPrice } from "@/lib/formatters";
import { getStatusClass as getStatusClassFromConstants } from "@/lib/constants/orderStatus";
import { AdminNavigationTabs } from "@/components/admin";
import ShippingInfoModal from "@/components/admin/ShippingInfoModal.vue";
import AdminCancelOrderModal from "@/components/admin/AdminCancelOrderModal.vue";
// UI 컴포넌트 및 아이콘
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Truck,
  XCircle,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

const orders = ref<any[]>([]);
const originalOrders = ref<any[]>([]); // 원본 데이터 저장 (변경 감지용)
const loading = ref(false);
const selectedStatus = ref<string>("all");

// 배송 정보 모달 상태
const shippingModalOpen = ref(false);
const selectedOrderItem = ref<any>(null);
const selectedOrder = ref<any>(null);
const savingShipping = ref(false);

// 관리자 취소 모달 상태
const cancelModalOpen = ref(false);
const cancelTargetItem = ref<any>(null);
const cancelTargetOrder = ref<any>(null);
const cancelLoading = ref(false);

// 상태 저장 중 표시
const savingStatus = ref<Record<number, boolean>>({}); // key: orderItemId, value: saving 여부

// 무한 스크롤 관련 상태
const PAGE_SIZE = 10;
const currentPage = ref(1);
const loadingMore = ref(false);
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

// 자주 사용하는 상태 빠른 필터
const quickFilters = [
  { value: "all", label: "전체" },
  { value: "payment_confirmed", label: "결제완료" },
  { value: "preparing", label: "배송준비중" },
  { value: "shipped", label: "배송중" },
  { value: "return_requested", label: "반품요청" },
  { value: "return_received", label: "검수대기" },
];

// 상태 옵션 (백엔드 상태값 기준으로 통일)
const statusOptions = [
  { value: "pending_payment", label: "입금대기" },
  { value: "paying", label: "결제진행중" },
  { value: "cancelled", label: "주문중단" },
  { value: "payment_confirmed", label: "결제완료" },
  { value: "preparing", label: "배송준비중" },
  { value: "shipped", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "purchase_confirmed", label: "구매확정" },
  { value: "refunded", label: "주문취소" },
  { value: "partial_refunded", label: "부분환불" },
  { value: "return_requested", label: "반품요청" },
  // { value: "return_in_transit", label: "반품배송중" }, // 비활성화 (추후 사용 예정)
  { value: "return_received", label: "검수대기" },
];

// 필터링된 주문 목록 (전체)
const filteredOrders = computed(() => {
  if (selectedStatus.value === "all") {
    return orders.value;
  }
  return orders.value.filter((order) =>
    order.orderItems.some((item: any) => item.status === selectedStatus.value),
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

// 각 상태별 건수 (백엔드 상태값 기준)
const statusCounts = computed(() => [
  { label: "입금대기", count: getStatusCount("pending_payment"), emphasized: false },
  { label: "결제진행중", count: getStatusCount("paying"), emphasized: false },
  { label: "주문중단", count: getStatusCount("cancelled"), emphasized: false },
  { label: "결제완료", count: getStatusCount("payment_confirmed"), emphasized: true },
  { label: "배송준비중", count: getStatusCount("preparing"), emphasized: true },
  { label: "배송중", count: getStatusCount("shipped"), emphasized: true },
  { label: "배송완료", count: getStatusCount("delivered"), emphasized: false },
  { label: "주문취소", count: getStatusCount("refunded"), emphasized: false },
  { label: "반품요청", count: getStatusCount("return_requested"), emphasized: true },
  // { label: "반품배송중", count: getStatusCount("return_in_transit"), emphasized: true }, // 비활성화
  { label: "검수대기", count: getStatusCount("return_received"), emphasized: true },
]);

// 공통 모듈의 getStatusClass 래핑 (관리자용 border 추가)
const getStatusClass = (status: string) => {
  const baseClass = getStatusClassFromConstants(status as any);
  // 관리자 셀렉트박스용 border 추가
  return `${baseClass} border`;
};

// 주문 아이템의 상태가 변경되었는지 확인
const isItemStatusChanged = (item: any) => {
  const originalOrder = originalOrders.value.find((o) =>
    o.orderItems.some((oi: any) => oi.id === item.id),
  );
  if (!originalOrder) return false;

  const originalItem = originalOrder.orderItems.find(
    (oi: any) => oi.id === item.id,
  );
  if (!originalItem) return false;

  return originalItem.status !== item.status;
};

// 저장 버튼 비활성화 여부 확인 (입금대기, 결제진행중, 주문중단, 주문취소, 반품완료 상태)
const isSaveDisabled = (item: any) => {
  const disabledStatuses = ["pending_payment", "paying", "cancelled", "refunded", "returned"];
  return disabledStatuses.includes(item.status) || !isItemStatusChanged(item);
};

const loadData = async () => {
  loading.value = true;
  currentPage.value = 1; // 데이터 로드 시 페이지 초기화
  try {
    const response = await fetchAdminOrders();
    orders.value = response.orders;
    // 원본 데이터를 깊은 복사로 저장 (변경 감지용)
    originalOrders.value = JSON.parse(JSON.stringify(response.orders));
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
    },
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
  // DOM 업데이트 후 스크롤을 맨 위로 즉시 이동
  await nextTick();
  window.scrollTo({ top: 0 });
});

// 배송 정보 모달 열기
const openShippingModal = (item: any, order: any) => {
  selectedOrderItem.value = item;
  selectedOrder.value = order;
  shippingModalOpen.value = true;
};

// 배송 정보 모달 닫기
const closeShippingModal = () => {
  shippingModalOpen.value = false;
  selectedOrderItem.value = null;
  selectedOrder.value = null;
};

// 관리자 취소 모달 열기
const openCancelModal = (item: any, order: any) => {
  cancelTargetItem.value = item;
  cancelTargetOrder.value = order;
  cancelModalOpen.value = true;
};

// 관리자 취소 모달 닫기
const closeCancelModal = () => {
  cancelModalOpen.value = false;
  cancelTargetItem.value = null;
  cancelTargetOrder.value = null;
};

// 취소 가능 상태 확인 (결제완료, 배송준비중, 검수대기)
const isCancelable = (status: string) => {
  const cancelableStatuses = ["payment_confirmed", "preparing", "return_received"];
  return cancelableStatuses.includes(status);
};

// 관리자 주문 취소 처리
const handleAdminCancel = async (data: {
  cancelType: "customer_request" | "customer_request_cod" | "seller_cancel";
  adminMemo: string;
  cancelReason: string;
}) => {
  if (!cancelTargetItem.value || !cancelTargetOrder.value) return;

  cancelLoading.value = true;
  try {
    // API 호출 - 주문 취소 (이메일 자동 발송)
    // cancelType에 따라 환불 금액이 다르게 계산됨:
    // - customer_request: 배송비 차감 (고객 귀책)
    // - customer_request_cod: 배송비 + 반품비 차감 (착불)
    // - seller_cancel: 전액 환불 (판매자 귀책)
    const typeLabel = {
      customer_request: "고객요청",
      customer_request_cod: "고객요청-착불",
      seller_cancel: "직권취소",
    }[data.cancelType];

    await adminCancelPayment(
      cancelTargetOrder.value.id,
      `[${typeLabel}] ${data.cancelReason}${data.adminMemo ? `\n\n[관리메모]\n${data.adminMemo}` : ""}`,
      data.cancelType,
      cancelTargetItem.value.id
    );

    showAlert(ADMIN_MESSAGES.orderCancelSuccess);
    closeCancelModal();
    await loadData();
  } catch (error: any) {
    showAlert(ADMIN_MESSAGES.orderCancelFailed.replace("{message}", error.message || "알 수 없는 오류"), { type: "error" });
  } finally {
    cancelLoading.value = false;
  }
};

// 주문 아이템 상태 저장
const handleSaveItemStatus = async (item: any) => {
  const confirmed = await showConfirm(`상태를 저장하시겠습니까?`, {
    confirmText: "저장",
    cancelText: "취소",
  });
  if (!confirmed) return;

  savingStatus.value[item.id] = true;
  try {
    // API 호출 (상태만 업데이트)
    await updateAdminOrderItem(
      item.id,
      item.status,
      item.trackingNumber,
      item.courierCompany,
    );

    showAlert(ADMIN_MESSAGES.orderStatusSaveSuccess);

    // 원본 데이터 업데이트
    const originalOrder = originalOrders.value.find((o) =>
      o.orderItems.some((oi: any) => oi.id === item.id),
    );
    if (originalOrder) {
      const originalItem = originalOrder.orderItems.find(
        (oi: any) => oi.id === item.id,
      );
      if (originalItem) {
        originalItem.status = item.status;
      }
    }
  } catch (error: any) {
    showAlert(ADMIN_MESSAGES.saveFailed.replace("{message}", error.message), { type: "error" });
  } finally {
    savingStatus.value[item.id] = false;
  }
};

// 배송 정보 저장
const handleSaveShipping = async (data: {
  courierCompany: string;
  trackingNumber: string;
}) => {
  if (!selectedOrderItem.value) return;

  const confirmed = await showConfirm(`배송 정보를 저장하시겠습니까?`, {
    confirmText: "저장",
    cancelText: "취소",
  });
  if (!confirmed) return;

  savingShipping.value = true;
  try {
    // 배송준비중 상태에서 운송장 입력 시 자동으로 배송중으로 변경
    let finalStatus = selectedOrderItem.value.status;
    if (
      selectedOrderItem.value.status === "preparing" &&
      data.trackingNumber &&
      data.trackingNumber.trim()
    ) {
      finalStatus = "shipped";
    }

    // API 호출
    await updateAdminOrderItem(
      selectedOrderItem.value.id,
      finalStatus,
      data.trackingNumber,
      data.courierCompany,
    );

    showAlert(ADMIN_MESSAGES.shippingInfoSaveSuccess);
    closeShippingModal();
    await loadData();
  } catch (error: any) {
    showAlert(ADMIN_MESSAGES.saveFailed.replace("{message}", error.message), { type: "error" });
  } finally {
    savingShipping.value = false;
  }
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
    <AdminNavigationTabs />
    <!-- 헤더 -->
    <div class="mb-6">
      <h3 class="text-heading text-admin tracking-wider">주문/배송 관리</h3>
    </div>
    <Separator class="mb-6"></Separator>

    <!-- 빠른 필터 버튼 -->
    <div class="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <!-- 왼쪽: 전체상태 드롭다운 + 건수 -->
      <div class="flex items-center gap-2">
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-[140px] h-8 text-xs">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <span class="text-body text-muted-foreground">
          <span class="font-bold text-foreground">{{ filteredOrders.length }}</span>건
        </span>
      </div>

      <!-- 오른쪽: 자주 쓰는 상태 버튼 -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <Button
          v-for="opt in quickFilters"
          :key="opt.value"
          size="sm"
          :variant="selectedStatus === opt.value ? 'default' : 'outline'"
          @click="selectedStatus = opt.value"
          class="text-xs gap-1.5"
        >
          {{ opt.label }}
          <span
            v-if="opt.value !== 'all' && getStatusCount(opt.value) > 0"
            class="font-bold"
            :class="selectedStatus === opt.value ? 'text-primary-foreground' : 'text-primary'"
          >
            {{ getStatusCount(opt.value) }}
          </span>
        </Button>
      </div>
    </div>

    <!-- 상태별 현황 요약 (우측 정렬) -->
    <div class="mb-6 flex items-center justify-end gap-3 flex-wrap">
      <span
        v-for="status in statusCounts"
        :key="status.label"
        class="text-caption text-muted-foreground"
      >
        {{ status.label }}:
        <span
          class="font-bold"
          :class="status.emphasized ? 'text-primary' : 'text-foreground'"
        >
          {{ status.count }}
        </span>건
      </span>
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
                    maskUserName(order.shippingName)
                  }}</span>

                  <span class="text-caption text-admin-muted ml-1"
                    >({{ maskPhone(order.shippingPhone) }})</span
                  >
                </div>
              </div>
              <div class="h-8 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col max-w-xs">
                <span
                  class="text-caption font-bold text-admin-muted uppercase tracking-tighter mb-0.5"
                  >배송지</span
                >
                <div class="flex items-start gap-1.5">
                  <MapPin
                    class="w-3.5 h-3.5 opacity-50 text-admin-muted mt-0.5 flex-shrink-0"
                  />
                  <span class="text-caption text-admin-muted font-semibold">
                    {{ order.shippingAddress }}
                    <span class="text-admin-muted opacity-70"
                      >({{ order.shippingPostalCode }})</span
                    >
                    <span
                      v-if="order.shippingDetailAddress"
                      class="text-admin-muted opacity-70 ml-1"
                    >
                      {{ maskDetailAddress(order.shippingDetailAddress) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span
                class="text-body font-semibold text-admin uppercase tracking-tighter block mb-0.5"
                >총액</span
              >
              <span class="text-body font-semibold text-admin"
                >{{ formatPrice(order.totalAmount) }}</span
              >
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[1200px]">
            <thead
              class="bg-white border-l border-r text-caption font-bold text-admin-muted uppercase tracking-tight shadow-sm shadow-light"
            >
              <tr>
                <th class="px-8 py-4 w-24">이미지</th>
                <th class="px-8 py-4 w-1/4">상품명 / 옵션</th>
                <th class="px-8 py-4 text-center">수량/금액</th>
                <th class="px-8 py-4 text-center">상태 정보</th>
                <th class="px-8 py-4 text-center">배송 정보</th>
                <th class="px-8 py-4 text-center">상태 관리</th>
                <th class="px-8 py-4 text-center">취소 관리</th>
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
                      crossorigin="anonymous"
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
                    {{ formatPrice(item.productPrice) }}
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
                  <Button
                    variant="outline"
                    size="sm"
                    @click="openShippingModal(item, order)"
                    class="gap-2"
                  >
                    <Truck class="w-4 h-4" />
                    <span
                      v-if="item.trackingNumber"
                      class="font-mono text-caption"
                    >
                      배송정보
                    </span>
                    <span v-else class="text-muted-foreground text-caption">
                      미등록
                    </span>
                  </Button>
                </td>

                <td class="px-8 py-5 text-center">
                  <Button
                    size="sm"
                    @click="handleSaveItemStatus(item)"
                    :disabled="isSaveDisabled(item) || savingStatus[item.id]"
                    class="bg-primary hover:bg-primary/80 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="savingStatus[item.id]">저장중...</span>
                    <span v-else>저장</span>
                  </Button>
                </td>

                <td class="px-8 py-5 text-center">
                  <Button
                    v-if="isCancelable(item.status)"
                    variant="outline"
                    size="sm"
                    @click="openCancelModal(item, order)"
                    class="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XCircle class="w-4 h-4" />
                    <span class="text-caption">취소</span>
                  </Button>
                  <span
                    v-else
                    class="text-caption text-muted-foreground"
                  >
                    -
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
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

    <!-- 배송 정보 관리 모달 -->
    <ShippingInfoModal
      :open="shippingModalOpen"
      :order-item="selectedOrderItem"
      :order="selectedOrder"
      :loading="savingShipping"
      @close="closeShippingModal"
      @save="handleSaveShipping"
    />

    <!-- 관리자 주문 취소 모달 -->
    <AdminCancelOrderModal
      :open="cancelModalOpen"
      :order-item="cancelTargetItem"
      :order="cancelTargetOrder"
      :loading="cancelLoading"
      @close="closeCancelModal"
      @confirm="handleAdminCancel"
    />
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
