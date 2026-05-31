<script setup lang="ts">
// src/pages/admin/InquiryAdmin.vue
// 문의 관리 페이지 (관리자 전용)

import { onMounted, ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchAdminInquiries } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState } from "@/components/common";
import { AdminNavigationTabs } from "@/components/admin";

// Shadcn UI 컴포넌트
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// 상태
const inquiries = ref<Inquiry[]>([]);
const loading = ref(true);
const hasLoadedOnce = ref(false);
const selectedType = ref<string>("all");
const selectedStatus = ref<string>("all");

// 문의 유형 레이블
const typeLabels: Record<InquiryType, string> = {
  product: "상품 문의",
  shipping: "배송 문의",
  exchange: "교환/반품",
  other: "기타",
};

// 문의 상태 레이블
const statusLabels: Record<InquiryStatus, string> = {
  pending: "답변 대기",
  answered: "답변 완료",
};

// 문의 상태별 배지 색상
const statusVariants: Record<
  InquiryStatus,
  "default" | "secondary" | "outline"
> = {
  pending: "outline",
  answered: "default",
};

// 답변 대기 중인 문의 수
const pendingCount = computed(() => {
  return inquiries.value.filter((inquiry) => inquiry.status === "pending")
    .length;
});

// 문의 목록 로드 (서버 사이드 필터링)
const loadInquiries = async () => {
  loading.value = true;
  try {
    const params: {
      type?: InquiryType;
      status?: InquiryStatus;
    } = {};

    // 필터가 'all'이 아니면 파라미터 추가
    if (selectedType.value !== "all") {
      params.type = selectedType.value as InquiryType;
    }
    if (selectedStatus.value !== "all") {
      params.status = selectedStatus.value as InquiryStatus;
    }

    inquiries.value = await fetchAdminInquiries(params);
  } catch (error) {
    console.error("문의 목록 로드 실패:", error);
  } finally {
    loading.value = false;
    hasLoadedOnce.value = true;
  }
};

// 필터 변경 시 자동으로 데이터 다시 로드
watch([selectedType, selectedStatus], () => {
  loadInquiries();
});

// 문의 상세로 이동 (관리자는 모든 문의 접근 가능)
const goToDetail = (inquiry: Inquiry) => {
  router.push(`/inquiry/${inquiry.id}`);
};

onMounted(async () => {
  if (!authStore.user) await authStore.loadUser();
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  loadInquiries();
});
</script>

