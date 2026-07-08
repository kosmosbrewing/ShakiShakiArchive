# 품질 개선 백로그 (2026-07-08)

첫 페이지 로딩 워터폴 분석(프로덕션 Network 탭)과 빌드 산출물 검토에서 발견한 개선 항목.
우선순위 순으로 정리.

**진행 현황 (2026-07-08 구현)**: ①③⑤⑥ 완료, ② 적용 명령 확정(배포 안정화 후 실행), ④ 코드상 이미 해결 확인, ⑦ 보류.

**구현 중 발견한 추가 사실**: `manualChunks`의 admin/payment 경로 그룹핑이
스토어·messages·ui 컴포넌트 등 공유 모듈 64개를 payment 청크로 흡수시켜
index 엔트리가 payment를 **정적 import**(→ 첫 로딩 preload)하는 Rollup 동작 확인.
그룹핑을 제거하고 라우트 lazy import 기반 자연 분할로 전환함 (페이지별 개별 청크 생성).
또한 vendor 분기의 `id.includes('vue')`가 radix-vue/lucide까지 삼켜 ui 청크 분기가
죽어 있던 버그를 경로 단위 매칭으로 수정 → ui 청크(105KB)가 실제로 분리됨.

---

## 1. 라우트 Lazy Import 전환 — 첫 로딩 전송량 대폭 축소 (우선순위: 높음)

**현상**: 비로그인 첫 방문자도 `admin.js`(178KB) + `payment.js`(163KB) + 각 CSS를 다운로드함.

**원인**: `src/router/index.ts`가 `Home`을 제외한 전 페이지를 정적 import.
`vite.config.ts`의 `manualChunks`는 청크를 파일로 분리만 할 뿐 로드 시점을 바꾸지 못함
→ 정적 import 그래프에 포함된 청크는 Vite가 `index.html`에 `modulepreload` + CSS `<link>`로 박아넣음.
(vite.config.ts 주석 "일반 사용자는 로드 안함"은 의도일 뿐 실제로는 동작하지 않는 상태)

**개선**:

```ts
// 현재 (정적 — 전부 첫 로딩에 포함)
import { ProductAdmin, ... } from "@/pages/admin";
import { Order, ... } from "@/pages/order";

// 개선 (lazy — 라우트 진입 시에만 로드)
const ProductAdmin = () => import("@/pages/admin/ProductAdmin.vue");
const Order = () => import("@/pages/order/Order.vue");
```

전 라우트를 Home과 동일한 lazy 패턴으로 전환.

**검증**: 빌드 후 `dist/index.html`에서 admin/payment의 `modulepreload`·`stylesheet` 링크가
사라졌는지 확인 + 홈 첫 로딩 워터폴에서 두 청크가 빠졌는지 확인 + 관리자/주문 페이지 진입 시 정상 로드 확인.

**✅ 완료 (2026-07-08)**: 전 라우트 개별 .vue lazy import 전환 + 배럴 파일(`pages/*/index.ts`) 삭제
(배럴 정적 import 재도입으로 lazy가 깨지는 회귀 방지). 첫 로딩 preload는
vendor/api/libs/ui/image-optimizer + index.css만 남음.
**가용성 가드 추가**: 배포 직후 stale index.html 사용자의 lazy 청크 404 대비 —
`router.onError`에서 청크 로드 실패 감지 시 sessionStorage 플래그 기반 1회 전체 리로드
(무한 루프 방지, 성공 내비게이션 시 해제) + `vite:preloadError` 리스너로 CSS/의존 청크 커버.

---

## 2. S3 오래된 빌드 산출물 정리 (우선순위: 중간)

**현상**: 배포 버킷 `assets/`에 1월~7월 빌드 산출물 누적 (`admin.*.js`만 약 70세대).
deploy.yml이 업로드만 하고 이전 해시 파일을 지우지 않음.

**개선**: S3 Lifecycle Rule로 "30일 경과 객체 자동 삭제" 설정 (또는 deploy.yml에 정리 스텝).

**주의**: 배포 직후 전체 삭제(`sync --delete`)는 금지 —
배포 직전에 옛 `index.html`을 받은 사용자가 세션 중 lazy 청크를 요청할 때 404가 나지 않도록
최근 세대는 남겨두는 것이 의도된 순기능임. 30일 유예가 이 문제를 자연스럽게 해결.

**✅ 완료 (2026-07-08)**: deploy.yml에 lifecycle 규칙 보장 스텝(7-2)으로 코드화 —
매 배포마다 멱등 재적용되어 콘솔 설정 유실 시에도 자동 복구됨. 보존 기간 60일
(빌드 산출물은 매 배포마다 재업로드되어 타임스탬프가 갱신되지만,
60일 이상 배포 공백이 생기면 현역 청크도 삭제될 수 있어 여유를 둠).
선행 조건이었던 청크 로드 실패 리로드 가드는 먼저 배포 완료.
주의: `put-bucket-lifecycle-configuration`은 버킷 lifecycle 전체를 교체하므로,
다른 규칙이 필요해지면 deploy.yml의 JSON에 함께 넣어야 함.
적용 확인: `aws s3api get-bucket-lifecycle-configuration --bucket <BUCKET>`

---

## 3. `main.ts` bootstrap의 constants await 제거 — 첫 페인트 단축 (우선순위: 중간)

