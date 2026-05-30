<script setup lang="ts">
import { ref, reactive, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getNaverLoginUrl, getKakaoLoginUrl } from "@/lib/api";
import { validateEmail } from "@/utils/email-validation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  type AlertType,
} from "@/components/ui/alert";
import { AUTH_MESSAGES, ERROR_MESSAGES } from "@/lib/messages";
import Separator from "@/components/ui/separator/Separator.vue";
import { LoadingSpinner } from "@/components/common";
import { ShieldCheck, X } from "lucide-vue-next";

// ⚠️ 참고: 실제 서비스에서는 id보다 'email'이나 'username'을 사용하는 것이 일반적입니다.
interface loginProps {
  id: string; // 사용자 ID (또는 이메일)
  password: string; // 비밀번호
}

const router = useRouter();
const authStore = useAuthStore();

const loginForm = reactive<loginProps>({
  id: "",
  password: "",
});

const invalidInputForm = ref<boolean>(false);
const loginError = ref<string | null>(null); // 로그인 에러 메시지
const isLoading = ref<boolean>(false); // 로딩 상태 관리
const isAuthenticated = ref<boolean>(false); // 인증 성공 상태
const isNaverLoading = ref<boolean>(false); // 네이버 로그인 버튼 로딩 상태
const isKakaoLoading = ref<boolean>(false); // 카카오 로그인 버튼 로딩 상태
const isProcessingAuth = ref<boolean>(false); // OAuth 결과 처리 중 (전체 화면 로딩)
const showAlert = ref<boolean>(false); // Alert 모달 표시 상태
const alertMessage = ref<string>(""); // Alert 메시지
const alertType = ref<AlertType>("success"); // Alert 타입 (success/error)
const requiresAdmin2FA = ref<boolean>(false);
const admin2faCode = ref<string>("");
const admin2faChallengeId = ref<string>("");
const admin2faExpiresInSeconds = ref<number>(0);
const admin2faDevCode = ref<string>("");
const admin2faFallbackAvailable = ref<boolean>(false);
const isClosingAdmin2FA = ref<boolean>(false);

const admin2faCodeMaxLength = computed(() =>
  admin2faFallbackAvailable.value ? 6 : 4
);
const admin2faCodeReady = computed(() => {
  const pattern = admin2faFallbackAvailable.value ? /^\d{6}$/ : /^\d{4}$/;
  return pattern.test(admin2faCode.value);
});
const admin2faDescription = computed(() =>
  admin2faFallbackAvailable.value
    ? "텔레그램 연결이 지연되고 있어 임시 접속 코드 6자리를 입력해주세요"
    : "텔레그램으로 받은 4자리 인증번호를 입력해주세요"
);
const admin2faPlaceholder = computed(() =>
  admin2faFallbackAvailable.value ? "임시 접속 코드 6자리" : "인증번호 4자리"
);

// ------------------------------------------------------------------
// [Security First] 클라이언트 사이드 검증 함수
// ------------------------------------------------------------------

/**
 * 비밀번호 최소 길이 검증 (8자 이상)
 */
const isValidPassword = (password: string): boolean => {
  return !!password && password.length >= 8;
};

/**
 * 폼 검증 (이메일 형식 + 비밀번호 길이)
 * [Security First] 보안을 위해 통합 에러 메시지 사용
 */
const validateForm = (): {
  isValid: boolean;
  errorMessage: string | null;
} => {
  // 빈 값 체크
  if (!loginForm.id || !loginForm.password) {
    return {
      isValid: false,
      errorMessage: AUTH_MESSAGES.emailAndPasswordRequired,
    };
  }

  // 이메일 형식 체크 (일회용 이메일 차단 포함)
  const emailValidation = validateEmail(loginForm.id);
  if (!emailValidation.valid) {
    return {
      isValid: false,
      errorMessage: AUTH_MESSAGES.invalidEmailFormat,
    };
  }

  // 비밀번호 길이 체크 (보안을 위해 통합 메시지)
  if (!isValidPassword(loginForm.password)) {
    return {
      isValid: false,
      errorMessage: AUTH_MESSAGES.loginFailed,
    };
  }

  return { isValid: true, errorMessage: null };
};

