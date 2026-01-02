<script setup lang="ts">
// src/components/Hero.vue
// 메인 히어로 섹션 컴포넌트
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { ProductHome } from "@/pages/product";
import { Marquee } from "@selemondev/vue3-marquee";
import "@selemondev/vue3-marquee/dist/style.css";
import { useSiteImageStore } from "@/stores/siteImage";
import { storeToRefs } from "pinia";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useOptimizedImage } from "@/composables";
import { Skeleton } from "@/components/ui/skeleton";

// 폴백 이미지 (API 실패 시 사용)
import fallbackHero from "@/assets/hero.jpeg";
import fallbackMarquee1 from "@/assets/marquee01.png";
import fallbackMarquee2 from "@/assets/marquee02.png";
import fallbackMarquee3 from "@/assets/marquee03.png";
import fallbackMarquee4 from "@/assets/marquee04.png";

// 스토어
const siteImageStore = useSiteImageStore();
const { heroImages, marqueeImages, isLoading } = storeToRefs(siteImageStore);

// 이미지 최적화
const { getHeroAttrs, marquee: optimizeMarquee } = useOptimizedImage();

// 슬라이드 상태
const currentHeroIndex = ref(0);
const prevHeroIndex = ref(0); // 이전 인덱스 추적
const slideDirection = ref<"next" | "prev">("next"); // 슬라이드 방향

// 자동 재생 설정
const AUTO_PLAY_INTERVAL = 20000; // 20초
let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

// 자동 재생 시작
const startAutoPlay = () => {
  stopAutoPlay();
  autoPlayTimer = setInterval(() => {
    if (heroImageList.value.length > 1) {
      const newIndex =
        (currentHeroIndex.value + 1) % heroImageList.value.length;
      goToSlide(newIndex, "next");
    }
  }, AUTO_PLAY_INTERVAL);
};

// 자동 재생 중지
const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
};

// 자동 재생 리셋 (수동 조작 시 타이머 재시작)
const resetAutoPlay = () => {
  startAutoPlay();
};

// 터치 스와이프 상태
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // 스와이프 인식 최소 거리 (px)

// 터치 시작
const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX;
  stopAutoPlay();
};

// 터치 이동
const handleTouchMove = (e: TouchEvent) => {
  touchEndX = e.touches[0].clientX;
};

// 터치 종료
const handleTouchEnd = () => {
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > SWIPE_THRESHOLD) {
    if (diff > 0) {
      // 왼쪽으로 스와이프 → 다음 슬라이드
      nextSlide();
    } else {
      // 오른쪽으로 스와이프 → 이전 슬라이드
      prevSlide();
    }
  } else {
    // 스와이프가 아닌 경우 자동 재생 재개
    startAutoPlay();
  }

  // 초기화
  touchStartX = 0;
  touchEndX = 0;
};

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
  return [...images, ...images, ...images, ...images, ...images];
});

// 이미지 클릭 핸들러
const handleImageClick = (linkUrl?: string) => {
  if (linkUrl) {
    window.open(linkUrl, "_blank");
  }
};

// Hero 슬라이드 이동
const goToSlide = (index: number, direction?: "next" | "prev") => {
  // 방향이 지정되지 않으면 인덱스 비교로 결정
  if (direction) {
    slideDirection.value = direction;
  } else {
    slideDirection.value = index > currentHeroIndex.value ? "next" : "prev";
  }
  prevHeroIndex.value = currentHeroIndex.value;
  currentHeroIndex.value = index;
};

// 이전 슬라이드 (수동 조작 시 타이머 리셋)
const prevSlide = () => {
  const newIndex =
    currentHeroIndex.value === 0
      ? heroImageList.value.length - 1
      : currentHeroIndex.value - 1;
  goToSlide(newIndex, "prev");
  resetAutoPlay();
};

// 다음 슬라이드 (수동 조작 시 타이머 리셋)
const nextSlide = () => {
  const newIndex = (currentHeroIndex.value + 1) % heroImageList.value.length;
  goToSlide(newIndex, "next");
  resetAutoPlay();
};

// 인디케이터 클릭 (수동 조작 시 타이머 리셋)
const goToSlideManual = (index: number) => {
  goToSlide(index);
  resetAutoPlay();
};

// 각 이미지의 슬라이드 클래스 계산 (세련된 fade + scale 효과)
const getSlideClass = (index: number) => {
  if (index === currentHeroIndex.value) {
    // 현재 이미지: 페이드인 + 스케일업
    return "opacity-100 scale-100 z-10";
  } else if (index === prevHeroIndex.value) {
    // 이전 이미지: 페이드아웃 + 약간 축소
    return "opacity-0 scale-95 z-0";
  } else {
    // 나머지 이미지: 숨김 상태
    return "opacity-0 scale-105 z-0";
  }
};

