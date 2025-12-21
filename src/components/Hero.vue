<script setup lang="ts">
// src/components/Hero.vue
// 메인 히어로 섹션 컴포넌트
import { computed } from "vue";
import { ProductHome } from "@/pages/product";
import { Marquee } from "@selemondev/vue3-marquee";
import "@selemondev/vue3-marquee/dist/style.css";

import marquee1 from "@/assets/marquee01.png";
import marquee2 from "@/assets/marquee02.png";
import marquee3 from "@/assets/marquee03.png";
import marquee4 from "@/assets/marquee04.png";

const repeatedMarqueeImages = computed(() => {
  // [...arr, ...arr, ...arr] Spread 문법을 사용하여 배열 병합
  return [...marqueeImages, ...marqueeImages, ...marqueeImages];
});
// 데이터 배열 정의
const marqueeImages = [marquee1, marquee2, marquee3, marquee4];
</script>

<template>
  <section class="w-11/12 max-w-screen-2xl mx-auto pt-8 sm:pt-16">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mx-auto">
      <!-- 로고 이미지 영역 -->
      <div class="flex justify-center lg:justify-end">
        <img
          src="@/assets/hero.jpeg"
          alt="ShakiShaki Archive Logo"
          class="object-contain rounded-2xl shadow-md"
          draggable="false"
        />
      </div>

      <!-- 상품 목록 영역 -->
      <div class="flex items-center justify-center lg:justify-start">
        <ProductHome />
      </div>
    </div>
  </section>

  <section id="sponsors" class="max-w-[75%] mx-auto pb-2">
    <div class="mx-auto mt-6 lg:mt-10">
      <Marquee
        class="gap-[3rem]"
        :pauseOnHover="true"
        :fade="true"
        innerClassName="gap-[3rem]"
      >
        <img
          v-for="(img, index) in repeatedMarqueeImages"
          :key="index"
          :src="img"
          alt="marquee Logo"
          class="min-w-[40px] object-contain"
          draggable="false"
        />
      </Marquee>
    </div>
  </section>
</template>
