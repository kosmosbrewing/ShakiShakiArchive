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
import { Lock, MessageCircle } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// 상태
const inquiries = ref<Inquiry[]>([]);
const loading = ref(true);
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

onMounted(() => {
  loadInquiries();
});
</script>

<template>
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-6">
      <h3 class="text-heading text-admin tracking-wider">문의 관리</h3>
    </div>
    <Separator class="mb-6"></Separator>

    <!-- 필터 -->
    <div class="mb-6 flex items-center justify-between gap-3">
      <div class="flex gap-3">
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-[160px] sm:w-[180px]">
            <SelectValue placeholder="답변 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">답변 대기</SelectItem>
            <SelectItem value="answered">답변 완료</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="selectedType">
          <SelectTrigger class="w-[160px] sm:w-[180px]">
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

        <span class="text-body text-muted-foreground self-center ml-2">
          필터 결과:
          <span class="font-bold text-foreground">{{ inquiries.length }}</span
          >건
        </span>
      </div>

      <span class="text-body text-muted-foreground self-center">
        답변 대기 중:
        <span class="font-bold text-primary">{{ pendingCount }}</span
        >건
      </span>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="inquiries.length === 0"
      header="문의 관리"
      message="필터 조건에 해당하는 문의가 없습니다."
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
              class="hidden md:table-cell w-[140px] text-center font-semibold text-foreground"
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
            v-for="(inquiry, index) in inquiries"
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
                  <span>{{ inquiry.user?.userName }}</span>
                  <span v-if="inquiry.user?.email" class="text-xs"
                    >({{ inquiry.user.email }})</span
                  >
                  <span class="mx-1">·</span>
                  <span class="lg:hidden">{{
                    formatDate(inquiry.createdAt)
                  }}</span>
                </div>
              </div>
            </TableCell>

            <!-- 작성자 (md 이상) -->
            <TableCell class="hidden md:table-cell text-center text-caption">
              <div class="flex flex-col items-center">
                <span class="font-medium text-foreground">{{
                  inquiry.user?.userName
                }}</span>
                <span
                  v-if="inquiry.user?.email"
                  class="text-xs text-muted-foreground"
                  >{{ inquiry.user.email }}</span
                >
              </div>
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
                {{ statusLabels[inquiry.status] }}
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
