# SEO 메타 태그 설정 가이드

## 📌 개요

이 프로젝트는 **백엔드 API를 Single Source of Truth**로 사용하여 SEO 메타 태그를 동적으로 관리합니다.
카카오톡, 페이스북, 트위터 등 SNS에서 링크 공유 시 올바른 이미지와 설명이 표시됩니다.

---

## 🏗️ 아키텍처

### 1. 백엔드 SEO API (Single Source of Truth)

모든 SEO 데이터는 백엔드 API에서 관리됩니다.

| 엔드포인트 | 설명 | 예시 |
|-----------|------|------|
| `GET /api/seo/home` | 홈페이지 메타데이터 | 메인 페이지 |
| `GET /api/seo/products` | 전체 상품 목록 메타데이터 | 상품 리스트 페이지 |
| `GET /api/seo/products/:id` | 상품 상세 메타데이터 | /productDetail/123 |
| `GET /api/seo/categories/:slug` | 카테고리 메타데이터 | /product/outer |
| `GET /api/seo/search?q=검색어` | 검색 결과 메타데이터 | 검색 페이지 |

**API 응답 예시:**
```json
{
  "openGraph": {
    "title": "샤키샤키 아카이브",
    "description": "빈티지 쇼핑몰",
    "url": "http://s3-shakishakive-archivetest.s3-website.ap-northeast-2.amazonaws.com",
    "type": "website",
    "image": "https://res.cloudinary.com/...",
    "siteName": "샤키샤키 아카이브",
    "locale": "ko_KR",
    "twitter": {
      "card": "summary_large_image",
      "title": "샤키샤키 아카이브",
      "description": "빈티지 쇼핑몰",
      "image": "https://res.cloudinary.com/..."
    }
  }
}
```

---

### 2. 프론트엔드 동적 메타 태그 시스템

#### 📄 index.html
- **최소한의 정적 메타 태그만 유지**
- 하드코딩된 OpenGraph/Twitter Card 태그 제거
- SEO는 백엔드 API로 동적 설정

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>샤키샤키 아카이브</title>

    <!-- SEO 메타 태그는 main.ts에서 백엔드 API를 통해 동적 설정 -->
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### 📄 src/main.ts
- **앱 부트스트랩 시점에 홈 SEO 데이터 로드**
- 전역 기본 메타 태그 설정

```typescript
// src/main.ts
import { useSeo } from "./composables/useSeo";
import { fetchHomeSeoData } from "./lib/api";

async function bootstrap() {
  // ... Pinia, Router 등록

  // 초기 SEO 메타 태그 설정 (백엔드 API 사용)
  try {
    const seoData = await fetchHomeSeoData();
    useSeo(seoData);
  } catch (e) {
    console.warn("⚠️ SEO 데이터 로드 실패, 기본값으로 진행합니다.");
  }

  app.mount("#app");
}
```

#### 📄 src/composables/useSeo.ts
- **@vueuse/head를 사용한 메타 태그 동적 설정**
- OpenGraph와 Twitter Card 지원

```typescript
import { useHead } from '@vueuse/head';
import type { SeoData } from '@/types/api';

export const useSeo = (seoData: SeoData) => {
  useHead({
    title: seoData.openGraph.title,
    meta: [
      { name: 'description', content: seoData.openGraph.description },
      { property: 'og:title', content: seoData.openGraph.title },
      { property: 'og:description', content: seoData.openGraph.description },
      { property: 'og:image', content: seoData.openGraph.image },
      { property: 'og:url', content: seoData.openGraph.url },
      { property: 'og:type', content: seoData.openGraph.type },
      { property: 'og:site_name', content: seoData.openGraph.siteName },
      { property: 'og:locale', content: seoData.openGraph.locale },
      { name: 'twitter:card', content: seoData.openGraph.twitter.card },
      { name: 'twitter:title', content: seoData.openGraph.twitter.title },
      { name: 'twitter:description', content: seoData.openGraph.twitter.description },
      { name: 'twitter:image', content: seoData.openGraph.twitter.image },
    ],
  });
};
```

---

## 🎯 페이지별 SEO 설정 방법

### 1. 홈페이지
- **main.ts에서 자동 설정됨**
- 별도 코드 불필요

```typescript
// src/components/Home.vue
// NOTE: 홈페이지 SEO는 main.ts의 bootstrap에서 이미 설정됨
```

### 2. 상품 상세 페이지
- **onMounted에서 상품별 SEO 로드**

```typescript
// src/pages/product/ProductDetail.vue
import { onMounted } from "vue";
import { useSeo } from "@/composables/useSeo";
import { fetchProductSeoData } from "@/lib/api";

onMounted(async () => {
  const productId = route.params.id;

  try {
    const seoData = await fetchProductSeoData(String(productId));
    useSeo(seoData);
  } catch (error) {
    console.error("SEO 데이터 로드 실패:", error);
  }
});
```

### 3. 상품 목록 페이지
```typescript
// src/pages/product/Product.vue
import { onMounted } from "vue";
import { useSeo } from "@/composables/useSeo";
import { fetchProductsSeoData } from "@/lib/api";

onMounted(async () => {
  try {
    const seoData = await fetchProductsSeoData();
    useSeo(seoData);
  } catch (error) {
    console.error("SEO 데이터 로드 실패:", error);
  }
});
```

