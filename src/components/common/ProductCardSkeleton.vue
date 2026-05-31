<script setup lang="ts">
// src/components/common/ProductCardSkeleton.vue
// 상품 카드 스켈레톤 컴포넌트

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
    class="skeleton-card rounded-none bg-transparent flex flex-col h-full border-0 !shadow-none relative mt-3"
  >
    <CardHeader class="p-0 gap-0">
      <!-- 이미지 영역 스켈레톤 -->
      <div class="aspect-square overflow-hidden rounded-none bg-muted/10 ring-1 ring-primary/10">
        <Skeleton class="w-full h-full rounded-none" />
      </div>

      <!-- 상품명 영역 스켈레톤 -->
      <CardContent class="px-1 pt-3 pb-0">
        <Skeleton class="h-4 w-4/5 mx-auto" />
      </CardContent>

      <!-- 가격 영역 스켈레톤 -->
      <CardContent class="px-1 pt-1 pb-0">
        <Skeleton class="h-3 w-1/3 mx-auto" />
      </CardContent>
    </CardHeader>
  </Card>
</template>

<style scoped>
.skeleton-card {
  /* 스켈레톤은 즉시 표시 (로딩 피드백을 위해 애니메이션 없음) */
  opacity: 1;
}
</style>
