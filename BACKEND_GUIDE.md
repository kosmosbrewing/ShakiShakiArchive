# 프런트엔드-백엔드 Contract

현재 기준 감사일: 2026-07-10

이 문서는 ShakiShakiArchive frontend가 현재 호출하는 backend contract를 요약한다. Backend 구현, DB schema, secret, migration, 운영 배포의 단일 진실 소스는 별도 ShakiShakiArchiveBackend 저장소다.

## 1. 연결 Contract

- Browser API base: VITE_API_URL, 기본값 http://localhost:8080
- Prerender API base: process.env.VITE_API_URL, 기본값 http://localhost:8080
- Authentication: cookie session
- Browser request: credentials include
- JSON request: Content-Type application/json
- Upload: multipart FormData
- Login.vue Axios timeout: 5초
- 공통 src/lib/api.ts timeout: 현재 없음

Cross-origin 환경에서는 backend가 정확한 frontend origin을 credentials와 함께 허용해야 한다. Credentialed cookie와 wildcard origin은 함께 사용할 수 없다.

## 2. Error Contract

공통 client는 다음 error field를 처리한다.

    { "message": "..." }

또는:

    { "error": "..." }

Non-2xx response는 status와 response data를 가진 ApiError가 된다. Payment confirm은 STOCK_SHORTAGE와 INSUFFICIENT_STOCK, shortageItems도 해석한다.

백엔드 response에 stack trace, SQL detail, secret configuration을 포함하지 않는다.

## 3. 활성 Authentication Surface

Email/session:

- /api/auth/signup
- /api/auth/login
- /api/auth/logout
- /api/auth/user
- /api/auth/password
- /api/auth/reset-password
- /api/auth/verify-password
- /api/auth/send-verification
- /api/auth/verify-email
- /api/auth/check-verification
- /api/auth/admin-2fa/challenge
- /api/auth/admin-2fa/verify

Backend-owned OAuth entry:

- /api/oauth/naver/login
- /api/oauth/kakao

Browser callback route는 /oauth/callback이다. Login/Signup UI에는 Naver와 Kakao가 노출된다. Google은 frontend compatibility helper만 있고 활성·검증된 contract가 아니다.

## 4. 공개 Catalog와 Search

- /api/products, /api/products/:id
- /api/products/:id/view
- /api/products/:id/variants
- /api/variants/:id/measurements
- /api/categories
- /api/site-images와 type별 site-image route
- /api/search/address
- /api/search/keyword
- /api/constants, /api/constants/shipping, /api/constants/validation

Product list preferred response:

- products array
- pagination.page, limit, total, totalPages, hasMore

Frontend는 legacy array response도 일부 호환한다. Prerender는 page/limit으로 전체 product를 수집하고 pagination.hasMore를 따른다.

Product detail은 frontend 사용상 UUID 또는 slug를 받을 수 있어야 한다. Router는 product.slug가 있으면 UUID entry를 slug route로 교체한다.

## 5. Member Commerce

- /api/cart, /api/cart/:itemId
- /api/wishlist, /api/wishlist/:productId
- /api/user/addresses, /api/user/addresses/:addressId
- /api/stock/reserve, /api/stock/reserve/:reservationId
- /api/orders, /api/orders/:orderId
- /api/orders/:orderId/status/paying
- /api/orders/:orderId/cancel
- /api/orders/:orderId/partial-cancel
- /api/orders/:orderId/items/:itemId/confirm
- /api/returns, /api/returns/:returnId
- /api/returns/:returnId/tracking

Order, address, cart, wishlist, return data는 frontend API cache에 저장하지 않는다.

## 6. Payment Surface

Generic/Toss compatibility:

- /api/payments/client-key
- /api/payments/confirm
- /api/payments/:orderId/cancel
- /api/payments/:orderId/status

NaverPay compatibility:

- /api/payments/naverpay/sdk-config
- /api/payments/naverpay/:orderId/status
- /api/payments/naverpay/:orderId/cancel
- /api/naverpay-order/sdk-config
- /api/naverpay-order/register
- /api/naverpay-order/wishlist

