<script setup lang="ts">
// src/pages/inquiry/InquiryDetail.vue
// 문의 상세 페이지

import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  fetchInquiry,
  deleteInquiry,
  createInquiryReply,
  updateInquiryStatus,
} from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";

// 공통 컴포넌트
import { LoadingSpinner } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Lock, Loader2, Trash2, User } from "lucide-vue-next";
import { Alert } from "@/components/ui/alert";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { showAlert } = useAlert();

// 상태
const inquiry = ref<Inquiry | null>(null);
const loading = ref(true);
const replyLoading = ref(false);
const deleteLoading = ref(false);
const statusLoading = ref(false);
const replyContent = ref("");
const showDeleteConfirm = ref(false);

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

// 문의 ID
const inquiryId = computed(() => route.params.id as string);

// 내 문의인지 확인
const isMyInquiry = computed(() => {
  return authStore.user && inquiry.value?.userId === authStore.user.id;
});

// 관리자인지 확인
const isAdmin = computed(() => authStore.user?.isAdmin);

// 삭제 가능 여부 (작성자 또는 관리자)
const canDelete = computed(() => isMyInquiry.value || isAdmin.value);

// 답변 작성 가능 여부 (관리자만)
const canReply = computed(
  () => isAdmin.value && inquiry.value?.status !== "closed"
);

// 문의 로드
const loadInquiry = async () => {
  loading.value = true;
  try {
    inquiry.value = await fetchInquiry(inquiryId.value);
  } catch (error: any) {
    console.error("문의 로드 실패:", error);
    if (error.message?.includes("403") || error.message?.includes("권한")) {
      showAlert("접근 권한이 없습니다.", { type: "error" });
      router.push("/inquiry");
    }
  } finally {
    loading.value = false;
  }
};

// 답변 등록
const handleReply = async () => {
  if (!replyContent.value.trim()) {
    showAlert("답변 내용을 입력해주세요.", { type: "error" });
    return;
  }

  replyLoading.value = true;
  try {
    await createInquiryReply(inquiryId.value, {
      content: replyContent.value.trim(),
    });
    replyContent.value = "";
    await loadInquiry(); // 새로고침
    showAlert("답변이 등록되었습니다.");
  } catch (error: any) {
    console.error("답변 등록 실패:", error);
    showAlert(error.message || "답변 등록에 실패했습니다.", { type: "error" });
  } finally {
    replyLoading.value = false;
  }
};

// 상태 변경
const handleStatusChange = async (newStatus: string) => {
  statusLoading.value = true;
  try {
    await updateInquiryStatus(inquiryId.value, {
      status: newStatus as InquiryStatus,
    });
    await loadInquiry();
  } catch (error: any) {
    console.error("상태 변경 실패:", error);
    showAlert(error.message || "상태 변경에 실패했습니다.", { type: "error" });
  } finally {
    statusLoading.value = false;
  }
};

// 삭제 확인
const confirmDelete = () => {
  showDeleteConfirm.value = true;
};

// 문의 삭제
const handleDelete = async () => {
  showDeleteConfirm.value = false;
  deleteLoading.value = true;
  try {
    await deleteInquiry(inquiryId.value);
    showAlert("문의가 삭제되었습니다.");
    router.push("/inquiry");
  } catch (error: any) {
    console.error("문의 삭제 실패:", error);
    showAlert(error.message || "문의 삭제에 실패했습니다.", { type: "error" });
  } finally {
    deleteLoading.value = false;
  }
};

// 뒤로 가기
const goBack = () => {
  router.back();
};

// 상품 상세로 이동
const goToProduct = (productId: string) => {
  router.push(`/productDetail/${productId}`);
};

