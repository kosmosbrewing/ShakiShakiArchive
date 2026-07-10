# Codex.md - ShakiShakiArchive

## Goal

- ShakiShaki Archive 빈티지 커머스의 Vue SPA를 안전하게 개발하고 S3/CloudFront에 재현 가능하게 배포한다.
- 공개 상품 페이지는 빌드 시 프리렌더하여 검색엔진과 링크 미리보기에 필요한 메타와 본문을 제공한다.

## Priority

1. 사용자 요청
2. AGENTS.md
3. 이 문서
4. 기존 코드와 설정

## Stack Profile

- Runtime: GitHub Actions Node.js 20, npm package-lock
- Frontend: Vue 3, TypeScript strict, Pinia, Vue Router
- UI: Tailwind CSS 3, radix-vue/shadcn-vue 구성
- Validation: Zod, vee-validate, 도메인별 수동 검증
- API: fetch 중심의 src/lib/api.ts, 일부 Axios 호환 경로
- Auth: 백엔드가 발급하는 쿠키 세션, credentials: include
- Build: Vite 6, 라우트 lazy loading, source map 비활성
- Delivery: GitHub Actions -> S3 -> CloudFront invalidation
- SEO: 백엔드 /api/seo 및 상품/카테고리 API를 사용하는 Node prerender

## Non-Goals

- 백엔드 인증·DB·결제 승인 로직을 프런트 저장소에서 재정의하지 않는다.
- 근거 없는 성능 수치, 비용 수치, OWASP 준수 또는 운영 완료를 문서에 선언하지 않는다.
- Google OAuth를 활성 기능으로 문서화하지 않는다. 현재 helper만 있고 검증된 백엔드 경로와 UI가 없다.
- Sentry, Lighthouse CI, Dependabot이 구성된 것처럼 가정하지 않는다.

## Must Rules

- API base는 VITE_API_URL을 사용하고 개발 기본값은 http://localhost:8080이다.
- 인증 요청은 쿠키를 포함한다. 토큰을 localStorage에 저장하는 인증 설계를 새로 도입하지 않는다.
- 보호/관리자 화면은 라우트 meta와 가드를 유지하되 서버 권한 검사를 전제로 한다.
- 외부 입력과 프리렌더 본문은 이스케이프한다.
- 사용자별 데이터는 no-cache 정책을 유지한다.
- 모든 새 외부 네트워크 호출은 명시적 timeout과 안전한 실패 처리를 포함한다.
- 결제 콜백, 주문 정리, OAuth returnUrl 변경에는 중복 처리와 open redirect 위험을 검토한다.

## Environment

- .env.example이 공개 가능한 키 목록의 기준이다.
- 실제 .env 계열과 GitHub Secrets는 읽거나 커밋하지 않는다.
- 모든 VITE_ 값은 브라우저 번들에 포함되므로 secret을 넣지 않는다.
- 운영 빌드 필수: VITE_API_URL
- 선택: VITE_GA_ID, VITE_KAKAO_APP_KEY
- Naver/Kakao/Google client 및 redirect 변수는 socialAuth 호환 helper용이다. 현재 로그인 UI는 백엔드 OAuth URL을 사용하며 Google은 미연결 상태다.

## Commands

- npm ci: lockfile 기준 설치
- npm run dev: Vite 개발 서버
- npm run typecheck: Vue/TypeScript 검사
- npm run docs:lint: 필수 문서, 링크, VITE_ 키 동기화 검사
- npm run build: 기존 프로덕션 SPA 빌드
- npm run prerender: 이미 생성된 dist와 실행 가능한 백엔드로 정적 HTML 생성
- npm run build:full: build 후 prerender
- npm run preview: dist 로컬 미리보기
- npm run optimize-images: 이미지 최적화 스크립트
- npm run verify: docs:lint와 build를 순서대로 실행

## Quality Gates

- 기본 게이트: npm run verify
- SEO 변경: npm run build:full 후 index.html, faq.html, terms.html, privacy.html, product 및 productDetail HTML, sitemap.xml 확인
- 라우팅 변경: 보호/관리자 meta, 404 noindex, canonical UUID-to-slug 이동 확인
- 인증/결제 변경: 성공·취소·실패·팝업 차단·중복 콜백을 수동 또는 자동 검증
- 현재 단위 테스트와 ESLint 스크립트는 없다. 추가 전까지 build와 대상 기능 수동 검증의 공백을 명시한다.

## Delivery Rules

- main push, v* tag, repository_dispatch(content-update), workflow_dispatch는 배포 워크플로 입력이다.
- 전체 무효화는 tag, 수동 입력, 커밋 메시지 [full-invalidate]에서만 수행한다.
- assets/ lifecycle 설정은 기존 버킷 lifecycle 전체를 교체하므로 다른 규칙을 추가할 때 JSON을 병합한다.
- Terraform apply와 CloudFront 함수 연결은 자동 배포에 포함되지 않는다. plan, 백업/롤백, 사용자 확인 후 수행한다.
- 롤백은 git revert 기반 재배포를 우선한다.

## Documentation

- 현재 운영 기준과 역사 스냅샷을 구분한다.
- MEMORY.md에는 현황과 검증 대기만 기록하고 정책은 이 파일이나 AGENTS.md에 둔다.
- 운영 콘솔에서만 확인되는 상태는 Needs Verification로 유지한다.

## Response Format

1. 변경 파일과 핵심 결과
2. 가정 및 Needs Verification
3. 실행한 검증
4. 남은 위험과 다음 작업
