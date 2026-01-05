<script setup lang="ts">
// src/components/common/ProductDetailSkeleton.vue
// 상품 상세 페이지 스켈레톤 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
    <!-- 좌측: 이미지 갤러리 스켈레톤 -->
    <div class="lg:col-span-1 space-y-4">
      <!-- 메인 이미지 -->
      <Card class="overflow-hidden">
        <Skeleton class="aspect-[3/4] w-full rounded-none" />
      </Card>

      <!-- 썸네일 갤러리 -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        <Skeleton
          v-for="idx in 4"
          :key="`thumb-skeleton-${idx}`"
          class="w-20 h-20 flex-shrink-0 rounded"
        />
      </div>

      <!-- 상세 이미지 (2개 정도) -->
      <div class="space-y-6 mt-6">
        <Skeleton
          v-for="idx in 2"
          :key="`detail-img-skeleton-${idx}`"
          class="w-full aspect-[3/4] rounded-lg"
        />
      </div>
    </div>

    <!-- 우측: 상품 정보 스켈레톤 -->
    <div class="lg:col-span-1">
      <Card class="sticky top-24">
        <CardContent class="p-6">
          <!-- 상품명 + 가격 + 위시리스트 버튼 영역 -->
          <div class="flex justify-between items-end gap-3 mb-3">
            <div class="flex-1">
              <!-- 상품명 -->
              <Skeleton class="h-6 w-3/4 mb-2" />
              <!-- 가격 -->
              <div class="flex items-baseline gap-2 pt-1.5">
                <Skeleton class="h-5 w-24" />
                <Skeleton class="h-4 w-16" />
              </div>
            </div>
            <!-- 위시리스트 버튼 -->
            <Skeleton class="hidden lg:block w-10 h-10 rounded-full shrink-0" />
          </div>

          <Separator class="mb-4" />

          <!-- 사이즈 선택 -->
          <div class="mb-6">
            <Skeleton class="h-5 w-14 mb-2" />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                v-for="idx in 4"
                :key="`size-skeleton-${idx}`"
                class="h-10 w-12 rounded-md"
              />
            </div>
          </div>

          <!-- 버튼 영역 (바로 구매만 표시 - 옵션 선택 전 상태) -->
          <div class="mb-6 flex flex-col gap-3">
            <Skeleton class="h-11 w-full rounded-md" />
          </div>

          <Separator />

          <!-- 탭 영역 -->
          <div class="mt-6">
            <!-- 탭 헤더 -->
            <div class="flex border-b border-border">
              <Skeleton class="flex-1 h-5 mx-2 my-3" />
              <Skeleton class="flex-1 h-5 mx-2 my-3" />
            </div>

            <!-- 탭 컨텐츠 -->
            <div class="py-6 min-h-[180px]">
              <div class="space-y-3">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-11/12" />
                <Skeleton class="h-4 w-4/5" />
                <Skeleton class="h-4 w-3/4" />
              </div>
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