<template>
  <div class="inquiry-admin-page w-11/12 max-w-screen-2xl mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
    <AdminNavigationTabs />
    <!-- 헤더 -->
    <div class="mb-4">
      <h3 class="text-heading text-admin tracking-wider">문의 관리</h3>
      <p class="mt-1 text-body text-admin-muted">
        총
        <span class="text-body font-bold text-admin">{{ inquiries.length }}</span>건 문의
        <span class="text-caption text-admin-muted">
          / 답변 대기 {{ pendingCount }}건
        </span>
      </p>
    </div>
    <Separator class="mb-4 bg-border/70"></Separator>

    <!-- 필터 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-y border-border/70 bg-card/60 px-3 py-3">
      <div class="flex flex-wrap gap-3">
        <Select v-model="selectedStatus">
          <SelectTrigger class="h-9 w-[160px] sm:w-[180px]">
            <SelectValue placeholder="답변 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">답변 대기</SelectItem>
            <SelectItem value="answered">답변 완료</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="selectedType">
          <SelectTrigger class="h-9 w-[160px] sm:w-[180px]">
            <SelectValue placeholder="문의 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="product">상품 문의</SelectItem>
            <SelectItem value="shipping">배송 문의</SelectItem>
            <SelectItem value="exchange">교환/반품</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>

        <span class="self-center text-body text-admin-muted sm:ml-2">
          필터 결과:
          <span class="font-bold text-admin">{{ inquiries.length }}</span
          >건
        </span>
      </div>

      <span class="self-center text-body text-admin-muted">
        답변 대기 중:
        <span class="font-bold text-primary">{{ pendingCount }}</span
        >건
      </span>
    </div>

    <LoadingSpinner v-if="loading && !hasLoadedOnce" />

    <div v-else class="space-y-3">
      <div
        v-if="loading && hasLoadedOnce"
        class="border-y border-border/70 bg-card px-4 py-2 text-caption text-admin-muted"
      >
        문의 목록 업데이트 중...
      </div>

      <EmptyState
        v-if="inquiries.length === 0"
        header="문의 관리"
        message="필터 조건에 해당하는 문의가 없습니다."
      />

      <!-- 문의 목록 -->
      <div
        v-else
        class="inquiry-table overflow-hidden border-y border-primary/10 bg-background/80 shadow-none"
      >
        <Table>
          <TableHeader>
            <TableRow
              class="border-b border-primary/10 bg-transparent hover:bg-transparent"
            >
            <TableHead class="font-semibold text-foreground/70">제목</TableHead>
            <TableHead
              class="w-[128px] text-center font-semibold text-foreground/70"
            >
              작성일
            </TableHead>
            <TableHead
              class="hidden w-[112px] text-center font-semibold text-foreground/70 lg:table-cell"
            >
              작성자
            </TableHead>
            <TableHead
              class="w-[112px] text-center font-semibold text-foreground/70"
            >
              상태
            </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="inquiry in inquiries"
              :key="inquiry.id"
              class="cursor-pointer border-b border-primary/10 transition-colors duration-200 last:border-0 hover:bg-primary/[0.03]"
              @click="goToDetail(inquiry)"
            >
            <!-- 제목 (항상 표시) -->
            <TableCell>
              <div class="flex min-w-0 items-center gap-2">
                <span class="w-[68px] shrink-0 text-caption font-medium leading-[1.2] text-muted-foreground/80">
                  {{ typeLabels[inquiry.type] }}
                </span>
                <span class="w-2 shrink-0 text-center text-muted-foreground/50">·</span>
                <Lock
                  v-if="inquiry.isPrivate"
                  class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                />
                <span class="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    class="inquiry-title-text min-w-0 truncate text-[13px] font-medium leading-[1.25] text-foreground"
                  >
                    <template
                      v-if="
                        inquiry.isPrivate &&
                        authStore.user?.id !== inquiry.userId &&
                        !authStore.user?.isAdmin
                      "
                    >
                      비밀글입니다.
                    </template>
                    <template v-else>
                      {{ inquiry.title }}
                    </template>
                  </span>
                  <span
                    v-if="inquiry.replyCount && inquiry.replyCount > 0"
                    class="shrink-0 border-b border-primary/45 text-[11px] font-semibold leading-[1.2] text-primary"
                  >
                    답변 {{ inquiry.replyCount }}
                  </span>
                </span>
                <template v-if="inquiry.product">
                  <span class="hidden shrink-0 text-muted-foreground/50 xl:inline">·</span>
                  <span class="hidden max-w-[180px] shrink-0 truncate text-caption leading-[1.2] text-muted-foreground/70 xl:block">
                    {{ inquiry.product.name }}
                  </span>
                </template>
              </div>
            </TableCell>

            <!-- 작성일 -->
            <TableCell
              class="text-center text-caption text-muted-foreground/80"
            >
              {{ formatDate(inquiry.createdAt) }}
            </TableCell>

            <!-- 작성자 (lg 이상) -->
            <TableCell class="hidden text-center text-caption text-muted-foreground/80 lg:table-cell">
              {{ inquiry.user?.userName }}
            </TableCell>

            <!-- 상태 (항상 표시) -->
            <TableCell class="text-center">
              <Badge
                :variant="statusVariants[inquiry.status]"
                class="text-[11px] font-semibold"
              >
                <span class="sm:hidden">{{ statusLabels[inquiry.status] === "답변 완료" ? "완료" : "대기" }}</span>
                <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
              </Badge>
            </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inquiry-admin-page :deep(input),
.inquiry-admin-page :deep([role="combobox"]) {
  border-radius: 0;
  border-color: hsl(var(--border) / 0.7);
  background: hsl(var(--card));
  box-shadow: none;
}

.inquiry-admin-page :deep(input:focus-visible),
.inquiry-admin-page :deep([role="combobox"]:focus) {
  outline: none;
  box-shadow: none;
}

</style>
