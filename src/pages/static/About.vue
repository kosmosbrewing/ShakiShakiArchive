<script setup lang="ts">
// src/pages/static/About.vue
// 브랜드 소개 페이지

import { onMounted } from "vue";

onMounted(() => {
  window.scrollTo({ top: 0, behavior: "instant" });
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16">
    <section class="space-y-8">
      <div>
        <h1 class="text-3xl font-extrabold mb-5 text-primary tracking-wider">
          about shaki shaki archive
        </h1>
        <p class="text-xl sm:text-2xl font-bold leading-[1.5] text-foreground">
          숲과 무대 사이,<br />
          일본 빈티지 소녀 아카이브
        </p>
      </div>

      <div class="space-y-6 text-body leading-[1.55] text-muted-foreground">
        <p>
          shaki shaki archive는<br />
          일본 빈티지의 색감과 패턴,<br />
          소녀적인 레이어링, 작은 반항심을<br />
          세트룩으로 엮어내는 빈티지 아카이브 브랜드입니다.
        </p>

        <p>
          우리는 한 벌의 옷보다,<br />
          함께 있을 때 하나의 장면이 되는 옷들을 고릅니다.
        </p>

        <p>
          낡았지만 유치하지 않고,<br />
          소녀스럽지만 순하지 않은 옷.
        </p>

        <p>
          따로 존재하던 조각들이<br />
          하나의 세트와 리듬이 되어 이어질 때,<br />
          샤키샤키 아카이브만의 장면이 만들어진다고 믿습니다.
        </p>

        <p>
          지금은 한 점짜리 빈티지 세트를 소개하고,<br />
          앞으로는 샤키샤키만의 의류와 잡화로<br />
          천천히 세계를 넓혀가려 합니다.
        </p>
      </div>
    </section>

    <section class="mt-16 border-t border-border pt-12 space-y-6">
      <h2 class="text-2xl font-extrabold text-primary tracking-wider">
        ♪ rhythm of archive
      </h2>

      <div class="space-y-6 text-body leading-[1.55] text-muted-foreground">
        <p>
          도트는 작은 조각을,<br />
          음표는 이어지는 리듬을 뜻합니다.
        </p>

        <p>
          작은 디테일이 모여 하나의 패턴이 되고,<br />
          흩어진 조각들이 이어져 하나의 멜로디가 되듯,
        </p>

        <p>
          shaki shaki archive는<br />
          따로 있던 빈티지 조각들을<br />
          하나의 세트와 장면으로 기록합니다.
        </p>
      </div>
    </section>
  </div>
</template>
