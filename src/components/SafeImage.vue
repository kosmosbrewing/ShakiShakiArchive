<script setup lang="ts">
import { ref, watch } from "vue";
import { ImageOff } from "lucide-vue-next"; // 깨짐 아이콘

interface Props {
  src: string;
  alt?: string;
  fallbackSrc?: string; // 실패 시 보여줄 이미지 경로
  class?: string; // 외부에서 주입할 클래스
}

const props = withDefaults(defineProps<Props>(), {
  alt: "Image",
  fallbackSrc: "/placeholder.png", // public 폴더에 기본 이미지 넣어두기
  class: "",
});

const isError = ref(false);
const isLoading = ref(true);

// src가 바뀌면 상태 초기화 (동적 데이터 대응)
watch(
  () => props.src,
  () => {
    isError.value = false;
    isLoading.value = true;
  }
);

const handleError = () => {
  isError.value = true;
  isLoading.value = false;
};

const handleLoad = () => {
  isLoading.value = false;
};
</script>

<template>
  <div :class="['relative overflow-hidden bg-muted/20', props.class]">
    <img
      v-if="!isError"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover transition-opacity duration-300"
      :class="{ 'opacity-0': isLoading, 'opacity-100': !isLoading }"
      @error="handleError"
      @load="handleLoad"
      loading="lazy"
    />

    <div
      v-if="isLoading"
      class="absolute inset-0 bg-gray-200 animate-pulse"
    ></div>

    <div
      v-if="isError"
      class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400"
    >
      <ImageOff class="w-8 h-8 mb-1" />
      <span class="text-caption">No Image</span>
    </div>
  </div>
</template>
