/**
 * 이미지 최적화 Vue Composable
 * Cloudinary URL 변환을 쉽게 사용할 수 있는 래퍼
 */

import { computed, type Ref } from "vue";
import {
  optimizeImageUrl,
  generateSrcSet,
  getPlaceholderUrl,
  isCloudinaryUrl,
  optimizeWithPreset,
  IMAGE_PRESETS,
  type ImageOptions,
} from "@/lib/imageOptimizer";

// 반응형 이미지용 기본 sizes 속성
const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

// srcset용 기본 너비 배열
const DEFAULT_SRCSET_WIDTHS = [320, 480, 640, 960, 1280];

export function useOptimizedImage() {
  /**
   * 단일 이미지 URL 최적화
   */
  const optimizeUrl = (url: string, options?: Partial<ImageOptions>): string => {
    return optimizeImageUrl(url, options);
  };

  /**
   * 프리셋을 사용한 이미지 최적화
   */
  const withPreset = (
    url: string,
    preset: keyof typeof IMAGE_PRESETS
  ): string => {
    return optimizeWithPreset(url, preset);
  };

  /**
   * 반응형 srcset 생성
   */
  const getSrcSet = (
    url: string,
    widths: number[] = DEFAULT_SRCSET_WIDTHS,
    options?: Partial<ImageOptions>
  ): string => {
    return generateSrcSet(url, widths, options);
  };

  /**
   * 저화질 placeholder URL 생성
   */
  const getPlaceholder = (url: string): string => {
    return getPlaceholderUrl(url);
  };

  /**
   * Cloudinary URL 여부 확인
   */
  const isOptimizable = (url: string): boolean => {
    return isCloudinaryUrl(url);
  };

  /**
   * 반응형 이미지 속성 객체 생성
   * img 태그에 v-bind로 한번에 적용 가능
   */
  const getResponsiveAttrs = (
    url: string,
    options?: Partial<ImageOptions> & {
      sizes?: string;
      widths?: number[];
    }
  ) => {
    const { sizes = DEFAULT_SIZES, widths = DEFAULT_SRCSET_WIDTHS, ...imageOptions } = options || {};

    if (!isCloudinaryUrl(url)) {
      return {
        src: url,
        loading: "lazy" as const,
        decoding: "async" as const,
      };
    }

    return {
      src: optimizeImageUrl(url, { ...imageOptions, width: widths[widths.length - 1] }),
      srcset: generateSrcSet(url, widths, imageOptions),
      sizes,
      loading: "lazy" as const,
      decoding: "async" as const,
    };
  };

  /**
   * 썸네일용 최적화 (목록 페이지)
   */
  const thumbnail = (url: string): string => {
    return optimizeWithPreset(url, "thumbnail");
  };

  /**
   * 카드용 최적화 (홈, 카테고리)
   */
  const card = (url: string): string => {
    return optimizeWithPreset(url, "card");
  };

  /**
   * 상세 이미지용 최적화
   */
  const detail = (url: string): string => {
    return optimizeWithPreset(url, "detail");
  };

  /**
   * Hero 배너용 최적화
   */
  const hero = (url: string): string => {
    return optimizeWithPreset(url, "hero");
  };

  /**
   * Hero 배너용 반응형 속성 (srcset/sizes 포함)
   */
  const getHeroAttrs = (url: string, isFirst: boolean = false) => {
    const heroWidths = [640, 960, 1280, 1920];
    const heroSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px";

    if (!isCloudinaryUrl(url)) {
      return {
        src: url,
        loading: isFirst ? ("eager" as const) : ("lazy" as const),
        decoding: "async" as const,
        fetchpriority: isFirst ? ("high" as const) : undefined,
      };
    }

    return {
      src: optimizeImageUrl(url, { width: 1280, quality: "auto:good", format: "auto", crop: "fill" }),
      srcset: generateSrcSet(url, heroWidths, { quality: "auto:good", format: "auto", crop: "fill" }),
      sizes: heroSizes,
      loading: isFirst ? ("eager" as const) : ("lazy" as const),
      decoding: "async" as const,
      fetchpriority: isFirst ? ("high" as const) : undefined,
    };
  };

  /**
   * Marquee 이미지용 최적화
   */
  const marquee = (url: string): string => {
    return optimizeWithPreset(url, "marquee");
  };

  /**
   * 반응형 ref 기반 최적화 이미지 URL 생성
   */
  const useOptimized = (
    urlRef: Ref<string>,
    options?: Partial<ImageOptions>
  ) => {
    return computed(() => optimizeImageUrl(urlRef.value, options));
  };

  return {
    // 기본 함수
    optimizeUrl,
    withPreset,
    getSrcSet,
    getPlaceholder,
    isOptimizable,
    getResponsiveAttrs,

    // 프리셋 단축 함수
    thumbnail,
    card,
    detail,
    hero,
    marquee,
    getHeroAttrs,

    // 반응형 헬퍼
    useOptimized,

    // 프리셋 객체 (커스터마이징용)
    presets: IMAGE_PRESETS,
  };
}
