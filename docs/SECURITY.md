# 보안 현황

현재 기준 감사일: 2026-07-10

이 문서는 frontend repository에서 확인된 사실만 기술한다. 보안 인증서, OWASP 준수 선언, 배포된 backend/CDN 설정의 증명이 아니다.

## 1. Trust Boundary

신뢰하지 않는 입력:

- route params와 query string
- form field
- backend response
- OAuth/payment callback params
- localStorage/sessionStorage
- third-party SDK message와 popup state
- prerender에 사용되는 product/SEO data

백엔드가 권위 있게 검증해야 하는 항목:

- identity와 session validity
- resource ownership과 admin authorization
- order total, shipping, stock, refund amount
- payment provider confirmation과 idempotency
- upload type/size와 storage authorization

## 2. 구현된 Frontend Control

### Session

- API request는 credentials: include를 사용한다.
- /api/auth/user에서 현재 identity를 로드한다.
- auth state는 Pinia에 유지한다.
- logout은 backend에 session 무효화를 요청하고 API cache와 임시 browser storage를 정리한다.
- 활성 설계는 localStorage token을 인증 근거로 사용하지 않는다.

Secure, HttpOnly, SameSite, expiry, server-side invalidation은 backend/deployment 검증 대상이다.

### Navigation

- 보호 route는 requiresAuth를 선언한다.
- admin route는 requiresAdmin도 선언한다.
- UUID 상품 route는 slug canonical route로 교체한다.
- OAuth returnUrl은 같은 origin의 slash-prefixed relative path만 허용한다.
- NotFound는 noindex,nofollow를 설정한다.

Route guard는 UI 접근을 보조할 뿐 직접 API call을 막지 못한다.

### Output

- Vue interpolation은 기본적으로 text를 escape한다.
- 2026-07-10 source audit에서 src 아래 v-html, innerHTML, eval, new Function 사용은 발견되지 않았다.
- prerender text는 escapeHtml과 escapeXml을 사용한다.
- JSON-LD는 closing script sequence를 escape한다.

새 raw HTML rendering을 추가하려면 sanitizer와 허용 source policy가 필요하다.

### API Cache

다음 endpoint group은 no-cache 대상이다.

- cart
- orders
- user
- admin
- addresses
- inquiries
- current user

Logout은 전체 API cache를 비운다. 공개 data cache는 memory-only다.

### Login과 2FA UX

- Login.vue의 Axios client는 5초 timeout을 사용한다.
- 일반 인증 오류는 계정 존재 여부를 드러내지 않는 메시지로 정규화한다.
- 429, server, network 오류를 구분한다.
- admin login은 backend challenge와 code verification을 처리한다.

Attempt limit, challenge expiry, replay 방지는 백엔드가 강제해야 한다.

## 3. Browser Storage

localStorage:

- guest cart
- OAuth popup/result marker
- payment popup/result/current-order marker
- 짧은 duplicate-processing marker

sessionStorage:

- OAuth reauthentication state와 임시 form
- direct purchase
- product view dedupe
- stale chunk reload guard

위 값은 same-origin JavaScript가 읽고 사용자가 수정할 수 있다. XSS가 발생하면 노출·변조될 수 있으므로 backend는 product, amount, order ID, callback, permission을 모두 재검증해야 한다.

Access token, payment secret, 불필요한 개인정보를 browser storage에 추가하지 않는다.

## 4. Environment와 Secret

- 모든 VITE_ 값은 public browser bundle에 포함된다.
- .env.example에는 공개 가능한 placeholder만 둔다.
- 실제 .env, GitHub Secrets를 읽거나 log/commit하지 않는다.
- OAuth client secret, payment secret, private API key, admin secret은 backend secret manager 영역이다.

공개 client ID도 provider의 domain restriction과 callback allowlist가 필요하다.

## 5. Third-Party Script

현재 browser integration:

- index.html의 pinned Kakao SDK와 integrity attribute
- optional Google Analytics
- runtime-loaded Daum postcode
- order/payment route의 provider SDK

checked-in Kakao tag 외 dynamic SDK에는 눈에 보이는 SRI가 없다. SDK 변경 시 CSP allowlist, source URL, privacy impact를 검토한다.

## 6. Prerender와 배포 무결성

scripts/prerender/index.js의 assertComplete는 home, FAQ, policy, category, product, sitemap, llms 결과를 모두 검사한다.

- generated와 attempted가 다르면 실패
- failed entry가 있으면 실패
- sitemap/llms 실패도 전체 실패
- process exit code 1로 S3 upload 전 차단

이는 partial artifact가 S3 sync --delete를 통해 이전 정상 HTML을 지우는 위험을 낮춘다.

