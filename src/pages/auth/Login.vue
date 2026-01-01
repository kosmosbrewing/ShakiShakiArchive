<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getNaverLoginUrl } from "@/lib/api";
import axios from "axios";
import { Loader2, AlertCircle } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  type AlertType,
  ERROR_MESSAGES,
  getErrorMessageByStatus,
} from "@/components/ui/alert";
import Separator from "@/components/ui/separator/Separator.vue";
import { LoadingSpinner } from "@/components/common";

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
const isProcessingAuth = ref<boolean>(false); // OAuth 결과 처리 중 (전체 화면 로딩)
const showAlert = ref<boolean>(false); // Alert 모달 표시 상태
const alertMessage = ref<string>(""); // Alert 메시지
const alertType = ref<AlertType>("success"); // Alert 타입 (success/error)

// 커스텀 Axios 인스턴스 생성
const apiClient = axios.create({
  timeout: 5000,
  withCredentials: true,
});

/**
 * 로그인 폼 제출 및 POST 요청 처리
 */
const handleSubmit = async () => {
  // 1. 유효성 검사 및 초기화
  invalidInputForm.value = false;
  loginError.value = null;
  isAuthenticated.value = false;

  if (!loginForm.id || !loginForm.password) {
    invalidInputForm.value = true;
    loginError.value = ERROR_MESSAGES.inputError;
    alertMessage.value = loginError.value;
    alertType.value = "error";
    showAlert.value = true;
    return;
  }

  // 2. 로딩 상태 시작
  isLoading.value = true;

  // 3. 서버로 전송할 데이터 (Payload)
  const payload = {
    email: loginForm.id,
    password: loginForm.password,
  };

  try {
    // 4. axios POST 요청 실행
    await apiClient.post("/api/auth/login", payload);

    // 5. 성공 시 처리
    isLoading.value = false;
    isAuthenticated.value = true;
    isProcessingAuth.value = true; // 전체 화면 로딩 표시

    // 6. 사용자 정보 로드 후 바로 홈으로 이동
    await authStore.loadUser();

    // 환영 메시지 설정
    const userName = authStore.user?.userName || "회원";
    authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

    router.replace("/");
  } catch (error: any) {
    // 7. 실패(에러) 시 처리
    isLoading.value = false;
    invalidInputForm.value = true;

    if (axios.isAxiosError(error) && error.response) {
      // 서버 응답 메시지 우선, 없으면 HTTP 상태 코드에 따른 기본 메시지
      const serverMessage = error.response.data?.message;
      loginError.value =
        serverMessage || getErrorMessageByStatus(error.response.status);
    } else {
      // 네트워크 오류
      loginError.value = ERROR_MESSAGES.network;
    }

    // 에러 Alert 표시
    alertMessage.value = ERROR_MESSAGES.serverError;
    alertType.value = "error";
    showAlert.value = true;

    console.error("로그인 실패:", loginError.value, error);
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
</script>

<template>
  <section
    id="contact"
    class="max-w-md mx-auto items-center justify-center py-24 sm:py-16"
  >
    <div class="mb-6 text-center">
      <h3 class="text-heading text-primary mb-2 tracking-wider">LOGIN</h3>
    </div>
    <Card class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent>
        <form @submit.prevent="handleSubmit" class="grid gap-4 mt-4 mb-2">
          <div class="flex flex-col w-full gap-1.5 pt-10">
            <Input
              id="user-id"
              type="text"
              placeholder="이메일"
              v-model="loginForm.id"
              :disabled="isLoading"
            />
          </div>

          <div class="flex flex-col w-full gap-1.5">
            <Input
              id="user-password"
              type="password"
              placeholder="비밀번호"
              v-model="loginForm.password"
              :disabled="isLoading"
            />
          </div>

          <!-- 오류 상세 메시지 -->
          <AlertDescription
            v-if="invalidInputForm && loginError"
            class="flex items-center text-primary mt-1"
          >
            <AlertCircle class="w-4 h-4 pr-1 flex-shrink-0" />
            <div class="text-caption">{{ loginError }}</div>
          </AlertDescription>

          <Button class="w-full mt-1" type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            <span class="text-[16px] tracking-tight">
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
            :disabled="isLoading || isNaverLoading"
            @click="handleNaverLogin"
          >
            <Loader2 v-if="isNaverLoading" class="h-5 w-5 animate-spin" />

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
                <span class="text-[16px] tracking-tight ml-2 text-white"
                  >네이버 로그인</span
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
