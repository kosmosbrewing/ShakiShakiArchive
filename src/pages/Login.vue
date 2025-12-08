<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router"; // 1. 라우터 훅 추가
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AlertCircle, Loader2 } from "lucide-vue-next"; // Loader2 아이콘 추가 (UI에 사용됨)

// 필요한 컴포넌트를 import 해주세요 (Card, CardHeader, CardContent, CardFooter, Alert, AlertTitle, AlertDescription)
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { useAuthStore } from "@/stores/auth";
import axios from "axios";

// ⚠️ 참고: 실제 서비스에서는 id보다 'email'이나 'username'을 사용하는 것이 일반적입니다.
interface loginProps {
  id: string; // 사용자 ID (또는 이메일)
  password: string; // 비밀번호
}

const router = useRouter(); // 2. 라우터 인스턴스 생성
const authStore = useAuthStore();

const loginForm = reactive<loginProps>({
  id: "",
  password: "",
});

const invalidInputForm = ref<boolean>(false);
const loginError = ref<string | null>(null); // 로그인 에러 메시지
const isLoading = ref<boolean>(false); // 로딩 상태 관리
const isAuthenticated = ref<boolean>(false); // 인증 성공 상태

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
  } catch (error) {
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
</script>

<template>
  <section id="contact" class="container max-w-[550px] py-10 pt-20">
    <Card class="bg-muted/5 dark:bg-card">
      <CardHeader class="text-primary text-center text-md">로그인</CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="grid gap-4">
          <div class="flex flex-col w-full gap-1.5">
            <label for="user-id" class="sr-only">아이디 (이메일)</label>
            <Input
              id="user-id"
              type="text"
              placeholder="아이디 또는 이메일을 입력하세요"
              v-model="loginForm.id"
              :disabled="isLoading"
            />
          </div>

          <div class="flex flex-col w-full gap-1.5">
            <label for="user-password" class="sr-only">비밀번호</label>
            <Input
              id="user-password"
              type="password"
              placeholder="비밀번호를 입력하세요"
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

          <Button class="w-full" type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? "로그인 중..." : "로그인" }}
          </Button>

          <router-link to="/signup" class="w-full">
            <Button class="w-full" variant="outline" :disabled="isLoading"
              >회원가입</Button
            >
          </router-link>
        </form>
      </CardContent>

      <CardFooter></CardFooter>
    </Card>
  </section>
</template>
