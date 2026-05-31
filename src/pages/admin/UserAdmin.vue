<script setup lang="ts">
// Vue 및 라우터
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";

// 스토어 및 유틸리티
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import { formatDate, formatDateTime, formatPrice } from "@/lib/formatters";

// API
import { fetchAdminUsers, fetchAdminUserDetail, updateUserRole } from "@/lib/api";

// 타입
import type {
  User,
  AdminUsersResponse,
  AdminUserDetailResponse,
  Pagination,
} from "@/types/api";

// UI 컴포넌트
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/common";
import { AdminNavigationTabs } from "@/components/admin";
import { getUserProfileImageUrl } from "@/lib/constants/profile";
import {
  Users,
  Search,
  X,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserCog,
  Loader2,
} from "lucide-vue-next";

// --- 상태 관리 ---
const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showConfirm } = useAlert();

const users = ref<User[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const searchInput = ref(""); // 입력 필드용

// 페이지네이션 상태
const pagination = ref<Pagination>({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasMore: false,
});

// 상세 모달 상태
const isDetailModalOpen = ref(false);
const selectedUser = ref<User | null>(null);
const userStats = ref<AdminUserDetailResponse["stats"] | null>(null);
const loadingDetail = ref(false);

// 관리자 권한 관리 모달 상태
const isRoleModalOpen = ref(false);
const roleSearchInput = ref("");
const roleSearchResults = ref<User[]>([]);
const selectedUserForRole = ref<User | null>(null);
const loadingRoleSearch = ref(false);
const loadingRoleUpdate = ref(false);

// --- 검색 디바운싱 ---
let searchTimeout: NodeJS.Timeout | null = null;

watch(searchInput, (newValue) => {
  if (searchTimeout) clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    searchQuery.value = newValue;
    pagination.value.page = 1; // 검색 시 첫 페이지로
    loadData();
  }, 500); // 500ms 디바운싱
});

