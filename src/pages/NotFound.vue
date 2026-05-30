<script setup lang="ts">
import { EmptyState } from "@/components/common";
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16">
    <EmptyState
      header="페이지를 찾을 수 없습니다"
      message="호출한 주소를 확인해주세요"
      button-text="홈으로 돌아가기"
      button-link="/"
    />
  </div>
</template>
