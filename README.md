# ShakiShaki Archive Frontend

ShakiShaki Archive의 빈티지 커머스 웹 프런트엔드입니다. Vue 3 SPA로 상품 탐색, 장바구니, 계정, 주문, 문의와 관리자 기능을 제공하고, 공개 상품 페이지는 빌드 시 정적 HTML로 프리렌더합니다.

현재 기준 감사일: 2026-07-10

> 코드와 설정이 동작의 단일 진실 소스입니다. 날짜가 붙은 릴리스/품질 문서와 performance-comparison.md는 당시 스냅샷이며 현재 성능이나 운영 상태를 보장하지 않습니다.

## 현재 제품 범위

### 공개 영역

- 홈, 카테고리별 상품 목록, slug 기반 상품 상세
- Sold Archive, Journal, About, Notice
- 비회원 localStorage 장바구니와 로그인 후 서버 장바구니 병합
- FAQ, 공개 문의 목록/상세
- 개인정보 처리방침, 이용약관
- 카카오 공유, GA4 선택 구성

### 계정

- 이메일 인증 회원가입, 이메일/비밀번호 로그인, 비밀번호 재설정
- Naver/Kakao OAuth 진입과 공용 OAuth callback
- 관리자 로그인 2차 인증 UI
- 회원정보, 배송지, 위시리스트, 주문 내역
- 주문 취소/부분 취소, 반품 요청·송장, 구매 확정 UI

### 주문·결제

- 현재 Order.vue가 사용자에게 노출하는 결제 수단은 KakaoPay 1개입니다.
- Toss/NaverPay 구현 코드는 남아 있으나 현재 결제 수단 목록에는 노출되지 않습니다.
- 이 상태가 장기 제품 정책인지, 비활성 통합을 정리할지는 Needs Verification입니다.

### 관리자

- 상품·옵션·실측·카테고리 관리
- 주문·항목·환불 관리
- 문의·답변 관리
- 회원·권한 관리
- 사이트 이미지 관리
- 분석 요약 화면

## 기술 스택

- Vue 3 Composition API와 TypeScript strict mode
- Pinia 3, Vue Router 4
- Vite 6
- Tailwind CSS 3, radix-vue 기반 UI 컴포넌트
- Zod, vee-validate
- fetch 중심 API layer와 일부 Axios 호환 경로
- Three.js 홈 비주얼
- Node 기반 prerender와 sitemap/IndexNow 스크립트
- AWS S3, CloudFront, GitHub Actions

정확한 의존성 버전은 package.json과 package-lock.json을 확인합니다.

## 빠른 시작

### 요구사항

- Node.js 20.x 권장: CI도 Node.js 20을 사용합니다.
- npm과 실행 가능한 ShakiShakiArchiveBackend

### 설치

    npm ci
    cp .env.example .env
    npm run dev

개발 서버 기본 주소는 Vite 기본값인 http://localhost:5173이며, API 기본 주소는 VITE_API_URL이 없을 때 http://localhost:8080입니다.

실제 .env 파일은 커밋하거나 문서에 전재하지 않습니다.

## 환경 변수

모든 VITE_ 값은 브라우저 번들에 공개됩니다. 서버 secret, OAuth client secret, 결제 secret, 관리자 secret을 넣으면 안 됩니다.

| Key | Required | Current use |
| --- | --- | --- |
| VITE_API_URL | production | API base, 기본값 http://localhost:8080 |
| VITE_GA_ID | no | 설정된 경우 GA4 SPA page view |
| VITE_KAKAO_APP_KEY | no | 상품 상세 카카오 공유 |
| VITE_KAKAO_CLIENT_ID | no | socialAuth 직접 SDK 호환 helper |
| VITE_KAKAO_REDIRECT_URI | no | socialAuth 직접 SDK 호환 helper |
| VITE_NAVER_CLIENT_ID | no | socialAuth 직접 SDK 호환 helper |
| VITE_NAVER_REDIRECT_URI | no | socialAuth 직접 SDK 호환 helper |
| VITE_GOOGLE_CLIENT_ID | no | 미연결 Google helper |
| VITE_GOOGLE_REDIRECT_URI | no | 미연결 Google helper |

