<script setup lang="ts">
// src/pages/inquiry/InquiryDetail.vue
// 문의 상세 페이지

import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  fetchInquiry,
  deleteInquiry,
  createInquiryReply,
  deleteInquiryReply,
  updateInquiryStatus,
} from "@/lib/api";
import { formatDateTimeWithSeconds } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { INQUIRY_MESSAGES } from "@/lib/messages";

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
import { ArrowLeft, Lock, Trash2, User } from "lucide-vue-next";
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
const deletingReplyId = ref<string | null>(null);
const showReplyDeleteConfirm = ref(false);

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

// 문의 ID
const inquiryId = computed(() => route.params.id as string);

// 안전한 이미지 URL인지 검증 (XSS 방지)
const safeProductImageUrl = computed(() => {
  if (!inquiry.value?.product?.imageUrl) return null;

  try {
    const url = new URL(inquiry.value.product.imageUrl, window.location.origin);
    // HTTP(S) 프로토콜만 허용 (javascript:, data: 등 차단)
    if (url.protocol === "http:" || url.protocol === "https:") {
      return inquiry.value.product.imageUrl;
    }
  } catch {
    // 유효하지 않은 URL
    console.warn("Invalid product image URL:", inquiry.value.product.imageUrl);
  }

  return null; // 안전하지 않은 URL은 null 반환
});

// 내 문의인지 확인
const isMyInquiry = computed(() => {
  return authStore.user && inquiry.value?.userId === authStore.user.id;
});

// 관리자인지 확인
const isAdmin = computed(() => authStore.user?.isAdmin);

// 삭제 가능 여부 (작성자 또는 관리자)
const canDelete = computed(() => isMyInquiry.value || isAdmin.value);

// 답변 작성 가능 여부 (관리자만)
const canReply = computed(() => isAdmin.value);

// 문의 로드
const loadInquiry = async () => {
  loading.value = true;
  try {
    inquiry.value = await fetchInquiry(inquiryId.value);
  } catch (error: any) {
    console.error("문의 로드 실패:", error);
    if (error.message?.includes("403") || error.message?.includes("권한")) {
      showAlert(INQUIRY_MESSAGES.accessDenied, { type: "error" });
      router.push("/inquiry");
    }
  } finally {
    loading.value = false;
  }
};

// 답변 등록
const handleReply = async () => {
  if (!replyContent.value.trim()) {
    showAlert(INQUIRY_MESSAGES.replyContentRequired, { type: "error" });
    return;
  }

  replyLoading.value = true;
  try {
    await createInquiryReply(inquiryId.value, {
      content: replyContent.value.trim(),
    });

    // 답변 등록 후 상태가 pending인 경우 자동으로 answered로 변경
    if (inquiry.value?.status === "pending") {
      await updateInquiryStatus(inquiryId.value, {
        status: "answered",
      });
    }

    replyContent.value = "";
    await loadInquiry(); // 새로고침
    showAlert(INQUIRY_MESSAGES.replySuccess);
  } catch (error: any) {
    console.error("답변 등록 실패:", error);
    showAlert(error.message || INQUIRY_MESSAGES.replyFailed, { type: "error" });
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
    showAlert(error.message || INQUIRY_MESSAGES.statusChangeFailed, { type: "error" });
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
    showAlert(INQUIRY_MESSAGES.deleteSuccess);
    router.push("/inquiry");
  } catch (error: any) {
    console.error("문의 삭제 실패:", error);
    showAlert(error.message || INQUIRY_MESSAGES.deleteFailed, { type: "error" });
  } finally {
    deleteLoading.value = false;
  }
};

// 답변 삭제 확인
const confirmReplyDelete = (replyId: string) => {
  deletingReplyId.value = replyId;
  showReplyDeleteConfirm.value = true;
};

