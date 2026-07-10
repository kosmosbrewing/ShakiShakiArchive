# 현재 기술 과제와 결정

현재 기준 감사일: 2026-07-10

이 문서는 현재 frontend code에서 확인되는 문제와 선택을 기록한다. 검증되지 않은 production metric이나 backend 구현을 주장하지 않는다.

## 1. Route Code Splitting 회귀 방지

문제:

static route import와 넓은 manual chunk group은 public entry에 admin/payment code를 preload할 수 있다.

현재 설계:

- 모든 route page를 src/router/index.ts에서 dynamic import
- page-domain manual chunk grouping 금지
- vendor match를 vue 문자열이 아닌 path segment로 제한
- Three.js를 home lazy dependency로 분리
- API와 image optimizer를 안정적인 shared chunk로 분리

회귀 규칙:

Router에서 page barrel을 import하지 않는다. Build 후 dist/index.html의 modulepreload에 admin/order page가 없는지 확인한다.

## 2. Stale HTML과 Hashed Lazy Chunk

문제:

브라우저가 old index HTML을 유지한 채 새 deploy의 hash chunk를 요청하면 dynamic import 404가 날 수 있다.

현재 설계:

- asset upload에서 즉시 delete하지 않음
- assets/를 60일 lifecycle로 보존
- router.onError와 vite:preloadError가 같은 sessionStorage guard 사용
- reload는 한 번만 시도
- 성공 navigation에서 guard 해제

트레이드오프:

old asset이 storage를 사용한다. 60일보다 긴 deploy 공백이 있으면 아직 참조되는 asset도 만료될 수 있다.

## 3. Static Asset Rewrite

문제:

CloudFront SPA fallback이 font/image 요청까지 index.html로 바꾸면 MIME mismatch와 전체 font failure가 발생한다.

현재 설계:

- /assets/와 /fonts/ prefix 통과
- js, css, image, font, txt, xml, json 등 정적 확장자 통과
- API prefix 통과

Function test에서는 URI가 변경되지 않는지 확인해야 한다.

## 4. 합성 Category와 실제 Prerender Category

문제:

/product/all은 frontend에서 합성하는 목록이며 backend category가 아니다. 모든 /product/{slug}를 .html로 바꾸면 존재하지 않는 product/all.html을 요청한다.

현재 설계:

- /product/all은 /index.html SPA fallback
- backend가 제공한 실제 category slug만 product/{slug}.html 대상으로 처리

## 5. Live Catalog 기반 SPA SEO

문제:

Vue route content는 base HTML에 없고 product metadata와 catalog는 backend에서 변한다.

현재 설계:

- build:full이 paginated product와 category를 수집
- page별 SEO API에서 Open Graph와 JSON-LD 수신
- FAQ/product/category body 주입
- sitemap과 llms date 생성
- CloudFront function이 FAQ/category/product detail을 static HTML에 연결

트레이드오프:

- backend availability와 data 시점에 build가 의존
- output이 시간에 따라 달라짐
- function publication은 deploy.yml 밖의 운영 작업

## 6. Incomplete Prerender 차단

문제:

개별 page 실패를 warning으로만 처리하면 partial dist가 성공 배포되고 S3 sync --delete가 이전 정상 file을 제거할 수 있다.

현재 설계:

assertComplete는 모든 page group, sitemap, llms 결과를 검사해 하나라도 incomplete면 exit code 1로 중단한다.

검증 과제:

- mock failure에서 non-zero exit 확인
- empty category/product가 정상 empty인지 API 오류인지 구분
- 실패 후 upload step이 실행되지 않는지 workflow 수준 확인

## 7. 정책 Summary와 Vue 원문 Drift

문제:

staticPages.js가 자체 terms/privacy 요약을 보유하고 Vue page도 별도 원문을 보유한다. 두 사본은 동일하지 않아 법적·privacy 고지가 drift한다.

현재 결정:

- Vue page를 사용자에게 보이는 원문으로 취급
- /terms와 /privacy는 SPA fallback
- generated summary HTML로 CloudFront rewrite 금지
- single-source 결정 전 summary를 canonical/legal source로 사용 금지

남은 gap:

- direct .html request는 pass-through되므로 summary file이 공개될 수 있음
- duplicate artifact 생성/upload 제거가 필요

향후 선택:

- Vue 원문에서 build-time HTML을 생성하거나
- 공통 structured policy source에서 Vue/prerender를 함께 생성

## 8. Cookie Session과 Guest Cart

문제:

anonymous user는 server identity 없이 cart가 필요하고 login 후 item을 유지해야 한다.

현재 설계:

- guest_cart는 localStorage
- member cart는 backend
- authStore가 login/session restore 후 순차 migration
- productId와 quantity normalize
- migration attempt 후 local guest data 제거

트레이드오프:

일부 migration 실패 시 local item이 사라질 수 있다. retry/reconciliation이 필요한지 제품 결정이 필요하다.

## 9. Popup과 Redirect 결제 복구

문제:

desktop popup, popup block, mobile redirect, focus/back, provider callback의 lifecycle이 다르다. 중복 callback이 business side effect를 반복하면 안 된다.

현재 설계:

- Order.vue가 transient provider/order marker 저장
- PaymentCallback.vue가 success/fail/cancel과 popup handoff 처리
- processed marker로 반복 처리 완화
- keepalive 기반 best-effort order cleanup
- UI에는 KakaoPay만 노출

Browser flag와 query param은 hint일 뿐이다. backend provider status, amount, ownership, idempotency가 최종 상태를 결정한다.

## 10. 빠른 Mount와 Backend Constants

문제:

mount 전 constants를 기다리면 first paint가 늦지만 shipping/payment 계산은 정확한 값이 필요하다.

현재 설계:

- app을 먼저 mount
- constants를 background load
- 일반 UI는 FALLBACK_CONSTANTS 사용 가능
- concurrent load는 같은 Promise 공유
- Order.vue는 ensureLoaded로 critical calculation 전 대기

Fallback이 backend와 drift할 수 있으므로 결제 경로의 ensureLoaded를 제거하지 않는다.

## 11. Public Cache와 Private Data

문제:

catalog call은 cache 이점이 있지만 user/order data cache는 leakage와 stale commerce risk를 만든다.

현재 설계:

- category/product/site image/constants만 bounded memory TTL
- sensitive endpoint pattern은 noCache 강제
- mutation 후 관련 public cache invalidate
- logout에서 전체 cache clear

새 sensitive route를 추가할 때 NEVER_CACHE_PATTERNS도 검토한다.

## 12. Historical Unsafe Guide

CLOUDFRONT_SETUP.md와 terraform/TERRA_SETUP_GUIDE.md는 현재 source와 불일치하는 ignored historical snapshot이다. 그 안의 function code, secret 이름, origin/Terraform 명령을 실행하지 않는다.

## 13. 다음 과제

- common API timeout
- auth guard, cart migration, payment callback test
- fail-closed prerender fixture 자동화
- policy single-source
- payment provider surface 확정과 dormant path 정리
- CloudFront function publication 절차 자동화/문서화
- 개인정보 filtering을 포함한 frontend error tracking

관련 문서: [Architecture](ARCHITECTURE.md), [Security](SECURITY.md), [Project Memory](../MEMORY.md).
