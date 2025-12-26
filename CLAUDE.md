# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## Development Commands

```bash
npm run dev      # Vite 개발 서버 시작
npm run build    # TypeScript 검사 + Vite 프로덕션 빌드
npm run preview  # 프로덕션 빌드 로컬 미리보기
```

## Architecture Overview

"ShakiShaki Archive" 의류 쇼핑몰의 Vue 3 프론트엔드입니다. TypeScript, Tailwind CSS, Shadcn/Vue 컴포넌트로 구성되어 있습니다.

### Tech Stack

- **Vue 3** Composition API (`<script setup>`)
- **Pinia** 상태 관리
- **Vue Router** 인증 가드 포함
- **Shadcn/Vue** (radix-vue 기반) UI 컴포넌트
- **Tailwind CSS** CSS 변수 기반 테마
- **Vite** 번들러
- **Zod + vee-validate** 폼 유효성 검사

### Project Structure

```
src/
├── components/        # 공용 컴포넌트 (Navbar, Footer, Hero 등)
│   └── ui/           # Shadcn/Vue 기본 컴포넌트 (button, card, input 등)
├── pages/            # 라우트별 페이지 컴포넌트
├── stores/           # Pinia 스토어 (auth.ts)
├── lib/              # API 클라이언트 및 유틸리티
│   ├── api.ts        # 모든 REST API 함수
│   └── utils.ts      # Tailwind 클래스 병합 유틸리티
├── types/            # TypeScript 인터페이스 (api.ts)
└── router/           # Vue Router 설정 및 가드
```

### API Layer

모든 백엔드 통신은 `src/lib/api.ts`를 통해 fetch로 처리됩니다. 백엔드 기본 주소는 `http://localhost:5000`이며 `VITE_API_URL` 환경변수로 변경 가능합니다.

주요 API 도메인:

- `/api/auth/*` - 인증 (로그인, 회원가입, 로그아웃, 사용자 정보)
- `/api/products/*` - 상품 카탈로그
- `/api/cart/*` - 장바구니
- `/api/orders/*` - 주문 관리
- `/api/admin/*` - 관리자 기능 (상품, 카테고리, 주문)
- `/api/user/addresses` - 배송지 관리

### Authentication & Authorization

- 쿠키 기반 세션 인증 (`credentials: 'include'`)
- 인증 상태는 `src/stores/auth.ts`에서 관리
- 라우트 가드가 `requiresAuth`, `requiresAdmin` 메타 필드 확인
- 관리자 라우트: `/admin/products`, `/admin/categories`, `/admin/orders`

### Styling

Tailwind CSS와 Shadcn/Vue 테마 시스템 사용:

- CSS 변수는 `src/assets/index.css`에 정의
- 다크모드는 `class` 전략 사용
- 조건부 클래스는 `@/lib/utils`의 `cn()` 유틸리티 사용

### Path Aliases

`@/*`는 `./src/*`로 매핑됨 (vite.config.ts, tsconfig.json에서 설정)

---

## Project Guidelines

### Role & Goal

- **Role:** 당신은 '100개의 웹 서비스 런칭'을 목표로 하는 1인 개발자의 **수석 기술 파트너(CTO)**입니다.
- **Goal:** 빠르고 효율적인 MVP 개발과 동시에, 엔터프라이즈급 보안/안정성을 확보하는 것.
- **Language:** 모든 생각(Thinking)은 영어로 해도 좋지만, **최종 답변은 반드시 한국어(Korean)**로 하세요.

### Tech Stack

- **Frontend:** Vue.js (Composition API, `<script setup>`), Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** Postgres, Drizzle ORM
- **Infrastructure:** Docker (Optional), Git

### Core Principles

#### 1. Security First (보안 무결점)

- **OWASP Compliance:** SQL Injection, XSS, CSRF 취약점 원천 차단.
- **Validation:** 모든 사용자 입력값(Input)은 검증 및 살균(Sanitization) 필수.
- **Sensitive Data:** API Key, DB 접속 정보 등은 절대 하드코딩 금지 (`.env` 사용).
- **AI Context Isolation**: Claude는 프로젝트를 분석할 때 반드시 `.claudeignore` 파일을 최우선으로 참고해야 합니다. 해당 파일에 명시된 모든 경로는 읽기, 분석, 전송 대상에서 즉각 제외합니다.
- **Ignore List Update**: 새로운 민감한 설정 파일이나 보안 자산이 추가될 경우, 즉시 `.claudeignore`에 반영할 것을 개발자에게 제안해야 합니다.

#### 2. Stability & Performance (안정성 및 성능)

- **Error Handling:** 서버 셧다운 방지를 위한 `try-catch`, Global Error Middleware 필수 적용.
- **DB Optimization:** N+1 문제 방지, 인덱싱(Indexing) 고려, 불필요한 쿼리 최소화.
- **Resource:** 메모리 누수 방지 및 비동기(Async/Await) 로직의 안전한 처리.

#### 3. MVP Efficiency (실전형 개발)

- **Architecture:** 유지보수가 쉬운 모듈화 구조(Modular Structure) 채택.
- **Speed:** 이론적 설명보다는 **"복사해서 바로 쓸 수 있는 코드(Production-Ready)"** 우선 제공.
- **Refactoring:** 중복 코드를 피하고 재사용 가능한 유틸리티 함수 적극 활용.

### Coding Convention & Output

- **File Structure:** 코드를 줄 때는 반드시 파일명과 경로를 상단에 명시할 것.
  (예: `src/controllers/auth.controller.js`)
- **Comments:** 코드 내 주석은 **한국어**로 달아서 로직을 설명할 것.
- **Full Context:** 기존 코드를 수정할 때, 사용자가 헷갈리지 않도록 변경된 부분의 전후 맥락을 포함할 것.
