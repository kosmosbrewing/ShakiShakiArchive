// src/stores/siteImage.ts
// 사이트 이미지 상태 관리 스토어 - Main, Hero, Marquee, Journal 이미지 캐싱

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  fetchHeroImages,
  fetchJournalImages,
  fetchMainDesktopImages,
  fetchMainMobileImages,
  fetchMarqueeImages,
} from "@/lib/api";
import { apiCache } from "@/lib/apiCache";
import type { SiteImage } from "@/types/api";

export const useSiteImageStore = defineStore("siteImage", () => {
  // 상태
  const mainDesktopImages = ref<SiteImage[]>([]);
  const mainMobileImages = ref<SiteImage[]>([]);
  const heroImages = ref<SiteImage[]>([]);
  const marqueeImages = ref<SiteImage[]>([]);
  const journalImages = ref<SiteImage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);

  // 캐시 유효 시간 (5분 - 메인 이미지 변경 반영 지연을 줄이기 위해 짧게 유지)
  const CACHE_DURATION = 5 * 60 * 1000;

  // 계산된 속성
  const hasMainDesktopImages = computed(() => mainDesktopImages.value.length > 0);
  const hasMainMobileImages = computed(() => mainMobileImages.value.length > 0);
  const hasHeroImages = computed(() => heroImages.value.length > 0);
  const hasMarqueeImages = computed(() => marqueeImages.value.length > 0);
  const hasJournalImages = computed(() => journalImages.value.length > 0);

  // 캐시 유효 확인
  const isCacheValid = computed(() => {
    if (!lastFetchedAt.value) return false;
    return Date.now() - lastFetchedAt.value < CACHE_DURATION;
  });

  const loadOptionalImages = async (
    loader: () => Promise<SiteImage[]>,
    label: string,
  ): Promise<SiteImage[]> => {
    try {
      return await loader();
    } catch (e) {
      console.warn(`${label} 이미지 로드 실패 - 기존 이미지 fallback을 사용합니다.`, e);
      return [];
    }
  };

  // 사이트 이미지 로드 (Main + legacy Hero)
  async function loadSiteImages(forceRefresh = false) {
    // 캐시가 유효하고 강제 새로고침이 아니면 스킵
    if (!forceRefresh && isCacheValid.value) {
      return {
        mainDesktopImages: mainDesktopImages.value,
        mainMobileImages: mainMobileImages.value,
        heroImages: heroImages.value,
      };
    }

    isLoading.value = true;
    error.value = null;

    try {
      const [mainDesktopData, mainMobileData, heroData] = await Promise.all([
        loadOptionalImages(fetchMainDesktopImages, "메인 데스크톱"),
        loadOptionalImages(fetchMainMobileImages, "메인 모바일"),
        fetchHeroImages(),
      ]);

      mainDesktopImages.value = mainDesktopData;
      mainMobileImages.value = mainMobileData;
      heroImages.value = heroData;
      lastFetchedAt.value = Date.now();

      return {
        mainDesktopImages: mainDesktopData,
        mainMobileImages: mainMobileData,
        heroImages: heroData,
      };
    } catch (e: any) {
      error.value = "사이트 이미지 로드 실패";
      console.error("사이트 이미지 로드 실패:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // 메인 데스크톱 이미지만 로드
  async function loadMainDesktopImages(forceRefresh = false) {
    if (!forceRefresh && isCacheValid.value && hasMainDesktopImages.value) {
      return mainDesktopImages.value;
    }

    try {
      const data = await fetchMainDesktopImages();
      mainDesktopImages.value = data;
      return data;
    } catch (e) {
      console.error("메인 데스크톱 이미지 로드 실패:", e);
      throw e;
    }
  }

  // 메인 모바일 이미지만 로드
  async function loadMainMobileImages(forceRefresh = false) {
    if (!forceRefresh && isCacheValid.value && hasMainMobileImages.value) {
      return mainMobileImages.value;
    }

    try {
      const data = await fetchMainMobileImages();
      mainMobileImages.value = data;
      return data;
    } catch (e) {
      console.error("메인 모바일 이미지 로드 실패:", e);
      throw e;
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

  // Journal 이미지만 로드
  async function loadJournalImages(forceRefresh = false) {
    if (!forceRefresh && isCacheValid.value && hasJournalImages.value) {
      return journalImages.value;
    }

    try {
      const data = await fetchJournalImages();
      journalImages.value = data;
      return data;
    } catch (e) {
      console.error("Journal 이미지 로드 실패:", e);
      throw e;
    }
  }

  // 캐시 무효화 (관리자가 이미지 수정 시 호출)
  function invalidateCache() {
    lastFetchedAt.value = null;
    apiCache.invalidate('/api/site-images'); // HTTP 캐시도 무효화
  }

  // 관리자 페이지에서 받은 데이터로 공개 영역 상태를 즉시 동기화
  // 관리자 응답에는 비활성 이미지도 포함되므로 active만 필터링한다.
  function syncFromAdminImages(images: SiteImage[]) {
    const activeImages = images.filter((img) => img.isActive);

    mainDesktopImages.value = activeImages
      .filter((img) => img.type === "main_desktop")
      .sort((a, b) => a.displayOrder - b.displayOrder);

    mainMobileImages.value = activeImages
      .filter((img) => img.type === "main_mobile")
      .sort((a, b) => a.displayOrder - b.displayOrder);

    heroImages.value = activeImages
      .filter((img) => img.type === "hero")
      .sort((a, b) => a.displayOrder - b.displayOrder);

    marqueeImages.value = activeImages
      .filter((img) => img.type === "marquee")
      .sort((a, b) => a.displayOrder - b.displayOrder);

    journalImages.value = activeImages
      .filter((img) => img.type === "journal")
      .sort((a, b) => a.displayOrder - b.displayOrder);

    lastFetchedAt.value = Date.now();
    apiCache.invalidate('/api/site-images');
  }

  return {
    // 상태
    mainDesktopImages,
    mainMobileImages,
    heroImages,
    marqueeImages,
    journalImages,
    isLoading,
    error,

    // 계산된 속성
    hasMainDesktopImages,
    hasMainMobileImages,
    hasHeroImages,
    hasMarqueeImages,
    hasJournalImages,
    isCacheValid,

    // 메서드
    loadSiteImages,
    loadMainDesktopImages,
    loadMainMobileImages,
    loadHeroImages,
    loadMarqueeImages,
    loadJournalImages,
    invalidateCache,
    syncFromAdminImages,
  };
});
