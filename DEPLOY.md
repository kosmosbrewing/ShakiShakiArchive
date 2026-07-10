# 배포 가이드

현재 기준 감사일: 2026-07-10

Production 배포의 단일 source는 .github/workflows/deploy.yml이다.

## 1. High-Risk 경계

- main의 모든 push가 deploy될 수 있다. 문서-only push도 포함한다.
- v* tag도 workflow를 실행한다.
- repository_dispatch type content-update도 실행한다.
- workflow_dispatch 수동 실행을 지원한다.
- build:full은 설정된 backend API를 호출한다.
- staging deploy workflow는 없다.

이 문서/하네스 변경을 main에 push하면 S3 upload와 CloudFront invalidation이 발생할 수 있다. 실제 push와 deploy는 별도 릴리스 판단 후 수행한다.

## 2. Pipeline

Ubuntu + Node.js 20 job:

1. Checkout
2. Node setup과 npm cache
3. npm ci
4. VITE_API_URL, VITE_GA_ID, VITE_KAKAO_APP_KEY로 npm run build:full
5. AWS credential 설정
6. dist/assets를 1년 immutable cache로 S3 upload
7. 나머지 dist를 5분 cache + stale-while-revalidate로 upload
8. robots.txt, llms.txt, sitemap.xml UTF-8 content type 보정
9. assets/ 60일 lifecycle 보장
10. selective/full CloudFront invalidation
11. IndexNow ping
12. S3 Cache-Control 검증
13. CloudFront domain summary

Unit test, ESLint, browser smoke, security scan, Terraform validation은 current workflow에 없다.

## 3. GitHub Secrets

프런트엔드:

- VITE_API_URL
- VITE_GA_ID, application behavior상 optional
- VITE_KAKAO_APP_KEY, application behavior상 optional

AWS:

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_S3_BUCKET_NAME
- CLOUDFRONT_DISTRIBUTION_ID

Secret 값을 문서에 복사하지 않는다. GitHub Secrets로 주입해도 VITE_ 값은 build 후 public이다.

IndexNow key는 protocol 특성상 공개값이며 script와 public text file에 존재한다.

## 4. Local Build

백엔드 없이:

    npm ci
    npm run verify

Backend가 준비된 경우:

    VITE_API_URL=http://localhost:8080 npm run build:full

실제 .env를 열거나 production API를 임의로 사용하지 않는다.

## 5. Fail-Closed Prerender

scripts/prerender/index.js의 assertComplete는 다음을 검사한다.

- home, FAQ, policy, category, product의 generated/attempted 일치
- 모든 failed list가 비어 있음
- sitemap 생성
- llms.txt 갱신

하나라도 incomplete면 exit code 1로 workflow를 중단한다. S3 upload step은 실행되지 않는다.

Why: partial dist가 성공 처리되면 non-assets sync --delete가 이전 정상 HTML을 삭제할 수 있다.

## 6. Cache Policy

Asset:

    Cache-Control: max-age=31536000, immutable

HTML/root:

    Cache-Control: max-age=300, stale-while-revalidate=86400

assets/ lifecycle:

- expiration 60일
- deploy마다 재적용
- 실패는 warning-only
- bucket의 전체 lifecycle document를 교체

다른 lifecycle rule이 필요하면 workflow JSON에 함께 병합한다.

## 7. Selective Invalidation

기본 path:

