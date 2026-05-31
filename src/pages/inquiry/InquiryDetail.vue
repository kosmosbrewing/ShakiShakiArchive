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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getUserProfileImageUrl } from "@/lib/constants/profile";

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
const statusDraft = ref<InquiryStatus>("pending");
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

const hasStatusDraftChanged = computed(() => {
  return Boolean(inquiry.value && statusDraft.value !== inquiry.value.status);
});

// 문의 로드
const loadInquiry = async () => {
  loading.value = true;
  try {
    inquiry.value = await fetchInquiry(inquiryId.value);
    statusDraft.value = inquiry.value.status;
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
const handleStatusSave = async () => {
  if (!hasStatusDraftChanged.value) return;

  statusLoading.value = true;
  try {
    await updateInquiryStatus(inquiryId.value, {
      status: statusDraft.value,
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

// 상품 상세로 이동 (slug 우선, fallback: id)
const goToProduct = (slug: string | undefined | null, id: string) => {
  router.push(`/productDetail/${slug || id}`);
};

onMounted(() => {
  loadInquiry();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16 lg:min-h-[calc(100vh-9rem)] lg:pb-20">
    <!-- 헤더 -->
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          @click="goBack"
          class="shrink-0 -ml-2 hover:bg-primary/[0.03]"
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
        class="gap-1.5 rounded-none px-2 text-muted-foreground/80 hover:bg-destructive/10 hover:text-destructive"
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
    <Separator class="mb-6 bg-primary/10" />
    <LoadingSpinner v-if="loading" />

    <template v-else-if="inquiry">
      <!-- 문의 내용 -->
      <Card class="mb-6 border-primary/10 bg-background/80 shadow-none">
        <CardHeader class="px-5 pb-4 sm:px-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <span class="shrink-0 text-[11px] font-medium leading-none text-muted-foreground/75">
                  {{ typeLabels[inquiry.type] }}
                </span>
                <span class="shrink-0 text-[11px] leading-none text-muted-foreground/40">·</span>

                <!-- 제목 -->
                <CardTitle class="min-w-0 flex-1 text-base sm:text-lg leading-[1.3] font-semibold">
                  {{ inquiry.title }}
                </CardTitle>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption leading-[1.2] text-muted-foreground/80">
                <span>{{ formatDateTimeWithSeconds(inquiry.createdAt) }}</span>
                <template v-if="inquiry.user?.userName">
                  <span class="text-muted-foreground/50">·</span>
                  <span>{{ inquiry.user.userName }}</span>
                </template>
                <template v-if="inquiry.isPrivate">
                  <span class="text-muted-foreground/50">·</span>
                  <span class="inline-flex items-center gap-1">
                    <Lock class="w-3.5 h-3.5" />
                    비밀글
                  </span>
                </template>
              </div>
            </div>

            <Badge
              :variant="statusVariants[inquiry.status]"
              class="shrink-0 text-[11px] font-semibold"
            >
              <span class="sm:hidden">{{ statusLabelsShort[inquiry.status] }}</span>
              <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="border-t border-primary/10 px-5 py-5 sm:px-6 sm:py-6">
          <!-- 문의 내용 -->
          <div
            class="whitespace-pre-wrap text-foreground text-body leading-[1.5]"
          >
            {{ inquiry.content }}
          </div>

          <!-- 상품 정보 -->
          <div
            v-if="inquiry.product"
            class="mt-5 flex items-center gap-3 p-3 sm:p-4 bg-background/80 border border-primary/10 rounded-none cursor-pointer hover:bg-primary/[0.03] hover:border-primary/20 transition-colors duration-200"
            @click="goToProduct(inquiry.product.slug, inquiry.product.id)"
          >
            <img
              v-if="safeProductImageUrl"
              :src="safeProductImageUrl"
              :alt="inquiry.product.name"
              class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-none border border-primary/10"
              crossorigin="anonymous"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-muted-foreground mb-0.5">관련 상품</p>
              <p class="text-sm font-medium truncate">
                {{ inquiry.product.name }}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter
          v-if="isAdmin"
          class="justify-end border-t border-primary/10 px-5 py-3 sm:px-6"
        >
          <div class="flex items-center gap-2">
            <span class="text-caption text-muted-foreground/80">상태 변경</span>
            <Select
              v-model="statusDraft"
              :disabled="statusLoading"
            >
              <SelectTrigger class="w-[130px] border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">답변 대기</SelectItem>
                <SelectItem value="answered">답변 완료</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              class="h-9 rounded-none border-border/60 px-3 text-caption font-medium shadow-none hover:bg-primary/[0.03]"
              :disabled="statusLoading || !hasStatusDraftChanged"
              @click="handleStatusSave"
            >
              {{ statusLoading ? "저장 중" : "저장" }}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <!-- 답변 목록 -->
      <div
        v-if="inquiry.replies && inquiry.replies.length > 0"
        class="space-y-4 mb-6"
      >
        <div class="flex items-center gap-2 px-1">
          <h4 class="font-semibold text-foreground text-body">답변</h4>
          <span class="text-caption text-muted-foreground/80 font-medium">
            {{ inquiry.replies.length }}
          </span>
        </div>

        <!-- 답변 위계 표시를 위한 왼쪽 여백 및 시각적 구분 -->
        <div
          class="ml-4 sm:ml-8 pl-4 sm:pl-6 border-l border-primary/10 space-y-4"
        >
          <Card
            v-for="reply in inquiry.replies"
            :key="reply.id"
            class="bg-background/80 border-primary/10 shadow-none"
          >
            <CardContent class="p-4 sm:p-5">
              <!-- 답변자 정보 -->
              <div class="flex items-center gap-2.5 mb-4">
                <Avatar
                  shape="square"
                  class="h-9 w-9 shrink-0 rounded-none border border-primary/10 bg-background sm:h-10 sm:w-10"
                >
                  <AvatarImage
                    v-if="getUserProfileImageUrl(reply.user)"
                    :src="getUserProfileImageUrl(reply.user) || ''"
                    :alt="`${reply.user.userName} 프로필`"
                    class="object-contain p-1"
                  />
                  <AvatarFallback
                    class="flex h-full w-full items-center justify-center bg-background"
                  >
                    <User class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">
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
                  class="rounded-none text-muted-foreground/80 hover:bg-destructive/10 hover:text-destructive shrink-0"
                  @click="confirmReplyDelete(String(reply.id))"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>

              <!-- 답변 내용 -->
              <div
                class="whitespace-pre-wrap text-foreground text-body leading-[1.5]"
              >
                {{ reply.content }}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- 관리자 답변 작성 -->
      <Card v-if="canReply" class="border-primary/10 bg-background/80 shadow-none">
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
              class="shadow-none"
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
    <Card v-else class="border-primary/10 bg-background/80 shadow-none">
      <CardContent class="text-center py-16">
        <p class="text-muted-foreground text-body mb-6">
          문의를 찾을 수 없습니다.
        </p>
        <Button
          variant="outline"
          class="rounded-none border-primary/10 font-medium shadow-none hover:bg-primary/[0.03]"
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
