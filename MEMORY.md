# MEMORY.md - ShakiShakiArchive

Last updated: 2026-07-10 12:06 (KST)

## Current Status

### Done

- [x] Vue 3 + TypeScript strict + Pinia + Vue Router 기반 SPA
- [x] 전 라우트 lazy import와 stale chunk 1회 리로드 가드
- [x] 쿠키 세션 기반 이메일 로그인, Naver/Kakao OAuth 진입, 관리자 로그인 2차 인증 UI
- [x] 상품/카테고리, 게스트·회원 장바구니, 위시리스트, 주문/반품, 문의, 관리자 화면
- [x] 현재 주문 화면에서 KakaoPay 단일 결제 수단 노출
- [x] 백엔드 SEO API 기반 홈/FAQ/정책/카테고리/상품 프리렌더와 sitemap 생성
- [x] incomplete prerender artifact를 exit code 1로 차단하는 fail-closed gate
- [x] CloudFront source contract: /fonts/ 통과, /product/all SPA fallback, actual category/product/FAQ prerender mapping
- [x] selective invalidation에 FAQ/terms/privacy extensionless 및 .html path 포함
- [x] CloudFront 11-case behavior fixture와 prerender complete/incomplete fail-closed fixture 통과
- [x] main/tag/dispatch/manual 기반 S3 + CloudFront 배포 워크플로
- [x] 2026-07-10 현재 문서 및 로컬 문서 검증 하네스 정비

### In Progress

- [ ] 현재 할당된 제품 기능 작업 없음

### Blocked

- [ ] 없음

### Needs Verification

- [ ] 이번 문서/하네스 변경을 main에 반영할 배포 시점 | how: main의 모든 push가 production build:full, S3 upload, CloudFront invalidation을 실행하므로 별도 릴리스 판단
- [ ] 운영 CloudFront에 cloudfront-function.js 최신 코드가 연결·게시되어 있는지 | how: AWS 콘솔 association과 실제 응답 URI 확인
- [ ] Vue terms/privacy를 단일 source로 prerender하는 방식 | how: Vue 원문 또는 공통 structured source에서 HTML을 생성하는 설계 결정
- [ ] direct /terms.html, /privacy.html summary 노출 제거 | how: 중복 생성 중단 또는 Vue 원문 기반 생성 후 public artifact 확인
- [ ] repository_dispatch(content-update)가 백엔드 상품 변경에서 실제 발생하는지 | how: GitHub Actions 이벤트와 백엔드 로그 확인
- [ ] GSC, 네이버 서치어드바이저, Merchant/RSS 피드의 운영 등록 상태 | how: 각 콘솔과 실제 feed endpoint 확인
- [ ] 쿠키 Secure/SameSite/HttpOnly, CSRF, CORS, 보안 헤더의 운영값 | how: 백엔드 설정 및 배포 응답 헤더 확인
- [ ] Toss/NaverPay 지원 코드를 계속 유지할지, KakaoPay만 제품 정책으로 확정할지 | how: 제품 결정 후 dead path 정리 또는 UI 복구
- [ ] src/services/socialAuth.ts의 직접 SDK helper와 Google helper를 유지할지 | how: 호출 그래프 및 백엔드 route 계약 확정

## Decisions Log

- 2026-07-10 11:24 (KST) | 결정: 현재 기준 문서와 날짜 기반 역사 스냅샷을 분리 | 이유: 과거 수치와 미구현 구성이 운영 사실처럼 보이던 문제 해소 | 영향: 모든 가이드/README | ref: AGENTS.md, README.md | 되돌림 조건: 없음
- 2026-07-10 11:24 (KST) | 결정: 프런트 인증 계약을 쿠키 세션으로 명시 | 이유: src/lib/api.ts와 auth store가 credentials include를 사용 | 영향: API/보안 문서 | ref: src/lib/api.ts, src/stores/auth.ts | 되돌림 조건: 인증 아키텍처 변경
- 2026-07-10 11:24 (KST) | 결정: Google OAuth는 미연결로 분류 | 이유: helper/env는 있으나 활성 UI와 검증된 백엔드 경로가 없음 | 영향: 환경 변수/기능 문서 | ref: src/services/socialAuth.ts, src/router/index.ts | 되돌림 조건: 백엔드 route와 E2E 검증 완료
- 2026-07-10 11:24 (KST) | 결정: 현재 결제 UI는 KakaoPay만 지원한다고 기록 | 이유: Order.vue paymentMethods 배열이 KakaoPay 1개만 노출 | 영향: README/가이드 | ref: src/pages/order/Order.vue | 되돌림 조건: 다른 수단 UI 재활성화
- 2026-07-10 11:54 (KST) | 결정: prerender 결과는 완전할 때만 성공 | 이유: partial dist의 S3 sync --delete로 이전 정상 HTML이 삭제되는 위험 차단 | 영향: build:full/deploy | ref: scripts/prerender/index.js | 되돌림 조건: 원자적 artifact publish 도입
- 2026-07-10 11:54 (KST) | 결정: /fonts/는 통과시키고 /product/all은 SPA fallback | 이유: font MIME failure와 존재하지 않는 product/all.html 요청 방지 | 영향: CloudFront viewer request | ref: cloudfront-function.js | 되돌림 조건: asset/category routing 구조 변경
- 2026-07-10 11:54 (KST) | 결정: terms/privacy summary HTML을 권위 문서로 서빙하지 않음 | 이유: staticPages.js summary가 Vue 정책 원문과 동일하지 않음 | 영향: SEO/법적 고지/CloudFront | ref: scripts/prerender/staticPages.js, src/pages/static | 되돌림 조건: single-source 생성 완료