// ------------------------------------------------------------------
// [UX] 스마트 엔터 키 핸들링
// ------------------------------------------------------------------

/**
 * 이메일 입력란에서 엔터 키 처리
 * - 이메일이 1자 이상이고 비밀번호가 비어있으면: 비밀번호 칸으로 포커스 이동
 * - 이메일이 1자 이상이고 비밀번호가 채워져 있으면: 즉시 로그인 시도
 */
const handleEmailEnter = () => {
  // 중복 제출 방지
  if (isLoading.value) return;

  // 이메일이 1자 이상일 때만 동작
  if (!loginForm.id || loginForm.id.trim().length === 0) {
    return;
  }

  if (!loginForm.password) {
    // 비밀번호 없음 → 포커스 이동
    nextTick(() => {
      const passwordEl = document.getElementById(
        "user-password"
      ) as HTMLInputElement;
      if (passwordEl) {
        passwordEl.focus();
      }
    });
  } else {
    // 비밀번호 있음 → 즉시 로그인
    handleSubmit();
  }
};

/**
 * 비밀번호 입력란에서 엔터 키 처리
 * - 이메일과 비밀번호가 모두 1자 이상일 때만 로그인 시도
 */
const handlePasswordEnter = () => {
  // 중복 제출 방지
  if (isLoading.value) return;

  // 이메일과 비밀번호가 모두 1자 이상일 때만 폼 제출
  if (
    loginForm.id &&
    loginForm.id.trim().length > 0 &&
    loginForm.password &&
    loginForm.password.length > 0
  ) {
    handleSubmit();
  }
};

// 커스텀 Axios 인스턴스 생성
const apiClient = axios.create({
  timeout: 5000,
  withCredentials: true,
});

/**
 * 로그인 폼 제출 및 POST 요청 처리
 */
const handleSubmit = async () => {
  // 0. 중복 제출 방지 (Throttle)
  if (isLoading.value) {
    console.warn("이미 로그인 요청이 진행 중입니다.");
    return;
  }

  // 1. 초기화
  invalidInputForm.value = false;
  loginError.value = null;
  isAuthenticated.value = false;

  // 2. [Security First] 클라이언트 사이드 검증
  const validation = validateForm();
  if (!validation.isValid) {
    invalidInputForm.value = true;
    loginError.value = validation.errorMessage;
    alertMessage.value = validation.errorMessage || ERROR_MESSAGES.inputError;
    alertType.value = "error";
    showAlert.value = true;
    return;
  }

  // 3. 로딩 상태 시작 (중복 제출 방지)
  isLoading.value = true;

  // 4. 서버로 전송할 데이터 (Payload)
  const payload = {
    email: loginForm.id.trim(), // trim으로 공백 제거
    password: loginForm.password,
  };

  try {
    // 5. axios POST 요청 실행
    const response = await apiClient.post("/api/auth/login", payload);

    if (response.data?.requiresAdmin2FA) {
      isLoading.value = false;
      requiresAdmin2FA.value = true;
      admin2faChallengeId.value = response.data.challengeId;
      admin2faExpiresInSeconds.value = response.data.expiresInSeconds || 300;
      admin2faFallbackAvailable.value = !!response.data.admin2faFallbackAvailable;
      admin2faDevCode.value =
        import.meta.env.DEV && response.data.devCode ? response.data.devCode : "";
      admin2faCode.value = "";
      loginForm.password = "";

      nextTick(() => {
        const codeEl = document.getElementById("admin-2fa-code") as HTMLInputElement;
        codeEl?.focus();
      });
      return;
    }

    // 6. 성공 시 처리
    isLoading.value = false;
    isAuthenticated.value = true;
    isProcessingAuth.value = true; // 전체 화면 로딩 표시

    try {
      // 7. 사용자 정보 로드 후 바로 홈으로 이동
      await authStore.loadUser();

      // 환영 메시지 설정
      const userName = authStore.user?.userName || "회원";
      authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

      router.replace("/");
    } catch (userLoadError) {
      // 사용자 정보 로드 실패 시에도 로딩 해제
      console.error("사용자 정보 로드 실패:", userLoadError);
      isProcessingAuth.value = false;

      // 로그인은 성공했으나 정보 로드 실패
      loginError.value = AUTH_MESSAGES.loginInfoLoadFailed;
      alertMessage.value = loginError.value;
      alertType.value = "error";
      showAlert.value = true;
    }
  } catch (error: any) {
    // 8. 실패(에러) 시 처리
    isLoading.value = false;
    isProcessingAuth.value = false; // 추가: 모든 로딩 상태 해제
    invalidInputForm.value = true;

    if (axios.isAxiosError(error) && error.response) {
      // [Security First] 보안을 위한 통합 에러 메시지
      // 공격자가 이메일 존재 여부나 어떤 필드가 잘못되었는지 알 수 없도록 함
      const status = error.response.status;

      // 인증 관련 에러 (401, 403, 404 등)는 모두 통합 메시지
      if (status === 401 || status === 403 || status === 404) {
        loginError.value = AUTH_MESSAGES.loginFailed;
      } else if (status === 429) {
        // 너무 많은 시도 (Rate Limiting)
        loginError.value = AUTH_MESSAGES.tooManyAttempts;
      } else if (status >= 500) {
        // 서버 오류
        loginError.value = ERROR_MESSAGES.serverError;
      } else {
        // 기타 오류
        loginError.value = AUTH_MESSAGES.loginFailed;
      }

      console.error("로그인 실패 (HTTP " + status + "):", error.response.data);
    } else if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      // 타임아웃 오류
      loginError.value = ERROR_MESSAGES.timeout;
    } else if (axios.isAxiosError(error) && !error.response) {
      // 네트워크 오류 (서버 미응답)
      loginError.value = ERROR_MESSAGES.connectionFailed;
    } else {
      // 알 수 없는 오류
      loginError.value = ERROR_MESSAGES.unknown;
    }

    // 에러 Alert 표시
    alertMessage.value = loginError.value;
    alertType.value = "error";
    showAlert.value = true;

    console.error("로그인 실패:", loginError.value, error);
  }
};

