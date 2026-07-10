# SEO와 Prerender 가이드

현재 기준 감사일: 2026-07-10

ShakiShakiArchive는 Vue SPA 위에 build-time static layer를 둔다. Static layer는 backend catalog/SEO endpoint에 의존한다.

## 1. Source of Truth

- Site URL: scripts/prerender/config.js
- Orchestration: scripts/prerender/index.js
- Backend fetch: scripts/prerender/api.js
- Meta/JSON-LD: scripts/prerender/meta.js
- FAQ body: scripts/prerender/faq.js
- Product/category body: scripts/prerender/productBody.js
- Policy summary: scripts/prerender/staticPages.js
- Sitemap: scripts/prerender/sitemap.js
- URL rewrite: cloudfront-function.js
- Crawl rule: public/robots.txt
- LLM summary: public/llms.txt

과거 scripts/prerender.js 경로를 사용하지 않는다. 현재 구현은 scripts/prerender/에 분리되어 있다.

## 2. Build Flow

    npm run build:full
      -> npm run build
      -> dist/index.html load
      -> products/categories fetch
      -> page SEO data fetch
      -> meta/canonical/JSON-LD/static body inject
      -> page HTML write
      -> sitemap.xml write
      -> llms.txt Last-Updated
      -> assertComplete

Backend endpoint 목록:

- /api/products?page=N&limit=100
- /api/categories
- /api/seo/home
- /api/seo/faq
- /api/seo/categories/:slug
- /api/seo/products/:id

## 3. Fail-Closed 완전성

assertComplete는 다음 group 전체를 검사한다.

- home
- FAQ
- policy
- categories
- products
- sitemap
- llms

각 group에서 generated와 attempted가 다르거나 failed가 있으면 전체 실패다. sitemap/llms 실패도 exit code 1이다.

불완전한 SEO artifact를 배포해 이전 정상 file을 삭제하는 것보다 build를 중단하는 것이 우선이다.

## 4. Generated Artifact

| 개념 | 생성 file | 현재 서빙 판단 |
| --- | --- | --- |
| home | index.html | root SPA/prerender meta |
| FAQ | faq.html | /faq에서 사용 |
| terms | terms.html | extensionless route에는 미사용, direct file 노출 가능·권위 사용 금지 |
| privacy | privacy.html | extensionless route에는 미사용, direct file 노출 가능·권위 사용 금지 |
| category | product/{slug}.html | 실제 backend category만 사용 |
| product | productDetail/{slug-or-id}.html | slug 우선 |
| discovery | sitemap.xml | public URL 목록 |

Vue mount 시 injected body는 application UI로 교체된다.

## 5. Policy Single Source

Browser에서 보여 주는 현재 정책 원문:

- src/pages/static/TermsOfService.vue
- src/pages/static/PrivacyPolicy.vue

staticPages.js의 terms/privacy body는 원문을 그대로 생성한 결과가 아니라 별도 요약 복제본이다.

Single-source 결정 전 금지:

- /terms -> /terms.html rewrite
- /privacy -> /privacy.html rewrite
- summary HTML을 canonical/legal source로 사용
- summary 내용만 수정하고 Vue 원문과 동기화됐다고 가정

현재 CloudFront fallback은 /terms와 /privacy를 /index.html로 보내 Vue 원문을 제공한다. 이 behavior를 유지한다.

남은 위험: deploy pipeline은 summary .html을 S3에 upload하고 function은 .html 요청을 그대로 통과시킨다. 따라서 direct /terms.html과 /privacy.html은 접근 가능할 수 있다. Single-source 해결 전 해당 URL을 link/indexing source로 사용하지 말고 duplicate artifact 생성 또는 public 노출을 제거해야 한다.

## 6. Meta Output

generateMetaTags가 생성하는 항목:

- page title
- description
- backend openGraph.url이 있을 때 canonical
- Open Graph title/description/url/type/site name/locale/image
- Twitter card
- 하나 이상의 JSON-LD script

Text는 HTML escape하고 JSON-LD의 closing script sequence를 escape한다. Product SEO fact의 authority는 backend response다.

## 7. Canonical URL

- Product: /productDetail/:slug
- Category: /product/:category
- UUID product entry는 slug가 있으면 canonical route로 replace
- Sitemap은 product.slug 우선, 없으면 id fallback

