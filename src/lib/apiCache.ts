// src/lib/apiCache.ts
// API 응답 캐싱 레이어
// 중복 API 요청 제거 및 응답 속도 향상

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

/**
 * LRU (Least Recently Used) 기반 API 캐시
 * 메모리 효율성을 위해 최대 100개 항목만 유지
 */
class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize = 100; // LRU 최대 100개

  /**
   * 캐시에서 데이터 조회
   * @param key - 캐시 키 (예: "GET:/api/categories")
   * @param maxAge - 최대 유효 시간 (밀리초)
   * @returns 캐시된 데이터 또는 null (만료/없음)
   */
  get<T>(key: string, maxAge: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시에 데이터 저장
   * @param key - 캐시 키
   * @param data - 저장할 데이터
   * @param etag - ETag 값 (선택적)
   */
  set<T>(key: string, data: T, etag?: string): void {
    // LRU: 오래된 항목 삭제
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  /**
   * 패턴 매칭으로 캐시 무효화
   * @param keyPattern - 정규식 패턴 문자열
   * @example invalidate('/api/categories') - 카테고리 관련 모든 캐시 제거
   */
  invalidate(keyPattern: string): void {
    const regex = new RegExp(keyPattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }
}

// 싱글톤 인스턴스 export
export const apiCache = new ApiCache();

/**
 * API 엔드포인트별 캐싱 정책
 * 백엔드 Cache-Control 헤더와 동기화
 */
export const cachePolicies = {
  // 카테고리: 5분 (자주 변경되지 않는 정적 데이터)
  categories: { maxAge: 5 * 60 * 1000 },

  // 상품: 1분 (재고 변동 가능한 동적 데이터)
  products: { maxAge: 60 * 1000 },

  // 사이트 이미지 (Hero, Marquee): 10분 (수동 변경)
  siteImages: { maxAge: 10 * 60 * 1000 },

  // 공통 상수: 1시간 (거의 변경 안됨)
  constants: { maxAge: 60 * 60 * 1000 },

  // 캐싱 안함 (장바구니, 주문 등 사용자별 데이터)
  none: { maxAge: 0 },
};
