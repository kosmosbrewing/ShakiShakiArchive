# 서비스 일시 중단·재오픈 런북 (2026-08-09)

운영 비용을 줄이기 위해 스토어를 일정 기간 중단하고, 개발 후 재오픈하기 위한 절차.
현재 상태와 미결 항목은 [MEMORY](../MEMORY.md)를 우선한다.

## 배경과 결정

- 자연 유입이 사실상 0인 상태에서 월 약 $31이 계속 나가는 것이 부담.
- 대안으로 검토한 **Supabase 이전은 기각**: 비용이 줄지 않고(Free는 백업 0·500MB 초과 시
  read-only라 운영 불가, Pro $25 > 현재 RDS $20.87) 복구 능력만 후퇴한다.
  상세 근거는 [Project Memory](../MEMORY.md)의 인프라·스택 결정 항목 참조.
- **채택**: 프론트를 Coming Soon 안내 페이지로 교체하고 백엔드·RDS를 내린다.

### RDS 처리 방식: 중지(stop) 선택

| | 월 비용 | 재오픈 | 리스크 |
|---|---|---|---|
| **중지(선택)** | 약 $2.62 (스토리지만) | Start 버튼 하나. 엔드포인트·설정 그대로 | **7일 후 AWS가 자동 재시작** → 주기적 수동 재중지 필요 |
| 스냅샷+삭제 | 약 $0 | 스냅샷 복원 → 엔드포인트 변경 → DATABASE_URL 갱신 | 복원 시 설정 재구성 가능성 |

중지 중에는 DB 인스턴스 시간 요금이 부과되지 않고 스토리지·백업 스토리지만 과금된다.
또한 **RDS는 중지된 시간을 백업 보존 기간 계산에서 제외**하므로 중지 중 자동 백업이 만료되지 않는다.

> 재중지를 놓치면 **아무 알림 없이** 월 $20.87로 돌아간다. 그래서 AWS Budgets 알림이 필수다.

## 준비 중 모드 동작 방식

**상태의 단일 소스는 `maintenance/ACTIVE` 파일이다.**

```
maintenance/ACTIVE 있음  → 배포가 build:maintenance 산출물(안내 페이지)만 올림
maintenance/ACTIVE 없음  → 정상 배포(build:full = build + prerender)
```

파일로 둔 이유: 수동 실행 입력만으로 모드를 정하면, 중단 기간에 문서 커밋 하나만 push해도
정상 배포 경로가 돌아 prerender가 백엔드를 찾다 실패한다. 파일 플래그면 **어떤 트리거로 돌든
결과가 같고**, 저장소만 봐도 현재 모드를 알 수 있다.

준비 중 모드에서 배포가 하는 일:
- `npm run build:maintenance` → `dist/`에 안내 페이지·로고·favicon·robots.txt·IndexNow 키만 생성
- `aws s3 sync --delete`가 기존 prerender 산출물(상품 157·카테고리 5·FAQ·sitemap)을 **삭제**
- CloudFront 전체 무효화 강제, IndexNow 핑 생략
- 삭제된 경로는 CloudFront 오류 응답으로 `index.html`(안내 페이지)로 폴백된다

## 셧다운 절차

순서가 중요하다. 다만 **순서를 어겨도 복구는 가능하다** — `maintenance/ACTIVE`를 커밋하면
prerender 스텝 자체를 건너뛰므로 백엔드가 죽어 있어도 안내 페이지는 배포된다.
아래 순서를 지키는 이유는 **살아있는 SPA가 죽은 API를 호출하는 창(빈 화면·에러)을 만들지 않기 위해서**다.

> 참고: `maintenance/ACTIVE` 없이 백엔드를 먼저 내리면 이후 배포는 prerender에서 실패한다.
> 이때도 사이트는 이전 상태 그대로 유지되고(fail-closed), ACTIVE를 커밋하면 즉시 정상화된다.

### 0. 사전 확인
- [ ] 진행 중인 주문·환불·문의가 없는지 확인
- [ ] **RDS 수동 스냅샷 1개 생성** (자동 백업 보존이 1일이라 안전망이 얇다. 수동 스냅샷은 만료되지 않는다)
- [ ] RDS **삭제 방지(Deletion protection) 켜기** — 몇 달 방치 중 오조작 대비. 중지/시작에는 영향 없음
- [ ] (선택) 로컬 개발용 스키마 확보: `pg_dump --schema-only`
      **운영 데이터(개인정보)는 로컬로 내려받지 않는다** — users/orders에 이메일·전화번호·주소·
      비밀번호 해시가 있다. 관리자 계정은 백엔드의 `server/scripts/create-admin.ts`로 로컬 생성한다

