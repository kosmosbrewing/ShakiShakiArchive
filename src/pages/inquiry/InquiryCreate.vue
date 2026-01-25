<script setup lang="ts">
// src/pages/inquiry/InquiryCreate.vue
// 문의 작성 페이지

import { ref, onMounted, computed, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useAlert } from "@/composables/useAlert";
import { INQUIRY_MESSAGES } from "@/lib/messages";
import { createInquiry, fetchProduct } from "@/lib/api";
import type { InquiryType, Product } from "@/types/api";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common";
import { ArrowLeft, Lock } from "lucide-vue-next";
import { Alert } from "@/components/ui/alert";

const router = useRouter();
const route = useRoute();
const { showAlert } = useAlert();

// 인증 체크
useAuthGuard();

// 상태
const loading = ref(false);
const productLoading = ref(false);
const product = ref<Product | null>(null);
const showSubmitConfirm = ref(false);

// 폼 데이터
const formData = ref({
  type: "other" as InquiryType,
  title: "",
  content: "",
  isPrivate: false,
});

// ref: 포커스 이동용
const titleInputRef = ref<InstanceType<typeof Input> | null>(null);
const contentTextareaRef = ref<InstanceType<typeof Textarea> | null>(null);

// 한글 입력 중 여부 추적
const isComposingTitle = ref(false);

// 문의 유형 옵션
const typeOptions: { value: InquiryType; label: string }[] = [
  { value: "product", label: "상품 문의" },
  { value: "shipping", label: "배송 문의" },
  { value: "exchange", label: "교환/반품" },
  { value: "other", label: "기타" },
];

// URL에서 productId 파라미터 확인
const productId = computed(() => route.query.productId as string | undefined);

// 상품 정보 로드
const loadProduct = async () => {
  if (!productId.value) return;

  productLoading.value = true;
  try {
    product.value = await fetchProduct(productId.value);
    formData.value.type = "product"; // 상품 문의로 자동 설정
  } catch (error) {
    console.error("상품 정보 로드 실패:", error);
  } finally {
    productLoading.value = false;
  }
};

// 안전한 이미지 URL인지 검증 (XSS 방지)
const safeProductImageUrl = computed(() => {
  if (!product.value?.imageUrl) return null;

  try {
    const url = new URL(product.value.imageUrl, window.location.origin);
    // HTTP(S) 프로토콜만 허용 (javascript:, data: 등 차단)
    if (url.protocol === "http:" || url.protocol === "https:") {
      return product.value.imageUrl;
    }
  } catch {
    // 유효하지 않은 URL
    console.warn("Invalid product image URL:", product.value.imageUrl);
  }

  return null; // 안전하지 않은 URL은 null 반환
});

// 폼 유효성 검사
const isFormValid = computed(() => {
  return (
    formData.value.title.trim() !== "" && formData.value.content.trim() !== ""
  );
});

// 등록하기 버튼 클릭 (확인 다이얼로그 표시)
const handleSubmitClick = () => {
  if (!isFormValid.value) {
    showAlert(INQUIRY_MESSAGES.titleAndContentRequired, { type: "error" });
    return;
  }

  showSubmitConfirm.value = true;
};

// 문의 등록 실행
const handleSubmit = async () => {
  showSubmitConfirm.value = false;
  loading.value = true;
  try {
    await createInquiry({
      productId: productId.value,
      type: formData.value.type,
      title: formData.value.title.trim(),
      content: formData.value.content.trim(),
      isPrivate: formData.value.isPrivate,
    });

    showAlert(INQUIRY_MESSAGES.createSuccess);
    router.push("/inquiry");
  } catch (error: any) {
    console.error("문의 등록 실패:", error);
    showAlert(error.message || INQUIRY_MESSAGES.createFailed, { type: "error" });
  } finally {
    loading.value = false;
  }
};

// Select 변경 시 포커스 이동
const handleTypeChange = async (value: string) => {
  formData.value.type = value as InquiryType;

  // Select 선택 후 제목 입력란으로 포커스 이동
  await nextTick();
  if (titleInputRef.value) {
    const inputEl = titleInputRef.value.$el as HTMLInputElement;
    if (inputEl) {
      inputEl.focus();
    }
  }
};

