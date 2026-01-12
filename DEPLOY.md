# 배포 가이드

## 🚀 자동 배포 시스템

main 브랜치에 Push하면 GitHub Actions가 자동으로 S3 + CloudFront 배포를 실행합니다.

## 📋 배포 프로세스

```
main 브랜치 Push
  ↓
GitHub Actions 트리거
  ↓
npm run build:full (운영 API 기준 Prerendering)
  ↓
S3 업로드 (Cache-Control 헤더 포함)
  ↓
CloudFront 캐시 무효화
  ↓
✅ 배포 완료
```

## 🎯 캐시 무효화 전략

### 1. 선택적 무효화 (기본) - 비용 $0

**언제 사용:**
- 콘텐츠 수정 (상품 추가/삭제, 텍스트 변경)
- 작은 버그 수정
- SEO 메타 태그 업데이트

**무효화 대상:**
- HTML 파일만 (`/index.html`, `/product/*`, `/productDetail/*`)

**사용 방법:**
```bash
# 일반 커밋
git add .
git commit -m "feat: 새 상품 추가"
git push origin main
```

**비용:** 무료 (월 1,000회 무료 범위 내)

---

### 2. 전체 무효화 - 필요 시에만

**언제 사용:**
- 전체 디자인 리뉴얼
- CSS/JS 긴급 버그 수정
- 메이저 버전 릴리스

**무효화 대상:**
- 모든 파일 (`/*`)

**사용 방법 (3가지):**

#### 방법 1: 커밋 메시지에 키워드 포함 (추천)
```bash
git add .
git commit -m "feat: 디자인 전면 개편 [full-invalidate]"
git push origin main
```

#### 방법 2: Git 태그 사용
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### 방법 3: 수동 트리거
1. GitHub → Actions 탭
2. "Deploy to AWS S3 + CloudFront" 선택
3. "Run workflow" 클릭
4. "전체 캐시 무효화" 체크박스 선택 ✅
5. "Run workflow" 실행

**비용:** 약간의 비용 발생 가능 (1,000회 초과 시 경로당 $0.005)

---

## 💰 비용 최적화 원리

### 파일 버전 관리 (해시 기반)

Vite가 자동으로 파일명에 해시를 추가:
```
index-Cfoa3JrS.js  ← 코드 변경 시 해시 자동 갱신
vendor-CPgcqiMU.js ← 새 파일명으로 인식
```

### Cache-Control 헤더 전략

| 파일 타입 | Cache-Control | 설명 |
|---------|--------------|------|
| **HTML** | `max-age=300, must-revalidate` | 5분마다 재검증 |
| **JS/CSS/이미지** | `max-age=31536000, immutable` | 1년 캐시, 변경 불가 |

**결과:**
- JS/CSS는 무효화 불필요 (해시 변경으로 자동 갱신)
- HTML만 무효화하면 충분
- 대부분의 경우 비용 $0

---

## 🛠️ GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions

| Secret 이름 | 설명 | 예시 |
|------------|------|-----|
| `VITE_API_URL` | 운영 백엔드 API URL | `https://api.shakishaki.com` |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 | - |
| `AWS_REGION` | AWS 리전 | `ap-northeast-2` |
| `AWS_S3_BUCKET_NAME` | S3 버킷 이름 | - |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront Distribution ID | - |

---

## 📊 배포 시나리오별 가이드

### 시나리오 1: 상품 추가/수정
```bash
git commit -m "feat: 겨울 신상품 10개 추가"
git push origin main
```
→ HTML만 무효화 (비용 $0)

### 시나리오 2: 작은 CSS 수정
```bash
git commit -m "fix: 버튼 색상 수정"
git push origin main
```
→ HTML만 무효화 (비용 $0)
→ 새 CSS 파일은 해시가 다르므로 자동 갱신

### 시나리오 3: 전체 디자인 리뉴얼
```bash
git commit -m "feat: 메인 페이지 전면 리디자인 [full-invalidate]"
git push origin main
```
→ 전체 무효화 (약간의 비용 발생 가능)

### 시나리오 4: 긴급 버그 수정
```bash
git commit -m "hotfix: 결제 오류 긴급 수정 [full-invalidate]"
git push origin main
```
→ 전체 무효화로 즉시 반영

### 시나리오 5: 메이저 버전 릴리스
```bash
git tag v2.0.0
git push origin v2.0.0
```
→ 자동으로 전체 무효화 실행

---

## ✅ 배포 확인

1. **GitHub Actions 로그 확인**
   - Repository → Actions 탭
   - 각 단계별 성공 여부 확인

2. **CloudFront 무효화 확인**
   - AWS Console → CloudFront → Invalidations
   - 진행 상태 확인 (보통 1-2분 소요)

3. **SNS 공유 테스트**
   - 카카오톡: https://developers.kakao.com/tool/debugger/sharing
   - 페이스북: https://developers.facebook.com/tools/debug/

4. **브라우저 캐시 확인**
   - DevTools → Network 탭
   - Cache-Control 헤더 확인

---

## 🔧 트러블슈팅

### Q: 배포 후에도 옛날 화면이 보여요
**A:** 브라우저 캐시 삭제 또는 시크릿 모드로 확인

### Q: SNS 공유 시 옛날 이미지가 보여요
**A:** SNS 디버거에서 캐시 갱신 (Fetch new information 클릭)

### Q: 긴급하게 전체를 업데이트해야 해요
**A:** 수동 트리거 사용 (GitHub Actions → Run workflow → 체크박스 선택)

### Q: 비용이 걱정돼요
**A:** 기본 배포는 비용 $0, 전체 무효화도 월 1,000회까지 무료

---

## 📚 참고 자료

- [CloudFront 캐시 무효화 비용](https://aws.amazon.com/ko/cloudfront/pricing/)
- [Cache-Control 헤더 가이드](https://developer.mozilla.org/ko/docs/Web/HTTP/Headers/Cache-Control)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