**현상**: `bootstrap()`이 `await constantsStore.loadConstants()` 완료 후에 `app.mount()`를 호출.
워터폴에서 `constants` API 응답 전까지 흰 화면이 유지되는 것이 실측으로 확인됨
(JS 로드 → constants 왕복 → 그제야 mount → Home 청크 로드가 직렬).

**개선**: mount를 먼저 실행하고 constants는 백그라운드 로드로 전환.
constants를 사용하는 컴포넌트는 스토어의 로딩 상태를 보고 스켈레톤/폴백 표시.
(스토어에 이미 폴백 처리가 있으므로 큰 구조 변경 없이 가능할 것으로 보임 — 착수 시 사용처 전수 확인 필요)

**✅ 완료 (2026-07-08)**: 사용처 전수 확인 결과(cart.ts, validators.ts, AdminCancelOrderModal.vue)
전부 호출 시점 reactive 조회 + FALLBACK 폴백이라 mount-first 전환에 구조 변경 불필요.
`loadConstants`는 in-flight promise 공유 방식으로 개선하고, 정확한 상수가 필요한 결제 경로만
`ensureLoaded()`(진행 중이면 완료 대기, 실패했으면 1회 재시도)를 `Order.vue` onMounted에서 await.

---

## 4. 비로그인 방문자의 불필요한 API 호출 검토 (우선순위: 낮음)

**현상**: 첫 로딩 시 모든 방문자에게 `user` + `cart` API 호출 발생.
`user`(세션 확인)는 쿠키 기반 인증 특성상 불가피하나, `cart`는 `user` 응답으로
비로그인이 확인된 뒤에는 생략 가능할 수 있음.

**개선(후보)**: cart 로드를 auth 확인 이후로 순서화하거나 로그인 상태에서만 호출.
게스트 장바구니 정책이 있다면 현행 유지가 맞으므로 착수 전 정책 확인 필요.

**✅ 코드상 이미 해결 확인 (2026-07-08)**: `cart.ts` `loadCart()`가 `authStore.isAuthenticated`로
게이트되어 있어 비로그인은 localStorage(`guest_cart`)만 읽고 API를 호출하지 않음.
배포 후 시크릿 창 워터폴에서 cart API 부재만 재확인하면 됨.

---

## 5. libs 청크 크기 경고 해소 (우선순위: 낮음)

**현상**: 빌드 시 `libs.js` 639KB(>500KB) chunk size warning이 상시 출력됨.
three.js 도입(Hero3DNotes)으로 커진 상태.

**개선(후보)**: `manualChunks`에서 three.js를 별도 청크로 분리하고,
Hero3DNotes가 홈 전용이므로 three 청크가 Home lazy 청크에만 딸려가는지 확인.
(1번 lazy 전환 작업과 함께 진행하면 효율적)

**✅ 완료 (2026-07-08)**: three를 별도 청크로 분리 (libs 639KB → 91KB).
three 청크(557KB)는 Home lazy 청크의 의존으로만 로드됨을 빌드 산출물에서 확인
(index.html preload 없음, 상품 상세 등 홈 외 랜딩에서 미로드).
three 코어 자체가 500KB를 넘어 경고가 옮겨오므로 `chunkSizeWarningLimit`를 600으로 조정(사유 주석).
Hero3DNotes의 defineAsyncComponent 전환은 보류 — 배포 후 홈 LCP 실측으로 판단.

---

## 6. 미사용 Hero.vue 정리 (우선순위: 낮음)

**현상**: 기존 이미지 슬라이더 `src/components/Hero.vue`가 Hero3DNotes 교체 후 어디서도 import되지 않음.

**개선(후보)**: A/B 복귀 가능성이 없다고 판단되면 삭제 (git 히스토리로 언제든 복원 가능).
사이트 이미지 관리(관리자 Main PC/Mobile 이미지 업로드) 기능과 연계된 컴포넌트이므로
삭제 시 관리자 화면의 안내 문구 등 잔여 참조 확인 필요.

**✅ 완료 (2026-07-08)**: import처 0건 확인 후 Hero.vue 파일만 삭제.
`siteImage.ts` 스토어·`SiteImageAdmin.vue`·hero 타입은 유지
(SiteImageAdmin이 hero 레거시 데이터를 main_desktop에 병합 처리 중이므로 미변경).
스토어 내 미사용 getter 정리는 별도 건으로 분리.

---

## 7. 소스맵 전략 (우선순위: 낮음, 필요 시)

**현상**: 프로덕션 빌드에 소스맵 미생성(기본값). 프로덕션 에러가 압축된 심볼로만 보임.

**개선(후보)**: 에러 트래킹 도입 시점에 소스맵 생성 + Sentry 등에 비공개 업로드.
공개 버킷에 `.map` 업로드는 원본 코드 노출이므로 금지.

**⏸ 보류 (2026-07-08)**: 에러 트래킹 도입 시점에 함께 진행.

---

## 참고: 이번 분석에서 확인된 정상 동작 (개선 불필요)

- 해시 파일명 + immutable 캐시 전략 — 의도대로 동작 중
- Critical CSS 인라인, 폰트 preload/self-hosting, dns-prefetch/preconnect — 의도대로 동작 중
- 프리렌더링된 SEO 메타(title/OG/JSON-LD) — CSR의 SEO 약점을 빌드 시점에 보완하는 구조로 동작 중
- Hero3DNotes는 이미지 요청 0건 (벡터 렌더링) — 구 이미지 히어로 대비 네트워크 이점
