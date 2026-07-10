# DevOps와 운영

현재 기준 감사일: 2026-07-10

이 문서는 저장소에 실제 존재하는 자동화만 설명한다. AWS와 외부 console이 현재 source와 동일하게 구성되어 있다고 가정하지 않는다.

## 1. Source-Controlled 자동화

- .github/workflows/deploy.yml: production build/deploy
- scripts/prerender/: SEO static build
- scripts/indexnow-ping.js: deploy 후 indexing signal
- scripts/verify-docs.js: 문서·환경 변수·핵심 source contract 검사
- cloudfront-function.js: viewer-request rewrite source
- terraform/backend/: Terraform remote state
- terraform/environments/prod/: API Gateway, VPC Link, Cloud Map, access log
- cloudfront-invalidate.sh: placeholder helper이며 production-ready script가 아님

## 2. Production Trigger 주의

workflow는 다음 이벤트에서 실행된다.

- main의 모든 push, 문서 전용 변경 포함
- v* tag
- repository_dispatch type content-update
- workflow_dispatch

path filter가 없으므로 current 문서/하네스 변경을 main에 push해도 production API를 호출하고 S3/CloudFront를 변경할 수 있다.

실제 push와 deploy는 이 문서 정리 범위에 포함하지 않는다.

## 3. CI/CD Pipeline

Build 단계:

- Ubuntu runner
- Node.js 20
- npm ci
- npm run build:full
- VITE_API_URL, VITE_GA_ID, VITE_KAKAO_APP_KEY 주입

Prerender gate:

- home, FAQ, policy, category, product 결과 집계
- generated와 attempted 불일치 또는 failed 존재 시 실패
- sitemap 또는 llms.txt 실패 시 실패
- incomplete artifact는 exit code 1로 deploy 차단

Deploy 단계:

- GitHub Secrets로 AWS credential 설정
- dist/assets를 1년 immutable cache로 sync
- 나머지 dist를 5분 cache와 stale-while-revalidate로 sync
- robots, llms, sitemap의 UTF-8 content type 보정
- assets/ 60일 lifecycle 재적용
- selective 또는 full CloudFront invalidation
- IndexNow best-effort ping
- S3 Cache-Control 검증

현재 workflow에는 unit test, ESLint, browser smoke, npm audit, Terraform validation이 없다. TypeScript 검사는 npm run build 안에서 수행된다.

## 4. Local Gate

backend 없이 실행 가능한 기본 gate:

    npm ci
    npm run verify

개별 명령:

    npm run docs:lint
    npm run typecheck
    npm run build

backend-dependent gate:

    VITE_API_URL=http://localhost:8080 npm run build:full

full build는 모든 prerender group이 완전해야 성공한다. 일부 page 누락을 warning으로 허용하지 않는다.

## 5. Artifact와 Cache

- Vite는 JS/CSS/assets에 hash filename을 사용한다.
- assets는 max-age=31536000, immutable이다.
- HTML/root file은 max-age=300, stale-while-revalidate=86400이다.
- old assets는 60일 lifecycle로 보존해 stale index의 chunk 404 가능성을 낮춘다.
- browser는 stale chunk 실패 시 한 번만 reload한다.

Lifecycle 주의:

deploy workflow의 put-bucket-lifecycle-configuration은 bucket lifecycle 전체를 교체한다. 다른 rule이 필요하면 같은 JSON에 병합해야 한다.

## 6. CloudFront Rewrite

cloudfront-function.js의 source contract:

- /assets/와 /fonts/ 통과
- js/css/image/font/txt/xml/json 등의 정적 확장자 통과
- /product/all은 SPA /index.html fallback
- 실제 category와 product detail은 prerender .html
- /faq는 /faq.html
- 기타 route는 /index.html

CloudFront function publish와 association은 deploy.yml에 포함되지 않는다. source가 수정돼도 운영 function은 자동 반영되지 않는다.

## 7. Invalidation

기본 selective invalidation:

