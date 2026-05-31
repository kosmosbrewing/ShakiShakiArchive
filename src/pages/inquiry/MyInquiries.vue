<script setup lang="ts">
// src/pages/inquiry/MyInquiries.vue
// 문의 목록 페이지 (전체 문의)

import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { fetchMyInquiries } from "@/lib/api";
import { formatDate, maskUserName } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState } from "@/components/common";

// Shadcn UI 컴포넌트
import { Button } from "@/components/ui/button";
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
import { Lock, PenLine, ArrowLeft } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// 인증 체크
useAuthGuard();

// 상태
const inquiries = ref<Inquiry[]>([]);
const loading = ref(true);
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

// 모바일용 축약 레이블
const statusLabelsShort: Record<InquiryStatus, string> = {
  pending: "대기",
  answered: "완료",
};

// 문의 상태별 배지 색상
const statusVariants: Record<
  InquiryStatus,
  "default" | "secondary" | "outline"
> = {
  pending: "outline",
  answered: "default",
};

// 필터링된 문의 목록
const filteredInquiries = computed(() => {
  if (selectedStatus.value === "all") {
    return inquiries.value;
  }
  return inquiries.value.filter(
    (inquiry) => inquiry.status === selectedStatus.value
  );
});

// 문의 목록 로드
const loadInquiries = async () => {
  loading.value = true;
  try {
    inquiries.value = await fetchMyInquiries();
  } catch (error) {
    console.error("문의 목록 로드 실패:", error);
  } finally {
    loading.value = false;
  }
};

// 문의 상세로 이동
const goToDetail = (inquiry: Inquiry) => {
  router.push(`/inquiry/${inquiry.id}`);
};

// 문의 작성 페이지로 이동
const goToCreate = () => {
  router.push("/inquiry/create");
};

// 뒤로 가기
const goBack = () => {
  router.back();
};

onMounted(() => {
  loadInquiries();
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16 lg:min-h-[calc(100vh-9rem)] lg:pb-20">
    <!-- 헤더 -->
    <div class="mb-2 flex items-center">
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          @click="goBack"
          class="shrink-0 -ml-2 hover:bg-muted/80"
        >
          <ArrowLeft class="w-5 h-5" />
        </Button>
        <h3 class="text-heading text-primary tracking-wider font-semibold">
          내 문의 내역
        </h3>
      </div>
    </div>
    <Separator></Separator>

    <!-- 필터 -->
    <div class="mt-6 mb-3 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-[160px] sm:w-[180px] border-border/60">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="pending">답변 대기</SelectItem>
            <SelectItem value="answered">답변 완료</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-caption text-muted-foreground hidden sm:inline">
          총 {{ filteredInquiries.length }}건
        </span>
        <span class="text-caption text-muted-foreground sm:hidden">
          {{ filteredInquiries.length }}건
        </span>
      </div>
      <Button
        v-if="!loading && filteredInquiries.length > 0"
        variant="default"
        size="sm"
        @click="goToCreate"
        class="gap-1.5 shadow-sm hover:shadow"
      >
        <PenLine class="w-4 h-4" />
        <span class="hidden sm:inline">문의하기</span>
        <span class="sm:hidden">작성</span>
      </Button>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="filteredInquiries.length === 0"
      header="내 문의 내역"
      :message="
        selectedStatus !== 'all'
          ? `${statusLabels[selectedStatus as InquiryStatus]} 상태의 문의가 없습니다.`
          : '등록한 문의가 없습니다.'
      "
      button-text="문의하기"
      button-link="/inquiry/create"
    />

    <!-- 문의 목록 -->
    <template v-else>
      <div
        class="md:hidden border-y border-primary/10 bg-background/80 rounded-none overflow-hidden shadow-none"
      >
        <button
          v-for="inquiry in filteredInquiries"
          :key="inquiry.id"
          type="button"
          class="block w-full border-b border-primary/10 px-3 py-3 text-left transition-colors duration-200 last:border-0 hover:bg-primary/[0.03]"
          @click="goToDetail(inquiry)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <Lock
                  v-if="inquiry.isPrivate"
                  class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                />
                <span
                  class="truncate text-[13px] font-medium leading-[1.25] text-foreground"
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
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption leading-[1.2] text-muted-foreground/80">
                <span>{{ typeLabels[inquiry.type] }}</span>
                <span>·</span>
                <span>{{ maskUserName(inquiry.user?.userName) }}</span>
                <span>·</span>
                <span>{{ formatDate(inquiry.createdAt) }}</span>
              </div>
              <p
                v-if="inquiry.product"
                class="mt-0.5 truncate text-caption leading-[1.2] text-muted-foreground/80"
              >
                상품: {{ inquiry.product.name }}
              </p>
            </div>
            <Badge
              :variant="statusVariants[inquiry.status]"
              class="shrink-0 text-[11px] font-semibold"
            >
              {{ statusLabelsShort[inquiry.status] }}
            </Badge>
          </div>
        </button>
      </div>

      <div
        class="inquiry-table hidden md:block border-y border-primary/10 bg-background/80 rounded-none overflow-hidden shadow-none"
      >
        <Table>
        <TableHeader>
          <TableRow
            class="bg-transparent hover:bg-transparent border-b border-primary/10"
            >
            <TableHead class="font-semibold text-foreground/70">제목</TableHead>
            <TableHead
              class="w-[128px] text-center font-semibold text-foreground/70"
            >
              작성일
            </TableHead>
            <TableHead
              class="hidden lg:table-cell w-[112px] text-center font-semibold text-foreground/70"
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
            v-for="inquiry in filteredInquiries"
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
                <span
                  class="inquiry-title-text min-w-0 flex-1 truncate text-[13px] font-medium leading-[1.25] text-foreground"
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
            <TableCell
              class="hidden lg:table-cell text-center text-caption text-muted-foreground/80"
            >
              {{ maskUserName(inquiry.user?.userName) }}
            </TableCell>

            <!-- 상태 (항상 표시) -->
            <TableCell class="text-center">
              <Badge
                :variant="statusVariants[inquiry.status]"
                class="text-[11px] font-semibold"
              >
                <span class="sm:hidden">{{ statusLabelsShort[inquiry.status] }}</span>
                <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
        </Table>
      </div>
    </template>
  </div>
</template>