현재 로그인/회원가입 화면의 Naver/Kakao 흐름은 client id를 직접 조립하지 않고 백엔드 OAuth URL로 이동합니다. Google helper는 검증된 백엔드 route와 활성 UI가 없어 지원 기능으로 간주하지 않습니다.

## 명령

| Command | Purpose | External dependency |
| --- | --- | --- |
| npm run dev | Vite 개발 서버 | API 기능에는 backend 필요 |
| npm run typecheck | vue-tsc 검사 | 없음 |
| npm run docs:lint | 필수 문서, 상대 링크, VITE_ 키 동기화 검사 | 없음 |
| npm run build | 기존 TypeScript 검사 + Vite build + font 복사 | 없음 |
| npm run preview | dist 로컬 미리보기 | 선행 build |
| npm run prerender | dist에 공개 페이지 HTML과 sitemap 생성 | 실행 가능한 backend |
| npm run build:full | build 후 prerender | 실행 가능한 backend |
| npm run optimize-images | src/assets 이미지 최적화 | 원본 asset |
| npm run verify | docs:lint 후 build | 없음 |

현재 package.json에는 단위 테스트와 ESLint script가 없습니다. npm run verify는 문서·타입·프로덕션 번들 게이트이며 브라우저 E2E를 대체하지 않습니다.

## 아키텍처

    Browser
      -> Vue Router lazy page
      -> Pinia/composable
      -> src/lib/api.ts
      -> ShakiShakiArchiveBackend

    npm run build:full
      -> Vite dist
      -> backend product/category/SEO APIs
      -> prerendered HTML + sitemap.xml

    GitHub Actions
      -> npm ci + build:full
      -> S3 assets/ and HTML upload
      -> CloudFront invalidation
      -> IndexNow ping

주요 디렉터리:

- src/pages: 라우트 페이지
- src/components: 도메인·공용·UI 컴포넌트
- src/composables: 화면 로직 조합
- src/stores: Pinia 상태와 캐시
- src/lib/api.ts: 프런트 API 계약
- src/lib/apiCache.ts: 공개 데이터 메모리 캐시와 민감 경로 no-cache
- src/router/index.ts: lazy route, auth/admin guard, canonical 이동, 404 noindex
- scripts/prerender: SEO 정적 빌드
- terraform: API Gateway/VPC Link/Cloud Map 보조 구성

상세 구조는 [Architecture](docs/ARCHITECTURE.md)를 참고합니다.

## 인증과 데이터 규칙

- 인증은 백엔드 쿠키 세션이며 API 요청은 credentials: include를 사용합니다.
- 프런트 route guard는 접근 UX만 보조합니다. 실제 인가 경계는 백엔드입니다.
- 게스트 장바구니는 guest_cart 키로 localStorage에 저장되고 로그인 후 병합됩니다.
- 사용자, 주문, 장바구니, 관리자, 문의 데이터는 API cache 대상에서 제외됩니다.
- 공개 상품·카테고리·사이트 이미지·상수만 짧은 메모리 캐시를 사용합니다.
- 공통 상수 API 실패 시 프런트 fallback이 있지만 주문 화면은 ensureLoaded로 정확한 값을 다시 확인합니다.

## SEO Build와 완전성

npm run build는 SPA만 빌드합니다. npm run build:full은 추가로 백엔드 API를 읽어 다음 산출물을 만듭니다.

- index.html
- faq.html
- terms.html, privacy.html
- product/{categorySlug}.html
- productDetail/{productSlugOrId}.html
- sitemap.xml
- 날짜가 갱신된 llms.txt