- /index.html
- /faq, /faq.html
- /terms, /terms.html
- /privacy, /privacy.html
- /product/*
- /productDetail/*
- /sitemap.xml
- /robots.txt
- /llms.txt

전체 invalidation 조건:

- tag
- manual full_invalidation=true
- head commit message에 [full-invalidate]

CloudFront wait timeout은 AWS invalidation 실패를 뜻하지 않을 수 있다.

FAQ/terms/privacy path가 selective list에 포함된 것은 stale cache 제거 목적이다. Policy summary HTML을 권위 문서로 서빙한다는 뜻이 아니다.

## 8. CloudFront Function

cloudfront-function.js의 현재 mapping:

- /assets/와 /fonts/ 통과
- js/css/map/image/font/txt/xml/json 등 static extension 통과
- /api/ 통과
- / -> /index.html
- /productDetail/{slug} -> matching .html
- /product/all -> /index.html
- /product/{actualCategorySlug} -> matching .html
- /faq -> /faq.html
- 기타 -> /index.html

Function publish/association은 deploy.yml과 Terraform에 자동화되어 있지 않다. Source 수정 후에도 AWS Console의 deployed function은 별도 검증이 필요하다.

## 9. Policy Page 서빙 금지선

scripts/prerender/staticPages.js는 terms.html/privacy.html을 만들지만 body는 Vue 원문의 별도 요약이며 내용이 동일하지 않다.

Single-source 결정 전:

- /terms, /privacy를 generated .html로 rewrite하지 않는다.
- 현재 function의 /index.html SPA fallback을 유지한다.
- Vue page를 사용자에게 보이는 원문으로 취급한다.
- summary를 canonical/legal source로 배포하지 않는다.

Policy artifact 생성은 현재 completeness gate의 일부지만, 권위 문서로 서빙하는 결정과는 별개다.

현재 deploy는 summary .html도 upload하고 explicit .html request는 pass-through한다. Direct /terms.html과 /privacy.html 노출은 known gap이며 링크 금지와 함께 artifact 제거/single-source 전환이 필요하다.

## 10. Release 검증

Local 검증:

    npm run verify
    node --check cloudfront-function.js

Backend fixture가 있으면:

    npm run build:full

확인 항목:

- incomplete prerender가 non-zero로 실패
- /fonts/ URI가 rewrite되지 않음
- /product/all이 /index.html로 mapping
- actual category/product detail/FAQ mapping
- /terms와 /privacy가 policy summary .html로 mapping되지 않음
- selective invalidation path에 FAQ/terms/privacy 포함

실제 public curl, AWS Console, deploy는 별도 승인된 운영 점검에서 수행한다.

## 11. Rollback

권장 code rollback:

1. bad commit 확인
2. git revert
3. npm run verify
4. 정상 workflow로 redeploy
5. root/static cache 제거가 필요한 경우만 full invalidation
6. 이전 behavior 확인

Shared production branch에서 history-rewriting reset을 사용하지 않는다.

S3 version restore는 이 repository에서 자동화되지 않는다. Bucket versioning을 실제 AWS에서 확인하기 전에는 rollback 수단으로 가정하지 않는다.

## 12. Terraform 범위

terraform/backend:

- remote-state S3 bucket
- DynamoDB lock table

terraform/environments/prod:

- API Gateway HTTP API
- VPC Link와 security group
- Cloud Map namespace/service
- API Gateway access log

CloudFront distribution resource는 주석 상태다. 기존 VPC, subnet, ECS cluster, ECS task security group은 data source다.

안전한 check:

    terraform fmt -check -recursive

apply, import, destroy, CloudFront origin 변경, ECS service-discovery attachment는 reviewed plan과 rollback이 필요한 High-risk 작업이다.

## 13. Historical Unsafe Guide

다음 ignored local guide는 현재 source와 불일치한다.

- CLOUDFRONT_SETUP.md
- terraform/TERRA_SETUP_GUIDE.md

그 안의 function code, secret 이름, cache/origin/Terraform 명령을 실행하지 않는다. 현재 절차는 이 문서, docs/DEVOPS.md, tracked source만 따른다.

## 14. 운영 Gap

- source-controlled staging 없음
- automated browser smoke 없음
- CloudFront function publish 자동화 없음
- frontend error tracking 없음
- production AWS state를 repository만으로 증명할 수 없음
- policy single-source 미해결

관련 문서: [DevOps](docs/DEVOPS.md), [Project Memory](MEMORY.md).
