<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import {
  fetchAdminOrders,
  updateAdminOrderItem,
  adminCancelPayment,
  manualRefundAdminOrderItem,
  requestAdmin2FAChallenge,
  verifyAdminLogin2FA,
} from "@/lib/api";
import { getDayName } from "@/lib/utils";
import { maskUserName, maskPhone, maskDetailAddress, formatDate, formatPrice } from "@/lib/formatters";
import { getStatusClass as getStatusClassFromConstants, isNormalFlowStatus, getStepIndex } from "@/lib/constants/orderStatus";
import { AdminNavigationTabs } from "@/components/admin";
import ShippingInfoModal from "@/components/admin/ShippingInfoModal.vue";
import AdminCancelOrderModal from "@/components/admin/AdminCancelOrderModal.vue";
// UI 컴포넌트 및 아이콘
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CalendarDays,
  MapPin,
  Image as ImageIcon,
  Truck,
  XCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm, showPromptConfirm } = useAlert();

const orders = ref<any[]>([]);
const originalOrders = ref<any[]>([]); // 원본 데이터 저장 (변경 감지용)
const loading = ref(true);
const hasLoadedOnce = ref(false);
const selectedStatus = ref<string>("all");
const searchInput = ref("");
const searchQuery = ref("");
const startDate = ref("");
const endDate = ref("");
const draftStartDate = ref("");
const draftEndDate = ref("");
const isDatePanelOpen = ref(false);
const datePanelRef = ref<HTMLElement | null>(null);
const calendarModalRef = ref<HTMLElement | null>(null);
const isCalendarModalOpen = ref(false);
const dateSelectionTarget = ref<"start" | "end">("start");
const datePickerMonth = ref<Date>(new Date());
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

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

// 수기환불 모달 상태 (PG 취소 호출 없음)
const manualRefundModalOpen = ref(false);
const manualRefundTargetItem = ref<any>(null);
const manualRefundTargetOrder = ref<any>(null);
const manualRefundReason = ref("");
const manualRefundLoading = ref(false);

// 상태 저장 중 표시
const savingStatus = ref<Record<number, boolean>>({}); // key: orderItemId, value: saving 여부

// 무한 스크롤 관련 상태
const PAGE_SIZE = 10;
const currentPage = ref(1);
const loadingMore = ref(false);
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

// 자주 사용하는 상태 빠른 필터
const MANUAL_REFUND_FILTER_VALUE = "manual_refund_available";
const MANUAL_REFUND_AVAILABLE_STATUSES = [
  "shipped",
];

const isManualRefundAvailable = (status: string) => {
  return MANUAL_REFUND_AVAILABLE_STATUSES.includes(status);
};

const quickFilters = [
  { value: "all", label: "전체" },
  { value: "payment_confirmed", label: "결제완료" },
  { value: "preparing", label: "배송준비중" },
  { value: "shipped", label: "배송중" },
  { value: "return_requested", label: "반품요청" },
  { value: "return_received", label: "검수대기" },
  { value: MANUAL_REFUND_FILTER_VALUE, label: "수기환불 대상" },
];

type StatusOption = {
  value: string;
  label: string;
};

// 상태 옵션 (관리자 UX용 카테고리)
const statusOptionGroups: { label: string; options: StatusOption[] }[] = [
  {
    label: "결제/대기",
    options: [
      { value: "pending_payment", label: "입금대기" },
      { value: "paying", label: "결제진행중" },
      { value: "payment_confirmed", label: "결제완료" },
    ],
  },
  {
    label: "배송",
    options: [
      { value: "preparing", label: "배송준비중" },
      { value: "shipped", label: "배송중" },
      { value: "delivered", label: "배송완료" },
    ],
  },
  {
    label: "반품",
    options: [
      { value: "return_requested", label: "반품요청" },
      { value: "return_received", label: "검수대기" },
    ],
  },
  {
    label: "환불/취소",
    options: [
      { value: "cancelled", label: "주문중단" },
      { value: "refunded", label: "주문취소" },
      { value: "partial_refunded", label: "부분환불" },
    ],
  },
  {
    label: "최종",
    options: [{ value: "purchase_confirmed", label: "구매확정" }],
  },
];
const statusOptions = statusOptionGroups.flatMap((group) => group.options);

// 필터링된 주문 목록 (전체)
const filteredOrders = computed(() => {
  let result = orders.value;

  if (selectedStatus.value === MANUAL_REFUND_FILTER_VALUE) {
    result = result.filter((order) =>
      order.orderItems.some((item: any) => isManualRefundAvailable(item.status)),
    );
  } else if (selectedStatus.value !== "all") {
    result = result.filter((order) =>
      order.orderItems.some((item: any) => item.status === selectedStatus.value),
    );
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter((order) => {
      const orderNumber = String(order.externalOrderId || order.id || "").toLowerCase();
      const userName = String(order.shippingName || "").toLowerCase();
      return orderNumber.includes(q) || userName.includes(q);
    });
  }

  const hasStart = Boolean(startDate.value);
  const hasEnd = Boolean(endDate.value);
  if (hasStart || hasEnd) {
    const start = hasStart ? new Date(`${startDate.value}T00:00:00`) : null;
    const end = hasEnd ? new Date(`${endDate.value}T23:59:59.999`) : null;

    result = result.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) return false;
      if (start && orderDate < start) return false;
      if (end && orderDate > end) return false;
      return true;
    });
  }

  return result;
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

const getManualRefundAvailableCount = () => {
  return orders.value.reduce((count, order) => {
    return (
      count +
      order.orderItems.filter((item: any) => isManualRefundAvailable(item.status)).length
    );
  }, 0);
};

