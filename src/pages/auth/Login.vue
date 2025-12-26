<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getNaverLoginUrl } from "@/lib/api";
import axios from "axios";
import { AlertCircle, Loader2 } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Separator from "@/components/ui/separator/Separator.vue";

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
const isNaverLoading = ref<boolean>(false); // 네이버 로그인 로딩 상태

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
    loginError.value = "아이디와 비밀번호를 모두 입력해주세요.";
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
    const response = await apiClient.post("/api/auth/login", payload);

    // 5. 성공 시 처리
    isLoading.value = false;
    isAuthenticated.value = true;

    console.log("로그인 성공! 사용자 데이터:", response.data);

    // [수정됨] 6. 홈 화면으로 이동
    // replace를 사용하면 뒤로가기 버튼을 눌렀을 때 로그인 페이지로 돌아오지 않도록 합니다.
    // 일반적인 이동을 원하시면 router.push('/')를 사용하세요.
    await authStore.loadUser();
    router.replace("/");
  } catch (error: any) {
    // 7. 실패(에러) 시 처리
    isLoading.value = false;
    invalidInputForm.value = true;

    if (axios.isAxiosError(error) && error.response) {
      const serverMessage = error.response.data?.message;

      if (error.response.status === 401 && serverMessage) {
        loginError.value = serverMessage;
      } else {
        loginError.value = `서버 오류 (${error.response.status}): 요청 처리에 실패했습니다.`;
      }
    } else {
      loginError.value =
        "네트워크 연결 상태를 확인하거나 잠시 후 다시 시도해주세요.";
    }

    console.error("로그인 실패:", loginError.value, error);
  }
};

/**
 * 네이버 소셜 로그인 처리
 * 현재 창에서 직접 리다이렉트하여 자연스러운 UX 제공
 */
const handleNaverLogin = () => {
  isNaverLoading.value = true;
  loginError.value = null;
  invalidInputForm.value = false;

  // 팝업 없이 현재 창에서 바로 네이버 로그인 페이지로 이동
  window.location.href = getNaverLoginUrl();
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

          <Alert v-if="invalidInputForm" variant="destructive">
            <AlertCircle class="w-4 h-4" />
            <AlertTitle>로그인 실패</AlertTitle>
            <AlertDescription>
              {{
                loginError || "로그인 처리 중 알 수 없는 오류가 발생했습니다."
              }}
            </AlertDescription>
          </Alert>

          <Alert
            v-if="isAuthenticated"
            variant="default"
            class="bg-green-100 text-green-700 border-green-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M9 11l3 3L22 4" />
            </svg>
            <AlertTitle>성공</AlertTitle>
            <AlertDescription>
              로그인 성공! 잠시 후 이동합니다...
            </AlertDescription>
          </Alert>

          <Button class="w-full mt-3" type="submit" :disabled="isLoading">
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
      <router-link to="/forgot-password" class="text-primary hover:underline font-medium"
        >비밀번호를 잊으셨나요?</router-link
      >
    </p>

    <p class="text-center mt-2 text-muted-foreground">
      계정이 없으신가요?
      <router-link to="/signup" class="text-primary hover:underline font-medium"
        >가입하기</router-link
      >
    </p>
  </section>
</template>
