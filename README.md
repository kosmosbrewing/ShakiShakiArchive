# ShakiShaki Archive 프론트엔드 가이드

이 문서는 ShakiShaki Archive 프론트엔드 개발을 위한 종합 가이드입니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [컴포넌트 아키텍처](#3-컴포넌트-아키텍처)
4. [상태 관리 (Pinia)](#4-상태-관리-pinia)
5. [API 계층](#5-api-계층)
6. [TypeScript 타입 정의](#6-typescript-타입-정의)
7. [라우터 및 가드](#7-라우터-및-가드)
8. [Composables (커스텀 훅)](#8-composables-커스텀-훅)
9. [스타일링](#9-스타일링)
10. [폼 처리](#10-폼-처리)
11. [주요 기능 구현 패턴](#11-주요-기능-구현-패턴)
12. [코딩 컨벤션](#12-코딩-컨벤션)
13. [개발 가이드](#13-개발-가이드)

---

## 1. 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Vue 3 (Composition API, `<script setup>`) |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router (인증 가드 포함) |
| UI 컴포넌트 | Shadcn/Vue (radix-vue 기반) |
| 스타일링 | Tailwind CSS (CSS 변수 기반 테마) |
| 빌드 도구 | Vite |
| 폼 검증 | Zod + vee-validate |
| HTTP 클라이언트 | Fetch API (credentials: include) |
| 언어 | TypeScript |

---

## 2. 프로젝트 구조

```
src/
├── assets/              # 정적 자산 (CSS, 이미지, 폰트)
│   └── index.css        # CSS 변수 정의
├── components/          # UI 컴포넌트
│   ├── ui/              # Shadcn/Vue 기본 UI 컴포넌트
│   ├── common/          # 재사용 가능한 공용 컴포넌트
│   ├── Navbar.vue       # 네비게이션 바
│   ├── Footer.vue       # 푸터
│   └── Home.vue         # 홈 페이지
├── pages/               # 라우팅된 페이지 컴포넌트
│   ├── auth/            # 로그인, 회원가입
│   ├── account/         # 계정 관리, 주소록, 정보 수정
│   ├── product/         # 상품 목록, 상품 상세
│   ├── cart/            # 장바구니
│   ├── order/           # 주문, 주문 목록, 주문 상세
│   ├── admin/           # 관리자 페이지
│   ├── static/          # About, Contact 등 정적 페이지
│   ├── wishlist/        # 위시리스트
│   └── NotFound.vue     # 404 페이지
├── composables/         # Vue 3 Composition API 커스텀 훅
│   ├── useCart.ts       # 장바구니 로직
│   ├── useProduct.ts    # 상품 상세 정보
│   ├── useOrders.ts     # 주문 관리
│   ├── useAddresses.ts  # 배송지 관리
│   ├── useWishlist.ts   # 위시리스트 관리
│   ├── useAuthGuard.ts  # 인증 가드
│   └── index.ts         # 재내보내기
├── stores/              # Pinia 상태 관리
│   └── auth.ts          # 사용자 인증 상태
├── lib/                 # 유틸리티 및 API 클라이언트
│   ├── api.ts           # REST API 함수
│   ├── utils.ts         # Tailwind 클래스 병합 유틸
│   └── formatters.ts    # 날짜, 가격 포맷팅
├── types/               # TypeScript 인터페이스
│   └── api.ts           # API 타입 정의
├── router/              # Vue Router 설정
│   └── index.ts         # 라우트 정의 및 가드
├── services/            # 외부 서비스 통합
│   ├── payment.ts       # 결제 관련 로직
│   ├── socialAuth.ts    # SNS 로그인
│   └── addressSearch.ts # 주소 검색
└── main.ts              # 앱 엔트리 포인트
```

### 경로 별칭

`@/*`는 `./src/*`로 매핑됩니다 (vite.config.ts, tsconfig.json에서 설정).

```typescript
// 사용 예시
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
```

---

## 3. 컴포넌트 아키텍처

### 3.1 UI 컴포넌트 (ui/)

Shadcn/Vue 기반의 기본 UI 컴포넌트들입니다.

| 컴포넌트 | 설명 |
|---------|------|
| Button | 버튼 (variant: default, destructive, outline, secondary, ghost, link) |
| Card, CardHeader, CardContent | 카드 컨테이너 |
| Input, Label, Textarea | 폼 입력 요소 |
| Select, SelectItem | 드롭다운 선택 |
| Badge | 배지/태그 |
| Alert | 경고/알림 |
| Sheet | 사이드 슬라이드 (모바일 메뉴) |
| Accordion | 아코디언 |
| Carousel | 이미지 캐러셀 |
| NavigationMenu | 네비게이션 메뉴 |
| Separator | 구분선 |

**사용 패턴:**
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

### 3.2 공용 컴포넌트 (common/)

재사용 가능한 비즈니스 컴포넌트들입니다.

| 컴포넌트 | 용도 | Props |
|---------|------|-------|
| LoadingSpinner | 로딩 상태 표시 | - |
| EmptyState | 빈 상태 화면 | `message`, `buttonText`, `buttonLink` |
| ProductThumbnail | 상품 썸네일 | `imageUrl`, `productId` |
| QuantitySelector | 수량 선택 (±버튼) | `modelValue`, `@update:modelValue` |
| AddressForm | 배송지 입력 폼 | `form`, `showSaveDefault`, `@update:form`, `@searchAddress` |
| AddressCard | 배송지 카드 | `address` |
| PhoneInput | 전화번호 입력 (3분할) | `modelValue`, `@update:modelValue` |

**사용 패턴:**
```typescript
import { LoadingSpinner, ProductThumbnail } from "@/components/common";
```

### 3.3 레이아웃 컴포넌트

- **Navbar.vue** - 상단 네비게이션 (로그인/로그아웃, 카테고리, 장바구니 아이콘)
- **Footer.vue** - 하단 푸터
- **Home.vue** - 홈 페이지 (히어로 섹션)
- **SafeImage.vue** - 이미지 로딩 실패 처리

---

## 4. 상태 관리 (Pinia)

### 4.1 Auth Store (`/src/stores/auth.ts`)

사용자 인증 상태를 관리합니다.

**상태:**
```typescript
const user = ref<User | null>(null);           // 사용자 정보
const isLoading = ref(false);                  // 로딩 상태
const error = ref<string | null>(null);        // 에러 메시지

// 계산된 상태
const isAuthenticated = computed(() => !!user.value);
const isAdmin = computed(() => user.value?.isAdmin ?? false);
```

**주요 메서드:**

| 메서드 | 설명 |
|--------|------|
| `loadUser()` | 앱 초기화 시 세션 쿠키로부터 사용자 정보 복원 |
| `handleLogin(data)` | 로그인 후 비회원 카트 병합 |
| `handleLogout()` | 로그아웃 및 카트 이벤트 발생 |
| `register(data)` | 회원가입 |
| `migrateGuestCart()` | 비회원 카트를 회원 카트로 병합 |

**사용 예시:**
```typescript
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

// 로그인 체크
if (authStore.isAuthenticated) {
  // 로그인된 상태
}

// 관리자 체크
if (authStore.isAdmin) {
  // 관리자 권한
}

// 로그아웃
await authStore.handleLogout();
```

---

## 5. API 계층

### 5.1 기본 구조 (`/src/lib/api.ts`)

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",  // 쿠키 포함 (세션 기반 인증)
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.status === 204 ? ({} as T) : response.json();
}
```

### 5.2 API 도메인별 함수

#### 인증 및 사용자
```typescript
login(data: { email, password }) → Promise<User>
signup(data) → Promise<User>
logout() → Promise<void>
fetchCurrentUser() → Promise<User>
updateMyInfo(data) → Promise<any>
changeMyPassword(data) → Promise<any>
withdrawUser() → Promise<void>
```

#### 상품 및 카테고리
```typescript
fetchProducts(categoryId?, search?) → Promise<Product[]>
fetchProduct(id) → Promise<Product>
fetchProductVariants(productId) → Promise<ProductVariant[]>
fetchSizeMeasurements(variantId) → Promise<SizeMeasurement[]>
fetchCategories() → Promise<Category[]>
```

#### 장바구니 및 위시리스트
```typescript
fetchCart() → Promise<CartItem[]>
addToCart(data) → Promise<any>
updateCartItem(itemId, quantity) → Promise<any>
deleteCartItem(itemId) → Promise<void>

fetchWishlist() → Promise<WishlistItem[]>
addToWishlist(productId) → Promise<any>
removeFromWishlist(productId) → Promise<void>
```

#### 주문 및 배송지
```typescript
createOrder(data) → Promise<CreateOrderResponse>
fetchOrders() → Promise<Order[]>
fetchOrder(orderId) → Promise<Order>
cancelPayment(orderId, data) → Promise<Order>

fetchDeliveryAddresses() → Promise<DeliveryAddress[]>
createDeliveryAddress(data) → Promise<any>
deleteDeliveryAddress(addressId) → Promise<void>
```

#### 관리자 전용
```typescript
createProduct(data) → Promise<Product>
updateProduct(id, data) → Promise<Product>
deleteProduct(id) → Promise<void>

createCategory(data) → Promise<Category>
updateCategory(id, data) → Promise<Category>
deleteCategory(id) → Promise<void>

updateOrderStatus(orderId, status) → Promise<Order>
```

---

## 6. TypeScript 타입 정의

### 6.1 주요 인터페이스 (`/src/types/api.ts`)

```typescript
// 사용자
interface User {
  id: string;
  email: string;
  userName: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  phone: string;
  emailOptIn: boolean;
  profileImageUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// 상품
interface Product {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  description?: string;
  imageUrl: string;
  images?: string[];
  detailImages?: string[];
  isAvailable: boolean;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
}

// 상품 옵션
interface ProductVariant {
  id: number;
  productId: number;
  size: string;
  color?: string;
  stockQuantity: number;
  isAvailable: boolean;
}

// 장바구니 아이템
interface CartItem {
  id: number;
  userId: number;
  productId: number;
  variantId?: number;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

// 주문
interface Order {
  id: string;
  userId: number;
  totalAmount: string;
  status: OrderStatus;
  shippingName: string;
  shippingPhone: string;
  shippingPostalCode: string;
  shippingAddress: string;
  shippingDetailAddress?: string;
  shippingRequestNote?: string;
  trackingNumber?: string;
  paymentProvider?: PaymentProvider;
  paymentKey?: string;
  orderItems?: OrderItem[];
  createdAt: string;
}

// 배송지
interface DeliveryAddress {
  id: number;
  userId: number;
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  requestNote?: string;
  isDefault: boolean;
}

// 주문 상태
type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";
```

---

## 7. 라우터 및 가드

### 7.1 라우트 정의 (`/src/router/index.ts`)

| 경로 | 컴포넌트 | 인증 | 관리자 |
|------|---------|:----:|:------:|
| `/` | Home | - | - |
| `/login` | Login | - | - |
| `/signup` | Signup | - | - |
| `/account` | Account | ✓ | - |
| `/modify` | Modify | ✓ | - |
| `/addresslist` | AddressList | ✓ | - |
| `/product/:category` | Product | - | - |
| `/productDetail/:id` | ProductDetail | - | - |
| `/cart` | Cart | - | - |
| `/order` | Order | ✓ | - |
| `/orderlist` | OrderList | ✓ | - |
| `/orderdetail/:id?` | OrderDetail | ✓ | - |
| `/checkout` | Checkout | - | - |
| `/wishlist` | WishList | ✓ | - |
| `/admin` | Admin | ✓ | ✓ |
| `/admin/products` | ProductAdmin | ✓ | ✓ |
| `/admin/categories` | CategoryAdmin | ✓ | ✓ |
| `/admin/orders` | OrderAdmin | ✓ | ✓ |

### 7.2 네비게이션 가드

```typescript
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // 인증이 필요한 페이지면 사용자 정보 로드 시도
  if (!authStore.user && (to.meta.requiresAuth || to.meta.requiresAdmin)) {
    try {
      await authStore.loadUser();
    } catch (error) {
      return next("/login");
    }
  }

  // 로그인 체크
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    alert("로그인이 필요한 서비스입니다.");
    return next("/login");
  }

  // 관리자 권한 체크
  if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
    alert("접근 권한이 없습니다. (관리자 전용)");
    return next("/");
  }

  next();
});
```

### 7.3 라우트 메타 필드

```typescript
{
  path: "/admin",
  component: Admin,
  meta: {
    requiresAuth: true,   // 로그인 필요
    requiresAdmin: true   // 관리자 권한 필요
  }
}
```

---

## 8. Composables (커스텀 훅)

### 8.1 useCart - 장바구니 관리

```typescript
import { useCart, useCartWithAutoLoad } from "@/composables";

const {
  cartItems,
  loading,
  totalProductPrice,  // 상품 합계
  shippingFee,        // 배송비 (5만원 이상 무료)
  totalAmount,        // 총 결제 금액
  itemCount,          // 상품 개수
  isEmpty,            // 빈 장바구니 여부
  loadCart,           // 장바구니 로드
  addItem,            // 상품 추가
  updateQuantity,     // 수량 변경
  removeItem,         // 상품 삭제
} = useCart();

// 자동 로드 버전 (onMounted에서 자동 로드)
const cart = useCartWithAutoLoad();
```

### 8.2 useProduct - 상품 상세

```typescript
import { useProduct, useVariantSelection, useProductDetail } from "@/composables";

// 개별 사용
const { product, variants, loadProduct } = useProduct(productId);
const { selectedVariantId, quantity, selectedVariant, selectVariant } = useVariantSelection(variants);

// 통합 사용
const {
  product,
  variants,
  selectedVariantId,
  quantity,
  selectedVariant,
  allSizeData,
  activeColumns,
  loadAllData,
} = useProductDetail();
```

### 8.3 useOrders - 주문 관리

```typescript
import { useOrders, useOrderStats, useCreateOrder, useCancelOrder } from "@/composables";

// 주문 목록
const { orders, loading, loadOrders } = useOrders();

// 주문 통계
const { orderCounts, loadOrderStats } = useOrderStats();

// 주문 생성
const { submitOrder, orderResult } = useCreateOrder();
const result = await submitOrder({
  shippingName: "홍길동",
  shippingPhone: "010-1234-5678",
  shippingPostalCode: "12345",
  shippingAddress: "서울시 강남구",
});

// 주문 취소
const { cancel } = useCancelOrder();
await cancel(orderId, "단순 변심");
```

### 8.4 useAddresses - 배송지 관리

```typescript
import { useAddresses, useShippingForm } from "@/composables";

const {
  addresses,
  hasDefaultAddress,
  defaultAddress,
  loadAddresses,
  addAddress,
  removeAddress,
} = useAddresses();

// 배송지 폼
const { form, updateField, resetForm, fillFromAddress } = useShippingForm();
```

### 8.5 useWishlist - 위시리스트

```typescript
import { useWishlist, useWishlistToggle } from "@/composables";

const {
  wishlistItems,
  itemCount,
  isEmpty,
  loadWishlist,
  addItem,
  removeItem,
  isInWishlist,
} = useWishlist();

// 토글 (상품 상세에서 사용)
const { isWishlisted, toggle, checkStatus } = useWishlistToggle(productId);
```

### 8.6 useAuthGuard - 인증 가드

```typescript
import { useAuthGuard, useAuthCheck } from "@/composables";

// 페이지 레벨 가드 (onMounted에서 체크)
useAuthGuard({
  redirectTo: "/login",
  message: "로그인이 필요합니다.",
});

// 액션 레벨 체크
const { requireAuth } = useAuthCheck();
requireAuth(() => {
  // 로그인된 경우에만 실행
  addToCart(item);
}, "장바구니 이용을 위해 로그인이 필요합니다.");
```

---

## 9. 스타일링

### 9.1 Tailwind CSS 설정 (`/tailwind.config.js`)

```javascript
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,vue}"],
  theme: {
    extend: {
      fontSize: {
        heading: ["var(--font-size-heading)", { lineHeight: "var(--line-height-heading)" }],
        body: ["var(--font-size-body)", { lineHeight: "var(--line-height-body)" }],
        caption: ["var(--font-size-caption)", { lineHeight: "var(--line-height-caption)" }],
      },
      colors: {
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        // ... 기타 색상
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### 9.2 CSS 변수 (`/src/assets/index.css`)

```css
:root {
  /* 타이포그래피 */
  --font-size-heading: 1.125rem;    /* 18px */
  --font-size-body: 0.875rem;       /* 14px */
  --font-size-caption: 0.75rem;     /* 12px */

  /* 색상 (HSL) */
  --background: 0 0% 100%;
  --foreground: 31 34% 28%;         /* 갈색 브랜드 컬러 */
  --primary: 336 60% 68%;           /* #DE7BA3 (핑크) */
  --primary-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;     /* 빨강 */

  /* 컴포넌트 */
  --border: 20 5.9% 90%;
  --radius: 0.5rem;
}
```

### 9.3 Tailwind 클래스 병합 유틸

```typescript
// src/lib/utils.ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 사용 예시
<button :class="cn('px-4 py-2', disabled && 'opacity-50', className)">
  Click
</button>
```

### 9.4 폰트

Pretendard 한글 폰트를 사용합니다.

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

body {
  font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
```

---

## 10. 폼 처리

### 10.1 기본 폼 패턴

```typescript
const form = reactive({
  email: "",
  password: "",
});

const loading = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async () => {
  // 유효성 검사
  if (!form.email || !form.password) {
    error.value = "모든 필드를 입력해주세요.";
    return;
  }

  loading.value = true;
  try {
    await login(form);
    router.push("/");
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "알 수 없는 에러";
  } finally {
    loading.value = false;
  }
};
```

### 10.2 v-model 양방향 바인딩 컴포넌트

```vue
<script setup lang="ts">
interface Props {
  modelValue: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const updateValue = (value: string) => {
  emit("update:modelValue", value);
};
</script>

<template>
  <Input
    :model-value="modelValue"
    @update:model-value="updateValue"
  />
</template>
```

---

## 11. 주요 기능 구현 패턴

### 11.1 비회원 장바구니 + 로그인 시 병합

```typescript
// 비회원: localStorage에 저장
const addToGuestCart = (item: CartItem) => {
  const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
  cart.push(item);
  localStorage.setItem("guest_cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
};

// 로그인 시 병합 (auth store에서)
async function migrateGuestCart() {
  const guestCartJson = localStorage.getItem("guest_cart");
  if (!guestCartJson) return;

  const guestCart = JSON.parse(guestCartJson);
  for (const item of guestCart) {
    await addToCart(item);
  }
  localStorage.removeItem("guest_cart");
  window.dispatchEvent(new Event("cart-updated"));
}
```

### 11.2 장바구니 개수 실시간 업데이트

```typescript
// Navbar.vue
const updateCartCount = async () => {
  if (authStore.isAuthenticated) {
    const cartItems = await fetchCart();
    cartItemCount.value = cartItems.length;
  } else {
    const localCart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
    cartItemCount.value = localCart.length;
  }
};

// 이벤트 리스너
window.addEventListener("cart-updated", updateCartCount);
watch(() => authStore.isAuthenticated, updateCartCount);
```

### 11.3 주문 생성 흐름

```typescript
// 1. 주문 생성
const { submitOrder } = useCreateOrder();
const result = await submitOrder({
  shippingName,
  shippingPhone,
  shippingPostalCode,
  shippingAddress,
  shippingDetailAddress,
  shippingRequestNote,
});

// 2. 결제 페이지로 이동
router.push({
  path: "/checkout",
  query: {
    orderId: result.orderId,
    externalOrderId: result.externalOrderId,
    amount: result.amount,
  },
});

// 3. 결제 완료 후 주문 상세로
router.push(`/orderdetail/${orderId}`);
```

---

## 12. 코딩 컨벤션

### 12.1 파일 명명 규칙

| 분류 | 패턴 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProductDetail.vue` |
| Composable | camelCase + use 접두어 | `useCart.ts` |
| Store | camelCase | `auth.ts` |
| 타입 파일 | camelCase | `api.ts` |
| 유틸리티 | camelCase | `formatters.ts` |

### 12.2 Composable 작성 패턴

```typescript
export function useFeature() {
  // 1. 상태
  const data = ref<Type[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 2. 계산된 상태
  const isEmpty = computed(() => data.value.length === 0);

  // 3. 메서드
  const loadData = async () => {
    loading.value = true;
    try {
      data.value = await fetchData();
    } catch (e) {
      error.value = "에러 메시지";
    } finally {
      loading.value = false;
    }
  };

  // 4. 반환
  return {
    data,
    loading,
    error,
    isEmpty,
    loadData,
  };
}
```

### 12.3 페이지 컴포넌트 패턴

```vue
<script setup lang="ts">
// 1. 임포트
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { LoadingSpinner, EmptyState } from "@/components/common";

// 2. 설정
const router = useRouter();
const authStore = useAuthStore();
const { data, loading, loadData } = useComposable();

// 3. 생명주기
onMounted(() => {
  loadData();
});
</script>

<template>
  <!-- 로딩 -->
  <LoadingSpinner v-if="loading" />

  <!-- 빈 상태 -->
  <EmptyState v-else-if="data.length === 0" message="데이터 없음" />

  <!-- 컨텐츠 -->
  <div v-else>
    <!-- ... -->
  </div>
</template>
```

### 12.4 Props와 Emits

```typescript
// Props
interface Props {
  modelValue: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();
```

### 12.5 에러 처리

```typescript
try {
  const result = await apiCall();
} catch (err: unknown) {
  const errorMessage = err instanceof Error
    ? err.message
    : "알 수 없는 에러 발생";
  error.value = errorMessage;
  console.error("작업 실패:", err);
}
```

---

## 13. 개발 가이드

### 13.1 새 페이지 추가

1. `/src/pages/feature/FeatureName.vue` 생성
2. `/src/pages/feature/index.ts`에 export 추가
3. `/src/router/index.ts`에 라우트 추가
4. 필요시 composable 생성

```typescript
// router/index.ts
{
  path: "/feature",
  name: "Feature",
  component: () => import("@/pages/feature/Feature.vue"),
  meta: { requiresAuth: true }
}
```

### 13.2 새 Composable 추가

1. `/src/composables/useFeatureName.ts` 생성
2. 함수 작성 (상태, 계산된 값, 메서드)
3. `/src/composables/index.ts`에 export 추가

### 13.3 새 API 함수 추가

1. `/src/lib/api.ts`에 함수 추가
2. `/src/types/api.ts`에 타입 추가 (필요시)

```typescript
// api.ts
export async function fetchFeature(id: number): Promise<Feature> {
  return apiRequest(`/api/features/${id}`);
}
```

### 13.4 새 UI 컴포넌트 추가

Shadcn/Vue CLI 사용:
```bash
npx shadcn-vue@latest add [component-name]
```

### 13.5 포맷팅 유틸리티 (`/src/lib/formatters.ts`)

```typescript
formatDate(dateStr)        → "2024.12.16"
formatDateTime(dateStr)    → "2024.12.16 14:30"
formatPrice(price)         → "100,000원"
formatNumber(value)        → "100,000"
parsePhone(phone)          → { part1, part2, part3 }
formatPhone(parts)         → "010-1234-5678"
formatOrderStatus(status)  → "배송준비중"
```

---

## 부록: 주요 파일 경로

| 항목 | 경로 |
|------|------|
| 메인 진입점 | `/src/main.ts` |
| 루트 컴포넌트 | `/src/App.vue` |
| 라우터 설정 | `/src/router/index.ts` |
| Auth 스토어 | `/src/stores/auth.ts` |
| API 함수 | `/src/lib/api.ts` |
| 타입 정의 | `/src/types/api.ts` |
| Tailwind 설정 | `/tailwind.config.js` |
| CSS 변수 | `/src/assets/index.css` |
| 포맷팅 유틸 | `/src/lib/formatters.ts` |
| Composables | `/src/composables/` |
| 공용 컴포넌트 | `/src/components/common/` |
| UI 컴포넌트 | `/src/components/ui/` |

---

## 참고

- [Vue 3 공식 문서](https://vuejs.org/)
- [Pinia 공식 문서](https://pinia.vuejs.org/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)
- [Shadcn/Vue 공식 문서](https://www.shadcn-vue.com/)
- [Vite 공식 문서](https://vitejs.dev/)
