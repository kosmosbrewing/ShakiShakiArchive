<script setup lang="ts">
// src/pages/auth/OAuthCallback.vue
// OAuth 콜백 처리 페이지

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Loader2, CheckCircle, XCircle } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 상태
const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref<string>("");

// 팝업 창인지 확인
const isPopup = ref<boolean>(false);

onMounted(async () => {
  // 팝업 창 여부 확인 (window.opener가 존재하고 닫히지 않았는지)
  isPopup.value = !!(window.opener && !window.opener.closed);

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

      // 팝업 창인 경우: 부모 창에 메시지 전송 후 창 닫기
      if (isPopup.value && window.opener) {
        window.opener.postMessage(
          { type: "OAUTH_SUCCESS" },
          window.location.origin
        );
        // 잠시 대기 후 창 닫기 (사용자에게 성공 상태를 보여주기 위해)
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        // 일반 리다이렉트: 홈으로 이동
        setTimeout(() => {
          router.replace("/");
        }, 1500);
      }
    } else {
      throw new Error("로그인 처리에 실패했습니다. 다시 시도해주세요.");
    }
  } catch (error: any) {
    status.value = "error";
    errorMessage.value = error.message || "알 수 없는 오류가 발생했습니다.";

    // 팝업 창인 경우: 부모 창에 에러 메시지 전송
    if (isPopup.value && window.opener) {
      window.opener.postMessage(
        { type: "OAUTH_ERROR", message: errorMessage.value },
        window.location.origin
      );
    }
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
  <section class="max-w-md mx-auto items-center justify-center py-24 sm:py-16">
    <Card class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent class="flex flex-col items-center justify-center py-12">
        <!-- 로딩 상태 -->
        <div v-if="status === 'loading'" class="text-center">
          <Loader2 class="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 class="text-lg font-semibold mb-2">로그인 처리 중...</h2>
          <p class="text-muted-foreground text-sm">잠시만 기다려주세요.</p>
        </div>

        <!-- 성공 상태 -->
        <div v-else-if="status === 'success'" class="text-center">
          <CheckCircle class="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 class="text-lg font-semibold mb-2">로그인 성공!</h2>
          <p class="text-muted-foreground text-sm mb-4">
            환영합니다, {{ authStore.user?.userName }}님
          </p>
          <p class="text-muted-foreground text-xs">
            {{ isPopup ? "잠시 후 이 창이 닫힙니다..." : "잠시 후 홈으로 이동합니다..." }}
          </p>
        </div>

        <!-- 에러 상태 -->
        <div v-else-if="status === 'error'" class="text-center">
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
        </div>
      </CardContent>
    </Card>
  </section>
</template>
