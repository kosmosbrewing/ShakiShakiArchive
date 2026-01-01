<script setup lang="ts">
// src/pages/auth/OAuthCallback.vue
// OAuth 콜백 처리 페이지

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { XCircle } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Alert,
  type AlertType,
  ERROR_MESSAGES,
} from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 상태
const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref<string>("");

// 팝업 창인지 확인
const isPopup = ref<boolean>(false);

// Alert 상태
const showAlert = ref<boolean>(false);
const alertMessage = ref<string>("");
const alertType = ref<AlertType>("success");

onMounted(async () => {
  // 팝업 창 여부 확인 (localStorage로 확인)
  isPopup.value = localStorage.getItem("oauth_popup") === "true";
  // 확인 후 삭제
  localStorage.removeItem("oauth_popup");

  // returnUrl 파라미터 확인 (로그인 전 페이지로 돌아가기 위함)
  const returnUrl = (route.query.returnUrl as string) || "/";

  try {
    // URL에서 에러 파라미터 확인
    const error = route.query.error as string;
    if (error) {
      throw new Error(getErrorMessage(error));
    }

    // 사용자 정보 로드
    await authStore.loadUser();

    if (authStore.isAuthenticated) {
      status.value = "success";

      // 팝업 창인 경우: localStorage를 통해 부모 창에 결과 전달
      if (isPopup.value) {
        // localStorage에 성공 결과 저장 (부모 창에서 storage 이벤트로 감지)
        localStorage.setItem(
          "oauth_result",
          JSON.stringify({ type: "OAUTH_SUCCESS", timestamp: Date.now() })
        );
        // 창 닫기
        setTimeout(() => {
          window.close();
        }, 100);
        return;
      }

      // 일반 리다이렉트: 환영 메시지 설정 후 홈으로 이동
      const userName = authStore.user?.userName || "회원";
      authStore.setWelcomeMessage(`반가워요, ${userName}님!`);
      router.replace(returnUrl);
    } else {
      throw new Error("로그인 처리에 실패했습니다. 다시 시도해주세요.");
    }
  } catch (error: any) {
    status.value = "error";
    errorMessage.value = error.message || ERROR_MESSAGES.serverError;

    // 팝업 창인 경우: localStorage를 통해 부모 창에 에러 전달
    if (isPopup.value) {
      localStorage.setItem(
        "oauth_result",
        JSON.stringify({
          type: "OAUTH_ERROR",
          message: errorMessage.value,
          timestamp: Date.now(),
        })
      );
      setTimeout(() => {
        window.close();
      }, 100);
      return;
    }

    // 일반: Alert 표시
    alertMessage.value = errorMessage.value;
    alertType.value = "error";
    showAlert.value = true;
  }
});

// 에러 코드에 따른 메시지 반환
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "access_denied":
      return "네이버 로그인이 취소되었습니다.";
    case "invalid_request":
      return "잘못된 요청입니다. 다시 시도해주세요.";
    case "server_error":
      return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "로그인 중 오류가 발생했습니다.";
  }
}

// 로그인 페이지로 이동
const goToLogin = () => {
  router.push("/login");
};

// 홈으로 이동
const goToHome = () => {
  router.push("/");
};

// 팝업 창 닫기
const closePopup = () => {
  window.close();
};
</script>

<template>
  <!-- 로딩/성공 상태: 전체 화면 로딩 -->
  <LoadingSpinner
    v-if="status === 'loading' || status === 'success'"
    fullscreen
    variant="dots"
    size="lg"
    message="로그인 처리 중..."
  />

  <!-- 에러 상태: 카드로 표시 -->
  <section v-else class="max-w-md mx-auto items-center justify-center py-24 sm:py-16">
    <Card class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent class="flex flex-col items-center justify-center py-12">
        <XCircle class="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 class="text-lg font-semibold mb-2">로그인 실패</h2>
        <p class="text-muted-foreground text-sm mb-6">{{ errorMessage }}</p>
        <div class="flex gap-3 justify-center">
          <template v-if="isPopup">
            <Button @click="closePopup">창 닫기</Button>
          </template>
          <template v-else>
            <Button variant="outline" @click="goToHome">홈으로</Button>
            <Button @click="goToLogin">다시 로그인</Button>
          </template>
        </div>
      </CardContent>
    </Card>
  </section>

  <!-- Alert 모달 (성공/오류) -->
  <Alert
    v-if="showAlert"
    :type="alertType"
    :message="alertMessage"
    @close="showAlert = false"
  />
</template>
