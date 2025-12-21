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
  <section class="w-11/12 mx-auto px-4 py-8 sm:py-12">
    <div class="grid grid-cols-1 lg:grid-cols-2 items-start gap-8 lg:gap-12">
      <!-- 로고 이미지 영역 -->
      <div class="flex flex-col items-center justify-start">
        <div class="w-full max-w-md lg:max-w-lg xl:max-w-xl sticky top-24">
          <img
            src="@/assets/logo04.png"
            alt="ShakiShaki Archive Logo"
            class="w-full h-auto object-contain rounded-2xl shadow-md"
            draggable="false"
          />
        </div>
      </div>

      <!-- 상품 목록 영역 -->
      <div class="w-full">
        <ProductHome />
      </div>
    </div>
  </section>

  <section id="sponsors" class="max-w-[75%] mx-auto pb-24 sm:pb-32">
    <div class="mx-auto mt-16">
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
          class="min-w-[60px] object-contain"
          draggable="false"
        />
      </Marquee>
    </div>
  </section>
</template>
