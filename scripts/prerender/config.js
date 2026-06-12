// scripts/prerender/config.js
// Prerender 공통 설정

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 백엔드 API URL (환경변수 또는 기본값)
export const BACKEND_API = process.env.VITE_API_URL || "http://localhost:8080";
export const SITE_URL = "https://shakishakiarchive.com";
export const DIST_DIR = path.join(__dirname, "../../dist");
export const INDEX_PATH = path.join(DIST_DIR, "index.html");
export const POLICY_LASTMOD = "2026-01-27";
