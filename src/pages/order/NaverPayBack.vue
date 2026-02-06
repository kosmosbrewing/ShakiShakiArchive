<!-- src/pages/order/NaverPayBack.vue -->
<!-- 네이버페이 주문형 결제 중단 시 브릿지 페이지 -->
<!-- PC 팝업: opener(부모 창)를 /cart로 이동시키고 팝업 닫기 -->
<!-- 모바일: 직접 /cart로 리다이렉트 -->

<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// 리다이렉트 대상 (기본: /cart, query param으로 변경 가능)
const redirectTo = (route.query.redirect as string) || "/cart";

onMounted(() => {
  // PC: 팝업에서 열린 경우 → opener 제어 후 팝업 닫기
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.location.href = redirectTo;
    } catch {
      // cross-origin 등 예외 시 opener 접근 불가 → 무시
    }
    window.close();
    return;
  }

  // 모바일 또는 opener 없는 경우: 직접 이동
  window.location.replace(redirectTo);
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <p class="text-muted-foreground">잠시만 기다려주세요...</p>
  </div>
</template>