const getQuickFilterCount = (filterValue: string) => {
  if (filterValue === MANUAL_REFUND_FILTER_VALUE) {
    return getManualRefundAvailableCount();
  }
  return getStatusCount(filterValue);
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

const getOriginalItemStatus = (item: any) => {
  const originalOrder = originalOrders.value.find((o) =>
    o.orderItems.some((oi: any) => oi.id === item.id),
  );
  const originalItem = originalOrder?.orderItems.find(
    (oi: any) => oi.id === item.id,
  );
  return originalItem?.status || item.status;
};

const routineStatusTransitions = new Set([
  "payment_confirmed->preparing",
  "preparing->shipped",
  "shipped->delivered",
  "return_requested->return_received",
]);

const customerCancelableStatuses = new Set([
  "pending",
  "pending_payment",
  "paying",
  "payment_confirmed",
  "preparing",
]);

const postShippingOrReturnStatuses = new Set([
  "shipped",
  "delivered",
  "purchase_confirmed",
  "return_requested",
  "return_in_transit",
  "return_received",
]);

const terminalOrRefundStatuses = new Set([
  "cancelled",
  "refunded",
  "partial_refunded",
  "purchase_confirmed",
]);

const isRiskStatusTransition = (fromStatus: string, toStatus: string) => {
  if (fromStatus === toStatus) return false;
  return !routineStatusTransitions.has(`${fromStatus}->${toStatus}`);
};

const getStatusLabel = (status: string) => {
  for (const group of statusOptionGroups) {
    const option = group.options.find((item) => item.value === status);
    if (option) return option.label;
  }
  return status;
};

// 저장 버튼 비활성화 여부 확인 (입금대기, 결제진행중, 주문중단, 주문취소, 반품완료 상태)
const isSaveDisabled = (item: any) => {
  const disabledStatuses = ["pending_payment", "paying", "cancelled", "refunded", "returned"];
  return disabledStatuses.includes(item.status) || !getPendingStatusChangeLabel(item);
};

const shouldAutoShipWithTracking = (
  fromStatus: string,
  selectedStatus: string,
  trackingNumber?: string | null,
) => {
  return (
    fromStatus === "preparing" &&
    selectedStatus === "preparing" &&
    Boolean(String(trackingNumber || "").trim())
  );
};

const getFinalStatusForSelection = (item: any, selectedStatus: string) => {
  const originalStatus = getOriginalItemStatus(item);
  return shouldAutoShipWithTracking(
    originalStatus,
    selectedStatus,
    item.trackingNumber,
  )
    ? "shipped"
    : selectedStatus;
};

const getPendingStatusChangeLabel = (item: any) => {
  const originalStatus = getOriginalItemStatus(item);
  const finalStatus = getFinalStatusForSelection(item, item.status);
  if (originalStatus === finalStatus) return "";
  return `${getStatusLabel(originalStatus)} → ${getStatusLabel(finalStatus)}`;
};

const isPendingStatusChangeRisk = (item: any) => {
  const originalStatus = getOriginalItemStatus(item);
  const finalStatus = getFinalStatusForSelection(item, item.status);
  return isRiskStatusTransition(originalStatus, finalStatus);
};

const isStatusOptionRisk = (item: any, toStatus: string) => {
  const originalStatus = getOriginalItemStatus(item);
  const finalStatus = getFinalStatusForSelection(item, toStatus);
  return isRiskStatusTransition(originalStatus, finalStatus);
};

const getStatusOptionLabel = (item: any, option: StatusOption) => {
  const prefix = isStatusOptionRisk(item, option.value) ? "⚠ " : "";
  return `${prefix}${option.label}`;
};

const buildRiskStatusMessage = (fromStatus: string, toStatus: string) => {
  const fromLabel = getStatusLabel(fromStatus);
  const toLabel = getStatusLabel(toStatus);
  const warnings = [
    "상태를 변경하기 전에 확인해주세요",
    "",
    `${fromLabel} → ${toLabel}`,
    "",
    "이 변경은 일반적인 주문 처리 순서와 다릅니다.",
    "저장하면 고객 화면의 주문 상태와 취소 가능 여부가 달라질 수 있고,",
    "환불/정산 판단에도 영향을 줄 수 있습니다.",
    "",
    "저장 전 아래 내용을 확인해주세요.",
    "- 실제 배송/반품 진행 상태와 맞나요?",
    "- PG 환불이나 수기환불을 이미 처리하지 않았나요?",
    "- 고객에게 취소 가능한 상태로 다시 보이지 않나요?",
  ];

  if (
    postShippingOrReturnStatuses.has(fromStatus) &&
    customerCancelableStatuses.has(toStatus)
  ) {
    warnings.push(
      "",
      "특히 이 변경은 출고 이후 상태를 이전 단계로 되돌립니다.",
      "이미 상품이 출고되었거나 배송 사고/CS 처리가 끝난 주문이라면",
      "중복 취소나 정산 오류가 생길 수 있습니다.",
    );
  } else if (customerCancelableStatuses.has(toStatus)) {
    warnings.push(
      "",
      "변경 후 고객이 주문취소를 요청할 수 있는 단계가 될 수 있습니다.",
      "이미 별도 환불이나 CS 처리가 끝난 주문이면 먼저 처리 내역을 확인해주세요.",
    );
  }

  if (terminalOrRefundStatuses.has(toStatus)) {
    warnings.push(
      "",
      "변경 후 주문이 최종 또는 환불 상태로 처리됩니다.",
      "PG 취소, 수기환불, 재고 복구가 필요한 상황인지 확인해주세요.",
    );
  }

  warnings.push(
    "",
    "계속 진행하려면 변경 사유를 남겨주세요.",
    "사유 입력 후 관리자 2차 인증을 진행합니다.",
  );
  return warnings.join("\n");
};

const requestRiskAdmin2FA = async () => {
  const challenge = await requestAdmin2FAChallenge();
  if (!("requiresAdmin2FA" in challenge)) return true;

  const fallbackAvailable = !!challenge.admin2faFallbackAvailable;
  const code = await showPromptConfirm(
    fallbackAvailable
      ? "텔레그램 발송이 지연되어 임시 접속 코드 6자리를 입력해주세요."
      : "텔레그램으로 발송된 관리자 인증번호 4자리를 입력해주세요.",
    {
      variant: "destructive",
      confirmText: "인증",
      cancelText: "취소",
      placeholder: fallbackAvailable ? "임시 접속 코드 6자리" : "인증번호 4자리",
    },
  );

  if (!code) return false;

  await verifyAdminLogin2FA({
    challengeId: challenge.challengeId,
    code,
  });

  return true;
};

const confirmRiskStatusChange = async (
  fromStatus: string,
  toStatus: string,
) => {
  const reason = await showPromptConfirm(
    buildRiskStatusMessage(fromStatus, toStatus),
    {
      variant: "destructive",
      confirmText: "2차 인증 진행",
      cancelText: "취소",
      placeholder: "예: 배송 사고 처리 후 상태 보정",
      dialogClass: "w-[min(92vw,440px)] sm:w-[440px]",
    },
  );

  if (!reason) return null;

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 2) {
    showAlert("상태 변경 사유를 2자 이상 입력해주세요.", { type: "error" });
    return null;
  }

  const verified = await requestRiskAdmin2FA();
  if (!verified) return null;

  return trimmedReason;
};

