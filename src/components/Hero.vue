<script setup lang="ts">
// src/components/Hero.vue
// 메인 히어로 섹션 컴포넌트
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useSiteImageStore } from "@/stores/siteImage";
import { storeToRefs } from "pinia";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useOptimizedImage } from "@/composables";
import { Skeleton } from "@/components/ui/skeleton";

// LCP 최적화: 폴백 이미지 제거 (46KB 절약, 텍스트 기준 LCP로 전환)

// 스토어
const siteImageStore = useSiteImageStore();
const {
  mainDesktopImages,
  mainMobileImages,
  heroImages,
  isLoading,
} = storeToRefs(siteImageStore);

// 이미지 최적화
const { getHeroAttrs } = useOptimizedImage();

const MAIN_HERO_PRELOAD_ATTR = "data-main-hero-preload";

const removeMainHeroPreload = () => {
  if (typeof document === "undefined") return;

  document
    .querySelector<HTMLLinkElement>(`link[${MAIN_HERO_PRELOAD_ATTR}="true"]`)
    ?.remove();
};

const applyMainHeroPreload = (
  url: string | undefined,
  profile: "mobile" | "desktop",
) => {
  if (typeof document === "undefined") return;

  if (!url) {
    removeMainHeroPreload();
    return;
  }

  const attrs = getHeroAttrs(url, true, profile);
  let link = document.querySelector<HTMLLinkElement>(
    `link[${MAIN_HERO_PRELOAD_ATTR}="true"]`,
  );

  if (!link) {
    link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.setAttribute(MAIN_HERO_PRELOAD_ATTR, "true");
    document.head.appendChild(link);
  }

  link.href = attrs.src;
  link.setAttribute("fetchpriority", "high");
  link.setAttribute("crossorigin", "anonymous");

  if ("srcset" in attrs && attrs.srcset) {
    link.setAttribute("imagesrcset", attrs.srcset);
  } else {
    link.removeAttribute("imagesrcset");
  }

  if ("sizes" in attrs && attrs.sizes) {
    link.setAttribute("imagesizes", attrs.sizes);
  } else {
    link.removeAttribute("imagesizes");
  }
};

// 슬라이드 상태
const currentHeroIndex = ref(0);
const prevHeroIndex = ref(0); // 이전 인덱스 추적
const slideDirection = ref<"next" | "prev">("next"); // 슬라이드 방향
const isMobileViewport = ref(
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 767px)").matches
    : false,
);
let viewportMediaQuery: MediaQueryList | null = null;
let viewportChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;

const currentHeroProfile = computed(() =>
  isMobileViewport.value ? "mobile" : "desktop",
);

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

const mapSiteImages = (images: typeof heroImages.value) =>
  images.map((img) => ({
    url: img.imageUrl,
    linkUrl: img.linkUrl,
  }));

// 메인 이미지 목록
// - 신규 Main Desktop/Mobile 이미지를 우선 사용
// - 아직 Main PC 등록 전이면 기존 Hero 이미지를 Main PC legacy 데이터로 사용
const heroImageList = computed(() => {
  if (isMobileViewport.value) {
    if (mainMobileImages.value.length > 0) {
      return mapSiteImages(mainMobileImages.value);
    }
    if (mainDesktopImages.value.length > 0) {
      return mapSiteImages(mainDesktopImages.value);
    }
    if (heroImages.value.length > 0) return mapSiteImages(heroImages.value);
  } else {
    if (mainDesktopImages.value.length > 0) {
      return mapSiteImages(mainDesktopImages.value);
    }
    if (heroImages.value.length > 0) return mapSiteImages(heroImages.value);
    if (mainMobileImages.value.length > 0) {
      return mapSiteImages(mainMobileImages.value);
    }
  }

  // 이미지가 없으면 메인 영역 자체를 렌더링하지 않는다.
  return [];
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
  if (typeof window !== "undefined") {
    viewportMediaQuery = window.matchMedia("(max-width: 767px)");
    isMobileViewport.value = viewportMediaQuery.matches;
    viewportChangeHandler = (event) => {
      isMobileViewport.value = event.matches;
    };
    viewportMediaQuery.addEventListener("change", viewportChangeHandler);
  }

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
    if (currentHeroIndex.value >= length) {
      currentHeroIndex.value = 0;
      prevHeroIndex.value = 0;
    }

    if (length > 1) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
  },
  { immediate: true },
);

