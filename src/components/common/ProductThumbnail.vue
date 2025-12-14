<script setup lang="ts">
// src/components/common/ProductThumbnail.vue
// 상품 이미지 썸네일 컴포넌트

import { useRouter } from "vue-router";

interface Props {
  imageUrl?: string;
  productId?: number | string;
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: "",
  productId: "",
  size: "md",
  clickable: true,
});

const router = useRouter();

// 클릭 시 상품 상세 페이지로 이동
const handleClick = () => {
  if (props.clickable && props.productId) {
    router.push(`/productDetail/${props.productId}`);
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
      'bg-muted rounded-md border border-border overflow-hidden flex-shrink-0',
      sizeClasses[props.size],
      clickable && productId ? 'cursor-pointer' : '',
    ]"
    @click="handleClick"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl"
      class="w-full h-full object-cover"
      alt="Product Image"
    />
    <div
      v-else
      class="w-full h-full flex items-center justify-center text-muted-foreground text-xs"
    >
      No Img
    </div>
  </div>
</template>
