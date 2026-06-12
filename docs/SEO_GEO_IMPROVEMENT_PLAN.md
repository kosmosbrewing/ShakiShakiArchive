# SEO/GEO 전수 조사 결과 및 개선 계획

> 작성일: 2026-06-11 · 상태: **Phase 1~2 코드 구현 완료 (2026-06-11), 배포 + 운영 작업 대기**
>
> 배포 전 필요한 운영 작업:
> 1. GitHub fine-grained PAT 발급 → App Runner 환경변수 `GITHUB_DISPATCH_TOKEN` 등록 (미설정 시 자동 재빌드만 비활성, 서비스 무영향)
> 2. Google Search Console 등록 (DNS TXT 권장) + sitemap 제출
> 3. 네이버 서치어드바이저에 RSS 제출: `https://shakishakiarchive.com/api/feeds/rss.xml`
> 4. 구글 머천트 센터 가입 → 피드 등록: `https://shakishakiarchive.com/api/feeds/google-merchant.xml`
> 5. (선택) 쇼핑파트너존 입점 후 EP 등록: `https://shakishakiarchive.com/api/feeds/naver-ep.txt`
> 배경: 자연(오가닉) 유입 ≈ 0. 전수 조사 + 운영 사이트 직접 검증 완료.

---

## 1. 전수 조사 요약

### 이미 잘 갖춰진 것 (변경 불필요)

- **프리렌더링**: `scripts/prerender.js`가 빌드 시 모든 상품/카테고리/정적 페이지의 완전한 HTML 생성 (meta, OG, canonical, JSON-LD 주입). S3+CloudFront 배포
- **JSON-LD 6종**: Organization+ClothingStore, WebSite, FAQPage, BreadcrumbList, Product(offers/shippingDetails/hasMerchantReturnPolicy/UsedCondition), ItemList — 백엔드 `server/utils/seo.ts`(664줄)에서 생성
- **sitemap.xml**: prerender 시 생성, 상품 lastmod + image:image 포함 (147 URL, 상품 133개)
- **robots.txt**: GPTBot/ClaudeBot/PerplexityBot/CCBot 등 AI 크롤러 명시 허용 + Sitemap 지시자
- **llms.txt**: 존재, Last-Updated 자동 갱신
- 네이버 서치어드바이저 인증 메타 태그 있음 (`index.html`)
- 확장자 없는 URL(`/productDetail/{slug}`)이 프리렌더 HTML로 정상 서빙됨 — **curl로 검증 완료, 유입 0의 원인 아님**

### 검증으로 확인된 실제 문제 4가지

| # | 문제 | 검증 결과 | 영향 |
|---|------|----------|------|
| 1 | **프리렌더 HTML 본문이 비어 있음** | `<div id="app"></div>` — meta/JSON-LD만 있고 텍스트 0 | "크롤링됨-색인 안 됨"의 유력 원인 (얇은 콘텐츠) |
| 2 | **신선도 갭** | sitemap 최신 lastmod 2026-05-22 (확인 시점 기준 3주 전). main push 시에만 재빌드 | 신상품 등록돼도 검색엔진이 모름 |
| 3 | **soft 404** | 없는 URL이 HTTP 200 + 홈 HTML 반환 | 색인 품질 신호 저하 |
| 4 | **노출 채널 부재** | 구글 머천트/네이버 쇼핑 피드 없음, RSS 없음, google-site-verification 미확인, IndexNow 없음 | 쇼핑몰 트래픽 주력 채널 미가동 |

### 결정 사항

- **sold 상품 페이지**: `/archive/sold` 화면으로 별도 관리 중 → **현행 유지, 변경 없음** (2026-06-11 사용자 결정)
- **useHead(동적 meta 라이브러리) 도입**: 보류 — 크롤러는 프리렌더 HTML을 직접 받으므로 실익 없음

---

## 2. Phase 0 — 진단 (코드 외, 사용자 직접 확인)

1. **Google Search Console** 등록 여부 확인 → 미등록이면 도메인 속성 + DNS TXT 등록 (코드 0줄)
   - 색인 페이지 수 vs sitemap 147개 비교, 미색인 사유 분포 확인
   - "크롤링됨-색인 안 됨" 다수면 → Phase 2-1(본문 주입)이 핵심 해결책
   - "노출 0" vs "노출 있고 클릭 0" 구분 (대응이 다름)
