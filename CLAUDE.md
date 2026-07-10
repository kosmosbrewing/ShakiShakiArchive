# CLAUDE.md

이 파일은 Claude 계열 도구를 위한 호환 진입점입니다. 작업 규칙의 우선 소스는 AGENTS.md, 상세 프로젝트 규칙은 Codex.md, 현재 현황은 MEMORY.md입니다.

## Start

1. git status 확인
2. AGENTS.md, Codex.md, MEMORY.md, README.md 확인
3. package.json, vite.config.ts, src/router/index.ts, .github/workflows/deploy.yml 대조

실제 .env, .env.production과 secret 파일은 읽거나 출력하지 않습니다. .env.example과 코드 참조만 사용합니다.

## Commands

- npm ci
- npm run dev
- npm run typecheck
- npm run docs:lint
- npm run build
- npm run build:full (실행 가능한 backend 필요)
- npm run verify

## Current Architecture

- Vue 3 + TypeScript strict + Pinia + Vue Router
- 모든 route component lazy import
- src/lib/api.ts의 쿠키 세션 API
- guest_cart localStorage와 로그인 후 cart 병합
- backend SEO API를 사용하는 scripts/prerender
- main push에서 S3 + CloudFront production deploy

## Guardrails

- route guard를 서버 인가의 대체로 취급하지 않습니다.
- VITE_ 값에 secret을 넣지 않습니다.
- 사용자별 API 응답을 cache하지 않습니다.
- 결제·인증·배포·Terraform 변경은 안전장치와 롤백을 먼저 확인합니다.
- 날짜 기반 릴리스/품질 문서와 performance-comparison.md의 수치를 현재 보장으로 인용하지 않습니다.
