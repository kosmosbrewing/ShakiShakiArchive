<script setup lang="ts">
// src/components/common/ProductDetailSkeleton.vue
// 상품 상세 페이지 스켈레톤 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
    <!-- 좌측: 이미지 갤러리 스켈레톤 -->
    <div class="lg:col-span-3 space-y-4">
      <!-- 메인 이미지 -->
      <Card class="overflow-hidden">
        <Skeleton class="aspect-[3/4] w-full rounded-none" />
      </Card>

      <!-- 썸네일 갤러리 -->
      <div class="flex gap-2">
        <Skeleton
          v-for="idx in 4"
          :key="`thumb-skeleton-${idx}`"
          class="w-20 h-20 flex-shrink-0 rounded"
        />
      </div>
    </div>

    <!-- 우측: 상품 정보 스켈레톤 -->
    <div class="lg:col-span-2">
      <Card class="sticky top-24">
        <CardContent class="p-6 space-y-6">
          <!-- 상품명 -->
          <div class="space-y-2">
            <Skeleton class="h-7 w-3/4" />
            <Skeleton class="h-5 w-1/3" />
          </div>

          <Separator />

          <!-- 사이즈 선택 -->
          <div class="space-y-3">
            <Skeleton class="h-5 w-16" />
            <div class="flex gap-2">
              <Skeleton
                v-for="idx in 4"
                :key="`size-skeleton-${idx}`"
                class="h-10 w-12 rounded-md"
              />
            </div>
          </div>

          <!-- 장바구니 버튼 -->
          <Skeleton class="h-12 w-full rounded-md" />

          <Separator />

          <!-- 탭 영역 -->
          <div class="space-y-4">
            <div class="flex gap-4 border-b border-border pb-3">
              <Skeleton class="h-5 w-24" />
              <Skeleton class="h-5 w-16" />
            </div>
            <div class="space-y-2 py-4">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-5/6" />
              <Skeleton class="h-4 w-4/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
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