watch(
  () => [heroImageList.value[0]?.url, currentHeroProfile.value] as const,
  ([url, profile]) => {
    applyMainHeroPreload(url, profile);
  },
  { immediate: true },
);

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  stopAutoPlay();
  removeMainHeroPreload();
  if (viewportMediaQuery && viewportChangeHandler) {
    viewportMediaQuery.removeEventListener("change", viewportChangeHandler);
    viewportChangeHandler = null;
    viewportMediaQuery = null;
  }
});
</script>

<template>
  <section
    v-if="isLoading || heroImageList.length > 0"
    class="mx-0 flex min-h-0 w-full max-w-none flex-1 flex-col pt-0"
  >
    <div class="flex min-h-0 w-full flex-1 flex-col">
      <!-- 메인 이미지 슬라이더 영역 -->
      <div class="flex min-h-0 flex-1 flex-col justify-center">
        <!-- 스켈레톤 UI: 로딩 중일 때 표시 -->
        <div
          v-if="isLoading"
          class="relative group w-full md:min-h-[520px] md:flex-1"
        >
          <!-- CLS 방지: 모바일/데스크톱 이미지 비율에 맞춤 -->
          <div
            class="relative aspect-[4/5] w-full overflow-hidden rounded-none md:h-full md:min-h-[520px] md:aspect-auto"
          >
            <Skeleton class="absolute inset-0 h-full w-full rounded-none" />
            <!-- 인디케이터 스켈레톤 -->
            <div
              class="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2 sm:bottom-4"
            >
              <Skeleton class="h-2.5 w-2.5 rounded-full bg-white/55" />
              <Skeleton class="h-2.5 w-6 rounded-full bg-white/75" />
              <Skeleton class="h-2.5 w-2.5 rounded-full bg-white/55" />
            </div>
          </div>
        </div>

        <!-- 실제 콘텐츠: 이미지 있을 때 -->
        <div
          v-else
          class="relative group w-full md:min-h-[520px] md:flex-1"
          @mouseenter="stopAutoPlay"
          @mouseleave="startAutoPlay"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <!-- 슬라이더 이미지: 컨테이너에 aspect-ratio 적용 → 모든 슬라이드 동일 렌더링 보장 -->
          <div class="relative aspect-[4/5] overflow-hidden rounded-none bg-muted/10 md:h-full md:min-h-[520px] md:aspect-auto">
            <!-- 모든 이미지를 쌓아두고 부드러운 전환 효과 -->
            <img
              v-for="(image, index) in heroImageList"
              :key="index"
              v-bind="getHeroAttrs(image.url, index === 0, currentHeroProfile)"
              alt="ShakiShaki Archive"
              class="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out"
              :class="[
                getSlideClass(index),
                { 'cursor-pointer': image.linkUrl },
              ]"
              draggable="false"
              @click="handleImageClick(image.linkUrl)"
            />

            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-b from-transparent via-black/20 to-black/70 sm:h-20 md:h-24"
              aria-hidden="true"
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

            <!-- 슬라이드 인디케이터 (이미지 내부 하단 오버레이) -->
            <div
              v-if="heroImageList.length > 1"
              class="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1 sm:bottom-4"
              role="tablist"
              aria-label="슬라이드 네비게이션"
            >
              <button
                v-for="(_, index) in heroImageList"
                :key="index"
                @click="goToSlideManual(index)"
                class="flex min-h-9 min-w-9 items-center justify-center transition-all duration-500 ease-out md:min-h-10 md:min-w-10"
                role="tab"
                :aria-selected="currentHeroIndex === index"
                :aria-label="`슬라이드 ${index + 1}로 이동`"
              >
                <span
                  class="h-2 rounded-full shadow-sm transition-all duration-500 ease-out"
                  :class="
                    currentHeroIndex === index
                      ? 'w-8 bg-white/90 shadow-black/20'
                      : 'w-2.5 bg-white/55'
                  "
                />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </section>
</template>