- /index.html
- /faq와 /faq.html
- /terms와 /terms.html
- /privacy와 /privacy.html
- /product/*
- /productDetail/*
- /sitemap.xml
- /robots.txt
- /llms.txt

full invalidation 조건:

- tag deploy
- workflow_dispatch full_invalidation
- head commit message의 [full-invalidate]

terms/privacy path를 invalidate하는 것은 cache 정리 목적이다. 아래 policy summary를 권위 문서로 서빙하라는 의미가 아니다.

## 8. 정책 페이지 운영 금지선

scripts/prerender/staticPages.js의 terms/privacy는 Vue policy 원문의 요약 복제본이며 내용이 동일하지 않다.

single-source 결정 전:

- /terms와 /privacy를 terms.html/privacy.html로 rewrite하지 않는다.
- SPA fallback으로 src/pages/static의 Vue 원문을 보여 준다.
- generated policy HTML을 법적·canonical source로 간주하지 않는다.
- policy HTML 생성 로직을 변경할 때 Vue 원문과 별도 검토한다.

현재 summary .html은 upload되고 direct .html request는 function에서 통과할 수 있다. 링크·운영 근거로 사용하지 말고 single-source 전환 또는 duplicate artifact 제거를 P0로 처리한다.

## 9. Infrastructure as Code

terraform/backend:

- versioning, AES256 encryption, public access block을 가진 state S3 bucket
- DynamoDB lock table
- state bucket prevent_destroy

terraform/environments/prod:

- 기존 VPC, subnet, ECS cluster, ECS task security group data source
- Cloud Map private namespace와 SRV service
- VPC Link security group과 VPC Link
- ECS inbound rule
- API Gateway HTTP API, proxy route, stage
- JSON access log를 가진 CloudWatch log group

CloudFront distribution resource는 주석 상태다. ECS service의 Cloud Map 등록도 이 저장소에서 자동 적용되지 않는다.

안전한 local check:

    terraform fmt -check -recursive

credential과 input을 의도적으로 준비한 뒤에만:

    cp terraform/environments/prod/terraform.tfvars.example terraform/environments/prod/terraform.tfvars
    cd terraform/environments/prod
    terraform init
    terraform validate
    terraform plan

apply, destroy, import, origin 전환은 별도 승인과 rollback plan이 필요한 High-risk 작업이다.

## 10. 관측성

현재 존재:

- optional GA4 page_view
- Terraform이 적용된 경우 API Gateway access log
- GitHub Actions log
- S3/CloudFront CLI output

현재 없음:

- Sentry 또는 frontend error tracker
- CloudWatch RUM client
- Lighthouse CI
- source-map upload
- synthetic browser monitoring
- 구조화된 frontend security event log

production build는 console/debugger를 제거한다. error tracker가 없으므로 browser runtime incident 근거가 부족할 수 있다.

## 11. Release와 Rollback

Release 전 확인:

1. git status와 diff 검토
2. npm run verify
3. SEO/API contract 변경이면 target backend에 npm run build:full
4. main push가 즉시 deploy되어도 되는지 확인
5. required secret과 backend health 확인
6. 불필요한 full invalidation 금지

Rollback 절차:

1. bad commit을 git revert
2. revert에서 npm run verify
3. 정상 workflow로 redeploy
4. root/static cache 제거가 필요할 때만 full invalidation
5. 이전 behavior 재검증

history rewrite reset은 shared production branch에서 사용하지 않는다.

## 12. Incident Triage

Blank/stale frontend:

- index HTML과 missing chunk request 확인
- asset object와 cache header 확인
- stale chunk guard와 invalidation 상태 확인
- font 문제면 /fonts/가 function에서 통과되는지 확인

Prerender 실패:

- VITE_API_URL과 backend product/category/SEO response 확인
- runStats의 failed group 확인
- partial artifact를 강제로 deploy하지 않음
- policy 실패도 현재 completeness gate를 막는다는 점 확인

인증 실패:

- Set-Cookie와 backend response 확인
- exact CORS origin, credential, cookie domain/SameSite/Secure 확인
- client route guard 변경으로 우회하지 않음

결제 실패:

- 반복 승인 시도 중지
- provider/order ID 보존
- backend idempotency와 provider status 확인
- callback URL과 browser transient state 보존

## 13. 문서 권위

현재 운영 절차는 이 문서, DEPLOY.md, tracked Terraform source만 사용한다.

다음 ignored 문서는 historical unsafe snapshot이므로 명령·secret 이름·origin 변경 절차를 실행하면 안 된다.

- CLOUDFRONT_SETUP.md
- terraform/TERRA_SETUP_GUIDE.md

다음 성능 문서는 historical measurement이며 현재 수치로 인용하지 않는다.

- performance-final-report.md
- performance-ultimate-report.md
- performance-comparison.md

## 14. Needs Verification

- actual AWS resource와 Terraform drift
- deployed CloudFront function version/association
- backend content-update dispatch
- S3 object versioning과 restore 가능성
- DNS/certificate ownership
- production security header
- search/merchant console
- 실제 cost와 performance

검증 대기는 [Project Memory](../MEMORY.md)를 따른다.