2. **네이버 서치어드바이저**: 사이트맵/RSS 제출 여부, 수집 현황 리포트, 핵심 페이지 5개 수동 수집 요청
3. **수동 확인**: 구글/네이버 `site:shakishakiarchive.com` 결과 수, 브랜드명 검색 노출 여부, Google Rich Results Test 상품 1개

---

## 3. Phase 1 — 즉효 (코드 작업, ~1주)

### 1-1. 신선도 자동화: 상품 변경 시 자동 재빌드 (효과 상 / 난이도 하)

- **프론트** `.github/workflows/deploy.yml`: `on:`에 `repository_dispatch: types: [content-update]` 추가
- **백엔드 신규** `server/services/searchPing.service.ts` (~100줄):
  - 디바운스(마지막 mutation 후 10분 뒤 1회) 후 GitHub API `POST /repos/{owner}/{repo}/dispatches` 호출
  - App Runner 단일 인스턴스 → in-memory setTimeout으로 충분
  - 환경변수 `GITHUB_DISPATCH_TOKEN`(fine-grained PAT), `server/config/index.ts`에 추가. 토큰 없으면 no-op
- **훅 지점** `server/routes/admin/product.routes.ts`: POST(line 60)/PATCH(line 100)/DELETE(line 134) 끝에 `scheduleRebuild()` 1줄씩 (fire-and-forget, 실패해도 응답 무영향)

### 1-2. IndexNow 색인 핑 (효과 중상 / 난이도 하) — 네이버/빙 즉시 색인

- 32자 hex 키 생성 → 프론트 `public/{key}.txt` (내용=키)
- **프론트 신규** `scripts/indexnow-ping.js` (~80줄): dist/sitemap.xml 파싱 → lastmod 최신 URL + 홈/카테고리 추출 → `POST https://api.indexnow.org/indexnow` (`{host, key, keyLocation, urlList}`)
- `deploy.yml`: CloudFront 무효화 완료 **후** 핑 스텝 추가 (페이지가 실존한 뒤 핑). 키는 GitHub secret `INDEXNOW_KEY`
- 1-1과 결합: 상품 등록 → 10분 내 재빌드 → 배포 → 색인 핑까지 전자동

### 1-3. h1/시맨틱 보강 (효과 중 / 난이도 최하)

- `ProductDetail.vue`: 상품명 요소를 `<h1>`으로 변경 (현재 h1 없음)
- 카테고리 목록 페이지(`Product.vue`) h1 확인·보강

### 1-4. google-site-verification

- GSC 도메인 속성 + DNS TXT 권장 (코드 0줄). 불가하면 `index.html`에 meta 1줄 (naver 인증 옆)

---

## 4. Phase 2 — 색인 자산 구축 (~2주)

### 2-1. 프리렌더 상품 본문 주입 (효과 상 / 난이도 중) — 문제 #1 해결

- 기존 FAQ 본문 주입 패턴(`injectFaqBodyHtml`, prerender.js:207)을 상품 페이지로 확장
- **프론트 신규** `scripts/prerender/productBody.js` (~150줄): `/api/seo/products/:id` 응답 JSON-LD에서 name/price/description/image/category 추출 → `<main><h1>상품명</h1><p>가격·컨디션</p><img alt>...<nav>브레드크럼 링크</nav></main>`을 `#app`에 주입. Vue 마운트 시 교체 → UX 무영향
- 이 기회에 `scripts/prerender.js`(832줄) → `scripts/prerender/` 디렉토리 분할: `index.js`(오케스트레이션), `meta.js`, `sitemap.js`, `staticPages.js`, `productBody.js`

### 2-2. 구글 머천트 피드 — 무료 리스팅 (효과 상 / 난이도 중 / 광고비 0원)

- **백엔드 신규** `server/routes/feed.routes.ts` (~60줄): `GET /feeds/google-merchant.xml`, `GET /feeds/rss.xml`. `storage.getProducts` + `cacheStrategies` 재사용, `server/routes/index.ts`에 등록
- **백엔드 신규** `server/utils/feeds/googleMerchant.ts` (~150줄): RSS 2.0 + `g:` 네임스페이스
  - 필수: g:id, g:title, g:description, g:link, g:image_link, g:availability, g:price("39000 KRW"), **g:condition=used**(빈티지), g:shipping
  - `seo.ts`의 SITE_CONFIG·URL 생성 로직 재사용
- 운영: 구글 머천트 센터 가입 → 피드 URL(App Runner 도메인) 등록 → 무료 리스팅 활성화

### 2-3. RSS 피드 — 네이버 서치어드바이저 제출용 (효과 중 / 난이도 하)