## Operational Params

- frontendDomain: https://shakishakiarchive.com | source: scripts/prerender/config.js | where: SITE_URL | changedAt: 2026-07-10 11:24 (KST)
- ciNodeVersion: 20 | source: .github/workflows/deploy.yml | where: env.NODE_VERSION | changedAt: 2026-07-10 11:24 (KST)
- devApiBase: http://localhost:8080 | source: src/lib/api.ts | where: VITE_API_URL fallback | changedAt: 2026-07-10 11:24 (KST)
- productListCache: 30s | source: src/lib/apiCache.ts | where: cachePolicies.productList | changedAt: 2026-07-10 11:24 (KST)
- productDetailCache: 3s | source: src/lib/apiCache.ts | where: cachePolicies.productDetail | changedAt: 2026-07-10 11:24 (KST)
- categoriesAndSiteImagesCache: 5m | source: src/lib/apiCache.ts | where: cachePolicies.categories/siteImages | changedAt: 2026-07-10 11:24 (KST)
- constantsCache: 1h | source: src/lib/apiCache.ts | where: cachePolicies.constants | changedAt: 2026-07-10 11:24 (KST)
- fallbackShipping: threshold 70000 KRW, base 3500 KRW, remote extra 2500 KRW | source: src/stores/constants.ts | where: FALLBACK_CONSTANTS | changedAt: 2026-07-10 11:24 (KST)
- assetLifecycle: assets/ 60 days | source: .github/workflows/deploy.yml | where: expire-old-assets-60d | changedAt: 2026-07-10 11:24 (KST)
- htmlCache: max-age=300, stale-while-revalidate=86400 | source: .github/workflows/deploy.yml | where: HTML upload | changedAt: 2026-07-10 11:24 (KST)
- assetCache: max-age=31536000, immutable | source: .github/workflows/deploy.yml | where: assets upload | changedAt: 2026-07-10 11:24 (KST)
- productionDeployTrigger: every main push including docs | source: .github/workflows/deploy.yml | where: on.push.branches | changedAt: 2026-07-10 11:24 (KST)
- prerenderCompleteness: all page groups + sitemap + llms required | source: scripts/prerender/index.js | where: assertComplete | changedAt: 2026-07-10 11:54 (KST)
- cloudfrontSpecialRoutes: /fonts pass-through, /product/all -> /index.html, /faq -> /faq.html | source: cloudfront-function.js | where: handler | changedAt: 2026-07-10 11:54 (KST)

## Known Issues

- 이슈: 전체 npm audit가 form-data와 vite에서 high 2건을 보고; production-only audit에는 form-data 1건
  - severity: high
  - owner: unassigned
  - 재현: npm audit --audit-level=high 및 npm audit --omit=dev --audit-level=high
  - 로그 포인트: GHSA-hmw2-7cc7-3qxx, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff
  - next probe: npm audit fix --dry-run 결과와 lockfile diff를 검토한 뒤 호환 가능한 업그레이드
- 이슈: 자동 테스트와 ESLint 스크립트가 없음
  - severity: med
  - owner: unassigned
  - 재현: package.json scripts 확인
  - 로그 포인트: npm run verify 결과
  - next probe: Vitest와 핵심 인증/장바구니/결제 콜백 테스트 도입 범위 확정
- 이슈: 공통 fetch API 요청에 명시적 timeout이 없음
  - severity: med
  - owner: unassigned
  - 재현: src/lib/api.ts apiRequest 확인
  - 로그 포인트: 브라우저 Network pending 요청
  - next probe: AbortController 기반 공통 timeout 설계
- 이슈: 오류 추적 도구가 소스에 구성되어 있지 않고 프로덕션 console은 제거됨
  - severity: med
  - owner: unassigned
  - 재현: package.json, src/main.ts, vite.config.ts 확인
  - 로그 포인트: 운영 브라우저 오류와 API Gateway access log
  - next probe: 개인정보 필터를 포함한 에러 트래킹 도입 결정
- 이슈: staticPages.js의 terms/privacy summary와 Vue 정책 원문이 중복·불일치
  - severity: high
  - owner: unassigned
  - 재현: scripts/prerender/staticPages.js와 src/pages/static의 policy 내용 비교; direct .html은 function에서 통과
  - 로그 포인트: /terms, /privacy는 SPA fallback인지, /terms.html과 /privacy.html은 summary가 노출되는지 확인
  - next probe: 공통 source에서 Vue와 prerender를 생성하거나 duplicate artifact upload 제거; 해결 전 link/rewrite 금지

## Next Tasks

- [ ] (P0) high dependency advisories 2건의 안전한 업그레이드와 회귀 build 검증
- [ ] (P0) Vue policy single-source 설계와 summary duplicate 제거
- [ ] (P0) direct policy summary .html의 upload/public 노출 제거
- [ ] (P0) 운영 CloudFront 함수 association과 최신 /fonts/, /product/all behavior 검증
- [ ] (P0) 쿠키/CORS/CSRF/보안 헤더의 백엔드·CloudFront 운영 설정 검증
- [ ] (P1) 공통 API timeout과 오류 추적 전략 결정
- [ ] (P1) Vitest 기반 auth guard, guest cart, payment callback 핵심 테스트 추가
- [ ] (P1) KakaoPay 단일 정책 확정 후 Toss/NaverPay dead path 정리 여부 결정
- [ ] (P2) Google/direct socialAuth helper 유지 여부 결정
