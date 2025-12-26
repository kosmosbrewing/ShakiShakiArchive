<script setup lang="ts">
// src/pages/inquiry/InquiryCreate.vue
// 문의 작성 페이지

import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { createInquiry, fetchProduct } from "@/lib/api";
import type { InquiryType, Product } from "@/types/api";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Lock } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();

// 인증 체크
useAuthGuard();

// 상태
const loading = ref(false);
const productLoading = ref(false);
const product = ref<Product | null>(null);

// 폼 데이터
const formData = ref({
  type: "other" as InquiryType,
  title: "",
  content: "",
  isPrivate: false,
});

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

// 폼 유효성 검사
const isFormValid = computed(() => {
  return formData.value.title.trim() !== "" && formData.value.content.trim() !== "";
});

// 문의 등록
const handleSubmit = async () => {
  if (!isFormValid.value) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  loading.value = true;
  try {
    await createInquiry({
      productId: productId.value,
      type: formData.value.type,
      title: formData.value.title.trim(),
      content: formData.value.content.trim(),
      isPrivate: formData.value.isPrivate,
    });

    alert("문의가 등록되었습니다.");
    router.push("/inquiry");
  } catch (error: any) {
    console.error("문의 등록 실패:", error);
    alert(error.message || "문의 등록에 실패했습니다.");
  } finally {
    loading.value = false;
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
    <div class="mb-6 border-b pb-3 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack" class="shrink-0">
        <ArrowLeft class="w-5 h-5" />
      </Button>
      <h3 class="text-heading text-primary tracking-wider">문의하기</h3>
    </div>

    <!-- 상품 정보 (상품 문의인 경우) -->
    <Card v-if="product" class="mb-6">
      <CardContent class="p-4 flex items-center gap-4">
        <img
          v-if="product.imageUrl"
          :src="product.imageUrl"
          :alt="product.name"
          class="w-16 h-16 object-cover rounded"
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
          <Select v-model="formData.type" :disabled="!!productId">
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
            id="title"
            v-model="formData.title"
            placeholder="문의 제목을 입력해주세요"
            :disabled="loading"
          />
        </div>

        <!-- 내용 -->
        <div class="space-y-2">
          <Label for="content">내용</Label>
          <Textarea
            id="content"
            v-model="formData.content"
            placeholder="문의 내용을 상세히 입력해주세요"
            :rows="8"
            :disabled="loading"
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
          <span v-if="formData.isPrivate" class="ml-3 text-sm text-muted-foreground">
            비밀글은 본인과 관리자만 확인할 수 있습니다.
          </span>
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-4">
          <Button
            variant="outline"
            class="flex-1"
            :disabled="loading"
            @click="goBack"
          >
            취소
          </Button>
          <Button
            class="flex-1"
            :disabled="loading || !isFormValid"
            @click="handleSubmit"
          >
            <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
            {{ loading ? "등록 중..." : "등록하기" }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