### 1. 프론트를 Coming Soon으로 전환
```bash
npm run maintenance:on
git add maintenance/ACTIVE
git commit -m "chore: 준비 중 모드 ON"
git push
```
- [ ] Actions 배포 성공 확인
- [ ] https://shakishakiarchive.com/ 이 안내 페이지인지 확인
- [ ] 상품 URL 아무거나 접속 → 안내 페이지로 폴백되는지 확인

### 2. 백엔드 중단
- [ ] ECS면 desiredCount=0, App Runner면 pause
      (배포 대상이 둘 중 무엇인지 저장소 신호가 모순됨 — **확인 필요**)
- [ ] `https://shakishakiarchive.com/api/health` 가 죽었는지 확인

### 3. RDS 중지
- [ ] 콘솔에서 Stop
- [ ] **AWS Budgets에 월 $5 임계 알림 생성** — 재중지를 놓쳤을 때 알아채는 유일한 안전망
- [ ] 캘린더에 6일 간격 반복 일정("RDS 재중지") 등록

### 4. 중단 기간 운영
- [ ] 7일이 되기 전에 RDS 재중지 (월 4~5회)
- [ ] 로컬 개발: `.env`에 `DB_SSL=false` 필요(로컬 Postgres는 SSL 미지원인데
      `server/db.ts`가 `certs/rds-ca-bundle.pem`을 찾아 SSL을 강제한다)

## 재오픈 절차

셧다운의 **역순**이다: DB → 백엔드 → 프론트. 기계적으로 뒤집어서가 아니라,
프론트 배포의 prerender가 살아있는 백엔드 API를 호출하기 때문이다.
이 순서를 어기면 배포가 실패한다(사이트는 안내 페이지 그대로 유지되므로 안전하다).

```bash
# 1) RDS 시작 (콘솔 Start) → 상태 available 확인
# 2) 백엔드 기동 → /api/health 200 확인
# 3) 프론트 복구
npm run maintenance:off
git rm maintenance/ACTIVE
git commit -m "chore: 준비 중 모드 OFF"
git push
```

재오픈 후 확인:
- [ ] 홈·상품 상세·카테고리·FAQ가 프리렌더된 HTML로 서빙되는지 (index.html 폴백이 아닌지)
- [ ] `sitemap.xml` URL 수가 정상인지
- [ ] 카카오페이 결제 왕복 1건 (소액 결제 → 취소)
- [ ] GSC·네이버 서치어드바이저에 sitemap 재제출
- [ ] (권장) RDS 백업 보존 기간을 1일 → 7일로 상향. 백업 스토리지는 프로비저닝 용량(20GiB)까지
      무료라 비용이 사실상 0인데 복구 여지가 7배가 된다

### 재오픈 시 함정
- **`npm run build`(prerender 없이)로 배포하지 말 것.** `--delete` 때문에 상품 157·카테고리 5·
  FAQ가 S3에서 삭제된다. 반드시 `build:full`(= 기본 배포 경로)이어야 한다.
- 색인 회복에는 시간이 걸린다. 유입이 0이라 실질 손실은 작지만, 즉시 회복되지는 않는다.

## 미해결·확인 필요

- [ ] 배포 대상이 **ECS인가 App Runner인가** — 저장소 신호가 모순됨(deploy-ecr.yml은 ECS,
      gitignore된 deploy-ecr.sh와 Dockerfile 주석은 App Runner). 중단 방법과 재오픈 절차가 달라진다
- [ ] **ECS 태스크 정의가 저장소에 없다** — AWS 라이브 상태에만 존재. 중단 전
      `aws ecs describe-task-definition > backup.json`으로 보존 권장(사실상 유일한 롤백 자산)
- [ ] NAT Gateway 존재 여부(있으면 백엔드를 내려도 시간당 과금이 남는다)
- [ ] 백엔드·프론트 외 나머지 비용 항목의 정확한 월액

관련 문서: [Project Memory](../MEMORY.md), [DevOps](./DEVOPS.md), [Architecture](./ARCHITECTURE.md)
