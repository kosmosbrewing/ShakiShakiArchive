// scripts/build-maintenance.mjs
// 서비스 준비 중(maintenance) 모드 배포 산출물 생성.
// 실행: npm run build:maintenance
//
// Why: 정상 배포(build:full)는 prerender가 살아있는 백엔드 API를 호출하므로,
// 백엔드를 내린 뒤에는 CI 배포 자체가 불가능해진다. 이 스크립트는 백엔드·DB 없이
// 정적 안내 페이지만으로 dist를 구성해, 중단 기간에도 프론트를 배포할 수 있게 한다.
//
// 배포 시 `aws s3 sync dist/ --delete`가 기존 prerender 산출물(productDetail 157 +
// product 5 + faq/sitemap 등)을 전부 지운다. 준비 중 모드에서는 그것이 의도된 동작이다.
// 존재하지 않는 경로는 CloudFront 오류 응답으로 index.html(=이 안내 페이지)로 폴백된다.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "maintenance");

// IndexNow 키 파일은 준비 중에도 유지한다. 지우면 재오픈 시 키 검증이 실패해
// 색인 핑을 다시 쓸 수 없다(파일명 = 키 값이라 재발급도 번거롭다).
// 파일명을 하드코딩하지 않고 public/에서 찾는다 — 키를 회전해도 여기를 고칠 필요가 없다.
function findIndexNowKeyFile() {
  const publicDir = path.join(ROOT, "public");
  if (!fs.existsSync(publicDir)) return null;
  return fs.readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/i.test(f)) ?? null;
}

function buildCopyList() {
  const copies = [
    { from: path.join(SRC, "index.html"), to: path.join(DIST, "index.html") },
    { from: path.join(SRC, "robots.txt"), to: path.join(DIST, "robots.txt") },
    // 안내 페이지는 로고를 data URI로 인라인하지만, og:image는 절대 URL이 필요해
    // 파일도 함께 배포한다(소셜 공유 카드용).
    { from: path.join(ROOT, "src/assets/logo01-2.png"), to: path.join(DIST, "logo.png") },
  ];

  const keyFile = findIndexNowKeyFile();
  if (keyFile) {
    copies.push({
      from: path.join(ROOT, "public", keyFile),
      to: path.join(DIST, keyFile),
    });
  } else {
    console.warn("   ⚠️  public/에서 IndexNow 키 파일을 찾지 못했습니다 (재오픈 시 색인 핑 검증 실패 가능)");
  }

  return copies;
}

function main() {
  console.log("🚧 준비 중(maintenance) 모드 빌드 시작\n");

  const COPIES = buildCopyList();

  // 검증을 dist 삭제보다 먼저 한다. 순서가 반대면 자산이 누락됐을 때
  // 멀쩡한 이전 빌드까지 날린 뒤 실패한다(로컬에서 dist를 서빙 중이면 즉시 404).
  const missing = COPIES.filter((c) => !fs.existsSync(c.from));
  if (missing.length > 0) {
    console.error("❌ 필수 파일 누락 (dist는 그대로 보존됨):");
    for (const m of missing) console.error(`   - ${path.relative(ROOT, m.from)}`);
    process.exit(1);
  }

  // 정상 빌드 산출물이 섞이면 안 되므로 dist를 통째로 비우고 시작한다.
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // deploy.yml의 "Upload Assets to S3" 스텝이 dist/assets/를 sync하므로
  // 디렉터리가 없으면 aws cli가 에러로 죽는다. 빈 디렉터리를 만들어 둔다.
  fs.mkdirSync(path.join(DIST, "assets"), { recursive: true });

  for (const { from, to } of COPIES) {
    fs.copyFileSync(from, to);
    const size = fs.statSync(to).size;
    console.log(`   ✅ ${path.relative(DIST, to)} (${size.toLocaleString()}B)`);
  }

  console.log("\n✨ 준비 중 모드 빌드 완료");
  console.log("   ⚠️  이 dist로 배포하면 기존 prerender 산출물이 S3에서 삭제됩니다.");
  console.log("   ⚠️  재오픈 시에는 백엔드를 먼저 살린 뒤 `npm run build:full`로 배포하세요.\n");
}

main();