onMounted(() => {
  loadInquiry();
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="pb-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack" class="shrink-0">
          <ArrowLeft class="w-5 h-5" />
        </Button>
        <h3 class="text-heading text-primary tracking-wider">문의 상세</h3>
      </div>

      <!-- 삭제 버튼 -->
      <Button
        v-if="canDelete && inquiry"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive"
        :disabled="deleteLoading"
        @click="confirmDelete"
      >
        <Loader2 v-if="deleteLoading" class="w-4 h-4 mr-1 animate-spin" />
        <Trash2 v-else class="w-4 h-4 mr-1" />
        삭제
      </Button>
    </div>
    <Separator class="mb-6"></Separator>
    <LoadingSpinner v-if="loading" />

    <template v-else-if="inquiry">
      <!-- 문의 내용 -->
      <Card class="mb-6">
        <CardHeader class="pb-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <!-- 배지 -->
              <div class="flex items-center gap-2 mb-3">
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
              <CardTitle class="text-lg leading-snug">
                {{ inquiry.title }}
              </CardTitle>
            </div>

            <!-- 관리자: 상태 변경 -->
            <Select
              v-if="isAdmin"
              :model-value="inquiry.status"
              :disabled="statusLoading"
              @update:model-value="handleStatusChange"
            >
              <SelectTrigger class="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">답변 대기</SelectItem>
                <SelectItem value="answered">답변 완료</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 작성자 & 날짜 -->
          <div
            class="flex items-center gap-2 text-sm text-muted-foreground mt-1"
          >
            <span>{{ inquiry.user?.userName || "익명" }}</span>
            <span>·</span>
            <span>{{ formatDate(inquiry.createdAt) }}</span>
          </div>
          <Separator class="mt-2"></Separator>
        </CardHeader>

        <CardContent>
          <!-- 상품 정보 -->
          <div
            v-if="inquiry.product"
            class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4 cursor-pointer hover:bg-muted transition-colors"
            @click="goToProduct(inquiry.product.id)"
          >
            <img
              v-if="inquiry.product.imageUrl"
              :src="inquiry.product.imageUrl"
              :alt="inquiry.product.name"
              class="w-12 h-12 object-cover rounded"
            />
            <div>
              <p class="text-xs text-muted-foreground">문의 상품</p>
              <p class="text-sm font-medium">{{ inquiry.product.name }}</p>
            </div>
          </div>

          <!-- 문의 내용 -->
          <div class="whitespace-pre-wrap text-foreground">
            {{ inquiry.content }}
          </div>
        </CardContent>
      </Card>

      <!-- 답변 목록 -->
      <div
        v-if="inquiry.replies && inquiry.replies.length > 0"
        class="space-y-4 mb-6"
      >
        <h4 class="font-medium text-foreground">
          답변 ({{ inquiry.replies.length }})
        </h4>

        <Card
          v-for="reply in inquiry.replies"
          :key="reply.id"
          class="bg-primary/5 border-primary/20"
        >
          <CardContent class="p-4">
            <!-- 답변자 정보 -->
            <div class="flex items-center gap-2 mb-3">
              <div
                class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <User class="w-4 h-4 text-primary" />
              </div>
              <div>
                <p class="text-sm font-medium">{{ reply.user.userName }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ formatDate(reply.createdAt) }}
                </p>
              </div>
            </div>

            <!-- 답변 내용 -->
            <div class="whitespace-pre-wrap text-foreground pl-10">
              {{ reply.content }}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 관리자 답변 작성 -->
      <Card v-if="canReply">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">답변 작성</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <Textarea
            v-model="replyContent"
            placeholder="답변 내용을 입력해주세요"
            :rows="4"
            :disabled="replyLoading"
          />
          <div class="flex justify-end">
            <Button
              :disabled="replyLoading || !replyContent.trim()"
              @click="handleReply"
            >
              <Loader2 v-if="replyLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ replyLoading ? "등록 중..." : "답변 등록" }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- 문의를 찾을 수 없는 경우 -->
    <div v-else class="text-center py-12">
      <p class="text-muted-foreground">문의를 찾을 수 없습니다.</p>
      <Button variant="outline" class="mt-4" @click="router.push('/inquiry')">
        목록으로 돌아가기
      </Button>
    </div>

    <!-- 삭제 확인 다이얼로그 -->
    <Alert
      v-if="showDeleteConfirm"
      :confirm-mode="true"
      confirm-variant="destructive"
      message="정말로 이 문의를 삭제하시겠습니까?
삭제된 문의는 복구할 수 없습니다."
      confirm-text="삭제"
      cancel-text="취소"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>
