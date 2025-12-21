<script setup lang="ts">
// src/components/Footer.vue
// 푸터 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
</script>

<template>
  <footer class="w-11/12 max-w-screen-2xl mx-auto py-2 pb-8">
    <Card>
      <CardContent class="p-6 sm:p-10">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          <!-- 로고 영역 -->
          <div class="md:col-span-1 flex flex-col items-left md:items-center">
            <a href="/" class="inline-block">
              <img
                src="@/assets/logo02.png"
                alt="ShakiShaki Archive Logo"
                class="w-32 md:w-40 object-contain"
                draggable="false"
              />
            </a>
          </div>

          <!-- 회사 정보 영역 -->
          <div class="md:col-span-3 space-y-4">
            <div class="space-y-1">
              <p class="text-body text-foreground font-medium">
                샤키샤키 아카이브(ShakiShaki Archive) | CEO : 손유진
              </p>
              <p class="text-caption text-muted-foreground">
                Business License : 680-79-00404 | Mail order license: 신고중
              </p>
            </div>

            <div class="space-y-1">
              <p class="text-caption text-muted-foreground">
                부산광역시 부산진구 전포대로 84-1 104동 201호
              </p>
              <p class="text-caption text-muted-foreground">
                Tel: 010-2357-3345
              </p>
            </div>

            <p class="text-caption text-muted-foreground pt-2">
              &copy; {{ new Date().getFullYear() }} ShakiShaki Archive. All
              rights reserved.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </footer>
</template>
