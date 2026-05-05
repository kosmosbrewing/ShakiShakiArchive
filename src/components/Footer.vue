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
          <div
            class="md:col-span-1 flex flex-col items-center md:self-stretch md:justify-center lg:-translate-y-[20%]"
          >
            <a href="/" class="inline-block">
              <img
                src="@/assets/optimized/logo01-2.webp"
                alt="ShakiShaki Archive Logo"
                class="w-48 md:w-48 object-contain"
                draggable="false"
              />
            </a>
          </div>

          <!-- 회사 정보 영역 (data-nosnippet: 구글이 스니펫으로 사용하지 않도록 차단) -->
          <div class="md:col-span-3 pb-4" data-nosnippet>
            <div class="space-y-1">
              <p class="text-caption text-muted-foreground">
                샤키샤키 아카이브&ensp;|&ensp;대표 손유진
              </p>
              <p class="text-caption text-muted-foreground">
                경상남도 밀양시 부북면 덕곡2길 203-28
              </p>
              <p class="text-caption text-muted-foreground">
                사업자등록번호 157-18-02463
              </p>
              <p class="text-caption text-muted-foreground">
                통신판매업신고번호 2025-경남밀양-210호
              </p>
              <p class="text-caption text-muted-foreground">
                연락처 010-7347-4088&ensp;|&ensp;이메일 381611sug@naver.com
              </p>
            </div>

            <!-- 저작권 및 정책 링크 -->
            <div class="mt-2 border-t border-border/70">
              <nav
                class="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground pt-4"
                aria-label="고객지원 링크"
              >
                <router-link to="/faq#faq-shipping-fee" class="hover:text-primary transition-colors">
                  배송 안내
                </router-link>
                <router-link to="/faq#faq-return-refund" class="hover:text-primary transition-colors">
                  교환/반품/환불
                </router-link>
                <router-link to="/inquiry" class="hover:text-primary transition-colors">
                  문의하기
                </router-link>
              </nav>
              <p class="text-caption text-muted-foreground pt-4">
                Copyright @ 샤키샤키 아카이브&ensp;|&ensp;<router-link
                  to="/privacy"
                  class="hover:text-primary transition-colors"
                  >개인정보 처리방침</router-link
                >&ensp;|&ensp;<router-link
                  to="/terms"
                  class="hover:text-primary transition-colors"
                  >이용약관</router-link
                >
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </footer>
</template>
