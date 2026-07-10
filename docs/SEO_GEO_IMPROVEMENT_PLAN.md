# SEO/GEO 현재 현황과 개선 계획

최초 조사: 2026-06-11

현재 코드 감사: 2026-07-10

이 문서는 repository에 구현된 코드와 외부 운영 작업을 분리한다. 검색 노출, 색인 수, traffic 효과는 console/live 측정 없이 코드만으로 추론하지 않는다.

## 1. 구현 완료

- scripts/prerender/ 모듈 구조
- /api/seo/home 기반 home metadata
- FAQ metadata와 static FAQ body
- product metadata와 name/price/description/image/breadcrumb body
- category metadata와 item link body
- staticPages 기반 terms/privacy 요약 artifact 생성
- public/category/available product sitemap과 lastmod/image
- slug product URL과 UUID-to-slug canonical navigation
- product/category h1
- NotFound noindex,nofollow
- robots.txt와 llms.txt
- content-update repository_dispatch trigger
- deploy 후 IndexNow best-effort ping
- incomplete prerender fail-closed gate
- /fonts/ 정적 통과와 /product/all SPA fallback
- selective invalidation의 FAQ/terms/privacy path 포함

## 2. Fail-Closed Prerender

assertComplete(runStats)는 다음 전체가 완전해야 build를 성공시킨다.

- home
- FAQ
- policy
- category
- product detail
- sitemap.xml
- llms.txt

일부 page가 skip되거나 failed가 남으면 process exit code 1이다. 목적은 incomplete dist가 S3 sync --delete로 이전 정상 SEO artifact를 지우는 일을 막는 것이다.

운영 backend data가 필요한 npm run build:full은 backend가 준비된 환경에서만 검증한다.

## 3. CloudFront 현재 Mapping

checked-in function:

- /assets/와 /fonts/ 통과
- 정적 확장자 통과
- /product/all -> /index.html
- 실제 /product/{slug} -> .html
- /productDetail/{slug} -> .html
- /faq -> /faq.html
- 나머지 -> /index.html

/product/all은 backend category가 아니라 frontend 합성 목록이므로 prerender category file을 가정하지 않는다.

## 4. 정책 페이지 Single Source 미해결

scripts/prerender/staticPages.js의 terms/privacy body는 다음 Vue 원문의 요약 복제본이다.

- src/pages/static/TermsOfService.vue
- src/pages/static/PrivacyPolicy.vue

내용이 동일하지 않으므로 generated terms.html/privacy.html을 권위 문서로 서빙하면 안 된다.

single-source 결정 전 정책:

- /terms와 /privacy는 SPA fallback으로 Vue 원문을 제공
- CloudFront rewrite를 terms.html/privacy.html로 추가 금지
- summary를 canonical/legal source로 사용 금지
- search engine 검증 시 Vue 원문을 기준으로 판단

현재 selective invalidation이 /terms, /terms.html, /privacy, /privacy.html을 포함하는 것은 cache 정리 범위다. 권위 문서 승격을 의미하지 않는다.

현재 deploy artifact에는 summary .html이 남고 direct URL이 통과할 수 있다. Single-source 전환 또는 duplicate file 제거 전에는 링크하지 않으며 public 노출 제거를 P0로 둔다.

## 5. 구현됐지만 운영 검증 필요

- backend catalog mutation이 content-update를 실제 전송하는지
- 최신 CloudFront function이 publish/associate되어 있는지
- IndexNow public key가 배포 후 reachable한지
- production FAQ/category/product가 page-specific HTML을 제공하는지
- /fonts/가 올바른 font content type으로 제공되는지
- GSC와 Naver ownership/sitemap 등록
- Merchant/RSS/Naver feed endpoint와 외부 등록

검증 전에는 MEMORY.md의 Needs Verification으로 유지한다.

## 6. 외부 운영 Backlog

P0:

- GSC domain ownership와 sitemap 제출 확인
- Naver Search Advisor ownership와 sitemap/RSS 제출 확인
- submitted 대비 indexed URL과 exclusion reason 수집
- deployed CloudFront function source hash/association 확인

P1:

- Merchant Center feed endpoint와 등록 확인
- backend content-update timing/failure 확인
- IndexNow acceptance와 crawler discovery 관찰
- policy single-source 생성 방식 설계

P2:

- condition, sizing, care guide content의 제품 필요성 결정
- Journal content 전략 결정
- policy 변경 때 llms.txt fact review

## 7. 측정 기준

날짜와 조건을 함께 기록할 항목:

- submitted/indexed URL 수
- exclusion과 soft-404 signal
- impression, click, query group
- rich-result validation
- route class별 Core Web Vitals
- build duration과 failed prerender page 수
- product mutation부터 page/sitemap deploy까지 시간

Historical performance report를 현재 evidence로 재사용하지 않는다.

## 8. Local 검증

backend가 준비된 경우:

    npm run build:full
    rg -n "<h1|canonical|application/ld\\+json" dist/faq.html dist/product dist/productDetail
    rg -n "<loc>|<lastmod>" dist/sitemap.xml

fail-closed fixture는 isolated temp dist와 mock backend 또는 importable assertion harness로 non-zero exit을 확인한다.

실제 AWS/production fetch는 이 문서 갱신 범위에서 수행하지 않는다.

## 9. Historical Unsafe 문서

CLOUDFRONT_SETUP.md와 terraform/TERRA_SETUP_GUIDE.md는 ignored historical snapshot이다. 그 안의 rewrite code, secret 이름, CloudFront/Terraform 명령을 current SEO 운영 절차로 사용하지 않는다.

관련 문서: [SEO Guide](../SEO_GUIDE.md), [Project Memory](../MEMORY.md).
