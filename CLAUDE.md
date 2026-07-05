# CLAUDE.md

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

모든 백엔드 통신은 `src/lib/api.ts`를 통해 fetch로 처리됩니다. 백엔드 기본 주소는 `http://localhost:8080`이며 `VITE_API_URL` 환경변수로 변경 가능합니다.

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

- 보안·안정성·코딩 컨벤션 원칙: 전역 규칙(`~/.claude/rules/security.md`, `reliability.md`)을 따른다. 이 파일에 재기술하지 않는다.
- 이 프로젝트의 예외: 인증은 **쿠키 기반 세션**(`credentials: 'include'`) — JWT 아님.
- `.claudeignore`에 명시된 경로(.env 등)는 읽기·분석·전송 대상에서 제외한다.
- main push = 프로덕션 배포(deploy.yml). 문서·설정만 변경한 커밋은 메시지에 `[skip ci]`를 붙인다.
