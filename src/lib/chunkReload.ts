// src/lib/chunkReload.ts
// 배포 직후 옛 index.html을 든 사용자가 삭제/교체된 lazy 청크를 요청해 404가 날 때,
// 전체 리로드로 새 index.html을 받아 복구하는 공용 가드.
// router.onError(동적 import 실패)와 vite:preloadError(preload 실패) 두 경로가
// 같은 sessionStorage 가드를 공유해 무한 리로드 루프를 방지한다.

const GUARD_KEY = "chunk-reload-guard";

// 스토리지 차단 환경(시크릿 모드·쿠키 전면 차단)에서는 접근 자체가 throw할 수 있음.
// 가드를 기록할 수 없으면 루프를 막을 방법이 없으므로 리로드를 포기하는 쪽이 안전하다.
function isGuardSet(): boolean {
  try {
    return sessionStorage.getItem(GUARD_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * 청크 로드 실패 시 1회 전체 리로드. targetUrl이 있으면 해당 경로로 이동.
 * 가드가 이미 설정돼 있으면(직전 리로드로도 복구 실패) 아무것도 하지 않는다.
 */
export function reloadOnceForStaleChunk(targetUrl?: string): void {
  if (isGuardSet()) return;
  try {
    sessionStorage.setItem(GUARD_KEY, "1");
  } catch {
    return;
  }
  if (targetUrl) {
    window.location.assign(targetUrl);
  } else {
    window.location.reload();
  }
}

/** 내비게이션 성공 시 가드 해제 — 이후의 새로운 실패에 다시 1회 복구 기회를 준다. */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(GUARD_KEY);
  } catch {
    // 스토리지 불가 환경 — 무시
  }
}

/** vue-router onError로 전달된 에러가 lazy 청크 로드 실패인지 판별 */
export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as Error)?.message ?? "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") // Safari
  );
}
