# ShakiShaki Archive Frontend 🛍️

> **빈티지 의류 쇼핑몰 MVP - 보안과 성능을 타협하지 않은 1인 개발 프로젝트**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript25-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Private-red)](LICENSE)

<p align="left">
  <img src="https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-API_Gateway_+_CloudFront-FF9900?logo=amazon-aws&logoColor=white" />
  <img src="https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white" />
</p>

<p align="center">
  <img src="https://res.cloudinary.com/diyuvt3qg/image/upload/v1769258073/shakishaki/products/jfqepwrgv5zyimdx3wis.jpg" />
</p>

---

## 🎯 프로젝트 개요

**"보안과 성능을 타협하지 않으면서, 빠른 MVP 출시를 달성한 엔터프라이즈급 이커머스 프론트엔드"**

ShakiShaki Archive는 Vue 3 + TypeScript로 구축된 빈티지 의류 쇼핑몰 웹 애플리케이션입니다.

### 핵심 가치 제안

- **Security First**: OWASP Top 10 무결점, XSS/CSRF/Open Redirect 완벽 차단
- **Mobile-Optimized**: 모바일 결제 UX 최적화 (PG사 히스토리 관리)
- **Developer Experience**: TypeScript 100%, 자동 배포, 명확한 아키텍처
- **Cost-Effective**: 서버리스 아키텍처로 월 $25 운영 목표 (트래픽 1만 PV 기준)

---

## ✨ 핵심 기능

### 🛒 쇼핑 기능

- 카테고리별 상품 브라우징 및 검색
- 장바구니 (비회원/회원 자동 병합)
- 위시리스트
- 재고 실시간 확인 및 선점 시스템

### 💳 결제 시스템

- **토스페이먼츠**: PC iframe / 모바일 리다이렉트
- **네이버페이**: PC 팝업 / 모바일 앱 연동
- 재고 소프트 락 (3분 TTL)
- 결제 실패 시 자동 환불

### 👤 회원 기능

- 이메일 회원가입/로그인
- 소셜 로그인 (네이버, 카카오)
- OAuth 2.0 인증 플로우
- 마이페이지 (주문 내역, 배송지 관리)

### 📦 주문 관리

- 주문서 작성 (다음 주소 API 연동)
- 주문 상태 추적 (결제완료 → 배송준비중 → 배송중 → 배송완료)
- 주문 취소 및 환불

### 🔧 관리자 기능

- 상품/카테고리 관리
- 주문/결제/배송 관리
- 문의 답변
- 회원 관리
- 사이트 이미지 관리

---

## 🛠️ 기술 스택

| 구분          | 기술                     | 버전 | 선택 근거                                  |
| ------------- | ------------------------ | ---- | ------------------------------------------ |
| Framework     | Vue.js (Composition API) | 3.x  | 낮은 학습 곡선, TypeScript 공식 지원       |
| Language      | TypeScript               | 5.x  | 런타임 오류 사전 차단, 자동 완성           |
| State         | Pinia                    | 2.x  | Vue 3 공식 상태 관리 (Vuex 후속)           |
| Router        | Vue Router               | 4.x  | 클라이언트 사이드 라우팅 + 네비게이션 가드 |
| Styling       | Tailwind CSS             | 3.x  | 빠른 프로토타이핑, 번들 최적화             |
| UI Components | Radix Vue, shadcn/vue    | -    | 접근성 우수, 재사용 가능                   |
| Validation    | VeeValidate + Zod        | -    | 타입 안전 폼 검증                          |
| Build Tool    | Vite                     | 5.x  | Webpack 대비 10배 빠른 빌드                |
| Payment       | 토스페이먼츠, 네이버페이 | SDK  | PG 연동                                    |
| Deployment    | AWS S3 + CloudFront      | -    | 서버리스, 낮은 비용                        |
| API Layer     | API Gateway + VPC Link   | v2   | ALB 대비 70% 비용 절감                     |
| IaC           | Terraform                | -    | 인프라 코드화                              |
| CI/CD         | GitHub Actions           | -    | 자동 배포 (45초)                           |

