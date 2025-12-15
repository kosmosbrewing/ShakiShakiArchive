# ShakiShaki Archive 백엔드 가이드

## 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [기술 스택](#기술-스택)
3. [인증 시스템](#인증-시스템)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 엔드포인트](#api-엔드포인트)
6. [결제 시스템](#결제-시스템)
7. [Storage 인터페이스](#storage-인터페이스)
8. [새로운 기능 추가하기](#새로운-기능-추가하기)
9. [환경 변수](#환경-변수)
10. [문제 해결](#문제-해결)

---

## 프로젝트 구조

```
server/
├── index.ts                    # 서버 진입점, Express 앱 초기화
├── db.ts                       # Drizzle ORM + pg Pool 설정
├── storage.ts                  # IStorage 인터페이스 및 DatabaseStorage 구현
├── config/
│   ├── index.ts                # 환경 변수 설정
│   ├── cors.ts                 # CORS 설정
│   └── session.ts              # 세션 설정
├── middleware/
│   ├── index.ts                # 미들웨어 통합 export
│   ├── auth.middleware.ts      # 인증 미들웨어 (isAuthenticated, isAdmin)
│   ├── error.middleware.ts     # 전역 에러 처리
│   └── logger.middleware.ts    # 요청 로깅
├── routes/
│   ├── index.ts                # 라우트 통합 등록
│   ├── auth.routes.ts          # 인증 API (/api/auth/*)
│   ├── product.routes.ts       # 상품 API (/api/products/*)
│   ├── category.routes.ts      # 카테고리 API (/api/categories/*)
│   ├── cart.routes.ts          # 장바구니 API (/api/cart/*)
│   ├── order.routes.ts         # 주문 API (/api/orders/*)
│   ├── payment.routes.ts       # 결제 API (/api/payments/*)
│   ├── wishlist.routes.ts      # 위시리스트 API (/api/wishlist/*)
│   ├── address.routes.ts       # 배송지 API (/api/user/addresses/*)
│   ├── variant.routes.ts       # 상품 옵션 API (/api/products/:id/variants/*)
│   └── admin/
│       ├── index.ts            # 관리자 라우트 통합
│       ├── product.routes.ts   # 관리자 상품 관리
│       ├── category.routes.ts  # 관리자 카테고리 관리
│       ├── order.routes.ts     # 관리자 주문 관리
│       ├── variant.routes.ts   # 관리자 상품 옵션 관리
│       └── payment.routes.ts   # 관리자 결제 관리
├── services/
│   └── toss.service.ts         # 토스페이먼츠 API 클라이언트
├── types/
│   └── index.ts                # 커스텀 타입 정의
└── scripts/
    └── seed.ts                 # 데이터베이스 시드 스크립트

shared/
└── schema.ts                   # Drizzle 스키마 + Zod 검증 + TypeScript 타입
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 런타임 | Node.js + TypeScript |
| 웹 프레임워크 | Express.js |
| 데이터베이스 | PostgreSQL |
| ORM | Drizzle ORM |
| 인증 | 세션 기반 (express-session + connect-pg-simple) |
| 비밀번호 해싱 | bcryptjs |
| 검증 | Zod |
| 결제 | 토스페이먼츠 (네이버페이 확장 가능) |
| 빌드 도구 | esbuild |

---

## 인증 시스템

### 개요

이메일/비밀번호 기반 세션 인증을 사용합니다.

### 인증 흐름

#### 회원가입 (POST /api/auth/signup)

```typescript
// 요청
{
  "email": "user@example.com",
  "password": "securepassword123",
  "userName": "홍길동",
  "phone": "010-1234-5678",        // 선택
  "zipCode": "12345",              // 선택
  "address": "서울시 강남구",       // 선택
  "detailAddress": "101동 1001호", // 선택
  "emailOptIn": true               // 선택
}

// 응답
{
  "id": 1,
  "email": "user@example.com",
  "userName": "홍길동",
  "isAdmin": false,
  "createdAt": "2025-12-15T..."
}
```

#### 로그인 (POST /api/auth/login)

```typescript
// 요청
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### 미들웨어

```typescript
// isAuthenticated - 로그인 확인
app.get("/api/cart", isAuthenticated, async (req, res) => {
  const userId = req.session.userId!;
  // ...
});

// isAdmin - 관리자 권한 확인 (isAuthenticated 이후 사용)
app.post("/api/admin/products", isAuthenticated, isAdmin, async (req, res) => {
  // ...
});
```

---

## 데이터베이스 스키마

### ERD (주요 테이블)

```
users (사용자)
├── id (PK, serial)
├── email (unique, required)
├── passwordHash (required)
├── userName (required)
├── phone, zipCode, address, detailAddress
├── emailOptIn (default: false)
├── isAdmin (default: false)
├── createdAt, updatedAt

categories (카테고리)
├── id (PK)
├── name, slug (unique)
├── description, imageUrl
└── createdAt

products (상품)
├── id (PK)
├── name, slug (unique)
├── description
├── price, originalPrice
├── categoryId (FK → categories.id)
├── imageUrl, images[], detailImages[]
├── stockQuantity, isAvailable
└── createdAt, updatedAt

productVariants (상품 옵션)
├── id (PK)
├── productId (FK → products.id, cascade)
├── size, color, sku (unique)
├── price, stockQuantity, isAvailable
└── createdAt, updatedAt

orders (주문) ⭐ 최신 업데이트
├── id (PK)
├── userId (FK → users.id)
├── totalAmount, status
├── shippingName, shippingPhone
├── shippingPostalCode, shippingAddress
├── shippingDetailAddress (NEW)      # 상세 주소
├── shippingRequestNote (NEW)        # 배송 요청사항
├── trackingNumber
├── paymentProvider (NEW)            # 'toss', 'naverpay', 'kakaopay' 등
├── paymentKey (NEW)                 # PG사 결제 고유 키
├── externalOrderId (NEW)            # PG사 주문 ID
├── paymentMethod                    # 'card', 'transfer' 등
├── paidAt, canceledAt, cancelReason, refundedAmount
└── createdAt, updatedAt

orderItems (주문 상품)
├── id (PK)
├── orderId (FK → orders.id, cascade)
├── productId (FK → products.id)
├── productName, productPrice, options, quantity
├── status, trackingNumber           # 개별 상품 상태 관리
└── createdAt

deliveryAddresses (배송지 관리)
├── id (PK)
├── userId (FK → users.id, cascade)
├── recipient, phone, zipCode
├── address, detailAddress
├── requestNote                      # 배송 요청사항
├── isDefault
└── createdAt

wishlistItems (위시리스트)
├── id (PK)
├── userId (FK → users.id, cascade)
├── productId (FK → products.id, cascade)
└── createdAt

cartItems (장바구니)
├── id (PK)
├── userId (FK → users.id, cascade)
├── productId (FK → products.id, cascade)
├── variantId (FK → productVariants.id, nullable)
├── quantity
└── createdAt, updatedAt
```

### 주문 상태 (OrderStatus)

```typescript
type OrderStatus =
  | "pending_payment"    // 결제 대기
  | "payment_confirmed"  // 결제 완료
  | "preparing"          // 상품 준비 중
  | "shipped"            // 배송 중
  | "delivered"          // 배송 완료
  | "cancelled";         // 취소됨
```

---

## API 엔드포인트

### 인증 API

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/signup` | 없음 | 회원가입 |
| POST | `/api/auth/login` | 없음 | 로그인 |
| POST | `/api/auth/logout` | 없음 | 로그아웃 |
| GET | `/api/auth/user` | 필요 | 현재 사용자 정보 |
| PUT | `/api/auth/user` | 필요 | 사용자 정보 수정 |
| PUT | `/api/auth/password` | 필요 | 비밀번호 변경 |

### 공개 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/products` | 상품 목록 (검색, 카테고리 필터) |
| GET | `/api/products/:id` | 상품 상세 |
| GET | `/api/products/:id/variants` | 상품 옵션 목록 |
| GET | `/api/categories` | 카테고리 목록 |

### 보호된 API (인증 필요)

#### 장바구니

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/cart` | 장바구니 조회 |
| POST | `/api/cart` | 장바구니에 상품 추가 |
| PATCH | `/api/cart/:id` | 장바구니 수량 변경 |
| DELETE | `/api/cart/:id` | 장바구니 아이템 삭제 |

#### 주문

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/orders` | 주문 생성 |
| GET | `/api/orders` | 내 주문 목록 |
| GET | `/api/orders/:id` | 주문 상세 |

#### 주문 생성 요청 예시 (NEW)

```typescript
POST /api/orders
{
  "shippingName": "홍길동",
  "shippingPhone": "010-1234-5678",
  "shippingPostalCode": "12345",
  "shippingAddress": "서울시 강남구 테헤란로 123",
  "shippingDetailAddress": "101동 1001호",  // NEW
  "shippingRequestNote": "부재 시 경비실에 맡겨주세요"  // NEW
}

// 응답
{
  "orderId": 1,
  "externalOrderId": "SHAKI_M1234_ABC123",  // PG사 주문번호
  "orderName": "상품명 외 2건",
  "amount": 50000
}
```

#### 결제

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/payments/client-key` | 토스페이먼츠 클라이언트 키 |
| POST | `/api/payments/confirm` | 결제 승인 |
| POST | `/api/payments/:orderId/cancel` | 결제 취소 |
| GET | `/api/payments/:orderId/status` | 결제 상태 조회 |

#### 위시리스트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/wishlist` | 위시리스트 조회 |
| POST | `/api/wishlist` | 위시리스트에 추가 |
| DELETE | `/api/wishlist/:productId` | 위시리스트에서 제거 |

#### 배송지 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/user/addresses` | 배송지 목록 |
| POST | `/api/user/addresses` | 배송지 추가 |
| PUT | `/api/user/addresses/:id` | 배송지 수정 |
| DELETE | `/api/user/addresses/:id` | 배송지 삭제 |

### 관리자 API (인증 + 관리자 권한 필요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/orders` | 전체 주문 목록 |
| PATCH | `/api/admin/orders/:id` | 주문 상태/운송장 수정 |
| PATCH | `/api/admin/order-items/:id` | 개별 상품 상태 수정 |
| POST | `/api/admin/products` | 상품 생성 |
| PATCH | `/api/admin/products/:id` | 상품 수정 |
| DELETE | `/api/admin/products/:id` | 상품 삭제 |
| GET | `/api/admin/payments/:orderId` | 결제 상세 조회 |
| POST | `/api/admin/payments/:orderId/cancel` | 강제 결제 취소 |

---

## 결제 시스템

### 아키텍처 (PG사 통합 구조)

현재 토스페이먼츠를 지원하며, 네이버페이 등 다른 PG사 확장이 용이한 구조입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                      orders 테이블                          │
├─────────────────────────────────────────────────────────────┤
│ paymentProvider: 'toss' | 'naverpay' | 'kakaopay' | ...    │
│ paymentKey: PG사 결제 고유 키                               │
│ externalOrderId: PG사 주문 ID                               │
│ paymentMethod: 'card' | 'transfer' | 'naverpay' | ...      │
└─────────────────────────────────────────────────────────────┘
```

### 결제 흐름 (토스페이먼츠)

```
1. 주문 생성 (POST /api/orders)
   └─ externalOrderId 생성 (SHAKI_XXXXX_XXXXX)

2. 클라이언트: 토스페이먼츠 결제창 호출
   └─ orderId = externalOrderId 사용

3. 결제 승인 (POST /api/payments/confirm)
   └─ paymentProvider: 'toss' 설정
   └─ paymentKey, externalOrderId 저장

4. 주문 상태 업데이트 → payment_confirmed
```

### 네이버페이 연동 시 (향후)

```typescript
// 네이버페이 결제 승인 예시
await storage.updateOrderPayment(orderId, {
  paymentProvider: "naverpay",
  paymentKey: "NAVERPAY_KEY_...",
  externalOrderId: "NAVER_ORDER_...",
  paymentMethod: "naverpay",
  status: "payment_confirmed",
  paidAt: new Date(),
});
```

### 결제 취소/환불

```typescript
// 취소 시 paymentProvider로 PG사 분기
if (order.paymentProvider === 'toss') {
  await cancelTossPayment(order.paymentKey, cancelReason);
} else if (order.paymentProvider === 'naverpay') {
  await cancelNaverPayment(order.paymentKey, cancelReason);
}
```

---

## Storage 인터페이스

### 개요

`IStorage` 인터페이스는 모든 데이터베이스 작업을 추상화합니다.

### 결제 관련 메서드 (NEW)

```typescript
interface IStorage {
  // 결제 정보 업데이트 (PG사 통합)
  updateOrderPayment(
    orderId: number,
    paymentData: {
      paymentProvider: string;   // 'toss', 'naverpay', 'kakaopay'
      paymentKey: string;        // PG사 결제 키
      externalOrderId: string;   // PG사 주문 ID
      paymentMethod?: string;    // 'card', 'transfer', 'naverpay'
      status: string;
      paidAt?: Date;
    }
  ): Promise<Order | undefined>;

  // PG사 주문 ID로 주문 조회
  getOrderByExternalOrderId(externalOrderId: string): Promise<Order | undefined>;

  // 결제 취소
  cancelOrderPayment(
    orderId: number,
    cancelData: {
      status: string;
      canceledAt: Date;
      cancelReason: string;
      refundedAmount?: string;
    }
  ): Promise<Order | undefined>;
}
```

---

## 새로운 기능 추가하기

### 1. 새로운 테이블 추가

```bash
# Step 1: shared/schema.ts에 테이블 정의
# Step 2: 데이터베이스 푸시
npm run db:push

# Step 3: server/storage.ts에 메서드 추가
# Step 4: server/routes/에 API 엔드포인트 추가
```

### 2. 새로운 PG사 추가 (예: 네이버페이)

```typescript
// Step 1: server/services/naverpay.service.ts 생성
export async function confirmNaverPayment(...) { ... }
export async function cancelNaverPayment(...) { ... }

// Step 2: server/routes/payment.routes.ts 수정
// paymentProvider로 분기 처리

// Step 3: server/config/index.ts에 환경 변수 추가
naverpay: {
  clientId: process.env.NAVERPAY_CLIENT_ID,
  secretKey: process.env.NAVERPAY_SECRET_KEY,
}
```

---

## 환경 변수

### 필수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | 세션 암호화 키 | 32자 이상 랜덤 문자열 |

### 선택

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NODE_ENV` | 실행 환경 | `development` |
| `PORT` | 서버 포트 | `5000` |
| `SECURE_COOKIE` | HTTPS 쿠키 설정 | `true` (프로덕션) |

### 토스페이먼츠

| 변수명 | 설명 |
|--------|------|
| `TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 |

---

## 문제 해결

### 1. 데이터베이스 연결 실패

```bash
# DATABASE_URL 확인
echo $DATABASE_URL

# PostgreSQL 연결 테스트
psql $DATABASE_URL -c "SELECT 1"
```

### 2. 세션 유지 안됨

- `SESSION_SECRET` 환경 변수 확인
- `sessions` 테이블 존재 확인
- CORS `credentials: true` 설정 확인

### 3. 결제 승인 실패

- 토스페이먼츠 시크릿 키 확인
- 결제 금액 일치 여부 확인 (서버 vs 클라이언트)
- `externalOrderId` 형식 확인 (6-64자)

### 4. 관리자 권한 부여

```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

### 5. 스키마 변경 후 적용

```bash
# 변경사항 확인
npm run check

# DB 반영
npm run db:push
```

---

## 변경 이력

### 2025-12-15 (최신)

**orders 테이블 스키마 변경**

- `shippingDetailAddress` 추가 (상세 주소)
- `shippingRequestNote` 추가 (배송 요청사항)
- 결제 필드 일반화 (PG사 통합 대응)
  - `tossPaymentKey` → `paymentKey`
  - `tossOrderId` → `externalOrderId`
  - `paymentProvider` 추가 ('toss', 'naverpay', 'kakaopay' 등)

**영향받는 파일**

- `shared/schema.ts` - orders 테이블 스키마
- `server/storage.ts` - IStorage 인터페이스 및 구현
- `server/routes/order.routes.ts` - 주문 생성 API
- `server/routes/payment.routes.ts` - 결제 API
- `server/routes/admin/payment.routes.ts` - 관리자 결제 API

---

## 추가 리소스

- [Express.js 문서](https://expressjs.com/)
- [Drizzle ORM 문서](https://orm.drizzle.team/)
- [Zod 문서](https://zod.dev/)
- [토스페이먼츠 API 문서](https://docs.tosspayments.com/)
- [네이버페이 API 문서](https://developer.pay.naver.com/)

---

MIT License