// 데이터 로드 (스토어의 캐싱 활용)
onMounted(async () => {
  try {
    await siteImageStore.loadSiteImages();
  } catch (error) {
    console.error("사이트 이미지 로드 실패:", error);
    // 에러 시 폴백 이미지 사용 (기본값)
  }
});

// 이미지가 2개 이상일 때 자동 재생 시작
watch(
  () => heroImageList.value.length,
  (length) => {
    if (length > 1) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
  },
  { immediate: true }
);

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  stopAutoPlay();
});
</script>

<template>
  <section class="w-11/12 max-w-screen-2xl mx-auto pt-8 sm:pt-16">
    <div class="grid grid-cols-1 lg:grid-cols-2 mx-auto">
      <!-- Hero 이미지 슬라이더 영역 -->
      <div class="flex flex-col justify-center lg:justify-start lg:pr-8">
        <!-- 스켈레톤 UI: 로딩 중일 때 표시 -->
        <div v-if="isLoading" class="relative group w-full">
          <Skeleton class="w-full aspect-square rounded-2xl" />
          <!-- 인디케이터 스켈레톤 -->
          <div class="flex justify-center gap-2 mt-4">
            <Skeleton class="w-2.5 h-2.5 rounded-full" />
            <Skeleton class="w-6 h-2.5 rounded-full" />
            <Skeleton class="w-2.5 h-2.5 rounded-full" />
          </div>
        </div>

        <!-- 실제 콘텐츠: 로딩 완료 후 표시 -->
        <div
          v-else
          class="relative group w-full"
          @mouseenter="stopAutoPlay"
          @mouseleave="startAutoPlay"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- 슬라이더 이미지 -->
          <div class="overflow-hidden rounded-2xl shadow-lg relative">
            <!-- 모든 이미지를 쌓아두고 부드러운 전환 효과 -->
            <img
              v-for="(image, index) in heroImageList"
              :key="index"
              v-bind="getHeroAttrs(image.url, index === 0)"
              alt="ShakiShaki Archive"
              class="object-contain w-full transition-all duration-700 ease-out"
              :class="[
                index === 0 ? 'relative' : 'absolute inset-0',
                getSlideClass(index),
                { 'cursor-pointer': image.linkUrl },
              ]"
              draggable="false"
              @click="handleImageClick(image.linkUrl)"
            />

            <!-- 좌우 화살표 (이미지 위에 오버레이, 호버 시 나타남) -->
            <template v-if="heroImageList.length > 1">
              <button
                @click="prevSlide"
                class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:scale-110 flex items-center justify-center transition-all duration-300 ease-out z-20"
                aria-label="이전 슬라이드"
              >
                <ChevronLeft class="w-6 h-6 text-white drop-shadow-md" />
              </button>
              <button
                @click="nextSlide"
                class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:scale-110 flex items-center justify-center transition-all duration-300 ease-out z-20"
                aria-label="다음 슬라이드"
              >
                <ChevronRight class="w-6 h-6 text-white drop-shadow-md" />
              </button>
            </template>
          </div>

          <!-- 슬라이드 인디케이터 (세련된 pill 스타일) -->
          <div
            v-if="heroImageList.length > 1"
            class="flex justify-center items-center gap-2 mt-5"
          >
            <button
              v-for="(_, index) in heroImageList"
              :key="index"
              @click="goToSlideManual(index)"
              class="h-2 rounded-full transition-all duration-500 ease-out"
              :class="
                currentHeroIndex === index
                  ? 'bg-primary w-8 shadow-sm shadow-primary/30'
                  : 'bg-gray-300/80 w-2 hover:bg-gray-400 hover:w-3'
              "
              :aria-label="`슬라이드 ${index + 1}로 이동`"
            />
          </div>
        </div>
      </div>

      <!-- 상품 목록 영역 -->
      <div class="flex items-start justify-center lg:justify-start">
        <ProductHome />
      </div>
    </div>
  </section>

  <section id="marquee" class="max-w-[75%] mx-auto pb-8 pt-8">
    <div class="mx-auto mt-6 lg:mt-10">
      <!-- 스켈레톤 UI: 로딩 중일 때 표시 -->
      <div v-if="isLoading" class="flex items-center justify-center gap-12">
        <Skeleton
          v-for="i in 6"
          :key="i"
          class="w-[60px] h-[60px] rounded-md flex-shrink-0"
        />
      </div>

      <!-- 실제 콘텐츠: 로딩 완료 후 표시 -->
      <Marquee
        v-else
        class="gap-[2rem]"
        :pauseOnHover="true"
        :fade="true"
        innerClassName="gap-[2rem]"
      >
        <img
          v-for="(img, index) in repeatedMarqueeImages"
          :key="index"
          :src="optimizeMarquee(img.url)"
          alt="marquee Logo"
          class="min-w-[80px] object-contain"
          :class="{ 'cursor-pointer': img.linkUrl }"
          loading="lazy"
          decoding="async"
          draggable="false"
          @click="handleImageClick(img.linkUrl)"
        />
      </Marquee>
    </div>
  </section>
</template>
