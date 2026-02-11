<script setup lang="ts">
// src/components/admin/ImageUploader.vue
// 관리자용 이미지 업로드 컴포넌트

import { ref, computed, watch } from "vue";
import { Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-vue-next";
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
}

const props = withDefaults(defineProps<Props>(), {
  label: "이미지",
  required: false,
  maxFiles: 10,
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
    if (props.type === "single") {
      const result = await uploadProductImage(files[0]);
      emit("update:modelValue", result.image.url);
    } else if (props.type === "multiple") {
      const result = await uploadProductImages(files);
      const uploadedUrls = result.images.map((img: UploadedImage) => img.url);
      emit("update:modelValue", [...currentImages.value, ...uploadedUrls]);
    } else if (props.type === "details") {
      const result = await uploadProductDetailImages(files);
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

// 다중 이미지 캐러셀 인덱스
const carouselIndex = ref(0);

// 이미지 목록 변경 시 인덱스 보정
watch(currentImages, (imgs) => {
  if (carouselIndex.value >= imgs.length) {
    carouselIndex.value = Math.max(0, imgs.length - 1);
  }
});

const prevImage = () => {
  if (carouselIndex.value > 0) carouselIndex.value--;
};

const nextImage = () => {
  if (carouselIndex.value < currentImages.value.length - 1) carouselIndex.value++;
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
            ? "JPEG, PNG, GIF, WebP (최대 10MB)"
            : `최대 ${maxFiles}개, 각 10MB`
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

    <!-- 이미지 미리보기: 다중 (캐러셀) -->
    <div
      v-else-if="currentImages.length > 0 && type === 'multiple'"
      class="space-y-2"
    >
      <div
        class="relative group rounded-lg overflow-hidden border border-border bg-muted/30 w-40 h-40"
      >
        <img
          :src="currentImages[carouselIndex]"
          :alt="`이미지 ${carouselIndex + 1}`"
          class="w-full h-full object-cover"
          crossorigin="anonymous"
        />
        <!-- 삭제 버튼 -->
        <div
          class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <button
            type="button"
            @click="removeImage(carouselIndex)"
            class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="제거"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <!-- 좌우 네비게이션 (2장 이상일 때) -->
        <template v-if="currentImages.length > 1">
          <button
            v-if="carouselIndex > 0"
            type="button"
            @click="prevImage"
            class="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            v-if="carouselIndex < currentImages.length - 1"
            type="button"
            @click="nextImage"
            class="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </template>
      </div>
      <!-- 페이지 인디케이터 -->
      <p v-if="currentImages.length > 1" class="text-caption text-admin-muted">
        {{ carouselIndex + 1 }} / {{ currentImages.length }}
      </p>
    </div>

    <!-- 이미지 미리보기: 상세 이미지 (그리드 + 순서 조정) -->
    <div
      v-else-if="currentImages.length > 0 && type === 'details'"
      class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    >
      <div
        v-for="(url, index) in currentImages"
        :key="index"
        class="relative group rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square"
      >
        <img
          :src="url"
          :alt="`이미지 ${index + 1}`"
          class="w-full h-full object-cover"
          crossorigin="anonymous"
        />
        <!-- 순서 번호 뱃지 -->
        <span
          class="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center"
        >
          {{ index + 1 }}
        </span>
        <!-- hover 오버레이: 이동 + 삭제 버튼 -->
        <div
          class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
        >
          <!-- 좌측 이동 -->
          <button
            v-if="index > 0"
            type="button"
            @click="moveImage(index, index - 1)"
            class="p-2 bg-white/90 text-black rounded-full hover:bg-white transition-colors"
            title="왼쪽으로 이동"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <!-- 삭제 -->
          <button
            type="button"
            @click="removeImage(index)"
            class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="제거"
          >
            <X class="w-4 h-4" />
          </button>
          <!-- 우측 이동 -->
          <button
            v-if="index < currentImages.length - 1"
            type="button"
            @click="moveImage(index, index + 1)"
            class="p-2 bg-white/90 text-black rounded-full hover:bg-white transition-colors"
            title="오른쪽으로 이동"
          >
            <ArrowRight class="w-4 h-4" />
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
