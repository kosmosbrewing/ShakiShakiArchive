<script setup lang="ts">
// src/pages/inquiry/InquiryList.vue
// 문의 목록 페이지 (전체 공개 문의)

import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { fetchInquiries } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const router = useRouter();
const authStore = useAuthStore();

// FAQ 데이터
interface FAQItem {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQItem[] = [
  {
    question: "배송은 얼마나 걸리나요?",
    answer: "일반 배송은 결제 완료 후 2-3일 내에 발송되며, 발송 후 1-2일 내에 수령 가능합니다. 도서산간 지역은 추가 1-2일이 소요될 수 있습니다.",
    value: "item-1",
  },
  {
    question: "교환/반품은 어떻게 하나요?",
    answer: "상품 수령 후 7일 이내 교환/반품이 가능합니다. 단순 변심의 경우 반품 배송비는 고객 부담이며, 상품 하자의 경우 무료로 처리됩니다. 마이페이지에서 교환/반품 신청이 가능합니다.",
    value: "item-2",
  },
  {
    question: "주문 후 배송지 변경이 가능한가요?",
    answer: "상품 발송 전이라면 마이페이지 또는 고객센터를 통해 배송지 변경이 가능합니다. 발송 후에는 변경이 어려우니 빠른 연락 부탁드립니다.",
    value: "item-3",
  },
  {
    question: "품절된 상품은 재입고 되나요?",
    answer: "인기 상품의 경우 재입고가 진행될 수 있습니다. 상품 상세 페이지에서 재입고 알림 신청을 하시면 입고 시 알림을 받으실 수 있습니다.",
    value: "item-4",
  },
  {
    question: "적립금/쿠폰은 어떻게 사용하나요?",
    answer: "결제 시 적립금과 쿠폰을 선택하여 사용할 수 있습니다. 적립금은 1,000원 이상부터 사용 가능하며, 쿠폰과 중복 사용이 가능합니다.",
    value: "item-5",
  },
];

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
const statusVariants: Record<InquiryStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  answered: "default",
  closed: "secondary",
};

// 필터링된 문의 목록
const filteredInquiries = computed(() => {
  if (selectedType.value === "all") {
    return inquiries.value;
  }
  return inquiries.value.filter((inquiry) => inquiry.type === selectedType.value);
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
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    if (inquiry.userId !== authStore.user.id && !authStore.user.isAdmin) {
      alert("비밀글은 작성자만 확인할 수 있습니다.");
      return;
    }
  }
  router.push(`/inquiry/${inquiry.id}`);
};

// 문의 작성 페이지로 이동
const goToCreate = () => {
  if (!authStore.user) {
    alert("로그인이 필요합니다.");
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
    <!-- FAQ 섹션 -->
    <section class="mb-16">
      <div class="text-center mb-8">
        <h2 class="text-lg text-primary mb-2 tracking-wider">FAQ</h2>
        <h3 class="text-2xl md:text-3xl font-bold">자주 묻는 질문</h3>
      </div>

      <Accordion type="single" collapsible class="w-full">
        <AccordionItem
          v-for="{ question, answer, value } in FAQList"
          :key="value"
          :value="value"
        >
          <AccordionTrigger class="text-left">{{ question }}</AccordionTrigger>
          <AccordionContent>{{ answer }}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <p class="text-sm text-muted-foreground mt-4 text-center">
        찾으시는 답변이 없으신가요?
        <span class="text-primary underline cursor-pointer" @click="goToCreate">
          1:1 문의하기
        </span>
      </p>
    </section>

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
                <Badge :variant="statusVariants[inquiry.status]" class="text-xs">
                  {{ statusLabels[inquiry.status] }}
                </Badge>
                <Lock v-if="inquiry.isPrivate" class="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <!-- 제목 -->
              <h4 class="font-medium text-foreground truncate mb-1">
                <template v-if="inquiry.isPrivate && authStore.user?.id !== inquiry.userId && !authStore.user?.isAdmin">
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
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
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
