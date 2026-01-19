<script setup lang="ts">
// Vue 및 라우터
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

// 스토어 및 유틸리티
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";

// API
import { fetchAdminUsers, fetchAdminUserDetail } from "@/lib/api";

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
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/common";
import {
  Users,
  Search,
  RotateCcw,
  X,
  Mail,
  Phone,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-vue-next";

// --- 상태 관리 ---
const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

const users = ref<User[]>([]);
const loading = ref(false);
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
    showAlert(error.message || "회원 목록을 불러오는데 실패했습니다.", {
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
    showAlert(error.message || "회원 상세 정보를 불러오는데 실패했습니다.", {
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

// --- 페이지네이션 ---
const changePage = (page: number) => {
  pagination.value.page = page;
  loadData();
  // 스크롤은 라우터가 아닌 페이지 내 페이지네이션이므로 제거하여 즉시 전환
  window.scrollTo({ top: 0 });
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

// --- 날짜 포맷팅 ---
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  } catch (error) {
    console.error("날짜 포맷팅 오류:", error);
    return "-";
  }
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch (error) {
    console.error("날짜/시간 포맷팅 오류:", error);
    return "-";
  }
};

// --- 금액 포맷팅 ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
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

onMounted(async () => {
  // 관리자 권한 확인
  if (!authStore.user) await authStore.loadUser();
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  loadData();
});
</script>

<template>
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <!-- 헤더 -->
    <div class="flex justify-between items-end">
      <div>
        <h3 class="text-heading text-admin tracking-wider">회원 관리</h3>
        <p class="text-body text-admin-muted pt-1 mb-3">
          전체 {{ pagination.total }}명의 회원이 가입되어 있습니다.
        </p>
      </div>
      <Button
        variant="outline"
        @click="loadData"
        class="mb-2 gap-2 text-admin font-semibold"
      >
        <RotateCcw class="w-4 h-4" />
        새로고침
      </Button>
    </div>
    <Separator class="mb-6"></Separator>

    <!-- 검색바 -->
    <div class="mb-6 flex items-center gap-3 max-w-md">
      <div class="relative flex-1">
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

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <!-- 회원 목록 테이블 -->
    <Card v-else class="overflow-hidden border-none shadow-lg">
      <CardContent class="p-0 overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead
            class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
          >
            <tr>
              <th class="px-6 py-4 w-16">No.</th>
              <th class="px-6 py-4">회원정보</th>
              <th class="px-6 py-4">연락처</th>
              <th class="px-6 py-4 text-center">로그인</th>
              <th class="px-6 py-4 text-center">권한</th>
              <th class="px-6 py-4 text-center">가입일</th>
              <th class="px-6 py-4 text-right">작업</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(user, index) in users"
              :key="user.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <!-- No. -->
              <td class="px-6 py-4 text-caption text-admin-muted">
                {{ (pagination.page - 1) * pagination.limit + index + 1 }}
              </td>

              <!-- 회원정보 (이름 + 이메일) -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center"
                  >
                    <span class="text-body font-bold text-primary">
                      {{ user.userName.charAt(0) }}
                    </span>
                  </div>
                  <div>
                    <div class="text-body font-semibold text-admin">
                      {{ user.userName }}
                    </div>
                    <div
                      class="text-caption text-admin-muted flex items-center gap-1"
                    >
                      <Mail class="w-3 h-3" />
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- 연락처 -->
              <td class="px-6 py-4">
                <div class="text-caption text-admin flex items-center gap-1">
                  <Phone class="w-3.5 h-3.5 text-admin-muted" />
                  {{ user.phone }}
                </div>
              </td>

              <!-- 로그인 제공자 -->
              <td class="px-6 py-4 text-center">
                <Badge :variant="getProviderColor(user.socialProvider)">
                  {{ formatProvider(user.socialProvider) }}
                </Badge>
              </td>

              <!-- 권한 -->
              <td class="px-6 py-4 text-center">
                <Badge
                  :variant="user.isAdmin ? 'default' : 'outline'"
                  class="gap-1"
                >
                  <Shield v-if="user.isAdmin" class="w-3 h-3" />
                  {{ user.isAdmin ? "관리자" : "일반회원" }}
                </Badge>
              </td>

              <!-- 가입일 -->
              <td class="px-6 py-4 text-center">
                <div
                  class="text-caption text-admin-muted flex items-center justify-center gap-1"
                >
                  <Calendar class="w-3.5 h-3.5" />
                  {{ formatDate(user.createdAt) }}
                </div>
              </td>

              <!-- 작업 버튼 -->
              <td class="px-6 py-4 text-right">
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
        class="p-6 bg-muted/20 flex justify-center items-center gap-2 border-t"
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
      @click.self="closeDetailModal"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <!-- 헤더 -->
          <div class="flex justify-between items-start mb-6">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <div
                  class="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center"
                >
                  <span class="text-xl font-bold text-primary">
                    {{ selectedUser?.userName.charAt(0) }}
                  </span>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-admin">
                    {{ selectedUser?.userName }}
                  </h2>
                  <div class="flex items-center gap-2 text-caption text-admin-muted">
                    <Mail class="w-3.5 h-3.5" />
                    {{ selectedUser?.email }}
                  </div>
                </div>
              </div>
              <!-- 권한 뱃지 -->
              <div class="flex items-center gap-2 ml-15">
                <Badge
                  :variant="getProviderColor(selectedUser?.socialProvider)"
                >
                  {{ formatProvider(selectedUser?.socialProvider) }} 로그인
                </Badge>
                <Badge
                  :variant="selectedUser?.isAdmin ? 'default' : 'outline'"
                  class="gap-1"
                >
                  <Shield v-if="selectedUser?.isAdmin" class="w-3 h-3" />
                  {{ selectedUser?.isAdmin ? "관리자" : "일반회원" }}
                </Badge>
                <Badge
                  :variant="selectedUser?.emailOptIn ? 'default' : 'outline'"
                >
                  이메일 수신 {{ selectedUser?.emailOptIn ? "동의" : "미동의" }}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" @click="closeDetailModal">
              <X class="w-5 h-5" />
            </Button>
          </div>

          <Separator class="mb-6" />

          <!-- 로딩 상태 -->
          <LoadingSpinner
            v-if="loadingDetail"
            :center="false"
            class="py-12"
          />

          <div v-else class="space-y-6">
            <!-- 활동 통계 -->
            <div v-if="userStats" class="bg-muted/20 rounded-lg p-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <span class="text-caption font-semibold text-admin-muted">활동 통계</span>
                <div class="flex items-center gap-4 flex-wrap">
                  <span class="text-caption text-muted-foreground">
                    총 주문:
                    <span class="font-bold text-foreground">
                      {{ userStats.totalOrders }}
                    </span>건
                  </span>
                  <span class="text-caption text-muted-foreground">
                    총 구매액 <span class="text-xs">(취소 제외)</span>:
                    <span class="font-bold text-foreground">
                      {{ formatCurrency(userStats.totalSpent) }}
                    </span>
                  </span>
                  <span class="text-caption text-muted-foreground">
                    최근 주문일:
                    <span class="font-bold text-foreground">
                      {{
                        userStats.lastOrderDate
                          ? formatDate(userStats.lastOrderDate)
                          : "없음"
                      }}
                    </span>
                  </span>
                  <span class="text-caption text-muted-foreground">
                    총 문의:
                    <span class="font-bold text-foreground">
                      {{ userStats.totalInquiries }}
                    </span>건
                  </span>
                </div>
              </div>
            </div>

            <!-- 연락처 및 주소 정보 -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-4">
                <div>
                  <label class="text-caption font-semibold text-admin-muted flex items-center gap-1.5 mb-2">
                    <Phone class="w-3.5 h-3.5" />
                    연락처
                  </label>
                  <div class="text-body text-admin">
                    {{ selectedUser.phone }}
                  </div>
                </div>
                <div>
                  <label class="text-caption font-semibold text-admin-muted flex items-center gap-1.5 mb-2">
                    <Calendar class="w-3.5 h-3.5" />
                    가입일시
                  </label>
                  <div class="text-caption text-admin">
                    {{ formatDateTime(selectedUser.createdAt) }}
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="text-caption font-semibold text-admin-muted flex items-center gap-1.5 mb-2">
                    <MapPin class="w-3.5 h-3.5" />
                    주소
                  </label>
                  <div class="text-caption text-admin">
                    ({{ selectedUser.zipCode }}) {{ selectedUser.address }}
                  </div>
                  <div class="text-caption text-admin-muted mt-1">
                    {{ selectedUser.detailAddress || "-" }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 하단 버튼 -->
            <div class="flex justify-end gap-2 pt-4 border-t">
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
