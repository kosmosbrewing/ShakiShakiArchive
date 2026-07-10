# 시스템 아키텍처

현재 기준 감사일: 2026-07-10

## 1. 시스템 경계

이 저장소가 소유하는 범위:

- Vue 브라우저 애플리케이션
- client-side routing과 상태 관리
- 프런트엔드 API contract
- 공개 페이지의 build-time prerender
- S3/CloudFront 배포 workflow
- API Gateway에서 ECS로 연결하는 보조 Terraform

이 저장소만으로 확정할 수 없는 범위:

- 백엔드 인가와 비즈니스 규칙
- DB schema와 migration
- 결제 provider secret, webhook, idempotency
- AWS Console의 실제 배포 상태
- Search Console과 Merchant Console 설정

## 2. 런타임 구성

    사용자 브라우저
      -> CloudFront
        -> S3 정적 HTML/assets
        -> 배포된 API origin/behavior
      -> Vue Router
      -> lazy page component
      -> Pinia/composable
      -> src/lib/api.ts
      -> cookie session 기반 backend API

    Build runner
      -> Vite build
      -> backend catalog/SEO API
      -> prerender HTML + sitemap
      -> 완전성 검사
      -> S3 upload
      -> CloudFront invalidation

프런트와 백엔드가 서로 다른 origin을 사용할 수 있으므로 credentialed cookie, 정확한 CORS allowlist, cookie 속성이 함께 맞아야 한다.

## 3. 애플리케이션 계층

### Router

src/router/index.ts가 전체 route를 정의한다.

- 모든 route page는 dynamic import를 사용한다.
- meta.requiresAuth와 meta.requiresAdmin이 client navigation을 제어한다.
- navigation 전에 document title을 갱신한다.
- UUID 상품 URL은 API에서 slug를 얻으면 canonical slug route로 교체한다.
- NotFound route는 robots noindex,nofollow를 설정한다.
- lazy chunk load 실패는 sessionStorage guard로 한 번만 reload한다.

### Pages와 Components

- src/pages: route 단위 orchestration
- src/components/common: 재사용 domain UI
- src/components/order: 주문·반품 UI
- src/components/admin: 관리자 UI
- src/components/ui: radix-vue 기반 low-level component
- App.vue: Navbar, route view, Footer, 전역 alert

### Composables와 Stores

Composables는 장바구니, 상품, 주문, 배송지, 위시리스트, 재고, 이미지, alert 같은 재사용 workflow를 캡슐화한다.

Pinia stores는 다음 공유 상태를 관리한다.

- auth
- cart
- product
- category
- wishlist
- site images
- backend constants

### API와 Types

- src/lib/api.ts: 주 REST adapter
- src/types/api.ts: frontend contract type
- src/lib/apiCache.ts: 공개 GET data의 제한적 memory cache
- src/services: 외부 SDK와 compatibility helper
- src/lib/messages: domain별 사용자 메시지

## 4. 핵심 데이터 흐름

### 상품 탐색

    route slug
      -> product store/composable
      -> fetchProduct 또는 fetchProducts
      -> 짧은 public-data cache
      -> page UI

상품 mutation은 관련 cache group을 invalidate한다.

### Session

    App mount
      -> authStore.loadUser
      -> GET /api/auth/user with cookie
      -> Pinia auth state
      -> guest cart migration

현재 활성 인증 설계는 localStorage access token을 필요로 하지 않는다.

### 보호 route

    route meta
      -> user 미존재 시 session 조회
      -> requiresAuth 검사
      -> requiresAdmin 검사
      -> page 진입

이 검사는 UX guard일 뿐이다. 모든 실제 권한은 백엔드가 재검증해야 한다.

### Checkout

    direct purchase 또는 cart
      -> order items와 backend constants 로드
      -> 배송/결제 입력 검증
      -> order 생성
      -> provider redirect/popup
      -> callback page
      -> backend status/approval
      -> cache와 임시 state 정리

현재 UI는 KakaoPay만 노출한다. Toss/NaverPay code path의 존재는 활성 결제 수단을 뜻하지 않는다.

## 5. 브라우저 저장소

Memory:

- Pinia state
- 최대 100개 API cache entry
- in-flight request guard

localStorage:

- guest_cart
- OAuth popup/result flag
- payment popup/result/current-order flag
- 짧은 processed-payment guard

sessionStorage:

- direct purchase
- OAuth reauthentication state
- product view dedupe
- chunk reload guard
- 임시 form state

브라우저 저장소는 same-origin JavaScript가 읽고 사용자가 조작할 수 있다. 인증 authority와 결제 확정 근거를 저장해서는 안 된다.

