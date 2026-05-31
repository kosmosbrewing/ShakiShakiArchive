<script setup lang="ts">
// src/components/admin/ImageUploader.vue
// 관리자용 이미지 업로드 컴포넌트

import { ref, computed } from "vue";
import { Upload, X, Image as ImageIcon, ArrowLeft, ArrowRight } from "lucide-vue-next";
import { LoadingSpinner } from "@/components/common";
import {
  uploadProductImage,
  uploadProductImages,
  uploadProductDetailImages,
} from "@/lib/api";
import { ADMIN_MESSAGES } from "@/lib/messages";
import type { UploadedImage } from "@/types/api";

interface Props {
  modelValue: string | string[]; // 단일 URL 또는 URL 배열
  type: "single" | "multiple" | "details"; // 업로드 타입
  label?: string;
  required?: boolean;
  maxFiles?: number;
  productSlug?: string; // Cloudinary public_id 슬러그 기반 생성용 (SEO)
}

const props = withDefaults(defineProps<Props>(), {
  label: "이미지",
  required: false,
  maxFiles: 10,
  productSlug: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | string[]): void;
}>();

// 상태
const isUploading = ref(false);
const uploadProgress = ref(0);
const errorMessage = ref<string>("");
const isDragging = ref(false);

// 현재 이미지 목록 (배열로 변환)
const currentImages = computed<string[]>(() => {
  if (!props.modelValue) return [];
  if (typeof props.modelValue === "string") {
    return props.modelValue ? [props.modelValue] : [];
  }
  return props.modelValue;
});

// 파일 검증 + 업로드 공용 로직
const processFiles = async (files: File[]) => {
  if (props.type === "single" && files.length > 1) {
    errorMessage.value = ADMIN_MESSAGES.singleFileOnly;
    return;
  }

  if (files.length > props.maxFiles) {
    errorMessage.value = ADMIN_MESSAGES.maxFilesExceeded.replace("{max}", String(props.maxFiles));
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const invalidFile = files.find((f) => !allowedTypes.includes(f.type));
  if (invalidFile) {
    errorMessage.value = ADMIN_MESSAGES.supportedImageFormats;
    return;
  }

  const maxSize = 10 * 1024 * 1024;
  const oversizedFile = files.find((f) => f.size > maxSize);
  if (oversizedFile) {
    errorMessage.value = ADMIN_MESSAGES.fileSizeLimit;
    return;
  }

  errorMessage.value = "";
  isUploading.value = true;

  try {
    // productSlug가 있으면 Cloudinary public_id를 slug 기반으로 생성
    const slug = props.productSlug || undefined;
    if (props.type === "single") {
      const result = await uploadProductImage(files[0], slug);
      emit("update:modelValue", result.image.url);
    } else if (props.type === "multiple") {
      const result = await uploadProductImages(files, slug);
      const uploadedUrls = result.images.map((img: UploadedImage) => img.url);
      emit("update:modelValue", [...currentImages.value, ...uploadedUrls]);
    } else if (props.type === "details") {
      const result = await uploadProductDetailImages(files, slug);
      const uploadedUrls = result.images.map((img: UploadedImage) => img.url);
      emit("update:modelValue", [...currentImages.value, ...uploadedUrls]);
    }
  } catch (error: any) {
    errorMessage.value = error.message || ADMIN_MESSAGES.imageUploadFailed;
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// 파일 input 선택 핸들러
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  await processFiles(Array.from(input.files));
  input.value = "";
};

// 드래그 앤 드롭 핸들러
const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  if (isUploading.value) return;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length === 0) return;
  await processFiles(files);
};

// 이미지 제거 (URL만 제거, 실제 삭제는 하지 않음)
const removeImage = (index: number) => {
  if (props.type === "single") {
    emit("update:modelValue", "");
  } else {
    const newUrls = currentImages.value.filter((_, i) => i !== index);
    emit("update:modelValue", newUrls);
  }
};

// 상세 이미지 순서 변경 (swap)
const moveImage = (fromIndex: number, toIndex: number) => {
  if (toIndex < 0 || toIndex >= currentImages.value.length) return;
  const newUrls = [...currentImages.value];
  [newUrls[fromIndex], newUrls[toIndex]] = [newUrls[toIndex], newUrls[fromIndex]];
  emit("update:modelValue", newUrls);
};
</script>

