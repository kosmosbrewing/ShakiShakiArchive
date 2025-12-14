// src/services/socialAuth.ts
// 소셜 로그인 API 서비스 (카카오, 네이버, 구글)

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * 소셜 로그인 제공자
 */
export type SocialProvider = "kakao" | "naver" | "google";

/**
 * 소셜 로그인 사용자 정보
 */
export interface SocialUserInfo {
  provider: SocialProvider;
  providerId: string;
  email?: string;
  name?: string;
  profileImage?: string;
}

/**
 * 소셜 로그인 응답
 */
export interface SocialAuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: SocialUserInfo;
  isNewUser: boolean;
}

/**
 * 소셜 로그인 설정
 */
interface SocialAuthConfig {
  kakao?: {
    clientId: string;
    redirectUri: string;
  };
  naver?: {
    clientId: string;
    redirectUri: string;
  };
  google?: {
    clientId: string;
    redirectUri: string;
  };
}

// 환경 변수에서 설정 로드
const config: SocialAuthConfig = {
  kakao: {
    clientId: import.meta.env.VITE_KAKAO_CLIENT_ID || "",
    redirectUri: import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/auth/kakao/callback`,
  },
  naver: {
    clientId: import.meta.env.VITE_NAVER_CLIENT_ID || "",
    redirectUri: import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/auth/naver/callback`,
  },
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`,
  },
};

/**
 * 카카오 로그인 SDK 초기화
 * @see https://developers.kakao.com/docs/latest/ko/javascript/getting-started
 *
 * 사용 전 index.html에 스크립트 추가 필요:
 * <script src="https://developers.kakao.com/sdk/js/kakao.js"></script>
 */
export function initKakaoSdk(): boolean {
  const Kakao = (window as any).Kakao;

  if (!Kakao) {
    console.error("카카오 SDK가 로드되지 않았습니다.");
    return false;
  }

  if (!Kakao.isInitialized() && config.kakao?.clientId) {
    Kakao.init(config.kakao.clientId);
  }

  return Kakao.isInitialized();
}

/**
 * 카카오 로그인 요청
 */
export function loginWithKakao(): void {
  const Kakao = (window as any).Kakao;

  if (!Kakao?.isInitialized()) {
    if (!initKakaoSdk()) {
      alert("카카오 로그인을 사용할 수 없습니다.");
      return;
    }
  }

  Kakao.Auth.authorize({
    redirectUri: config.kakao?.redirectUri,
    scope: "profile_nickname,account_email",
  });
}

/**
 * 카카오 로그인 콜백 처리
 */
export async function handleKakaoCallback(code: string): Promise<SocialAuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/kakao/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "카카오 로그인 실패");
  }

  return response.json();
}

/**
 * 네이버 로그인 요청
 * @see https://developers.naver.com/docs/login/web/web.md
 */
export function loginWithNaver(): void {
  if (!config.naver?.clientId) {
    alert("네이버 로그인 설정이 필요합니다.");
    return;
  }

  const state = generateRandomState();
  sessionStorage.setItem("naver_auth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.naver.clientId,
    redirect_uri: config.naver.redirectUri,
    state,
  });

  window.location.href = `https://nid.naver.com/oauth2.0/authorize?${params}`;
}

/**
 * 네이버 로그인 콜백 처리
 */
export async function handleNaverCallback(
  code: string,
  state: string
): Promise<SocialAuthResponse> {
  // CSRF 검증
  const savedState = sessionStorage.getItem("naver_auth_state");
  if (state !== savedState) {
    throw new Error("유효하지 않은 요청입니다.");
  }
  sessionStorage.removeItem("naver_auth_state");

  const response = await fetch(`${API_BASE}/api/auth/naver/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, state }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "네이버 로그인 실패");
  }

  return response.json();
}

/**
 * 구글 로그인 요청
 * @see https://developers.google.com/identity/protocols/oauth2/web-server
 */
export function loginWithGoogle(): void {
  if (!config.google?.clientId) {
    alert("구글 로그인 설정이 필요합니다.");
    return;
  }

  const state = generateRandomState();
  sessionStorage.setItem("google_auth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * 구글 로그인 콜백 처리
 */
export async function handleGoogleCallback(
  code: string,
  state: string
): Promise<SocialAuthResponse> {
  // CSRF 검증
  const savedState = sessionStorage.getItem("google_auth_state");
  if (state !== savedState) {
    throw new Error("유효하지 않은 요청입니다.");
  }
  sessionStorage.removeItem("google_auth_state");

  const response = await fetch(`${API_BASE}/api/auth/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "구글 로그인 실패");
  }

  return response.json();
}

/**
 * 소셜 계정 연결 해제
 */
export async function unlinkSocialAccount(provider: SocialProvider): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/${provider}/unlink`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "소셜 계정 연결 해제 실패");
  }
}

/**
 * CSRF 방지를 위한 랜덤 state 생성
 */
function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * 소셜 로그인 제공자 표시 이름
 */
export function getProviderLabel(provider: SocialProvider): string {
  const labels: Record<SocialProvider, string> = {
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
  };
  return labels[provider] || provider;
}

/**
 * 소셜 로그인 제공자 아이콘 색상
 */
export function getProviderColor(provider: SocialProvider): string {
  const colors: Record<SocialProvider, string> = {
    kakao: "#FEE500",
    naver: "#03C75A",
    google: "#4285F4",
  };
  return colors[provider] || "#000000";
}