// 답변 삭제
const handleReplyDelete = async () => {
  if (!deletingReplyId.value) return;

  showReplyDeleteConfirm.value = false;
  try {
    await deleteInquiryReply(inquiryId.value, deletingReplyId.value);
    await loadInquiry(); // 새로고침

    // 답변이 모두 삭제된 경우 자동으로 상태를 pending으로 변경
    if (
      inquiry.value?.replies &&
      inquiry.value.replies.length === 0 &&
      inquiry.value.status === "answered"
    ) {
      await updateInquiryStatus(inquiryId.value, {
        status: "pending",
      });
      await loadInquiry(); // 상태 변경 후 다시 새로고침
    }

    showAlert(INQUIRY_MESSAGES.replyDeleteSuccess);
  } catch (error: any) {
    console.error("답변 삭제 실패:", error);
    showAlert(error.message || INQUIRY_MESSAGES.replyDeleteFailed, { type: "error" });
  } finally {
    deletingReplyId.value = null;
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
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
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
          문의 상세
        </h3>
      </div>

      <!-- 삭제 버튼 -->
      <Button
        v-if="canDelete && inquiry"
        variant="ghost"
        size="sm"
        class="text-primary hover:text-primary hover:bg-primary/5 transition-colors"
        :disabled="deleteLoading"
        @click="confirmDelete"
      >
        <LoadingSpinner
          v-if="deleteLoading"
          variant="spinner"
          size="sm"
          color="primary"
          :center="false"
          class="w-4 h-4 mr-1"
        />
        <span class="hidden sm:inline">삭제</span>
      </Button>
    </div>
    <Separator class="mb-6" />
    <LoadingSpinner v-if="loading" />

    <template v-else-if="inquiry">
      <!-- 문의 내용 -->
      <Card class="mb-6 shadow-sm border-border rounded-xl">
        <CardHeader class="pb-4 px-5 sm:px-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- 배지 -->
              <div class="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="outline" class="text-xs">
                  {{ typeLabels[inquiry.type] }}
                </Badge>
                <Badge
                  :variant="statusVariants[inquiry.status]"
                  class="text-xs font-medium"
                >
                  <span class="sm:hidden">{{ statusLabelsShort[inquiry.status] }}</span>
                  <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
                </Badge>
                <Lock
                  v-if="inquiry.isPrivate"
                  class="w-3.5 h-3.5 text-muted-foreground"
                />
              </div>

              <!-- 제목 -->
              <CardTitle class="text-lg sm:text-xl leading-snug font-semibold">
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
              <SelectTrigger class="w-[130px] border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">답변 대기</SelectItem>
                <SelectItem value="answered">답변 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 작성일 -->
          <div
            class="flex items-center gap-2 text-caption text-muted-foreground"
          >
            <span>{{ formatDateTimeWithSeconds(inquiry.createdAt) }}</span>
          </div>
          <Separator class="mt-1 mb-1"></Separator>
        </CardHeader>

        <CardContent class="px-5 sm:px-6 pb-5 sm:pb-6">
          <!-- 상품 정보 -->
          <div
            v-if="inquiry.product"
            class="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 border border-border/50 rounded-lg mb-5 cursor-pointer hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
            @click="goToProduct(inquiry.product.id)"
          >
            <img
              v-if="safeProductImageUrl"
              :src="safeProductImageUrl"
              :alt="inquiry.product.name"
              class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-md border border-border/30"
              crossorigin="anonymous"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-muted-foreground mb-0.5">문의 상품</p>
              <p class="text-sm sm:text-base font-semibold truncate">
                {{ inquiry.product.name }}
              </p>
            </div>
          </div>

          <!-- 문의 내용 -->
          <div
            class="whitespace-pre-wrap text-foreground text-body leading-relaxed"
          >
            {{ inquiry.content }}
          </div>
        </CardContent>
      </Card>

      <!-- 답변 목록 -->
      <div
        v-if="inquiry.replies && inquiry.replies.length > 0"
        class="space-y-4 mb-6"
      >
        <div class="flex items-center gap-2 px-1">
          <h4 class="font-semibold text-foreground text-body">답변</h4>
          <span class="text-caption text-primary font-medium">
            {{ inquiry.replies.length }}
          </span>
        </div>

        <!-- 답변 위계 표시를 위한 왼쪽 여백 및 시각적 구분 -->
        <div
          class="ml-4 sm:ml-8 pl-4 sm:pl-6 border-l-4 border-primary/30 space-y-4"
        >
          <Card
            v-for="reply in inquiry.replies"
            :key="reply.id"
            class="bg-primary/5 border-primary/20 shadow-sm rounded-xl"
          >
            <CardContent class="p-4 sm:p-5">
              <!-- 답변자 정보 -->
              <div class="flex items-center gap-2.5 mb-4">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0"
                >
                  <User class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm sm:text-base font-semibold text-foreground">
                    {{ reply.user.userName }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatDateTimeWithSeconds(reply.createdAt) }}
                  </p>
                </div>
                <!-- 답변 삭제 버튼 (관리자만) -->
                <Button
                  v-if="isAdmin"
                  variant="ghost"
                  size="sm"
                  class="text-primary hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
                  @click="confirmReplyDelete(String(reply.id))"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>

              <!-- 답변 내용 -->
              <div
                class="whitespace-pre-wrap text-foreground text-body leading-relaxed"
              >
                {{ reply.content }}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- 관리자 답변 작성 -->
      <Card v-if="canReply" class="shadow-sm border-border rounded-xl">
        <CardHeader class="pb-3 px-5 sm:px-6">
          <CardTitle class="text-base sm:text-lg font-semibold">
            답변 작성
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 px-5 sm:px-6 pb-5 sm:pb-6">
          <Textarea
            v-model="replyContent"
            placeholder="답변 내용을 입력해주세요"
            :rows="5"
            :disabled="replyLoading"
            class="text-body leading-relaxed resize-none border-border/60 focus:border-primary/50 placeholder:text-muted-foreground/50"
          />
          <div class="flex justify-end">
            <Button
              :disabled="replyLoading || !replyContent.trim()"
              @click="handleReply"
              class="shadow-sm hover:shadow"
            >
              <LoadingSpinner
                v-if="replyLoading"
                variant="spinner"
                size="sm"
                color="white"
                :center="false"
                class="mr-2"
              />
              {{ replyLoading ? "등록 중..." : "답변 등록" }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- 문의를 찾을 수 없는 경우 -->
    <Card v-else class="shadow-sm border-border rounded-xl">
      <CardContent class="text-center py-16">
        <p class="text-muted-foreground text-body mb-6">
          문의를 찾을 수 없습니다.
        </p>
        <Button
          variant="outline"
          class="shadow-sm hover:shadow border-border/60 font-medium"
          @click="router.push('/inquiry')"
        >
          목록으로 돌아가기
        </Button>
      </CardContent>
    </Card>

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

    <!-- 답변 삭제 확인 다이얼로그 -->
    <Alert
      v-if="showReplyDeleteConfirm"
      :confirm-mode="true"
      confirm-variant="destructive"
      message="정말로 이 답변을 삭제하시겠습니까?
삭제된 답변은 복구할 수 없습니다."
      confirm-text="삭제"
      cancel-text="취소"
      @confirm="handleReplyDelete"
      @cancel="showReplyDeleteConfirm = false"
      @close="showReplyDeleteConfirm = false"
    />
  </div>
</template>
