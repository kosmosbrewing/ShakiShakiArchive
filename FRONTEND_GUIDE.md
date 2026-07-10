# ShakiShaki Archive 프런트엔드 가이드

현재 기준 감사일: 2026-07-10

이 문서는 현재 frontend 구현 pattern을 설명한다. 정확한 version은 package.json, route는 src/router/index.ts, API contract는 src/lib/api.ts가 우선한다.

## 1. Runtime과 Build

- Vue 3 Composition API와 script setup
- TypeScript strict, noUnusedLocals, noUnusedParameters
- Pinia
- Vue Router history mode
- Vite 6
- Tailwind CSS 3와 radix-vue
- GitHub Actions Node.js 20

기본 개발:

    npm ci
    cp .env.example .env
    npm run dev

기본 gate:

    npm run verify

실제 .env file은 읽거나 문서에 전재하지 않는다.

## 2. Project Layout

    src/
      components/
        admin/       admin domain component
        common/      reusable domain component
        order/       order/return component
        ui/          radix-vue wrapper
      composables/   reusable workflow
      lib/           API, cache, messages, validator, utility
      pages/         lazy route page
      router/        route와 guard
      services/      external SDK compatibility helper
      stores/        Pinia store
      types/         API/global type
      utils/         email/password validation

    scripts/
      prerender/     SEO static build
      verify-docs.js documentation/source contract harness
      indexnow-ping.js post-deploy indexing signal
      optimize-*.js image maintenance

Alias @는 src를 가리킨다.

## 3. Route Map

모든 page component는 lazy import다. Admin/payment code를 entry graph에 다시 포함시키는 route barrel import를 금지한다.

공개:

- /, /product/:category, /productDetail/:slug
- /archive/sold, /archive/journal
- /about, /notice, /faq
- /inquiry, /inquiry/:id
- /cart
- /login, /signup, /forgot-password, /oauth/callback
- /payment/callback, /checkout/success, /checkout/fail, /naverpay/back
- /privacy, /terms
- catch-all NotFound

인증 필요:

- /account, /modify, /addresslist
- /order, /orderlist, /orderdetail/:id?
- /wishlist
- /inquiry/create, /my-inquiries

관리자:

- /admin/products
- /admin/categories
- /admin/inquiries
- /admin/orders
- /admin/site-images
- /admin/users
- /admin/analytics

Route behavior:

- requiresAuth와 requiresAdmin 검사
- 보호 route 진입 전에 current user load
- UUID product를 slug canonical route로 교체
- NotFound noindex,nofollow
- successful navigation에서 optional GA page_view와 chunk reload guard clear

Route guard는 UX control이다. Backend endpoint가 ownership/admin privilege를 강제해야 한다.

## 4. API Layer

src/lib/api.ts가 주 contract다.

- Base: VITE_API_URL 또는 http://localhost:8080
- Session: credentials include
- JSON request: Content-Type application/json
- Error: status/data를 가진 ApiError
- Upload: FormData boundary를 browser에 위임
- 공통 request timeout: 현재 없음

Compatibility path:

- Login.vue는 5초 Axios client 사용
- main.ts가 Axios client를 export하지만 domain API는 주로 src/lib/api.ts
- payment.ts와 socialAuth.ts에 legacy helper 존재

새 domain call은 SDK adapter가 필요한 경우가 아니면 src/lib/api.ts에 추가한다. 새 외부 network call은 명시적 timeout을 포함한다.

## 5. Client Cache

src/lib/apiCache.ts는 browser HTTP cache가 아닌 in-memory cache다.

| Data | Max age |
| --- | --- |
| categories | 5분 |
| product list | 30초 |
| product detail | 3초 |
| site images | 5분 |
| constants | 1시간 |
| user-specific data | no cache |

cart, orders, user, admin, addresses, inquiries, current user는 no-cache pattern에 포함된다. Mutation은 관련 group을 invalidate하고 logout은 전체 cache를 clear한다.

## 6. State Management

주요 store:

- auth: current user, login/logout, guest cart migration
- cart: guest/server cart 분기와 optimistic quantity update
- product: first page, infinite list, stale refresh
- category
- wishlist
- siteImage: public image group과 legacy hero merge
- constants: backend constants와 defensive fallback

여러 page가 공유하는 지속 state는 store, 여러 workflow가 공유하는 operation은 composable, 한 component에서만 쓰는 presentation state는 component에 둔다.

## 7. Authentication과 OAuth

활성 contract는 backend-issued cookie session이다.

