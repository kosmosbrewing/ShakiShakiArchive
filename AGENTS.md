# AGENTS.md

## Scope

- 이 파일은 ShakiShakiArchive 저장소 전체에 적용한다.
- 프런트엔드 코드, 정적 SEO 빌드, AWS 배포 워크플로, 이 저장소의 Terraform 보조 설정이 범위다.
- 백엔드 구현의 단일 진실 소스는 별도 ShakiShakiArchiveBackend 저장소다.

## Priority

1. 사용자의 명시 요청
2. 이 파일
3. Codex.md
4. 기존 코드와 설정
5. 상위 작업공간 규칙

## Start Protocol

- 시작할 때 git status, rg --files, README.md, Codex.md, MEMORY.md를 확인한다.
- package.json, vite.config.ts, src/router/index.ts, .github/workflows/deploy.yml을 현재 동작의 우선 근거로 삼는다.
- 실제 .env, .env.production 및 secret 파일은 읽거나 출력하지 않는다. 추적된 .env.example과 코드의 환경 변수 참조만 사용한다.
- 사용자 변경과 관련 없는 파일은 수정하지 않는다.

## Current Stack

- Vue 3 Composition API, TypeScript strict mode, Pinia, Vue Router
- Vite 6, Tailwind CSS 3, radix-vue 기반 UI 컴포넌트
- fetch 기반 src/lib/api.ts, 쿠키 세션(credentials: include)
- S3 + CloudFront 정적 배포, 빌드 시 백엔드 SEO API를 사용하는 prerender

## Commands

- install: npm ci
- dev: npm run dev
- typecheck: npm run typecheck
- docs: npm run docs:lint
- build: npm run build
- full SEO build: npm run build:full (실행 가능한 백엔드 필요)
- local gate: npm run verify

## Change Rules

- 기존 build 명령의 의미를 임의로 바꾸지 않는다.
- 모든 라우트는 lazy import를 유지한다. 공용 배럴 import로 eager loading을 다시 만들지 않는다.
- 사용자·주문·장바구니·관리자 응답에 클라이언트 캐시를 추가하지 않는다.
- 라우트 가드는 UX 보조일 뿐 보안 경계로 간주하지 않는다. 권한 검사는 백엔드가 수행해야 한다.
- VITE_ 환경 변수에는 비밀값을 두지 않는다. 빌드 결과에 공개된다.
- 결제·인증·배포·Terraform apply는 High-risk다. 안전장치와 롤백 경로 없이 변경하지 않는다.
- main push는 프로덕션 배포를 촉발한다. 문서 전용 커밋은 필요하면 [skip ci] 정책을 사용한다.

## Documentation Rules

- 현재 기준 문서: README.md, FRONTEND_GUIDE.md, BACKEND_GUIDE.md, DEPLOY.md, SEO_GUIDE.md, docs/ARCHITECTURE.md, docs/DEVOPS.md, docs/SECURITY.md, docs/TECHNICAL_CHALLENGES.md.
- 날짜가 붙은 릴리스/품질 문서와 performance-comparison.md는 당시 스냅샷이다. 현재 보장처럼 인용하지 않는다.
- 코드에서 검증할 수 없는 운영 상태, 비용, 성능, 보안 헤더, 외부 콘솔 설정은 Needs Verification로 기록한다.
- 코드나 package script 변경 시 README.md, Codex.md, MEMORY.md, .env.example의 동기화 여부를 확인한다.

## Done Criteria

- npm run docs:lint 통과
- 코드 변경 시 npm run typecheck와 npm run build 통과
- prerender 변경 시 가능한 환경에서 npm run build:full 및 생성 HTML 확인
- 미실행 검증은 이유와 남은 위험을 보고
- 리뷰 응답은 Findings -> Open Questions -> Summary 순서