KakaoPay:

- /api/payments/kakaopay/client-info
- /api/payments/kakaopay/ready

현재 checkout UI는 KakaoPay만 노출한다. Client function이 존재한다는 사실만으로 사용자에게 제공되는 결제 수단으로 문서화하지 않는다.

Backend는 order amount, inventory, payment approval, callback verification, idempotency, refund amount의 최종 authority다.

## 7. Inquiry와 Admin Surface

Inquiry:

- /api/inquiries
- /api/inquiries/my/list
- /api/inquiries/:id
- /api/inquiries/:id/replies
- /api/inquiries/:id/status

Admin:

- /api/admin/products, variants, measurements
- /api/admin/categories
- /api/admin/orders, order items
- /api/admin/payments
- /api/admin/images
- /api/admin/site-images
- /api/admin/inquiries
- /api/admin/users, role update
- /api/admin/analytics/overview
- /api/admin/email-preview

모든 /api/admin endpoint는 backend authorization을 강제해야 한다. Frontend user.isAdmin과 route meta는 보안 통제가 아니다.

## 8. SEO Build Contract

npm run build:full이 요구하는 backend endpoint:

- GET /api/products?page=N&limit=100
- GET /api/categories
- GET /api/seo/home
- GET /api/seo/faq
- GET /api/seo/categories/:slug
- GET /api/seo/products/:id

SEO response는 openGraph와 optional jsonLd를 제공해야 한다. FAQ는 FAQPage mainEntity가 필요하며 product/category static body는 JSON-LD 값을 사용한다.

## 9. Fail-Closed 영향

Prerender는 일부 backend SEO response 누락을 허용하지 않는다.

- home, FAQ, category, product 결과가 incomplete면 실패
- sitemap 또는 llms 갱신 실패도 전체 실패
- process exit code 1로 deploy step 진입 차단

따라서 backend outage, pagination contract mismatch, SEO data 누락은 production build failure로 이어진다. Why: partial artifact를 upload해 이전 정상 HTML을 지우는 것보다 안전하게 중단하는 것이 우선이다.

## 10. Policy Page 경계

terms/privacy browser 원문은 frontend Vue page에 있다. scripts/prerender/staticPages.js의 policy summary는 backend API contract가 아니며 Vue 원문과 동일하지 않다.

- Backend가 summary를 권위 정책으로 간주하면 안 된다.
- /terms, /privacy를 generated summary HTML로 rewrite하지 않는다.
- single-source 결정 전 frontend SPA의 Vue 원문을 유지한다.
- direct policy .html summary는 공개될 수 있으므로 backend나 feed가 link하지 않는다.

## 11. Contract 변경 Checklist

1. Backend schema/handler/test 수정
2. src/types/api.ts 갱신
3. src/lib/api.ts와 cache policy 갱신
4. error shape와 authorization failure 검증
5. 영향받는 Login/Signup/OAuth/payment callback 검증
6. npm run verify
7. SEO contract 변경이면 target backend에서 npm run build:full
8. 이 문서와 MEMORY.md 갱신

## 12. Historical Unsafe 문서

CLOUDFRONT_SETUP.md와 terraform/TERRA_SETUP_GUIDE.md는 ignored historical snapshot이다. Backend route/origin, secret 이름, deploy 절차의 근거로 사용하지 않는다.

## 13. Needs Verification

- production cookie Secure, HttpOnly, SameSite, domain
- CSRF protection
- production CORS allowlist
- rate limiting과 request size limit
- payment webhook signature와 idempotency
- Naver/Toss compatibility 유지 정책
- backend content-update dispatch
- feed endpoint와 외부 console 등록

이 항목은 backend repository와 deployed environment에서 확인해야 한다.

관련 문서: [Frontend Guide](FRONTEND_GUIDE.md), [Security](docs/SECURITY.md), [SEO Guide](SEO_GUIDE.md).