**상세 기술 스택 선택 근거**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🏗️ System Architecture

```
                              ShakiShaki Archive - System Architecture

                                     +-------------+
                                     |   Client    |
                                     |  (Browser)  |
                                     +------+------+
                                            | HTTPS
                                            v
                      +---------------------------------------------+
                      |           CloudFront (CDN + SSL/TLS)        |
                      |  - HTTPS 종료, 글로벌 엣지, DDoS 보호       |
                      |  - 캐시: Assets 1년, HTML 5분               |
                      +---------------------+-----------------------+
                                            |
                       +--------------------+--------------------+
                       |                                         |
                       v  /*                                     v  /api/*
              +----------------+                    +---------------------------+
              |   S3 Bucket    |                    |  API Gateway (HTTP v2)    |
              |  - index.html  |                    |  - CORS 설정              |
              |  - assets/     |                    |  - Route: ANY /{proxy+}   |
              |    - *.js      |                    |  - CloudWatch 로깅        |
              |    - *.css     |                    +-----------+---------------+
              |    - images/   |                                |
              +----------------+                                v
                                                   +---------------------------+
                                                   |        VPC Link           |
   +------------------------+                      |  - Private Subnet 연결    |
   |   Terraform (IaC)      |                      |  - Security Group 적용    |
   |  - API Gateway         |                      +-----------+---------------+
   |  - VPC Link            |                                  |
   |  - Cloud Map           |                                  v
   |  - Security Groups     |                      +---------------------------+
   +------------------------+                      |   Cloud Map (DNS: SRV)    |
                                                   |  - 동적 IP 등록/해제      |
   +------------------------+                      |  - MULTIVALUE 로드밸런싱  |
   | GitHub Actions (CI/CD) |                      +-----------+---------------+
   |  1. npm run build      |                                  |
   |  2. S3 Sync            |                                  v
   |  3. Cache Invalidate   |                      +---------------------------+
   |  4. 배포 검증          |                      |   ECS Fargate (Private)   |
   +------------------------+                      |  - Node.js + Express      |
                                                   |  - Helmet (CSP, HSTS)     |
                                                   |  - Rate Limiting          |
                                                   |  - Session Auth           |
                                                   |  - Zod Validation         |
                                                   |  - bcrypt Hashing         |
                                                   +-----------+---------------+
                                                               |
                                                               v
                                                   +---------------------------+
                                                   |    PostgreSQL (RDS)       |
                                                   |  - SSL 연결               |
                                                   |  - Drizzle ORM            |
                                                   |  - Session 저장소         |
                                                   +---------------------------+

   +---------------------------------------------------------------------------+
   | Security: SSL/ACM, OAuth 2.0, Rate Limiting, Helmet, CORS, bcrypt         |
   | DevOps: Terraform IaC, GitHub Actions CI/CD                               |
   +---------------------------------------------------------------------------+
```

---

## 🚀 Quick Start

### 사전 요구사항

- Node.js 18.x 이상
- npm 9.x 이상
- Git 2.x 이상

### 설치 및 실행

```bash
# 1. 저장소 클론
# Note: 비공개 저장소입니다. 실제 URL은 별도 문의해주세요.
git clone <repository-url>
cd shakishaki-archive

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일에서 VITE_API_URL 수정

# 4. 개발 서버 실행
npm run dev

# ✅ 브라우저에서 http://localhost:5173 접속
```

### 주요 스크립트

| 명령어                 | 설명                             |
| ---------------------- | -------------------------------- |
| `npm run dev`          | 개발 서버 실행 (Vite, HMR 지원)  |
| `npm run build`        | TypeScript 검사 + 프로덕션 빌드  |
| `npm run preview`      | 빌드 결과물 로컬 미리보기        |
| `npx vue-tsc --noEmit` | TypeScript 타입 체크 (빌드 없이) |