이메일:

- signup email verification
- email/password login
- admin challenge/2FA
- /api/auth/user session restore
- logout의 backend invalidation + client cleanup

소셜:

- Login/Signup은 backend-owned Naver/Kakao URL 사용
- browser callback은 /oauth/callback
- desktop은 popup/localStorage handoff
- mobile은 full-page redirect
- callback returnUrl은 same-origin relative path로 제한
- Google helper는 활성 UI/verified backend route가 없어 지원 기능이 아님

## 8. Cart와 Checkout

비회원 장바구니:

- localStorage key: guest_cart
- member cart: /api/cart
- login 후 guest entry를 순차 migration
- migration attempt 후 local data 제거

주문·결제:

- direct purchase 또는 cart item load
- constantsStore.ensureLoaded로 shipping/payment 계산 전 authoritative constants 대기
- visible paymentMethods는 KakaoPay 1개
- Toss/NaverPay code는 compatibility 상태이며 선택 불가
- popup recovery에 짧은 localStorage marker 사용

Callback 변경은 desktop popup, popup blocked fallback, mobile redirect, success, failure, cancel, back navigation을 함께 검증한다.

## 9. Validation과 Message

- form에는 vee-validate와 Zod 사용 가능
- email/password domain utility 존재
- shared user message는 src/lib/messages
- 일반 UI는 FALLBACK_CONSTANTS로 시작 가능
- Order.vue는 ensureLoaded로 backend constants 확인

Client validation은 UX를 위한 것이며 backend validation을 대체하지 않는다.

## 10. Styling과 Asset

- global CSS/font: src/assets/index.css, index.html
- Tailwind theme: tailwind.config.js
- low-level UI: src/components/ui
- class merge: src/lib/utils.ts
- optimized asset: src/assets/optimized
- home-only Three.js는 lazy dependency

CloudFront function은 /assets/와 /fonts/ 및 정적 확장자를 그대로 통과시킨다. 이 contract가 깨지면 font request가 index.html로 바뀔 수 있다.

## 11. Prerender와 Route Rewrite

npm run build:full은 backend data로 static artifact를 만든다.

- index.html
- faq.html
- terms.html, privacy.html
- product/{categorySlug}.html
- productDetail/{slugOrId}.html
- sitemap.xml
- updated llms.txt

assertComplete는 모든 group과 sitemap/llms가 완전해야 성공한다. 일부 page 누락은 warning-only가 아니라 build failure다.

CloudFront mapping:

- /product/all은 frontend 합성 목록이므로 /index.html
- 실제 category와 product detail은 .html
- /faq는 faq.html
- /terms와 /privacy는 SPA fallback

## 12. Policy Single Source

권위 원문:

- src/pages/static/TermsOfService.vue
- src/pages/static/PrivacyPolicy.vue

scripts/prerender/staticPages.js의 summary는 원문과 동일하지 않다. Single-source 결정 전:

- terms.html/privacy.html을 권위 문서로 서빙하지 않는다.
- CloudFront rewrite를 추가하지 않는다.
- summary를 legal/canonical source로 인용하지 않는다.

현재 direct .html request는 pass-through될 수 있으므로 duplicate artifact public 노출 자체도 해결 과제다.

## 13. 새 Page 추가

1. src/pages 아래 page component 추가
2. src/router/index.ts에 lazy import와 route 추가
3. title, auth/admin meta 설정
4. 제품 surface에 필요할 때만 navigation 추가
5. public indexable route면 prerender, sitemap, CloudFront mapping을 함께 검토
6. npm run verify
7. SEO route면 backend가 준비된 환경에서 npm run build:full

## 14. 새 API 추가

1. src/types/api.ts에 request/response type
2. src/lib/api.ts에 function
3. query는 URLSearchParams, JSON body는 JSON.stringify
4. user-specific data는 noCache
5. public data mutation이면 invalidation rule 추가
6. 외부 call timeout 추가
7. ApiError status를 안전한 사용자 메시지로 처리

## 15. 문서와 품질 경계

사용 가능:

- npm run typecheck
- npm run docs:lint
- npm run build
- npm run verify

현재 없음:

- unit/component test
- browser E2E
- ESLint script
- frontend error tracker

CLOUDFRONT_SETUP.md와 terraform/TERRA_SETUP_GUIDE.md는 historical unsafe ignored guide다. Current implementation 절차로 사용하지 않는다.

관련 문서: [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), [Backend Contract](BACKEND_GUIDE.md), [Project Memory](MEMORY.md).
