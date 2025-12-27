// src/stores/siteImage.ts
// 사이트 이미지 상태 관리 스토어 - Hero, Marquee 이미지 캐싱

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchHeroImages, fetchMarqueeImages } from "@/lib/api";
import type { SiteImage } from "@/types/api";

export const useSiteImageStore = defineStore("siteImage", () => {
  // 상태
  const heroImages = ref<SiteImage[]>([]);
  const marqueeImages = ref<SiteImage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);

  // 캐시 유효 시간 (10분 - 사이트 이미지는 자주 변경되지 않음)
  const CACHE_DURATION = 10 * 60 * 1000;

  // 계산된 속성
  const hasHeroImages = computed(() => heroImages.value.length > 0);
  const hasMarqueeImages = computed(() => marqueeImages.value.length > 0);

  // 캐시 유효 확인
  const isCacheValid = computed(() => {
    if (!lastFetchedAt.value) return false;
    return Date.now() - lastFetchedAt.value < CACHE_DURATION;
  });

  // 사이트 이미지 로드 (Hero + Marquee)
  async function loadSiteImages(forceRefresh = false) {
    // 캐시가 유효하고 강제 새로고침이 아니면 스킵
    if (!forceRefresh && isCacheValid.value) {
      return { heroImages: heroImages.value, marqueeImages: marqueeImages.value };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const [heroData, marqueeData] = await Promise.all([
        fetchHeroImages(),
        fetchMarqueeImages(),
      ]);

      heroImages.value = heroData;
      marqueeImages.value = marqueeData;
      lastFetchedAt.value = Date.now();

      return { heroImages: heroData, marqueeImages: marqueeData };
    } catch (e: any) {
      error.value = "사이트 이미지 로드 실패";
      console.error("사이트 이미지 로드 실패:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Hero 이미지만 로드
  async function loadHeroImages(forceRefresh = false) {
    if (!forceRefresh && isCacheValid.value && hasHeroImages.value) {
      return heroImages.value;
    }

    try {
      const data = await fetchHeroImages();
      heroImages.value = data;
      return data;
    } catch (e) {
      console.error("Hero 이미지 로드 실패:", e);
      throw e;
    }
  }

  // Marquee 이미지만 로드
  async function loadMarqueeImages(forceRefresh = false) {
    if (!forceRefresh && isCacheValid.value && hasMarqueeImages.value) {
      return marqueeImages.value;
    }

    try {
      const data = await fetchMarqueeImages();
      marqueeImages.value = data;
      return data;
    } catch (e) {
      console.error("Marquee 이미지 로드 실패:", e);
      throw e;
    }
  }

  // 캐시 무효화 (관리자가 이미지 수정 시 호출)
  function invalidateCache() {
    lastFetchedAt.value = null;
  }

  return {
    // 상태
    heroImages,
    marqueeImages,
    isLoading,
    error,

    // 계산된 속성
    hasHeroImages,
    hasMarqueeImages,
    isCacheValid,

    // 메서드
    loadSiteImages,
    loadHeroImages,
    loadMarqueeImages,
    invalidateCache,
  };
});