const resetAdmin2FA = () => {
  requiresAdmin2FA.value = false;
  admin2faCode.value = "";
  admin2faChallengeId.value = "";
  admin2faExpiresInSeconds.value = 0;
  admin2faDevCode.value = "";
  admin2faFallbackAvailable.value = false;
  isClosingAdmin2FA.value = false;
  loginError.value = null;
  invalidInputForm.value = false;
};

const closeAdmin2FA = async () => {
  if (isLoading.value || isClosingAdmin2FA.value) return;

  isClosingAdmin2FA.value = true;

  try {
    await apiClient.post("/api/auth/logout");
  } catch (error) {
    console.warn("관리자 2차 인증 취소 세션 정리 실패:", error);
  } finally {
    resetAdmin2FA();
  }
};

const handleAdmin2FACodeInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  admin2faCode.value = input.value
    .replace(/\D/g, "")
    .slice(0, admin2faCodeMaxLength.value);
};

const handleAdmin2FAVerify = async () => {
  if (isLoading.value) return;

  invalidInputForm.value = false;
  loginError.value = null;

  if (!admin2faChallengeId.value || !admin2faCodeReady.value) {
    invalidInputForm.value = true;
    loginError.value = admin2faFallbackAvailable.value
      ? "임시 접속 코드 6자리를 입력해주세요."
      : "텔레그램으로 받은 4자리 인증번호를 입력해주세요.";
    return;
  }

  isLoading.value = true;

  try {
    await apiClient.post("/api/auth/admin-2fa/verify", {
      challengeId: admin2faChallengeId.value,
      code: admin2faCode.value,
    });

    isLoading.value = false;
    isAuthenticated.value = true;
    isProcessingAuth.value = true;

    await authStore.loadUser({ forceRefresh: true, throwOnError: true });

    const userName = authStore.user?.userName || "회원";
    authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

    router.replace("/");
  } catch (error: any) {
    isLoading.value = false;
    isProcessingAuth.value = false;
    invalidInputForm.value = true;
    admin2faCode.value = "";

    if (axios.isAxiosError(error) && error.response?.status === 429) {
      loginError.value = AUTH_MESSAGES.tooManyAttempts;
    } else if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
      loginError.value = ERROR_MESSAGES.serverError;
    } else if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      loginError.value = ERROR_MESSAGES.timeout;
    } else {
      loginError.value = "인증번호가 올바르지 않거나 만료되었습니다. 다시 로그인해주세요.";
    }

    nextTick(() => {
      const codeEl = document.getElementById("admin-2fa-code") as HTMLInputElement;
      codeEl?.focus();
    });
  }
};

