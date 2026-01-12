<template>
  <Hero />
  <Product />
</template>

<script setup lang="ts">
import Hero from "@/components/Hero.vue";
import { Product } from "@/pages/product";

// NOTE: 홈페이지 SEO 메타 태그는 main.ts의 bootstrap에서 이미 설정되었습니다.
// 각 페이지별로 SEO를 변경하려면 onMounted에서 해당 페이지의 SEO API를 호출하세요.
</script>
