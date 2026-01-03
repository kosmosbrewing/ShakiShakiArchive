<script setup lang="ts">
// src/pages/auth/ForgotPassword.vue
// 비밀번호 찾기 페이지

import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { sendVerification, verifyEmail, resetPassword } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound,
  Lock,
} from "lucide-vue-next";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  type AlertType,
} from "@/components/ui/alert";

const router = useRouter();

// 현재 단계 (1: 이메일 입력, 2: 인증코드 확인, 3: 새 비밀번호 입력, 4: 완료)
const currentStep = ref(1);

// 폼 데이터
const formData = reactive({
  email: "",
  newPassword: "",
  confirmPassword: "",
});

// 이메일 인증 상태
const verificationState = reactive({
  isSent: false,
  isVerified: false,
  code: "",
  isLoading: false,
  isVerifying: false,
  errorMessage: "",
});

// UI 상태
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Alert 상태
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref<AlertType>("success");

// 단계별 타이틀
const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 1:
      return "이메일 인증";
    case 2:
      return "인증번호 확인";
    case 3:
      return "새 비밀번호 설정";
    case 4:
      return "비밀번호 재설정 완료";
    default:
      return "비밀번호 찾기";
  }
});

// 인증코드 발송
const sendVerificationCode = async () => {
  if (!formData.email || !formData.email.includes("@")) {
    verificationState.errorMessage = "유효한 이메일을 입력해주세요.";
    return;
  }

  verificationState.isLoading = true;
  verificationState.errorMessage = "";

  try {
    await sendVerification(formData.email, "password_reset");
  } catch (error: unknown) {
    // 보안을 위해 이메일 존재 여부와 관계없이 동일하게 처리
    console.log("Password reset request processed");
  } finally {
    // 성공/실패와 관계없이 동일하게 다음 단계로 이동
    verificationState.isSent = true;
    verificationState.isLoading = false;
    currentStep.value = 2;
  }
};

// 인증코드 확인
const verifyCode = async () => {
  if (!verificationState.code || verificationState.code.length !== 6) {
    verificationState.errorMessage = "6자리 인증코드를 입력해주세요.";
    return;
  }

  verificationState.isVerifying = true;
  verificationState.errorMessage = "";

  try {
    const response = await verifyEmail(
      formData.email,
      verificationState.code,
      "password_reset"
    );
    if (response.verified) {
      verificationState.isVerified = true;
      verificationState.errorMessage = "";
      currentStep.value = 3;
    } else {
      verificationState.errorMessage = "인증번호가 일치하지 않습니다.";
    }
  } catch (error: any) {
    verificationState.errorMessage =
      error.message || "인증 확인에 실패했습니다.";
  } finally {
    verificationState.isVerifying = false;
  }
};

// 비밀번호 재설정
const handleResetPassword = async () => {
  errorMessage.value = "";

  if (!verificationState.isVerified) {
    errorMessage.value = "이메일 인증을 완료해주세요.";
    return;
  }

  if (formData.newPassword.length < 8) {
    errorMessage.value = "비밀번호는 최소 8자 이상이어야 합니다.";
    return;
  }

  if (formData.newPassword !== formData.confirmPassword) {
    errorMessage.value = "비밀번호가 일치하지 않습니다.";
    return;
  }

  try {
    isSubmitting.value = true;
    await resetPassword({
      email: formData.email,
      newPassword: formData.newPassword,
    });

    successMessage.value = "비밀번호가 성공적으로 변경되었습니다.";
    currentStep.value = 4;

    // 성공 Alert 표시
    alertMessage.value = "비밀번호가 성공적으로 변경되었습니다.";
    alertType.value = "success";
    showAlert.value = true;
  } catch (error: any) {
    console.error(error);
    errorMessage.value =
      error.message || "비밀번호 재설정 중 오류가 발생했습니다.";
  } finally {
    isSubmitting.value = false;
  }
};

// 로그인 페이지로 이동
const goToLogin = () => {
  router.push("/login");
};
</script>