// 모바일 환경 체크
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 네이버 소셜 로그인 처리
 * PC: 팝업 창으로 로그인
 * 모바일: 리다이렉트 방식
 */
const handleNaverLogin = () => {
  isNaverLoading.value = true;
  loginError.value = null;
  invalidInputForm.value = false;

  const naverLoginUrl = getNaverLoginUrl();

  // 모바일: 리다이렉트 방식
  if (isMobile()) {
    window.location.href = naverLoginUrl;
    return;
  }

  // PC: 팝업 창 방식
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  // 팝업 여부를 localStorage에 저장 (팝업 창과 공유)
  localStorage.setItem("oauth_popup", "true");

  const popup = window.open(
    naverLoginUrl,
    "naverLogin",
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
  );

  // 팝업이 차단된 경우 리다이렉트로 대체
  if (!popup) {
    window.location.href = naverLoginUrl;
    return;
  }

  // 팝업 창 닫힘 감지
  const checkPopup = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkPopup);
      isNaverLoading.value = false;
    }
  }, 500);

  // localStorage를 통한 OAuth 결과 수신 (storage 이벤트)
  const handleStorageChange = async (event: StorageEvent) => {
    if (event.key !== "oauth_result" || !event.newValue) return;

    try {
      const result = JSON.parse(event.newValue);
      const { type, message } = result;

      // 결과 처리 후 localStorage 정리
      localStorage.removeItem("oauth_result");

      if (type === "OAUTH_SUCCESS") {
        clearInterval(checkPopup);
        window.removeEventListener("storage", handleStorageChange);

        // 팝업 닫히고 결과 처리 시작 → 전체 화면 로딩 표시
        isNaverLoading.value = false;
        isProcessingAuth.value = true;

        // 사용자 정보 로드 후 바로 홈으로 이동
        await authStore.loadUser();

        // 환영 메시지 설정
        const userName = authStore.user?.userName || "회원";
        authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

        router.replace("/");
      } else if (type === "OAUTH_ERROR") {
        clearInterval(checkPopup);
        window.removeEventListener("storage", handleStorageChange);

        isNaverLoading.value = false;
        isProcessingAuth.value = false;
        loginError.value = message || ERROR_MESSAGES.serverError;
        invalidInputForm.value = true;
        alertMessage.value = loginError.value ?? ERROR_MESSAGES.serverError;
        alertType.value = "error";
        showAlert.value = true;
      }
    } catch (e) {
      console.error("OAuth 결과 파싱 오류:", e);
    }
  };

  window.addEventListener("storage", handleStorageChange);
};

/**
 * 카카오 소셜 로그인 처리
 * PC: 팝업 창으로 로그인
 * 모바일: 리다이렉트 방식
 */