const loadData = async () => {
  loading.value = true;
  currentPage.value = 1; // 데이터 로드 시 페이지 초기화
  try {
    const response = await fetchAdminOrders({ page: 1, limit: 1000 });
    orders.value = response.orders;
    // 원본 데이터를 깊은 복사로 저장 (변경 감지용)
    originalOrders.value = JSON.parse(JSON.stringify(response.orders));
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
    hasLoadedOnce.value = true;
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

watch(searchInput, (value) => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery.value = value;
  }, 350);
});

// 필터/검색 변경 시 페이지만 초기화 (강제 스크롤 제거)
watch([selectedStatus, searchQuery], () => {
  currentPage.value = 1;
});

watch([startDate, endDate], () => {
  // 날짜 필터 적용 시에는 화면 점프를 방지하기 위해 페이지만 초기화
  currentPage.value = 1;
});

const clearFilters = () => {
  selectedStatus.value = "all";
  searchInput.value = "";
  searchQuery.value = "";
  startDate.value = "";
  endDate.value = "";
  draftStartDate.value = "";
  draftEndDate.value = "";
  dateSelectionTarget.value = "start";
  isCalendarModalOpen.value = false;
  isDatePanelOpen.value = false;
};

const openTrackingPage = (item: any) => {
  const trackingNumber = String(item?.trackingNumber || "").trim();
  if (!trackingNumber) return;

  // OrderList와 동일 기준: 네이버 통합 택배조회(택배사 + 운송장번호)
  const courier = String(item?.courierCompany || "택배");
  const trackingUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(courier)}+${encodeURIComponent(trackingNumber)}`;
  window.open(trackingUrl, "_blank");
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

const toDateLabel = (value: string): string => {
  if (!value) return "";
  return value.replace(/-/g, ".");
};

const dateRangeLabel = computed(() => {
  if (!startDate.value && !endDate.value) return "기간 선택";
  if (startDate.value && endDate.value) {
    return `${toDateLabel(startDate.value)} ~ ${toDateLabel(endDate.value)}`;
  }
  if (startDate.value) return `${toDateLabel(startDate.value)} 이후`;
  return `${toDateLabel(endDate.value)} 이전`;
});

const calendarMonthLabel = computed(() => {
  const date = datePickerMonth.value;
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;
});

const syncCalendarMonthFromTarget = () => {
  const selectedDate =
    dateSelectionTarget.value === "start"
      ? parseDateInput(draftStartDate.value)
      : parseDateInput(draftEndDate.value);
  const fallbackDate =
    parseDateInput(draftStartDate.value) ||
    parseDateInput(draftEndDate.value) ||
    new Date();
  const base = selectedDate || fallbackDate;
  datePickerMonth.value = new Date(base.getFullYear(), base.getMonth(), 1);
};

const calendarDays = computed(() => {
  const monthBase = datePickerMonth.value;
  const year = monthBase.getFullYear();
  const month = monthBase.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();

  const today = normalizeDate(new Date()).getTime();
  const startSelected = parseDateInput(draftStartDate.value);
  const endSelected = parseDateInput(draftEndDate.value);
  const startTime = startSelected ? normalizeDate(startSelected).getTime() : null;
  const endTime = endSelected ? normalizeDate(endSelected).getTime() : null;

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(year, month, 1 - startOffset + index);
    const normalized = normalizeDate(cellDate);
    const cellTime = normalized.getTime();
    const iso = toDateInputValue(normalized);

    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = cellTime === today;
    const isStart = startTime === cellTime;
    const isEnd = endTime === cellTime;
    const isInRange =
      startTime != null &&
      endTime != null &&
      cellTime > startTime &&
      cellTime < endTime;

    let isDisabled = false;
    if (dateSelectionTarget.value === "start" && endTime != null) {
      isDisabled = cellTime > endTime;
    } else if (dateSelectionTarget.value === "end" && startTime != null) {
      isDisabled = cellTime < startTime;
    }

    return {
      iso,
      day: cellDate.getDate(),
      isCurrentMonth,
      isToday,
      isStart,
      isEnd,
      isInRange,
      isDisabled,
    };
  });
});

const goPrevMonth = () => {
  datePickerMonth.value = new Date(
    datePickerMonth.value.getFullYear(),
    datePickerMonth.value.getMonth() - 1,
    1,
  );
};

const goNextMonth = () => {
  datePickerMonth.value = new Date(
    datePickerMonth.value.getFullYear(),
    datePickerMonth.value.getMonth() + 1,
    1,
  );
};

const handleCalendarDateSelect = (iso: string) => {
  if (dateSelectionTarget.value === "start") {
    draftStartDate.value = iso;
    if (draftEndDate.value && iso > draftEndDate.value) {
      draftEndDate.value = iso;
    }
    dateSelectionTarget.value = "end";
  } else {
    draftEndDate.value = iso;
    if (draftStartDate.value && iso < draftStartDate.value) {
      draftStartDate.value = iso;
    }
  }
};

const closeDatePanel = () => {
  draftStartDate.value = startDate.value;
  draftEndDate.value = endDate.value;
  isCalendarModalOpen.value = false;
  isDatePanelOpen.value = false;
};

const toggleDatePanel = () => {
  isDatePanelOpen.value = !isDatePanelOpen.value;
  if (isDatePanelOpen.value) {
    draftStartDate.value = startDate.value;
    draftEndDate.value = endDate.value;
    syncCalendarMonthFromTarget();
  } else {
    isCalendarModalOpen.value = false;
  }
};

const openCalendarModal = (target: "start" | "end") => {
  dateSelectionTarget.value = target;
  syncCalendarMonthFromTarget();
  isCalendarModalOpen.value = true;
};

const closeCalendarModal = () => {
  isCalendarModalOpen.value = false;
};

const applyDatePreset = (
  preset: "today" | "last7days" | "last30days" | "thisMonth",
) => {
  const today = new Date();
  const end = new Date(today);
  let start = new Date(today);

  if (preset === "last7days") {
    start.setDate(today.getDate() - 6);
  } else if (preset === "last30days") {
    start.setDate(today.getDate() - 29);
  } else if (preset === "thisMonth") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  draftStartDate.value = toDateInputValue(start);
  draftEndDate.value = toDateInputValue(end);
  syncCalendarMonthFromTarget();
};

const clearDateRange = () => {
  draftStartDate.value = "";
  draftEndDate.value = "";
  dateSelectionTarget.value = "start";
  syncCalendarMonthFromTarget();
  isCalendarModalOpen.value = false;
};

const applyDateRange = () => {
  startDate.value = draftStartDate.value;
  endDate.value = draftEndDate.value;
  closeDatePanel();
};

const handleGlobalPointerDown = (event: MouseEvent) => {
  if (!isDatePanelOpen.value) return;
  const target = event.target as Node | null;
  if (isCalendarModalOpen.value) {
    if (calendarModalRef.value && target && calendarModalRef.value.contains(target)) {
      return;
    }
    // 모달 오버레이 클릭은 @click.self에서 처리한다.
    return;
  }
  if (datePanelRef.value && target && !datePanelRef.value.contains(target)) {
    closeDatePanel();
  }
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    if (isCalendarModalOpen.value) {
      closeCalendarModal();
      return;
    }
    closeDatePanel();
  }
};

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

const openManualRefundModal = (item: any, order: any) => {
  manualRefundTargetItem.value = item;
  manualRefundTargetOrder.value = order;
  manualRefundReason.value = "";
  manualRefundModalOpen.value = true;
};

const handleDangerActionClick = (action: string, item: any, order: any) => {
  if (action === "manual_refund") {
    openManualRefundModal(item, order);
  } else if (action === "return_refund") {
    openCancelModal(item, order);
  }
};

const getDangerActions = (item: any) => {
  const actions: { value: string; label: string }[] = [];

  if (isManualRefundAvailable(item.status)) {
    actions.push({ value: "manual_refund", label: "수기 환불" });
  }

  if (item.status === "return_received") {
    actions.push({ value: "return_refund", label: "검수 후 환불" });
  }

  return actions;
};

const closeManualRefundModal = (force = false) => {
  if (manualRefundLoading.value && !force) return;
  manualRefundModalOpen.value = false;
  manualRefundTargetItem.value = null;
  manualRefundTargetOrder.value = null;
  manualRefundReason.value = "";
};

const getManualRefundAmount = (item: any) => {
  if (!item) return 0;
  return Math.round(Number(item.productPrice || 0) * Number(item.quantity || 1));
};

const handleManualRefund = async () => {
  if (
    !manualRefundTargetItem.value ||
    !manualRefundTargetOrder.value ||
    manualRefundLoading.value
  ) {
    return;
  }

  const refundAmount = getManualRefundAmount(manualRefundTargetItem.value);
  if (!Number.isInteger(refundAmount) || refundAmount <= 0) {
    showAlert("수기환불 금액을 계산할 수 없습니다.", { type: "error" });
    return;
  }

  const reason = manualRefundReason.value.trim();
  if (reason.length < 2) {
    showAlert("수기환불 처리 메모를 입력해주세요.", { type: "error" });
    return;
  }

  const confirmed = await showConfirm(
    "수기환불 처리입니다.\n\nPG 취소 API는 호출하지 않고, 이미 계좌로 환불한 내역을 시스템에 반영합니다.\n해당 상품은 주문취소로 표시되고, 주문 전체는 부분환불 또는 주문취소로 반영됩니다.\n\n계속 진행하시겠습니까?",
    {
      variant: "destructive",
      confirmText: "수기환불 처리",
      cancelText: "취소",
    },
  );
  if (!confirmed) return;

  try {
    const verified = await requestRiskAdmin2FA();
    if (!verified) return;
  } catch (error: any) {
    showAlert(error.message || "관리자 2차 인증에 실패했습니다.", { type: "error" });
    return;
  }

  manualRefundLoading.value = true;
  try {
    await manualRefundAdminOrderItem(manualRefundTargetItem.value.id, {
      reason,
    });

    showAlert("수기환불 처리 내역이 반영되었습니다.");
    closeManualRefundModal(true);
    await loadData();
  } catch (error: any) {
    showAlert(error.message || "수기환불 처리에 실패했습니다.", { type: "error" });
  } finally {
    manualRefundLoading.value = false;
  }
};

// 일반 취소 가능 상태 확인 (검수 후 환불은 위험작업에서 처리)
const isCancelable = (status: string) => {
  const cancelableStatuses = ["payment_confirmed", "preparing"];
  return cancelableStatuses.includes(status);
};

const getCancelUnavailableReason = (status: string) => {
  const reasonMap: Record<string, string> = {
    pending_payment: "결제 전",
    paying: "결제 진행 중",
    shipped: "수기 환불만 가능",
    delivered: "반품 요청 후 처리",
    purchase_confirmed: "구매확정 완료",
    return_requested: "검수 후 처리",
    return_in_transit: "반품 도착 대기",
    return_received: "검수 후 환불 가능",
    cancelled: "주문중단 완료",
    refunded: "주문취소 완료",
    partial_refunded: "부분환불 완료",
    returned: "반품완료",
  };

  return reasonMap[status] || "취소불가";
};

// 관리자 주문 취소 처리
const handleAdminCancel = async (data: {
  cancelType: "customer_request" | "customer_request_cod" | "seller_cancel";
  cancelReason: string;
}) => {
  if (!cancelTargetItem.value || !cancelTargetOrder.value) return;

  if (cancelTargetItem.value.status === "return_received") {
    try {
      const verified = await requestRiskAdmin2FA();
      if (!verified) return;
    } catch (error: any) {
      showAlert(error.message || "관리자 2차 인증에 실패했습니다.", { type: "error" });
      return;
    }
  }

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
      `[${typeLabel}] ${data.cancelReason}`,
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
  const originalStatus = getOriginalItemStatus(item);
  const requestedStatus = item.status;
  const willAutoShip = shouldAutoShipWithTracking(
    originalStatus,
    requestedStatus,
    item.trackingNumber,
  );
  const finalStatus = getFinalStatusForSelection(item, requestedStatus);
  let statusChangeReason: string | null = null;

  if (isRiskStatusTransition(originalStatus, finalStatus)) {
    try {
      statusChangeReason = await confirmRiskStatusChange(
        originalStatus,
        finalStatus,
      );
    } catch (error: any) {
      showAlert(error.message || "관리자 2차 인증에 실패했습니다.", { type: "error" });
      return;
    }

    if (!statusChangeReason) return;
  }

  const confirmMessage =
    willAutoShip
      ? "운송장 번호가 등록되어 있습니다.\n저장하면 상품 상태가 배송중으로 변경됩니다."
      : requestedStatus === "preparing"
        ? "상품을 배송준비중 상태로 저장합니다.\n고객 주문취소 가능 여부와 실제 배송 상태를 확인해주세요."
      : "상태를 저장하시겠습니까?";

  const confirmed = await showConfirm(confirmMessage, {
    confirmText: "저장",
    cancelText: "취소",
  });
  if (!confirmed) return;

  savingStatus.value[item.id] = true;
  try {
    // API 호출 (상태만 업데이트)
    const updatedItem = await updateAdminOrderItem(
      item.id,
      finalStatus,
      item.trackingNumber,
      item.courierCompany,
      statusChangeReason,
    );
    const savedStatus = updatedItem?.status || finalStatus;
    item.status = savedStatus;

    showAlert(
      willAutoShip
        ? "운송장 번호가 확인되어\n배송중 상태로 저장되었습니다."
        : ADMIN_MESSAGES.orderStatusSaveSuccess,
    );

    // 원본 데이터 업데이트
    const originalOrder = originalOrders.value.find((o) =>
      o.orderItems.some((oi: any) => oi.id === item.id),
    );
    if (originalOrder) {
      const originalItem = originalOrder.orderItems.find(
        (oi: any) => oi.id === item.id,
      );
      if (originalItem) {
        originalItem.status = savedStatus;
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

  const willAutoShip =
    selectedOrderItem.value.status === "preparing" &&
    Boolean(data.trackingNumber?.trim());

  const confirmed = await showConfirm(
    willAutoShip
      ? "운송장 번호가 입력되었습니다.\n저장하면 상품 상태가 배송중으로 변경됩니다."
      : "배송 정보를 저장합니다.\n운송장 번호는 나중에 다시 수정할 수 있습니다.",
    {
    confirmText: "저장",
    cancelText: "취소",
    },
  );
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

    showAlert(
      willAutoShip
        ? "배송 정보가 저장되었고\n상품 상태가 배송중으로 변경되었습니다."
        : ADMIN_MESSAGES.shippingInfoSaveSuccess,
    );
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
  window.addEventListener("mousedown", handleGlobalPointerDown);
  window.addEventListener("keydown", handleGlobalKeydown);

  // DOM이 준비된 후 옵저버 설정
  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }
});

onUnmounted(() => {
  cleanupObserver();
  window.removeEventListener("mousedown", handleGlobalPointerDown);
  window.removeEventListener("keydown", handleGlobalKeydown);
  if (searchDebounce) {
    clearTimeout(searchDebounce);
    searchDebounce = null;
  }
});
</script>

<template>
  <div class="order-admin-page w-11/12 max-w-screen-2xl mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
    <AdminNavigationTabs />
    <!-- 헤더 -->
    <div class="mb-4">
      <h3 class="text-heading text-admin tracking-wider">주문/배송 관리</h3>
      <p class="mt-1 text-body text-admin-muted">
        <template v-if="selectedStatus !== 'all' || searchQuery.trim() || startDate || endDate">
          검색 결과
          <span class="text-body font-bold text-admin">{{ filteredOrders.length }}</span>건
          <span class="text-caption text-admin-muted">/ 전체 {{ orders.length }}건</span>
        </template>
        <template v-else>
          총
          <span class="text-body font-bold text-admin">{{ orders.length }}</span>건 주문
        </template>
      </p>
    </div>
    <Separator class="mb-4 bg-border/70"></Separator>

    <!-- 빠른 필터 버튼 -->
    <div class="mb-4 flex items-center justify-between gap-3 flex-wrap border-y border-border/70 bg-card/60 px-3 py-3">
      <!-- 왼쪽: 전체상태 드롭다운 + 건수 -->
      <div class="flex items-center gap-2">
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-[140px] h-8 text-xs">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem :value="MANUAL_REFUND_FILTER_VALUE">수기환불 대상</SelectItem>
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
            variant="outline"
            :class="
              selectedStatus === opt.value
                ? 'bg-transparent border-transparent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ring-2 ring-ring ring-offset-2 ring-offset-background text-admin-muted hover:bg-transparent active:bg-transparent'
                : 'bg-transparent text-admin-muted hover:bg-transparent hover:border-border/80 hover:text-admin-muted active:bg-transparent'
            "
            @click="selectedStatus = opt.value"
            class="text-xs gap-1.5"
          >
            {{ opt.label }}
            <span
              v-if="opt.value !== 'all' && getQuickFilterCount(opt.value) > 0"
              class="font-bold text-admin"
            >
              {{ getQuickFilterCount(opt.value) }}
            </span>
          </Button>
      </div>
    </div>

    <!-- 검색 / 기간 필터 -->
    <div class="mb-5 border-y border-border/70 bg-card/60 px-3 py-3">
      <div class="flex flex-wrap items-start gap-3">
        <div class="relative w-full lg:max-w-sm">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            v-model="searchInput"
            type="text"
            name="order-search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="주문번호/주문자명 검색"
            class="pl-9 bg-background"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div ref="datePanelRef" class="relative">
            <Button
              size="sm"
              variant="outline"
              class="gap-2 min-w-[230px] justify-start bg-background"
              @click="toggleDatePanel"
            >
              <CalendarDays class="w-4 h-4 text-admin-muted" />
              <span class="truncate">{{ dateRangeLabel }}</span>
            </Button>

            <div
              v-if="isDatePanelOpen"
              class="absolute left-0 top-full mt-1 z-30 w-[min(92vw,380px)] rounded-xl border border-border bg-background shadow-xl p-4"
            >
              <div class="mb-3">
                <div class="flex items-center justify-between">
                  <p class="text-body font-semibold text-admin">기간 선택</p>
                  <Button size="sm" variant="ghost" @click="closeDatePanel">닫기</Button>
                </div>
                <p class="text-caption text-admin-muted mt-0.5">
                  빠른 기간 또는 직접 날짜를 선택하세요.
                </p>
              </div>

              <div class="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <button
                  type="button"
                  @click="openCalendarModal('start')"
                  class="rounded-lg border border-border px-3 py-2 text-left transition-colors bg-muted/20 hover:bg-muted/35"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">시작일</p>
                  <p class="text-caption font-semibold mt-0.5 text-admin">
                    {{ draftStartDate || "YYYY-MM-DD" }}
                  </p>
                </button>
                <span class="text-caption text-muted-foreground text-center">~</span>
                <button
                  type="button"
                  @click="openCalendarModal('end')"
                  class="rounded-lg border border-border px-3 py-2 text-left transition-colors bg-muted/20 hover:bg-muted/35"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">종료일</p>
                  <p class="text-caption font-semibold mt-0.5 text-admin">
                    {{ draftEndDate || "YYYY-MM-DD" }}
                  </p>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2 mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs"
                  @click="applyDatePreset('today')"
                >
                  오늘
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs"
                  @click="applyDatePreset('last7days')"
                >
                  최근 7일
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs"
                  @click="applyDatePreset('last30days')"
                >
                  최근 30일
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs"
                  @click="applyDatePreset('thisMonth')"
                >
                  이번 달
                </Button>
              </div>

              <div class="mt-4 flex justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-caption text-admin-muted"
                  @click="clearDateRange"
                >
                  날짜 초기화
                </Button>
                <Button size="sm" @click="applyDateRange">적용</Button>
              </div>
            </div>

            <div
              v-if="isDatePanelOpen && isCalendarModalOpen"
              class="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4"
              @click.self="closeCalendarModal"
            >
              <div
                ref="calendarModalRef"
                class="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-4"
              >
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-body font-semibold text-admin">
                    {{ dateSelectionTarget === "start" ? "시작일 선택" : "종료일 선택" }}
                  </p>
                  <Button size="sm" variant="ghost" @click="closeCalendarModal">닫기</Button>
                </div>

                <div class="rounded-lg border border-border bg-muted/10 p-2">
                  <div class="mb-2 flex items-center justify-between">
                    <Button size="icon" variant="ghost" class="h-8 w-8" @click="goPrevMonth">
                      <ChevronLeft class="w-4 h-4" />
                    </Button>
                    <p class="text-caption font-semibold text-admin">{{ calendarMonthLabel }}</p>
                    <Button size="icon" variant="ghost" class="h-8 w-8" @click="goNextMonth">
                      <ChevronRight class="w-4 h-4" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-7 gap-1 mb-1">
                    <span
                      v-for="day in dayLabels"
                      :key="day"
                      class="h-7 flex items-center justify-center text-[11px] text-admin-muted font-semibold"
                    >
                      {{ day }}
                    </span>
                  </div>

                  <div class="grid grid-cols-7 gap-1">
                    <button
                      v-for="cell in calendarDays"
                      :key="cell.iso"
                      type="button"
                      :disabled="cell.isDisabled"
                      @click="handleCalendarDateSelect(cell.iso)"
                      :class="[
                        'h-9 rounded-md text-caption font-medium transition-colors',
                        cell.isCurrentMonth
                          ? 'text-admin'
                          : 'text-admin-muted/45',
                        cell.isInRange
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/60',
                        cell.isStart || cell.isEnd
                          ? 'bg-primary text-white hover:bg-primary'
                          : '',
                        cell.isToday && !(cell.isStart || cell.isEnd)
                          ? 'ring-1 ring-primary/60'
                          : '',
                        cell.isDisabled
                          ? 'opacity-30 cursor-not-allowed hover:bg-transparent'
                          : '',
                      ]"
                    >
                      {{ cell.day }}
                    </button>
                  </div>
                </div>

                <div class="mt-4 flex justify-end">
                  <Button size="sm" @click="closeCalendarModal">선택 완료</Button>
                </div>
              </div>
            </div>
          </div>

          <Button size="sm" variant="outline" @click="clearFilters">
            필터 초기화
          </Button>
        </div>
      </div>
    </div>

    <!-- 상태별 현황 요약 (우측 정렬) -->
    <div class="mb-5 flex items-center justify-end gap-3 flex-wrap">
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

    <LoadingSpinner v-if="loading && !hasLoadedOnce" />

    <div v-else class="space-y-4">
      <div
        v-if="loading && hasLoadedOnce"
        class="border-y border-border/70 bg-card px-4 py-2 text-caption text-admin-muted"
      >
        주문 목록 업데이트 중...
      </div>

      <div v-if="filteredOrders.length > 0" class="space-y-6">
        <Card
          v-for="order in displayedOrders"
          :key="order.id"
          class="overflow-hidden border-x-0 border-y border-t-border border-b-border/70 bg-card shadow-none group"
        >
        <CardHeader
          class="bg-muted/15 px-5 py-2.5 border-b border-border/70 transition-colors group-hover:bg-muted/25"
        >
          <div class="flex flex-wrap justify-between items-center gap-4">
            <div class="flex items-center gap-4">
              <div class="flex flex-col">
                <span
                  class="text-[11px] font-bold leading-[1.1] text-admin-muted uppercase tracking-tighter"
                  >주문번호</span
                >
                <span class="text-caption font-semibold leading-[1.2] text-admin-muted">{{
                  order.externalOrderId || order.id
                }}</span>
              </div>
              <div class="h-6 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-[11px] font-bold leading-[1.1] text-admin-muted uppercase tracking-tighter"
                  >주문일자</span
                >
                <div
                  class="flex items-center gap-1.5 text-caption leading-[1.2] text-admin-muted font-semibold"
                >
                  <Calendar class="w-3.5 h-3.5 opacity-50" />
                  {{ formatDate(order.createdAt) }}({{
                    getDayName(order.createdAt)
                  }})
                </div>
              </div>
              <div class="h-6 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col">
                <span
                  class="text-[11px] font-bold leading-[1.1] text-admin-muted uppercase tracking-tighter"
                  >주문자</span
                >
                <div
                  class="flex items-center gap-1.5 text-caption leading-[1.2] text-admin font-bold"
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
              <div class="h-6 w-px bg-border hidden sm:block"></div>
              <div class="flex flex-col max-w-xs">
                <span
                  class="text-[11px] font-bold leading-[1.1] text-admin-muted uppercase tracking-tighter"
                  >배송지</span
                >
                <div class="flex items-start gap-1.5">
                  <MapPin
                    class="w-3.5 h-3.5 opacity-50 text-admin-muted mt-0.5 flex-shrink-0"
                  />
                  <span class="text-caption leading-[1.2] text-admin-muted font-semibold">
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
            <div class="flex items-baseline justify-end gap-1.5 whitespace-nowrap text-right">
              <span
                class="text-[11px] font-semibold leading-none text-admin-muted uppercase tracking-tighter"
                >총액</span
              >
              <span class="text-[15px] font-bold leading-none text-admin"
                >{{ formatPrice(order.totalAmount) }}</span
              >
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-0 overflow-x-auto">
          <table class="order-admin-table w-full table-fixed text-left border-separate border-spacing-0 min-w-[1200px]">
            <colgroup>
              <col class="w-[410px]" />
              <col class="w-[120px]" />
              <col class="w-[180px]" />
              <col class="w-[230px]" />
              <col class="w-[110px]" />
              <col class="w-[150px]" />
            </colgroup>
            <thead
              class="border-b border-border/70 bg-transparent text-caption font-semibold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-5 py-2">상품 정보</th>
                <th class="px-5 py-2 text-center">수량/금액</th>
                <th class="px-5 py-2 text-center">상태 정보</th>
                <th class="px-5 py-2 text-center">배송 정보</th>
                <th class="px-5 py-2 text-center">상태 관리</th>
                <th class="px-5 py-2 text-center whitespace-nowrap">취소 관리</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in order.orderItems"
                :key="item.id"
                class="transition-colors hover:bg-primary/[0.03]"
              >
                <td class="px-5 py-2.5">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="h-11 w-11 shrink-0 bg-muted/20 overflow-hidden border border-border/70 transition-colors group-hover:border-primary/20"
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
                    <div class="min-w-0">
                      <div class="truncate text-[14px] font-medium leading-[1.25] text-admin">
                        {{ item.productName }}
                      </div>
                      <div
                        class="mt-1 inline-block max-w-full truncate border border-border/60 bg-background px-1.5 py-0.5 text-[11px] leading-[1.2] text-admin-muted"
                      >
                        {{ item.options || "기본 옵션" }}
                      </div>
                    </div>
                  </div>
                </td>

                <td class="px-5 py-2.5 text-center">
                  <div class="whitespace-nowrap text-[14px] font-semibold leading-[1.25] text-admin">
                    <span class="text-admin">{{ item.quantity }}</span
                    >개
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-[11px] leading-[1.2] text-admin-muted">
                    {{ formatPrice(item.productPrice) }}
                  </div>
                </td>

                <td class="px-5 py-2.5 text-center">
                  <div class="flex min-h-[48px] flex-col items-center justify-center">
                    <select
                      v-model="item.status"
                      :class="[
                        'inline-flex h-8 items-center border rounded-xl px-2.5 py-1 text-caption font-bold focus:ring-2 focus:ring-primary/20 outline-none w-36 transition-all shadow-sm',
                        getStatusClass(item.status),
                      ]"
                    >
                      <optgroup
                        v-for="group in statusOptionGroups"
                        :key="group.label"
                        :label="group.label"
                      >
                        <option
                          v-for="opt in group.options"
                          :key="opt.value"
                          :value="opt.value"
                          class="text-center"
                        >
                          {{ getStatusOptionLabel(item, opt) }}
                        </option>
                      </optgroup>
                    </select>
                    <!-- 정상 흐름 상태일 때 미니 프로그레스바 -->
                    <div
                      class="mt-1.5 flex w-28 gap-1"
                      :class="isNormalFlowStatus(item.status) ? '' : 'invisible'"
                    >
                      <div
                        v-for="step in 4"
                        :key="step"
                        class="h-1 flex-1 rounded-full transition-colors"
                        :class="
                          isNormalFlowStatus(item.status) &&
                          step - 1 <= getStepIndex(item.status)
                            ? 'bg-primary'
                            : 'bg-muted'
                        "
                      />
                    </div>
                    <div
                      v-if="getPendingStatusChangeLabel(item)"
                      class="mt-1 flex max-w-[170px] items-center justify-center gap-1"
                    >
                        <span
                          class="truncate border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary"
                          :title="getPendingStatusChangeLabel(item)"
                        >
                          변경됨 {{ getPendingStatusChangeLabel(item) }}
                        </span>
                    </div>
                  </div>
                </td>

                <td class="px-5 py-2.5 text-center">
                  <div class="flex min-h-[48px] w-full flex-col items-center justify-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openShippingModal(item, order)"
                      class="h-8 w-[96px] justify-center gap-1.5 px-2.5"
                    >
                      <Truck class="h-3.5 w-3.5" />
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
                    <button
                      v-if="item.trackingNumber"
                      type="button"
                      @click="openTrackingPage(item)"
                      class="inline-flex max-w-[170px] items-center gap-1 text-[11px] leading-[1.2] text-primary hover:underline font-mono"
                    >
                      <span class="truncate">{{ item.trackingNumber }}</span>
                      <ExternalLink class="h-3 w-3" />
                    </button>
                  </div>
                </td>

                <td class="px-5 py-2.5 text-center">
                  <Button
                    size="sm"
                    :variant="isPendingStatusChangeRisk(item) ? 'outline' : 'default'"
                    @click="handleSaveItemStatus(item)"
                    :disabled="isSaveDisabled(item) || savingStatus[item.id]"
                    :class="[
                      'h-8 px-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
                      isPendingStatusChangeRisk(item)
                        ? 'w-[96px] gap-1 border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 hover:text-amber-900'
                        : 'w-[72px] bg-primary text-white hover:bg-primary/80',
                    ]"
                  >
                    <span v-if="savingStatus[item.id]">저장중...</span>
                    <template v-else>
                      <span>저장</span>
                      <span
                        v-if="isPendingStatusChangeRisk(item)"
                        class="shrink-0 border border-amber-300 bg-amber-100 px-1 py-0.5 text-[9px] font-bold leading-none text-amber-800"
                      >
                        2FA
                      </span>
                    </template>
                  </Button>
                </td>

                <td class="px-5 py-2.5 text-center">
                  <div class="flex min-h-[48px] flex-col items-center justify-center gap-1.5">
                    <Button
                      v-if="isCancelable(item.status)"
                      variant="outline"
                      size="sm"
                      @click="openCancelModal(item, order)"
                      class="h-8 w-[116px] justify-center gap-1.5 border-destructive/40 bg-destructive/5 px-2 text-destructive shadow-sm hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle class="h-3.5 w-3.5" />
                      <span class="text-caption font-semibold">주문 취소</span>
                    </Button>
                    <Button
                      v-for="action in getDangerActions(item)"
                      :key="action.value"
                      variant="outline"
                      size="sm"
                      class="h-8 w-[116px] justify-center gap-1 border-amber-300 bg-amber-50/80 px-1.5 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                      @click="handleDangerActionClick(action.value, item, order)"
                    >
                      <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
                      <span class="truncate text-caption font-semibold">
                        {{ action.label }}
                      </span>
                      <span
                        class="shrink-0 border border-amber-300 bg-amber-100 px-1 py-0.5 text-[9px] font-bold leading-none text-amber-800"
                      >
                        2FA
                      </span>
                    </Button>
                    <Button
                      v-if="!isCancelable(item.status) && getDangerActions(item).length === 0"
                      variant="outline"
                      size="sm"
                      disabled
                      class="h-8 w-[116px] justify-center gap-1.5 border-border px-2 text-muted-foreground opacity-60 cursor-not-allowed"
                    >
                      <XCircle class="h-3.5 w-3.5" />
                      <span class="truncate text-[11px]">
                        {{ getCancelUnavailableReason(item.status) }}
                      </span>
                    </Button>
                  </div>
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
    </div>

    <div
      v-if="filteredOrders.length === 0 && hasLoadedOnce"
      class="text-center py-24 border-y border-border/70 bg-card"
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

    <!-- 관리자 수기환불 모달 (PG 취소 호출 없음) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="manualRefundModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeManualRefundModal()"
        >
          <div class="w-full max-w-lg border border-border bg-card shadow-2xl">
            <div class="border-b border-border/70 px-5 py-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-amber-50">
                  <AlertTriangle class="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 class="text-body font-bold text-admin">수기환불 처리</h3>
                  <p class="mt-1 text-caption leading-[1.35] text-admin-muted">
                    PG 취소 API를 호출하지 않고 계좌 환불 완료 내역만 시스템에 반영합니다.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4 px-5 py-4">
              <div class="border-y border-border/70 bg-muted/10 px-3 py-3">
                <p class="text-caption font-semibold text-admin">
                  {{ manualRefundTargetItem?.productName || "상품" }}
                </p>
                <p class="mt-1 text-caption text-admin-muted">
                  현재 상태: {{ getStatusLabel(manualRefundTargetItem?.status || "") }}
                </p>
              </div>

              <div class="rounded-none border border-amber-200 bg-amber-50 px-3 py-3 text-caption leading-[1.45] text-amber-900">
                배송중 상품을 이미 고객 계좌로 환불한 경우에만 사용하세요.
                <br />
                처리 후 해당 상품은 주문취소로, 주문 전체는 부분환불 또는 주문취소로 반영됩니다.
              </div>

              <div class="border-y border-border/70 bg-muted/10 px-3 py-3">
                <p class="text-caption font-semibold text-admin-muted">수기환불 반영 금액</p>
                <p class="mt-1 text-body font-bold text-admin">
                  {{ formatPrice(getManualRefundAmount(manualRefundTargetItem)) }}
                </p>
              </div>

              <div class="grid gap-2">
                <label class="text-caption font-semibold text-admin-muted">
                  수기환불 처리 메모
                </label>
                <Textarea
                  v-model="manualRefundReason"
                  placeholder="예: 택배사 분실로 고객 계좌 환불 완료"
                  class="min-h-20 rounded-none"
                  :disabled="manualRefundLoading"
                />
                <p class="text-[11px] leading-[1.35] text-admin-muted">
                  이 메모는 고객 화면에 노출되는 취소 사유로 저장하지 않습니다.
                </p>
              </div>

            </div>

            <div class="flex gap-2 border-t border-border/70 px-5 py-4">
              <Button
                variant="outline"
                class="flex-1"
                :disabled="manualRefundLoading"
                @click="closeManualRefundModal()"
              >
                취소
              </Button>
              <Button
                class="flex-1 bg-amber-700 text-white hover:bg-amber-800"
                :disabled="manualRefundLoading"
                @click="handleManualRefund"
              >
                <LoadingSpinner
                  v-if="manualRefundLoading"
                  variant="spinner"
                  size="sm"
                  color="white"
                  :center="false"
                  class="mr-2"
                />
                {{ manualRefundLoading ? "처리 중..." : "수기환불 처리" }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
.order-admin-page :deep(input),
.order-admin-page :deep([role="combobox"]) {
  border-radius: 0;
  border-color: hsl(var(--border) / 0.7);
  background: hsl(var(--card));
  box-shadow: none;
}

.order-admin-page :deep(input:focus-visible),
.order-admin-page :deep([role="combobox"]:focus) {
  outline: none;
  box-shadow: none;
}

.order-admin-table th,
.order-admin-table td {
  border-left: 1px solid hsl(var(--border) / 0.34);
  vertical-align: middle;
}

.order-admin-table th:first-child,
.order-admin-table td:first-child {
  border-left: 0;
}

.order-admin-table tbody td {
  border-top: 1px solid hsl(var(--border) / 0.46);
}

.order-admin-table thead th {
  line-height: 1.2;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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
