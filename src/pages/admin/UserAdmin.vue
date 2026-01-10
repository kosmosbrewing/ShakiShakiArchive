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
import {
  Users,
  Search,
  RotateCcw,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  MessageCircle,
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
    showAlert(
      error.message || "회원 목록을 불러오는데 실패했습니다.",
      { type: "error" }
    );
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
    showAlert(
      error.message || "회원 상세 정보를 불러오는데 실패했습니다.",
      { type: "error" }
    );
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
  window.scrollTo({ top: 0, behavior: "smooth" });
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

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch (error) {
    console.error("날짜/시간 포맷팅 오류:", error);
    return "-";
  }
};

// --- 금액 포맷팅 ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
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
      <Button variant="outline" @click="loadData" class="mb-2 gap-2">
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
    <div v-if="loading" class="text-center py-32">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
      ></div>
    </div>

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
              <th class="px-6 py-4">주소</th>
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
                    class="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center"
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

              <!-- 주소 -->
              <td class="px-6 py-4 max-w-xs">
                <div
                  class="text-caption text-admin-muted truncate flex items-center gap-1"
                >
                  <MapPin class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ user.address || "-" }}</span>
                </div>
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
          <div class="flex justify-between items-center mb-8 border-b pb-4">
            <h2 class="text-heading font-bold text-admin tracking-tight">
              회원 상세 정보
            </h2>
            <Button variant="ghost" size="icon" @click="closeDetailModal">
              <X class="w-5 h-5" />
            </Button>
          </div>

          <div class="space-y-6">
          <!-- 로딩 상태 -->
          <div v-if="loadingDetail" class="text-center py-12">
            <div
              class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"
            ></div>
          </div>

          <div v-else>
            <!-- 회원 통계 -->
            <div v-if="userStats" class="mb-6">
              <h3 class="text-body font-bold text-admin mb-4">활동 통계</h3>
              <div class="grid grid-cols-2 gap-4">
                <div
                  class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                  >
                    <ShoppingBag class="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p class="text-caption text-blue-700">총 주문</p>
                    <p class="text-heading font-bold text-blue-900">
                      {{ userStats.totalOrders }}건
                    </p>
                  </div>
                </div>

                <div
                  class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <ShoppingBag class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p class="text-caption text-green-700">총 구매액</p>
                    <p class="text-heading font-bold text-green-900">
                      {{ formatCurrency(userStats.totalSpent) }}
                    </p>
                  </div>
                </div>

                <div
                  class="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"
                  >
                    <Calendar class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p class="text-caption text-purple-700">최근 주문일</p>
                    <p class="text-body font-semibold text-purple-900">
                      {{
                        userStats.lastOrderDate
                          ? formatDate(userStats.lastOrderDate)
                          : "없음"
                      }}
                    </p>
                  </div>
                </div>

                <div
                  class="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"
                  >
                    <MessageCircle class="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p class="text-caption text-orange-700">총 문의</p>
                    <p class="text-heading font-bold text-orange-900">
                      {{ userStats.totalInquiries }}건
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator class="my-6" />

            <!-- 기본 정보 -->
            <div>
              <h3 class="text-body font-bold text-admin mb-4">기본 정보</h3>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    회원명
                  </label>
                  <div class="text-body text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ selectedUser.userName }}
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    이메일
                  </label>
                  <div class="text-body text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ selectedUser.email }}
                  </div>
                </div>
              </div>
            </div>

            <Separator class="my-6" />

            <!-- 연락처 정보 -->
            <div>
              <h3 class="text-body font-bold text-admin mb-4">연락처 정보</h3>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    연락처
                  </label>
                  <div class="text-body text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ selectedUser.phone }}
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    우편번호
                  </label>
                  <div class="text-body text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ selectedUser.zipCode }}
                  </div>
                </div>
              </div>
            </div>

            <Separator class="my-6" />

            <!-- 주소 정보 -->
            <div>
              <h3 class="text-body font-bold text-admin mb-4">주소 정보</h3>
              <div class="space-y-2">
                <label class="text-admin text-caption font-semibold">
                  주소
                </label>
                <div class="text-body text-admin bg-muted/30 px-3 py-2 rounded">
                  {{ selectedUser.address }}
                </div>
                <div class="text-caption text-admin-muted bg-muted/20 px-3 py-2 rounded">
                  {{ selectedUser.detailAddress || "상세 주소 없음" }}
                </div>
              </div>
            </div>

            <Separator class="my-6" />

            <!-- 기타 정보 -->
            <div>
              <h3 class="text-body font-bold text-admin mb-4">기타 정보</h3>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    권한
                  </label>
                  <div>
                    <Badge
                      :variant="selectedUser.isAdmin ? 'default' : 'outline'"
                    >
                      {{ selectedUser.isAdmin ? "관리자" : "일반회원" }}
                    </Badge>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    이메일 수신 동의
                  </label>
                  <div>
                    <Badge
                      :variant="selectedUser.emailOptIn ? 'default' : 'outline'"
                    >
                      {{ selectedUser.emailOptIn ? "동의" : "미동의" }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator class="my-6" />

            <!-- 가입/수정 일시 -->
            <div>
              <h3 class="text-body font-bold text-admin mb-4">활동 이력</h3>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    가입일시
                  </label>
                  <div class="text-caption text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ formatDateTime(selectedUser.createdAt) }}
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-admin text-caption font-semibold">
                    최종 수정일시
                  </label>
                  <div class="text-caption text-admin bg-muted/30 px-3 py-2 rounded">
                    {{ formatDateTime(selectedUser.updatedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 하단 버튼 -->
          <div class="flex justify-end gap-2 mt-8 pt-6 border-t">
            <Button variant="outline" @click="closeDetailModal">
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
