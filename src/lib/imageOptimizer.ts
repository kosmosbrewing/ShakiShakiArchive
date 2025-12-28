/**
 * Cloudinary 이미지 URL 최적화 유틸리티
 * - 자동 포맷 변환 (WebP/AVIF)
 * - 품질 최적화
 * - 반응형 이미지 지원
 */

// 이미지 최적화 옵션 인터페이스
export interface ImageOptions {
  width?: number; // 원하는 너비 (px)
  height?: number; // 원하는 높이 (px)
  quality?: "auto:best" | "auto:good" | "auto:eco" | number; // 품질 설정
  format?: "auto" | "webp" | "avif" | "jpg" | "png"; // 출력 포맷
  crop?: "fill" | "fit" | "scale" | "thumb" | "crop"; // 크롭 모드
  gravity?: "auto" | "face" | "center"; // 크롭 기준점
  dpr?: number; // Device Pixel Ratio (레티나 대응)
}

// 기본 최적화 설정
const DEFAULT_OPTIONS: ImageOptions = {
  quality: "auto:good",
  format: "auto",
  crop: "fill",
  gravity: "auto",
};

// Cloudinary URL 기본 패턴 (upload 경로 감지)
const CLOUDINARY_BASE_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

// Cloudinary URL 파싱 패턴 (변환 파라미터, 버전, 파일 경로 분리)
// 예: https://res.cloudinary.com/xxx/image/upload/f_auto,w_200/v1234/folder/image.jpg
// 예: https://res.cloudinary.com/xxx/image/upload/v1234/folder/image.jpg
// 예: https://res.cloudinary.com/xxx/image/upload/folder/image.jpg
const CLOUDINARY_PARSE_PATTERN = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/(?:([^/]+(?:,[^/]+)*)\/)?(v\d+\/)?(.+)$/;

/**
 * Cloudinary URL인지 확인
 */
export function isCloudinaryUrl(url: string): boolean {
  return CLOUDINARY_BASE_PATTERN.test(url);
}

/**
 * Cloudinary 변환 파라미터 문자열 생성
 */
function buildTransformString(options: ImageOptions): string {
  const transforms: string[] = [];

  // 포맷 설정 (f_auto = 브라우저 지원에 따라 WebP/AVIF 자동 선택)
  if (options.format) {
    transforms.push(`f_${options.format}`);
  }

  // 품질 설정
  if (options.quality) {
    const q = typeof options.quality === "number" ? options.quality : options.quality;
    transforms.push(`q_${q}`);
  }

  // 크기 설정
  if (options.width) {
    transforms.push(`w_${options.width}`);
  }
  if (options.height) {
    transforms.push(`h_${options.height}`);
  }

  // 크롭 모드
  if (options.crop && (options.width || options.height)) {
    transforms.push(`c_${options.crop}`);
  }

  // 크롭 기준점 (fill, crop, thumb 모드에서만 사용 가능)
  const gravityCompatibleCrops = ["fill", "crop", "thumb"];
  if (options.gravity && options.crop && gravityCompatibleCrops.includes(options.crop)) {
    transforms.push(`g_${options.gravity}`);
  }

  // DPR (레티나 디스플레이 대응)
  if (options.dpr && options.dpr > 1) {
    transforms.push(`dpr_${options.dpr}`);
  }

  return transforms.join(",");
}

/**
 * Cloudinary 이미지 URL 최적화
 * @param url - 원본 Cloudinary URL
 * @param options - 최적화 옵션
 * @returns 최적화된 URL
 */
export function optimizeImageUrl(url: string, options: Partial<ImageOptions> = {}): string {
  if (!url) return "";

  // Cloudinary URL이 아니면 원본 반환
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const transformString = buildTransformString(mergedOptions);

  // URL 파싱 (기존 변환 파라미터는 무시하고 새로 적용)
  const match = url.match(CLOUDINARY_PARSE_PATTERN);
  if (!match) return url;

  // [baseUrl, 기존변환파라미터(무시), 버전, 파일경로]
  const [, baseUrl, , version = "", filePath] = match;

  // 변환 파라미터를 upload/ 다음에 삽입
  return `${baseUrl}/${transformString}/${version}${filePath}`;
}

/**
 * 반응형 srcset 문자열 생성
 * @param url - 원본 Cloudinary URL
 * @param sizes - 생성할 너비 배열 (예: [320, 640, 960, 1280])
 * @param options - 추가 최적화 옵션
 * @returns srcset 문자열
 */
export function generateSrcSet(
  url: string,
  sizes: number[] = [320, 640, 960, 1280],
  options: Partial<ImageOptions> = {}
): string {
  if (!url || !isCloudinaryUrl(url)) return "";

  return sizes
    .map((width) => {
      const optimizedUrl = optimizeImageUrl(url, { ...options, width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(", ");
}

/**
 * 저화질 placeholder URL 생성 (LQIP - Low Quality Image Placeholder)
 * 빠른 로딩을 위한 매우 작은 블러 이미지
 */
export function getPlaceholderUrl(url: string): string {
  if (!url || !isCloudinaryUrl(url)) return "";

  return optimizeImageUrl(url, {
    width: 20,
    quality: 30,
    format: "auto",
    crop: "scale",
  });
}

/**
 * 사전 정의된 이미지 프리셋
 */
export const IMAGE_PRESETS = {
  // 상품 썸네일 (목록 페이지)
  thumbnail: {
    width: 400,
    quality: "auto:good" as const,
    format: "auto" as const,
    crop: "fill" as const,
  },
  // 상품 카드 (홈, 카테고리)
  card: {
    width: 600,
    quality: "auto:good" as const,
    format: "auto" as const,
    crop: "fill" as const,
  },
  // 상품 상세 이미지
  detail: {
    width: 1024,
    quality: "auto:good" as const,
    format: "auto" as const,
    crop: "fit" as const,
  },
  // Hero 배너
  hero: {
    width: 1920,
    quality: "auto:good" as const,
    format: "auto" as const,
    crop: "fill" as const,
  },
  // Marquee 이미지 (높이 기준 비례 축소)
  marquee: {
    height: 80,
    quality: "auto:good" as const,
    format: "auto" as const,
    crop: "scale" as const,
  },
} as const;

/**
 * 프리셋을 사용한 이미지 최적화
 */
export function optimizeWithPreset(
  url: string,
  preset: keyof typeof IMAGE_PRESETS
): string {
  return optimizeImageUrl(url, IMAGE_PRESETS[preset]);
}