## 6. Vite Build

현재 build 특성:

- JS/CSS/assets hashed filename
- route 기반 code splitting
- vendor, UI, libs, Three.js, API, image-optimizer chunk 분리
- production source map 비활성
- console/debugger 제거
- home-only Three.js core를 고려한 600 kB warning limit
- Vite build 후 public font를 dist/fonts로 복사

Router에서 page barrel import를 다시 사용하면 eager preload가 재발할 수 있으므로 금지한다.

## 7. Prerender와 완전성 계약

scripts/prerender/index.js는 다음을 조정한다.

- paginated product 수집
- category 수집
- page별 SEO API 호출
- home, FAQ, policy, category, product HTML 생성
- sitemap 생성
- llms.txt Last-Updated 갱신

assertComplete(runStats)는 다음 조건을 모두 만족해야 성공시킨다.

- 각 page group의 generated가 attempted와 동일
- 각 page group의 failed가 비어 있음
- sitemap 생성 성공
- llms.txt 갱신 성공

하나라도 빠지면 process exit code 1로 fail-closed한다. Why: 불완전한 dist를 성공 처리하면 뒤의 S3 sync --delete가 이전 정상 HTML을 제거할 수 있기 때문이다.

## 8. 정책 페이지의 Single Source 경계

src/pages/static/TermsOfService.vue와 PrivacyPolicy.vue가 브라우저에서 보여 주는 현재 원문이다.

scripts/prerender/staticPages.js에도 terms/privacy 요약 HTML이 별도로 있으나 Vue 원문을 그대로 변환한 것이 아니며 내용·분량이 다르다. 따라서:

- terms.html과 privacy.html은 현재 권위 정책 문서가 아니다.
- CloudFront에서 /terms 또는 /privacy를 해당 HTML로 rewrite하면 안 된다.
- single-source 생성 방식이 확정되기 전에는 SPA fallback으로 Vue 원문을 제공한다.
- policy summary를 검색엔진 canonical 본문이나 법적 고지 근거로 사용하지 않는다.

Prerender가 이 파일들을 생성하고 완전성 검사 대상으로 삼는 것은 현재 build 사실이지만, 생성 여부와 권위 문서로 서빙하는 결정은 별개다.

현재 pipeline은 summary .html도 upload하며 function의 explicit .html pass-through 때문에 direct URL이 노출될 수 있다. 이 gap은 P0로 제거해야 한다.

## 9. CloudFront Rewrite 계약

checked-in cloudfront-function.js의 현재 동작:

- /assets/와 /fonts/는 그대로 통과
- 정적 파일 확장자는 SPA fallback 없이 통과
- /는 /index.html
- /productDetail/{slug}는 해당 .html
- /product/all은 합성 category이므로 /index.html
- 실제 /product/{categorySlug}는 해당 .html
- /faq는 /faq.html
- 나머지는 /index.html

따라서 /terms와 /privacy는 의도적으로 SPA fallback을 사용한다. policy single source가 해결되기 전에는 rewrite를 추가하지 않는다.

## 10. 배포 아키텍처

    GitHub event
      -> GitHub Actions
      -> npm ci
      -> npm run build:full
      -> fail-closed completeness gate
      -> S3 sync
      -> lifecycle configuration
      -> CloudFront invalidation
      -> IndexNow

selective invalidation은 index, FAQ, terms/privacy, product/category path와 discovery file을 포함한다. terms/privacy invalidation 포함은 cache 정리 범위이며 요약 HTML을 권위 문서로 서빙한다는 뜻이 아니다.

완전히 source-controlled되지 않은 항목:

- CloudFront distribution과 function association
- 기존 S3 bucket과 IAM
- 기존 VPC/ECS/subnet
- DNS와 certificate

## 11. 문서 권위

현재 절차는 README.md, DEPLOY.md, docs/DEVOPS.md, Terraform source를 따른다.

다음 ignored local 문서는 historical unsafe snapshot이며 실행 절차로 사용하면 안 된다.

- CLOUDFRONT_SETUP.md
- terraform/TERRA_SETUP_GUIDE.md
- performance-final-report.md
- performance-ultimate-report.md

## 12. 현재 제약

- unit/component/E2E test framework 없음
- ESLint script 없음
- frontend error tracking 없음
- 공통 fetch timeout 없음
- production console 제거
- full build가 backend availability에 의존
- CloudFront function publish/association 자동화 없음
- policy prerender summary와 Vue 원문의 single source 미해결

최신 검증 대기는 [Project Memory](../MEMORY.md)를 따른다.