cloudfront-function.js는 /assets/와 /fonts/ 및 정적 확장자를 그대로 통과시킨다. 폰트나 asset request가 index.html로 rewrite되어 MIME/content confusion이 생기지 않도록 하는 경계다.

## 7. 정책 문서 Single Source 위험

권위 원문은 현재 Vue page다.

- src/pages/static/TermsOfService.vue
- src/pages/static/PrivacyPolicy.vue

scripts/prerender/staticPages.js에는 별도 요약 HTML이 있으며 원문과 동일하지 않다. 법적·개인정보 고지가 서로 달라질 수 있으므로:

- generated terms.html/privacy.html을 권위 policy로 간주하지 않는다.
- /terms, /privacy를 해당 file로 CloudFront rewrite하지 않는다.
- single-source 생성이 확정될 때까지 SPA fallback으로 Vue 원문을 제공한다.
- SEO canonical 본문, 고객 고지, 사고 대응 근거로 summary를 사용하지 않는다.

Selective invalidation에 terms/privacy가 포함되어도 이 서빙 금지선은 바뀌지 않는다.

현재 기술적 gap: workflow는 summary .html을 upload하고 CloudFront function은 explicit .html을 통과시키므로 direct URL이 공개될 수 있다. 이는 privacy/legal drift 노출 위험이다. Single-source 해결 전 link 금지와 함께 duplicate artifact 생성·upload 제거가 필요하다.

## 8. 현재 Gap

### Security Header와 CSP

배포된 Content-Security-Policy, Permissions-Policy, frame-ancestors, 전체 security header policy가 source-controlled되어 있지 않다. 실제 public response로 검증해야 한다.

### CSRF

credentialed mutation을 사용하지만 공통 CSRF token header flow는 frontend에 없다. API Gateway가 X-CSRF-Token header를 허용하는 것만으로 방어가 되지 않는다.

백엔드 SameSite/origin validation/token 전략은 Needs Verification이다.

### Request Timeout

공통 apiRequest fetch wrapper에는 명시적 timeout이 없다. 새 외부 호출은 bounded timeout을 포함해야 하며 공통 AbortController 정책이 필요하다.

### 자동 Security Gate

workflow에 없는 항목:

- npm audit gate
- dependency update automation
- SAST/DAST
- browser security test
- project-specific secret scan

2026-07-10 npm audit 결과:

- 전체: form-data와 vite high 2건
- production-only: form-data high 1건

자동 fix는 적용하지 않았다. dependency/lockfile upgrade와 build regression 검토가 필요하다.

### Runtime Visibility

frontend error tracker가 없고 production build는 console/debugger를 제거한다. browser incident 근거가 부족할 수 있다.

### Dormant Integration

Google/direct SDK helper는 활성 verified route가 없다. 현재 UI는 KakaoPay만 제공하지만 Toss/NaverPay compatibility path가 남아 있다.

## 9. 검증 명령

Local 검증:

    npm run verify
    npm audit
    rg -n "v-html|innerHTML|eval\\(|new Function" src scripts
    rg -n "VITE_[A-Z0-9_]+" src scripts .github

CloudFront function syntax:

    node --check cloudfront-function.js

실제 production header, auth, payment 검증은 별도 승인된 운영 점검에서 수행한다.

## 10. Release Checklist

- diff에 secret/실제 env 값 없음
- npm run verify 통과
- dependency 변경 시 npm audit 검토
- 새 VITE_ key를 .env.example에 추가
- 외부 script 변경 시 CSP/SRI/privacy 영향 검토
- auth/admin은 backend 권한 검증
- payment callback/idempotency 시나리오 검증
- prerender incomplete fixture가 non-zero로 실패
- policy route가 summary HTML로 rewrite되지 않음
- production deploy 전 main push 영향 확인

## 11. Historical Unsafe 문서

다음 ignored local guide는 current 설정과 불일치하므로 명령·secret 이름·CloudFront/Terraform 절차를 실행하지 않는다.

- CLOUDFRONT_SETUP.md
- terraform/TERRA_SETUP_GUIDE.md

현재 절차는 README.md, DEPLOY.md, docs/DEVOPS.md, tracked source를 따른다.

## 12. Needs Verification

- production session cookie flag
- CSRF defense
- CORS allowlist
- CloudFront security header
- backend rate limit와 request size limit
- upload validation
- payment webhook signature/idempotency
- deployed dependency 상태
- Vue policy를 single source로 prerender하는 방법
- direct policy summary .html의 public 노출 제거

관련 문서: [Architecture](ARCHITECTURE.md), [Backend Contract](../BACKEND_GUIDE.md), [Project Memory](../MEMORY.md).