/product/all은 frontend 합성 목록이며 backend category가 아니다. product/all.html을 생성·가정하지 않고 CloudFront에서 /index.html로 보낸다.

## 8. CloudFront Rewrite

현재 function:

- /assets/와 /fonts/ 통과
- static extension 통과
- /product/all -> /index.html
- actual /product/{slug} -> .html
- /productDetail/{slug} -> .html
- /faq -> /faq.html
- /terms, /privacy 포함 기타 route -> /index.html
- direct .html request -> 그대로 통과하므로 policy summary 노출 가능

Function publish/association은 GitHub deploy workflow에 포함되지 않는다.

## 9. Sitemap

sitemap.xml 포함 범위:

- home, FAQ, policy, About, Notice
- all-products, Sold Archive, Journal
- slug가 있는 backend category
- available product
- product image URL
- 신뢰 가능한 date가 있을 때 lastmod

Backend data에 따라 URL 수가 변한다. 고정 count를 보장하지 않는다.

Sitemap에 /terms와 /privacy가 존재해도 generated policy summary를 서빙해야 한다는 의미는 아니다. Route는 SPA Vue 원문을 제공한다.

## 10. robots.txt와 noindex

public/robots.txt는 public crawl을 허용하고 admin, auth, account, cart, order, payment 등 private flow를 disallow한다.

S3/CloudFront fallback은 unknown route에도 HTTP 200을 줄 수 있어 NotFound route가 noindex,nofollow로 색인 오염을 완화한다. 진짜 HTTP 404를 만드는 것은 아니다.

## 11. llms.txt

public/llms.txt는 public site summary와 policy link를 제공한다. Prerender는 dist copy의 Last-Updated를 갱신한다.

Business fact와 policy value는 실제 product policy와 Vue policy 원문을 기준으로 review한다. Code 존재만으로 운영 사실을 증명하지 않는다.

## 12. IndexNow

scripts/indexnow-ping.js:

- dist/sitemap.xml 읽기
- home과 최근 2일 URL 선택
- 최대 500 URL
- IndexNow endpoint POST
- HTTP 200/202 성공 처리
- 실패가 deploy를 막지 않음

Key는 protocol상 public이며 public/{key}.txt와 일치한다.

## 13. Invalidation

Selective invalidation은 FAQ, terms, privacy의 extensionless path와 .html path를 모두 포함한다.

- FAQ는 prerender HTML cache 갱신
- terms/privacy는 SPA route/index 및 stale artifact cache 정리
- invalidation 포함 자체는 policy summary 서빙 승인이 아님

## 14. Analytics와 Sharing

- VITE_GA_ID가 있으면 GA4 script와 router page_view 활성
- VITE_KAKAO_APP_KEY가 있으면 product detail Kakao share 초기화
- index.html Kakao SDK는 pinned version과 integrity 사용

이 기능 존재는 search indexing 성공 증거가 아니다.

## 15. 검증

Local gate:

    npm run verify
    node --check cloudfront-function.js

Backend가 준비된 경우:

    npm run build:full
    rg -n "<h1|canonical|application/ld\\+json" dist/faq.html dist/product dist/productDetail
    rg -n "<url>|<loc>" dist/sitemap.xml

Unit-like fixture에서는 하나의 category/product/FAQ 실패가 non-zero exit을 만드는지 확인한다.

실제 production fetch, AWS function publish, deploy는 별도 승인 범위다.

## 16. Historical Unsafe Guide

CLOUDFRONT_SETUP.md와 terraform/TERRA_SETUP_GUIDE.md는 ignored historical snapshot이다. 그 안의 rewrite code나 AWS/Terraform 절차를 current guide로 사용하지 않는다.

## 17. Needs Verification

- GSC ownership와 sitemap 제출
- Naver Search Advisor ownership와 sitemap/RSS 제출
- feed endpoint와 Merchant Center 등록
- deployed CloudFront function version/association
- actual indexed URL, impression, Core Web Vitals
- backend content-update dispatch
- policy single-source 생성 방식
- direct policy summary .html 제거

관련 문서: [SEO/GEO Status](docs/SEO_GEO_IMPROVEMENT_PLAN.md), [Project Memory](MEMORY.md).
