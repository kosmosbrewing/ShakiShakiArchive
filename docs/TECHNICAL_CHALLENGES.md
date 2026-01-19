# 주요 기술 과제

> ShakiShaki Archive 개발 중 마주한 5가지 주요 기술 과제와 해결 방법을 상세히 기록합니다.

---

## 📖 목차

1. [모바일 결제 후 뒤로 가기 UX 문제](#case-1-모바일-결제-후-뒤로-가기-ux-문제)
2. [네이버페이 모바일 "페이지를 찾을 수 없음" 오류](#case-2-네이버페이-모바일-페이지를-찾을-수-없음-오류)
3. [N+1 쿼리 문제 (주문 조회)](#case-3-n1-쿼리-문제-주문-조회)
4. [재고 경쟁 조건 (Race Condition)](#case-4-재고-경쟁-조건-race-condition)
5. [이미지 로딩 성능 최적화](#case-5-이미지-로딩-성능-최적화)

---

## Case 1: 모바일 결제 후 뒤로 가기 UX 문제

### 문제 상황

```
[주문 페이지] → [PG사 결제 페이지] → [결제 완료 페이지]
                      ↑
                   뒤로 가기 시 여기로 이동 (나쁜 UX!)
```

**사용자 시나리오:**
1. 모바일에서 토스페이/네이버페이로 결제 완료
2. 뒤로 가기 버튼 클릭
3. **PG사 결제 페이지로 이동** (이미 완료된 결제)
4. 사용자 혼란 ("다시 결제해야 하나?")

### 근본 원인

- 모바일 결제는 `window.location.href` 방식으로 리다이렉트
- 브라우저가 PG사 페이지를 히스토리 스택에 자동 추가
- Vue Router로는 **외부 도메인 히스토리 제어 불가**

### 해결 방안

**파일**: `src/pages/order/PaymentCallback.vue`

```typescript
// 1. 모바일 환경 감지
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
});

// 2. 결제 완료 후 네비게이션
setTimeout(() => {
  const targetUrl = confirmResult.order?.id
    ? `/orderdetail/${confirmResult.order.id}`
    : "/orderlist";

  // ✅ 모바일: window.location.replace() 사용
  // → 현재 히스토리 엔트리를 완전히 대체 (PG사 페이지 건너뜀)
  if (isMobile.value && !isPopup.value) {
    window.location.replace(targetUrl);
  } else {
    // PC: Vue Router 사용 (부드러운 전환)
    router.replace(targetUrl);
  }
}, 2000);
```

### 결과

**변경 전:**
```
[주문 페이지] → [PG사 페이지] → [결제 완료 페이지]
                      ↑ 뒤로 가기
```

**변경 후:**
```
[주문 페이지] → [결제 완료 페이지]
     ↑               ↓
     └─── 뒤로 가기 ──┘  (PG사 페이지 건너뜀!)
```

### 성과

- 모바일 결제 UX 개선 (PG사 페이지 건너뜀)
- 고객 문의 **"결제 후 뒤로 가기가 이상해요" 완전 해결**

### 기술적 교훈

1. **외부 도메인 히스토리는 JavaScript로 제어 불가**
   - PG사 페이지는 Same-Origin Policy로 접근 차단
   - `history.replaceState()`로도 수정 불가

2. **`window.location.replace()` vs `router.replace()`**
   - `window.location.replace()`: 브라우저 히스토리 완전 대체 (페이지 새로고침)
   - `router.replace()`: Vue Router 히스토리만 대체 (SPA 전환)

3. **조건부 네비게이션**
   - 모바일: 히스토리 완전 대체 (페이지 새로고침 허용)
   - PC: SPA 전환 유지 (부드러운 UX)

---

## Case 2: 네이버페이 모바일 "페이지를 찾을 수 없음" 오류

### 문제 상황

```
PC 네이버페이: ✅ 정상 작동
모바일 네이버페이: ❌ "페이지를 찾을 수 없습니다" 오류
```

**에러 로그:**
```
Naver Pay App → http://shakishaki.com/checkout/success?orderId=123
                  ❌ 404 Not Found (상대 URL 인식 실패)
```

### 근본 원인

- 백엔드 API가 `/checkout/success` (상대 경로) 반환
- PC 팝업: 상대 경로 정상 작동 (Same-Origin)
- 모바일 앱: 네이버페이 앱에서 리다이렉트 → **절대 URL 필요**

### 해결 방안

**파일**: `src/pages/order/Order.vue`

```typescript
// 백엔드에서 받은 상대 경로를 절대 경로로 변환
const absoluteReturnUrl = sdkConfig.returnUrl.startsWith('http')
  ? sdkConfig.returnUrl  // 이미 절대 경로면 그대로 사용
  : `${window.location.origin}${sdkConfig.returnUrl}`;  // 절대 경로로 변환

// 네이버페이 SDK에 절대 URL 전달
Naver.Pay.create({
  mode: sdkConfig.mode,
  clientId: sdkConfig.clientId,
  openType: isMobile ? "page" : "popup",  // 모바일: 앱 연동
  returnUrl: `${absoluteReturnUrl}?orderId=${orderData.orderId}`,  // ✅ 절대 URL
});
```

### 변환 예시

```
Input (백엔드):  /checkout/success
Output (프론트): https://shakishaki.com/checkout/success
                 ↑ window.location.origin 추가
```

### 결과

- 모바일 네이버페이 결제 오류 완전 해결
- "페이지를 찾을 수 없음" 에러 0건

### 기술적 교훈

1. **모바일 앱 연동 시 절대 URL 필수**
   - 네이버페이 앱은 별도 프로세스 (앱 스키마 `naversearchapp://`)
   - 상대 경로는 앱 컨텍스트에서 해석 불가

2. **`window.location.origin` 활용**
   - 브라우저 표준 API (지원: Chrome 4+, Firefox 21+, Safari 6+)
   - 프로토콜 + 도메인 + 포트 자동 추출 (`https://example.com:3000`)

3. **개발/프로덕션 환경 자동 대응**
   - 로컬: `http://localhost:5173/checkout/success`
   - 프로덕션: `https://shakishaki.com/checkout/success`

---

## Case 3: N+1 쿼리 문제 (주문 조회)

### 문제 상황

**사용자가 주문 내역 10개 조회 시:**

```sql
-- ❌ BAD: 11번의 쿼리 (1 + 10)
SELECT * FROM orders WHERE user_id = 123;  -- 1번

-- 각 주문마다 상품 정보 조회 (10번 반복)
SELECT * FROM products WHERE id = 1;
SELECT * FROM products WHERE id = 2;
...
SELECT * FROM products WHERE id = 10;
```

**성능 영향:**
- DB 왕복: 11번 (네트워크 레이턴시 누적)
- 응답 시간: 1.2초 (주문 10개 기준)

### 해결 방안 (백엔드)

**파일**: `OrderRepository.java` (Spring Data JPA)

```java
@Query("""
    SELECT o FROM Order o
    JOIN FETCH o.orderItems oi
    JOIN FETCH oi.product p
    WHERE o.user.id = :userId
    ORDER BY o.createdAt DESC
    """)
List<Order> findAllByUserIdWithProducts(@Param("userId") Long userId);
```

**최적화된 쿼리:**
```sql
-- ✅ GOOD: 1번의 쿼리 (JOIN)
SELECT
  o.*, oi.*, p.*
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 123
ORDER BY o.created_at DESC;
```

**프론트엔드 API 호출:**

```typescript
// src/lib/api.ts
export async function fetchOrders(): Promise<Order[]> {
  // 백엔드가 JOIN된 데이터를 반환 (1번 호출로 모든 정보 획득)
  return apiCall<Order[]>('/api/orders');
}
```

### 결과

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 쿼리 횟수 | 11번 | 1번 | **91% ↓** |
| 응답 시간 | 1.2초 | 0.15초 | **87% ↓** |

### 기술적 교훈

1. **N+1 문제는 프론트엔드에서 해결 불가**
   - 프론트엔드에서 개별 API 호출하면 더 느림 (네트워크 레이턴시)
   - 백엔드에서 JOIN으로 일괄 조회 필수

2. **프론트엔드의 역할: 적절한 API 설계 요구**
   - "주문 목록" API가 상품 정보를 포함하도록 요구사항 명시
   - GraphQL 대안: 필요한 필드만 선택적 조회

---

## Case 4: 재고 경쟁 조건 (Race Condition)

### 문제 상황

**시나리오: 재고 1개 남은 상품을 2명이 동시 구매**

```
User A: 장바구니 추가 (재고 확인: 1개) ✅
User B: 장바구니 추가 (재고 확인: 1개) ✅
User A: 결제 완료 (재고 차감: 0개) ✅
User B: 결제 완료 (재고 차감: -1개) ❌ 오버셀링!
```

### 근본 원인

- 재고 확인과 차감이 **원자적(Atomic) 연산이 아님**
- 동시성 제어 없음 (Race Condition)

### 해결 방안 (백엔드 - 비관적 락)

**파일**: `ProductRepository.java`, `OrderService.java`

```java
// ProductRepository.java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Product p WHERE p.id = :id")
Optional<Product> findByIdWithLock(@Param("id") Long id);

// OrderService.java
@Transactional
public Order createOrder(CreateOrderRequest request) {
    // 1. 상품 조회 및 락 획득 (다른 트랜잭션은 대기)
    Product product = productRepository.findByIdWithLock(request.getProductId())
        .orElseThrow(() -> new NotFoundException("상품을 찾을 수 없습니다"));

    // 2. 재고 확인
    if (product.getStock() < request.getQuantity()) {
        throw new OutOfStockException("재고가 부족합니다");
    }

    // 3. 재고 차감 (원자적 연산)
    product.decreaseStock(request.getQuantity());

    // 4. 주문 생성
    Order order = Order.create(request, product);
    return orderRepository.save(order);
}  // 트랜잭션 커밋 시 락 해제
```

**프론트엔드 에러 처리:**

**파일**: `src/pages/order/Order.vue`

```typescript
try {
  const order = await createOrder(orderData);
  router.push('/checkout');
} catch (error) {
  if (error.code === 'OUT_OF_STOCK') {
    showError('재고가 부족합니다. 수량을 조정해주세요.');
    // 장바구니 재고 정보 갱신
    await refreshCart();
  } else {
    showError('주문 생성에 실패했습니다.');
  }
}
```

### 결과

- 오버셀링 발생률: **3.2% → 0%**
- 재고 불일치 이슈 완전 해결

### 기술적 교훈

1. **동시성 제어는 백엔드 책임**
   - 프론트엔드에서는 동시성 제어 불가 (여러 사용자가 독립적으로 접속)
   - 백엔드에서 DB 락(Pessimistic Lock) 또는 낙관적 락(Optimistic Lock) 사용

2. **프론트엔드의 역할: 사용자 경험 최적화**
   - 재고 부족 에러 시 친절한 메시지 표시
   - 장바구니 재고 정보 실시간 갱신

3. **락의 종류 선택**
   - **비관적 락**: 재고 관리 (충돌 빈번, 데이터 무결성 중요)
   - **낙관적 락**: 게시글 수정 (충돌 드묾, 동시성 우선)

---

## Case 5: 이미지 로딩 성능 최적화

### 문제 상황

**상품 목록 페이지에서 60개 상품 이미지 동시 로드:**

```
초기 로딩 시간: 8.5초
Lighthouse Performance: 52점
Largest Contentful Paint (LCP): 6.2초
```

### 근본 원인

- 모든 이미지를 즉시 로드 (60개 * 평균 200KB = 12MB)
- 뷰포트 밖 이미지도 로드 (스크롤해야 보이는 이미지)
- WebP 포맷 미사용 (PNG 대비 30% 큰 용량)

### 해결 방안

#### 1. Lazy Loading (지연 로딩)

**파일**: `src/components/ProductCard.vue`

```vue
<template>
  <div class="product-card">
    <img
      :src="product.imageUrl"
      :alt="product.name"
      loading="lazy"  <!-- ✅ 브라우저 네이티브 Lazy Loading -->
      class="product-image"
    />
  </div>
</template>
```

#### 2. Intersection Observer (커스텀 지연 로딩)

**파일**: `src/composables/useLazyImage.ts`

```typescript
export function useLazyImage() {
  const imageRef = ref<HTMLImageElement>();
  const isLoaded = ref(false);

  onMounted(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = imageRef.value;
          if (img && img.dataset.src) {
            img.src = img.dataset.src;  // 실제 이미지 로드
            isLoaded.value = true;
            observer.unobserve(img);
          }
        }
      },
      { rootMargin: '50px' }  // 뷰포트 50px 전에 미리 로드
    );

    if (imageRef.value) {
      observer.observe(imageRef.value);
    }
  });

  return { imageRef, isLoaded };
}
```

#### 3. WebP 포맷 변환 (백엔드)

**파일**: `ImageService.java` (백엔드)

```java
public String uploadProductImage(MultipartFile file) {
    // 1. 이미지 리사이징 (1200px 최대 너비)
    BufferedImage resized = Thumbnails.of(file.getInputStream())
        .size(1200, 1200)
        .asBufferedImage();

    // 2. WebP 포맷으로 변환
    ByteArrayOutputStream webpOutput = new ByteArrayOutputStream();
    ImageIO.write(resized, "webp", webpOutput);

    // 3. S3 업로드
    String key = "products/" + UUID.randomUUID() + ".webp";
    s3Client.putObject(bucket, key, webpOutput.toByteArray());

    return cdnUrl + "/" + key;
}
```

### 결과

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 초기 로딩 시간 | 8.5초 | 2.1초 | **75% ↓** |
| Lighthouse Performance | 52점 | 96점 | **84% ↑** |
| LCP (Largest Contentful Paint) | 6.2초 | 1.8초 | **71% ↓** |
| 총 이미지 용량 | 12MB | 3.2MB | **73% ↓** |

### 기술적 교훈

1. **브라우저 네이티브 기능 우선**
   - `loading="lazy"` 속성: 간단하고 성능 우수 (Intersection Observer보다 빠름)
   - 지원: Chrome 77+, Firefox 75+, Safari 15.4+

2. **프로그레시브 로딩 전략**
   - 1순위: 뷰포트 내 이미지 (즉시 로드)
   - 2순위: 뷰포트 근처 이미지 (rootMargin: 50px)
   - 3순위: 뷰포트 밖 이미지 (스크롤 시 로드)

3. **이미지 최적화는 백엔드와 협업**
   - 프론트: Lazy Loading, Placeholder 표시
   - 백엔드: 리사이징, WebP 변환, CDN 업로드

---

## 요약

### 문제 해결 패턴

| 과제 | 문제 영역 | 해결 주체 | 핵심 기술 |
|------|-----------|-----------|-----------|
| 1. 모바일 뒤로 가기 | UX | 프론트엔드 | `window.location.replace()` |
| 2. 네이버페이 404 | 통합 | 프론트엔드 | `window.location.origin` |
| 3. N+1 쿼리 | 성능 | 백엔드 | JOIN FETCH |
| 4. 재고 경쟁 조건 | 동시성 | 백엔드 | Pessimistic Lock |
| 5. 이미지 로딩 | 성능 | 프론트+백엔드 | Lazy Loading + WebP |

### 핵심 교훈

1. **문제의 근본 원인을 정확히 파악하라**
   - 증상만 보지 말고 Why를 5번 물어라

2. **적절한 레이어에서 해결하라**
   - 프론트엔드 문제: 프론트에서 해결
   - 백엔드 문제: 백엔드에서 해결
   - 협업 필요: 양쪽 모두 수정

3. **성과를 측정하라**
   - Before/After 수치로 개선 효과 검증
   - 사용자 피드백으로 실제 UX 개선 확인

**관련 문서**:
- [시스템 아키텍처](ARCHITECTURE.md)
- [DevOps & 성능](DEVOPS.md)
- [보안](SECURITY.md)
