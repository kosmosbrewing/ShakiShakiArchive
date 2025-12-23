<script setup lang="ts">
// src/components/Hero.vue
// 메인 히어로 섹션 컴포넌트
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ProductHome } from "@/pages/product";
import { Marquee } from "@selemondev/vue3-marquee";
import "@selemondev/vue3-marquee/dist/style.css";
import { fetchHeroImages, fetchMarqueeImages } from "@/lib/api";
import type { SiteImage } from "@/types/api";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

// 폴백 이미지 (API 실패 시 사용)
import fallbackHero from "@/assets/hero.jpeg";
import fallbackMarquee1 from "@/assets/marquee01.png";
import fallbackMarquee2 from "@/assets/marquee02.png";
import fallbackMarquee3 from "@/assets/marquee03.png";
import fallbackMarquee4 from "@/assets/marquee04.png";

// 상태
const heroImages = ref<SiteImage[]>([]);
const marqueeImages = ref<SiteImage[]>([]);
const isLoading = ref(true);
const currentHeroIndex = ref(0);
let heroSlideInterval: ReturnType<typeof setInterval> | null = null;

// Hero 이미지 목록 (폴백 포함)
const heroImageList = computed(() => {
  if (heroImages.value.length > 0) {
    return heroImages.value.map((img) => ({
      url: img.imageUrl,
      linkUrl: img.linkUrl,
    }));
  }
  // 폴백 이미지
  return [{ url: fallbackHero, linkUrl: undefined }];
});

// 현재 표시할 히어로 이미지
const currentHeroImage = computed(() => {
  return heroImageList.value[currentHeroIndex.value] || heroImageList.value[0];
});

// Marquee 이미지 URL 배열 (폴백 포함)
const marqueeImageUrls = computed(() => {
  if (marqueeImages.value.length > 0) {
    return marqueeImages.value.map((img) => ({
      url: img.imageUrl,
      linkUrl: img.linkUrl,
    }));
  }
  // 폴백 이미지
  return [
    { url: fallbackMarquee1, linkUrl: undefined },
    { url: fallbackMarquee2, linkUrl: undefined },
    { url: fallbackMarquee3, linkUrl: undefined },
    { url: fallbackMarquee4, linkUrl: undefined },
  ];
});

// Marquee 효과를 위해 이미지 3배로 반복
const repeatedMarqueeImages = computed(() => {
  const images = marqueeImageUrls.value;
  return [...images, ...images, ...images];
});

// 이미지 클릭 핸들러
const handleImageClick = (linkUrl?: string) => {
  if (linkUrl) {
    window.open(linkUrl, "_blank");
  }
};

// Hero 슬라이드 이동
const goToSlide = (index: number) => {
  currentHeroIndex.value = index;
  resetSlideInterval();
};

// 이전 슬라이드
const prevSlide = () => {
  const newIndex =
    currentHeroIndex.value === 0
      ? heroImageList.value.length - 1
      : currentHeroIndex.value - 1;
  goToSlide(newIndex);
};

// 다음 슬라이드
const nextSlide = () => {
  const newIndex = (currentHeroIndex.value + 1) % heroImageList.value.length;
  goToSlide(newIndex);
};

// 자동 슬라이드 시작
const startSlideInterval = () => {
  if (heroImageList.value.length > 1) {
    heroSlideInterval = setInterval(() => {
      currentHeroIndex.value =
        (currentHeroIndex.value + 1) % heroImageList.value.length;
    }, 5000); // 5초마다 전환
  }
};

// 자동 슬라이드 리셋
const resetSlideInterval = () => {
  if (heroSlideInterval) {
    clearInterval(heroSlideInterval);
  }
  startSlideInterval();
};

// 데이터 로드
onMounted(async () => {
  try {
    const [heroData, marqueeData] = await Promise.all([
      fetchHeroImages(),
      fetchMarqueeImages(),
    ]);
    heroImages.value = heroData;
    marqueeImages.value = marqueeData;
    // Hero 슬라이드 자동 전환 시작
    startSlideInterval();
  } catch (error) {
    console.error("사이트 이미지 로드 실패:", error);
    // 에러 시 폴백 이미지 사용 (기본값)
  } finally {
    isLoading.value = false;
  }
});

// 컴포넌트 언마운트 시 인터벌 정리
onUnmounted(() => {
  if (heroSlideInterval) {
    clearInterval(heroSlideInterval);
  }
});
</script>

<template>
  <section class="w-11/12 max-w-screen-2xl mx-auto pt-8 sm:pt-16">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mx-auto">
      <!-- Hero 이미지 슬라이더 영역 -->
      <div class="flex flex-col justify-center lg:justify-end items-center lg:items-end">
        <div class="relative group">
          <!-- 슬라이더 이미지 -->
          <div class="overflow-hidden rounded-2xl shadow-md">
            <img
              :src="currentHeroImage.url"
              alt="ShakiShaki Archive"
              class="object-contain transition-opacity duration-500"
              :class="{ 'cursor-pointer': currentHeroImage.linkUrl }"
              draggable="false"
              @click="handleImageClick(currentHeroImage.linkUrl)"
            />
          </div>

          <!-- 좌우 화살표 (이미지가 2개 이상일 때만 표시) -->
          <template v-if="heroImageList.length > 1">
            <button
              @click="prevSlide"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="이전 슬라이드"
            >
              <ChevronLeft class="w-6 h-6 text-gray-700" />
            </button>
            <button
              @click="nextSlide"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-label="다음 슬라이드"
            >
              <ChevronRight class="w-6 h-6 text-gray-700" />
            </button>
          </template>

          <!-- 슬라이드 인디케이터 (이미지가 2개 이상일 때만 표시) -->
          <div
            v-if="heroImageList.length > 1"
            class="flex justify-center gap-2 mt-4"
          >
            <button
              v-for="(_, index) in heroImageList"
              :key="index"
              @click="goToSlide(index)"
              class="w-2.5 h-2.5 rounded-full transition-all duration-300"
              :class="
                currentHeroIndex === index
                  ? 'bg-primary w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              "
              :aria-label="`슬라이드 ${index + 1}로 이동`"
            />
          </div>
        </div>
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
          :src="img.url"
          alt="marquee Logo"
          class="min-w-[40px] object-contain"
          :class="{ 'cursor-pointer': img.linkUrl }"
          draggable="false"
          @click="handleImageClick(img.linkUrl)"
        />
      </Marquee>
    </div>
  </section>
</template>