const handleKakaoLogin = () => {
  isKakaoLoading.value = true;
  loginError.value = null;
  invalidInputForm.value = false;

  const kakaoLoginUrl = getKakaoLoginUrl();

  // 모바일: 리다이렉트 방식
  if (isMobile()) {
    window.location.href = kakaoLoginUrl;
    return;
  }

  // PC: 팝업 창 방식
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  // 팝업 여부를 localStorage에 저장 (팝업 창과 공유)
  localStorage.setItem("oauth_popup", "true");

  const popup = window.open(
    kakaoLoginUrl,
    "kakaoLogin",
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
  );

  // 팝업이 차단된 경우 리다이렉트로 대체
  if (!popup) {
    window.location.href = kakaoLoginUrl;
    return;
  }

  // 팝업 창 닫힘 감지
  const checkPopup = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkPopup);
      isKakaoLoading.value = false;
    }
  }, 500);

  // localStorage를 통한 OAuth 결과 수신 (storage 이벤트)
  const handleStorageChange = async (event: StorageEvent) => {
    if (event.key !== "oauth_result" || !event.newValue) return;

    try {
      const result = JSON.parse(event.newValue);
      const { type, message } = result;

      // 결과 처리 후 localStorage 정리
      localStorage.removeItem("oauth_result");

      if (type === "OAUTH_SUCCESS") {
        clearInterval(checkPopup);
        window.removeEventListener("storage", handleStorageChange);

        // 팝업 닫히고 결과 처리 시작 → 전체 화면 로딩 표시
        isKakaoLoading.value = false;
        isProcessingAuth.value = true;

        // 사용자 정보 로드 후 바로 홈으로 이동
        await authStore.loadUser();

        // 환영 메시지 설정
        const userName = authStore.user?.userName || "회원";
        authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

        router.replace("/");
      } else if (type === "OAUTH_ERROR") {
        clearInterval(checkPopup);
        window.removeEventListener("storage", handleStorageChange);

        isKakaoLoading.value = false;
        isProcessingAuth.value = false;
        loginError.value = message || ERROR_MESSAGES.serverError;
        invalidInputForm.value = true;
        alertMessage.value = loginError.value ?? ERROR_MESSAGES.serverError;
        alertType.value = "error";
        showAlert.value = true;
      }
    } catch (e) {
      console.error("OAuth 결과 파싱 오류:", e);
    }
  };

  window.addEventListener("storage", handleStorageChange);
};
</script>