// 제목 입력란에서 엔터 키 처리
const handleTitleEnter = (event: KeyboardEvent) => {
  // 한글 입력 중에는 엔터 처리 안 함
  if (isComposingTitle.value) return;

  event.preventDefault();
  event.stopPropagation();

  // 내용 입력란으로 포커스 이동
  if (contentTextareaRef.value) {
    const textareaEl = contentTextareaRef.value.$el as HTMLTextAreaElement;
    if (textareaEl) {
      textareaEl.focus();
    }
  }
};

// 뒤로 가기
const goBack = () => {
  router.back();
};

onMounted(() => {
  loadProduct();
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-2 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack" class="shrink-0">
        <ArrowLeft class="w-5 h-5" />
      </Button>
      <h3 class="text-heading text-primary tracking-wider">문의하기</h3>
    </div>
    <Separator class="mb-6" />

    <!-- 상품 정보 (상품 문의인 경우) -->
    <Card v-if="product">
      <CardContent class="p-4 flex items-center gap-4">
        <img
          v-if="safeProductImageUrl"
          :src="safeProductImageUrl"
          :alt="product.name"
          class="w-16 h-16 object-cover rounded"
          crossorigin="anonymous"
        />
        <div>
          <p class="text-sm text-muted-foreground">문의 상품</p>
          <p class="font-medium">{{ product.name }}</p>
        </div>
      </CardContent>
    </Card>

    <!-- 문의 작성 폼 -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">문의 내용</CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- 문의 유형 -->
        <div class="space-y-2">
          <Label>문의 유형</Label>
          <Select
            :model-value="formData.type"
            :disabled="!!productId"
            @update:model-value="handleTypeChange"
          >
            <SelectTrigger>
              <SelectValue placeholder="문의 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in typeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 제목 -->
        <div class="space-y-2">
          <Label for="title">제목</Label>
          <Input
            ref="titleInputRef"
            id="title"
            v-model="formData.title"
            placeholder="문의 제목을 입력해주세요"
            :disabled="loading"
            class="placeholder:text-muted-foreground/50"
            @keydown.enter="handleTitleEnter"
            @compositionstart="isComposingTitle = true"
            @compositionend="isComposingTitle = false"
          />
        </div>

        <!-- 내용 -->
        <div class="space-y-2">
          <Label for="content">내용</Label>
          <Textarea
            ref="contentTextareaRef"
            id="content"
            v-model="formData.content"
            placeholder="문의 내용을 상세히 입력해주세요"
            :rows="8"
            :disabled="loading"
            class="placeholder:text-muted-foreground/50"
          />
        </div>

        <!-- 비밀글 설정 -->
        <div class="flex items-center">
          <Button
            type="button"
            :variant="formData.isPrivate ? 'default' : 'outline'"
            size="sm"
            :disabled="loading"
            @click="formData.isPrivate = !formData.isPrivate"
            class="gap-2"
          >
            <Lock class="w-4 h-4" />
            비밀글로 작성
          </Button>
          <span
            v-if="formData.isPrivate"
            class="ml-3 text-sm text-muted-foreground"
          >
            비밀글은 본인과 관리자만 확인할 수 있습니다.
          </span>
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-4">
          <Button
            variant="outline"
            class="flex-1 font-medium"
            :disabled="loading"
            @click="goBack"
          >
            취소
          </Button>
          <Button
            class="flex-1"
            :disabled="loading || !isFormValid"
            @click="handleSubmitClick"
          >
            <LoadingSpinner
              v-if="loading"
              variant="spinner"
              size="sm"
              color="white"
              :center="false"
              class="mr-2"
            />
            {{ loading ? "등록 중..." : "등록하기" }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 등록 확인 다이얼로그 -->
    <Alert
      v-if="showSubmitConfirm"
      :confirm-mode="true"
      message="문의를 등록하시겠습니까?"
      confirm-text="등록"
      cancel-text="취소"
      @confirm="handleSubmit"
      @cancel="showSubmitConfirm = false"
      @close="showSubmitConfirm = false"
    />
  </div>
</template>