// --- 데이터 로드 ---
const loadData = async () => {
  loading.value = true;
  try {
    const response: AdminUsersResponse = await fetchAdminUsers({
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    users.value = response.users;
    pagination.value = response.pagination;
  } catch (error: any) {
    console.error("회원 목록 로드 실패:", error);
    showAlert(error.message || ADMIN_MESSAGES.userListLoadFailed, {
      type: "error",
    });
  } finally {
    loading.value = false;
  }
};

// --- 상세 정보 모달 ---
const openDetailModal = async (user: User) => {
  selectedUser.value = user;
  userStats.value = null;
  isDetailModalOpen.value = true;
  loadingDetail.value = true;

  try {
    const response: AdminUserDetailResponse = await fetchAdminUserDetail(
      user.id
    );
    selectedUser.value = response.user;
    userStats.value = response.stats;
  } catch (error: any) {
    console.error("회원 상세 정보 로드 실패:", error);
    showAlert(error.message || ADMIN_MESSAGES.userDetailLoadFailed, {
      type: "error",
    });
  } finally {
    loadingDetail.value = false;
  }
};

const closeDetailModal = () => {
  isDetailModalOpen.value = false;
  selectedUser.value = null;
  userStats.value = null;
};

// --- 검색 초기화 ---
const clearSearch = () => {
  searchInput.value = "";
  searchQuery.value = "";
  pagination.value.page = 1;
  loadData();
};

// --- 관리자 권한 관리 모달 ---
const openRoleModal = () => {
  isRoleModalOpen.value = true;
  roleSearchInput.value = "";
  roleSearchResults.value = [];
  selectedUserForRole.value = null;
};

const closeRoleModal = () => {
  isRoleModalOpen.value = false;
  roleSearchInput.value = "";
  roleSearchResults.value = [];
  selectedUserForRole.value = null;
};

// 권한 관리용 사용자 검색
let roleSearchTimeout: NodeJS.Timeout | null = null;

const searchUsersForRole = () => {
  if (roleSearchTimeout) clearTimeout(roleSearchTimeout);

  if (!roleSearchInput.value.trim()) {
    roleSearchResults.value = [];
    return;
  }

  roleSearchTimeout = setTimeout(async () => {
    loadingRoleSearch.value = true;
    try {
      const response = await fetchAdminUsers({
        search: roleSearchInput.value,
        limit: 10,
      });
      roleSearchResults.value = response.users;
    } catch (error: any) {
      console.error("사용자 검색 실패:", error);
      showAlert(error.message || ADMIN_MESSAGES.userSearchFailed, { type: "error" });
    } finally {
      loadingRoleSearch.value = false;
    }
  }, 300);
};

// 권한 변경 대상 사용자 선택
const selectUserForRole = (user: User) => {
  selectedUserForRole.value = user;
  roleSearchResults.value = [];
  roleSearchInput.value = "";
};

// 선택 취소
const clearSelectedUserForRole = () => {
  selectedUserForRole.value = null;
};

const hasText = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

const displayText = (value: unknown, fallback = "미입력"): string => {
  return hasText(value) ? String(value).trim() : fallback;
};

const displayUserName = (user: Partial<User> | null | undefined): string => {
  return displayText(user?.userName, "이름 없음");
};

const displayUserEmail = (user: Partial<User> | null | undefined): string => {
  return displayText(user?.email, "이메일 미입력");
};

const displayUserPhone = (user: Partial<User> | null | undefined): string => {
  return displayText(user?.phone, "연락처 미입력");
};

const displayUserAddress = (user: Partial<User> | null | undefined): string => {
  const zip = hasText(user?.zipCode) ? `(${String(user?.zipCode).trim()})` : "";
  const address = hasText(user?.address) ? String(user?.address).trim() : "";
  return [zip, address].filter(Boolean).join(" ") || "주소 미입력";
};

// 관리자 권한 부여/해제
const handleRoleUpdate = async (grantAdmin: boolean) => {
  if (!selectedUserForRole.value) return;

  const actionText = grantAdmin ? "부여" : "해제";

  const confirmed = await showConfirm(
    `${displayUserName(selectedUserForRole.value)}님에게 관리자 권한을 ${actionText}하시겠습니까?`,
    {
      confirmText: actionText,
      cancelText: "취소",
    }
  );

  if (!confirmed) return;

  loadingRoleUpdate.value = true;
  try {
    const response = await updateUserRole(selectedUserForRole.value.id, grantAdmin);
    showAlert(response.message, { type: "success" });

    // 선택된 사용자 정보 업데이트
    selectedUserForRole.value = response.user;

    // 목록 새로고침
    loadData();
  } catch (error: any) {
    console.error("권한 변경 실패:", error);
    showAlert(error.message || ADMIN_MESSAGES.userRoleUpdateFailed, { type: "error" });
  } finally {
    loadingRoleUpdate.value = false;
  }
};

// --- 페이지네이션 ---
const changePage = (page: number) => {
  pagination.value.page = page;
  loadData();
};

const goToPrevPage = () => {
  if (pagination.value.page > 1) {
    changePage(pagination.value.page - 1);
  }
};

const goToNextPage = () => {
  if (pagination.value.hasMore) {
    changePage(pagination.value.page + 1);
  }
};



// --- 로그인 제공자 포맷팅 ---
const formatProvider = (socialProvider: string | undefined | null) => {
  if (!socialProvider || socialProvider === "local") return "일반";
  const providerMap: Record<string, string> = {
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
  };
  return providerMap[socialProvider] || socialProvider;
};

const getProviderColor = (_socialProvider: string | undefined | null): "outline" => {
  // 모든 로그인 타입을 동일한 스타일로 표시
  return "outline";
};

// --- ESC 키로 모달 닫기 ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (isRoleModalOpen.value) {
      closeRoleModal();
    } else if (isDetailModalOpen.value) {
      closeDetailModal();
    }
  }
};

onMounted(async () => {
  // ESC 키 이벤트 등록
  window.addEventListener("keydown", handleKeydown);

  // 관리자 권한 확인
  if (!authStore.user) await authStore.loadUser();
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  loadData();
});