- **백엔드 신규** `server/utils/feeds/rss.ts` (~100줄): 최신 상품 50개 RSS 2.0 (title/link/description/pubDate=createdAt)
- 운영: 서치어드바이저 > 요청 > RSS 제출 (네이버는 RSS 기반 신규 문서 발견이 sitemap보다 빠른 경우 많음)

### 2-4. soft 404 완화 (효과 하~중 / 난이도 하)

- `NotFound.vue` 진입 시 `<meta name="robots" content="noindex">` 동적 주입 (router.beforeEach ~10줄)
- 진짜 404 상태코드는 정적 호스팅 특성상 한계 — noindex로 색인 오염만 방지

### 2-5. (선택) 네이버 쇼핑 EP 피드 — 한국 쇼핑몰 유입 최대 채널

- 전제: 쇼핑파트너존 입점 신청(사업자등록+통신판매업 신고 필요), CPC 과금 — **운영 결정 필요, 코드는 선구현 가능**
- `server/utils/feeds/naverEp.ts` (~120줄): TSV (UTF-8, 1행 헤더)
  - 필수: id(slug), title(≤100자), price_pc(숫자만), link, image_link, category_name1
  - 권장: **condition=U**(중고), shipping(3500), brand, naver_category, update_time
  - 품절 상품 제외 (네이버 페널티)

---

## 5. Phase 3 — GEO/콘텐츠 복리 (지속)

1. **가이드 페이지 3종**: `/guide/condition`(컨디션 등급 기준), `/guide/sizing`(빈티지 사이즈 가이드), `/guide/care`(소재별 세탁)
   - prerender의 STATIC_POLICY_PAGES 패턴 재사용 → 본문이 정적 HTML로 박제 → AI 인용 가능한 사실성 콘텐츠 (GEO 핵심)
   - FAQPage/Article JSON-LD는 `seo.ts`에 generator 1개 추가
2. **llms.txt 확장**: 카테고리별 한 줄 설명 + 가이드 링크
3. **저널 콘텐츠화**: `/archive/journal` 사진 갤러리 → 입고 소식+스타일링 노트 텍스트 포스트 (롱테일: "[브랜드] 빈티지", "Y2K 코디")
4. **백링크 부트스트랩** (코드 외): 네이버 블로그/플레이스 등록, 빈티지 커뮤니티, 인스타 연계(sameAs 이미 연결됨)

---

## 6. 핵심 파일 맵

| 파일 | 작업 |
|------|------|
| 프론트 `.github/workflows/deploy.yml` | repository_dispatch 트리거 + IndexNow 핑 스텝 |
| 프론트 `scripts/prerender.js` → `scripts/prerender/` | 모듈 분할 + 상품 본문 주입 |
| 프론트 `src/pages/.../ProductDetail.vue` | h1 보강 |
| 백엔드 `server/services/searchPing.service.ts` | **신규** — 재빌드 디스패치 (디바운스) |
| 백엔드 `server/routes/admin/product.routes.ts` | 훅 1줄×3 (POST line 60 / PATCH line 100 / DELETE line 134) |
| 백엔드 `server/routes/feed.routes.ts` + `server/utils/feeds/*` | **신규** — 머천트/RSS/(EP) 피드 |
| 백엔드 `server/utils/seo.ts` | SITE_CONFIG·URL 로직 재사용 (수정 최소) |
| 백엔드 `server/config/index.ts` | `GITHUB_DISPATCH_TOKEN` 환경변수 추가 |

## 7. 검증 방법

1. **신선도**: 상품 PATCH → 디바운스 후 GitHub Actions 트리거 확인
2. **피드**: `curl localhost:8080/feeds/google-merchant.xml` → xmllint / Google Merchant 피드 검증 도구 통과
3. **본문 주입**: `npm run build:full` 후 `dist/productDetail/{slug}.html`에 `<h1>` + 상품 텍스트 존재 확인
4. **IndexNow**: 배포 후 핑 응답 200/202, 며칠 후 빙/네이버 수집 현황 확인
5. **성과**: GSC 색인 수·노출 추이 (효과 발현 2~6주), 서치어드바이저 수집 추이

## 8. 예상 효과

- **단기(2주)**: 색인 수 증가(본문 주입+IndexNow), 신상품 자동 노출
- **중기(1~2개월)**: 구글 쇼핑 탭 무료 노출(머천트), 네이버 수집 가속(RSS)
- **장기**: 가이드 콘텐츠로 GEO(AI 검색 인용) + 롱테일 유입 누적