<template>
  <section
    id="contact"
    class="max-w-md mx-auto items-center justify-center pt-8 pb-12 sm:pt-12 sm:pb-16 px-3 sm:px-4"
  >
    <div class="mb-6 text-center">
      <h3 class="text-heading text-primary mb-2 tracking-wider">로그인</h3>
    </div>
    <Card class="w-full mx-auto">
      <CardContent>
        <form @submit.prevent="handleSubmit" class="grid gap-4 mt-4 mb-2">
            <div class="flex flex-col w-full gap-1.5 pt-10">
              <Input
                id="user-id"
                name="username"
                type="text"
                autocomplete="username"
                placeholder="이메일"
                v-model="loginForm.id"
                :disabled="isLoading"
                @keydown.enter.prevent="handleEmailEnter"
              />
            </div>

            <div class="flex flex-col w-full gap-1.5">
              <Input
                id="user-password"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="비밀번호"
                v-model="loginForm.password"
                :disabled="isLoading"
                @keydown.enter.prevent="handlePasswordEnter"
              />
            </div>

            <!-- 오류 상세 메시지 -->
            <AlertDescription v-if="invalidInputForm && loginError" class="mt-1">
              {{ loginError }}
            </AlertDescription>

            <Button
              id="login-button"
              class="w-full mt-1 font-medium h-11 hover:bg-primary/80"
              type="submit"
              :disabled="isLoading"
            >
              <LoadingSpinner
                v-if="isLoading"
                variant="spinner"
                size="sm"
                color="white"
                :center="false"
                class="mr-2"
              />
              <span class="text-base tracking-tight">
                {{ isLoading ? "로그인 중..." : "로그인" }}
              </span>
            </Button>

            <div class="relative my-1">
              <div class="absolute inset-0 flex items-center">
                <Separator></Separator>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span
                  class="bg-background px-2 text-caption text-muted-foreground"
                  >또는</span
                >
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              :class="[
                'w-full h-11',
                'bg-[#03A94D] hover:bg-[#03A94D]/90 font-medium',
              ]"
              :disabled="isLoading || isNaverLoading || isKakaoLoading"
              @click="handleNaverLogin"
            >
              <LoadingSpinner
                v-if="isNaverLoading"
                variant="spinner"
                size="sm"
                color="white"
                :center="false"
              />

              <template v-else>
                <div class="inline-flex items-center leading-none text-white">
                  <svg
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    class="w-4 h-4 block"
                    preserveAspectRatio="xMinYMid meet"
                  >
                    <path
                      d="M12.9286 20H20V0H12.9286V9.42857L7.07143 0H0V20H7.07143V10.5714L12.9286 20Z"
                    />
                  </svg>
                  <span
                    class="text-base font-medium tracking-tight ml-2 text-white"
                    >네이버 로그인</span
                  >
                </div>
              </template>
            </Button>
            <Button
              type="button"
              variant="outline"
              :class="[
                'w-full h-11',
                'bg-[#FEE500] hover:bg-[#FEE500]/90 font-medium border-[#FEE500]',
              ]"
              :disabled="isLoading || isNaverLoading || isKakaoLoading"
              @click="handleKakaoLogin"
            >
              <LoadingSpinner
                v-if="isKakaoLoading"
                variant="spinner"
                size="sm"
                color="foreground"
                :center="false"
              />

              <template v-else>
                <div class="inline-flex items-center leading-none text-[#191919]">
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    class="w-5 h-5 block"
                  >
                    <path
                      d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.89 5.35 4.72 6.77-.15.53-.96 3.43-1 3.58 0 .08.03.16.09.21.07.05.15.06.22.03.3-.08 3.5-2.31 4.04-2.68.61.09 1.25.14 1.93.14 5.52 0 10-3.58 10-8S17.52 3 12 3z"
                    />
                  </svg>
                  <span
                    class="text-base font-medium tracking-tight ml-2 text-[#191919]"
                    >카카오 로그인</span
                  >
                </div>
              </template>
            </Button>
        </form>
      </CardContent>
    </Card>

    <p class="text-center mt-4">
      <router-link
        to="/forgot-password"
        class="text-primary hover:underline font-medium"
        >비밀번호를 잊으셨나요?</router-link
      >
    </p>

    <p class="text-center mt-2 text-muted-foreground">
      계정이 없으신가요?
      <router-link to="/signup" class="text-primary hover:underline font-medium"
        >가입하기</router-link
      >
    </p>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="requiresAdmin2FA"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeAdmin2FA"
          />

          <Card class="relative z-10 w-full max-w-md shadow-xl">
            <CardHeader class="pb-4">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-primary/10 rounded-full">
                    <ShieldCheck class="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle class="text-heading">관리자 2차 인증</CardTitle>
                    <p class="text-body text-muted-foreground mt-1">
                      {{ admin2faDescription }}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 -mr-2 -mt-2"
                  :disabled="isLoading || isClosingAdmin2FA"
                  @click="closeAdmin2FA"
                >
                  <X class="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <form class="grid gap-4" @submit.prevent="handleAdmin2FAVerify">
                <Input
                  id="admin-2fa-code"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  :placeholder="admin2faPlaceholder"
                  :model-value="admin2faCode"
                  :disabled="isLoading"
                  :maxlength="admin2faCodeMaxLength"
                  class="text-center text-lg tracking-widest"
                  @input="handleAdmin2FACodeInput"
                  @keydown.enter.prevent="handleAdmin2FAVerify"
                />

                <div class="space-y-1">
                  <p class="text-xs text-muted-foreground">
                    {{ admin2faFallbackAvailable ? "임시 접속 코드" : "인증번호" }}는
                    {{ Math.round(admin2faExpiresInSeconds / 60) }}분 동안 유효합니다.
                  </p>
                  <p v-if="admin2faDevCode" class="text-xs text-muted-foreground">
                    개발 인증번호: {{ admin2faDevCode }}
                  </p>
                </div>

                <AlertDescription v-if="invalidInputForm && loginError">
                  {{ loginError }}
                </AlertDescription>

                <div class="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    class="font-medium"
                    :disabled="isLoading || isClosingAdmin2FA"
                    @click="closeAdmin2FA"
                  >
                    {{ isClosingAdmin2FA ? "취소 중..." : "취소" }}
                  </Button>
                  <Button
                    type="submit"
                    class="font-semibold"
                    :disabled="isLoading || !admin2faCodeReady"
                  >
                    <LoadingSpinner
                      v-if="isLoading"
                      variant="spinner"
                      size="sm"
                      color="white"
                      :center="false"
                      class="mr-2"
                    />
                    {{ isLoading ? "확인 중..." : "인증 확인" }}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Transition>
    </Teleport>

    <!-- Alert 모달 (성공/오류) -->
    <Alert
      v-if="showAlert"
      :type="alertType"
      :message="alertMessage"
      @close="showAlert = false"
    />

    <!-- OAuth 결과 처리 중 전체 화면 로딩 -->
    <LoadingSpinner
      v-if="isProcessingAuth"
      fullscreen
      variant="dots"
      size="lg"
      message="로그인 처리 중..."
    />
  </section>
</template>
