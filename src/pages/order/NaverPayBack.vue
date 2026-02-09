<!-- src/pages/order/NaverPayBack.vue -->
<!-- 네이버페이 주문형 결제 중단/뒤로가기 시 리다이렉트 -->

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// 리다이렉트 대상 (기본: /cart, query param으로 변경 가능)
const redirectTo = (route.query.redirect as string) || "/cart";

onMounted(() => {
  router.replace(redirectTo);
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <p class="text-muted-foreground">잠시만 기다려주세요...</p>
  </div>
</template>