onUnmounted(() => {
  // ESC 키 이벤트 해제
  window.removeEventListener("keydown", handleKeydown);
  if (searchTimeout) clearTimeout(searchTimeout);
  if (roleSearchTimeout) clearTimeout(roleSearchTimeout);
});
</script>

<template>
  <div class="user-admin-page w-11/12 max-w-screen-2xl mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
    <AdminNavigationTabs />
    <!-- 헤더 -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h3 class="text-heading text-admin tracking-wider">회원 관리</h3>
        <p class="mt-1 mb-3 text-body text-admin-muted">
          총
          <span class="text-body font-bold text-admin">{{ pagination.total }}</span>명 회원
          <span class="text-caption text-admin-muted">
            / 현재 {{ users.length }}명 표시
          </span>
        </p>
      </div>
      <Button
        variant="outline"
        @click="openRoleModal"
        class="mb-2 gap-2 text-admin font-semibold"
      >
        <UserCog class="w-4 h-4" />
        관리자 권한 관리
      </Button>
    </div>
    <Separator class="mb-4 bg-border/70"></Separator>

    <!-- 검색바 -->
    <div class="mb-4 flex flex-wrap items-center gap-3 border-y border-border/70 bg-card/60 px-3 py-3">
      <div class="relative w-full sm:max-w-md">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted"
        />
        <Input
          v-model="searchInput"
          type="text"
          placeholder="이름, 이메일, 연락처로 검색..."
          class="pl-10 pr-10"
        />
        <Button
          v-if="searchInput"
          variant="ghost"
          size="icon"
          class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          @click="clearSearch"
        >
          <X class="w-3.5 h-3.5" />
          </Button>
      </div>
      <Badge variant="outline" class="px-3 py-1.5">
        {{ users.length }}명
      </Badge>
    </div>

    <!-- 초기 로딩 스피너 -->
    <LoadingSpinner v-if="loading && users.length === 0" />

    <!-- 회원 목록 테이블 -->
    <Card v-else class="overflow-hidden border-x-0 border-y border-border/70 bg-card shadow-none">
      <div
        v-if="loading && users.length > 0"
        class="flex items-center gap-2 border-b border-border/70 bg-card px-6 py-3 text-caption text-admin-muted"
      >
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        회원 목록 업데이트 중...
      </div>
      <CardContent class="p-0 overflow-x-auto">
        <table class="user-admin-table w-full min-w-[1000px] border-separate border-spacing-0 text-left">
          <thead
            class="border-b border-border/70 bg-transparent text-caption font-semibold text-admin-muted uppercase tracking-tight"
          >
            <tr>
              <th class="px-5 py-2.5 w-16">No.</th>
              <th class="px-5 py-2.5">회원정보</th>
              <th class="px-5 py-2.5">연락처</th>
              <th class="px-5 py-2.5 text-center">로그인</th>
              <th class="px-5 py-2.5 text-center">권한</th>
              <th class="px-5 py-2.5 text-center">가입일</th>
              <th class="px-5 py-2.5 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(user, index) in users"
              :key="user.id"
              class="group transition-colors hover:bg-primary/[0.03]"
            >
              <!-- No. -->
              <td class="px-5 py-2.5 text-caption text-admin-muted">
                {{ (pagination.page - 1) * pagination.limit + index + 1 }}
              </td>

              <!-- 회원정보 (이름 + 이메일) -->
              <td class="px-5 py-2.5">
                <div class="flex items-center gap-3">
                  <Avatar
                    v-if="user.isAdmin"
                    shape="square"
                    class="h-9 w-9 rounded-[3px] border border-primary/10 bg-white ring-1 ring-primary/10"
                  >
                    <AvatarImage
                      :src="getUserProfileImageUrl(user) || ''"
                      :alt="`${displayUserName(user)} 프로필`"
                      class="object-contain p-1"
                    />
                    <AvatarFallback
                      class="flex h-full w-full items-center justify-center bg-white"
                    >
                      <Shield class="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="text-[14px] font-medium leading-[1.25] text-admin">
                      {{ displayUserName(user) }}
                    </div>
                    <div
                      class="mt-0.5 flex items-center gap-1 text-[11px] leading-[1.2] text-admin-muted"
                    >
                      <Mail class="w-3 h-3" />
                      {{ displayUserEmail(user) }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- 연락처 -->
              <td class="px-5 py-2.5">
                <div class="flex items-center gap-1 text-caption text-admin">
                  <Phone class="w-3.5 h-3.5 text-admin-muted" />
                  <span :class="hasText(user.phone) ? 'text-admin' : 'text-admin-muted'">
                    {{ displayUserPhone(user) }}
                  </span>
                </div>
              </td>

              <!-- 로그인 제공자 -->
              <td class="px-5 py-2.5 text-center">
                <Badge :variant="getProviderColor(user.socialProvider)">
                  {{ formatProvider(user.socialProvider) }}
                </Badge>
              </td>

              <!-- 권한 -->
              <td class="px-5 py-2.5 text-center">
                <Badge
                  :variant="user.isAdmin ? 'default' : 'outline'"
                  class="gap-1"
                >
                  <Shield v-if="user.isAdmin" class="w-3 h-3" />
                  {{ user.isAdmin ? "관리자" : "일반회원" }}
                </Badge>
              </td>

              <!-- 가입일 -->
              <td class="px-5 py-2.5 text-center">
                <div
                  class="text-caption text-admin-muted flex items-center justify-center gap-1"
                >
                  <Calendar class="w-3.5 h-3.5" />
                  {{ formatDate(user.createdAt) }}
                </div>
              </td>

              <!-- 작업 버튼 -->
              <td class="px-5 py-2.5 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  @click="openDetailModal(user)"
                  class="text-admin font-semibold"
                >
                  상세보기
                </Button>
              </td>
            </tr>

            <!-- 빈 데이터 -->
            <tr v-if="users.length === 0">
              <td colspan="7" class="px-6 py-16 text-center text-admin-muted">
                <Users class="w-12 h-12 mx-auto mb-3 opacity-10" />
                <p v-if="searchQuery">검색 결과가 없습니다.</p>
                <p v-else>등록된 회원이 없습니다.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>

      <!-- 페이지네이션 -->
      <div
        v-if="pagination.totalPages > 1"
        class="flex items-center justify-center gap-2 border-t border-border/70 bg-card p-4"
      >
        <Button
          variant="outline"
          size="icon"
          @click="goToPrevPage"
          :disabled="pagination.page === 1"
        >
          <ChevronLeft class="w-4 h-4" />
        </Button>

        <div class="flex gap-1">
          <Button
            v-for="p in pagination.totalPages"
            :key="p"
            @click="changePage(p)"
            :variant="pagination.page === p ? 'default' : 'outline'"
            size="icon"
            class="w-9 h-9"
          >
            {{ p }}
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          @click="goToNextPage"
          :disabled="!pagination.hasMore"
        >
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </Card>

    <!-- 상세 정보 모달 -->
    <div
      v-if="isDetailModalOpen && selectedUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
      @click.self="closeDetailModal"
    >
      <div
        class="w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div class="p-6 sm:p-8">
          <!-- 헤더 -->
          <div class="mb-5 flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-4">
              <Avatar
                v-if="selectedUser?.isAdmin"
                shape="square"
                class="h-14 w-14 shrink-0 rounded-[3px] border border-primary/10 bg-white ring-1 ring-primary/10"
              >
                <AvatarImage
                  :src="getUserProfileImageUrl(selectedUser) || ''"
                  :alt="`${displayUserName(selectedUser)} 프로필`"
                  class="object-contain p-1.5"
                />
                <AvatarFallback
                  class="flex h-full w-full items-center justify-center bg-white"
                >
                  <Shield class="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0">
                <h2
                  id="user-detail-title"
                  class="truncate text-xl font-bold leading-tight text-admin"
                >
                  {{ displayUserName(selectedUser) }}
                </h2>
                <div class="mt-1 flex min-w-0 items-center gap-2 text-caption text-admin-muted">
                  <Mail class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">{{ displayUserEmail(selectedUser) }}</span>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <Badge :variant="getProviderColor(selectedUser?.socialProvider)">
                    {{ formatProvider(selectedUser?.socialProvider) }} 로그인
                  </Badge>
                  <Badge
                    :variant="selectedUser?.isAdmin ? 'default' : 'outline'"
                    class="gap-1"
                  >
                    <Shield v-if="selectedUser?.isAdmin" class="h-3 w-3" />
                    {{ selectedUser?.isAdmin ? "관리자" : "일반회원" }}
                  </Badge>
                  <Badge :variant="selectedUser?.emailOptIn ? 'default' : 'outline'">
                    이메일 수신 {{ selectedUser?.emailOptIn ? "동의" : "미동의" }}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" @click="closeDetailModal">
              <X class="w-5 h-5" />
            </Button>
          </div>

          <Separator class="mb-5 bg-border/70" />

          <!-- 로딩 상태 -->
          <LoadingSpinner
            v-if="loadingDetail"
            :center="false"
            class="py-12"
          />

          <div v-else class="space-y-5">
            <!-- 활동 통계 -->
            <section v-if="userStats" class="border-y border-border/70 bg-muted/10 px-4 py-4">
              <h3 class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-admin-muted">
                활동 통계
              </h3>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p class="text-[11px] leading-[1.2] text-admin-muted">총 주문</p>
                  <p class="mt-1 text-[15px] font-semibold leading-none text-admin">
                    {{ userStats.totalOrders }}건
                  </p>
                </div>
                <div>
                  <p class="text-[11px] leading-[1.2] text-admin-muted">
                    총 구매액 <span class="text-[10px]">(취소 제외)</span>
                  </p>
                  <p class="mt-1 text-[15px] font-semibold leading-none text-admin">
                    {{ formatPrice(userStats.totalSpent) }}
                  </p>
                </div>
                <div>
                  <p class="text-[11px] leading-[1.2] text-admin-muted">최근 주문일</p>
                  <p
                    class="mt-1 text-[15px] font-semibold leading-none"
                    :class="userStats.lastOrderDate ? 'text-admin' : 'text-admin-muted'"
                  >
                    {{
                      userStats.lastOrderDate
                        ? formatDate(userStats.lastOrderDate)
                        : "주문 없음"
                    }}
                  </p>
                </div>
                <div>
                  <p class="text-[11px] leading-[1.2] text-admin-muted">총 문의</p>
                  <p class="mt-1 text-[15px] font-semibold leading-none text-admin">
                    {{ userStats.totalInquiries }}건
                  </p>
                </div>
              </div>
            </section>

            <!-- 기본 정보 + 주소 정보 -->
            <div class="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section class="border-y border-border/70 bg-muted/10 px-4 py-4">
                <h3 class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-admin-muted">
                  기본 정보
                </h3>
                <dl class="space-y-3">
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="flex items-center gap-1.5 text-caption font-semibold text-admin-muted">
                      <Phone class="h-3.5 w-3.5" />
                      연락처
                    </dt>
                    <dd
                      class="text-caption"
                      :class="hasText(selectedUser.phone) ? 'text-admin' : 'text-admin-muted'"
                    >
                      {{ displayUserPhone(selectedUser) }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="flex items-center gap-1.5 text-caption font-semibold text-admin-muted">
                      <Calendar class="h-3.5 w-3.5" />
                      가입일시
                    </dt>
                    <dd class="text-caption text-admin">
                      {{ hasText(selectedUser.createdAt) ? formatDateTime(selectedUser.createdAt) : "가입일 미입력" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="flex items-center gap-1.5 text-caption font-semibold text-admin-muted">
                      <Shield class="h-3.5 w-3.5" />
                      로그인
                    </dt>
                    <dd class="text-caption text-admin">
                      {{ formatProvider(selectedUser.socialProvider) }} 로그인
                    </dd>
                  </div>
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="text-caption font-semibold text-admin-muted">
                      회원 구분
                    </dt>
                    <dd class="text-caption text-admin">
                      {{ selectedUser?.isAdmin ? "관리자" : "일반회원" }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="text-caption font-semibold text-admin-muted">
                      수신 상태
                    </dt>
                    <dd class="text-caption text-admin">
                      이메일 수신 {{ selectedUser?.emailOptIn ? "동의" : "미동의" }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section class="border-y border-border/70 bg-muted/10 px-4 py-4">
                <h3 class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-admin-muted">
                  주소 정보
                </h3>
                <dl class="space-y-3">
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="flex items-center gap-1.5 text-caption font-semibold text-admin-muted">
                      <MapPin class="h-3.5 w-3.5" />
                      주소
                    </dt>
                    <dd
                      class="text-caption leading-[1.35]"
                      :class="hasText(selectedUser.address) || hasText(selectedUser.zipCode) ? 'text-admin' : 'text-admin-muted'"
                    >
                      {{ displayUserAddress(selectedUser) }}
                    </dd>
                  </div>
                  <div class="grid grid-cols-[88px_1fr] gap-3">
                    <dt class="text-caption font-semibold text-admin-muted">
                      상세주소
                    </dt>
                    <dd
                      class="text-caption leading-[1.35]"
                      :class="hasText(selectedUser.detailAddress) ? 'text-admin' : 'text-admin-muted'"
                    >
                      {{ displayText(selectedUser.detailAddress, "상세주소 미입력") }}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <!-- 하단 버튼 -->
            <div class="flex justify-end gap-2 border-t border-border/70 pt-4">
              <Button
                variant="outline"
                class="font-medium"
                @click="closeDetailModal"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 관리자 권한 관리 모달 -->
    <div
      v-if="isRoleModalOpen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      @click.self="closeRoleModal"
    >
      <div
        class="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div class="p-6">
          <!-- 헤더 -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center border border-border/70 bg-primary/10"
              >
                <UserCog class="w-5 h-5 text-primary" />
              </div>
              <h2 id="role-modal-title" class="text-lg font-bold text-admin">관리자 권한 관리</h2>
            </div>
            <Button variant="ghost" size="icon" @click="closeRoleModal">
              <X class="w-5 h-5" />
            </Button>
          </div>

          <!-- 선택된 사용자 표시 -->
          <div v-if="selectedUserForRole" class="mb-6">
            <div class="border-y border-border/70 bg-muted/20 px-4 py-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Avatar
                    v-if="selectedUserForRole.isAdmin"
                    shape="square"
                    class="h-10 w-10 rounded-[3px] border border-primary/10 bg-white ring-1 ring-primary/10"
                  >
                    <AvatarImage
                      :src="getUserProfileImageUrl(selectedUserForRole) || ''"
                      :alt="`${displayUserName(selectedUserForRole)} 프로필`"
                      class="object-contain p-1"
                    />
                    <AvatarFallback
                      class="flex h-full w-full items-center justify-center bg-white"
                    >
                      <Shield class="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div class="text-body font-semibold text-admin">
                      {{ displayUserName(selectedUserForRole) }}
                    </div>
                    <div class="text-caption text-admin-muted">
                      {{ displayUserEmail(selectedUserForRole) }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge
                    :variant="selectedUserForRole.isAdmin ? 'default' : 'outline'"
                    class="gap-1"
                  >
                    <Shield v-if="selectedUserForRole.isAdmin" class="w-3 h-3" />
                    {{ selectedUserForRole.isAdmin ? "관리자" : "일반회원" }}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    @click="clearSelectedUserForRole"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <!-- 권한 변경 버튼 -->
              <div class="flex gap-2 mt-4">
                <Button
                  v-if="!selectedUserForRole.isAdmin"
                  class="flex-1 gap-2"
                  :disabled="loadingRoleUpdate"
                  @click="handleRoleUpdate(true)"
                >
                  <Loader2 v-if="loadingRoleUpdate" class="w-4 h-4 animate-spin" />
                  <ShieldCheck v-else class="w-4 h-4" />
                  관리자 권한 부여
                </Button>
                <Button
                  v-else
                  variant="destructive"
                  class="flex-1 gap-2"
                  :disabled="loadingRoleUpdate"
                  @click="handleRoleUpdate(false)"
                >
                  <Loader2 v-if="loadingRoleUpdate" class="w-4 h-4 animate-spin" />
                  <ShieldOff v-else class="w-4 h-4" />
                  관리자 권한 해제
                </Button>
              </div>
            </div>
          </div>

          <!-- 사용자 검색 -->
          <div v-else>
            <label class="text-caption font-semibold text-admin-muted mb-2 block">
              회원 검색
            </label>
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted"
              />
              <Input
                v-model="roleSearchInput"
                type="text"
                placeholder="이름, 이메일, 연락처로 검색..."
                class="pl-10"
                @input="searchUsersForRole"
              />
            </div>

            <!-- 검색 결과 -->
            <div
              v-if="roleSearchInput && (loadingRoleSearch || roleSearchResults.length > 0)"
              class="mt-2 overflow-hidden border-y border-border/70"
            >
              <LoadingSpinner v-if="loadingRoleSearch" :center="false" class="py-4" />
              <div v-else class="max-h-64 overflow-y-auto">
                <button
                  v-for="user in roleSearchResults"
                  :key="user.id"
                  class="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left border-b last:border-b-0"
                  @click="selectUserForRole(user)"
                >
                  <Avatar
                    v-if="user.isAdmin"
                    shape="square"
                    class="h-8 w-8 flex-shrink-0 rounded-[3px] border border-primary/10 bg-white ring-1 ring-primary/10"
                  >
                    <AvatarImage
                      :src="getUserProfileImageUrl(user) || ''"
                      :alt="`${displayUserName(user)} 프로필`"
                      class="object-contain p-1"
                    />
                    <AvatarFallback
                      class="flex h-full w-full items-center justify-center bg-white"
                    >
                      <Shield class="h-3.5 w-3.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <div class="text-body font-medium text-admin truncate">
                      {{ displayUserName(user) }}
                    </div>
                    <div class="text-caption text-admin-muted truncate">
                      {{ displayUserEmail(user) }}
                    </div>
                  </div>
                  <Badge
                    :variant="user.isAdmin ? 'default' : 'outline'"
                    class="gap-1 flex-shrink-0"
                  >
                    <Shield v-if="user.isAdmin" class="w-3 h-3" />
                    {{ user.isAdmin ? "관리자" : "일반" }}
                  </Badge>
                </button>
              </div>
            </div>

            <!-- 검색어 없을 때 안내 -->
            <div
              v-if="!roleSearchInput"
              class="mt-4 text-center text-admin-muted py-8"
            >
              <Users class="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p class="text-caption">
                권한을 변경할 회원을 검색하세요.
              </p>
            </div>

            <!-- 검색 결과 없음 -->
            <div
              v-if="roleSearchInput && !loadingRoleSearch && roleSearchResults.length === 0"
              class="mt-4 text-center text-admin-muted py-8"
            >
              <Users class="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p class="text-caption">
                검색 결과가 없습니다.
              </p>
            </div>
          </div>

          <!-- 안내 문구 -->
          <div class="mt-6 border border-amber-200 bg-amber-50 p-3">
            <p class="text-caption text-amber-800">
              <strong>주의:</strong> 관리자 권한은 슈퍼 관리자만 변경할 수 있습니다.
              자기 자신의 권한은 변경할 수 없습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-admin-page :deep(input),
.user-admin-page :deep([role="combobox"]) {
  border-radius: 0;
  border-color: hsl(var(--border) / 0.7);
  background: hsl(var(--card));
  box-shadow: none;
}

.user-admin-page :deep(input:focus-visible),
.user-admin-page :deep([role="combobox"]:focus) {
  outline: none;
  box-shadow: none;
}

.user-admin-table th,
.user-admin-table td {
  border-left: 1px solid hsl(var(--border) / 0.42);
  vertical-align: middle;
}

.user-admin-table th:first-child,
.user-admin-table td:first-child {
  border-left: 0;
}

.user-admin-table tbody td {
  border-top: 1px solid hsl(var(--border) / 0.62);
}

.user-admin-table thead th {
  line-height: 1.2;
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
