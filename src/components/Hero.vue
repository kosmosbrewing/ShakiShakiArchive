<script setup lang="ts">
// src/components/Hero.vue
// 메인 히어로 섹션 컴포넌트

import { ProductHome } from "@/pages/product";
</script>

<template>
  <section class="w-11/12 mx-auto px-4 py-8 sm:py-12">
    <div class="grid grid-cols-1 lg:grid-cols-2 items-start gap-8 lg:gap-12">
      <!-- 로고 이미지 영역 -->
      <div class="flex flex-col items-center justify-start">
        <div class="w-full max-w-md lg:max-w-lg xl:max-w-xl sticky top-24">
          <img
            src="@/assets/logo04.png"
            alt="ShakiShaki Archive Logo"
            class="w-full h-auto object-contain rounded-2xl shadow-md"
          />
        </div>
      </div>

      <!-- 상품 목록 영역 -->
      <div class="w-full">
        <ProductHome />
      </div>
    </div>
  </section>
</template>
