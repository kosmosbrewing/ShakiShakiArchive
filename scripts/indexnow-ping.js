// scripts/indexnow-ping.js
// IndexNow 색인 핑: 배포 완료 후 최근 변경된 URL을 검색엔진(네이버/빙 등)에 즉시 알림
// 실행 시점: deploy.yml에서 CloudFront 무효화 완료 후 (페이지가 실존해야 핑이 유효)
//
// IndexNow 키는 사이트 루트에 공개 서빙되는 값이므로 비밀이 아님
// (검색엔진이 https://{host}/{key}.txt 를 조회해 소유권을 검증하는 방식)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = "https://shakishakiarchive.com";
const HOST = "shakishakiarchive.com";
const INDEXNOW_KEY = "f9acd9e5d4965bba5d297222b48dc5a5";
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, "../dist/sitemap.xml");

// lastmod가 최근 N일 이내인 URL만 핑 (전체 핑은 스팸으로 간주될 수 있음)
const RECENT_DAYS = 2;
// IndexNow 1회 요청 최대 10,000개지만 안전하게 제한
const MAX_URLS = 500;

/**
 * sitemap.xml에서 <url> 블록의 loc/lastmod 추출 (정규식 파싱)
 */
function parseSitemap(xml) {
  const urls = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];

  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || null;
    if (loc) urls.push({ loc, lastmod });
  }

  return urls;
}

/**
 * 핑 대상 URL 선정: 홈 + 최근 변경 URL
 */
function selectUrls(entries) {
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const selected = new Set([`${SITE_URL}/`]);

  for (const { loc, lastmod } of entries) {
    if (!lastmod) continue;
    const time = new Date(lastmod).getTime();
    if (!Number.isNaN(time) && time >= cutoff) {
      selected.add(loc);
    }
  }

  return Array.from(selected).slice(0, MAX_URLS);
}

async function ping() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error("❌ dist/sitemap.xml이 없습니다. prerender 후 실행하세요.");
    process.exit(0); // 배포 자체는 막지 않음
  }

  const entries = parseSitemap(fs.readFileSync(SITEMAP_PATH, "utf-8"));
  const urlList = selectUrls(entries);

  console.log(`📡 IndexNow 핑: ${urlList.length}개 URL (최근 ${RECENT_DAYS}일 변경분 + 홈)`);
  urlList.forEach((u) => console.log(`   - ${u}`));

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList,
      }),
    });

    // 200(OK) / 202(Accepted) 모두 성공
    if (response.status === 200 || response.status === 202) {
      console.log(`✅ IndexNow 핑 성공 (HTTP ${response.status})`);
    } else {
      const body = await response.text();
      console.warn(`⚠️  IndexNow 응답: HTTP ${response.status} ${body.slice(0, 200)}`);
    }
  } catch (error) {
    console.warn(`⚠️  IndexNow 핑 실패 (배포는 계속 진행): ${error.message}`);
  }

  // 핑 실패가 배포를 막으면 안 되므로 항상 성공 종료
  process.exit(0);
}

ping();
