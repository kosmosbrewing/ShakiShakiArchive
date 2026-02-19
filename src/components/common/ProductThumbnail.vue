<script setup lang="ts">
// src/components/common/ProductThumbnail.vue
// 상품 이미지 썸네일 컴포넌트

import { useRouter } from "vue-router";
import { useOptimizedImage } from "@/composables";

interface Props {
  imageUrl?: string;
  productId?: number | string;
  productSlug?: string; // SEO URL용 슬러그 (있으면 우선 사용)
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: "",
  productId: "",
  productSlug: "",
  size: "md",
  clickable: true,
});

const router = useRouter();
const { thumbnail } = useOptimizedImage();

// 클릭 시 상품 상세 페이지로 이동 (slug 우선, fallback: id)
const handleClick = () => {
  const target = props.productSlug || props.productId;
  if (props.clickable && target) {
    router.push(`/productDetail/${target}`);
  }
};

// 사이즈별 클래스
const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};
</script>

<template>
  <div
    :class="[
      'rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm transition-all',
      sizeClasses[props.size],
      clickable && productId ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '',
    ]"
    @click="handleClick"
  >
    <img
      v-if="imageUrl"
      :src="thumbnail(imageUrl)"
      class="w-full h-full object-cover"
      alt="Product Image"
      loading="lazy"
      decoding="async"
      crossorigin="anonymous"
      draggable="false"
    />
    <div
      v-else
      class="w-full h-full flex items-center justify-center text-muted-foreground text-caption border border-border bg-background"
    >
      No Img
    </div>
  </div>
</template>