<template>
  <section
    id="forgot-password"
    class="max-w-md mx-auto items-center justify-center py-24 sm:py-16"
  >
    <div class="mb-6 text-center">
      <h2 class="text-heading text-primary mb-2 tracking-wider">
        비밀번호 찾기
      </h2>
      <p class="text-body text-muted-foreground">{{ stepTitle }}</p>
    </div>

    <Card class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent>
        <!-- Step 1 & 2: 이메일 인증 -->
        <form
          v-if="currentStep <= 2"
          @submit.prevent="currentStep === 1 ? sendVerificationCode() : verifyCode()"
          class="grid gap-6"
        >
          <!-- 이메일 입력 -->
          <div class="flex flex-col gap-1.5 mt-6">
            <Label for="email">
              이메일 <span class="text-red-500">*</span>
            </Label>
            <div class="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                v-model="formData.email"
                :disabled="verificationState.isSent"
              />
              <Button
                type="button"
                variant="outline"
                @click="sendVerificationCode"
                :disabled="
                  verificationState.isLoading || !formData.email
                "
                class="w-28 shrink-0"
              >
                <Loader2
                  v-if="verificationState.isLoading"
                  class="animate-spin h-4 w-4 mr-2"
                />
                <Mail v-else class="w-4 h-4 mr-2" />
                <span v-if="verificationState.isLoading">전송중</span>
                <span v-else-if="verificationState.isSent">재전송</span>
                <span v-else>인증요청</span>
              </Button>
            </div>
            <p class="text-caption text-muted-foreground">
              가입 시 사용한 이메일 주소를 입력해주세요.
            </p>
            <p
              v-if="verificationState.errorMessage && !verificationState.isSent"
              class="text-caption text-red-500"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>

          <!-- 인증코드 입력 (Step 2) -->
          <div
            v-if="verificationState.isSent && !verificationState.isVerified"
            class="flex flex-col gap-1.5 animate-in slide-in-from-top-2"
          >
            <Label for="code">인증번호</Label>
            <div class="flex gap-2">
              <Input
                id="code"
                type="text"
                placeholder="인증번호 6자리"
                maxlength="6"
                v-model="verificationState.code"
                :disabled="verificationState.isVerifying"
              />
              <Button
                type="button"
                variant="outline"
                class="w-28 shrink-0"
                @click="verifyCode"
                :disabled="
                  verificationState.isVerifying ||
                  verificationState.code.length !== 6
                "
              >
                <Loader2
                  v-if="verificationState.isVerifying"
                  class="animate-spin h-4 w-4 mr-2"
                />
                <KeyRound v-else class="w-4 h-4 mr-2" />
                {{ verificationState.isVerifying ? "확인중" : "확인" }}
              </Button>
            </div>
            <p class="text-caption text-muted-foreground">
              입력하신 이메일이 등록되어 있다면, 인증번호가 발송되었습니다.
            </p>
            <p
              v-if="verificationState.errorMessage"
              class="text-caption text-red-500"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>
        </form>

        <!-- Step 3: 새 비밀번호 입력 -->
        <form
          v-else-if="currentStep === 3"
          @submit.prevent="handleResetPassword"
          class="grid gap-6"
        >
          <!-- 이메일 인증 완료 알림 -->
          <Alert class="bg-green-50 text-green-700 border-green-200 py-2 mt-6">
            <CheckCircle2 class="h-4 w-4" />
            <AlertTitle class="ml-2 text-body font-medium">
              이메일 인증 완료
            </AlertTitle>
          </Alert>

          <div class="flex flex-col gap-1.5">
            <Label for="newPassword">
              새 비밀번호 <span class="text-red-500">*</span>
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="8자 이상"
              v-model="formData.newPassword"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="confirmPassword">
              새 비밀번호 확인 <span class="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              v-model="formData.confirmPassword"
            />
          </div>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

          <Button
            type="submit"
            class="w-full mt-2"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            <Lock v-else class="mr-2 h-4 w-4" />
            {{ isSubmitting ? "처리 중..." : "비밀번호 재설정" }}
          </Button>
        </form>

        <!-- Step 4: 완료 -->
        <div v-else-if="currentStep === 4" class="text-center py-8">
          <div
            class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 class="w-8 h-8 text-green-600" />
          </div>
          <h3 class="text-heading font-semibold mb-2">
            비밀번호가 변경되었습니다
          </h3>
          <p class="text-body text-muted-foreground mb-6">
            새로운 비밀번호로 로그인해주세요.
          </p>
          <Button @click="goToLogin" class="w-full">로그인하기</Button>
        </div>
      </CardContent>
    </Card>

    <p class="text-center text-muted-foreground mt-4">
      비밀번호가 기억나셨나요?
      <router-link to="/login" class="text-primary hover:underline font-medium">
        로그인하기
      </router-link>
    </p>

    <!-- Alert 모달 (성공/오류) -->
    <Alert
      v-if="showAlert"
      :type="alertType"
      :message="alertMessage"
      @close="showAlert = false"
    />
  </section>
</template>
