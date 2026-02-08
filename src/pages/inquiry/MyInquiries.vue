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
import { Lock, MessageCircle, PenLine, ArrowLeft } from "lucide-vue-next";

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
  <div class="max-w-5xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-2 flex items-center justify-between">
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
      <Button
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
    <Separator></Separator>

    <!-- 필터 -->
    <div class="mt-6 mb-6 flex items-center justify-between gap-4">
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
      </div>
      <span class="text-caption text-muted-foreground sm:hidden">
        {{ filteredInquiries.length }}건
      </span>
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
    <div
      v-else
      class="bg-background border border-border rounded-xl overflow-hidden shadow-sm"
    >
      <Table>
        <TableHeader>
          <TableRow
            class="bg-muted/30 hover:bg-muted/30 border-b border-border"
          >
            <!-- 번호 (항상 표시) -->
            <TableHead
              class="w-[60px] sm:w-[80px] text-center font-semibold text-foreground"
            >
              <span class="hidden sm:inline">번호</span>
              <span class="sm:hidden">#</span>
            </TableHead>
            <TableHead
              class="hidden sm:table-cell w-[100px] md:w-[120px] font-semibold text-foreground"
            >
              유형
            </TableHead>
            <TableHead class="font-semibold text-foreground">제목</TableHead>
            <TableHead
              class="hidden md:table-cell w-[100px] text-center font-semibold text-foreground"
            >
              작성자
            </TableHead>
            <TableHead
              class="hidden lg:table-cell w-[140px] text-center font-semibold text-foreground"
            >
              작성일
            </TableHead>
            <TableHead
              class="w-[100px] sm:w-[110px] text-center font-semibold text-foreground"
            >
              상태
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(inquiry, index) in filteredInquiries"
            :key="inquiry.id"
            class="cursor-pointer hover:bg-primary/5 transition-all duration-200 border-b border-border/50 last:border-0"
            @click="goToDetail(inquiry)"
          >
            <!-- 번호 (항상 표시) -->
            <TableCell class="text-center">
              <span
                class="text-caption sm:text-body font-semibold text-primary"
              >
                {{ index + 1 }}
              </span>
            </TableCell>

            <!-- 유형 (sm 이상) -->
            <TableCell class="hidden sm:table-cell">
              <Badge variant="outline" class="text-xs">
                {{ typeLabels[inquiry.type] }}
              </Badge>
            </TableCell>

            <!-- 제목 (항상 표시) -->
            <TableCell>
              <div class="flex flex-col gap-1 py-1">
                <!-- 모바일: 유형 뱃지 -->
                <div class="sm:hidden flex items-center gap-1.5 mb-1">
                  <Badge variant="outline" class="text-xs">
                    {{ typeLabels[inquiry.type] }}
                  </Badge>
                </div>

                <!-- 제목 -->
                <div class="flex items-center gap-2">
                  <Lock
                    v-if="inquiry.isPrivate"
                    class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                  />
                  <span
                    class="font-medium text-foreground truncate text-caption sm:text-body"
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
                  <div
                    v-if="inquiry.replyCount && inquiry.replyCount > 0"
                    class="flex items-center gap-1.5 shrink-0"
                  >
                    <div
                      class="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded"
                    >
                      RE
                    </div>
                    <div class="flex items-center gap-0.5 text-xs text-primary">
                      <MessageCircle class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span class="font-medium">{{ inquiry.replyCount }}</span>
                    </div>
                  </div>
                </div>

                <!-- 상품 정보 -->
                <p
                  v-if="inquiry.product"
                  class="text-xs text-muted-foreground truncate"
                >
                  상품: {{ inquiry.product.name }}
                </p>

                <!-- 모바일: 작성자 & 작성일 -->
                <div class="md:hidden text-xs text-muted-foreground mt-0.5">
                  <span>{{ maskUserName(inquiry.user?.userName) }}</span>
                  <span class="mx-1">·</span>
                  <span class="lg:hidden">{{
                    formatDate(inquiry.createdAt)
                  }}</span>
                </div>
              </div>
            </TableCell>

            <!-- 작성자 (md 이상) -->
            <TableCell
              class="hidden md:table-cell text-center text-caption text-muted-foreground"
            >
              {{ maskUserName(inquiry.user?.userName) }}
            </TableCell>

            <!-- 작성일 (lg 이상) -->
            <TableCell
              class="hidden lg:table-cell text-center text-caption text-muted-foreground"
            >
              {{ formatDate(inquiry.createdAt) }}
            </TableCell>

            <!-- 상태 (항상 표시) -->
            <TableCell class="text-center">
              <Badge
                :variant="statusVariants[inquiry.status]"
                class="text-xs font-medium"
              >
                <span class="sm:hidden">{{ statusLabelsShort[inquiry.status] }}</span>
                <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
