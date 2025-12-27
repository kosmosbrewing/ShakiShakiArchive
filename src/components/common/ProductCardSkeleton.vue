<script setup lang="ts">
// src/components/common/ProductCardSkeleton.vue
// 상품 카드 스켈레톤 컴포넌트

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface Props {
  // 표시할 스켈레톤 카드 수
  count?: number;
}

// Vue 3.5+ 권장 방식: 구조분해 기본값 사용
const { count = 4 } = defineProps<Props>();
</script>

<template>
  <Card
    v-for="idx in count"
    :key="`skeleton-${idx}`"
    class="skeleton-card bg-muted/5 flex flex-col h-full overflow-hidden border-0 shadow-sm"
    :style="{ animationDelay: `${(idx - 1) * 0.05}s` }"
  >
    <CardHeader class="p-0 gap-0">
      <!-- 이미지 영역 스켈레톤 -->
      <Skeleton class="w-full aspect-square rounded-none" />

      <Separator />

      <!-- 상품명 영역 스켈레톤 -->
      <CardContent class="py-3 px-4">
        <Skeleton class="h-4 w-4/5" />
      </CardContent>

      <!-- 가격 영역 스켈레톤 -->
      <CardContent class="pb-2 px-4 -translate-y-3">
        <Skeleton class="h-3 w-1/3" />
      </CardContent>
    </CardHeader>
  </Card>
</template>

<style scoped>
.skeleton-card {
  animation: slideUp 0.3s ease-out both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
