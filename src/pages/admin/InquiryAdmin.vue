<script setup lang="ts">
// src/pages/inquiry/InquiryList.vue
// 문의 목록 페이지 (전체 공개 문의)

import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { fetchInquiries } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";

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
import { Lock, MessageCircle, ChevronRight, PenLine } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

// 상태
const inquiries = ref<Inquiry[]>([]);
const loading = ref(true);
const selectedType = ref<string>("all");

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
const statusVariants: Record<
  InquiryStatus,
  "default" | "secondary" | "outline"
> = {
  pending: "outline",
  answered: "default",
  closed: "secondary",
};

// 필터링된 문의 목록
const filteredInquiries = computed(() => {
  if (selectedType.value === "all") {
    return inquiries.value;
  }
  return inquiries.value.filter(
    (inquiry) => inquiry.type === selectedType.value
  );
});

// 문의 목록 로드
const loadInquiries = async () => {
  loading.value = true;
  try {
    inquiries.value = await fetchInquiries();
  } catch (error) {
    console.error("문의 목록 로드 실패:", error);
  } finally {
    loading.value = false;
  }
};

// 문의 상세로 이동
const goToDetail = (inquiry: Inquiry) => {
  // 비밀글인 경우 본인 또는 관리자만 접근 가능
  if (inquiry.isPrivate) {
    if (!authStore.user) {
      showAlert("로그인이 필요합니다.", { type: "error" });
      router.push("/login");
      return;
    }
    if (inquiry.userId !== authStore.user.id && !authStore.user.isAdmin) {
      showAlert("비밀글은 작성자만 확인할 수 있습니다.", { type: "error" });
      return;
    }
  }
  router.push(`/inquiry/${inquiry.id}`);
};

// 문의 작성 페이지로 이동
const goToCreate = () => {
  if (!authStore.user) {
    showAlert("로그인이 필요합니다.", { type: "error" });
    router.push("/login");
    return;
  }
  router.push("/inquiry/create");
};

onMounted(() => {
  loadInquiries();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-6 border-b pb-3 flex items-center justify-between">
      <h3 class="text-heading text-primary tracking-wider">Q&A</h3>
      <Button variant="default" size="sm" @click="goToCreate" class="gap-1">
        <PenLine class="w-4 h-4" />
        문의하기
      </Button>
    </div>

    <!-- 필터 -->
    <div class="mb-6 flex items-center gap-4">
      <Select v-model="selectedType">
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="유형 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="product">상품 문의</SelectItem>
          <SelectItem value="shipping">배송 문의</SelectItem>
          <SelectItem value="exchange">교환/반품</SelectItem>
          <SelectItem value="other">기타</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <LoadingSpinner v-if="loading" />

    <EmptyState
      v-else-if="filteredInquiries.length === 0"
      header="문의 내역"
      message="등록된 문의가 없습니다."
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
                <Badge
                  :variant="statusVariants[inquiry.status]"
                  class="text-xs"
                >
                  {{ statusLabels[inquiry.status] }}
                </Badge>
                <Lock
                  v-if="inquiry.isPrivate"
                  class="w-3.5 h-3.5 text-muted-foreground"
                />
              </div>

              <!-- 제목 -->
              <h4 class="font-medium text-foreground truncate mb-1">
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
              </h4>

              <!-- 상품 정보 (상품 문의인 경우) -->
              <p
                v-if="inquiry.product"
                class="text-sm text-muted-foreground truncate mb-1"
              >
                상품: {{ inquiry.product.name }}
              </p>

              <!-- 작성자 & 날짜 -->
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span>{{ inquiry.user?.userName || "익명" }}</span>
                <span>·</span>
                <span>{{ formatDate(inquiry.createdAt) }}</span>
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