Prerender는 모든 page group, sitemap, llms가 완전해야 성공합니다. 누락이나 failed entry가 하나라도 있으면 exit code 1로 fail-closed하여 S3 upload를 막습니다.

CloudFront function의 현재 contract:

- /assets/와 /fonts/ 및 정적 확장자는 그대로 통과
- /product/all은 frontend 합성 목록이므로 /index.html
- 실제 category와 product detail은 prerender .html
- /faq는 /faq.html
- /terms와 /privacy는 /index.html SPA fallback

주의: scripts/prerender/staticPages.js가 terms.html/privacy.html을 생성하지만, 이 본문은 Vue 정책 원문의 별도 요약이며 내용이 동일하지 않습니다. 사용자에게 보이는 원문은 src/pages/static/TermsOfService.vue와 PrivacyPolicy.vue입니다.

현재 pipeline은 summary .html도 upload하고 CloudFront function은 명시적 .html 요청을 통과시키므로 direct /terms.html, /privacy.html이 노출될 수 있습니다. 이는 해결되지 않은 High-risk drift입니다. Single-source 결정 전에는 해당 URL을 링크·권위 문서·canonical 본문으로 사용하거나 extensionless policy route를 그 파일로 rewrite하면 안 됩니다.

자세한 내용은 [SEO Guide](SEO_GUIDE.md)를 참고합니다.

## 배포 주의

main push는 프로덕션 배포를 시작합니다. 워크플로는 v* tag, content-update repository dispatch, manual dispatch도 받습니다. 기본 selective invalidation은 FAQ, terms, privacy, product/category와 discovery file을 포함합니다.

배포 전 기본 확인:

    npm run verify

백엔드가 준비된 경우:

    VITE_API_URL=http://localhost:8080 npm run build:full

배포·무효화·롤백은 [Deploy Guide](DEPLOY.md), 현재 자동화 범위는 [DevOps](docs/DEVOPS.md)를 참고합니다.

## 문서 지도

현재 source-of-truth 문서:

- [Frontend Guide](FRONTEND_GUIDE.md)
- [Frontend-to-Backend Contract](BACKEND_GUIDE.md)
- [Deploy Guide](DEPLOY.md)
- [SEO Guide](SEO_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [DevOps](docs/DEVOPS.md)
- [Security](docs/SECURITY.md)
- [Technical Challenges](docs/TECHNICAL_CHALLENGES.md)
- [SEO/GEO Status](docs/SEO_GEO_IMPROVEMENT_PLAN.md)
- [Project Memory](MEMORY.md)
- [Agent Rules](AGENTS.md)
- [Project Codex](Codex.md)

역사 스냅샷:

- [2026-07-08 Quality Improvements](docs/QUALITY_IMPROVEMENTS_2026-07-08.md)
- [2026-07-08 Release](docs/RELEASE_2026-07-08.md)
- [Historical Performance Comparison](performance-comparison.md)

Ignored historical unsafe 문서:

- CLOUDFRONT_SETUP.md
- terraform/TERRA_SETUP_GUIDE.md
- performance-final-report.md
- performance-ultimate-report.md

위 문서의 CloudFront/Terraform 명령, secret 이름, 성능 수치를 current 절차나 근거로 사용하지 않습니다.

## Needs Verification

- 운영 CloudFront 함수 association과 최신 source 반영
- Vue policy를 single source로 prerender하는 방식
- direct /terms.html, /privacy.html summary 노출 제거 또는 원문 기반 생성
- 운영 쿠키/CORS/CSRF/보안 헤더
- backend content-update dispatch 연결
- GSC, 네이버, Merchant/RSS 운영 등록
- KakaoPay 단일 정책과 비활성 Toss/NaverPay 코드의 향후 처리
- 자동 테스트, lint, error tracking 부재

최신 목록과 근거는 [Project Memory](MEMORY.md)에 유지합니다.

## 라이선스

All rights reserved. 사용 조건은 [LICENSE](LICENSE)를 확인하세요.
