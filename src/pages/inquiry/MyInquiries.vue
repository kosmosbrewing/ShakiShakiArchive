<script setup lang="ts">
// src/pages/inquiry/MyInquiries.vue
// 내 문의 목록 페이지

import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { fetchMyInquiries } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, MessageCircle, ChevronRight, PenLine, ArrowLeft } from "lucide-vue-next";

const router = useRouter();

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
  closed: "종료",
};

// 문의 상태별 배지 색상
const statusVariants: Record<InquiryStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  answered: "default",
  closed: "secondary",
};

// 필터링된 문의 목록
const filteredInquiries = computed(() => {
  if (selectedStatus.value === "all") {
    return inquiries.value;
  }
  return inquiries.value.filter((inquiry) => inquiry.status === selectedStatus.value);
});

// 문의 목록 로드
const loadInquiries = async () => {
  loading.value = true;
  try {
    inquiries.value = await fetchMyInquiries();
  } catch (error) {
    console.error("내 문의 목록 로드 실패:", error);
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
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-6 border-b pb-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack" class="shrink-0">
          <ArrowLeft class="w-5 h-5" />
        </Button>
        <h3 class="text-heading text-primary tracking-wider">내 문의 내역</h3>
      </div>
      <Button variant="default" size="sm" @click="goToCreate" class="gap-1">
        <PenLine class="w-4 h-4" />
        문의하기
      </Button>
    </div>

    <!-- 필터 -->
    <div class="mb-6 flex items-center gap-4">
      <Select v-model="selectedStatus">
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="상태 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="pending">답변 대기</SelectItem>
          <SelectItem value="answered">답변 완료</SelectItem>
          <SelectItem value="closed">종료</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="filteredInquiries.length === 0"
      header="문의 내역"
      :message="selectedStatus !== 'all' ? `${statusLabels[selectedStatus as InquiryStatus]} 상태의 문의가 없습니다.` : '등록한 문의가 없습니다.'"
      button-text="문의하기"
      button-link="/inquiry/create"
    />

    <!-- 문의 목록 -->
    <div v-else class="space-y-3">
      <Card
        v-for="inquiry in filteredInquiries"
        :key="inquiry.id"
        class="cursor-pointer hover:bg-muted/30 transition-colors"
        @click="goToDetail(inquiry)"
      >
        <CardContent class="p-4 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <!-- 왼쪽: 문의 정보 -->
            <div class="flex-1 min-w-0">
              <!-- 유형 & 상태 배지 -->
              <div class="flex items-center gap-2 mb-2">
                <Badge variant="outline" class="text-xs">
                  {{ typeLabels[inquiry.type] }}
                </Badge>
                <Badge :variant="statusVariants[inquiry.status]" class="text-xs">
                  {{ statusLabels[inquiry.status] }}
                </Badge>
                <Lock v-if="inquiry.isPrivate" class="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <!-- 제목 -->
              <h4 class="font-medium text-foreground truncate mb-1">
                {{ inquiry.title }}
              </h4>

              <!-- 상품 정보 (상품 문의인 경우) -->
              <p
                v-if="inquiry.product"
                class="text-sm text-muted-foreground truncate mb-1"
              >
                상품: {{ inquiry.product.name }}
              </p>

              <!-- 날짜 -->
              <div class="text-xs text-muted-foreground">
                {{ formatDate(inquiry.createdAt) }}
              </div>
            </div>

            <!-- 오른쪽: 답변 수 & 화살표 -->
            <div class="flex items-center gap-3 shrink-0">
              <div
                v-if="inquiry.replies && inquiry.replies.length > 0"
                class="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <MessageCircle class="w-4 h-4" />
                <span>{{ inquiry.replies.length }}</span>
              </div>
              <ChevronRight class="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
