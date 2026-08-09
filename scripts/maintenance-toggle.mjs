// scripts/maintenance-toggle.mjs
// 준비 중(Coming Soon) 모드 ON/OFF 토글.
// 실행: npm run maintenance:on  /  npm run maintenance:off
//
// Why 파일 플래그인가:
// 수동 실행(workflow_dispatch) 입력만으로 모드를 정하면, 중단 기간에 문서 커밋 하나만
// push해도 정상 배포 경로(build:full)가 돌아 prerender가 백엔드를 찾다가 실패한다.
// 상태를 git에 남기면 어떤 트리거로 배포가 돌든 항상 같은 결과가 나오고,
// 지금 사이트가 어떤 모드인지 저장소만 봐도 알 수 있다.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FLAG_PATH = path.join(ROOT, "maintenance", "ACTIVE");

const FLAG_BODY = `이 파일이 존재하면 배포가 준비 중(Coming Soon) 모드로 동작합니다.

- 배포는 npm run build:maintenance 산출물(안내 페이지)만 S3에 올립니다.
- prerender를 건너뛰므로 백엔드·DB가 꺼져 있어도 배포가 성공합니다.
- 기존 상품/카테고리/FAQ/sitemap은 S3에서 삭제됩니다(--delete).

해제: npm run maintenance:off 실행 후 커밋·push.
단, 해제 전에 RDS와 백엔드를 먼저 살려야 합니다(prerender가 백엔드 API를 호출).
`;

function on() {
  fs.mkdirSync(path.dirname(FLAG_PATH), { recursive: true });
  fs.writeFileSync(FLAG_PATH, FLAG_BODY, "utf-8");
  console.log("🚧 준비 중 모드 ON");
  console.log("   생성: maintenance/ACTIVE\n");
  console.log("다음 단계:");
  console.log("   git add maintenance/ACTIVE");
  console.log('   git commit -m "chore: 준비 중 모드 ON"');
  console.log("   git push          # 배포되면 사이트가 Coming Soon으로 바뀝니다\n");
  console.log("   push 후 배포가 끝난 것을 확인한 다음 백엔드 → RDS 순서로 내리세요.");
}

function off() {
  if (!fs.existsSync(FLAG_PATH)) {
    console.log("ℹ️  이미 정상 운영 모드입니다 (maintenance/ACTIVE 없음)");
    return;
  }
  fs.rmSync(FLAG_PATH);
  console.log("✅ 준비 중 모드 OFF\n");
  console.log("⚠️  재오픈 순서를 지키세요. prerender가 백엔드 API를 호출하므로");
  console.log("    백엔드가 꺼져 있으면 배포가 실패합니다.\n");
  console.log("   1) RDS 시작 (콘솔에서 Start)");
  console.log("   2) 백엔드 기동 후 /api/health 확인");
  console.log("   3) git rm maintenance/ACTIVE");
  console.log('      git commit -m "chore: 준비 중 모드 OFF"');
  console.log("      git push          # build:full이 돌아 사이트가 복구됩니다\n");
  console.log("   4) 배포 후 상품/카테고리/FAQ/sitemap 복구 확인");
}

const mode = process.argv[2];
if (mode === "on") on();
else if (mode === "off") off();
else {
  console.error("사용법: node scripts/maintenance-toggle.mjs <on|off>");
  process.exit(1);
}