### 4. 카테고리 페이지
```typescript
// src/pages/product/Product.vue (카테고리별 필터링 시)
import { fetchCategorySeoData } from "@/lib/api";

onMounted(async () => {
  const categorySlug = route.params.category;

  if (categorySlug) {
    try {
      const seoData = await fetchCategorySeoData(String(categorySlug));
      useSeo(seoData);
    } catch (error) {
      console.error("SEO 데이터 로드 실패:", error);
    }
  }
});
```

### 5. 검색 결과 페이지
```typescript
// src/pages/search/Search.vue
import { fetchSearchSeoData } from "@/lib/api";

onMounted(async () => {
  const searchQuery = route.query.q;

  if (searchQuery) {
    try {
      const seoData = await fetchSearchSeoData(String(searchQuery));
      useSeo(seoData);
    } catch (error) {
      console.error("SEO 데이터 로드 실패:", error);
    }
  }
});
```

---

## 📋 체크리스트

### ✅ 구현 완료 항목
- [x] `@vueuse/head` 라이브러리 설치
- [x] `main.ts`에 head 플러그인 등록
- [x] SEO 타입 정의 추가 (`src/types/api.ts`)
- [x] `useSeo` composable 생성
- [x] SEO API 함수 추가 (`src/lib/api.ts`)
- [x] `index.html`에서 하드코딩 메타 태그 제거
- [x] `main.ts` bootstrap에서 초기 SEO 설정
- [x] 홈페이지 SEO 자동 설정
- [x] 상품 상세 페이지 SEO 설정

### 🔲 추가 구현 필요 항목
- [ ] 상품 목록 페이지 SEO 설정
- [ ] 카테고리 페이지 SEO 설정
- [ ] 검색 결과 페이지 SEO 설정

---

## 🔍 테스트 방법

### 1. 개발 환경에서 확인
브라우저 개발자 도구에서 메타 태그를 확인합니다:

```bash
npm run dev
```

개발자 도구(F12) → Elements → `<head>` 태그 내부 확인

### 2. SNS 미리보기 테스트

#### 카카오톡 링크 미리보기
1. https://developers.kakao.com/tool/debugger/sharing
2. URL 입력 후 "미리보기" 클릭

#### 페이스북 디버거
1. https://developers.facebook.com/tools/debug/
2. URL 입력 후 "디버그" 클릭
3. 캐시 초기화: "Scrape Again" 버튼 클릭

#### 트위터 카드 검증
1. https://cards-dev.twitter.com/validator
2. URL 입력 후 "Preview card" 클릭

### 3. 메타 태그 확인 도구
```bash
curl -s https://your-domain.com | grep -i "og:"
curl -s https://your-domain.com | grep -i "twitter:"
```

---

## 🚨 주의사항

### ⚠️ Single Source of Truth
- **모든 SEO 데이터는 백엔드 API에서 관리합니다**
- `index.html`에 메타 태그를 직접 추가하지 마세요
- 백엔드 API만 수정하면 프론트엔드에 자동 반영됩니다

### ⚠️ 에러 핸들링
- SEO 로드 실패해도 앱은 정상 작동합니다
- 에러 발생 시 콘솔에 경고 메시지만 출력됩니다

### ⚠️ 이미지 URL
- OpenGraph 이미지는 **절대 경로(HTTPS)** 사용
- 상대 경로나 로컬 파일 경로는 SNS에서 표시 안 됨
- 권장: Cloudinary 등 CDN 사용

### ⚠️ 캐싱
- SNS 플랫폼은 메타 태그를 캐싱합니다
- 변경 후에는 각 플랫폼의 디버거에서 캐시 초기화 필요

---

## 📚 참고 자료

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [@vueuse/head Documentation](https://github.com/vueuse/head)
- [카카오톡 링크 공유 가이드](https://developers.kakao.com/docs/latest/ko/message/common)

---

## 🔧 문제 해결

### Q: 카카오톡에서 이미지가 안 보여요
A:
1. 이미지 URL이 HTTPS인지 확인
2. 이미지 크기가 최소 200x200px 이상인지 확인
3. 카카오톡 디버거에서 캐시 초기화

### Q: 메타 태그가 업데이트 안 돼요
A:
1. 브라우저 캐시 초기화 (Ctrl+F5)
2. SNS 플랫폼 디버거에서 캐시 초기화
3. 개발자 도구에서 메타 태그 직접 확인

### Q: 백엔드 API 수정했는데 반영 안 돼요
A:
1. 프론트엔드 재시작 불필요 (동적 로드)
2. 페이지 새로고침만 하면 됨
3. 백엔드 API 응답 형식 확인

---

## ✅ 결론

이 프로젝트는 **백엔드 API를 Single Source of Truth**로 사용하여 SEO를 일관되게 관리합니다.
프론트엔드는 백엔드 API만 호출하면 되므로, 유지보수가 간편하고 데이터 일관성이 보장됩니다.