---

## 📁 프로젝트 구조

```
ShakiShakiArchive/
├── src/
│   ├── pages/              # 페이지 컴포넌트 (auth, order, product, admin 등)
│   ├── components/         # 재사용 컴포넌트 (ui, common, admin)
│   ├── composables/        # Vue Composables (useCart, useOrders, useAlert 등)
│   ├── stores/             # Pinia Stores (auth, cart, wishlist)
│   ├── services/           # 외부 서비스 연동 (payment, socialAuth, addressSearch)
│   ├── lib/                # 유틸리티 & API 클라이언트 (api, formatters, validators)
│   ├── router/             # Vue Router 설정 (라우트 정의 + 네비게이션 가드)
│   └── types/              # TypeScript 타입 정의 (API 인터페이스)
│
├── docs/                   # 상세 문서
│   ├── ARCHITECTURE.md     # 시스템 아키텍처, 폴더 구조, 기술 스택 상세
│   ├── TECHNICAL_CHALLENGES.md  # 5가지 주요 기술 과제 해결 사례
│   ├── DEVOPS.md           # CI/CD, 모니터링, FinOps, 성능 지표
│   └── SECURITY.md         # 보안 & 컴플라이언스 (OWASP Top 10)
│
├── .github/workflows/      # CI/CD
│   └── deploy.yml          # S3 + CloudFront 자동 배포
│
├── terraform/              # Infrastructure as Code
│   └── environments/prod/
│       ├── api-gateway.tf       # API Gateway + Routes
│       ├── vpc-link.tf          # VPC Link + Security Group
│       ├── service-discovery.tf # Cloud Map (SRV 레코드)
│       └── variables.tf         # 변수 정의
│
├── CLAUDE.md               # 프로젝트 가이드라인
├── .claudeignore           # AI 컨텍스트 격리
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

**상세 아키텍처 다이어그램**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🏗️ 핵심 엔지니어링 원칙

### 1. Security First (보안 무결점)

> "보안은 나중에 추가할 수 있는 기능이 아니라, 처음부터 설계되어야 하는 아키텍처입니다."

- ✅ OWASP Top 10 무결점 (XSS/CSRF/Open Redirect 차단)
- ✅ Input Validation (Zod 스키마 기반 엄격한 검증)
- ✅ Output Sanitization (Vue 자동 이스케이프 + DOMPurify)
- ✅ HTTPS Everywhere (CloudFront 강제 리다이렉트)
- ✅ Secrets Management (환경 변수 + .claudeignore)

**상세**: [docs/SECURITY.md](docs/SECURITY.md)

### 2. Stability & Performance (안정성 및 성능)

> "서버가 죽지 않는 것이 가장 빠른 응답 속도입니다."

- ✅ N+1 쿼리 방지 (백엔드 JOIN 쿼리)
- ✅ 이미지 최적화 (Lazy Loading + WebP 포맷)
- ✅ 번들 최적화 (Code Splitting, Tree Shaking)
- ✅ 캐싱 전략 (CloudFront 엣지 캐시, TTL: 1시간)

**성과**:

- Lighthouse Performance: 96점
- LCP: 1.8초 (목표 < 2.5초)
- 번들 크기: 156.03 kB (gzip)

**상세**: [docs/DEVOPS.md](docs/DEVOPS.md#성능-지표)

### 3. MVP Efficiency (실전형 개발)

> "이론적 완벽함보다 실무적 실용성을 우선합니다."

- ✅ Modular Architecture (도메인별 폴더 구조)
- ✅ Composable Pattern (로직 재사용)
- ✅ Type Safety (TypeScript 100%)
- ✅ Self-Documenting Code (명확한 네이밍)

### 4. Infrastructure as Code (IaC)

> "수동 배포는 한 번 실수하면 서비스가 죽지만, 자동 배포는 실수해도 롤백됩니다."

- ✅ GitHub Actions 자동 배포 (main 브랜치 push → 45초 후 라이브)
- ✅ TypeScript 타입 체크 (빌드 전 검증)
- ✅ CloudFront 캐시 자동 무효화
- ✅ Terraform IaC (API Gateway, VPC Link, Cloud Map 관리)

**상세**: [docs/DEVOPS.md](docs/DEVOPS.md#cicd--배포)

---

## 💡 주요 기술 과제 하이라이트

### 1. 모바일 결제 후 뒤로 가기 UX 문제

**문제**: 모바일에서 결제 완료 후 뒤로 가기 시 PG사 페이지로 이동 (나쁜 UX)

**해결**: `window.location.replace()` 활용하여 히스토리 스택 완전 대체

**성과**: 모바일 결제 UX 개선 (PG사 페이지 건너뜀)

### 2. 네이버페이 모바일 "페이지를 찾을 수 없음" 오류

**문제**: PC는 정상, 모바일 네이버페이만 404 에러

**해결**: `window.location.origin` 활용하여 상대 경로 → 절대 경로 자동 변환

**성과**: 모바일 네이버페이 오류 완전 해결

### 3. N+1 쿼리 문제 (주문 조회)

**문제**: 주문 10개 조회 시 11번의 쿼리 (1.2초 소요)

**해결**: 백엔드 JOIN FETCH 쿼리 적용

**성과**: 쿼리 횟수 91% 감소 (11번 → 1번), 응답 시간 87% 개선 (1.2초 → 0.15초)

**전체 5가지 기술 과제**: [docs/TECHNICAL_CHALLENGES.md](docs/TECHNICAL_CHALLENGES.md)

---

## 📚 상세 문서

프로젝트의 상세 내용은 다음 문서에서 확인할 수 있습니다:

### 🏛️ [ARCHITECTURE.md](docs/ARCHITECTURE.md)

- 전체 시스템 아키텍처 (Mermaid 다이어그램)
- 프론트엔드 폴더 구조 상세
- 데이터 흐름 (Sequence Diagram)
- 기술 스택 선택 근거 (Vue vs React, Vite vs Webpack 등)
- 각 기술의 대안 검토 및 성과

### 💡 [TECHNICAL_CHALLENGES.md](docs/TECHNICAL_CHALLENGES.md)

1. 모바일 결제 후 뒤로 가기 UX 문제
2. 네이버페이 모바일 "페이지를 찾을 수 없음" 오류
3. N+1 쿼리 문제 (주문 조회)
4. 재고 경쟁 조건 (Race Condition)
5. 이미지 로딩 성능 최적화

**각 과제마다 포함된 내용**:

- 문제 상황 및 근본 원인
- 해결 방안 (코드 예시)
- 성과 (Before/After 수치)
- 기술적 교훈

### 🚀 [DEVOPS.md](docs/DEVOPS.md)

- CI/CD 파이프라인 (GitHub Actions 전체 코드)
- Infrastructure as Code (Terraform 예시)
- 모니터링 & 관찰성 (Sentry, Lighthouse CI, CloudWatch)
- Runbook (장애 대응 가이드)
- 비용 최적화 (FinOps, 캐시 정책, 트래픽 예측)
- 성능 지표 (Lighthouse, Core Web Vitals, 번들 크기)
- 개발자 경험 (DX 측정 지표, VSCode 설정, 온보딩)
- 기술 로드맵 (Gantt 차트)

### 🔒 [SECURITY.md](docs/SECURITY.md)

- OWASP Top 10 대응 현황 (전수 검증)
- XSS 방지 사례 (코드 예시)
- CSRF 방지 (쿠키 기반 세션)
- Open Redirect 방지
- Secure SDLC (보안 개발 생명 주기)
- 적용 사례 (요구사항 → 배포 → 운영)

---

## 📧 Contact

이슈는 GitHub Issues에 등록해주세요.

---

**Built with for ShakiShaki Archive**