<template>
  <div class="space-y-3">
    <label class="block text-body text-admin font-semibold mb-2 ml-0.5">
      {{ label }}
      <span v-if="required" class="text-primary">*</span>
    </label>

    <!-- 업로드 버튼 -->
    <div class="flex items-center gap-3">
      <label
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/80 transition-colors text-body font-medium whitespace-nowrap shrink-0"
        :class="{ 'opacity-50 cursor-not-allowed': isUploading }"
      >
        <LoadingSpinner
          v-if="isUploading"
          variant="spinner"
          size="sm"
          color="white"
          :center="false"
          class="w-4 h-4"
        />
        <Upload v-else class="w-4 h-4" />
        {{ isUploading ? "업로드 중..." : "이미지" }}
        <input
          type="file"
          :accept="'image/jpeg,image/png,image/gif,image/webp'"
          :multiple="type !== 'single'"
          class="hidden"
          :disabled="isUploading"
          @change="handleFileSelect"
        />
      </label>

      <span class="text-caption text-admin-muted">
        {{
          type === "single"
            ? "JPG/PNG/GIF/WebP · 10MB"
            : `${maxFiles}개까지 · 각 10MB`
        }}
      </span>
    </div>

    <!-- 에러 메시지 -->
    <p v-if="errorMessage" class="text-caption text-destructive">
      {{ errorMessage }}
    </p>

    <!-- 이미지 미리보기: 단일 -->
    <div
      v-if="currentImages.length > 0 && type === 'single'"
      class="grid grid-cols-1 gap-3"
    >
      <div
        class="relative group rounded-lg overflow-hidden border border-border bg-muted/30 w-40 h-40"
      >
        <img
          :src="currentImages[0]"
          alt="대표 이미지"
          class="w-full h-full object-cover"
          crossorigin="anonymous"
        />
        <div
          class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <button
            type="button"
            @click="removeImage(0)"
            class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="제거"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 이미지 미리보기: 추가/상세 이미지 (그리드 + 순서 조정) -->
    <div
      v-else-if="currentImages.length > 0 && (type === 'multiple' || type === 'details')"
      class="flex max-w-full gap-2 overflow-x-auto pb-1"
    >
      <div
        v-for="(url, index) in currentImages"
        :key="index"
        class="relative h-32 w-32 shrink-0 overflow-hidden border border-border bg-muted/30"
      >
        <img
          :src="url"
          :alt="`이미지 ${index + 1}`"
          class="w-full h-full object-cover"
          crossorigin="anonymous"
        />
        <!-- 순서 번호 뱃지 -->
        <span
          class="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center bg-black/65 px-1.5 text-xs font-semibold text-white"
        >
          {{ index + 1 }}
        </span>

        <!-- 하단 고정 컨트롤: 사진이 작아져도 조작 버튼이 보이도록 유지 -->
        <div
          class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 border-t border-border/60 bg-background/95 px-1.5 py-1.5 backdrop-blur-sm"
        >
          <button
            type="button"
            :disabled="index === 0"
            @click="moveImage(index, index - 1)"
            class="inline-flex h-7 w-7 items-center justify-center border border-border bg-card text-admin transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
            title="앞으로 이동"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            @click="removeImage(index)"
            class="inline-flex h-7 w-7 items-center justify-center border border-destructive/30 bg-destructive text-white transition-colors hover:bg-destructive/90"
            title="제거"
          >
            <X class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :disabled="index === currentImages.length - 1"
            @click="moveImage(index, index + 1)"
            class="inline-flex h-7 w-7 items-center justify-center border border-border bg-card text-admin transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
            title="뒤로 이동"
          >
            <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 비어있을 때: 드래그 앤 드롭 영역 -->
    <div
      v-else
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
      :class="isDragging
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-border text-admin-muted hover:border-primary/40'"
      @dragover.prevent="isDragging = true"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- pointer-events-none: 자식 요소의 dragleave 오발생 방지 -->
      <div class="pointer-events-none">
        <template v-if="isUploading">
          <LoadingSpinner variant="spinner" size="sm" :center="false" class="w-8 h-8 mx-auto mb-2" />
          <p class="text-body">업로드 중...</p>
        </template>
        <template v-else>
          <Upload v-if="isDragging" class="w-8 h-8 mx-auto mb-2" />
          <ImageIcon v-else class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p class="text-body">
            {{ isDragging ? "여기에 놓으세요" : "이미지를 드래그하거나 업로드 버튼을 클릭하세요" }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
